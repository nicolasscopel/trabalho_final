import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp, type RepositoriosApp } from '../../src/app.js';
import { Atividade } from '../../src/domain/Atividade.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../src/domain/errors.js';
import { Inscricao } from '../../src/domain/Inscricao.js';
import { type Papel, Usuario } from '../../src/domain/Usuario.js';
import type {
  InscricaoComAtividade,
  InscritoCoordenacao,
} from '../../src/repositories/InscricaoRepository.js';
import type { CriarUsuarioInput } from '../../src/repositories/UsuarioRepository.js';
import { CpfHasher } from '../../src/security/CpfHasher.js';
import { PasswordHasher } from '../../src/security/PasswordHasher.js';
import { SessionService } from '../../src/security/SessionService.js';
import { type TokenGerado, TokenService } from '../../src/security/TokenService.js';
import { SandboxEnviadorEmail } from '../../src/services/EmailService.js';
import { cpfFicticio, formatarCpf } from '../helpers/cpfFicticio.js';

function criarRepositoriosEmMemoria(): {
  repos: RepositoriosApp;
  inserirCoordenador: (u: Usuario) => void;
} {
  const usuarios = new Map<string, Usuario>();
  const tokens = new Map<string, { usuarioId: string; expiraEm: Date; usadoEm: Date | null }>();
  const atividades = new Map<string, Atividade>();
  const inscricoes = new Map<string, Inscricao>();

  const repos: RepositoriosApp = {
    usuarios: {
      async criarComTokenVerificacao(dados: CriarUsuarioInput, tokenGerado: TokenGerado) {
        for (const u of usuarios.values()) {
          if (u.email === dados.email || u.cpfHash === dados.cpfHash) {
            throw new ConflictError('Não foi possível concluir o cadastro com os dados informados.');
          }
        }
        const usuario = Usuario.restaurar({
          id: randomUUID(),
          nome: dados.nome,
          email: dados.email,
          cpfHash: dados.cpfHash,
          senhaHash: dados.senhaHash,
          emailVerificado: dados.emailVerificado ?? false,
          papel: dados.papel ?? 'participante',
          criadoEm: new Date(),
        });
        usuarios.set(usuario.id, usuario);
        tokens.set(tokenGerado.tokenHash, {
          usuarioId: usuario.id,
          expiraEm: tokenGerado.expiraEm,
          usadoEm: null,
        });
        return usuario;
      },

      async criarNovoTokenVerificacao(usuarioId: string, tokenGerado: TokenGerado) {
        for (const t of tokens.values()) {
          if (t.usuarioId === usuarioId && t.usadoEm === null) {
            t.usadoEm = new Date();
          }
        }
        tokens.set(tokenGerado.tokenHash, {
          usuarioId,
          expiraEm: tokenGerado.expiraEm,
          usadoEm: null,
        });
      },

      async verificarEmailPorToken(tokenHash: string, agora: Date = new Date()) {
        const reg = tokens.get(tokenHash);
        if (!reg || reg.usadoEm !== null || agora.getTime() >= reg.expiraEm.getTime()) {
          throw new ValidationError('Token de verificação inválido ou expirado.');
        }
        reg.usadoEm = agora;
        const atual = usuarios.get(reg.usuarioId)!;
        const verificado = Usuario.restaurar({
          id: atual.id,
          nome: atual.nome,
          email: atual.email,
          cpfHash: atual.cpfHash,
          senhaHash: atual.senhaHash,
          emailVerificado: true,
          papel: atual.papel,
          criadoEm: atual.criadoEm,
        });
        usuarios.set(verificado.id, verificado);
        return verificado;
      },

      async buscarPorId(id: string) {
        return usuarios.get(id) ?? null;
      },

      async buscarPorCpfHash(cpfHash: string) {
        for (const u of usuarios.values()) {
          if (u.cpfHash === cpfHash) return u;
        }
        return null;
      },
    },

    atividades: {
      async listar() {
        return [...atividades.values()].sort(
          (a, b) => a.inicio.getTime() - b.inicio.getTime(),
        );
      },

      async criar(dados) {
        const criada = Atividade.criar({
          id: randomUUID(),
          ...dados,
          vagasOcupadas: 0,
        });
        atividades.set(criada.id, criada);
        return criada;
      },

      async excluir(id: string) {
        if (!atividades.has(id)) {
          throw new NotFoundError('Atividade não encontrada.');
        }
        const possuiAtiva = [...inscricoes.values()].some(
          (i) => i.atividadeId === id && i.estaAtiva,
        );
        if (possuiAtiva) {
          throw new ConflictError('Não é possível excluir uma atividade que possui inscrições ativas.');
        }
        for (const [insId, ins] of inscricoes.entries()) {
          if (ins.atividadeId === id) {
            inscricoes.delete(insId);
          }
        }
        atividades.delete(id);
      },
    },

    inscricoes: {
      async inscreverAtomicamente(usuarioId: string, atividadeId: string): Promise<InscricaoComAtividade> {
        const u = usuarios.get(usuarioId);
        if (!u) throw new UnauthorizedError('Sessão inválida.');
        if (!u.podeSeInscrever) {
          throw new ForbiddenError('Confirme seu e-mail antes de se inscrever em atividades.');
        }

        const alvo = atividades.get(atividadeId);
        if (!alvo) throw new NotFoundError('Atividade não encontrada.');

        const ativasDoUsuario = [...inscricoes.values()].filter(
          (i) => i.usuarioId === usuarioId && i.estaAtiva,
        );
        if (ativasDoUsuario.some((i) => i.atividadeId === atividadeId)) {
          throw new ConflictError('Você já está inscrito nesta atividade.');
        }
        const atividadesAtivas = ativasDoUsuario.map((i) => atividades.get(i.atividadeId)!);
        if (alvo.encontrarConflito(atividadesAtivas)) {
          throw new ConflictError(
            'Horário em conflito com outra atividade em que você já está inscrito.',
          );
        }
        if (!alvo.temVaga) {
          throw new ConflictError('Não há vagas disponíveis para esta atividade.');
        }

        const atualizada = Atividade.criar({
          id: alvo.id,
          titulo: alvo.titulo,
          descricao: alvo.descricao,
          inicio: alvo.inicio,
          fim: alvo.fim,
          cargaHorariaMinutos: alvo.cargaHorariaMinutos,
          vagas: alvo.vagas,
          vagasOcupadas: alvo.vagasOcupadas + 1,
        });
        atividades.set(atualizada.id, atualizada);

        const ins = Inscricao.restaurar({
          id: randomUUID(),
          usuarioId,
          atividadeId,
          status: 'ativa',
          presente: false,
          criadoEm: new Date(),
          canceladaEm: null,
        });
        inscricoes.set(ins.id, ins);
        return { inscricao: ins, atividade: atualizada };
      },

      async cancelarAtomicamente(inscricaoId: string, usuarioIdSolicitante: string) {
        if (!usuarios.has(usuarioIdSolicitante)) throw new UnauthorizedError('Sessão inválida.');
        const ins = inscricoes.get(inscricaoId);
        if (!ins || !ins.pertenceA(usuarioIdSolicitante)) {
          throw new NotFoundError('Inscrição não encontrada.');
        }
        ins.cancelar();
        const atv = atividades.get(ins.atividadeId)!;
        atividades.set(
          atv.id,
          Atividade.criar({
            id: atv.id,
            titulo: atv.titulo,
            descricao: atv.descricao,
            inicio: atv.inicio,
            fim: atv.fim,
            cargaHorariaMinutos: atv.cargaHorariaMinutos,
            vagas: atv.vagas,
            vagasOcupadas: atv.vagasOcupadas - 1,
          }),
        );
        return ins;
      },

      async listarPorUsuario(usuarioId: string): Promise<InscricaoComAtividade[]> {
        return [...inscricoes.values()]
          .filter((i) => i.usuarioId === usuarioId)
          .map((i) => ({ inscricao: i, atividade: atividades.get(i.atividadeId)! }));
      },

      async listarPorAtividade(atividadeId: string, busca?: string): Promise<InscritoCoordenacao[]> {
        if (!atividades.has(atividadeId)) throw new NotFoundError('Atividade não encontrada.');
        const filtro = busca?.trim().toLowerCase();
        return [...inscricoes.values()]
          .filter((i) => i.atividadeId === atividadeId && i.estaAtiva)
          .map((i) => {
            const u = usuarios.get(i.usuarioId)!;
            return {
              inscricaoId: i.id,
              usuarioId: u.id,
              nome: u.nome,
              email: u.email,
              status: i.status,
              presente: i.presente,
              criadoEm: i.criadoEm,
            };
          })
          .filter(
            (item) =>
              !filtro ||
              item.nome.toLowerCase().includes(filtro) ||
              item.email.toLowerCase().includes(filtro),
          );
      },

      async atualizarPresenca(inscricaoId: string, presente: boolean) {
        const ins = inscricoes.get(inscricaoId);
        if (!ins) throw new NotFoundError('Inscrição não encontrada.');
        if (presente) ins.registrarPresenca();
        else ins.removerPresenca();
        return ins;
      },
    },
  };

  return {
    repos,
    inserirCoordenador(u: Usuario) {
      usuarios.set(u.id, u);
    },
  };
}

