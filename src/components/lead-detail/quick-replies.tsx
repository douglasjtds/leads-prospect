'use client';

import { mostrarErro, mostrarToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { copiar } from '@/lib/clipboard';
import { respostasRapidas } from '@/lib/domain/messages';
import type { Status } from '@/lib/domain/types';

/** Status em que as respostas rápidas aparecem (PRODUCT-SPEC §6). */
const STATUS_COM_RESPOSTAS: readonly Status[] = ['Resposta automática', 'Respondeu', 'Reunião marcada', 'Proposta enviada'];

export function temRespostasRapidas(status: Status): boolean {
  return STATUS_COM_RESPOSTAS.includes(status);
}

/** Um clique copia a resposta. */
export function QuickReplies() {
  return (
    <ul className="flex flex-wrap gap-2">
      {respostasRapidas().map((resposta) => (
        <li key={resposta.rotulo}>
          <Button
            variant="ghost"
            title={resposta.texto}
            aria-label={`Copiar resposta: ${resposta.rotulo}`}
            onClick={async () => {
              if (await copiar(resposta.texto)) mostrarToast(`Copiado: ${resposta.rotulo}`);
              else mostrarErro('não consegui copiar. Copie o texto à mão.');
            }}
          >
            {resposta.rotulo}
          </Button>
        </li>
      ))}
    </ul>
  );
}
