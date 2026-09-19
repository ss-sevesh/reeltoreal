import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-slate-800/60 rounded-xl ${className}`} />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-16 w-full" />
      <div className="flex justify-between pt-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-20" />
      </div>
    </div>
  );
};
