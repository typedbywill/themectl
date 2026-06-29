import React from "react";

interface CardSectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  className?: string;
}

export const CardSectionHeader: React.FC<CardSectionHeaderProps> = ({
  title,
  icon,
  className,
}) => (
  <div className={["card-section-header", className].filter(Boolean).join(" ")}>
    <span className="type-micro-caps text-stone inline-flex items-center gap-1.5">
      {icon}
      <span>{title}</span>
    </span>
  </div>
);
