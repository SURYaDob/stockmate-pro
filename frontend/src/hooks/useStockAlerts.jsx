import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes
const LS_KEY = 'stockmate-alerted-items';

const getAlertedIds = () => {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const setAlertedIds = (ids) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
};

export const useStockAlerts = (enabled = true) => {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const alertedRef = useRef(getAlertedIds());
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const checkStock = useCallback(async (isInitial = false) => {
    if (!enabledRef.current) return;

    try {
      const res = await api.get('/inventory/low-stock?limit=50');
      const items = res.data.data || [];
      setLowStockItems(items);
      setLowStockCount(items.length);

      // On initial load, alert all low stock items
      if (isInitial) {
        if (items.length === 0) {
          // Reset alerted set when no items are low stock
          alertedRef.current = new Set();
          setAlertedIds([]);
          return;
        }

        // Only toast items that haven't been alerted before (across sessions)
        const previouslyAlerted = getAlertedIds();
        const newlyLow = items.filter(
          (item) => !previouslyAlerted.has(item.id)
        );
        // Toast newly low items
        if (newlyLow.length > 0) {
          toast(
            (t) => (
              <div className="flex items-start gap-3 min-w-[280px]">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-600 dark:text-amber-400 text-lg font-bold">!</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Low Stock Alert{newlyLow.length > 1 ? ` (${newlyLow.length})` : ''}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {newlyLow.slice(0, 3).map((item) => (
                      <p key={item.id} className="text-xs text-slate-600 dark:text-slate-400">
                        {item.name} — {item.currentStock} {item.unitType?.toLowerCase()} remaining
                      </p>
                    ))}
                    {newlyLow.length > 3 && (
                      <p className="text-xs text-slate-400">
                        +{newlyLow.length - 3} more items
                      </p>
                    )}
                  </div>
                  <a
                    href="/inventory"
                    className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-2 inline-block hover:underline"
                    onClick={() => {
                      toast.dismiss(t.id);
                      // Store a flag so InventoryList knows to show low stock filter
                      sessionStorage.setItem('filterLowStock', 'true');
                    }}
                  >
                    View all low stock items
                  </a>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="btn-ghost p-1 text-slate-400 hover:text-slate-600 flex-shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ),
            {
              duration: 8000,
              style: {
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '12px',
              },
            }
          );
        }

        // Mark all current low stock items as alerted
        const allIds = new Set(items.map((item) => item.id));
        alertedRef.current = allIds;
        setAlertedIds([...allIds]);
        return;
      }

      // On subsequent polls, only alert newly low items
      const currentAlerted = alertedRef.current;
      const newAlerts = items.filter(
        (item) => !currentAlerted.has(item.id)
      );

      if (newAlerts.length > 0) {
        newAlerts.forEach((item) => {
          toast.error(
            `Low Stock: ${item.name} — only ${item.currentStock} ${item.unitType?.toLowerCase()} left`,
            { duration: 6000 }
          );
        });
      }

      // Update alerted set: keep items still low, add new ones
      const stillLowIds = new Set(items.map((item) => item.id));
      alertedRef.current = stillLowIds;
      setAlertedIds([...stillLowIds]);
    } catch {
      // Silently fail — don't spam errors on poll failures
    }
  }, []);

  // Initial fetch + start polling
  useEffect(() => {
    if (!enabled) return;

    checkStock(true); // initial check with full alerts

    const interval = setInterval(() => checkStock(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, checkStock]);

  // Manual refresh function (can be called after sales, stock adjustments, etc.)
  const refreshAlerts = useCallback(() => {
    checkStock(true);
  }, [checkStock]);

  return { lowStockCount, lowStockItems, refreshAlerts };
};

