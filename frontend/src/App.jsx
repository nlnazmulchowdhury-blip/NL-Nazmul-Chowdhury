import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ToolPage from './pages/ToolPage';
import CategoryPage from './pages/CategoryPage';
import AllToolsPage from './pages/AllToolsPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import ToolsManager from './pages/admin/ToolsManager';
import UsersPage from './pages/admin/UsersPage';
import ConversionsPage from './pages/admin/ConversionsPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import SettingsPage from './pages/admin/SettingsPage';
import SecurityPage from './pages/admin/SecurityPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Main Site */}
        <Route path="/" element={
          <div className="min-h-screen flex flex-col bg-white">
            <Header />
            <main className="flex-1"><HomePage /></main>
            <Footer />
          </div>
        } />
        <Route path="/tools" element={
          <div className="min-h-screen flex flex-col bg-white">
            <Header />
            <main className="flex-1"><AllToolsPage /></main>
            <Footer />
          </div>
        } />
        <Route path="/tool/:slug" element={
          <div className="min-h-screen flex flex-col bg-white">
            <Header />
            <main className="flex-1"><ToolPage /></main>
            <Footer />
          </div>
        } />
        <Route path="/category/:slug" element={
          <div className="min-h-screen flex flex-col bg-white">
            <Header />
            <main className="flex-1"><CategoryPage /></main>
            <Footer />
          </div>
        } />

        {/* Admin Panel */}
        <Route path="/control-panel/login" element={<AdminLogin />} />
        <Route path="/control-panel" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="tools" element={<ToolsManager />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="conversions" element={<ConversionsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="security" element={<SecurityPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
