import { Chip } from '@/components/ui/chip';
import { STATUS, type Acao, type Status } from '@/lib/domain/types';

interface StatusChipsProps {
  atual: Status;
  aplicar: (acao: Acao) => void;
}

/** Chips com todos os status, o atual preenchido (PRODUCT-SPEC §7.5). */
export function StatusChips({ atual, aplicar }: StatusChipsProps) {
  return (
    <div role="group" aria-label="Status do lead" className="flex flex-wrap gap-1.5">
      {STATUS.map((status) => (
        <Chip
          key={status}
          active={status === atual}
          onClick={() => {
            if (status !== atual) aplicar({ tipo: 'mudarStatus', status });
          }}
        >
          {status}
        </Chip>
      ))}
    </div>
  );
}
