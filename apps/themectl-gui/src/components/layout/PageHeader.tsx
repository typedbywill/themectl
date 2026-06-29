import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, eyebrow, actions }) => {
  return (
    <header className="flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2 min-w-0">
        {eyebrow && (
          <p className="type-eyebrow text-stone">{eyebrow}</p>
        )}
        <h1 className="type-heading-md text-ink">{title}</h1>
        {subtitle && <p className="type-body text-graphite max-w-2xl">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
};
