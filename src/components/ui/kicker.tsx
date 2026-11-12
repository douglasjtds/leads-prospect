import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface KickerProps {
  children: ReactNode;
  as?: 'p' | 'span' | 'div';
  className?: string;
}

/** Kicker do site: `01 / hoje`. Mono `label`, `ink-muted`, minúsculas (DESIGN-GUIDELINES §4). */
export function Kicker({ children, as: Tag = 'p', className }: KickerProps) {
  return <Tag className={cx('text-label text-ink-muted lowercase', className)}>{children}</Tag>;
}
