import { ConflictError, ValidationError } from '../domain/errors.js';
import { type Papel, Usuario } from '../domain/Usuario.js';
import type { TokenGerado } from '../security/TokenService.js';
import type { BancoDados } from './types.js';

interface LinhaUsuario {
  id: string;
  nome: string;
  email: string;
  cpf_hash: string;
  senha_hash: string;
  email_verificado: boolean;
  papel: Papel;
  criado_em: Date;
}

const COLUNAS_USUARIO =
  'id, nome, email, cpf_hash, senha_hash, email_verificado, papel, criado_em';

function mapearUsuario(linha: LinhaUsuario): Usuario {
  return Usuario.restaurar({
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    cpfHash: linha.cpf_hash,
    senhaHash: linha.senha_hash,
    emailVerificado: linha.email_verificado,
    papel: linha.papel,
    criadoEm: new Date(linha.criado_em),
  });
}

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  cpfHash: string;
  senhaHash: string;
  papel?: Papel;
  emailVerificado?: boolean;
}

export class UsuarioRepository {
  constructor(private readonly db: BancoDados) {}

  async criarComTokenVerificacao(
    dados: CriarUsuarioInput,
    tokenGerado: TokenGerado,
  ): Promise<Usuario> {
    try {
      return await this.db.transacao(async (cliente) => {
        const { rows } = await cliente.query<LinhaUsuario>(
          `INSERT INTO usuarios (nome, email, cpf_hash, senha_hash, papel, email_verificado)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING ${COLUNAS_USUARIO}`,
          [
            dados.nome,
            dados.email,
            dados.cpfHash,
            dados.senhaHash,
            dados.papel ?? 'participante',
            dados.emailVerificado ?? false,
          ],
        );
        const linha = rows[0]!;
        await cliente.query(
          `INSERT INTO tokens_verificacao_email (usuario_id, token_hash, expira_em)
           VALUES ($1, $2, $3)`,
          [linha.id, tokenGerado.tokenHash, tokenGerado.expiraEm],
        );
        return mapearUsuario(linha);
      });
    } catch (erro) {
      if ((erro as { code?: string }).code === '23505') {
        throw new ConflictError('Não foi possível concluir o cadastro com os dados informados.');
      }
      throw erro;
    }
  }

  async criarNovoTokenVerificacao(usuarioId: string, tokenGerado: TokenGerado): Promise<void> {
    await this.db.transacao(async (cliente) => {
      await cliente.query(
        `UPDATE tokens_verificacao_email
            SET usado_em = now()
          WHERE usuario_id = $1 AND usado_em IS NULL`,
        [usuarioId],
      );
      await cliente.query(
        `INSERT INTO tokens_verificacao_email (usuario_id, token_hash, expira_em)
         VALUES ($1, $2, $3)`,
        [usuarioId, tokenGerado.tokenHash, tokenGerado.expiraEm],
      );
    });
  }

  async verificarEmailPorToken(tokenHash: string, agora: Date = new Date()): Promise<Usuario> {
    return this.db.transacao(async (cliente) => {
      const { rows: tokens } = await cliente.query<{ usuario_id: string }>(
        `UPDATE tokens_verificacao_email
            SET usado_em = $2
          WHERE token_hash = $1
            AND usado_em IS NULL
            AND expira_em > $2
          RETURNING usuario_id`,
        [tokenHash, agora],
      );
      const tokenAtualizado = tokens[0];
      if (!tokenAtualizado) {
        throw new ValidationError('Token de verificação inválido ou expirado.');
      }

      const { rows: usuarios } = await cliente.query<LinhaUsuario>(
        `UPDATE usuarios
            SET email_verificado = true
          WHERE id = $1
          RETURNING ${COLUNAS_USUARIO}`,
        [tokenAtualizado.usuario_id],
      );
      return mapearUsuario(usuarios[0]!);
    });
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const { rows } = await this.db.query<LinhaUsuario>(
      `SELECT ${COLUNAS_USUARIO} FROM usuarios WHERE id = $1`,
      [id],
    );
    return rows[0] ? mapearUsuario(rows[0]) : null;
  }

  async buscarPorCpfHash(cpfHash: string): Promise<Usuario | null> {
    const { rows } = await this.db.query<LinhaUsuario>(
      `SELECT ${COLUNAS_USUARIO} FROM usuarios WHERE cpf_hash = $1`,
      [cpfHash],
    );
    return rows[0] ? mapearUsuario(rows[0]) : null;
  }
}
