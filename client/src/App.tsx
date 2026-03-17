import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./auth/LoginPage";
import AuthCallback from "./auth/AuthCallback";
import DashboardPage from "./pages/DashboardPage";
import ServicesPage from "./pages/ServicesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="services" element={<ServicesPage />} />
      </Route>
    </Routes>
  );
}
