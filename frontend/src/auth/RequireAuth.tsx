import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Panel, PanelHeader, PanelSpinner } from '@vkontakte/vkui';

import { useAuth } from './AuthContext';

/**
 * Защищённый маршрут: без сессии (GET /api/auth/me ≠ 200) — редирект
 * на /login с возвратом на исходную страницу (?from=).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Panel>
        <PanelHeader>CampusCard</PanelHeader>
        <PanelSpinner size="m" />
      </Panel>
    );
  }

  if (!user) {
    const from = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?from=${from}`} replace />;
  }

  return <>{children}</>;
}
