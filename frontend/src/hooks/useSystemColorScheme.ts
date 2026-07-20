import { useEffect, useState } from 'react';
import type { ColorSchemeType } from '@vkontakte/vkui';

const QUERY = '(prefers-color-scheme: dark)';

/**
 * Системная тема (light/dark) с подпиской на её изменение.
 */
export function useSystemColorScheme(): ColorSchemeType {
  const [scheme, setScheme] = useState<ColorSchemeType>(() =>
    window.matchMedia(QUERY).matches ? 'dark' : 'light',
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setScheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return scheme;
}
