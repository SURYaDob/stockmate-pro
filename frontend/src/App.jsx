import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/auth/Auth'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/inventory/InventoryList'));
const InventoryDetail = lazy(() => import('./pages/inventory/InventoryDetail'));
const InventoryForm = lazy(() => import('./pages/inventory/InventoryForm'));
const Sales = lazy(() => import('./pages/sales/SalesList'));
const NewSale = lazy(() => import('./pages/sales/NewSale'));
const SaleDetail = lazy(() => import('./pages/sales/SaleDetail'));
const Purchases = lazy(() => import('./pages/purchases/PurchasesList'));
const NewPurchase = lazy(() => import('./pages/purchases/NewPurchase'));
const PurchaseDetail = lazy(() => import('./pages/purchases/PurchaseDetail'));
const Suppliers = lazy(() => import('./pages/suppliers/SupplierList'));
const SupplierDetail = lazy(() => import('./pages/suppliers/SupplierDetail'));
const SupplierForm = lazy(() => import('./pages/suppliers/SupplierForm'));
const SupplierLedger = lazy(() => import('./pages/suppliers/SupplierLedger'));
const Customers = lazy(() => import('./pages/customers/CustomerList'));
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail'));
const CustomerForm = lazy(() => import('./pages/customers/CustomerForm'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Expenses = lazy(() => import('./pages/expenses/Expenses'));
const Employees = lazy(() => import('./pages/employees/Employees'));
const Notifications = lazy(() => import('./pages/notifications/Notifications'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Protected route wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { theme } = useThemeStore();

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes */}
          <Route element={<AuthLayout />}>
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          {/* Category selection - only for authenticated users */}
          <Route element={<AuthLayout />}>
            <Route path="/" element={
              <ProtectedRoute>
                <Landing />
              </ProtectedRoute>
            } />
          </Route>

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout><Dashboard /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <MainLayout><Inventory /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/new"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER', 'STAFF']}>
                <MainLayout><InventoryForm /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/:id"
            element={
              <ProtectedRoute>
                <MainLayout><InventoryDetail /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/:id/edit"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER']}>
                <MainLayout><InventoryForm /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <MainLayout><Sales /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/new"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER', 'STAFF']}>
                <MainLayout><NewSale /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/:id"
            element={
              <ProtectedRoute>
                <MainLayout><SaleDetail /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER']}>
                <MainLayout><Purchases /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/new"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER']}>
                <MainLayout><NewPurchase /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/:id"
            element={
              <ProtectedRoute>
                <MainLayout><PurchaseDetail /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <MainLayout><Suppliers /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/new"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER']}>
                <MainLayout><SupplierForm /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id"
            element={
              <ProtectedRoute>
                <MainLayout><SupplierDetail /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id/ledger"
            element={
              <ProtectedRoute>
                <MainLayout><SupplierLedger /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers/:id/edit"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER']}>
                <MainLayout><SupplierForm /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <MainLayout><Customers /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/new"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER', 'STAFF']}>
                <MainLayout><CustomerForm /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute>
                <MainLayout><CustomerDetail /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:id/edit"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER']}>
                <MainLayout><CustomerForm /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER', 'ACCOUNTANT']}>
                <MainLayout><Reports /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <MainLayout><Expenses /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute roles={['ADMIN', 'STORE_MANAGER']}>
                <MainLayout><Employees /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <MainLayout><Notifications /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout><Settings /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
