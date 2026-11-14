import { parseHistorico } from '@/lib/domain/historico';

/** Histórico do mais recente para o mais antigo, data em mono (PRODUCT-SPEC §7.5). */
export function History({ historico }: { historico: string }) {
  const eventos = parseHistorico(historico).reverse();
  if (eventos.length === 0) return <p className="text-small text-ink-muted">Nada registrado ainda.</p>;
  return (
    <ol className="space-y-1.5">
      {eventos.map((evento, i) => (
        <li key={`${i}-${evento.data}-${evento.texto}`} className="flex gap-3 text-small">
          <span className="w-11 shrink-0 font-mono text-micro leading-5 text-ink-muted">{evento.data || '·'}</span>
          <span className="min-w-0">{evento.texto}</span>
        </li>
      ))}
    </ol>
  );
}
