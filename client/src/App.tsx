import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./auth/LoginPage";
import AuthCallback from "./auth/AuthCallback";
import DashboardPage from "./pages/DashboardPage";
import ServicesPage from "./pages/ServicesPage";
import AlertsPage from "./pages/AlertsPage";
import GenericScreen from "./pages/GenericScreen";
import RommSorterPage from "./pages/RommSorterPage";
import TdarrCleanupPage from "./pages/TdarrCleanupPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="screens/:slug" element={<GenericScreen />} />
        <Route path="romm-sorter" element={<RommSorterPage />} />
        <Route path="tdarr-cleanup" element={<TdarrCleanupPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
