import { useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  ButtonGroup,
  CellButton,
  Div,
  FormItem,
  FormLayoutGroup,
  FormStatus,
  Group,
  Input,
  Panel,
  PanelHeader,
  PanelSpinner,
  SegmentedControl,
  Select,
  Snackbar,
  Spacing,
  Textarea,
  ChipsInput,
  IconButton,
} from '@vkontakte/vkui';
import type { ChipOption } from '@vkontakte/vkui';
import {
  Icon20Add,
  Icon20CheckCircleOutline,
  Icon20DeleteOutline,
} from '@vkontakte/icons';

import { cardsApi } from '../api/cards';
import { ApiError } from '../api/client';
import type { CardIn, CardLink, CardTheme, LinkType } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { PageContainer } from './PageContainer';
import { THEME_OPTIONS } from './edit/themes';
import { slugError, validateCard } from './edit/validation';

const MAX_LINKS = 10;
const MAX_SKILLS = 15;
const MAX_ABOUT = 1000;
const MIN_YEAR = 2020;
const YEARS_COUNT = 16;
const HTTP_CONFLICT = 409;

const YEAR_OPTIONS = [
  { value: '', label: 'Не указан' },
  ...Array.from({ length: YEARS_COUNT }, (_, i) => {
    const year = MIN_YEAR + i;
    return { value: String(year), label: String(year) };
  }),
];

