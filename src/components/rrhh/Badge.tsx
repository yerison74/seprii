import React from 'react';

type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-emerald-50/80 text-emerald-700',
  warning: 'bg-amber-50/80 text-amber-800',
  danger: 'bg-red-50/80 text-red-700',
  neutral: 'bg-warm-100/90 text-stone-500',
  info: 'bg-primary-light/60 text-[#1E88E5]',
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, tone = 'neutral', className = '' }) => (
  <span
    className={[
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-soft',
      TONE_CLASSES[tone],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
);

export default Badge;
