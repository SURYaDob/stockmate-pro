import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell, Check, CheckCheck, Settings, X, Loader2, AlertTriangle,
  RefreshCw, Package, ShoppingCart, Truck, Wallet,
  UserCheck, Info,
  Mail, BellRing,
  Save, CreditCard, Calendar, Smartphone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { usePushSubscription } from '../../hooks/usePushSubscription';

const formatDateShort = (dateStr) => {
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

const Notifications = () => {
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Preferences
  const [preferences, setPreferences] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('all');

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifRes.data.data || []);
      setUnreadCount(countRes.data.data?.count || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const res = await api.get('/notifications/preferences');
      setPreferences(res.data.data || {});
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]);

  // Mark as read
  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // silent
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      // silent
    }
  };

  // Push subscription management
  const {
    permission: pushPermission,
    isSubscribed,
    subscribing,
    error: pushError,
    supported: pushSupported,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = usePushSubscription();

  // Sync push subscription when pushNotify preference changes
  const prevPushNotify = useRef(preferences?.pushNotify);
  useEffect(() => {
    if (preferences === null || preferences.pushNotify === undefined) return;

    const current = preferences.pushNotify;
    const prev = prevPushNotify.current;
    prevPushNotify.current = current;

    // Only act when the value actually changed (not on mount)
    if (prev === undefined) return;

    if (current && !isSubscribed) {
      subscribePush();
    } else if (!current && isSubscribed) {
      unsubscribePush();
    }
  }, [preferences, preferences?.pushNotify, isSubscribed, subscribePush, unsubscribePush]);

  // Save preferences
  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const res = await api.put('/notifications/preferences', preferences);
      setPreferences(res.data.data);
      // Handle push subscription after successful save
      if (preferences.pushNotify) {
        await subscribePush();
      } else {
        await unsubscribePush();
      }
      setShowPrefs(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('nav.notifications') || 'Notifications'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'No unread notifications'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-secondary btn-sm">
              <CheckCheck size={16} />
              <span className="hidden sm:inline">Mark All Read</span>
            </button>
          )}
          <button
            onClick={() => setShowPrefs(true)}
            className={`btn-secondary btn-sm ${showPrefs ? 'bg-accent-50 text-accent-600' : ''}`}
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Preferences</span>
          </button>
          <button onClick={fetchNotifications} className="btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-accent-500 text-accent-600 dark:text-accent-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          All
          <span className="ml-1.5 text-xs text-slate-400">({notifications.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'unread'
              ? 'border-accent-500 text-accent-600 dark:text-accent-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-accent-500 text-white text-[10px] font-bold px-1">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={fetchNotifications} className="ml-auto btn-ghost text-sm font-medium text-red-500">Retry</button>
        </div>
      )}

      {/* Notifications list */}
      <div className="card overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="animate-spin text-accent-500 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state p-12">
            <Bell size={56} className="text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {activeTab === 'unread'
                ? 'You\'re all caught up!'
                : 'Notifications for low stock alerts, payment reminders, and system updates will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredNotifications.map((notification) => {
              const Icon = notificationIcons[notification.type] || Info;
              const colorClass = notificationColors[notification.type] || notificationColors.SYSTEM;

              // Build reference link
              let refLink = null;
              if (notification.referenceType === 'sale' && notification.referenceId) {
                refLink = `/sales/${notification.referenceId}`;
              } else if (notification.referenceType === 'purchase' && notification.referenceId) {
                refLink = `/purchases/${notification.referenceId}`;
              } else if (notification.referenceType === 'inventory' && notification.referenceId) {
                refLink = `/inventory/${notification.referenceId}`;
              }

              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-4 transition-colors ${
                    !notification.isRead
                      ? 'bg-accent-50/50 dark:bg-accent-900/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                    <Icon size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.message}</p>
                        )}
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkRead(notification.id)}
                          className="btn-ghost p-1.5 text-slate-400 hover:text-accent-500 flex-shrink-0"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-400">{formatDateShort(notification.createdAt)}</span>
                      {refLink && (
                        <Link to={refLink} className="text-xs text-accent-500 hover:underline">
                          View details
                        </Link>
                      )}
                      {!notification.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading overlay for refresh */}
        {loading && notifications.length > 0 && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center rounded-xl">
            <Loader2 size={24} className="animate-spin text-accent-500" />
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      {showPrefs && (
        <div className="modal-overlay" onClick={() => setShowPrefs(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-slate-500" />
                <h2 className="text-lg font-semibold">Notification Preferences</h2>
              </div>
              <button onClick={() => setShowPrefs(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePrefs} className="p-4 space-y-4">
              {/* Notification Types */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Alert Types</h3>
                <div className="space-y-3">
                  {[
                    { key: 'lowStock', label: 'Low Stock Alerts', desc: 'When inventory items fall below minimum threshold' },
                    { key: 'paymentDue', label: 'Payment Due Reminders', desc: 'When payments on sales or purchases are due' },
                    { key: 'itemExpiry', label: 'Item Expiry Alerts', desc: 'When items with expiry dates are nearing expiration' },
                    { key: 'overduePayment', label: 'Overdue Payment Alerts', desc: 'When payments become overdue' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={preferences?.[item.key] ?? true}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-accent-500 transition-colors">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Method */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Delivery Method</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={preferences?.emailNotify ?? true}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        emailNotify: e.target.checked,
                      }))}
                      className="w-4 h-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500"
                    />
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Notifications</p>
                        <p className="text-xs text-slate-400">Receive email alerts for important updates</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={preferences?.pushNotify ?? true}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        pushNotify: e.target.checked,
                      }))}
                      disabled={!pushSupported}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500 disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <BellRing size={16} className={`${isSubscribed ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-accent-500 transition-colors">
                          Push Notifications
                        </p>
                        {!pushSupported && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                            Unsupported
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {!pushSupported
                          ? 'Push notifications are not supported in this browser'
                          : pushPermission === 'denied'
                            ? 'Push notifications are blocked. Update your browser settings to enable.'
                            : isSubscribed
                              ? 'Push notifications are active'
                              : 'Receive real-time push notifications even when the app is closed'}
                      </p>
                      {/* Permission request hint */}
                      {pushSupported && pushPermission === 'default' && preferences?.pushNotify && (
                        <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                          <Smartphone size={10} />
                          Will request notification permission on save
                        </p>
                      )}
                      {/* Error state */}
                      {pushError && (
                        <p className="text-xs text-red-500 mt-1">{pushError}</p>
                      )}
                      {/* Loading state */}
                      {subscribing && (
                        <p className="text-xs text-accent-500 mt-1 flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" />
                          Setting up push notifications...
                        </p>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPrefs(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingPrefs} className="btn-primary">
                  {savingPrefs ? (
                    <><Loader2 size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={16} /> Save Preferences</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
