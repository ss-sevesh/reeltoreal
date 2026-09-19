import React from 'react';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: ButtonProps['variant'];
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="text-center py-12 sm:py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl max-w-lg mx-auto">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto mb-4 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg font-bold text-slate-200">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        <div className="mt-5">
          <Button
            size="sm"
            variant={action.variant || 'primary'}
            onClick={action.onClick}
            icon={action.icon}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};
