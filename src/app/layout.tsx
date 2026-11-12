import type { Metadata } from 'next';
import { JetBrains_Mono, Schibsted_Grotesk } from 'next/font/google';
import './globals.css';

// Mesmas famílias do site (DESIGN-GUIDELINES §4). As duas são variáveis no Google Fonts:
// sem `weight`, o next/font baixa um único arquivo variável que cobre 400 a 700 e 400 a 500.
const schibsted = Schibsted_Grotesk({
  variable: '--font-schibsted-grotesk',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'prospecção',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${schibsted.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
