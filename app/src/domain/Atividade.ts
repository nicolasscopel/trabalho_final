import { ValidationError } from './errors.js';

/** Espelha a tabela `atividades`. */
export interface AtividadeProps {
  id: string;
  titulo: string;
  descricao: string | null;
  inicio: Date;
  fim: Date;
  cargaHorariaMinutos: number;
  vagas: number;
  vagasOcupadas: number;
}

/**
 * Atividade da semana acadêmica (palestra, minicurso...).
 *
 * As mesmas regras daqui também existem como CHECK no banco
 * (db/migrations/001_schema_inicial.sql). A classe dá mensagens amigáveis;
 * o banco é a última linha de defesa sob concorrência.
 */
export class Atividade {
  private constructor(private readonly props: AtividadeProps) {}

  static criar(props: AtividadeProps): Atividade {
    const titulo = typeof props.titulo === 'string' ? props.titulo.trim() : '';
    if (titulo.length < 3 || titulo.length > 200) {
      throw new ValidationError('O título deve ter entre 3 e 200 caracteres.');
    }
    if (!Atividade.ehDataValida(props.inicio) || !Atividade.ehDataValida(props.fim)) {
      throw new ValidationError('Datas de início e fim são obrigatórias.');
    }
    if (props.inicio.getTime() >= props.fim.getTime()) {
      throw new ValidationError('O início deve ser anterior ao fim.');
    }
    if (!Number.isInteger(props.cargaHorariaMinutos) || props.cargaHorariaMinutos <= 0) {
      throw new ValidationError('A carga horária deve ser um número inteiro positivo de minutos.');
    }
    if (!Number.isInteger(props.vagas) || props.vagas <= 0) {
      throw new ValidationError('O número de vagas deve ser um inteiro positivo.');
    }
    if (
      !Number.isInteger(props.vagasOcupadas) ||
      props.vagasOcupadas < 0 ||
      props.vagasOcupadas > props.vagas
    ) {
      throw new ValidationError('Vagas ocupadas fora do intervalo permitido.');
    }
    return new Atividade({ ...props, titulo });
  }

  private static ehDataValida(data: unknown): data is Date {
    return data instanceof Date && !Number.isNaN(data.getTime());
  }

  /**
   * Dois intervalos [inicio, fim) se sobrepõem se cada um começa antes do
   * outro terminar. Atividades "encostadas" (uma termina 10h, outra começa 10h)
   * NÃO conflitam.
   */
  conflitaCom(outra: Atividade): boolean {
    if (outra.id === this.id) return false;
    return (
      this.props.inicio.getTime() < outra.fim.getTime() &&
      outra.inicio.getTime() < this.props.fim.getTime()
    );
  }

  /** Retorna a primeira atividade da lista que choca com esta, ou `undefined`. */
  encontrarConflito(outras: readonly Atividade[]): Atividade | undefined {
    return outras.find((outra) => this.conflitaCom(outra));
  }

  get vagasDisponiveis(): number {
    return this.props.vagas - this.props.vagasOcupadas;
  }

  get temVaga(): boolean {
    return this.vagasDisponiveis > 0;
  }

  get id(): string {
    return this.props.id;
  }
  get titulo(): string {
    return this.props.titulo;
  }
  get descricao(): string | null {
    return this.props.descricao;
  }
  get inicio(): Date {
    return this.props.inicio;
  }
  get fim(): Date {
    return this.props.fim;
  }
  get cargaHorariaMinutos(): number {
    return this.props.cargaHorariaMinutos;
  }
  get vagas(): number {
    return this.props.vagas;
  }
  get vagasOcupadas(): number {
    return this.props.vagasOcupadas;
  }
}
