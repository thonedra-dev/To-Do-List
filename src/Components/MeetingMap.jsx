import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// react-leaflet's default marker icon breaks under bundlers (Vite/webpack)
// because the image paths it references internally don't resolve. Standard
// fix: clear the broken defaults and point at CDN-hosted marker images.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Small embedded map for a meeting's resolved venue. Only rendered when
 * both lat/lng are present (see MeetingCard's hasMapPin gate) — this
 * component assumes valid coordinates and doesn't do its own null checks.
 */
export default function MeetingMap({ lat, lng, label }) {
  const position = [lat, lng];

  return (
    <div
      className="meeting-map-wrap"
      style={{
        marginTop: 10,
        width: '100%',
        aspectRatio: '16 / 9',
        maxHeight: 320,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          {label && <Popup>{label}</Popup>}
        </Marker>
      </MapContainer>
    </div>
  );
}