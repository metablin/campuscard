import type { ReactNode } from 'react';
import { Group, Panel, PanelHeader } from '@vkontakte/vkui';

interface PageStubProps {
  title: string;
  children?: ReactNode;
}

/**
 * Общий каркас страницы-заглушки: PanelHeader + содержимое.
 */
export function PageStub({ title, children }: PageStubProps) {
  return (
    <Panel>
      <PanelHeader>{title}</PanelHeader>
      <Group>{children}</Group>
    </Panel>
  );
}
