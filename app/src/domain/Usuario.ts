import { ValidationError } from './errors.js';

export const PAPEIS = ['participante', 'coordenacao'] as const;
export type Papel = (typeof PAPEIS)[number];

/** Espelha a tabela `usuarios`. */
export interface UsuarioProps {
  id: string;
  nome: string;
  email: string;
  cpfHash: string;
  senhaHash: string;
  emailVerificado: boolean;
  papel: Papel;
  criadoEm: Date;
}

/** Visão segura do usuário para respostas HTTP (sem hashes). */
export interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  emailVerificado: boolean;
}

export class Usuario {
  private constructor(private readonly props: UsuarioProps) {}

  /** Cria a partir de dados já persistidos/validados (ex.: linha do banco). */
  static restaurar(props: UsuarioProps): Usuario {
    if (!PAPEIS.includes(props.papel)) {
      throw new ValidationError('Papel de usuário inválido.');
    }
    return new Usuario({ ...props, nome: Usuario.normalizarNome(props.nome) });
  }

  /** Remove espaços extras e valida o tamanho do nome (usado no certificado). */
  static normalizarNome(nome: unknown): string {
    if (typeof nome !== 'string') {
      throw new ValidationError('Nome inválido.');
    }
    const normalizado = nome.trim().replace(/\s+/g, ' ');
    if (normalizado.length < 2 || normalizado.length > 120) {
      throw new ValidationError('O nome deve ter entre 2 e 120 caracteres.');
    }
    return normalizado;
  }

  get id(): string {
    return this.props.id;
  }
  get nome(): string {
    return this.props.nome;
  }
  get email(): string {
    return this.props.email;
  }
  get cpfHash(): string {
    return this.props.cpfHash;
  }
  get senhaHash(): string {
    return this.props.senhaHash;
  }
  get papel(): Papel {
    return this.props.papel;
  }
  get emailVerificado(): boolean {
    return this.props.emailVerificado;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }

  get ehCoordenacao(): boolean {
    return this.props.papel === 'coordenacao';
  }

  /** Só quem verificou o e-mail pode se inscrever em atividades. */
  get podeSeInscrever(): boolean {
    return this.props.emailVerificado;
  }

  toPublico(): UsuarioPublico {
    return {
      id: this.props.id,
      nome: this.props.nome,
      email: this.props.email,
      papel: this.props.papel,
      emailVerificado: this.props.emailVerificado,
    };
  }

  /** Evita que `JSON.stringify(usuario)` exponha cpfHash/senhaHash. */
  toJSON(): UsuarioPublico {
    return this.toPublico();
  }
}
