'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mostrarErro, mostrarToast } from '@/components/toast';
import { ehChaveModelo, type ChaveModelo, type Modelos } from '@/lib/domain/templates';
import { ErroApi, irParaLogin, lerErro, mensagemDe, TIMEOUT_MS } from './use-leads';

// Modelos de mensagem salvos pela tela (aba Mensagens). Atualização otimista, reverte em erro.

export interface UseModelos {
  modelos: Modelos;
  /** Grava o modelo para todos os leads. true se gravou. */
  salvar: (chave: ChaveModelo, texto: string) => Promise<boolean>;
  /** Volta ao texto padrão. true se gravou. */
  restaurar: (chave: ChaveModelo) => Promise<boolean>;
}

function lerModelos(corpo: unknown): Modelos {
  if (typeof corpo !== 'object' || corpo === null || !('modelos' in corpo)) throw new ErroApi('resposta inesperada do servidor.');
  const bruto = corpo.modelos;
  if (typeof bruto !== 'object' || bruto === null) throw new ErroApi('resposta inesperada do servidor.');
  const modelos: Partial<Record<ChaveModelo, string>> = {};
  for (const [chave, texto] of Object.entries(bruto)) {
    if (ehChaveModelo(chave) && typeof texto === 'string') modelos[chave] = texto;
  }
  return modelos;
}

export function useModelos(): UseModelos {
  const [modelos, setModelosState] = useState<Modelos>({});
  const ref = useRef<Modelos>({});

  const setModelos = useCallback((novo: Modelos) => {
    ref.current = novo;
    setModelosState(novo);
  }, []);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const resposta = await fetch('/api/mensagens', { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (resposta.status === 401) irParaLogin();
        if (!resposta.ok) throw new ErroApi(await lerErro(resposta));
        const lidos = lerModelos(await resposta.json());
        if (ativo) setModelos(lidos);
      } catch (e) {
        if (ativo) mostrarErro(`não consegui carregar as mensagens salvas: ${mensagemDe(e)} Usando os textos padrão.`);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [setModelos]);

  const gravar = useCallback(
    async (chave: ChaveModelo, texto: string | null, aviso: string): Promise<boolean> => {
      const antes = ref.current;
      const novo: Partial<Record<ChaveModelo, string>> = { ...antes };
      if (texto === null) delete novo[chave];
      else novo[chave] = texto;
      setModelos(novo);
      try {
        const resposta = await fetch(`/api/mensagens/${chave}`, {
          method: texto === null ? 'DELETE' : 'PUT',
          headers: texto === null ? undefined : { 'Content-Type': 'application/json' },
          body: texto === null ? undefined : JSON.stringify({ texto }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (resposta.status === 401) irParaLogin();
        if (!resposta.ok) throw new ErroApi(await lerErro(resposta));
        mostrarToast(aviso);
        return true;
      } catch (e) {
        setModelos(antes);
        mostrarErro(mensagemDe(e));
        return false;
      }
    },
    [setModelos],
  );

  const salvar = useCallback(
    (chave: ChaveModelo, texto: string) => gravar(chave, texto, 'Mensagem salva para todos os leads'),
    [gravar],
  );
  const restaurar = useCallback((chave: ChaveModelo) => gravar(chave, null, 'Mensagem de volta ao texto padrão'), [gravar]);

  return { modelos, salvar, restaurar };
}
