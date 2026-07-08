import React, { useMemo, useEffect, memo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RD_CENTER, RD_DEFAULT_ZOOM } from '../data/provinciasRD';
import type { ObraUbicacionGps } from '../types/database';
import { parseGpsCoords } from '../utils/mapUtils';
import { ensureLeafletIcons } from './map/leafletSetup';
import { MapInvalidateSize } from './map/MapInvalidateSize';

ensureLeafletIcons();

export { parseGpsCoords } from '../utils/mapUtils';

const ESTADO_COLORS: Record<string, string> = {
  ACTIVA: '#4361EE',
  INAUGURADA: '#3A86FF',
  TERMINADA: '#22C55E',
  DETENIDA: '#FB8500',
  PRELIMINARES: '#8338EC',
  'INTERVENIDA MANTENIMIENTO': '#FF006E',
  'NO ESPECIFICADO': '#94A3B8',
};

function getEstadoColor(estado: string): string {
  return ESTADO_COLORS[estado.toUpperCase()] || '#757575';
}

interface ReporteObrasMapProps {
  obras: ObraUbicacionGps[];
  height?: string;
}

function MapBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 14, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds.pad(0.15), { maxZoom: 12, animate: false });
  }, [map, coords]);

  return null;
}

type MarkerData = ObraUbicacionGps & { coords: [number, number]; color: string };

const ObraMarker = memo(function ObraMarker({
  obra,
  showTooltip,
  radius,
}: {
  obra: MarkerData;
  showTooltip: boolean;
  radius: number;
}) {
  return (
    <CircleMarker
      center={obra.coords}
      radius={radius}
      pathOptions={{
        fillColor: obra.color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.95,
        fillOpacity: 0.85,
      }}
    >
      {showTooltip && (
        <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
          <strong>{obra.nombre}</strong>
          {obra.provincia ? (
            <>
              <br />
              {obra.provincia}
            </>
          ) : null}
        </Tooltip>
      )}
      <Popup>
        <div className="text-left min-w-[160px]">
          <strong className="block text-gray-800 mb-1">{obra.nombre}</strong>
          {(obra.codigo || obra.id) && (
            <span className="block text-xs text-gray-500 font-mono mb-1">
              {obra.codigo || obra.id}
            </span>
          )}
          <span className="block text-sm" style={{ color: obra.color }}>
            {obra.estado}
          </span>
          {obra.provincia && (
            <span className="block text-xs text-gray-600 mt-1">{obra.provincia}</span>
          )}
          <span className="block text-xs text-gray-400 mt-1">
            {obra.coords[0].toFixed(5)}, {obra.coords[1].toFixed(5)}
          </span>
        </div>
      </Popup>
    </CircleMarker>
  );
});

const ReporteObrasMap: React.FC<ReporteObrasMapProps> = ({ obras = [], height = '320px' }) => {
  const markers = useMemo(() => {
    return obras
      .map((obra) => {
        const coords = parseGpsCoords(obra.latitud, obra.longitud);
        if (!coords) return null;
        return { ...obra, coords, color: getEstadoColor(obra.estado) };
      })
      .filter(Boolean) as MarkerData[];
  }, [obras]);

  const boundsCoords = useMemo(
    () => markers.map((m) => m.coords),
    [markers],
  );

  const dense = markers.length > 120;
  const markerRadius = dense ? 5 : 7;
  const showTooltips = !dense;

  return (
    <div
      className="relative w-full rounded-xl shadow-soft-lg overflow-hidden bg-white"
      style={{ minHeight: height, height }}
    >
      <MapContainer
        center={RD_CENTER}
        zoom={RD_DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
        dragging={true}
        doubleClickZoom={true}
        preferCanvas={markers.length > 40}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInvalidateSize />
        {boundsCoords.length > 0 && <MapBounds coords={boundsCoords} />}
        {markers.map((obra) => (
          <ObraMarker
            key={obra.id}
            obra={obra}
            showTooltip={showTooltips}
            radius={markerRadius}
          />
        ))}
      </MapContainer>
      {markers.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white/85 text-gray-600 text-sm text-center px-4 z-[1000]"
          style={{ pointerEvents: 'none' }}
        >
          <span>
            No hay obras con coordenadas GPS válidas en el resultado filtrado.
          </span>
        </div>
      )}
      {dense && markers.length > 0 && (
        <div className="absolute bottom-2 left-2 z-[1000] rounded-lg bg-white/90 px-2 py-1 text-[10px] text-stone-500 shadow-soft">
          {markers.length} puntos — haz clic en un marcador para ver detalle
        </div>
      )}
    </div>
  );
};

export default ReporteObrasMap;
