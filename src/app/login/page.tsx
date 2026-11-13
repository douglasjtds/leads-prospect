import type { Metadata } from 'next';
import { Kicker } from '@/components/ui/kicker';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'acesso' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[360px] flex-col justify-center px-5 py-12">
      <Kicker>00 / acesso</Kicker>
      <h1 className="mt-3 text-display">
        Digite a <em className="emphasis">senha</em>.
      </h1>
      <LoginForm />
    </main>
  );
}
