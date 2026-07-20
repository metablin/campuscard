import { FC, ReactNode, useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  CellButton,
  Chip,
  Div,
  Footer,
  FormItem,
  Group,
  Input,
  NavIdProps,
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

import { ApiError } from '../api/client';
import { publicApi } from '../api/public';
import type { LinkType, PublicCardOut } from '../api/types';
import { buildVcf } from '../utils/vcard';
import { CARD_THEMES } from '../utils/themes';
import { isValidUrlScheme } from '../utils/validation';

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
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export interface PublicCardProps extends NavIdProps {
  /** Slug визитки из launch-параметров/URL; если не задан — показываем форму. */
  initialSlug?: string;
}

/**
 * Главный экран мини-приложения — публичная визитка CampusCard.
 * Переиспользует верстку PublicCardPage веб-версии (frontend/src/pages/PublicCardPage.tsx),
 * данные — тот же GET /api/u/{slug}.
 */
export const PublicCard: FC<PublicCardProps> = ({ id, initialSlug }) => {
  const [slug, setSlug] = useState(initialSlug ?? '');
  const [slugInput, setSlugInput] = useState('');

  const [card, setCard] = useState<PublicCardOut | null>(null);
  const [loading, setLoading] = useState(Boolean(initialSlug));
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!slug) {
      setCard(null);
      setLoading(false);
      setNotFound(false);
      setError(null);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setError(null);
    publicApi
      .getCard(slug)
      .then(setCard)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === HTTP_NOT_FOUND) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : 'Не удалось загрузить визитку');
        }
      })
      .finally(() => setLoading(false));
  }, [slug, retryKey]);

  const handleRetry = () => setRetryKey((key) => key + 1);

  const slugForm = (
    <Group>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSlug(slugInput.trim());
        }}
      >
        <FormItem top="Адрес визитки (slug)">
          <Input
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="anna-smirnova"
          />
        </FormItem>
        <Div>
          <Button size="l" stretched type="submit" disabled={!slugInput.trim()}>
            Открыть визитку
          </Button>
        </Div>
      </form>
    </Group>
  );

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader>CampusCard</PanelHeader>
        <PanelSpinner size="m" />
      </Panel>
    );
  }

  if (notFound || error) {
    return (
      <Panel id={id}>
        <PanelHeader>CampusCard</PanelHeader>
        <Group>
          <Placeholder
            title={notFound ? 'Визитка не найдена или не опубликована' : 'Ошибка загрузки'}
            action={
              notFound ? (
                <Button size="m" mode="secondary" onClick={() => setSlug('')}>
                  Открыть другую
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

  if (!card) {
    return (
      <Panel id={id}>
        <PanelHeader>CampusCard</PanelHeader>
        {slugForm}
      </Panel>
    );
  }

  const theme = CARD_THEMES[card.theme];
  const safeLinks = card.links.filter((link) => isValidUrlScheme(link.url));

  const handleDownloadVcf = () => {
    const blob = new Blob([buildVcf(card)], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${card.slug}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const studyLine = [card.university, card.specialty].filter(Boolean).join(' · ');

  return (
    <Panel id={id}>
      <PanelHeader>CampusCard</PanelHeader>
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
                {safeLinks.map((link) => (
                  <CellButton
                    key={`${link.type}-${link.url}`}
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

          <Footer>CampusCard — цифровая визитка студента</Footer>
        </div>
      </Div>
    </Panel>
  );
};
