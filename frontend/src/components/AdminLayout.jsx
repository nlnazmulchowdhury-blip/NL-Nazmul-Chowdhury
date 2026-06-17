import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Users, History, LogOut, Menu, X,
  ChevronRight, Shield, Layers, Home,  Settings, Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/control-panel', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/control-panel/tools', label: 'Tools', icon: Wrench },
  { to: '/control-panel/users', label: 'Users', icon: Users },
  { to: '/control-panel/conversions', label: 'Conversions', icon: History },
  { to: '/control-panel/categories', label: 'Categories', icon: Layers },
  { to: '/control-panel/settings', label: 'Settings', icon: Settings },
  { to: '/control-panel/security', label: 'Security', icon: Smartphone },
];

export default function AdminLayout() {
  const { user, logout, requires2FASetup, require2FASetting } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/control-panel/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Control Panel</p>
              <p className="text-[10px] text-gray-400">ProConverterBD</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username || 'Admin'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => navigate('/')}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            >
              <Home size={14} /> Site
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-semibold text-gray-700 hidden sm:block">Administration</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Logged in as <strong className="text-gray-600">{user?.username}</strong>
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {requires2FASetup && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">
                  Two-Factor Authentication is required
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  Your account is not yet protected. All admin users must set up 2FA.
                  Visit{' '}
                  <button
                    onClick={() => navigate('/control-panel/security')}
                    className="text-red-600 underline hover:text-red-700 font-medium"
                  >
                    Security Settings
                  </button>
                  {' '}to configure it now.
                </p>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
