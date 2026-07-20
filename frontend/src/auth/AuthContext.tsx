import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { authApi } from '../api/auth';
import type { CardOut, UserOut } from '../api/types';

interface AuthContextValue {
  /** null — сессия проверяется (GET /api/auth/me ещё не ответил). */
  user: UserOut | null;
  card: CardOut | null;
  loading: boolean;
  /** Повторно запросить /api/auth/me (после входа/изменения визитки). */
  refresh: () => Promise<void>;
  setCard: (card: CardOut | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [card, setCard] = useState<CardOut | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me.user);
      setCard(me.card);
    } catch {
      // 401 — сессии нет; прочие ошибки тоже считаем «не залогинен»
      setUser(null);
      setCard(null);
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
    () => ({ user, card, loading, refresh, setCard, logout }),
    [user, card, loading, refresh, logout],
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
