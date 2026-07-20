import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import type { CardOut, UserOut } from '../api/types';

interface AuthContextValue {
  /** null — сессия проверяется (GET /api/auth/me ещё не ответил). */
  user: UserOut | null;
  card: CardOut | null;
  loading: boolean;
  /** Сбой запроса /api/auth/me (сеть/5xx) — это НЕ разлогин. */
  error: boolean;
  /** Повторно запросить /api/auth/me (после входа/изменения визитки). */
  refresh: () => Promise<void>;
  /** Setter состояния: принимает значение или updater (для сравнения updated_at). */
  setCard: Dispatch<SetStateAction<CardOut | null>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const HTTP_UNAUTHORIZED = 401;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [card, setCard] = useState<CardOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me.user);
      setCard(me.card);
      setError(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === HTTP_UNAUTHORIZED) {
        // 401 — сессии нет; сетевой сбой/5xx разлогином не считаем
        setUser(null);
        setCard(null);
      } else {
        setError(true);
      }
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setCard(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, card, loading, error, refresh, setCard, logout }),
    [user, card, loading, error, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return ctx;
}
