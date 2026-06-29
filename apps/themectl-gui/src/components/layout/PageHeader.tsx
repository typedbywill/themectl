import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, eyebrow, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-hairline pb-6 mb-8 gap-4">
      <div className="space-y-1">
        {eyebrow && (
          <div className="type-eyebrow text-stone tracking-[0.35px] mb-2">{eyebrow}</div>
        )}
        <h1 className="type-heading-md text-ink tracking-[-0.9px]">{title}</h1>
        {subtitle && <p className="type-body text-graphite mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
