'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { UseModelos } from '@/hooks/use-modelos';
import { cx } from '@/lib/cx';
import { modeloDe } from '@/lib/domain/messages';
import {
  ehVariavel,
  NOME_MODELO,
  ROTULO_VARIAVEL,
  segmentar,
  temProblema,
  validarModelo,
  VARIAVEIS,
  variaveisDe,
  type ChaveModelo,
  type ProblemasModelo,
  type ValoresVariaveis,
} from '@/lib/domain/templates';
import { CLASSE_TEXTAREA } from './bloco';

// Caixa da mensagem com as variáveis do modelo travadas (PRODUCT-SPEC §6). Cada variável vira
// uma etiqueta com o valor do lead aberto; não dá para editar por dentro, só apagar inteira.
// O DOM é a fonte do texto enquanto o Douglas digita (React não controla o conteúdo).

const CLASSE_ETIQUETA =
  'rounded-xs border border-accent-soft-edge bg-accent-soft px-0.5 text-ink [box-decoration-break:clone] cursor-default';
const CLASSE_ETIQUETA_VAZIA = 'text-micro text-ink-muted italic';

function montar(raiz: HTMLElement, modelo: string, valores: ValoresVariaveis): void {
  raiz.replaceChildren(
    ...segmentar(modelo).map((s) => {
      if (s.tipo === 'texto') return document.createTextNode(s.valor);
      const valor = valores[s.nome];
      const span = document.createElement('span');
      span.contentEditable = 'false';
      span.dataset.var = s.nome;
      span.className = cx(CLASSE_ETIQUETA, !valor && CLASSE_ETIQUETA_VAZIA);
      span.textContent = valor || ROTULO_VARIAVEL[s.nome];
      span.title = valor ? `Variável: ${ROTULO_VARIAVEL[s.nome]}. Muda a cada lead.` : `Variável: ${ROTULO_VARIAVEL[s.nome]} (vazia neste lead).`;
      return span;
    }),
  );
}

/** Lê o DOM de volta como modelo, com `{variavel}` no lugar das etiquetas. */
function serializar(no: Node): string {
  let saida = '';
  no.childNodes.forEach((filho, i) => {
    if (filho.nodeType === Node.TEXT_NODE) {
      saida += filho.textContent ?? '';
    } else if (filho instanceof HTMLElement) {
      const nome = filho.dataset.var;
      if (nome && ehVariavel(nome)) saida += `{${nome}}`;
      else if (filho.tagName === 'BR') saida += '\n';
      else {
        // Bloco que o navegador criou (div/p) numa quebra de linha.
        const bloco = filho.tagName === 'DIV' || filho.tagName === 'P';
        if (bloco && i > 0 && !saida.endsWith('\n')) saida += '\n';
        saida += serializar(filho);
      }
    }
  });
  return saida;
}

interface EditorMensagemProps {
  id: string;
  /** Modelo com que a caixa abre. Para recomeçar, troque a `key`. */
  modeloInicial: string;
  valores: ValoresVariaveis;
  onModelo: (modelo: string) => void;
  rotulo: string;
  /** Caixa baixa (respostas rápidas). */
  compacto?: boolean;
}

export function EditorMensagem({ id, modeloInicial, valores, onModelo, rotulo, compacto }: EditorMensagemProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Só na montagem: depois disso o conteúdo é do Douglas.
  const inicial = useRef({ modeloInicial, valores });

  useLayoutEffect(() => {
    if (ref.current) montar(ref.current, inicial.current.modeloInicial, inicial.current.valores);
  }, []);

  /** `{empresa}` digitado à mão vira etiqueta ao sair da caixa (lá o cursor não importa). */
  function aoSair(raiz: HTMLDivElement) {
    const digitada = [...raiz.childNodes].some(
      (no) => no.nodeType === Node.TEXT_NODE && variaveisDe(no.textContent ?? '').length > 0,
    );
    if (digitada) montar(raiz, serializar(raiz), inicial.current.valores);
  }

  return (
    <div
      id={id}
      ref={ref}
      role="textbox"
      aria-multiline="true"
      aria-label={rotulo}
      tabIndex={0}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      onInput={(evento) => onModelo(serializar(evento.currentTarget))}
      onBlur={(evento) => aoSair(evento.currentTarget)}
      className={cx(CLASSE_TEXTAREA, compacto ? 'min-h-11' : 'min-h-28', 'resize-none whitespace-pre-wrap break-words outline-none')}
    />
  );
}

