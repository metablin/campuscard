import baseTheme from '@vkontakte/vkui-tokens/themes/vkBase';

import type { CardTheme } from '../../api/types';

/**
 * Темы оформления визитки. Цвета берутся из палитры открытого пакета
 * @vkontakte/vkui-tokens (тема vkBase) — так публичная страница остаётся
 * в фирменной гамме VK. Значения токенов — строка-цвет либо объект
 * { normal, hover, active } (см. interfaces/themes/vkBase).
 */
interface TokenColorObject {
  normal: string;
  hover: string;
  active: string;
}

type TokenValue = string | TokenColorObject;

/** Токен может быть строкой либо объектом { normal, hover, active }. */
function tokenColor(value: TokenValue): string {
  return typeof value === 'string' ? value : value.normal;
}

function tokenColorActive(value: TokenValue): string {
  return typeof value === 'string' ? value : value.active;
}

export interface CardThemeStyle {
  /** Подпись в SegmentedControl редактора. */
  label: string;
  /** CSS-градиент шапки публичной карточки. */
  headerGradient: string;
  /** Акцентный цвет (иконки, аватар-заглушка, чипы). */
  accent: string;
  /** Цвет текста на шапке. */
  headerText: string;
}

const accent = tokenColor(baseTheme.colorBackgroundAccent);
const accentActive = tokenColorActive(baseTheme.colorBackgroundAccent);
const orange = tokenColor(baseTheme.colorAccentOrange);
const orangeFire = tokenColor(baseTheme.colorAccentOrangeFire);
const gray = tokenColor(baseTheme.colorAccentGray);
const contrast = tokenColor(baseTheme.colorTextContrast);

export const CARD_THEMES: Record<CardTheme, CardThemeStyle> = {
  default: {
    label: 'Стандарт',
    headerGradient: `linear-gradient(135deg, ${accent} 0%, ${accentActive} 100%)`,
    accent,
    headerText: contrast,
  },
  ocean: {
    label: 'Океан',
    headerGradient: 'linear-gradient(135deg, #0a7fd4 0%, #13b5c8 100%)',
    accent: '#0a7fd4',
    headerText: contrast,
  },
  sunset: {
    label: 'Закат',
    headerGradient: `linear-gradient(135deg, ${orangeFire} 0%, ${orange} 100%)`,
    accent: orangeFire,
    headerText: contrast,
  },
  graphite: {
    label: 'Графит',
    headerGradient: 'linear-gradient(135deg, #2c2d2e 0%, #5d6d7e 100%)',
    accent: gray,
    headerText: contrast,
  },
};

/** Опции для SegmentedControl в редакторе. */
export const THEME_OPTIONS = (
  Object.entries(CARD_THEMES) as Array<[CardTheme, CardThemeStyle]>
).map(([value, theme]) => ({ label: theme.label, value }));
