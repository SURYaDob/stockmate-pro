import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Warehouse } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-primary-900 dark:to-primary-800 p-4">
      <div className="text-center max-w-md animate-fade-in">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-amber-100 dark:bg-amber-900/20 mb-8">
          <Warehouse size={48} className="text-amber-500" strokeWidth={1.5} />
        </div>

        <h1 className="text-7xl font-bold text-slate-200 dark:text-slate-700 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">Page Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          The page you are looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="btn-secondary"
          >
            <ArrowLeft size={18} />
            Go Back
          </Link>
          <Link
            to="/dashboard"
            className="btn-primary"
          >
            <Home size={18} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
