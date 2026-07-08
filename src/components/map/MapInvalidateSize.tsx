import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapInvalidateSizeProps {
  /** Coordenadas opcionales: recentra el mapa al cambiar. */
  center?: [number, number];
  zoom?: number;
}

/**
 * Corrige mapas en contenedores ocultos, modales o acordeones (tiles grises / mapa recortado).
 */
export function MapInvalidateSize({ center, zoom }: MapInvalidateSizeProps) {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => {
      map.invalidateSize({ animate: false });
    };

    invalidate();
    const t1 = window.setTimeout(invalidate, 100);
    const t2 = window.setTimeout(invalidate, 350);

    const container = map.getContainer();
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => invalidate());
      observer.observe(container);
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      observer?.disconnect();
    };
  }, [map]);

  useEffect(() => {
    if (center) {
      map.setView(center, zoom ?? map.getZoom(), { animate: false });
    }
  }, [map, center, zoom]);

  return null;
}
