import { ConflictError } from './errors.js';

export const STATUS_INSCRICAO = ['ativa', 'cancelada'] as const;
export type StatusInscricao = (typeof STATUS_INSCRICAO)[number];

/** Espelha a tabela `inscricoes`. */
export interface InscricaoProps {
  id: string;
  usuarioId: string;
  atividadeId: string;
  status: StatusInscricao;
  presente: boolean;
  criadoEm: Date;
  canceladaEm: Date | null;
}

/**
 * Inscrição de um usuário em uma atividade.
 *
 * Os métodos alteram o estado em memória; quem persiste (e libera a vaga na
 * atividade, dentro de uma transação) é a camada de serviço/repositório,
 * que será criada na próxima etapa.
 */
export class Inscricao {
  private constructor(private props: InscricaoProps) {}

  static restaurar(props: InscricaoProps): Inscricao {
    return new Inscricao({ ...props });
  }

  get estaAtiva(): boolean {
    return this.props.status === 'ativa';
  }

  /**
   * Cancela a inscrição (a vaga deve ser devolvida pela transação que persistir).
   * Decisão provisória: não é possível cancelar depois de ter presença
   * registrada, para não "apagar" um certificado já devido.
   */
  cancelar(agora: Date = new Date()): void {
    if (!this.estaAtiva) {
      throw new ConflictError('A inscrição já está cancelada.');
    }
    if (this.props.presente) {
      throw new ConflictError('Não é possível cancelar uma inscrição com presença registrada.');
    }
    this.props = { ...this.props, status: 'cancelada', canceladaEm: agora };
  }

  registrarPresenca(): void {
    if (!this.estaAtiva) {
      throw new ConflictError('Não é possível registrar presença em inscrição cancelada.');
    }
    this.props = { ...this.props, presente: true };
  }

  removerPresenca(): void {
    if (!this.estaAtiva) {
      throw new ConflictError('Não é possível alterar presença de inscrição cancelada.');
    }
    this.props = { ...this.props, presente: false };
  }

  /** Certificado só com inscrição ativa E presença confirmada. */
  get podeEmitirCertificado(): boolean {
    return this.estaAtiva && this.props.presente === true;
  }

  get id(): string {
    return this.props.id;
  }
  get usuarioId(): string {
    return this.props.usuarioId;
  }
  get atividadeId(): string {
    return this.props.atividadeId;
  }
  get status(): StatusInscricao {
    return this.props.status;
  }
  get presente(): boolean {
    return this.props.presente;
  }
  get criadoEm(): Date {
    return this.props.criadoEm;
  }
  get canceladaEm(): Date | null {
    return this.props.canceladaEm;
  }

  /** Dono da inscrição: base para impedir IDOR (usuário A acessando dados de B). */
  pertenceA(usuarioId: string): boolean {
    return this.props.usuarioId === usuarioId;
  }
}
