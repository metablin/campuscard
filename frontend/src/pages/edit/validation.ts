import type { CardIn, LinkType } from '../../api/types';

/**
 * Клиентская валидация визитки — зеркало правил бэкенда
 * (backend/app/schemas.py, docs/api-contract.md). Бэкенд всё равно
 * проверяет повторно; здесь — быстрый отклик в форме.
 */

export const SLUG_RE = /^[a-z0-9-]{3,40}$/;

export const RESERVED_SLUGS = [
  'admin',
  'api',
  'login',
  'u',
  'app',
  'edit',
  'auth',
];

const LINK_TYPES: LinkType[] = ['vk', 'telegram', 'email', 'phone', 'github', 'site'];

const ALLOWED_URL_SCHEMES = ['https://', 'http://', 'mailto:', 'tel:'];

const MAX_FULL_NAME = 128;
const MAX_TEXT = 256;
const MAX_ABOUT = 1000;
const MAX_SKILLS = 15;
const MAX_SKILL_LEN = 40;
const MAX_LINKS = 10;
const MAX_LABEL_LEN = 64;
const MAX_URL_LEN = 512;
const MIN_YEAR = 2020;
const MAX_YEAR = 2035;

export function isValidUrlScheme(url: string): boolean {
  return ALLOWED_URL_SCHEMES.some((scheme) => url.startsWith(scheme));
}

export function slugError(slug: string): string | null {
  if (!SLUG_RE.test(slug)) {
    return 'Адрес: 3–40 символов, только строчные латинские буквы, цифры и дефис';
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return 'Этот адрес зарезервирован';
  }
  return null;
}

/** Возвращает список ошибок; пустой массив — визитка валидна. */
export function validateCard(card: CardIn): string[] {
  const errors: string[] = [];

  const slugErr = slugError(card.slug);
  if (slugErr) {
    errors.push(slugErr);
  }

  if (!card.full_name.trim() || card.full_name.length > MAX_FULL_NAME) {
    errors.push('Имя обязательно (до 128 символов)');
  }
  if (card.university.length > MAX_TEXT) {
    errors.push('Вуз — до 256 символов');
  }
  if (card.specialty.length > MAX_TEXT) {
    errors.push('Специальность — до 256 символов');
  }
  if (
    card.graduation_year !== null &&
    (card.graduation_year < MIN_YEAR || card.graduation_year > MAX_YEAR)
  ) {
    errors.push(`Год выпуска — от ${MIN_YEAR} до ${MAX_YEAR}`);
  }
  if (card.about.length > MAX_ABOUT) {
    errors.push('О себе — до 1000 символов');
  }
  if (card.skills.length > MAX_SKILLS) {
    errors.push(`Навыков — не более ${MAX_SKILLS}`);
  }
  if (card.skills.some((s) => s.length < 1 || s.length > MAX_SKILL_LEN)) {
    errors.push('Каждый навык — строка от 1 до 40 символов');
  }
  if (card.links.length > MAX_LINKS) {
    errors.push(`Ссылок — не более ${MAX_LINKS}`);
  }
  card.links.forEach((link, index) => {
    const n = index + 1;
    if (!LINK_TYPES.includes(link.type)) {
      errors.push(`Ссылка ${n}: неизвестный тип`);
    }
    if (!link.label.trim() || link.label.length > MAX_LABEL_LEN) {
      errors.push(`Ссылка ${n}: подпись обязательна (до 64 символов)`);
    }
    if (!link.url.trim() || link.url.length > MAX_URL_LEN) {
      errors.push(`Ссылка ${n}: адрес обязателен (до 512 символов)`);
    } else if (!isValidUrlScheme(link.url)) {
      errors.push(`Ссылка ${n}: адрес должен начинаться с https://, http://, mailto: или tel:`);
    }
  });

  return errors;
}
