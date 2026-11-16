'use client';

import { useState, type ReactNode } from 'react';
import { mostrarErro, mostrarToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { useCelular } from '@/hooks/use-celular';
import type { UseModelos } from '@/hooks/use-modelos';
import { useAbrirEm, useVariante } from '@/hooks/use-pref';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { copiar } from '@/lib/clipboard';
import { modeloDe, valoresDoLead, varianteEfetiva } from '@/lib/domain/messages';
import { MOTIVOS_PULAR, proximaAcao } from '@/lib/domain/next-action';
import { renderizar, variaveisDe, type ChaveModelo, type ValoresVariaveis } from '@/lib/domain/templates';
import { VARIANTES, type Acao, type Lead, type ResultadoRevisao, type Variante } from '@/lib/domain/types';
import { ABRIR_EM, abrirEmEfetivo, urlChat, urlDm, type AbrirEm } from '@/lib/whatsapp';
import { CLASSE_TEXTAREA } from './bloco';
import { ControlesModelo, EditorMensagem } from './editor-mensagem';

// Bloco "próxima ação" (PRODUCT-SPEC §7.5 e §5.2/§5.3, ARCHITECTURE §8).

interface NextActionProps {
  lead: Lead;
  /** Aplica e avança para o próximo da fila do Hoje (Enviei, Pular, Revisar). */
  concluir: (acao: Acao) => void;
  gestor: UseModelos;
}

/** De onde vem o texto da caixa: um modelo (editável para todos) ou a coluna Mensagem (texto). */
type Fonte = { tipo: 'modelo'; chave: ChaveModelo; modelo: string; valores: ValoresVariaveis } | { tipo: 'texto'; texto: string };

const BOTOES_REVISAR: ReadonlyArray<{ resultado: ResultadoRevisao; rotulo: string }> = [
  { resultado: 'semResposta', rotulo: 'Ainda sem resposta' },
  { resultado: 'respostaAutomatica', rotulo: 'Resposta automática' },
  { resultado: 'respondeu', rotulo: 'Respondeu' },
  { resultado: 'semInteresse', rotulo: 'Sem interesse' },
];

/** Abre o chat sem texto. No web, reaproveita a mesma aba nomeada "whatsapp". */
function abrirChat(url: string, onde: AbrirEm): void {
  if (onde === 'app') window.location.href = url;
  else window.open(url, 'whatsapp', 'noopener');
}

function abrirDm(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function NextAction({ lead, concluir, gestor }: NextActionProps) {
  const prox = proximaAcao(lead);
  const [variante, setVariante] = useVariante();
  const [preferencia, setPreferencia] = useAbrirEm();
  const celular = useCelular();
  const abrirEm = abrirEmEfetivo(preferencia, celular);
  const chat = urlChat(lead.telefone, abrirEm);
  const dm = urlDm(lead);

  const ehPrimeira = prox.tipo === 'primeira';
  const fonte: Fonte | null = !prox.chave
    ? null
    : ehPrimeira && varianteEfetiva(lead, variante) === 'completa'
      ? { tipo: 'texto', texto: lead.mensagemTexto.trim() }
      : { tipo: 'modelo', chave: prox.chave, modelo: modeloDe(prox.chave, gestor.modelos), valores: valoresDoLead(lead) };

  // No celular não há escolha: o WhatsApp Web não abre conversa lá.
  const seletorAbrir = chat && !celular ? (
    <div className="flex items-center gap-2">
      <span className="text-label text-ink-muted">abrir no</span>
      <Segmented label="Abrir o chat no" options={ABRIR_EM} value={preferencia} onChange={setPreferencia} />
    </div>
  ) : null;

  return (
    <div>
      <h3 className="text-body-strong">{prox.titulo}</h3>
      <p className="mt-0.5 text-small text-ink-muted">{prox.sub}</p>

      {prox.tipo === 'revisar' ? (
        <Revisar chat={chat} dm={dm} abrirEm={abrirEm} concluir={concluir} seletorAbrir={seletorAbrir} />
      ) : fonte ? (
        <ComTexto
          // Recomeça a caixa ao trocar de lead, de variante ou quando o modelo salvo muda.
          key={`${lead.placeId}:${prox.tipo}:${ehPrimeira ? variante : ''}:${fonte.tipo === 'modelo' ? fonte.modelo : ''}`}
          fonte={fonte}
          gestor={gestor}
          variante={ehPrimeira ? variante : null}
          setVariante={setVariante}
          semCompleta={ehPrimeira && variante === 'completa' && varianteEfetiva(lead, 'completa') === 'curta'}
          podePular={lead.status === 'A contatar'}
          chat={chat}
          dm={dm}
          abrirEm={abrirEm}
          celular={celular}
          concluir={concluir}
          seletorAbrir={seletorAbrir}
        />
      ) : lead.status === 'A contatar' ? (
        <Pular concluir={concluir} className="mt-4" />
      ) : null}
    </div>
  );
}

interface ComTextoProps {
  fonte: Fonte;
  gestor: UseModelos;
  /** Só na 1ª mensagem; null nas demais. */
  variante: Variante | null;
  setVariante: (v: Variante) => void;
  semCompleta: boolean;
  podePular: boolean;
  chat: string | null;
  dm: string | null;
  abrirEm: AbrirEm;
  /** No celular não existe Ctrl+V: o toast fala só em colar. */
  celular: boolean;
  concluir: (acao: Acao) => void;
  seletorAbrir: ReactNode;
}

function ComTexto({
  fonte,
  gestor,
  variante,
  setVariante,
  semCompleta,
  podePular,
  chat,
  dm,
  abrirEm,
  celular,
  concluir,
  seletorAbrir,
}: ComTextoProps) {
  // Modelo (com {variaveis}) quando a fonte é modelo; texto puro quando é a coluna Mensagem (texto).
  const [conteudo, setConteudo] = useState(fonte.tipo === 'modelo' ? fonte.modelo : fonte.texto);
  const texto = fonte.tipo === 'modelo' ? renderizar(conteudo, fonte.valores) : conteudo;

  async function copiarEAbrir() {
    if (!(await copiar(texto))) {
      mostrarErro('não consegui copiar. Selecione o texto e copie à mão.');
      return;
    }
    if (chat) {
      abrirChat(chat, abrirEm);
      mostrarToast(celular ? 'Mensagem copiada: cole no chat' : 'Mensagem copiada: cole com Ctrl+V');
    } else {
      if (dm) abrirDm(dm);
      mostrarToast(celular ? 'Mensagem copiada: cole na DM' : 'Mensagem copiada: cole na DM com Ctrl+V');
    }
  }

  function enviei() {
    concluir(variante ? { tipo: 'enviei', variante } : { tipo: 'enviei' });
  }

  useShortcuts({ c: () => void copiarEAbrir(), e: enviei });

  return (
    <div className="mt-4">
      {variante ? (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Segmented label="Versão da mensagem" options={VARIANTES} value={variante} onChange={setVariante} />
          {semCompleta ? (
            <span className="text-label text-ink-muted">sem versão completa na planilha: usando a curta</span>
          ) : null}
        </div>
      ) : null}

      {fonte.tipo === 'modelo' ? (
        <>
          <EditorMensagem
            id="mensagem"
            rotulo="Mensagem"
            modeloInicial={fonte.modelo}
            valores={fonte.valores}
            onModelo={setConteudo}
          />
          {variaveisDe(fonte.modelo).length > 0 ? (
            <p className="mt-1.5 text-label text-ink-muted">Trechos destacados mudam a cada lead.</p>
          ) : null}
          <ControlesModelo chave={fonte.chave} modelo={conteudo} valores={fonte.valores} gestor={gestor} />
        </>
      ) : (
        <>
          <label htmlFor="mensagem" className="sr-only">
            Mensagem
          </label>
          <textarea
            id="mensagem"
            value={conteudo}
            onChange={(evento) => setConteudo(evento.target.value)}
            className={`${CLASSE_TEXTAREA} min-h-28 field-sizing-content`}
          />
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {chat ? (
          <Button variant="primary" icon={<WhatsAppIcon />} shortcut="C" onClick={() => void copiarEAbrir()}>
            Copiar e abrir WhatsApp
          </Button>
        ) : (
          <Button variant="primary" shortcut="C" onClick={() => void copiarEAbrir()}>
            Copiar mensagem
          </Button>
        )}
        <Button variant="confirm" shortcut="E" onClick={enviei}>
          Enviei
        </Button>
        {podePular ? <Pular concluir={concluir} /> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {chat ? seletorAbrir : <p className="text-label text-ink-muted">telefone fixo: mande pela DM</p>}
      </div>
    </div>
  );
}

function Revisar({
  chat,
  dm,
  abrirEm,
  concluir,
  seletorAbrir,
}: {
  chat: string | null;
  dm: string | null;
  abrirEm: AbrirEm;
  concluir: (acao: Acao) => void;
  seletorAbrir: ReactNode;
}) {
  function abrir() {
    if (chat) abrirChat(chat, abrirEm);
    else if (dm) abrirDm(dm);
  }

  useShortcuts({ c: abrir });

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {chat ? (
          <Button variant="primary" icon={<WhatsAppIcon />} shortcut="C" onClick={abrir}>
            Abrir o chat
          </Button>
        ) : dm ? (
          <Button variant="primary" shortcut="C" onClick={abrir}>
            Abrir o link atual
          </Button>
        ) : null}
        {seletorAbrir}
      </div>
      <p className="mt-4 text-small text-ink-muted">O que aconteceu depois da 1ª mensagem?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {BOTOES_REVISAR.map(({ resultado, rotulo }) => (
          <Button key={resultado} variant="secondary" onClick={() => concluir({ tipo: 'revisar', resultado })}>
            {rotulo}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** "Pular" com motivo, só em A contatar (PRODUCT-SPEC §5.2). */
function Pular({ concluir, className }: { concluir: (acao: Acao) => void; className?: string }) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <Button variant="ghost" className={className} onClick={() => setAberto(true)} aria-expanded={false}>
        Pular
      </Button>
    );
  }
  return (
    <div role="group" aria-label="Motivo para pular" className={`flex w-full flex-wrap items-center gap-2 ${className ?? ''}`}>
      <span className="text-label text-ink-muted">pular por</span>
      {MOTIVOS_PULAR.map((motivo) => (
        <Button key={motivo} variant="ghost" onClick={() => concluir({ tipo: 'pular', motivo })}>
          {motivo}
        </Button>
      ))}
      <Button variant="ghost" className="border-transparent text-ink-muted" onClick={() => setAberto(false)}>
        Cancelar
      </Button>
    </div>
  );
}
