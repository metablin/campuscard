import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  /** Максимальная ширина контента на десктопе. */
  maxWidth?: number;
}

const DEFAULT_MAX_WIDTH = 640;

/**
 * Центрирует контент страницы на десктопе (mobile-first).
 * Только раскладка (max-width + auto-маргины) — цвета/отступы задаёт VKUI.
 */
export function PageContainer({ children, maxWidth = DEFAULT_MAX_WIDTH }: PageContainerProps) {
  return (
    <div style={{ maxWidth, margin: '0 auto', width: '100%' }}>{children}</div>
  );
}