// ---------- Salvar para todos / Restaurar padrão ----------

function listaVariaveis(nomes: readonly string[]): string {
  return nomes.map((n) => (ehVariavel(n) ? ROTULO_VARIAVEL[n] : n)).join(', ');
}

function Aviso({ problemas }: { problemas: ProblemasModelo }) {
  return (
    <div className="text-small">
      {problemas.desconhecidas.length > 0 ? (
        <p>
          {problemas.desconhecidas.map((d) => `{${d}}`).join(', ')} não existe. Use{' '}
          {VARIAVEIS.map((v) => `{${v}}`).join(', ')}.
        </p>
      ) : null}
      {problemas.faltando.length > 0 ? (
        <p>
          Sumiu do texto: {listaVariaveis(problemas.faltando)}. Todos os leads vão receber a mensagem sem esse dado. Para
          recolocar, digite {problemas.faltando.map((f) => `{${f}}`).join(' ou ')} no lugar.
        </p>
      ) : null}
      {problemas.escritasAMao.map(({ nome, valor }) => (
        <p key={nome}>
          &quot;{valor}&quot; está escrito no texto e vai aparecer igual para todos os leads.
        </p>
      ))}
    </div>
  );
}

interface ControlesModeloProps {
  chave: ChaveModelo;
  /** Modelo como está na caixa agora. */
  modelo: string;
  valores: ValoresVariaveis;
  gestor: UseModelos;
}

/** Botões abaixo da caixa. Só aparecem quando há o que salvar ou restaurar. */
export function ControlesModelo({ chave, modelo, valores, gestor }: ControlesModeloProps) {
  const emUso = modeloDe(chave, gestor.modelos);
  const salvo = Boolean(gestor.modelos[chave]?.trim());
  const [etapa, setEtapa] = useState<'livre' | 'conferir' | 'restaurar' | 'gravando'>('livre');
  const [problemas, setProblemas] = useState<ProblemasModelo | null>(null);

  const alterado = modelo !== emUso;
  if (!alterado && !salvo) return null;

  async function gravar() {
    setEtapa('gravando');
    await gestor.salvar(chave, modelo);
    setEtapa('livre');
    setProblemas(null);
  }

  function pedirSalvar() {
    const p = validarModelo(emUso, modelo, valores);
    if (temProblema(p)) {
      setProblemas(p);
      setEtapa('conferir');
    } else {
      void gravar();
    }
  }

  async function restaurar() {
    setEtapa('gravando');
    await gestor.restaurar(chave);
    setEtapa('livre');
  }

  if (etapa === 'conferir' && problemas) {
    const bloqueia = problemas.desconhecidas.length > 0;
    return (
      <div role="alert" className="mt-3 rounded-xs border border-warn-soft-edge bg-warn-soft px-3 py-2.5">
        <p className="text-small font-medium">Confira antes de salvar para todos</p>
        <div className="mt-1">
          <Aviso problemas={problemas} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {bloqueia ? null : (
            <Button variant="secondary" onClick={() => void gravar()}>
              Salvar assim
            </Button>
          )}
          <Button variant="ghost" onClick={() => setEtapa('livre')}>
            Voltar e corrigir
          </Button>
        </div>
      </div>
    );
  }

  if (etapa === 'restaurar') {
    return (
      <div role="group" aria-label="Restaurar o texto padrão" className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-label text-ink-muted">voltar ao texto padrão para todos os leads?</span>
        <Button variant="ghost" onClick={() => void restaurar()}>
          Restaurar
        </Button>
        <Button variant="ghost" className="border-transparent text-ink-muted" onClick={() => setEtapa('livre')}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      {alterado ? (
        <>
          <Button variant="ghost" disabled={etapa === 'gravando'} onClick={pedirSalvar}>
            Salvar para todos
          </Button>
          <span className="text-label text-ink-muted">vale para: {NOME_MODELO[chave]}</span>
        </>
      ) : null}
      {salvo && !alterado ? (
        <>
          <span className="text-label text-ink-muted">texto personalizado</span>
          <Button
            variant="ghost"
            className="border-transparent text-ink-muted"
            disabled={etapa === 'gravando'}
            onClick={() => setEtapa('restaurar')}
          >
            Restaurar padrão
          </Button>
        </>
      ) : null}
    </div>
  );
}
