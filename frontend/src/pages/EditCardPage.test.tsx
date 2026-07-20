import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoot, ConfigProvider } from '@vkontakte/vkui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cardsApi } from '../api/cards';
import { useAuth } from '../auth/AuthContext';
import { EditCardPage } from './EditCardPage';

// Мокаем API и контекст авторизации: реальных запросов и сессии нет
vi.mock('../api/cards', () => ({
  cardsApi: {
    generateSlug: vi.fn(),
    checkSlug: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const generateSlugMock = vi.mocked(cardsApi.generateSlug);

function renderPage() {
  return render(
    <ConfigProvider>
      <AppRoot>
        <MemoryRouter>
          <EditCardPage />
        </MemoryRouter>
      </AppRoot>
    </ConfigProvider>,
  );
}

describe('EditCardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { id: 1, display_name: 'Демо', avatar_url: null, is_vk: false },
      card: null,
      loading: false,
      error: false,
      refresh: vi.fn(),
      setCard: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('ввод подписи ссылки не теряет фокус (стабильный key строки)', () => {
    renderPage();
    fireEvent.click(screen.getByText('Добавить ссылку'));

    const input = screen.getByPlaceholderText('Подпись');
    input.focus();
    fireEvent.change(input, { target: { value: 'Telegram' } });

    // DOM-узел не перемонтирован: тот же элемент, фокус и значение на месте
    expect(input).toHaveValue('Telegram');
    expect(document.activeElement).toBe(input);
  });

  it('автогенерация slug не затирает введённый вручную адрес (гонка)', async () => {
    let resolveSlug: (value: { slug: string }) => void = () => undefined;
    generateSlugMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSlug = resolve;
      }),
    );
    renderPage();

    // ввели имя и ушли из поля → пошёл запрос генерации slug
    fireEvent.change(screen.getByPlaceholderText('Даниил Дёмкин'), {
      target: { value: 'Иван Петров' },
    });
    fireEvent.blur(screen.getByPlaceholderText('Даниил Дёмкин'));

    // пока запрос летит, пользователь вводит slug вручную
    const slugInput = screen.getByPlaceholderText('daniil-demkin');
    fireEvent.change(slugInput, { target: { value: 'my-slug' } });

    // ответ генерации пришёл позже — ручной ввод сохраняется
    resolveSlug({ slug: 'ivan-petrov' });
    await waitFor(() => expect(generateSlugMock).toHaveBeenCalled());
    expect(slugInput).toHaveValue('my-slug');
  });
});
