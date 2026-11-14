import type { MetadataRoute } from 'next';

// App privado: nenhum robô deve rastrear nada.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
