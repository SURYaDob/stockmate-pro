import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, UserCircle,
  BarChart3, Wallet, UserCheck, Settings, Bell, LogOut, Menu, X
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { useStockAlerts } from '../../hooks/useStockAlerts';
import { useNotificationCount } from '../../hooks/useNotificationCount';
import NotificationDropdown from '../notifications/NotificationDropdown';
import UpdateBanner from '../common/UpdateBanner';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/inventory', icon: Package, label: 'nav.inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'nav.sales' },
  { to: '/purchases', icon: Truck, label: 'nav.purchases' },
  { to: '/suppliers', icon: Users, label: 'nav.suppliers' },
  { to: '/customers', icon: UserCircle, label: 'nav.customers' },
  { to: '/reports', icon: BarChart3, label: 'nav.reports' },
  { to: '/expenses', icon: Wallet, label: 'nav.expenses' },
  { to: '/employees', icon: UserCheck, label: 'nav.employees' },
  { to: '/notifications', icon: Bell, label: 'nav.notifications' },
];

const bottomNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/inventory', icon: Package, label: 'nav.inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'nav.sales' },
  { to: '/purchases', icon: Truck, label: 'nav.purchases' },
  { to: '/notifications', icon: Bell, label: 'nav.notifications' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
];

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, logout } = useAuthStore();
  // Theme is managed globally in App.jsx
  const { t } = useTranslation();
  const { lowStockCount } = useStockAlerts(!!user);
  const { unreadCount: notifUnreadCount, refreshCount } = useNotificationCount(!!user);
  const [notifDropdownOpen, setNotifDropdownOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-primary-900">
      {/* Auto-update banner */}
      <UpdateBanner />

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2">
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold text-accent-500">StockMate</h1>
        <div className="relative">
          <button
            onClick={() => setNotifDropdownOpen(prev => !prev)}
            onMouseDown={(e) => e.stopPropagation()}
            className="btn-ghost p-2 relative"
          >
            <Bell size={20} />
            {/* Low stock alert badge - red, top-right */}
            {lowStockCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1 shadow-lg">
                {lowStockCount > 99 ? '99+' : lowStockCount}
              </span>
            )}
            {/* Notification unread badge - accent, bottom-right */}
            {notifUnreadCount > 0 && (
              <span className="absolute -bottom-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-accent-500 text-white text-[9px] font-bold leading-none px-1 shadow-sm">
                {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
              </span>
            )}
          </button>
          {notifDropdownOpen && (
            <NotificationDropdown
              isOpen={notifDropdownOpen}
              onClose={() => setNotifDropdownOpen(false)}
              lowStockCount={lowStockCount}
              notifUnreadCount={notifUnreadCount}
              onRefreshCount={refreshCount}
            />
          )}
        </div>
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h1 className="text-xl font-bold text-accent-500">StockMate</h1>
            <p className="text-xs text-slate-400">Pro</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-1 lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]
                ${isActive
                  ? 'bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}`
              }
            >
              <div className="relative">
                <item.icon size={20} />
                {item.to === '/notifications' && notifUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-accent-500 text-white text-[9px] font-bold leading-none px-1 shadow-sm">
                    {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                  </span>
                )}
              </div>
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
          <NavLink
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[44px]"
          >
            <Settings size={20} />
            {t('nav.settings')}
          </NavLink>
          <button
            onClick={() => {
              // Clear localStorage synchronously BEFORE async logout + redirect
              try {
                localStorage.removeItem('auth-storage');
                sessionStorage.removeItem('auth-storage');
              } catch { /* noop */ }
              logout().finally(() => {
                window.location.href = '/login';
              });
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full min-h-[44px]"
          >
            <LogOut size={20} />
            {t('auth.logout')}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{user?.firstName} {user?.lastName}</span>
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(prev => !prev)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`btn-ghost p-2 relative ${notifDropdownOpen ? 'bg-slate-100 dark:bg-slate-700' : ''}`}
              >
                <Bell size={18} />
                {/* Low stock alert badge - red, top-right */}
                {lowStockCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none px-1 shadow-sm">
                    {lowStockCount > 99 ? '99+' : lowStockCount}
                  </span>
                )}
                {/* Notification unread badge - accent, bottom-right */}
                {notifUnreadCount > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-accent-500 text-white text-[8px] font-bold leading-none px-1 shadow-sm">
                    {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                  </span>
                )}
              </button>
              {notifDropdownOpen && (
                <NotificationDropdown
                  isOpen={notifDropdownOpen}
                  onClose={() => setNotifDropdownOpen(false)}
                  lowStockCount={lowStockCount}
                  notifUnreadCount={notifUnreadCount}
                  onRefreshCount={refreshCount}
                />
              )}
            </div>
          </div>
        </div>

        <div className="page-container">
          {children}
        </div>
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="bottom-nav lg:hidden">          {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <div className="relative">
              <item.icon size={22} />
              {item.to === '/notifications' && notifUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-accent-500 text-white text-[8px] font-bold leading-none px-1 shadow-sm">
                  {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                </span>
              )}
            </div>
            <span>{t(item.label)}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  );
};

export default MainLayout;
