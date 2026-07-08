import { useEffect, useState } from 'react';
import { areasAPI, Area } from '../services/api';

interface UseAreasResult {
  areas: Area[];
  loadingAreas: boolean;
}

/**
 * Hook para obtener el catálogo de áreas desde la tabla `area` en Supabase.
 * Centraliza la carga y permite reutilizarla en distintos componentes.
 */
export function useAreas(): UseAreasResult {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchAreas = async () => {
      try {
        setLoadingAreas(true);
        const res = await areasAPI.obtenerAreas();
        if (!cancelled) {
          setAreas(res.data.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error al cargar áreas:', error);
          setAreas([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAreas(false);
        }
      }
    };

    fetchAreas();

    return () => {
      cancelled = true;
    };
  }, []);

  return { areas, loadingAreas };
}

