import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-primary-900 dark:to-primary-800 flex flex-col items-center justify-center p-4">
      <Outlet />
      <p className="text-center text-xs text-slate-400 mt-4">
        &copy; {new Date().getFullYear()} StockMate Pro. All rights reserved.
      </p>
    </div>
  );
};

export default AuthLayout;
