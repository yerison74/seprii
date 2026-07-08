import React from 'react';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import {
  SEPRI_CARD_RAISED,
  SEPRI_PANEL_HEADER,
  SEPRI_ACCORDION_BTN,
} from '../../constants/sepriSurfaces';

export interface SeccionColapsableProps {
  titulo: string;
  descripcion?: string;
  abierto: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  badge?: React.ReactNode;
  acciones?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  contenidoClassName?: string;
  /** Si false, solo muestra cabecera (sin chevron de colapsar). */
  colapsable?: boolean;
}

/**
 * Panel colapsable — card elevada sin borde duro (estilo Obras / shell App).
 */
const SeccionColapsable: React.FC<SeccionColapsableProps> = ({
  titulo,
  descripcion,
  abierto,
  onToggle,
  children,
  badge,
  acciones,
  icon,
  className = '',
  contenidoClassName = '',
  colapsable = true,
}) => {
  const mostrarContenido = !colapsable || abierto;

  return (
    <section
      className={[SEPRI_CARD_RAISED, 'overflow-hidden flex flex-col min-h-0', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={SEPRI_PANEL_HEADER}>
        {icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light/60 text-primary shadow-soft"
            aria-hidden
          >
            {icon}
          </div>
        )}

        {colapsable ? (
          <button
            type="button"
            onClick={onToggle}
            className={`${SEPRI_ACCORDION_BTN} group`}
            aria-expanded={abierto}
          >
            <span className="text-sm font-semibold text-stone-700 tracking-tight truncate group-hover:text-stone-900">
              {titulo}
            </span>
            {badge}
            <span className="ml-auto shrink-0 text-stone-400 group-hover:text-stone-600 transition-colors">
              {abierto ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </span>
          </button>
        ) : (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-stone-700 tracking-tight truncate">{titulo}</span>
            {badge}
          </div>
        )}

        {acciones && <div className="flex items-center gap-1.5 shrink-0">{acciones}</div>}
      </div>

      {descripcion && mostrarContenido && (
        <p className="text-xs text-stone-400 px-4 pb-1 shrink-0 leading-relaxed">{descripcion}</p>
      )}

      {mostrarContenido && children != null && (
        <div
          className={['px-4 pb-4 pt-1 flex flex-col min-h-0 flex-1 gap-3', contenidoClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
      )}
    </section>
  );
};

export default SeccionColapsable;
