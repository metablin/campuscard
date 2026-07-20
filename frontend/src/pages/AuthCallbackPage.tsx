import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Group,
  Panel,
  PanelHeader,
  PanelSpinner,
  Placeholder,
} from '@vkontakte/vkui';

import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getVkCodeVerifier, getVkState } from '../auth/vkid';

/**
 * Callback VK ID: id.vk.com возвращает сюда ?code=&state=&device_id=.
 * Сверяем state (защита от CSRF, его генерировал SDK) и отправляем
 * code + code_verifier + device_id на бэкенд (POST /api/auth/vkid).
 */
export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // защита от двойного обмена кода в StrictMode
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const deviceId = searchParams.get('device_id');
    const errorDescription = searchParams.get('error_description');

    if (errorDescription) {
      setError(`VK ID: ${errorDescription}`);
      return;
    }
    if (!code || !deviceId) {
      setError('VK ID не вернул код авторизации. Попробуй войти ещё раз.');
      return;
    }
    if (!state || state !== getVkState()) {
      setError('Не совпал state авторизации. Попробуй войти ещё раз.');
      return;
    }
    const codeVerifier = getVkCodeVerifier();
    if (!codeVerifier) {
      setError('Не найден code_verifier. Попробуй войти ещё раз.');
      return;
    }

    authApi
      .loginVkid(code, codeVerifier, deviceId)
      .then(() => refresh())
      .then(() => navigate('/app', { replace: true }))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось завершить вход через VK ID.',
        );
      });
  }, [searchParams, navigate, refresh]);

  return (
    <Panel>
      <PanelHeader>Вход через VK ID</PanelHeader>
      {error ? (
        <Group>
          <Placeholder
            title="Не удалось войти"
            action={
              <Button size="m" onClick={() => navigate('/login', { replace: true })}>
                К странице входа
              </Button>
            }
          >
            {error}
          </Placeholder>
        </Group>
      ) : (
        <PanelSpinner size="m" aria-label="Завершаем вход" />
      )}
    </Panel>
  );
}
