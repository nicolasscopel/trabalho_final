import { Router } from 'express';
import type { Ambiente } from '../../config/env.js';
import { Cpf } from '../../domain/Cpf.js';
import { Email } from '../../domain/Email.js';
import { UnauthorizedError, ValidationError } from '../../domain/errors.js';
import { Usuario } from '../../domain/Usuario.js';
import type { UsuarioRepository } from '../../repositories/UsuarioRepository.js';
import type { CpfHasher } from '../../security/CpfHasher.js';
import { PasswordHasher } from '../../security/PasswordHasher.js';
import {
  formatarCookieLimparSessao,
  formatarCookieSessao,
  type SessionService,
} from '../../security/SessionService.js';
import { TokenService } from '../../security/TokenService.js';
import type { EnviadorEmail } from '../../services/EmailService.js';
import { exigirAutenticacao, requisicaoSegura } from '../middlewares/auth.js';
import { exigirObjeto } from '../validation.js';

export type RepositorioAuth = Pick<
  UsuarioRepository,
  | 'criarComTokenVerificacao'
  | 'criarNovoTokenVerificacao'
  | 'verificarEmailPorToken'
  | 'buscarPorId'
  | 'buscarPorCpfHash'
>;

export interface DependenciasRotasAuth {
  usuarioRepo: RepositorioAuth;
  cpfHasher: CpfHasher;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  sessionService: SessionService;
  enviadorEmail: EnviadorEmail;
  appBaseUrl: string;
  ambiente: Ambiente;
  exporSandboxVerificacao: boolean;
}

// Hash sinteticamente válido para igualar o custo de `scrypt` quando o CPF não existe.
const HASH_SENHA_FICTICIO =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

function montarRespostaSandbox(token: string) {
  const caminho = `/verificar-email.html?token=${encodeURIComponent(token)}`;
  return {
    aviso: 'Modo sandbox ativo apenas em desenvolvimento local.',
    verificarUrl: caminho,
    token,
  };
}

export function rotasAuth(deps: DependenciasRotasAuth): Router {
  const router = Router();
  const autenticado = exigirAutenticacao(deps.sessionService);

  router.post('/cadastro', async (req, res) => {
    const corpo = exigirObjeto(req.body);
    const nome = Usuario.normalizarNome(corpo.nome);
    const email = Email.parse(corpo.email);
    const cpf = Cpf.parse(corpo.cpf);
    PasswordHasher.validarForca(corpo.senha);

    const cpfHash = deps.cpfHasher.hash(cpf);
    const senhaHash = await deps.passwordHasher.hash(corpo.senha);
    const tokenGerado = deps.tokenService.gerar();

    const usuario = await deps.usuarioRepo.criarComTokenVerificacao(
      {
        nome,
        email: email.valor,
        cpfHash,
        senhaHash,
        papel: 'participante',
      },
      tokenGerado,
    );

    const linkVerificacao = `${deps.appBaseUrl}/verificar-email.html?token=${encodeURIComponent(tokenGerado.token)}`;
    await deps.enviadorEmail.enviarVerificacao({
      usuarioId: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      token: tokenGerado.token,
      linkVerificacao,
      expiraEm: tokenGerado.expiraEm,
    });

    res.status(201).json({
      usuario: usuario.toPublico(),
      mensagem: 'Cadastro realizado. Verifique seu e-mail para ativar a conta.',
      ...(deps.exporSandboxVerificacao
        ? { sandboxVerificacao: montarRespostaSandbox(tokenGerado.token) }
        : {}),
    });
  });

  router.post('/verificar-email', async (req, res) => {
    const corpo = exigirObjeto(req.body);
    const token = typeof corpo.token === 'string' ? corpo.token.trim() : '';
    if (!token) {
      throw new ValidationError('Token de verificação inválido ou expirado.');
    }

    const tokenHash = TokenService.hash(token);
    const usuario = await deps.usuarioRepo.verificarEmailPorToken(tokenHash);
    res.json({
      mensagem: 'E-mail verificado com sucesso.',
      usuario: usuario.toPublico(),
    });
  });

  router.post('/reenviar-verificacao', async (req, res) => {
    const corpo = exigirObjeto(req.body);
    const usuario = await autenticarPorCpfSenha(corpo, deps);

    if (usuario.emailVerificado) {
      res.json({ mensagem: 'E-mail já está verificado.' });
      return;
    }

    const tokenGerado = deps.tokenService.gerar();
    await deps.usuarioRepo.criarNovoTokenVerificacao(usuario.id, tokenGerado);

    const linkVerificacao = `${deps.appBaseUrl}/verificar-email.html?token=${encodeURIComponent(tokenGerado.token)}`;
    await deps.enviadorEmail.enviarVerificacao({
      usuarioId: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      token: tokenGerado.token,
      linkVerificacao,
      expiraEm: tokenGerado.expiraEm,
    });

    res.json({
      mensagem: 'Novo link de verificação gerado.',
      ...(deps.exporSandboxVerificacao
        ? { sandboxVerificacao: montarRespostaSandbox(tokenGerado.token) }
        : {}),
    });
  });

  router.post('/login', async (req, res) => {
    const corpo = exigirObjeto(req.body);
    const usuario = await autenticarPorCpfSenha(corpo, deps);

    const token = deps.sessionService.criarToken({ id: usuario.id, papel: usuario.papel });
    const seguro = requisicaoSegura(req, deps.ambiente);
    res.setHeader(
      'Set-Cookie',
      formatarCookieSessao(token, {
        seguro,
        maxAgeSegundos: deps.sessionService.maxAgeSegundos,
      }),
    );

    res.json({ usuario: usuario.toPublico() });
  });

  router.post('/logout', (req, res) => {
    const seguro = requisicaoSegura(req, deps.ambiente);
    res.setHeader('Set-Cookie', formatarCookieLimparSessao(seguro));
    res.json({ mensagem: 'Sessão encerrada.' });
  });

  router.get('/me', autenticado, async (req, res) => {
    const usuario = await deps.usuarioRepo.buscarPorId(req.usuarioSessao!.usuarioId);
    if (!usuario) {
      throw new UnauthorizedError('Sessão inválida.');
    }
    res.json({ usuario: usuario.toPublico() });
  });

  return router;
}

async function autenticarPorCpfSenha(
  corpo: Record<string, unknown>,
  deps: Pick<DependenciasRotasAuth, 'usuarioRepo' | 'cpfHasher' | 'passwordHasher'>,
): Promise<Usuario> {
  if (typeof corpo.cpf !== 'string' || typeof corpo.senha !== 'string' || !corpo.senha) {
    throw new UnauthorizedError('CPF ou senha inválidos.');
  }

  let cpf: Cpf;
  try {
    cpf = Cpf.parse(corpo.cpf);
  } catch {
    throw new UnauthorizedError('CPF ou senha inválidos.');
  }

  const cpfHash = deps.cpfHasher.hash(cpf);
  const usuario = await deps.usuarioRepo.buscarPorCpfHash(cpfHash);
  if (!usuario) {
    await deps.passwordHasher.verificar(corpo.senha, HASH_SENHA_FICTICIO).catch(() => false);
    throw new UnauthorizedError('CPF ou senha inválidos.');
  }

  const senhaConfere = await deps.passwordHasher.verificar(corpo.senha, usuario.senhaHash);
  if (!senhaConfere) {
    throw new UnauthorizedError('CPF ou senha inválidos.');
  }

  return usuario;
}
