import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { parseGpsCoords } from '../utils/mapUtils';
import { ensureLeafletIcons } from './map/leafletSetup';
import { MapInvalidateSize } from './map/MapInvalidateSize';

ensureLeafletIcons();

interface ObraMapProps {
  latitud: string | null | undefined;
  longitud: string | null | undefined;
  nombre?: string;
  height?: string;
}

const ObraMap: React.FC<ObraMapProps> = ({
  latitud,
  longitud,
  nombre = 'Ubicación de la obra',
  height = '400px',
}) => {
  const coords = parseGpsCoords(latitud, longitud);

  if (!coords) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-warm-50/80 shadow-soft"
        style={{ height }}
      >
        <p className="text-sm text-stone-500">
          No hay coordenadas GPS válidas para esta obra
        </p>
      </div>
    );
  }

  const [lat, lng] = coords;
  const center: [number, number] = [lat, lng];

  return (
    <div
      className="w-full rounded-xl shadow-soft-lg relative overflow-hidden"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        zoomControl={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        keyboard={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInvalidateSize center={center} zoom={15} />
        <Marker position={center}>
          <Popup>
            <div style={{ margin: 0, padding: 0 }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>{nombre}</strong>
              <span style={{ fontSize: '12px', color: '#666' }}>
                Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default ObraMap;
