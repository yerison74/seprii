import React from 'react';
import { SEPRI_CARD_RAISED } from '../../constants/sepriSurfaces';

interface ModuloPageHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Cabecera institucional unificada para módulos SEPRI. */
const ModuloPageHeader: React.FC<ModuloPageHeaderProps> = ({
  icon,
  title,
  description,
  children,
}) => (
  <header className={`shrink-0 ${SEPRI_CARD_RAISED} px-4 py-4 sm:px-6`}>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light/70 text-primary shadow-soft"
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-stone-800 tracking-tight">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm text-stone-400 mt-1 leading-relaxed max-w-2xl">{description}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  </header>
);

export default ModuloPageHeader;
