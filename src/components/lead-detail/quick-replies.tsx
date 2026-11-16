'use client';

import { useState } from 'react';
import { mostrarErro, mostrarToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import type { UseModelos } from '@/hooks/use-modelos';
import { copiar } from '@/lib/clipboard';
import { modeloDe, respostasRapidas, valoresDoLead } from '@/lib/domain/messages';
import type { ChaveModelo, ValoresVariaveis } from '@/lib/domain/templates';
import type { Lead, Status } from '@/lib/domain/types';
import { ControlesModelo, EditorMensagem } from './editor-mensagem';

/** Status em que as respostas rápidas aparecem (PRODUCT-SPEC §6). */
const STATUS_COM_RESPOSTAS: readonly Status[] = ['Resposta automática', 'Respondeu', 'Reunião marcada', 'Proposta enviada'];

export function temRespostasRapidas(status: Status): boolean {
  return STATUS_COM_RESPOSTAS.includes(status);
}

/** Um clique copia a resposta. "Editar respostas" abre cada uma para salvar para todos. */
export function QuickReplies({ lead, gestor }: { lead: Lead; gestor: UseModelos }) {
  const [editando, setEditando] = useState(false);
  const respostas = respostasRapidas(lead, gestor.modelos);
  const valores = valoresDoLead(lead);

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {respostas.map((resposta) => (
          <li key={resposta.chave}>
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
        <li>
          <Button
            variant="ghost"
            className="border-transparent text-ink-muted"
            aria-expanded={editando}
            onClick={() => setEditando((v) => !v)}
          >
            {editando ? 'Fechar edição' : 'Editar respostas'}
          </Button>
        </li>
      </ul>

      {editando ? (
        <div className="mt-4 flex flex-col gap-5">
          {respostas.map((resposta) => {
            const modelo = modeloDe(resposta.chave, gestor.modelos);
            return (
              <RespostaEditavel
                key={`${resposta.chave}:${modelo}`}
                chave={resposta.chave}
                rotulo={resposta.rotulo}
                modelo={modelo}
                valores={valores}
                gestor={gestor}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function RespostaEditavel({
  chave,
  rotulo,
  modelo,
  valores,
  gestor,
}: {
  chave: ChaveModelo;
  rotulo: string;
  modelo: string;
  valores: ValoresVariaveis;
  gestor: UseModelos;
}) {
  const [atual, setAtual] = useState(modelo);
  const id = `resposta-${chave}`;
  return (
    <div>
      <p className="mb-1.5 text-small font-medium" id={`${id}-rotulo`}>
        {rotulo}
      </p>
      <EditorMensagem id={id} rotulo={`Resposta: ${rotulo}`} modeloInicial={modelo} valores={valores} onModelo={setAtual} compacto />
      <ControlesModelo chave={chave} modelo={atual} valores={valores} gestor={gestor} />
    </div>
  );
}
