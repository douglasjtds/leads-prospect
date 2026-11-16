import type { Lead, Situacao, Variante } from './types';
import { renderizar, type ChaveModelo, type Modelos, type ValoresVariaveis } from './templates';

// Textos PADRÃO da PRODUCT-SPEC §6. Não reescreva sem pedir. O Douglas pode trocar cada modelo
// pela tela ("Salvar para todos"); o salvo fica na aba Mensagens e tem prioridade sobre estes.

export type ChaveMensagem = 'fu3' | 'fu7' | 'furar' | 'cobrarRA' | 'site' | 'proposta';

export interface RespostaRapida {
  chave: ChaveModelo;
  rotulo: string;
  texto: string;
}

export const URL_SITE = 'https://douglastertuliano.vercel.app/';

const ABERTURA = 'Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.';
const PESQUISA = 'Estava pesquisando {nicho} em {cidade} no Google e encontrei vocês{elogio}';

export const MODELOS_PADRAO: Readonly<Record<ChaveModelo, string>> = {
  primeiraPadrao: [ABERTURA, '', `${PESQUISA} {observacao}`, '', 'Posso te mostrar como ficaria uma página pra {empresa}?'].join('\n'),
  primeiraSiteAmador: [
    ABERTURA,
    '',
    `${PESQUISA} Dei uma olhada na página de vocês e tenho 2 ou 3 ideias pra ela trazer mais clientes.`,
    '',
    'Posso te mandar o que pensei pra {empresa}?',
  ].join('\n'),
  fu3: 'Oi! Passando só pra ver se você viu minha mensagem. Se não for o momento, sem problema, é só me avisar 🙂',
  fu7: 'Última mensagem por aqui, prometo. Se um dia quiserem uma página pra receber quem chega pelo Google, é só me chamar. Sucesso pra vocês!',
  furar:
    'Oi! Aqui é o Douglas, desenvolvedor web. Queria falar com o responsável sobre uma página pra vocês receberem melhor quem chega pelo Google. Consegue me direcionar?',
  cobrarRA: 'Oi! Passando pra ver se conseguiram ver minha mensagem sobre a página de vocês 🙂',
  site: [
    'Show! Esse é o meu site, com páginas que já estão no ar e como funciona:',
    URL_SITE,
    '',
    'Pra vocês, eu pensaria numa página com quem vocês são, os principais serviços, as avaliações do Google em destaque e um botão direto pro WhatsApp. A entrega é em até 10 dias úteis.',
    '',
    'Me conta: hoje a maioria dos clientes chega como? Indicação, Instagram ou Google?',
  ].join('\n'),
  proposta: 'Oi! Conseguiu dar uma olhada na proposta? Fico à disposição pra ajustar o que precisar.',
  rrPreco:
    'O plano essencial começa em R$ 500, tá explicado no site. Se quiser, te digo o que entraria no caso de vocês pra ficar mais claro.',
  rrInstagram:
    'Faz sentido, e o Instagram continua sendo a vitrine. A página não substitui, ela complementa: no Instagram a pessoa precisa rolar o feed pra achar endereço, serviços e horários. Na página ela acha tudo em 5 segundos e clica no WhatsApp.',
  rrAgoraNao:
    'Tranquilo! Posso te chamar de novo em janeiro? Começo de ano é quando o pessoal costuma organizar essas coisas.',
  rrLink: URL_SITE,
};

const RESPOSTAS_RAPIDAS: ReadonlyArray<{ chave: ChaveModelo; rotulo: string }> = [
  { chave: 'rrPreco', rotulo: 'Quanto custa?' },
  { chave: 'rrInstagram', rotulo: 'Já tenho Instagram' },
  { chave: 'rrAgoraNao', rotulo: 'Agora não' },
  { chave: 'rrLink', rotulo: 'Link do site' },
];

/** O modelo em uso: o salvo pela tela, ou o padrão. */
export function modeloDe(chave: ChaveModelo, modelos: Modelos = {}): string {
  const salvo = modelos[chave];
  return salvo?.trim() ? salvo : MODELOS_PADRAO[chave];
}

const SEM_LEAD: ValoresVariaveis = { empresa: 'vocês', nicho: '', cidade: '', elogio: '.', observacao: '' };

