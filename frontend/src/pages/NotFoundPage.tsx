import { Button, Placeholder } from '@vkontakte/vkui';
import { Icon28ErrorOutline } from '@vkontakte/icons';
import { useNavigate } from 'react-router-dom';

import { PageStub } from './PageStub';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <PageStub title="404">
      <Placeholder
        icon={<Icon28ErrorOutline width={56} height={56} />}
        title="Страница не найдена"
        action={
          <Button size="m" onClick={() => navigate('/')}>
            На главную
          </Button>
        }
      >
        Такой страницы не существует.
      </Placeholder>
    </PageStub>
  );
}
