import React from 'react';

interface PageHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  description,
  actions,
}) => {
  return (
    <div className="page-header-glass flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {kicker && <span className="kicker mb-1.5 block">{kicker}</span>}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-hotel-text sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-xs text-hotel-muted max-w-2xl sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
};

