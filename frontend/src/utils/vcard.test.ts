import { describe, expect, it } from 'vitest';

import type { PublicCardOut } from '../api/types';
import { buildVcf, escapeVcf, splitFullName } from './vcard';

/** Минимальная валидная визитка (публичный whitelist по контракту). */
const CARD: PublicCardOut = {
  slug: 'ivan-petrov',
  full_name: 'Иван Петров',
  university: 'МГУ',
  specialty: 'Прикладная математика',
  graduation_year: 2027,
  about: 'Студент',
  skills: ['Python'],
  links: [],
  theme: 'default',
  avatar_url: null,
};

describe('escapeVcf', () => {
  it('экранирует точку с запятой, запятую и обратный слэш по RFC 2426', () => {
    expect(escapeVcf('a;b,c\\d')).toBe('a\\;b\\,c\\\\d');
  });

  it('экранирует переводы строк', () => {
    expect(escapeVcf('строка1\nстрока2')).toBe('строка1\\nстрока2');
  });

  it('не трогает обычный текст', () => {
    expect(escapeVcf('Иван Петров')).toBe('Иван Петров');
  });
});

describe('splitFullName', () => {
  it('«Имя Фамилия» → имя + фамилия', () => {
    expect(splitFullName('Иван Петров')).toEqual({ given: 'Иван', family: 'Петров' });
  });

  it('«Имя Отчество Фамилия» → фамилия последняя, остальное — имя', () => {
    expect(splitFullName('Иван Сергеевич Петров')).toEqual({
      given: 'Иван Сергеевич',
      family: 'Петров',
    });
  });

  it('одно слово → имя, фамилия пустая', () => {
    expect(splitFullName('Мадонна')).toEqual({ given: 'Мадонна', family: '' });
  });

  it('лишние пробелы не ломают разбор', () => {
    expect(splitFullName('  Иван   Петров  ')).toEqual({ given: 'Иван', family: 'Петров' });
  });
});

describe('buildVcf', () => {
  it('содержит обязательные BEGIN/VERSION/FN/END', () => {
    const vcf = buildVcf(CARD);
    expect(vcf).toContain('BEGIN:VCARD');
    expect(vcf).toContain('VERSION:3.0');
    expect(vcf).toContain('FN:Иван Петров');
    expect(vcf).toContain('END:VCARD');
  });

  it('содержит обязательное поле N сразу после FN (RFC 2426)', () => {
    const vcf = buildVcf(CARD);
    expect(vcf).toContain('FN:Иван Петров\r\nN:Петров;Иван;;;\r\n');
  });

  it('N: «Имя Отчество Фамилия» и одно слово', () => {
    expect(buildVcf({ ...CARD, full_name: 'Иван Сергеевич Петров' })).toContain(
      'N:Петров;Иван Сергеевич;;;',
    );
    expect(buildVcf({ ...CARD, full_name: 'Мадонна' })).toContain('N:;Мадонна;;;');
  });

  it('кириллица в N/FN сохраняется без искажений', () => {
    const vcf = buildVcf({ ...CARD, full_name: 'Даниил Дёмкин' });
    expect(vcf).toContain('FN:Даниил Дёмкин');
    expect(vcf).toContain('N:Дёмкин;Даниил;;;');
  });

  it('разделяет строки CRLF', () => {
    const vcf = buildVcf(CARD);
    expect(vcf.split('\r\n')[0]).toBe('BEGIN:VCARD');
    expect(vcf).not.toContain('\nBEGIN');
    // все переводы строк — только CRLF, одиночных LF нет
    expect(vcf.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('включает ORG/TITLE/NOTE, когда поля заполнены', () => {
    const vcf = buildVcf(CARD);
    expect(vcf).toContain('ORG:МГУ');
    expect(vcf).toContain('TITLE:Прикладная математика');
    expect(vcf).toContain('NOTE:Студент');
  });

  it('пропускает пустые university/specialty/about', () => {
    const vcf = buildVcf({ ...CARD, university: '', specialty: '', about: '' });
    expect(vcf).not.toContain('ORG:');
    expect(vcf).not.toContain('TITLE:');
    expect(vcf).not.toContain('NOTE:');
  });

  it('email-ссылка → EMAIL без префикса mailto:', () => {
    const vcf = buildVcf({
      ...CARD,
      links: [{ type: 'email', label: 'Почта', url: 'mailto:ivan@example.com' }],
    });
    expect(vcf).toContain('EMAIL:ivan@example.com');
    expect(vcf).not.toContain('EMAIL:mailto:');
  });

  it('phone-ссылка → TEL без префикса tel:', () => {
    const vcf = buildVcf({
      ...CARD,
      links: [{ type: 'phone', label: 'Телефон', url: 'tel:+79990001122' }],
    });
    expect(vcf).toContain('TEL:+79990001122');
  });

  it('остальные ссылки → URL как есть', () => {
    const vcf = buildVcf({
      ...CARD,
      links: [
        { type: 'telegram', label: '@ivan', url: 'https://t.me/ivan' },
        { type: 'site', label: 'Сайт', url: 'https://example.com' },
      ],
    });
    expect(vcf).toContain('URL:https://t.me/ivan');
    expect(vcf).toContain('URL:https://example.com');
  });

  it('экранирует спецсимволы в полях карточки', () => {
    const vcf = buildVcf({ ...CARD, full_name: 'Петров; Иван, мл.' });
    expect(vcf).toContain('FN:Петров\\; Иван\\, мл.');
  });
});