async function montarAmbienteTeste(ambiente: 'development' | 'production' = 'development') {
  const { repos, inserirCoordenador } = criarRepositoriosEmMemoria();
  const cpfHasher = new CpfHasher('p'.repeat(32));
  const passwordHasher = new PasswordHasher({ N: 1024, r: 8, p: 1 });
  const tokenService = new TokenService();
  const sessionService = new SessionService('s'.repeat(32));
  const enviadorEmail = new SandboxEnviadorEmail();

  const cpfCoord = cpfFicticio('999888777');
  const coord = Usuario.restaurar({
    id: randomUUID(),
    nome: 'Coordenação Fictícia',
    email: 'coord.ficticia@exemplo.local',
    cpfHash: cpfHasher.hash({ digitos: cpfCoord } as never),
    senhaHash: await passwordHasher.hash('SenhaCoord123'),
    emailVerificado: true,
    papel: 'coordenacao' as Papel,
    criadoEm: new Date(),
  });
  inserirCoordenador(coord);

  const app = createApp({
    repositorios: repos,
    cpfHasher,
    passwordHasher,
    tokenService,
    sessionService,
    enviadorEmail,
    ambiente,
    exporSandboxVerificacao: false,
  });

  return { app, enviadorEmail, cpfCoord };
}

describe('API da Semana Acadêmica (Passo 2.2)', () => {
  it('fluxo completo: cadastro, verificação sandbox, login, inscrição, presença e anti-IDOR', async () => {
    const { app, enviadorEmail, cpfCoord } = await montarAmbienteTeste('development');

    const cpfAlice = cpfFicticio('111222333');
    const cpfBob = cpfFicticio('444555666');

    // 1. Coordenação faz login e cria duas atividades (uma sobreposta e uma com 1 vaga).
    const agenteCoord = request.agent(app);
    const loginCoord = await agenteCoord
      .post('/api/auth/login')
      .send({ cpf: cpfCoord, senha: 'SenhaCoord123' });
    expect(loginCoord.status).toBe(200);
    expect(loginCoord.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const atv1 = await agenteCoord.post('/api/coordenacao/atividades').send({
      titulo: 'Palestra Abertura Fictícia',
      inicio: '2026-11-25T19:00:00-03:00',
      fim: '2026-11-25T20:00:00-03:00',
      cargaHorariaMinutos: 60,
      vagas: 1,
    });
    expect(atv1.status).toBe(201);

    const atvConflito = await agenteCoord.post('/api/coordenacao/atividades').send({
      titulo: 'Oficina Paralela Fictícia',
      inicio: '2026-11-25T19:30:00-03:00',
      fim: '2026-11-25T20:30:00-03:00',
      cargaHorariaMinutos: 60,
      vagas: 10,
    });
    expect(atvConflito.status).toBe(201);

    // 2. Cadastro de Alice tentando injetar papel: 'coordenacao' -> deve ser ignorado.
    const cadAlice = await request(app).post('/api/auth/cadastro').send({
      nome: 'Alice Fictícia',
      email: 'ALICE.Ficticia@Exemplo.Local',
      cpf: formatarCpf(cpfAlice),
      senha: 'SenhaSegura123',
      papel: 'coordenacao',
    });
    expect(cadAlice.status).toBe(201);
    expect(cadAlice.body.usuario.papel).toBe('participante');
    expect(cadAlice.body.usuario.email).toBe('alice.ficticia@exemplo.local');
    expect(cadAlice.body.usuario.cpfHash).toBeUndefined();
    expect(cadAlice.body.usuario.senhaHash).toBeUndefined();
    expect(cadAlice.body.sandboxVerificacao).toBeUndefined();

    // Duplicidade de CPF ou e-mail retorna 409 genérico.
    const cadDup = await request(app).post('/api/auth/cadastro').send({
      nome: 'Clone',
      email: 'alice.ficticia@exemplo.local',
      cpf: cpfFicticio('777888999'),
      senha: 'SenhaSegura123',
    });
    expect(cadDup.status).toBe(409);

    // 3. Login de Alice antes de verificar e-mail: consegue logar, mas inscrição é bloqueada (403).
    const agenteAlice = request.agent(app);
    const loginAlice = await agenteAlice
      .post('/api/auth/login')
      .send({ cpf: cpfAlice, senha: 'SenhaSegura123' });
    expect(loginAlice.status).toBe(200);

    const inscSemVerificar = await agenteAlice
      .post('/api/inscricoes')
      .send({ atividadeId: atv1.body.atividade.id });
    expect(inscSemVerificar.status).toBe(403);

    // Participante não acessa rota da coordenação.
    const proibidoCoord = await agenteAlice.post('/api/coordenacao/atividades').send({
      titulo: 'Invasão',
      inicio: '2026-11-26T10:00:00-03:00',
      fim: '2026-11-26T11:00:00-03:00',
      cargaHorariaMinutos: 60,
      vagas: 5,
    });
    expect(proibidoCoord.status).toBe(403);

    // 4. Verifica e-mail com token capturado no SandboxEnviadorEmail (uso único).
    const msgAlice = enviadorEmail.ultimaPara('alice.ficticia@exemplo.local');
    expect(msgAlice).toBeDefined();

    const verifOk = await request(app)
      .post('/api/auth/verificar-email')
      .send({ token: msgAlice!.token });
    expect(verifOk.status).toBe(200);
    expect(verifOk.body.usuario.emailVerificado).toBe(true);

    const verifReuso = await request(app)
      .post('/api/auth/verificar-email')
      .send({ token: msgAlice!.token });
    expect(verifReuso.status).toBe(400);

    // 5. Alice se inscreve na atv1 e falha por choque de horário na atvConflito.
    const inscOk = await agenteAlice
      .post('/api/inscricoes')
      .send({ atividadeId: atv1.body.atividade.id });
    expect(inscOk.status).toBe(201);
    expect(inscOk.body.atividade.vagasDisponiveis).toBe(0);

    const inscChoque = await agenteAlice
      .post('/api/inscricoes')
      .send({ atividadeId: atvConflito.body.atividade.id });
    expect(inscChoque.status).toBe(409);

    // 6. Bob se cadastra, verifica e-mail e tenta inscrever na atv1 lotada -> 409.
    await request(app).post('/api/auth/cadastro').send({
      nome: 'Bob Fictício',
      email: 'bob.ficticio@exemplo.local',
      cpf: cpfBob,
      senha: 'SenhaSegura123',
    });
    const msgBob = enviadorEmail.ultimaPara('bob.ficticio@exemplo.local')!;
    await request(app).post('/api/auth/verificar-email').send({ token: msgBob.token });

    const agenteBob = request.agent(app);
    await agenteBob.post('/api/auth/login').send({ cpf: cpfBob, senha: 'SenhaSegura123' });

    const inscLotada = await agenteBob
      .post('/api/inscricoes')
      .send({ atividadeId: atv1.body.atividade.id });
    expect(inscLotada.status).toBe(409);

    // Anti-IDOR: Bob não pode cancelar inscrição de Alice.
    const cancelIdor = await agenteBob
      .post(`/api/inscricoes/${inscOk.body.inscricao.id}/cancelar`)
      .send({});
    expect(cancelIdor.status).toBe(404);

    // 7. Coordenação lista inscritos (sem vazar CPF), filtra por nome e marca presença de Alice.
    const listaInscritos = await agenteCoord.get(
      `/api/coordenacao/atividades/${atv1.body.atividade.id}/inscritos?busca=alice`,
    );
    expect(listaInscritos.status).toBe(200);
    expect(listaInscritos.body.inscritos).toHaveLength(1);
    expect(JSON.stringify(listaInscritos.body)).not.toContain(cpfAlice);

    const marcarPresenca = await agenteCoord
      .patch(`/api/coordenacao/inscricoes/${inscOk.body.inscricao.id}/presenca`)
      .send({ presente: true });
    expect(marcarPresenca.status).toBe(200);
    expect(marcarPresenca.body.inscricao.presente).toBe(true);
    expect(marcarPresenca.body.inscricao.podeEmitirCertificado).toBe(true);

    // Alice não pode cancelar após presença confirmada.
    const cancelComPresenca = await agenteAlice
      .post(`/api/inscricoes/${inscOk.body.inscricao.id}/cancelar`)
      .send({});
    expect(cancelComPresenca.status).toBe(409);
  });

  it('usa resposta genérica no login e marca cookie Secure em produção', async () => {
    const { app, cpfCoord } = await montarAmbienteTeste('production');

    const cpfInexistente = cpfFicticio('222333444');
    const falhaCpfInexistente = await request(app)
      .post('/api/auth/login')
      .send({ cpf: cpfInexistente, senha: 'QualquerSenha123' });
    const falhaSenhaErrada = await request(app)
      .post('/api/auth/login')
      .send({ cpf: cpfCoord, senha: 'SenhaErrada123' });

    expect(falhaCpfInexistente.status).toBe(401);
    expect(falhaSenhaErrada.status).toBe(401);
    expect(falhaCpfInexistente.body.erro.mensagem).toBe(falhaSenhaErrada.body.erro.mensagem);

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ cpf: cpfCoord, senha: 'SenhaCoord123' });
    expect(ok.status).toBe(200);
    expect(ok.headers['set-cookie']?.[0]).toContain('Secure');
  });

  it('permite à coordenação excluir atividade apenas quando não há inscrições ativas', async () => {
    const { app, enviadorEmail, cpfCoord } = await montarAmbienteTeste('development');

    const agenteCoord = request.agent(app);
    await agenteCoord.post('/api/auth/login').send({ cpf: cpfCoord, senha: 'SenhaCoord123' });

    const criada = await agenteCoord.post('/api/coordenacao/atividades').send({
      titulo: 'Oficina Excluível Fictícia',
      inicio: '2026-11-26T14:00:00-03:00',
      fim: '2026-11-26T15:00:00-03:00',
      cargaHorariaMinutos: 60,
      vagas: 10,
    });
    const atividadeId = criada.body.atividade.id as string;

    // Participante comum não pode excluir atividade.
    const cpfPart = cpfFicticio('555444333');
    await request(app).post('/api/auth/cadastro').send({
      nome: 'Carlos Fictício',
      email: 'carlos.ficticio@exemplo.local',
      cpf: cpfPart,
      senha: 'SenhaSegura123',
    });
    const msg = enviadorEmail.ultimaPara('carlos.ficticio@exemplo.local')!;
    await request(app).post('/api/auth/verificar-email').send({ token: msg.token });

    const agentePart = request.agent(app);
    await agentePart.post('/api/auth/login').send({ cpf: cpfPart, senha: 'SenhaSegura123' });

    const proibido = await agentePart.delete(`/api/coordenacao/atividades/${atividadeId}`);
    expect(proibido.status).toBe(403);

    // Participante se inscreve -> exclusão deve ser bloqueada (409).
    const insc = await agentePart.post('/api/inscricoes').send({ atividadeId });
    expect(insc.status).toBe(201);

    const bloqueada = await agenteCoord.delete(`/api/coordenacao/atividades/${atividadeId}`);
    expect(bloqueada.status).toBe(409);

    // Após cancelar inscrição, coordenação consegue excluir.
    await agentePart.post(`/api/inscricoes/${insc.body.inscricao.id}/cancelar`).send({});

    const excluida = await agenteCoord.delete(`/api/coordenacao/atividades/${atividadeId}`);
    expect(excluida.status).toBe(200);

    const lista = await request(app).get('/api/atividades');
    expect(lista.body.atividades).toHaveLength(0);

    const inexistente = await agenteCoord.delete(`/api/coordenacao/atividades/${atividadeId}`);
    expect(inexistente.status).toBe(404);
  });
});
