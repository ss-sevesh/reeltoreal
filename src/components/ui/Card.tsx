import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'interactive';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-900/70 border border-slate-800/90 text-slate-100 shadow-sm',
    elevated: 'bg-slate-900 border border-slate-800 shadow-xl text-slate-100',
    glass: 'bg-slate-900/60 backdrop-blur-md border border-slate-800/80 text-slate-100',
    interactive:
      'bg-slate-900/70 border border-slate-800/90 hover:border-purple-500/40 hover:bg-slate-900 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:shadow-purple-500/5',
  };

  const hoverStyle = hoverEffect ? 'hover:border-slate-700 transition-colors duration-200' : '';

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${variantStyles[variant]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
