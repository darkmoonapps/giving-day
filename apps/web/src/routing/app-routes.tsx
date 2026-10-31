import { Navigate, Route, Routes } from 'react-router-dom';
import { CoordinatorDayResponsesPage } from '../pages/coordinator-day-responses-page';
import { CoordinatorMatchesPage } from '../pages/coordinator-matches-page';
import { DayDeliveriesPage } from '../pages/day-deliveries-page';
import { HomePage } from '../pages/home-page';
import { LoginPage } from '../pages/login-page';
import { OAuthCallbackPage } from '../pages/oauth-callback-page';
import { OnboardingPage } from '../pages/onboarding-page';
import { VolunteerDayPage } from '../pages/volunteer-day-page';
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
      <Route
        path="/cities/:cityId/days/:dayId"
        element={
          <ProtectedRoute>
            <VolunteerDayPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cities/:cityId/days/:dayId/responses"
        element={
          <ProtectedRoute>
            <CoordinatorDayResponsesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cities/:cityId/days/:dayId/deliveries"
        element={
          <ProtectedRoute>
            <DayDeliveriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cities/:cityId/matches"
        element={
          <ProtectedRoute>
            <CoordinatorMatchesPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
