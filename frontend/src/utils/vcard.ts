import type { CardLink, PublicCardOut } from '../api/types';

/**
 * Генерация vCard 3.0 (.vcf) из публичной визитки.
 * Экранирование спецсимволов — по RFC 2426: \, ; , и переводы строк.
 */

export function escapeVcf(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Разбивает full_name на части поля N: последнее слово — фамилия,
 * остальное — имя (и отчество). Одно слово считается именем.
 */
export function splitFullName(fullName: string): { given: string; family: string } {
  const MIN_PARTS = 2;
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length < MIN_PARTS) {
    return { given: words[0] ?? '', family: '' };
  }
  return { given: words.slice(0, words.length - 1).join(' '), family: words[words.length - 1] };
}

function linkToVcf(link: CardLink): string {
  if (link.type === 'email') {
    return `EMAIL:${escapeVcf(link.url.replace(/^mailto:/, ''))}`;
  }
  if (link.type === 'phone') {
    return `TEL:${escapeVcf(link.url.replace(/^tel:/, ''))}`;
  }
  return `URL:${escapeVcf(link.url)}`;
}

export function buildVcf(card: PublicCardOut): string {
  const { given, family } = splitFullName(card.full_name);
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVcf(card.full_name)}`,
    // N — обязательное по RFC 2426 поле; без него iOS показывает ORG как имя
    `N:${escapeVcf(family)};${escapeVcf(given)};;;`,
    card.university ? `ORG:${escapeVcf(card.university)}` : null,
    card.specialty ? `TITLE:${escapeVcf(card.specialty)}` : null,
    card.about ? `NOTE:${escapeVcf(card.about)}` : null,
    ...card.links.map(linkToVcf),
    'END:VCARD',
  ];
  return lines.filter((line): line is string => line !== null).join('\r\n');
}
