'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Kbd } from '@/components/ui/kbd';
import { Kicker } from '@/components/ui/kicker';
import { Pill } from '@/components/ui/pill';
import { Segmented } from '@/components/ui/segmented';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { contraste, parseCor } from '@/lib/contrast';
import { STATUS, type Status } from '@/lib/domain/types';

// Classes escritas por extenso para o Tailwind detectar (nada de bg-${token}).
const PALETA: ReadonlyArray<{ token: string; swatch: string; papel: string }> = [
  { token: 'paper', swatch: 'bg-paper', papel: 'Fundo da página' },
  { token: 'raised', swatch: 'bg-raised', papel: 'Inputs, item selecionado, caixa da próxima ação' },
  { token: 'surface', swatch: 'bg-surface', papel: 'Faixas, áreas secundárias, hover secundário' },
  { token: 'line', swatch: 'bg-line', papel: 'Bordas e divisórias (1px)' },
  { token: 'ink', swatch: 'bg-ink', papel: 'Texto principal, Enviei, chip ativo' },
  { token: 'ink-muted', swatch: 'bg-ink-muted', papel: 'Texto de apoio, metadados, kicker' },
  { token: 'accent', swatch: 'bg-accent', papel: 'Primário, sublinhado, aba ativa, seleção' },
  { token: 'accent-hover', swatch: 'bg-accent-hover', papel: 'Hover do primário, texto sobre accent-soft' },
  { token: 'accent-soft', swatch: 'bg-accent-soft', papel: 'Pill Respondeu e Reunião marcada' },
  { token: 'on-accent', swatch: 'bg-on-accent', papel: 'Texto sobre accent' },
  { token: 'inverse', swatch: 'bg-inverse', papel: 'Toast' },
  { token: 'on-inverse', swatch: 'bg-on-inverse', papel: 'Texto sobre inverse' },
  { token: 'on-inverse-muted', swatch: 'bg-on-inverse-muted', papel: 'Texto secundário sobre inverse' },
  { token: 'accent-on-inverse', swatch: 'bg-accent-on-inverse', papel: 'Acento sobre fundo escuro' },
  { token: 'warn', swatch: 'bg-warn', papel: 'Texto da pill Resposta automática' },
  { token: 'warn-soft', swatch: 'bg-warn-soft', papel: 'Fundo da pill Resposta automática' },
  { token: 'ok', swatch: 'bg-ok', papel: 'Texto da pill Fechado' },
  { token: 'ok-soft', swatch: 'bg-ok-soft', papel: 'Fundo da pill Fechado' },
  { token: 'violet-soft', swatch: 'bg-violet-soft', papel: 'Fundo da pill Proposta enviada' },
];

// DESIGN-GUIDELINES §3, tabela de contraste: [texto, fundo, ratio documentado].
const PARES: ReadonlyArray<readonly [string, string, number]> = [
  ['ink', 'paper', 16.62],
  ['ink', 'raised', 17.71],
  ['ink-muted', 'paper', 6.96],
  ['ink-muted', 'surface', 6.28],
  ['on-accent', 'accent', 5.5],
  ['accent', 'paper', 5.16],
  ['accent-hover', 'accent-soft', 5.84],
  ['on-inverse', 'inverse', 16.62],
  ['warn', 'warn-soft', 4.96],
  ['ok', 'ok-soft', 5.17],
];

const ESCALA: ReadonlyArray<{ nome: string; classe: string; spec: string; exemplo: string }> = [
  { nome: 'display', classe: 'text-display', spec: '28px 700 / 1.15 / -0.01em', exemplo: 'Clínica Sorriso Pleno' },
  { nome: 'title', classe: 'text-title', spec: '18px 700 / 1.3', exemplo: 'Teste A/B da 1ª mensagem' },
  { nome: 'body', classe: 'text-body', spec: '15px 400 / 1.45', exemplo: 'Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.' },
  { nome: 'body-strong', classe: 'text-body-strong', spec: '15px 600', exemplo: 'Pet Shop Amigo Fiel' },
  { nome: 'small', classe: 'text-small', spec: '13px 400', exemplo: 'Presidente Prudente/SP · Pet shop · 38 aval. · vence hoje' },
  { nome: 'label', classe: 'text-label', spec: '12px 400 mono / 0.02em', exemplo: 'linha 32 / pet shop / prioridade alta' },
  { nome: 'micro', classe: 'text-micro', spec: '11px 400 mono', exemplo: '12/25 · 07/11 · ctrl+v' },
];

