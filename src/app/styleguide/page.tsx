import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Styleguide } from './styleguide';

export const metadata: Metadata = { title: 'styleguide' };

/** Referência visual dos tokens e componentes. Só existe em desenvolvimento. */
export default function StyleguidePage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <Styleguide />;
}
