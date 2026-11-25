import { existsSync } from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { InternalError } from '../domain/errors.js';

export function resolverPastaFontesPadrao(): string {
  const candidatos = [
    path.resolve(import.meta.dirname, '../../assets/fonts'),
    path.resolve(import.meta.dirname, '../assets/fonts'),
    path.resolve(process.cwd(), 'assets/fonts'),
  ];
  return (
    candidatos.find((dir) => existsSync(path.join(dir, 'LiberationSans-Regular.ttf'))) ??
    candidatos[0]!
  );
}

export const PASTA_FONTES = resolverPastaFontesPadrao();

const FUSO_EVENTO = 'America/Sao_Paulo';

export interface DadosCertificado {
  inscricaoId: string;
  participanteNome: string;
  atividadeTitulo: string;
  atividadeInicio: Date;
  atividadeFim: Date;
  cargaHorariaMinutos: number;
  emitidoEm?: Date;
}

export interface FontesCertificado {
  sansRegular: string;
  sansBold: string;
  serifRegular: string;
  serifBold: string;
}

function fontesPadrao(pastaFontes: string): FontesCertificado {
  return {
    sansRegular: path.join(pastaFontes, 'LiberationSans-Regular.ttf'),
    sansBold: path.join(pastaFontes, 'LiberationSans-Bold.ttf'),
    serifRegular: path.join(pastaFontes, 'LiberationSerif-Regular.ttf'),
    serifBold: path.join(pastaFontes, 'LiberationSerif-Bold.ttf'),
  };
}

/** Formata carga horária em minutos para exibição legível no certificado. */
export function formatarCargaHoraria(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas > 0 && resto > 0) {
    return `${horas}h${String(resto).padStart(2, '0')}min`;
  }
  if (horas > 0) {
    return horas === 1 ? '1 hora' : `${horas} horas`;
  }
  return resto === 1 ? '1 minuto' : `${resto} minutos`;
}

function partesDataBr(data: Date): { diaMesAno: string; dataLonga: string; horaMinuto: string } {
  const diaMesAno = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_EVENTO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data);

  const dataLonga = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_EVENTO,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(data);

  const horaPartes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_EVENTO,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(data);
  const horaMinuto = horaPartes.replace(':', 'h');

  return { diaMesAno, dataLonga, horaMinuto };
}

/** Formata o período da atividade no fuso de Brasília. */
export function formatarPeriodoAtividade(inicio: Date, fim: Date): string {
  const pInicio = partesDataBr(inicio);
  const pFim = partesDataBr(fim);

  if (pInicio.diaMesAno === pFim.diaMesAno) {
    return `${pInicio.dataLonga}, das ${pInicio.horaMinuto} às ${pFim.horaMinuto}`;
  }
  return `${pInicio.diaMesAno} (${pInicio.horaMinuto}) a ${pFim.diaMesAno} (${pFim.horaMinuto})`;
}

export function formatarDataEmissao(data: Date): string {
  return partesDataBr(data).dataLonga;
}

export function nomeArquivoCertificado(inscricaoId: string): string {
  const limpo = inscricaoId.replace(/[^a-z0-9-]/gi, '').slice(0, 8) || 'documento';
  return `certificado-${limpo}.pdf`;
}

function tamanhoFonteNome(nome: string): number {
  if (nome.length > 90) return 18;
  if (nome.length > 55) return 21;
  return 25;
}

function tamanhoFonteTituloAtividade(tituloAtividade: string): number {
  if (tituloAtividade.length > 140) return 13.5;
  if (tituloAtividade.length > 85) return 15;
  return 16.5;
}

/**
 * Gera certificados de participação em PDF usando PDFKit em memória (`Buffer`),
 * com fontes TrueType (SIL OFL) empacotadas no projeto para acentuação UTF-8
 * completa e independência de fontes do sistema operacional.
 */
export class CertificadoService {
  private readonly fontes: FontesCertificado;

  constructor(pastaFontes: string = resolverPastaFontesPadrao()) {
    this.fontes = fontesPadrao(pastaFontes);
  }

  private validarFontes(): void {
    for (const caminho of Object.values(this.fontes)) {
      if (!existsSync(caminho)) {
        throw new InternalError('Fonte necessária para geração de certificado não encontrada.');
      }
    }
  }

  async gerarPdf(dados: DadosCertificado): Promise<Buffer> {
    this.validarFontes();

    return new Promise<Buffer>((resolve, reject) => {
      let finalizado = false;
      const concluirErro = (erro: unknown) => {
        if (finalizado) return;
        finalizado = true;
        reject(erro instanceof Error ? erro : new Error(String(erro)));
      };

      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 48,
          font: this.fontes.sansRegular,
          info: {
            Title: 'Certificado de Participação — Semana Acadêmica',
            Author: 'Semana Acadêmica',
            Subject: 'Certificado de participação em atividade acadêmica',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          if (finalizado) return;
          finalizado = true;
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', concluirErro);

        doc.registerFont('sans', this.fontes.sansRegular);
        doc.registerFont('sans-bold', this.fontes.sansBold);
        doc.registerFont('serif', this.fontes.serifRegular);
        doc.registerFont('serif-bold', this.fontes.serifBold);

        this.desenharCertificado(doc, dados);
        doc.end();
      } catch (erro) {
        concluirErro(erro);
      }
    });
  }

