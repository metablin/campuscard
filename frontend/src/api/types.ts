/** Типы API по docs/api-contract.md. */

export interface UserOut {
  id: number;
  display_name: string;
  avatar_url: string | null;
  is_vk: boolean;
}

export type LinkType = 'vk' | 'telegram' | 'email' | 'phone' | 'github' | 'site';

export interface CardLink {
  type: LinkType;
  label: string;
  url: string;
}

export type CardTheme = 'default' | 'ocean' | 'sunset' | 'graphite';

/** Тело PUT /api/cards/me (создание/обновление визитки). */
export interface CardIn {
  slug: string;
  full_name: string;
  university: string;
  specialty: string;
  graduation_year: number | null;
  about: string;
  skills: string[];
  links: CardLink[];
  theme: CardTheme;
}

export interface CardOut {
  id: number;
  slug: string;
  full_name: string;
  university: string;
  specialty: string;
  graduation_year: number | null;
  about: string;
  skills: string[];
  links: CardLink[];
  theme: CardTheme;
  is_published: boolean;
  views_count: number;
  public_url: string;
  created_at: string;
  updated_at: string;
}

export interface MeOut {
  user: UserOut;
  card: CardOut | null;
}

/** Ответ GET /api/slug/check. */
export interface SlugCheckOut {
  slug: string;
  available: boolean;
  reason: 'invalid' | 'reserved' | 'taken' | null;
}

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