export function mensagem(chave: ChaveMensagem, lead: Lead | null = null, modelos: Modelos = {}): string {
  return renderizar(modeloDe(chave, modelos), lead ? valoresDoLead(lead) : SEM_LEAD);
}

export function respostasRapidas(lead: Lead | null = null, modelos: Modelos = {}): readonly RespostaRapida[] {
  const valores = lead ? valoresDoLead(lead) : SEM_LEAD;
  return RESPOSTAS_RAPIDAS.map(({ chave, rotulo }) => ({ chave, rotulo, texto: renderizar(modeloDe(chave, modelos), valores) }));
}

// ---------- Nicho no plural ----------

function chave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

const PLURAIS: Record<string, string> = {
  'clinica de estetica': 'clínicas de estética',
  dentista: 'dentistas',
  psicologo: 'psicólogos',
  nutricionista: 'nutricionistas',
  advogado: 'advogados',
  contabilidade: 'escritórios de contabilidade',
  'personal trainer': 'personal trainers',
  marcenaria: 'marcenarias',
  'estetica automotiva': 'estética automotiva',
  'pet shop': 'pet shops',
};

/**
 * Plural do nicho conforme a §6. Fora da lista: minúsculo; uma palavra só terminada em vogal
 * ganha "s". Nomes compostos ficam como estão (o plural ingênuo erraria: "salão de belezas").
 */
export function nichoPlural(nicho: string): string {
  const conhecido = PLURAIS[chave(nicho)];
  if (conhecido) return conhecido;
  const minusculo = nicho.trim().toLowerCase();
  return !minusculo.includes(' ') && /[aeiouáéíóúâêô]$/.test(minusculo) ? `${minusculo}s` : minusculo;
}

// ---------- 1ª mensagem ----------

/** Nota com vírgula decimal e uma casa (5 → "5,0"). */
export function formatarNota(nota: number): string {
  return nota.toFixed(1).replace('.', ',');
}

/** Fecho da frase da pesquisa: os números (5+ avaliações com nota) ou só o ponto. */
function elogio(lead: Lead): string {
  if (lead.avaliacoes !== null && lead.avaliacoes >= 5 && lead.nota !== null) {
    const n = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(lead.avaliacoes);
    return `: ${n} avaliações com nota ${formatarNota(lead.nota)}, parabéns!`;
  }
  return '.';
}

const DESTINOS: Partial<Record<Situacao, string>> = {
  'Instagram no lugar do site': 'pro Instagram',
  'Facebook no lugar do site': 'pro Facebook',
  'WhatsApp no lugar do site': 'direto pro WhatsApp',
  'Link na bio / plataforma': 'pra uma página de links',
};

function observacao(situacao: Situacao | null): string {
  if (situacao === 'Sem site') return 'Reparei que vocês ainda não têm site no perfil.';
  const destino = situacao ? DESTINOS[situacao] : undefined;
  return destino ? `Reparei que o botão "Site" de vocês leva ${destino}.` : '';
}

/**
 * Valor de cada variável para o lead (PRODUCT-SPEC §6). O nome sai sempre como "pra {empresa}",
 * sem artigo (não erra o gênero); sem nome, "vocês".
 */
export function valoresDoLead(lead: Lead): ValoresVariaveis {
  return {
    empresa: lead.empresa.trim() || 'vocês',
    nicho: nichoPlural(lead.nicho),
    cidade: lead.cidade.trim(),
    elogio: elogio(lead),
    observacao: observacao(lead.situacao),
  };
}

/** Qual modelo da 1ª mensagem curta vale para o lead. */
export function chavePrimeira(lead: Lead): ChaveModelo {
  return lead.situacao === 'Site amador (construtor grátis)' ? 'primeiraSiteAmador' : 'primeiraPadrao';
}

/** A variante que de fato sai: "completa" sem a coluna Mensagem (texto) cai para "curta". */
export function varianteEfetiva(lead: Lead, variante: Variante): Variante {
  return variante === 'completa' && lead.mensagemTexto.trim() ? 'completa' : 'curta';
}

export function primeiraMensagem(lead: Lead, variante: Variante, modelos: Modelos = {}): string {
  return varianteEfetiva(lead, variante) === 'completa'
    ? lead.mensagemTexto.trim()
    : renderizar(modeloDe(chavePrimeira(lead), modelos), valoresDoLead(lead));
}
