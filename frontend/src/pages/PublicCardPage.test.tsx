/* eslint-disable @typescript-eslint/no-magic-numbers -- HTTP-статусы в моках */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppRoot, ConfigProvider } from '@vkontakte/vkui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api/client';
import { publicApi } from '../api/public';
import type { PublicCardOut } from '../api/types';
import { PublicCardPage } from './PublicCardPage';

// Мокаем слой API: реальных fetch-запросов в тестах нет
vi.mock('../api/public', () => ({
  publicApi: {
    getCard: vi.fn(),
  },
}));

const getCardMock = vi.mocked(publicApi.getCard);

const CARD: PublicCardOut = {
  slug: 'ivan-petrov',
  full_name: 'Иван Петров',
  university: 'МГУ',
  specialty: 'Прикладная математика',
  graduation_year: 2027,
  about: 'Студент 3 курса',
  skills: ['Python', 'React'],
  links: [
    { type: 'telegram', label: '@ivan', url: 'https://t.me/ivan' },
    { type: 'email', label: 'Почта', url: 'mailto:ivan@example.com' },
  ],
  theme: 'default',
  avatar_url: null,
};

/** Рендер страницы по маршруту /u/:slug, как в App.tsx (обёртки VKUI из main.tsx). */
function renderPage(slug: string) {
  return render(
    <ConfigProvider>
      <AppRoot>
        <MemoryRouter initialEntries={[`/u/${slug}`]}>
          <Routes>
            <Route path="/u/:slug" element={<PublicCardPage />} />
          </Routes>
        </MemoryRouter>
      </AppRoot>
    </ConfigProvider>,
  );
}

describe('PublicCardPage', () => {
  beforeEach(() => {
    getCardMock.mockReset();
  });

  it('рендерит данные визитки из API', async () => {
    getCardMock.mockResolvedValue(CARD);
    renderPage('ivan-petrov');

    // имя, вуз/специальность, год выпуска, «о себе»
    expect(await screen.findByText('Иван Петров')).toBeInTheDocument();
    expect(screen.getByText('МГУ · Прикладная математика')).toBeInTheDocument();
    expect(screen.getByText('Выпуск 2027')).toBeInTheDocument();
    expect(screen.getByText('Студент 3 курса')).toBeInTheDocument();

    // навыки — чипами
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();

    // ссылки — с подписями и href
    const telegram = screen.getByText('@ivan');
    expect(telegram.closest('a')).toHaveAttribute('href', 'https://t.me/ivan');
    expect(screen.getByText('Почта').closest('a')).toHaveAttribute('href', 'mailto:ivan@example.com');

    // запрошен именно slug из URL
    expect(getCardMock).toHaveBeenCalledWith('ivan-petrov');
  });

  it('404 от API → страница «не найдено»', async () => {
    getCardMock.mockRejectedValue(new ApiError(404, 'Визитка не найдена'));
    renderPage('no-such-card');

    expect(
      await screen.findByText('Визитка не найдена или не опубликована'),
    ).toBeInTheDocument();
    // данные визитки не отображаются
    expect(screen.queryByText('Иван Петров')).not.toBeInTheDocument();
  });

  it('прочая ошибка API → плейсхолдер ошибки с кнопкой «Повторить»', async () => {
    getCardMock.mockRejectedValue(new ApiError(500, 'Ошибка сервера'));
    renderPage('ivan-petrov');

    expect(await screen.findByText('Ошибка загрузки')).toBeInTheDocument();
    expect(screen.getByText('Повторить')).toBeInTheDocument();
  });

  it('показывает спиннер, пока идёт загрузка', () => {
    getCardMock.mockReturnValue(new Promise(() => undefined)); // никогда не resolves
    renderPage('ivan-petrov');
    // индикатор загрузки реально отображается (Spinner VKUI имеет role=status)
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Иван Петров')).not.toBeInTheDocument();
    return waitFor(() => expect(getCardMock).toHaveBeenCalled());
  });
});
