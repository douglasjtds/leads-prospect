import { z } from 'zod';
import { digits } from './phone';
import { PRIORIDADES, SITUACOES, type Lead, type Prioridade, type Situacao } from './types';

// Importação de novas levas (PRODUCT-SPEC §8, ARCHITECTURE §4.4). Puro, sem rede.
// As linhas brutas usam os NOMES DE CABEÇALHO da planilha como chaves (mesmo contrato do .xlsx).

/** Campos de um lead que vêm da importação. Os campos do app (Status, Toques...) nascem vazios. */
export interface LeadNovo {
  prioridade: Prioridade | null;
  nicho: string;
  empresa: string;
  cidade: string;
  uf: string;
  telefone: string;
  situacao: Situacao;
  linkAtual: string;
  urlAtual: string;
  nota: number | null;
  avaliacoes: number | null;
  googleMaps: string;
  placeId: string;
  observacoes: string;
  mensagemTexto: string;
}

export type LinhaBruta = Record<string, unknown>;

export interface Descartado {
  empresa: string;
  motivo: string;
}

export type ResultadoNormalizacao = { ok: true; lead: LeadNovo } | ({ ok: false } & Descartado);

export interface PlanoImportacao {
  novos: LeadNovo[];
  duplicados: Descartado[];
  ignorados: Descartado[];
}

// ---------- Conversões de célula ----------

function textoCelula(valor: unknown): string {
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return '';
}

const texto = z.unknown().transform(textoCelula);

function obrigatorio(nome: string) {
  return texto.pipe(z.string().min(1, `${nome} vazio.`));
}

function enumCelula<T extends string>(nome: string, valores: readonly [T, ...T[]]) {
  return texto.pipe(
    z.string().refine((v): v is T => (valores as readonly string[]).includes(v), {
      error: (issue) => (issue.input === '' ? `${nome} vazia.` : `${nome} inválida: "${String(issue.input)}".`),
    }),
  );
}

function numeroCelula(nome: string) {
  return z.unknown().transform((valor, ctx): number | null => {
    if (typeof valor === 'number') {
      if (Number.isFinite(valor)) return valor;
    } else {
      const t = textoCelula(valor).replace(',', '.');
      if (!t) return null;
      const n = Number(t);
      if (Number.isFinite(n)) return n;
    }
    ctx.addIssue({ code: 'custom', message: `${nome} não é um número: "${String(valor)}".` });
    return z.NEVER;
  });
}

const prioridadeCelula = texto.pipe(
  z.string().refine((v) => v === '' || (PRIORIDADES as readonly string[]).includes(v), {
    error: (issue) => `Prioridade inválida: "${String(issue.input)}".`,
  }),
);

const camposSchema = z.object({
  Empresa: obrigatorio('Empresa'),
  'Place ID': obrigatorio('Place ID'),
  'Situação': enumCelula('Situação', SITUACOES),
  Nicho: obrigatorio('Nicho'),
  Cidade: obrigatorio('Cidade'),
  UF: obrigatorio('UF'),
  Telefone: texto,
  'URL atual': texto,
  Prioridade: prioridadeCelula,
  Nota: numeroCelula('Nota'),
  'Avaliações': numeroCelula('Avaliações'),
  'Link atual': texto,
  'Google Maps': texto,
  'Observações': texto,
  'Mensagem (texto)': texto,
});

const CHAVES = Object.keys(camposSchema.shape);

const linhaSchema = camposSchema.refine((l) => l.Telefone !== '' || l['URL atual'] !== '', {
  error: 'Sem Telefone e sem URL atual.',
});

/** Valida as colunas obrigatórias e converte para LeadNovo, ou diz por que a linha foi ignorada. */
export function normalizarLinha(bruta: LinhaBruta): ResultadoNormalizacao {
  // Coluna ausente vale como célula vazia.
  const r = linhaSchema.safeParse(Object.fromEntries(CHAVES.map((k) => [k, bruta[k] ?? ''])));
  if (!r.success) {
    return { ok: false, empresa: textoCelula(bruta.Empresa) || '(sem nome)', motivo: r.error.issues[0]?.message ?? 'Linha inválida.' };
  }
  const l = r.data;
  return {
    ok: true,
    lead: {
      prioridade: (l.Prioridade || null) as Prioridade | null,
      nicho: l.Nicho,
      empresa: l.Empresa,
      cidade: l.Cidade,
      uf: l.UF,
      telefone: l.Telefone,
      situacao: l['Situação'] as Situacao,
      linkAtual: l['Link atual'],
      urlAtual: l['URL atual'],
      nota: l.Nota,
      avaliacoes: l['Avaliações'],
      googleMaps: l['Google Maps'],
      placeId: l['Place ID'],
      observacoes: l['Observações'],
      mensagemTexto: l['Mensagem (texto)'],
    },
  };
}

// ---------- Dedupe ----------

/**
 * Normaliza o lote e descarta o que já existe (mesmo Place ID ou mesmos dígitos de telefone),
 * tanto na planilha quanto dentro do próprio lote. Telefone vazio nunca conta como repetido.
 */
export function planejarImportacao(brutas: readonly LinhaBruta[], existentes: readonly Lead[]): PlanoImportacao {
  const porPlace = new Map<string, string>();
  const porFone = new Map<string, string>();
  for (const lead of existentes) {
    const quem = `na linha ${lead.linha} (${lead.empresa})`;
    if (lead.placeId) porPlace.set(lead.placeId, quem);
    const fone = digits(lead.telefone);
    if (fone) porFone.set(fone, quem);
  }

  const plano: PlanoImportacao = { novos: [], duplicados: [], ignorados: [] };
  for (const bruta of brutas) {
    const r = normalizarLinha(bruta);
    if (!r.ok) {
      plano.ignorados.push({ empresa: r.empresa, motivo: r.motivo });
      continue;
    }
    const { lead } = r;
    const fone = digits(lead.telefone);
    const mesmoPlace = porPlace.get(lead.placeId);
    const mesmoFone = fone ? porFone.get(fone) : undefined;
    if (mesmoPlace) {
      plano.duplicados.push({ empresa: lead.empresa, motivo: `Place ID já existe ${mesmoPlace}` });
      continue;
    }
    if (mesmoFone) {
      plano.duplicados.push({ empresa: lead.empresa, motivo: `telefone já existe ${mesmoFone}` });
      continue;
    }
    const quem = `no próprio lote (${lead.empresa})`;
    porPlace.set(lead.placeId, quem);
    if (fone) porFone.set(fone, quem);
    plano.novos.push(lead);
  }
  return plano;
}
