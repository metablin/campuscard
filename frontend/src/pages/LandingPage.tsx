import { useNavigate } from 'react-router-dom';
import {
  Button,
  Div,
  Footer,
  Group,
  Header,
  Link,
  Panel,
  PanelHeader,
  SimpleCell,
  Spacing,
  Text,
  Title,
} from '@vkontakte/vkui';
import {
  Icon28LinkOutline,
  Icon28QrCodeOutline,
  Icon28ShareOutline,
} from '@vkontakte/icons';

import { PageContainer } from './PageContainer';

const FEATURES = [
  {
    icon: <Icon28LinkOutline />,
    title: 'Постоянная ссылка',
    subtitle: 'Твоя визитка всегда доступна по адресу /u/твой-slug.',
  },
  {
    icon: <Icon28QrCodeOutline />,
    title: 'QR-код',
    subtitle: 'Покажи код — и твою визитку откроют за секунду.',
  },
  {
    icon: <Icon28ShareOutline />,
    title: 'Легко делиться',
    subtitle: 'Отправляй ссылку в мессенджеры, соцсети и резюме.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <Panel>
      <PanelHeader>CampusCard</PanelHeader>

      <PageContainer>
        <Group>
          <Spacing size={24} />
          <Div style={{ textAlign: 'center' }}>
            <Title level="1">Цифровая визитка студента</Title>
            <Spacing size={16} />
            <Text>
              Одна ссылка и QR-код со всей информацией о тебе: учёба, навыки
              и контакты. Создай визитку за пару минут.
            </Text>
            <Spacing size={24} />
            <Button size="l" onClick={() => navigate('/login')}>
              Создать визитку
            </Button>
          </Div>
          <Spacing size={16} />
        </Group>

        <Group header={<Header>Почему это удобно</Header>}>
          {FEATURES.map((feature) => (
            <SimpleCell
              key={feature.title}
              before={feature.icon}
              subtitle={feature.subtitle}
              multiline
            >
              {feature.title}
            </SimpleCell>
          ))}
        </Group>

        <Footer>
          Построено на открытом коде VK —{' '}
          <Link href="https://github.com/VKCOM" target="_blank" rel="noreferrer">
            github.com/VKCOM
          </Link>
        </Footer>
      </PageContainer>
    </Panel>
  );
}
