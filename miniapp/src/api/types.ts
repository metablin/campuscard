/** Типы API по docs/api-contract.md (только публичный набор). */

export type LinkType = 'vk' | 'telegram' | 'email' | 'phone' | 'github' | 'site';

export interface CardLink {
  type: LinkType;
  label: string;
  url: string;
}

export type CardTheme = 'default' | 'ocean' | 'sunset' | 'graphite';

/** Публичный набор полей визитки (GET /api/u/{slug}, whitelist по контракту). */
export interface PublicCardOut {
  slug: string;
  full_name: string;
  university: string;
  specialty: string;
  graduation_year: number | null;
  about: string;
  skills: string[];
  links: CardLink[];
  theme: CardTheme;
  avatar_url: string | null;
}
