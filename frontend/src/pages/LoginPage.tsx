import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  ButtonGroup,
  Div,
  Group,
  Panel,
  PanelHeader,
  Placeholder,
  ScreenSpinner,
  Separator,
  Snackbar,
  Text,
} from '@vkontakte/vkui';
import { Icon28ErrorCircleOutline, Icon28LogoVkOutline } from '@vkontakte/icons';

import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { isVkAuthEnabled, loginWithVkId } from '../auth/vkid';
import { safeFromPath } from '../utils/redirect';
import { PageContainer } from './PageContainer';

/** Показывать dev-вход только при VITE_DEV_AUTH=true в .env фронта. */
const DEV_AUTH_ENABLED = import.meta.env.VITE_DEV_AUTH === 'true';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, refresh } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<ReactNode>(null);

  // уже залогинен — сразу в кабинет
  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  // куда вернуться после входа (только внутренние пути)
  const target = safeFromPath(searchParams.get('from'));

  const showError = (message: string) => {
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)} before={<Icon28ErrorCircleOutline />}>
        {message}
      </Snackbar>,
    );
  };

  const handleDevLogin = () => {
    setSubmitting(true);
    authApi
      .loginDev()
      .then(() => refresh())
      .then(() => navigate(target, { replace: true }))
      .catch((error: unknown) => {
        showError(error instanceof ApiError ? error.message : 'Не удалось войти');
        setSubmitting(false);
      });
  };

  const handleVkLogin = () => {
    setSubmitting(true);
    loginWithVkId().catch(() => {
      showError('Не удалось открыть страницу авторизации VK ID');
      setSubmitting(false);
    });
    // дальше — редирект на id.vk.com, состояние сбрасывать не нужно
  };

  return (
    <Panel>
      <PanelHeader>Вход</PanelHeader>
      <PageContainer>
        <Group>
          <Placeholder
            icon={<Icon28LogoVkOutline width={56} height={56} />}
            title="Вход в CampusCard"
          >
            Войди, чтобы создать свою цифровую визитку и получить постоянную
            ссылку с QR-кодом.
          </Placeholder>
          <Div>
            <ButtonGroup mode="vertical" stretched gap="m">
              {isVkAuthEnabled() && (
                <Button
                  size="l"
                  stretched
                  before={<Icon28LogoVkOutline />}
                  onClick={handleVkLogin}
                  disabled={submitting}
                >
                  Войти через VK ID
                </Button>
              )}
              {isVkAuthEnabled() && DEV_AUTH_ENABLED && <Separator />}
              {DEV_AUTH_ENABLED && (
                <Button
                  size="l"
                  stretched
                  mode="secondary"
                  onClick={handleDevLogin}
                  disabled={submitting}
                >
                  Войти как демо-пользователь
                </Button>
              )}
              {!isVkAuthEnabled() && !DEV_AUTH_ENABLED && (
                <Text>
                  Авторизация не настроена: укажи VITE_VK_APP_ID или включи
                  VITE_DEV_AUTH в frontend/.env.
                </Text>
              )}
            </ButtonGroup>
          </Div>
        </Group>
      </PageContainer>
      {submitting && <ScreenSpinner state="loading" />}
      {snackbar}
    </Panel>
  );
}
