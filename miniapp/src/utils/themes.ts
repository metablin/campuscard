import baseTheme from '@vkontakte/vkui-tokens/themes/vkBase';

import type { CardTheme } from '../api/types';

/**
 * Темы оформления визитки — копия frontend/src/pages/edit/themes.ts.
 * Цвета берутся из палитры открытого пакета @vkontakte/vkui-tokens
 * (тема vkBase). Значения токенов — строка-цвет либо объект
 * { normal, hover, active }.
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
  /** CSS-градиент шапки публичной карточки. */
  headerGradient: string;
  /** Цвет текста на шапке. */
  headerText: string;
}

const accent = tokenColor(baseTheme.colorBackgroundAccent);
const accentActive = tokenColorActive(baseTheme.colorBackgroundAccent);
const orange = tokenColor(baseTheme.colorAccentOrange);
const orangeFire = tokenColor(baseTheme.colorAccentOrangeFire);
const contrast = tokenColor(baseTheme.colorTextContrast);

export const CARD_THEMES: Record<CardTheme, CardThemeStyle> = {
  default: {
    headerGradient: `linear-gradient(135deg, ${accent} 0%, ${accentActive} 100%)`,
    headerText: contrast,
  },
  ocean: {
    headerGradient: 'linear-gradient(135deg, #0a7fd4 0%, #13b5c8 100%)',
    headerText: contrast,
  },
  sunset: {
    headerGradient: `linear-gradient(135deg, ${orangeFire} 0%, ${orange} 100%)`,
    headerText: contrast,
  },
  graphite: {
    headerGradient: 'linear-gradient(135deg, #2c2d2e 0%, #5d6d7e 100%)',
    headerText: contrast,
  },
};
