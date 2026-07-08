import React from 'react';
import { SEPRI_LIST_ITEM, SEPRI_LIST_ITEM_ACTIVE } from '../../constants/sepriSurfaces';

export interface SepriListCardProps {
  activo?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
}

/** Ítem de lista tipo card — inspirado en Gestión de Obras. */
const SepriListCard: React.FC<SepriListCardProps> = ({
  activo = false,
  onClick,
  children,
  acciones,
  className = '',
}) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    className={[
      SEPRI_LIST_ITEM,
      activo ? SEPRI_LIST_ITEM_ACTIVE : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="flex items-start gap-3 min-w-0">
      <div className="flex-1 min-w-0">{children}</div>
      {acciones && (
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {acciones}
        </div>
      )}
    </div>
  </div>
);

export default SepriListCard;
