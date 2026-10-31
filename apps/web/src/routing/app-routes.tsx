import { Navigate, Route, Routes } from 'react-router-dom';
import { CitySettingsPage } from '../pages/city-settings-page';
import { CoordinatorChangeRequestsPage } from '../pages/coordinator-change-requests-page';
import { CoordinatorDayDashboardPage } from '../pages/coordinator-day-dashboard-page';
import { CoordinatorDayResponsesPage } from '../pages/coordinator-day-responses-page';
import { CoordinatorEldersPage } from '../pages/coordinator-elders-page';
import { CoordinatorMatchesPage } from '../pages/coordinator-matches-page';
import { CoordinatorPendingMembershipsPage } from '../pages/coordinator-pending-memberships-page';
import { DayDeliveriesPage } from '../pages/day-deliveries-page';
import { HomePage } from '../pages/home-page';
import { JoinPage } from '../pages/join-page';
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
      <Route path="/join/:token" element={<JoinPage />} />
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
        path="/cities/:cityId/days/:dayId/dashboard"
        element={
          <ProtectedRoute>
            <CoordinatorDayDashboardPage />
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
      <Route
        path="/cities/:cityId/elders"
        element={
          <ProtectedRoute>
            <CoordinatorEldersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cities/:cityId/join-requests"
        element={
          <ProtectedRoute>
            <CoordinatorPendingMembershipsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cities/:cityId/change-requests"
        element={
          <ProtectedRoute>
            <CoordinatorChangeRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cities/:cityId/settings"
        element={
          <ProtectedRoute>
            <CitySettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
