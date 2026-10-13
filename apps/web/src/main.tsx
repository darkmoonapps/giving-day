import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, DirectionProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DirectionProvider>
      <MantineProvider>
        <App />
      </MantineProvider>
    </DirectionProvider>
  </React.StrictMode>
);
