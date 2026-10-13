import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import App from './App';
import { initI18n } from './i18n';
import { AppProviders } from './providers/app-providers';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element #root was not found');
}

void initI18n().then(() => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </React.StrictMode>
  );
});
