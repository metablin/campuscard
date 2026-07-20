/* eslint-disable @typescript-eslint/no-magic-numbers -- граничные значения и есть предмет тестов */
import { describe, expect, it } from 'vitest';

import type { CardIn } from '../../api/types';
import { isValidUrlScheme, RESERVED_SLUGS, slugError, validateCard } from './validation';

/** Валидная визитка — база для тестов validateCard. */
const VALID_CARD: CardIn = {
  slug: 'ivan-petrov',
  full_name: 'Иван Петров',
  university: 'МГУ',
  specialty: 'Прикладная математика',
  graduation_year: 2027,
  about: 'Студент',
  skills: ['Python', 'React'],
  links: [{ type: 'telegram', label: '@ivan', url: 'https://t.me/ivan' }],
  theme: 'default',
};

describe('slugError', () => {
  it('валидный slug → null', () => {
    expect(slugError('ivan-petrov')).toBeNull();
    expect(slugError('abc')).toBeNull(); // граница: длина 3
    expect(slugError('a'.repeat(40))).toBeNull(); // граница: длина 40
  });

  it.each(['ab', 'a'.repeat(41), 'Ivan-Petrov', 'ivan_petrov', 'ivan petrov', 'иван', ''])(
    'невалидный формат "%s" → ошибка формата',
    (slug) => {
      expect(slugError(slug)).toBe('Адрес: 3–40 символов, только строчные латинские буквы, цифры и дефис');
    },
  );

  it.each(RESERVED_SLUGS.filter((slug) => slug.length >= 3))(
    'зарезервированный slug "%s" → ошибка резерва',
    (slug) => {
      expect(slugError(slug)).toBe('Этот адрес зарезервирован');
    },
  );

  it('зарезервированный "u" короче 3 символов → ошибка формата (приоритет формата)', () => {
    expect(slugError('u')).toBe('Адрес: 3–40 символов, только строчные латинские буквы, цифры и дефис');
  });
});

describe('isValidUrlScheme', () => {
  it.each(['https://example.com', 'http://example.com', 'mailto:a@b.c', 'tel:+79990001122'])(
    'разрешённая схема %s',
    (url) => {
      expect(isValidUrlScheme(url)).toBe(true);
    },
  );

  it.each(['javascript:alert(1)', 'ftp://x.com', 'example.com', ''])(
    'запрещённая схема %s',
    (url) => {
      expect(isValidUrlScheme(url)).toBe(false);
    },
  );
});

describe('validateCard', () => {
  it('валидная визитка → пустой список ошибок', () => {
    expect(validateCard(VALID_CARD)).toEqual([]);
  });

  it('пустое имя → ошибка', () => {
    expect(validateCard({ ...VALID_CARD, full_name: '  ' })).toContain('Имя обязательно (до 128 символов)');
  });

  it('full_name длиной 129 → ошибка', () => {
    expect(validateCard({ ...VALID_CARD, full_name: 'а'.repeat(129) })).toHaveLength(1);
  });

  it.each([
    ['university', 'Вуз — до 256 символов'],
    ['specialty', 'Специальность — до 256 символов'],
  ] as const)('%s длиной 257 → ошибка', (field, message) => {
    expect(validateCard({ ...VALID_CARD, [field]: 'у'.repeat(257) })).toContain(message);
  });

  it('graduation_year вне 2020–2035 → ошибка; null — ок', () => {
    expect(validateCard({ ...VALID_CARD, graduation_year: 2019 })).toHaveLength(1);
    expect(validateCard({ ...VALID_CARD, graduation_year: 2036 })).toHaveLength(1);
    expect(validateCard({ ...VALID_CARD, graduation_year: null })).toEqual([]);
    expect(validateCard({ ...VALID_CARD, graduation_year: 2020 })).toEqual([]);
    expect(validateCard({ ...VALID_CARD, graduation_year: 2035 })).toEqual([]);
  });

  it('about длиной 1001 → ошибка', () => {
    expect(validateCard({ ...VALID_CARD, about: 'о'.repeat(1001) })).toContain('О себе — до 1000 символов');
  });

  it('16 навыков или навык длиной 41 → ошибка', () => {
    expect(validateCard({ ...VALID_CARD, skills: Array.from({ length: 16 }, (_, i) => `s${i}`) })).toContain(
      'Навыков — не более 15',
    );
    expect(validateCard({ ...VALID_CARD, skills: ['н'.repeat(41)] })).toContain(
      'Каждый навык — строка от 1 до 40 символов',
    );
  });

  it('11 ссылок → ошибка', () => {
    const links = Array.from({ length: 11 }, (_, i) => ({
      type: 'site' as const,
      label: `site-${i}`,
      url: `https://example.com/${i}`,
    }));
    expect(validateCard({ ...VALID_CARD, links })).toContain('Ссылок — не более 10');
  });

  it('ссылка со схемой javascript: → ошибка схемы', () => {
    const errors = validateCard({
      ...VALID_CARD,
      links: [{ type: 'site', label: 'x', url: 'javascript:alert(1)' }],
    });
    expect(errors).toContain('Ссылка 1: адрес должен начинаться с https://, http://, mailto: или tel:');
  });

  it('несколько ошибок собираются вместе', () => {
    const errors = validateCard({ ...VALID_CARD, full_name: '', slug: 'AB' });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
