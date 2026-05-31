import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-primary-900 dark:to-primary-800 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </div>
      <footer className="text-center pb-4 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} StockMate Pro. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthLayout;
