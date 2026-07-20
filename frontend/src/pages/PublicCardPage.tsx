import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  CellButton,
  Chip,
  Div,
  Footer,
  Group,
  Link,
  Panel,
  PanelHeader,
  PanelSpinner,
  Placeholder,
  Text,
  Title,
} from '@vkontakte/vkui';
import {
  Icon20DownloadOutline,
  Icon20GlobeOutline,
  Icon20LinkCircleOutline,
  Icon20LogoVkOutline,
  Icon20MailOutline,
  Icon20PhoneOutline,
  Icon20SendOutline,
} from '@vkontakte/icons';
import type { ReactNode } from 'react';

import { ApiError } from '../api/client';
import { publicApi } from '../api/public';
import type { LinkType, PublicCardOut } from '../api/types';
import { buildVcf } from '../utils/vcard';
import { CARD_THEMES } from './edit/themes';
import type { CardThemeStyle } from './edit/themes';
import { isValidUrlScheme } from './edit/validation';

const HTTP_NOT_FOUND = 404;
const MAX_INITIALS_PARTS = 2;

const LINK_ICONS: Record<LinkType, ReactNode> = {
  vk: <Icon20LogoVkOutline />,
  telegram: <Icon20SendOutline />,
  email: <Icon20MailOutline />,
  phone: <Icon20PhoneOutline />,
  github: <Icon20LinkCircleOutline />,
  site: <Icon20GlobeOutline />,
};

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_INITIALS_PARTS)
    // [...part][0], а не charAt(0): charAt ломает суррогатные пары (эмодзи в имени)
    .map((part) => [...part][0]?.toUpperCase() ?? '')
    .join('');
}

export function PublicCardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [card, setCard] = useState<PublicCardOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    publicApi
      .getCard(slug)
      .then((data) => {
        if (!cancelled) {
          setCard(data);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить визитку');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, retryKey]);

  const handleRetry = () => setRetryKey((key) => key + 1);

  if (loading) {
    return (
      <Panel>
        <PanelHeader>Визитка</PanelHeader>
        <PanelSpinner size="m" />
      </Panel>
    );
  }

  if (notFound || error || !card) {
    return (
      <Panel>
        <PanelHeader>Визитка</PanelHeader>
        <Group>
          <Placeholder
            title={notFound ? 'Визитка не найдена или не опубликована' : 'Ошибка загрузки'}
            action={
              notFound ? (
                <Button size="m" onClick={() => navigate('/')}>
                  На главную
                </Button>
              ) : (
                <Button size="m" onClick={handleRetry}>
                  Повторить
                </Button>
              )
            }
          >
            {notFound
              ? 'Проверь ссылку или спроси у владельца, опубликована ли визитка.'
              : error}
          </Placeholder>
        </Group>
      </Panel>
    );
  }

  // тема вне списка (дрейф контракта) не должна ронять страницу:
  // индексируем как Record<string, ...>, т.к. бэкенд может вернуть значение вне union-типа
  const theme =
    (CARD_THEMES as Record<string, CardThemeStyle>)[card.theme] ?? CARD_THEMES.default;
  const safeLinks = card.links.filter((link) => isValidUrlScheme(link.url));

  const handleDownloadVcf = () => {
    const blob = new Blob([buildVcf(card)], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${card.slug}.vcf`;
    link.click();
    // отложенный revoke: синхронный обрывает скачивание в Firefox
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const studyLine = [card.university, card.specialty].filter(Boolean).join(' · ');

  return (
    <Panel>
      <PanelHeader>Визитка</PanelHeader>
      <Div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <Card mode="shadow">
            {/* Шапка в цветах темы (токены @vkontakte/vkui-tokens) */}
            <div
              style={{
                background: theme.headerGradient,
                padding: '32px 16px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                color: theme.headerText,
              }}
            >
              <Avatar size={96} src={card.avatar_url ?? undefined} initials={initials(card.full_name)} />
              <Title level="2" style={{ marginTop: 12, color: 'inherit' }}>
                {card.full_name}
              </Title>
              {studyLine && <Text style={{ marginTop: 4, color: 'inherit', opacity: 0.9 }}>{studyLine}</Text>}
              {card.graduation_year && (
                <Text style={{ marginTop: 4, color: 'inherit', opacity: 0.75 }}>
                  Выпуск {card.graduation_year}
                </Text>
              )}
            </div>

            {card.about && (
              <Group>
                <Div>
                  <Text>{card.about}</Text>
                </Div>
              </Group>
            )}

            {card.skills.length > 0 && (
              <Group>
                <Div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {card.skills.map((skill) => (
                    <Chip key={skill} readOnly>
                      {skill}
                    </Chip>
                  ))}
                </Div>
              </Group>
            )}

            {safeLinks.length > 0 && (
              <Group>
                {safeLinks.map((link, index) => (
                  <CellButton
                    key={`${index}-${link.type}-${link.url}`}
                    before={LINK_ICONS[link.type]}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </CellButton>
                ))}
              </Group>
            )}

            <Group>
              <Div>
                <Button
                  size="l"
                  stretched
                  before={<Icon20DownloadOutline />}
                  onClick={handleDownloadVcf}
                >
                  Сохранить контакт
                </Button>
              </Div>
            </Group>
          </Card>

          <Footer>
            Создай свою визитку на{' '}
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
            >
              CampusCard
            </Link>
          </Footer>
        </div>
      </Div>
    </Panel>
  );
}
