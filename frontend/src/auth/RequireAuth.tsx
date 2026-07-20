import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  Button,
  Group,
  Panel,
  PanelHeader,
  PanelSpinner,
  Placeholder,
} from '@vkontakte/vkui';

import { useAuth } from './AuthContext';

/**
 * Защищённый маршрут: без сессии (GET /api/auth/me ≠ 200) — редирект
 * на /login с возвратом на исходную страницу (?from=).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Panel>
        <PanelHeader>CampusCard</PanelHeader>
        <PanelSpinner size="m" />
      </Panel>
    );
  }

  // сбой сети/5xx при проверке сессии — предлагаем повторить, не разлогинивая
  if (error) {
    return (
      <Panel>
        <PanelHeader>CampusCard</PanelHeader>
        <Group>
          <Placeholder
            title="Не удалось проверить сессию"
            action={
              <Button size="m" onClick={() => void refresh()}>
                Повторить
              </Button>
            }
          >
            Проверь подключение к интернету и попробуй ещё раз.
          </Placeholder>
        </Group>
      </Panel>
    );
  }

  if (!user) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?from=${from}`} replace />;
  }

  return <>{children}</>;
}
