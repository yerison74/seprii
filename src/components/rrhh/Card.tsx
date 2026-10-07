import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, action }) => (
  <div
    className={[
      'bg-white border border-[#e5e7eb] rounded-[10px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {(title || action) && (
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#e5e7eb] flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

export default Card;
