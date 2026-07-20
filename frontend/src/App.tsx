import { Route, Routes } from 'react-router-dom';

import { RequireAuth } from './auth/RequireAuth';
import { AppPage } from './pages/AppPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { EditCardPage } from './pages/EditCardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PublicCardPage } from './pages/PublicCardPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/edit"
        element={
          <RequireAuth>
            <EditCardPage />
          </RequireAuth>
        }
      />
      <Route path="/u/:slug" element={<PublicCardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
