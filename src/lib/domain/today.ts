import { fmtDiaMes } from './dates';
import { proximaAcao } from './next-action';
import type { DataISO, Lead } from './types';

// Seções da aba Hoje (PRODUCT-SPEC §7.4).

export type ChaveSecao = 'responderam' | 'automaticas' | 'followups' | 'revisar' | 'novos';

export interface SecaoHoje {
  chave: ChaveSecao;
  titulo: string;
  dica: string;
  leads: Lead[];
}

/** Mínimo de novos visíveis mesmo com a meta do dia batida. */
export const MINIMO_NOVOS = 3;

function vencido(data: DataISO | null, hoje: DataISO): boolean {
  return data !== null && data <= hoje;
}

function vazioOuVencido(data: DataISO | null, hoje: DataISO): boolean {
  return data === null || data <= hoje;
}

/** Próx. ação vazia primeiro, depois a mais antiga; empate pela ordem da planilha. */
function porProxAcao(a: Lead, b: Lead): number {
  if (a.proxAcao !== b.proxAcao) {
    if (a.proxAcao === null) return -1;
    if (b.proxAcao === null) return 1;
    return a.proxAcao < b.proxAcao ? -1 : 1;
  }
  return a.linha - b.linha;
}

/** Quantas 1ª mensagens foram registradas hoje (eventos "dd/MM 1ª msg" no Histórico). */
export function contarEnviadosHoje(leads: readonly Lead[], hoje: DataISO): number {
  const prefixo = `${fmtDiaMes(hoje)} 1ª msg`;
  return leads.filter((l) => l.historico.split(' · ').some((e) => e.trim().startsWith(prefixo))).length;
}

export function secoesHoje(
  leads: readonly Lead[],
  hoje: DataISO,
  meta: number,
  enviadosHoje: number,
): SecaoHoje[] {
  const responderam = leads
    .filter((l) => (l.status === 'Respondeu' || l.status === 'Reunião marcada') && vazioOuVencido(l.proxAcao, hoje))
    .sort(porProxAcao);

  const automaticas = leads
    .filter((l) => {
      if (l.status !== 'Resposta automática' || !vazioOuVencido(l.proxAcao, hoje)) return false;
      const tipo = proximaAcao(l).tipo;
      return tipo === 'furar' || tipo === 'cobrarRA';
    })
    .sort(porProxAcao);

  const followups = leads
    .filter(
      (l) =>
        (l.status === 'Contatado' && (l.toques === 1 || l.toques === 2) && vencido(l.proxAcao, hoje)) ||
        (l.status === 'Proposta enviada' && vazioOuVencido(l.proxAcao, hoje)),
    )
    .sort(porProxAcao);

  const revisar = leads.filter((l) => l.status === 'Contatado' && l.toques === 0).sort(porProxAcao);

  const faltam = Math.max(meta - enviadosHoje, 0);
  const novos = leads
    .filter((l) => l.status === 'A contatar')
    .sort((a, b) => a.linha - b.linha)
    .slice(0, Math.max(faltam, MINIMO_NOVOS));

  const secoes: SecaoHoje[] = [
    { chave: 'responderam', titulo: 'Responderam: sua vez', dica: 'mande o site ou continue a conversa', leads: responderam },
    { chave: 'automaticas', titulo: 'Respostas automáticas para furar', dica: 'fure a fila e fale com o responsável', leads: automaticas },
    { chave: 'followups', titulo: 'Follow-ups vencidos', dica: 'dia 3, final e propostas', leads: followups },
    { chave: 'revisar', titulo: 'Revisar no WhatsApp', dica: 'abra o chat e diga o que aconteceu', leads: revisar },
    {
      chave: 'novos',
      titulo: 'Novos envios',
      dica: faltam > 0 ? `faltam ${faltam} para a meta` : 'meta batida',
      leads: novos,
    },
  ];
  return secoes.filter((s) => s.leads.length > 0);
}
