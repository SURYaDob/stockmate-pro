import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-primary-900">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-accent-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-accent-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading StockMate Pro...</p>
      </div>
    </div>
  );
};

const Skeleton = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${className}`}>&nbsp;</div>
      ))}
    </>
  );
};

const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-3 p-4">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="skeleton h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

const CardSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card p-4">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    ))}
  </div>
);

export default LoadingScreen;
export { Skeleton, TableSkeleton, CardSkeleton };
