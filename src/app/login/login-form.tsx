'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { destinoSeguro } from '@/lib/auth/next-path';
import { cx } from '@/lib/cx';

const ERRO_REDE = 'Erro: não consegui falar com o servidor. Tente de novo.';

export function LoginForm() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      });
      if (resposta.ok) {
        // Navegação completa, para o proxy já receber o cookie novo.
        const next = new URLSearchParams(window.location.search).get('next');
        window.location.assign(destinoSeguro(next));
        return;
      }
      const corpo: unknown = await resposta.json().catch(() => null);
      const mensagem =
        typeof corpo === 'object' && corpo !== null && 'erro' in corpo && typeof corpo.erro === 'string'
          ? corpo.erro
          : ERRO_REDE;
      setErro(mensagem);
    } catch {
      setErro(ERRO_REDE);
    }
    setEnviando(false);
  }

  return (
    <form onSubmit={entrar} className="mt-8 flex flex-col gap-3" noValidate>
      <label htmlFor="senha" className="text-label text-ink-muted lowercase">
        senha
      </label>
      <input
        id="senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        value={senha}
        onChange={(evento) => {
          setSenha(evento.target.value);
          setErro(null);
        }}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? 'senha-erro' : undefined}
        className={cx(
          'h-10 w-full rounded-xs border bg-raised px-3 text-body text-ink',
          'transition-[border-color] duration-150 ease-out focus:border-ink',
          erro ? 'border-accent' : 'border-line',
        )}
      />
      {erro ? (
        <p id="senha-erro" role="alert" className="text-small text-accent">
          {erro}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={enviando || senha.length === 0} className="mt-1">
        {enviando ? 'Entrando' : 'Entrar'}
      </Button>
    </form>
  );
}
