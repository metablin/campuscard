import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Button,
  ButtonGroup,
  Div,
  Group,
  Header,
  Panel,
  PanelHeader,
  PanelSpinner,
  Placeholder,
  SimpleCell,
  Snackbar,
  Switch,
  Text,
  Title,
} from '@vkontakte/vkui';
import {
  Icon28CheckCircleOutline,
  Icon28CopyOutline,
  Icon28DeleteOutline,
  Icon28DownloadOutline,
  Icon28EditOutline,
  Icon28ErrorCircleOutline,
  Icon28QrCodeOutline,
} from '@vkontakte/icons';

import { cardsApi } from '../api/cards';
import { ApiError } from '../api/client';
import type { CardOut } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { copyToClipboard } from '../utils/clipboard';
import { downloadQrPng, qrSvgDataUrl } from '../utils/qr';
import { PageContainer } from './PageContainer';

function fullPublicUrl(card: CardOut): string {
  return `${window.location.origin}${card.public_url}`;
}

export function AppPage() {
  const navigate = useNavigate();
  const { user, card, loading, setCard, logout } = useAuth();

  const [publishPending, setPublishPending] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState(false);
  const [snackbar, setSnackbar] = useState<ReactNode>(null);

  // если визитка уже есть — подгружаем актуальную (views_count и т.п.)
  useEffect(() => {
    if (!loading && user && card) {
      let cancelled = false;
      cardsApi
        .getMy()
        .then((fresh) => {
          if (cancelled) {
            return;
          }
          // ответ мог прийти позже, чем редактор сохранил более свежую версию
          setCard((prev) =>
            prev && fresh.updated_at < prev.updated_at ? prev : fresh,
          );
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading) {
    return (
      <Panel>
        <PanelHeader>Моя визитка</PanelHeader>
        <PanelSpinner size="m" />
      </Panel>
    );
  }

  const notify = (text: string, ok = true) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={ok ? <Icon28CheckCircleOutline /> : <Icon28ErrorCircleOutline />}
      >
        {text}
      </Snackbar>,
    );
  };

  const handleCopy = () => {
    if (!card) {
      return;
    }
    const url = fullPublicUrl(card);
    void copyToClipboard(url).then((ok) => {
      if (ok) {
        notify('Ссылка скопирована');
      } else {
        // не-secure context (http://<IP>): показываем ссылку для ручного копирования
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            {`Скопируйте ссылку вручную: ${url}`}
          </Snackbar>,
        );
      }
    });
  };

  const handleDownloadQr = () => {
    if (!card) {
      return;
    }
    downloadQrPng(fullPublicUrl(card), `campuscard-${card.slug}.png`).catch(() =>
      notify('QR-код ещё не готов', false),
    );
  };

  const handleTogglePublish = () => {
    if (!card || publishPending) {
      return;
    }
    setPublishPending(true);
    cardsApi
      .togglePublish()
      .then(({ is_published }) => {
        setCard({ ...card, is_published });
        notify(is_published ? 'Визитка опубликована' : 'Визитка скрыта');
      })
      .catch((error: unknown) => {
        notify(
          error instanceof ApiError ? error.message : 'Не удалось переключить публикацию',
          false,
        );
      })
      .finally(() => setPublishPending(false));
  };

  const handleDelete = () => {
    cardsApi
      .deleteMy()
      .then(() => {
        setCard(null);
        notify('Визитка удалена');
      })
      .catch((error: unknown) => {
        notify(error instanceof ApiError ? error.message : 'Не удалось удалить визитку', false);
      });
  };

  const handleLogout = () => {
    void logout().then(() => navigate('/', { replace: true }));
  };

  return (
    <Panel>
      <PanelHeader
        after={
          <Button mode="tertiary" onClick={handleLogout}>
            Выйти
          </Button>
        }
      >
        Моя визитка
      </PanelHeader>

      <PageContainer>
        {!card ? (
          <Group>
            <Placeholder
              icon={<Icon28QrCodeOutline width={56} height={56} />}
              title="Создай свою визитку"
              action={
                <Button size="l" onClick={() => navigate('/app/edit')}>
                  Создать визитку
                </Button>
              }
            >
              У тебя пока нет визитки. Добавь имя, вуз и контакты — и получи
              постоянную ссылку с QR-кодом.
            </Placeholder>
          </Group>
        ) : (
          <>
            <Group header={<Header>Визитка</Header>}>
              <SimpleCell
                before={<Avatar size={48} src={user?.avatar_url ?? undefined} />}
                subtitle={[card.university, card.specialty].filter(Boolean).join(' · ') || undefined}
              >
                <Title level="3">{card.full_name}</Title>
              </SimpleCell>
              <SimpleCell
                subtitle="Публичная ссылка"
                after={
                  <Button
                    mode="tertiary"
                    before={<Icon28CopyOutline />}
                    onClick={handleCopy}
                  >
                    Скопировать
                  </Button>
                }
              >
                <Text>{fullPublicUrl(card)}</Text>
              </SimpleCell>
              <SimpleCell
                subtitle={
                  card.is_published
                    ? `Визитка видна всем · просмотров: ${card.views_count}`
                    : 'Визитку видишь только ты'
                }
                after={
                  <Switch
                    checked={card.is_published}
                    onChange={handleTogglePublish}
                    disabled={publishPending}
                    aria-label="Опубликовано"
                  />
                }
              >
                Опубликовано
              </SimpleCell>
            </Group>

            <Group header={<Header>QR-код</Header>}>
              <Div style={{ display: 'flex', justifyContent: 'center' }}>
                {/* SVG из vk-qr подключаем как <img> — без dangerouslySetInnerHTML */}
                <img
                  src={qrSvgDataUrl(fullPublicUrl(card))}
                  width={200}
                  height={200}
                  alt={`QR-код визитки ${card.full_name}`}
                />
              </Div>
              <Div>
                <ButtonGroup mode="vertical" stretched gap="m">
                  <Button
                    size="l"
                    stretched
                    before={<Icon28EditOutline />}
                    onClick={() => navigate('/app/edit')}
                  >
                    Редактировать
                  </Button>
                  <Button
                    size="l"
                    mode="secondary"
                    stretched
                    before={<Icon28DownloadOutline />}
                    onClick={handleDownloadQr}
                  >
                    Скачать QR (PNG)
                  </Button>
                </ButtonGroup>
              </Div>
            </Group>

            <Group header={<Header>Опасная зона</Header>}>
              <Div>
                <Button
                  size="l"
                  mode="secondary"
                  stretched
                  appearance="negative"
                  before={<Icon28DeleteOutline />}
                  onClick={() => setDeleteAlert(true)}
                >
                  Удалить визитку
                </Button>
              </Div>
            </Group>
          </>
        )}
      </PageContainer>

      {deleteAlert && (
        <Alert
          actions={[
            { title: 'Отмена', mode: 'cancel' },
            { title: 'Удалить', mode: 'destructive', action: handleDelete },
          ]}
          actionsLayout="horizontal"
          onClose={() => setDeleteAlert(false)}
          title="Удалить визитку?"
          description="Визитка и её публичная ссылка перестанут работать. Это действие нельзя отменить."
        />
      )}
      {snackbar}
    </Panel>
  );
}
