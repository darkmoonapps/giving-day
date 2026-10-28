import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/home-page';
import { LoginPage } from '../pages/login-page';
import { OAuthCallbackPage } from '../pages/oauth-callback-page';
import { OnboardingPage } from '../pages/onboarding-page';
import { GuestRoute, OnboardingRoute, ProtectedRoute } from './guards';

export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