  private desenharCertificado(doc: PDFKit.PDFDocument, dados: DadosCertificado): void {
    const largura = doc.page.width;
    const altura = doc.page.height;
    const margemConteudo = 84;
    const larguraTexto = largura - margemConteudo * 2;
    const emitidoEm = dados.emitidoEm ?? new Date();

    // Fundo e molduras institucionais
    doc.rect(0, 0, largura, altura).fill('#ffffff');

    doc
      .lineWidth(3)
      .strokeColor('#1e3a8a')
      .rect(24, 24, largura - 48, altura - 48)
      .stroke();

    doc
      .lineWidth(1)
      .strokeColor('#93c5fd')
      .rect(34, 34, largura - 68, altura - 68)
      .stroke();

    // Faixa superior discreta
    doc.rect(34, 34, largura - 68, 12).fill('#1e3a8a');

    // Cabeçalho
    doc
      .fillColor('#1d4ed8')
      .font('sans-bold')
      .fontSize(11)
      .text('SEMANA ACADÊMICA DE COMPUTAÇÃO', margemConteudo, 76, {
        width: larguraTexto,
        align: 'center',
        characterSpacing: 1.5,
      });

    doc
      .fillColor('#0f172a')
      .font('serif-bold')
      .fontSize(30)
      .text('CERTIFICADO DE PARTICIPAÇÃO', margemConteudo, doc.y + 8, {
        width: larguraTexto,
        align: 'center',
      });

    const yLinhaTitulo = doc.y + 10;
    doc
      .lineWidth(1.5)
      .strokeColor('#1d4ed8')
      .moveTo(largura / 2 - 90, yLinhaTitulo)
      .lineTo(largura / 2 + 90, yLinhaTitulo)
      .stroke();

    // Corpo com fluxo dinâmico para suportar nomes/títulos longos sem sobreposição
    doc
      .fillColor('#334155')
      .font('sans')
      .fontSize(13)
      .text('Certificamos que', margemConteudo, yLinhaTitulo + 26, {
        width: larguraTexto,
        align: 'center',
      });

    const fonteNome = tamanhoFonteNome(dados.participanteNome);
    doc
      .fillColor('#0f172a')
      .font('serif-bold')
      .fontSize(fonteNome)
      .text(dados.participanteNome, margemConteudo, doc.y + 10, {
        width: larguraTexto,
        align: 'center',
      });

    const yLinhaNome = doc.y + 6;
    doc
      .lineWidth(0.75)
      .strokeColor('#cbd5e1')
      .moveTo(marguraCentralizada(largura, 440), yLinhaNome)
      .lineTo(largura - marguraCentralizada(largura, 440), yLinhaNome)
      .stroke();

    const periodo = formatarPeriodoAtividade(dados.atividadeInicio, dados.atividadeFim);
    const cargaHoraria = formatarCargaHoraria(dados.cargaHorariaMinutos);
    const fonteTitulo = tamanhoFonteTituloAtividade(dados.atividadeTitulo);

    doc
      .fillColor('#334155')
      .font('sans')
      .fontSize(13)
      .text('participou da atividade', margemConteudo, yLinhaNome + 22, {
        width: larguraTexto,
        align: 'center',
      });

    doc
      .fillColor('#0f172a')
      .font('sans-bold')
      .fontSize(fonteTitulo)
      .text(`“${dados.atividadeTitulo}”`, margemConteudo, doc.y + 8, {
        width: larguraTexto,
        align: 'center',
        lineGap: 3,
      });

    doc
      .fillColor('#334155')
      .font('sans')
      .fontSize(13)
      .text(
        `realizada em ${periodo}, com carga horária total de ${cargaHoraria}.`,
        margemConteudo,
        doc.y + 10,
        {
          width: larguraTexto,
          align: 'center',
          lineGap: 3,
        },
      );

    // Rodapé fixo dentro da área útil
    const yAssinatura = altura - 140;
    doc
      .lineWidth(1)
      .strokeColor('#475569')
      .moveTo(largura / 2 - 130, yAssinatura)
      .lineTo(largura / 2 + 130, yAssinatura)
      .stroke();

    doc
      .fillColor('#0f172a')
      .font('sans-bold')
      .fontSize(11)
      .text('Coordenação da Semana Acadêmica', margemConteudo, yAssinatura + 8, {
        width: larguraTexto,
        align: 'center',
      });

    doc
      .fillColor('#475569')
      .font('sans')
      .fontSize(10)
      .text(`Emitido em ${formatarDataEmissao(emitidoEm)}`, margemConteudo, yAssinatura + 24, {
        width: larguraTexto,
        align: 'center',
      });

    doc
      .fillColor('#64748b')
      .font('sans')
      .fontSize(8.5)
      .text(
        `Código de registro da inscrição: ${dados.inscricaoId}`,
        margemConteudo,
        altura - 74,
        {
          width: larguraTexto,
          align: 'center',
        },
      );

    doc
      .fillColor('#94a3b8')
      .font('sans')
      .fontSize(8)
      .text(
        'Documento emitido em ambiente acadêmico de testes com dados 100% fictícios.',
        margemConteudo,
        altura - 60,
        {
          width: larguraTexto,
          align: 'center',
        },
      );
  }
}

function marguraCentralizada(larguraPagina: number, larguraLinha: number): number {
  return (larguraPagina - larguraLinha) / 2;
}
