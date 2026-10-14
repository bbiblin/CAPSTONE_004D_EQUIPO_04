import { memo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L, { Icon } from 'leaflet';
import 'leaflet.heat';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { useGeolocation } from '@/hooks/useGeolocation';
import LocationControls from './LocationControls';
import type { Incident } from '@/types';
import { INCIDENT_CATEGORIES, CENTER, INITIAL_ZOOM, MIN_ZOOM, MAX_ZOOM, MARKER_COLOR_ACCENT, MARKER_COLOR_PRIMARY, SEVERITY_MARKER_COLORS, HEATMAP_MAX_ZOOM } from '@/lib/constants';
import type { Bounds } from '@/lib/supabase';

interface MapViewProps {
  incidents?: Incident[];
  selectedIncident?: Incident | null;
  center?: [number, number];
  zoom?: number;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: [number, number] | null;
  interactive?: boolean;
  showLocationControls?: boolean;
  onIncidentClick?: (incident: Incident) => void;
  onBoundsChange?: (bounds: Bounds) => void;
}

const customIcon = (color: string) => new Icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36"><path fill="${color}" d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"/><circle fill="white" cx="12" cy="12" r="5"/></svg>`)}`,
  iconSize: [24, 36],
  popupAnchor: [0, -36],
});

function LocationSelector({ onLocationSelect, interactive }: { onLocationSelect?: (lat: number, lng: number) => void; interactive?: boolean }) {
  const map = useMapEvents({
    click(e) {
      if (interactive && onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function FocusController({ focus }: { focus?: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], focus.zoom ?? 16);
    }
  }, [focus, map]);

  return null;
}

function SelectedLocationMarker({ location }: { location: [number, number] | null }) {
  if (!location) return null;
  return (
    <Marker position={location} icon={customIcon(MARKER_COLOR_PRIMARY)}>
      <Popup>Ubicación seleccionada</Popup>
    </Marker>
  );
}

function IncidentPopupContent({ incident, onClick }: { incident: Incident; onClick?: (incident: Incident) => void }) {
  return (
    <div>
      <h3 className="font-bold text-sm">{INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}</h3>
      <p className="text-xs text-gray-600 mt-1">{incident.description.substring(0, 100)}{incident.description.length > 100 ? '...' : ''}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span>⚡ Severidad: {incident.severity}</span>
        <span>·</span>
        <span>👍 {incident.votes_up}</span>
        <span>·</span>
        <span>{new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
      </div>
      {incident.image_url && (
        <img src={incident.image_url} alt="Evidencia" className="mt-2 w-full h-32 object-cover rounded" />
      )}
      <button
        onClick={() => onClick?.(incident)}
        className="mt-2 w-full bg-blue-500 text-white text-xs py-1.5 rounded-lg hover:bg-blue-600 transition"
      >
        Ver detalle completo
      </button>
    </div>
  );
}

const IncidentPopupContentMemo = memo(IncidentPopupContent);

// Escucha `moveend`/`zoomend` y reporta el bounding box actual al padre.
function ViewportBoundsController({ onBoundsChange }: { onBoundsChange?: (bounds: Bounds) => void }) {
  const map = useMapEvents({});

  const emit = () => {
    if (!onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
    });
  };

  useEffect(() => {
    map.on('moveend', emit);
    map.on('zoomend', emit);
    emit();
    return () => {
      map.off('moveend', emit);
      map.off('zoomend', emit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBoundsChange]);

  return null;
}

// Puntos de calor derivados en cliente del estado actual (peso por severidad).
function toHeatPoints(incidents: Incident[]) {
  return incidents.map(i => [i.latitude, i.longitude, i.severity] as [number, number, number]);
}

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(points, { radius: 25, blur: 18, maxZoom: 17 });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [points, map]);

  return null;
}

function IncidentLayer({ incidents, onIncidentClick }: { incidents: Incident[]; onIncidentClick?: (incident: Incident) => void }) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(map.getZoom());

  useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => {
      map.off('zoomend', handler);
    };
  }, [map]);

  const visible = incidents.filter(i => !['rechazado', 'expirado'].includes(i.status));

  // A zoom bajo (país/región) usamos heatmap/agregados en vez de miles de markers.
  if (zoom <= HEATMAP_MAX_ZOOM) {
    return <HeatmapLayer points={toHeatPoints(visible)} />;
  }

  return (
    <MarkerClusterGroup maxClusterRadius={60} showCoverageOnHover={false} spiderfyOnMaxZoom>
      {visible.map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.latitude, incident.longitude]}
          icon={customIcon(SEVERITY_MARKER_COLORS[incident.severity] || MARKER_COLOR_ACCENT)}
        >
          <Popup maxWidth={300} className="incident-popup" autoPan={false}>
            <IncidentPopupContentMemo incident={incident} onClick={onIncidentClick} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}

const IncidentLayerMemo = memo(IncidentLayer);

function MapView({ incidents = [], selectedIncident, center, zoom, focus, onLocationSelect, selectedLocation, interactive, showLocationControls = true, onIncidentClick, onBoundsChange }: MapViewProps) {
  const mapCenter = center || CENTER;
  const mapZoom = zoom || INITIAL_ZOOM;

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    latitude,
    longitude,
    loading: gpsLoading,
    error: gpsError,
    watching,
    getCurrentPosition,
    startWatching,
    stopWatching,
  } = useGeolocation({ enableWatch: false });

  return (
    <div className="relative w-full h-full">
      <MapContainer center={mapCenter} zoom={mapZoom} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM} zoomControl={!isMobile} style={{ height: '100%', width: '100%' }}>
        <InvalidateOnResize />
        <FocusController focus={focus} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onLocationSelect && <LocationSelector onLocationSelect={onLocationSelect} interactive={interactive} />}
        {selectedLocation && <SelectedLocationMarker location={selectedLocation} />}
        {incidents.length > 0 && <IncidentLayerMemo incidents={incidents} onIncidentClick={onIncidentClick} />}
        {onBoundsChange && <ViewportBoundsController onBoundsChange={onBoundsChange} />}
        {showLocationControls && (
          <LocationControls
            latitude={latitude}
            longitude={longitude}
            accuracy={null}
            loading={gpsLoading}
            error={gpsError}
            watching={watching}
            onGetCurrentPosition={getCurrentPosition}
            onStartWatching={startWatching}
            onStopWatching={stopWatching}
          />
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;
