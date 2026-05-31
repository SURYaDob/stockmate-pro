import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Loader2, Package, ShoppingCart, Truck,
  Wallet, Info, CreditCard, Calendar, UserCheck, X, ChevronRight,
  AlertTriangle
} from 'lucide-react';
import api from '../../utils/api';

const notificationIcons = {
  LOW_STOCK: Package,
  PAYMENT_DUE: Wallet,
  PAYMENT_RECEIVED: CreditCard,
  ORDER_RECEIVED: Truck,
  STOCK_EXPIRY: Calendar,
  SALE_CREATED: ShoppingCart,
  PURCHASE_CREATED: Truck,
  EMPLOYEE_CLOCK: UserCheck,
  SYSTEM: Info,
};

const notificationColors = {
  LOW_STOCK: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  PAYMENT_DUE: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  ORDER_RECEIVED: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  STOCK_EXPIRY: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  SALE_CREATED: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  PURCHASE_CREATED: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  EMPLOYEE_CLOCK: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  SYSTEM: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const NotificationDropdown = ({ isOpen, onClose, lowStockCount, notifUnreadCount, onRefreshCount }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notifications?limit=5');
      setNotifications(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when opened
  useEffect(() => {
    if (isOpen) {
      fetchRecent();
    }
  }, [isOpen, fetchRecent]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      if (onRefreshCount) onRefreshCount();
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      if (onRefreshCount) onRefreshCount();
    } catch {
      // silent
    }
  };

  const handleViewAll = () => {
    onClose();
    navigate('/notifications');
  };

  const getRefLink = (notification) => {
    if (notification.referenceType === 'sale' && notification.referenceId) {
      return `/sales/${notification.referenceId}`;
    }
    if (notification.referenceType === 'purchase' && notification.referenceId) {
      return `/purchases/${notification.referenceId}`;
    }
    if (notification.referenceType === 'inventory' && notification.referenceId) {
      return `/inventory/${notification.referenceId}`;
    }
    return null;
  };

  const handleItemClick = (notification) => {
    const refLink = getRefLink(notification);
    if (!notification.isRead) {
      handleMarkRead(notification.id, { stopPropagation: () => {} });
    }
    onClose();
    if (refLink) {
      navigate(refLink);
    }
  };

  const unreadInDropdown = notifications.filter(n => !n.isRead).length;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-16px)] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-scale-in origin-top-right"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
          {notifUnreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-accent-500 text-white text-[9px] font-bold px-1">
              {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadInDropdown > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-ghost p-1.5 text-xs text-slate-500 hover:text-accent-500"
              title="Mark all as read"
            >
              <CheckCheck size={14} />
            </button>
          )}
          <button onClick={onClose} className="btn-ghost p-1.5 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[340px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-accent-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
            <AlertTriangle size={24} className="text-red-400" />
            <p className="text-xs text-slate-500">{error}</p>
            <button onClick={fetchRecent} className="btn-ghost text-xs text-accent-500">Retry</button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
            <Bell size={28} className="text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No notifications yet</p>
            <p className="text-xs text-slate-400">Updates will appear here as they come in</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {notifications.map((n) => {
              const Icon = notificationIcons[n.type] || Info;
              const colorClass = notificationColors[n.type] || notificationColors.SYSTEM;
              const refLink = getRefLink(n);

              return (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    !n.isRead
                      ? 'bg-accent-50/50 dark:bg-accent-900/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${colorClass}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-snug ${!n.isRead ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{n.message}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.isRead && (
                          <button
                            onClick={(e) => handleMarkRead(n.id, e)}
                            className="btn-ghost p-1 text-slate-400 hover:text-accent-500"
                            title="Mark as read"
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">{formatRelativeTime(n.createdAt)}</span>
                      {refLink && (
                        <span className="text-[10px] text-accent-500 font-medium">View</span>
                      )}
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
        {lowStockCount > 0 && (
          <button
            onClick={() => { onClose(); navigate('/inventory?filter=low-stock'); }}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
          >
            <Package size={12} />
            {lowStockCount} low stock
          </button>
        )}
        <button
          onClick={handleViewAll}
          className={`flex items-center gap-1 text-xs font-medium text-accent-500 hover:text-accent-600 ${lowStockCount > 0 ? 'ml-auto' : ''}`}
        >
          View all
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
