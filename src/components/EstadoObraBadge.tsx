import React from 'react';
import { CLASE_ETIQUETA_ESTADO_OBRA, getEstadoObraColores } from '../utils/estadoObra';

interface EstadoObraBadgeProps {
  estado: string;
  className?: string;
}

const EstadoObraBadge: React.FC<EstadoObraBadgeProps> = ({ estado, className = '' }) => {
  const { bg, text } = getEstadoObraColores(estado);
  return (
    <span
      className={`${CLASE_ETIQUETA_ESTADO_OBRA} ${className}`.trim()}
      style={{ backgroundColor: bg, color: text }}
    >
      {estado}
    </span>
  );
};

export default EstadoObraBadge;
