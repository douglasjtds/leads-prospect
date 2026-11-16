// Modelos de mensagem com variáveis (PRODUCT-SPEC §6). Puro: sem acesso à planilha nem ao DOM.
// Um modelo é texto com marcadores `{nome}`. Cada marcador vira um dado do lead aberto.

export const VARIAVEIS = ['empresa', 'nicho', 'cidade', 'elogio', 'observacao'] as const;
export type Variavel = (typeof VARIAVEIS)[number];
export type ValoresVariaveis = Readonly<Record<Variavel, string>>;

/** Como cada variável aparece para o Douglas (etiqueta vazia, aviso). */
export const ROTULO_VARIAVEL: Readonly<Record<Variavel, string>> = {
  empresa: 'empresa',
  nicho: 'nicho',
  cidade: 'cidade',
  elogio: 'elogio',
  observacao: 'observação',
};

export const CHAVES_MODELO = [
  'primeiraPadrao',
  'primeiraSiteAmador',
  'fu3',
  'fu7',
  'furar',
  'cobrarRA',
  'site',
  'proposta',
  'rrPreco',
  'rrInstagram',
  'rrAgoraNao',
  'rrLink',
] as const;
export type ChaveModelo = (typeof CHAVES_MODELO)[number];

/** Modelos salvos pela tela. Chave ausente = texto padrão do código. */
export type Modelos = Readonly<Partial<Record<ChaveModelo, string>>>;

/** Para o botão "Salvar para todos": a que mensagem o modelo se aplica. */
export const NOME_MODELO: Readonly<Record<ChaveModelo, string>> = {
  primeiraPadrao: '1ª mensagem (sem site, rede social ou link na bio)',
  primeiraSiteAmador: '1ª mensagem (site amador)',
  fu3: 'follow-up dia 3',
  fu7: 'follow-up final',
  furar: 'furar a resposta automática',
  cobrarRA: 'cobrar retorno',
  site: 'mandar o site',
  proposta: 'cobrar a proposta',
  rrPreco: 'resposta "Quanto custa?"',
  rrInstagram: 'resposta "Já tenho Instagram"',
  rrAgoraNao: 'resposta "Agora não"',
  rrLink: 'resposta "Link do site"',
};

export function ehChaveModelo(valor: string): valor is ChaveModelo {
  return (CHAVES_MODELO as readonly string[]).includes(valor);
}

export function ehVariavel(valor: string): valor is Variavel {
  return (VARIAVEIS as readonly string[]).includes(valor);
}

export type Segmento = { tipo: 'texto'; valor: string } | { tipo: 'var'; nome: Variavel };

const MARCADOR = /\{([^{}\s]+)\}/g;

/** Quebra o modelo em texto e variáveis. Marcador com nome desconhecido fica como texto. */
export function segmentar(modelo: string): Segmento[] {
  const segmentos: Segmento[] = [];
  let texto = '';
  let ultimo = 0;
  for (const m of modelo.matchAll(MARCADOR)) {
    const nome = m[1]!;
    if (!ehVariavel(nome)) continue;
    texto += modelo.slice(ultimo, m.index);
    if (texto) segmentos.push({ tipo: 'texto', valor: texto });
    texto = '';
    segmentos.push({ tipo: 'var', nome });
    ultimo = m.index + m[0].length;
  }
  texto += modelo.slice(ultimo);
  if (texto) segmentos.push({ tipo: 'texto', valor: texto });
  return segmentos;
}

/** Monta o modelo de volta a partir dos segmentos. */
export function juntar(segmentos: readonly Segmento[]): string {
  return segmentos.map((s) => (s.tipo === 'texto' ? s.valor : `{${s.nome}}`)).join('');
}

export function variaveisDe(modelo: string): Variavel[] {
  return segmentar(modelo).flatMap((s) => (s.tipo === 'var' ? [s.nome] : []));
}

/** Marcadores `{x}` cujo nome não é variável conhecida. */
export function marcadoresDesconhecidos(modelo: string): string[] {
  const nomes = [...modelo.matchAll(MARCADOR)].map((m) => m[1]!).filter((n) => !ehVariavel(n));
  return [...new Set(nomes)];
}

/**
 * Troca as variáveis pelos valores. Tira o espaço que sobra no fim da linha quando uma variável
 * vazia (ex.: observação) fecha a frase.
 */
export function renderizar(modelo: string, valores: ValoresVariaveis): string {
  return segmentar(modelo)
    .map((s) => (s.tipo === 'texto' ? s.valor : valores[s.nome]))
    .join('')
    .replace(/[ \t]+$/gm, '');
}

function ocorrencias(texto: string, trecho: string): number {
  if (!trecho) return 0;
  return texto.split(trecho).length - 1;
}

function textoPuro(modelo: string): string {
  return segmentar(modelo)
    .map((s) => (s.tipo === 'texto' ? s.valor : '\u0000'))
    .join('');
}

/** Valor curto demais para avisar (ex.: "." do elogio) gera falso positivo. */
const MINIMO_ESCRITO_A_MAO = 4;

export interface ProblemasModelo {
  /** Variáveis que estavam no modelo original e sumiram. */
  faltando: Variavel[];
  /** `{x}` digitado com nome que não existe. Impede salvar. */
  desconhecidas: string[];
  /** O valor do lead aberto foi escrito como texto (vai igual para todos). */
  escritasAMao: Array<{ nome: Variavel; valor: string }>;
}

export function validarModelo(original: string, editado: string, valores?: ValoresVariaveis): ProblemasModelo {
  const presentes = new Set(variaveisDe(editado));
  const faltando = [...new Set(variaveisDe(original))].filter((v) => !presentes.has(v));

  const escritasAMao: ProblemasModelo['escritasAMao'] = [];
  if (valores) {
    const puroOriginal = textoPuro(original);
    const puroEditado = textoPuro(editado);
    for (const nome of VARIAVEIS) {
      const valor = valores[nome].trim();
      if (valor.length < MINIMO_ESCRITO_A_MAO) continue;
      if (ocorrencias(puroEditado, valor) > ocorrencias(puroOriginal, valor)) escritasAMao.push({ nome, valor });
    }
  }

  return { faltando, desconhecidas: marcadoresDesconhecidos(editado), escritasAMao };
}

export function temProblema(p: ProblemasModelo): boolean {
  return p.faltando.length > 0 || p.desconhecidas.length > 0 || p.escritasAMao.length > 0;
}
