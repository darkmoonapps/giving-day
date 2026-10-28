import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './auth/session-provider';
import { AppRoutes } from './routing/app-routes';

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