const LINK_TYPE_OPTIONS: Array<{ value: LinkType; label: string }> = [
  { value: 'vk', label: 'VK' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Телефон' },
  { value: 'github', label: 'GitHub' },
  { value: 'site', label: 'Сайт' },
];

const EMPTY_CARD: CardIn = {
  slug: '',
  full_name: '',
  university: '',
  specialty: '',
  graduation_year: null,
  about: '',
  skills: [],
  links: [],
  theme: 'default',
};

type SlugStatus = { kind: 'idle' } | { kind: 'ok' } | { kind: 'error'; text: string };

interface LinkRowProps {
  link: CardLink;
  onChange: (patch: Partial<CardLink>) => void;
  onRemove: () => void;
}

/** Одна строка ссылки: тип + подпись + адрес + удаление. */
function LinkRow({ link, onChange, onRemove }: LinkRowProps) {
  return (
    <Div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 140, flex: '0 1 auto' }}>
        <Select
          value={link.type}
          onChange={(e) => onChange({ type: e.target.value as LinkType })}
          options={LINK_TYPE_OPTIONS}
        />
      </div>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Input
          value={link.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Подпись"
          maxLength={64}
        />
      </div>
      <div style={{ flex: 2, minWidth: 200 }}>
        <Input
          value={link.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://…"
          maxLength={512}
        />
      </div>
      <IconButton aria-label="Удалить ссылку" onClick={onRemove}>
        <Icon20DeleteOutline />
      </IconButton>
    </Div>
  );
}

export function EditCardPage() {
  const navigate = useNavigate();
  const { card, loading, setCard } = useAuth();

  const [form, setForm] = useState<CardIn | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ kind: 'idle' });
  const [slugPending, setSlugPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<ReactNode>(null);
  const [skillsInput, setSkillsInput] = useState('');

  // инициализация формы из загруженной визитки (один раз)
  const [initialized, setInitialized] = useState(false);
  useMemo(() => {
    if (!loading && !initialized) {
      if (card) {
        const { slug, full_name, university, specialty, graduation_year, about, skills, links, theme } =
          card;
        setForm({ slug, full_name, university, specialty, graduation_year, about, skills, links, theme });
        setSlugTouched(true);
      } else {
        setForm({ ...EMPTY_CARD });
      }
      setInitialized(true);
    }
  }, [loading, card, initialized]);

  const skillOptions = useMemo<ChipOption[]>(
    () => (form?.skills ?? []).map((s) => ({ value: s, label: s })),
    [form?.skills],
  );

  if (loading || !form) {
    return (
      <Panel>
        <PanelHeader>Визитка</PanelHeader>
        <PanelSpinner size="m" />
      </Panel>
    );
  }

  const isEdit = Boolean(card);

  const update = <K extends keyof CardIn>(key: K, value: CardIn[K]) => {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const handleFullNameBlur = () => {
    if (!slugTouched && form.full_name.trim()) {
      setSlugPending(true);
      cardsApi
        .generateSlug(form.full_name.trim())
        .then(({ slug }) => {
          update('slug', slug);
          setSlugStatus({ kind: 'idle' });
        })
        .catch(() => undefined)
        .finally(() => setSlugPending(false));
    }
  };

  const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    update('slug', event.target.value.toLowerCase());
    setSlugStatus({ kind: 'idle' });
  };

  const handleSlugCheck = () => {
    const err = slugError(form.slug);
    if (err) {
      setSlugStatus({ kind: 'error', text: err });
      return;
    }
    setSlugPending(true);
    cardsApi
      .checkSlug(form.slug)
      .then(({ available, reason }) => {
        if (available) {
          setSlugStatus({ kind: 'ok' });
        } else {
          const texts = {
            invalid: 'Недопустимый формат адреса',
            reserved: 'Этот адрес зарезервирован',
            taken: 'Этот адрес уже занят',
          } as const;
          setSlugStatus({ kind: 'error', text: texts[reason ?? 'taken'] });
        }
      })
      .catch((error: unknown) => {
        setSlugStatus({
          kind: 'error',
          text: error instanceof ApiError ? error.message : 'Не удалось проверить адрес',
        });
      })
      .finally(() => setSlugPending(false));
  };

  const handleSkillsChange = (options: ChipOption[]) => {
    update('skills', options.slice(0, MAX_SKILLS).map((option) => String(option.value)));
  };

  const updateLink = (index: number, patch: Partial<CardLink>) => {
    update(
      'links',
      form.links.map((link, i) => i === index ? { ...link, ...patch } : link),
    );
  };

  const addLink = () => {
    if (form.links.length < MAX_LINKS) {
      update('links', [...form.links, { type: 'site', label: '', url: '' }]);
    }
  };

  const removeLink = (index: number) => {
    update(
      'links',
      form.links.filter((_, i) => i !== index),
    );
  };

  const handleSubmit = () => {
    const validationErrors = validateCard(form);
    setErrors(validationErrors);
    if (validationErrors.length > 0) {
      return;
    }
    setSaving(true);
    cardsApi
      .update({ ...form, full_name: form.full_name.trim() })
      .then((saved) => {
        setCard(saved);
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)} before={<Icon20CheckCircleOutline />}>
            Визитка сохранена
          </Snackbar>,
        );
        navigate('/app');
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === HTTP_CONFLICT) {
          setSlugStatus({ kind: 'error', text: error.message });
          setErrors([]);
        } else {
          setErrors([
            error instanceof ApiError ? error.message : 'Не удалось сохранить визитку',
          ]);
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <Panel>
      <PanelHeader>{isEdit ? 'Редактирование визитки' : 'Создание визитки'}</PanelHeader>

      <PageContainer>
        <Group>
          <FormLayoutGroup>
            <FormItem top="Имя и фамилия *" status={form.full_name.trim() ? 'default' : 'error'}>
              <Input
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                onBlur={handleFullNameBlur}
                placeholder="Даниил Дёмкин"
                maxLength={128}
              />
            </FormItem>

            <FormItem
              top="Адрес визитки (slug)"
              bottom={`Визитка будет доступна: /u/${form.slug || '…'}`}
              status={slugStatus.kind === 'error' ? 'error' : 'default'}
            >
              <Input
                value={form.slug}
                onChange={handleSlugChange}
                placeholder="daniil-demkin"
                maxLength={40}
                disabled={slugPending}
                after={
                  <Button mode="tertiary" onClick={handleSlugCheck} disabled={slugPending}>
                    Проверить
                  </Button>
                }
              />
            </FormItem>
            {slugStatus.kind === 'ok' && <FormStatus title="Адрес свободен" />}
            {slugStatus.kind === 'error' && (
              <FormStatus mode="error" title={slugStatus.text} />
            )}

            <FormItem top="Вуз">
              <Input
                value={form.university}
                onChange={(e) => update('university', e.target.value)}
                placeholder="МГУ"
                maxLength={256}
              />
            </FormItem>

            <FormItem top="Специальность">
              <Input
                value={form.specialty}
                onChange={(e) => update('specialty', e.target.value)}
                placeholder="Прикладная математика"
                maxLength={256}
              />
            </FormItem>

            <FormItem top="Год выпуска">
              <Select
                value={form.graduation_year === null ? '' : String(form.graduation_year)}
                onChange={(e) =>
                  update('graduation_year', e.target.value === '' ? null : Number(e.target.value))
                }
                options={YEAR_OPTIONS}
              />
            </FormItem>

            <FormItem top="О себе" bottom={`${form.about.length} / ${MAX_ABOUT}`}>
              <Textarea
                value={form.about}
                onChange={(e) => update('about', e.target.value)}
                placeholder="Пара слов о тебе, проектах и интересах"
                maxLength={MAX_ABOUT}
              />
            </FormItem>

            <FormItem top="Навыки" bottom={`До ${MAX_SKILLS} навыков, Enter — добавить`}>
              <ChipsInput
                value={skillOptions}
                onChange={handleSkillsChange}
                inputValue={skillsInput}
                onInputChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Python, React, …"
                disabled={form.skills.length >= MAX_SKILLS}
              />
            </FormItem>

            <FormItem top="Тема оформления">
              <SegmentedControl
                value={form.theme}
                onChange={(value) => update('theme', value as CardTheme)}
                options={THEME_OPTIONS}
              />
            </FormItem>
          </FormLayoutGroup>
        </Group>

        <Group>
          <FormLayoutGroup>
            <FormItem top={`Ссылки (${form.links.length} / ${MAX_LINKS})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.links.map((link, index) => (
                  <LinkRow
                    key={`${index}-${link.type}-${link.label}`}
                    link={link}
                    onChange={(patch) => updateLink(index, patch)}
                    onRemove={() => removeLink(index)}
                  />
                ))}
                {form.links.length < MAX_LINKS && (
                  <CellButton before={<Icon20Add />} onClick={addLink}>
                    Добавить ссылку
                  </CellButton>
                )}
              </div>
            </FormItem>
          </FormLayoutGroup>
        </Group>

        <Group>
          <Div>
            {errors.length > 0 && (
              <>
                <FormStatus mode="error" title="Проверь форму">
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </FormStatus>
                <Spacing size={12} />
              </>
            )}
            <ButtonGroup mode="vertical" stretched gap="m">
              <Button size="l" stretched onClick={handleSubmit} disabled={saving || slugPending}>
                Сохранить
              </Button>
              <Button size="l" stretched mode="secondary" onClick={() => navigate('/app')}>
                Отмена
              </Button>
            </ButtonGroup>
          </Div>
        </Group>
      </PageContainer>
      {snackbar}
    </Panel>
  );
}
