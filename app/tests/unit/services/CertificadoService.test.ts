import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { InternalError } from '../../../src/domain/errors.js';
import {
  CertificadoService,
  formatarCargaHoraria,
  formatarDataEmissao,
  formatarPeriodoAtividade,
  nomeArquivoCertificado,
} from '../../../src/services/CertificadoService.js';

function contarPaginasPdf(pdf: Buffer): number {
  const texto = pdf.toString('latin1');
  const ocorrencias = texto.match(/\/Type\s*\/Page\b(?!s)/g);
  return ocorrencias ? ocorrencias.length : 0;
}

describe('CertificadoService', () => {
  it('formata carga horária, período e nome de arquivo corretamente', () => {
    expect(formatarCargaHoraria(45)).toBe('45 minutos');
    expect(formatarCargaHoraria(1)).toBe('1 minuto');
    expect(formatarCargaHoraria(60)).toBe('1 hora');
    expect(formatarCargaHoraria(120)).toBe('2 horas');
    expect(formatarCargaHoraria(90)).toBe('1h30min');
    expect(formatarCargaHoraria(65)).toBe('1h05min');

    const mesmoDia = formatarPeriodoAtividade(
      new Date('2026-11-25T19:00:00-03:00'),
      new Date('2026-11-25T20:30:00-03:00'),
    );
    expect(mesmoDia).toContain('25 de novembro de 2026');
    expect(mesmoDia).toContain('19h00');
    expect(mesmoDia).toContain('20h30');

    const diasDiferentes = formatarPeriodoAtividade(
      new Date('2026-11-25T19:00:00-03:00'),
      new Date('2026-11-26T21:00:00-03:00'),
    );
    expect(diasDiferentes).toContain('25/11/2026');
    expect(diasDiferentes).toContain('26/11/2026');

    expect(formatarDataEmissao(new Date('2026-11-25T15:00:00-03:00'))).toBe(
      '25 de novembro de 2026',
    );
    expect(nomeArquivoCertificado('12345678-abcd-4000-8000-000000000000')).toBe(
      'certificado-12345678.pdf',
    );
  });

  it('gera PDF válido em uma única página com acentuação em português', async () => {
    const service = new CertificadoService();
    const pdf = await service.gerarPdf({
      inscricaoId: '11111111-2222-4333-8444-555555555555',
      participanteNome: "João Conceição d'Ávila e Araújo",
      atividadeTitulo: 'Oficina: Programação, Segurança & Acentuação — Edição Especial (Ç/Ã/É)',
      atividadeInicio: new Date('2026-11-25T19:00:00-03:00'),
      atividadeFim: new Date('2026-11-25T21:30:00-03:00'),
      cargaHorariaMinutos: 150,
      emitidoEm: new Date('2026-11-25T22:00:00-03:00'),
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.subarray(-64).toString('ascii')).toContain('%%EOF');
    expect(pdf.length).toBeGreaterThan(2000);
    expect(contarPaginasPdf(pdf)).toBe(1);
  });

  it('mantém o certificado em página única mesmo com nome (120 chars) e título (200 chars) máximos', async () => {
    const service = new CertificadoService();
    const nomeLongo = 'Maria Conceição da Silva Albuquerque Fernandes Oliveira dos Santos Pereira '.repeat(
      2,
    ).slice(0, 120);
    const tituloLongo =
      'Seminário Avançado de Arquitetura Distribuída, Concorrência em Banco de Dados e Privacidade por Design '.repeat(
        2,
      ).slice(0, 200);

    const pdf = await service.gerarPdf({
      inscricaoId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      participanteNome: nomeLongo,
      atividadeTitulo: tituloLongo,
      atividadeInicio: new Date('2026-11-25T19:00:00-03:00'),
      atividadeFim: new Date('2026-11-26T22:00:00-03:00'),
      cargaHorariaMinutos: 300,
    });

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(contarPaginasPdf(pdf)).toBe(1);
  });

  it('suporta gerações simultâneas sem conflitos entre requisições', async () => {
    const service = new CertificadoService();
    const promessas = Array.from({ length: 10 }, (_, idx) =>
      service.gerarPdf({
        inscricaoId: `0000000${idx}-0000-4000-8000-000000000000`,
        participanteNome: `Participante Fictício ${idx + 1}`,
        atividadeTitulo: 'Palestra de Concorrência',
        atividadeInicio: new Date('2026-11-25T19:00:00-03:00'),
        atividadeFim: new Date('2026-11-25T20:00:00-03:00'),
        cargaHorariaMinutos: 60,
      }),
    );

    const pdfs = await Promise.all(promessas);
    for (const pdf of pdfs) {
      expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(contarPaginasPdf(pdf)).toBe(1);
    }
  });

  it('falha com InternalError quando a pasta de fontes não existe', async () => {
    const service = new CertificadoService(path.resolve('/tmp/pasta-fontes-inexistente-cenario8'));
    await expect(
      service.gerarPdf({
        inscricaoId: '11111111-2222-4333-8444-555555555555',
        participanteNome: 'Alice Fictícia',
        atividadeTitulo: 'Atividade Teste',
        atividadeInicio: new Date('2026-11-25T19:00:00-03:00'),
        atividadeFim: new Date('2026-11-25T20:00:00-03:00'),
        cargaHorariaMinutos: 60,
      }),
    ).rejects.toBeInstanceOf(InternalError);
  });
});