function lerVar(nome: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${nome}`).trim();
}

// Ratios medidos no CSS computado do navegador. Calculados uma vez e guardados, para o
// useSyncExternalStore receber sempre a mesma referência.
let ratiosMedidos: ReadonlyArray<number | null> | undefined;
function medirRatios(): ReadonlyArray<number | null> {
  ratiosMedidos ??= PARES.map(([texto, fundo]) => {
    try {
      return contraste(parseCor(lerVar(texto)), parseCor(lerVar(fundo)));
    } catch {
      return null;
    }
  });
  return ratiosMedidos;
}
const semAssinatura = () => () => {};
const noServidor = () => null;

function Secao({ n, titulo, children }: { n: string; titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-8">
      <Kicker>
        {n} / {titulo}
      </Kicker>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Styleguide() {
  const ratios = useSyncExternalStore(semAssinatura, medirRatios, noServidor);
  const [statusAtivo, setStatusAtivo] = useState<Status>('Contatado');
  const [versao, setVersao] = useState<'curta' | 'completa'>('curta');
  const [abrirNo, setAbrirNo] = useState<'whatsapp web' | 'app'>('whatsapp web');

  return (
    <main className="mx-auto max-w-content px-5 pb-16 md:px-8">
      <header className="py-10">
        <Kicker>00 / styleguide</Kicker>
        <h1 className="mt-3 text-display">
          Sistema visual da <span className="emphasis">prospecção</span>
        </h1>
        <p className="mt-2 max-w-[60ch] text-small text-ink-muted">
          Tokens, escala e componentes da DESIGN-GUIDELINES. Só existe em desenvolvimento.
        </p>
      </header>

      <Secao n="01" titulo="paleta">
        <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {PALETA.map(({ token, swatch, papel }) => (
            <li key={token} className="flex items-center gap-3 border-b border-line py-2.5">
              <span className={`size-9 shrink-0 rounded-xs border border-line ${swatch}`} />
              <span className="min-w-0">
                <span className="block text-label text-ink">{token}</span>
                <span className="block truncate text-small text-ink-muted">{papel}</span>
              </span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao n="02" titulo="contraste">
        <table className="w-full max-w-2xl text-left">
          <thead>
            <tr className="border-b border-line text-label text-ink-muted">
              <th className="py-2 font-normal">texto sobre fundo</th>
              <th className="py-2 text-right font-normal">documento</th>
              <th className="py-2 text-right font-normal">medido</th>
              <th className="py-2 text-right font-normal">aa</th>
            </tr>
          </thead>
          <tbody>
            {PARES.map(([texto, fundo, doc], i) => {
              const medido = ratios?.[i] ?? null;
              return (
                <tr key={`${texto}-${fundo}`} className="border-b border-line text-small">
                  <td className="py-2">
                    <code className="text-label">{texto}</code> sobre <code className="text-label">{fundo}</code>
                  </td>
                  <td className="py-2 text-right text-label">{doc.toFixed(2)}</td>
                  <td className="py-2 text-right text-label">{medido === null ? '…' : medido.toFixed(2)}</td>
                  <td className="py-2 text-right text-label">
                    {medido === null ? '…' : medido >= 4.5 ? 'passa' : 'falha'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Secao>

      <Secao n="03" titulo="tipografia">
        <ul>
          {ESCALA.map(({ nome, classe, spec, exemplo }) => (
            <li
              key={nome}
              className="grid grid-cols-1 gap-1 border-b border-line py-3 md:grid-cols-[180px_1fr] md:items-baseline md:gap-6"
            >
              <span className="text-label text-ink-muted">
                {nome} <span className="text-micro">· {spec}</span>
              </span>
              <span className={classe}>{exemplo}</span>
            </li>
          ))}
          <li className="grid grid-cols-1 gap-1 py-3 md:grid-cols-[180px_1fr] md:items-baseline md:gap-6">
            <span className="text-label text-ink-muted">ênfase</span>
            <span className="text-title">
              Nada pendente <span className="emphasis">hoje</span>.
            </span>
          </li>
        </ul>
      </Secao>

      <Secao n="04" titulo="botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={<WhatsAppIcon />} shortcut="C">
            Copiar e abrir WhatsApp
          </Button>
          <Button variant="confirm" shortcut="E">
            Enviei
          </Button>
          <Button variant="secondary">Ainda sem resposta</Button>
          <Button variant="ghost">Pular</Button>
          <Button variant="ghost">← Lista</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled>
            primary desabilitado
          </Button>
          <Button variant="confirm" disabled>
            confirm desabilitado
          </Button>
          <Button variant="secondary" disabled>
            secondary desabilitado
          </Button>
          <Button variant="ghost" disabled>
            ghost desabilitado
          </Button>
        </div>
      </Secao>

      <Secao n="05" titulo="chips de status">
        <div className="flex flex-wrap gap-2">
          {STATUS.map((status) => (
            <Chip key={status} active={status === statusAtivo} onClick={() => setStatusAtivo(status)}>
              {status}
            </Chip>
          ))}
        </div>
      </Secao>

      <Secao n="06" titulo="pills">
        <div className="flex flex-wrap gap-2">
          {STATUS.map((status) => (
            <Pill key={status} status={status} />
          ))}
        </div>
      </Secao>

      <Secao n="07" titulo="segmentado e kbd">
        <div className="flex flex-wrap items-center gap-6">
          <Segmented label="versão da mensagem" options={['curta', 'completa'] as const} value={versao} onChange={setVersao} />
          <span className="flex items-center gap-2 text-label text-ink-muted">
            abrir no
            <Segmented label="abrir no" options={['whatsapp web', 'app'] as const} value={abrirNo} onChange={setAbrirNo} />
          </span>
          <span className="flex items-center gap-1.5 text-small text-ink-muted">
            <Kbd>/</Kbd> busca · <Kbd>Esc</Kbd> limpa · <Kbd>J</Kbd> <Kbd>K</Kbd> navegar
          </span>
        </div>
      </Secao>

      <Secao n="08" titulo="kicker">
        <div className="flex flex-col gap-2">
          <Kicker>01 / hoje</Kicker>
          <Kicker>linha 32 / pet shop / prioridade alta</Kicker>
        </div>
      </Secao>
    </main>
  );
}
