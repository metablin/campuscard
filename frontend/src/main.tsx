import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoot, ConfigProvider } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { useSystemColorScheme } from './hooks/useSystemColorScheme';

function Root() {
  // Авто light/dark по системной теме
  const colorScheme = useSystemColorScheme();

  return (
    <ConfigProvider colorScheme={colorScheme}>
      <AppRoot>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </AppRoot>
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
