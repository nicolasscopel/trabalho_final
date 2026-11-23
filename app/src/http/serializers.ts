import type { Atividade } from '../domain/Atividade.js';
import type { Inscricao } from '../domain/Inscricao.js';

export interface AtividadeSerializada {
  id: string;
  titulo: string;
  descricao: string | null;
  inicio: string;
  fim: string;
  cargaHorariaMinutos: number;
  vagas: number;
  vagasOcupadas: number;
  vagasDisponiveis: number;
}

export interface InscricaoSerializada {
  id: string;
  usuarioId: string;
  atividadeId: string;
  status: string;
  presente: boolean;
  podeEmitirCertificado: boolean;
  criadoEm: string;
  canceladaEm: string | null;
}

export function serializarAtividade(atividade: Atividade): AtividadeSerializada {
  return {
    id: atividade.id,
    titulo: atividade.titulo,
    descricao: atividade.descricao,
    inicio: atividade.inicio.toISOString(),
    fim: atividade.fim.toISOString(),
    cargaHorariaMinutos: atividade.cargaHorariaMinutos,
    vagas: atividade.vagas,
    vagasOcupadas: atividade.vagasOcupadas,
    vagasDisponiveis: atividade.vagasDisponiveis,
  };
}

export function serializarInscricao(inscricao: Inscricao): InscricaoSerializada {
  return {
    id: inscricao.id,
    usuarioId: inscricao.usuarioId,
    atividadeId: inscricao.atividadeId,
    status: inscricao.status,
    presente: inscricao.presente,
    podeEmitirCertificado: inscricao.podeEmitirCertificado,
    criadoEm: inscricao.criadoEm.toISOString(),
    canceladaEm: inscricao.canceladaEm ? inscricao.canceladaEm.toISOString() : null,
  };
}
