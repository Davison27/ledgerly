import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';

import '@fontsource-variable/inter';
import 'antd/dist/reset.css';
import '@/shared/i18n';
import './index.css';
import { AppProviders } from './app/providers/AppProviders';
import { router } from './app/router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
