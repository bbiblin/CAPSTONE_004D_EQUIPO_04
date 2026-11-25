import { memo, useState, useEffect, useCallback } from 'react';
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
import { getIncidentHeatCells, type HeatCell } from '@/lib/supabase';

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
  since?: string | null;
  category?: string | null;
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
      <p className="text-xs text-on-surface-variant mt-1">{incident.description.substring(0, 100)}{incident.description.length > 100 ? '...' : ''}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-on-surface-variant">
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
        className="mt-2 w-full min-h-11 bg-primary text-on-primary text-sm py-2 rounded-lg hover:opacity-90 transition"
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

// Tamaño de celda de la grilla (en grados) de modo que las celdas se vean
// de tamaño similar en pantalla a distintos zooms de país/región. Celdas un
// poco más finas para que el calor quede más pegado a las zonas con reportes.
function cellDegForZoom(zoom: number) {
  return 0.007 * Math.pow(2, HEATMAP_MAX_ZOOM - zoom);
}

// Heatmap de DENSIDAD REAL servida por el backend: una fila por celda
// agregada. Usamos `leaflet.heat` (suave) con:
//   * peso por CONTEO de reportes (fiel a la densidad), con escala
//     logarítmica para que los colores no saturen en rojo sobre áreas
//     muy pobladas;
//   * un degradado suave (cyan → verde → amarillo → naranja, sin rojo
//     fuerte) y radio estable, para que no tapan el mapa;
//   * margen (padding) en el fetch, de modo que el heatmap ya está
//     pintado alrededor del viewport y al zoomear no aparecen círculos
//     transitorios mientras cargan las celdas del nuevo viewport.
function HeatmapGridLayer({ since, category }: { since?: string | null; category?: string | null }) {
  const map = useMap();
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [cellDeg, setCellDeg] = useState(0.01);

  const fetchCells = useCallback(async () => {
    const b = map.getBounds();
    const latPad = (b.getNorth() - b.getSouth()) * 0.6;
    const lngPad = (b.getEast() - b.getWest()) * 0.6;
    const bounds: Bounds = {
      minLat: b.getSouth() - latPad,
      maxLat: b.getNorth() + latPad,
      minLng: b.getWest() - lngPad,
      maxLng: b.getEast() + lngPad,
    };
    const deg = cellDegForZoom(map.getZoom());
    setCellDeg(deg);
    const { data } = await getIncidentHeatCells(bounds, { since, cellDeg: deg, category });
    setCells(data);
  }, [map, since, category]);

  useEffect(() => {
    fetchCells();
    map.on('moveend', fetchCells);
    map.on('zoomend', fetchCells);
    return () => {
      map.off('moveend', fetchCells);
      map.off('zoomend', fetchCells);
    };
  }, [fetchCells, map]);

  useEffect(() => {
    if (cells.length === 0) return;
    const z = map.getZoom();
    const pxPerDeg = Math.pow(2, z) * 256 / 360;
    // Radio contenido: menos esparcido (más pegado a las zonas con reportes),
    // pero lo bastante grande para que las celdas se mezclen suavemente y no
    // se aprecien círculos separados.
    const spacingPx = Math.min(cellDeg * pxPerDeg, 34);
    const radius = spacingPx * 0.6;
    const blur = Math.max(radius * 0.5, 5);
    const points = cells.map(c => [c.cell_lat, c.cell_lng, Math.sqrt(Number(c.count))] as [number, number, number]);
    const layer = L.heatLayer(points, {
      radius,
      blur,
      maxZoom: 17,
      minOpacity: 0.16,
      gradient: {
        0.2: '#2b83ba',
        0.4: '#7fc7a0',
        0.6: '#f9e848',
        0.8: '#f9b84f',
        1: '#ef7b4f',
      },
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [cells, cellDeg, map]);

  return null;
}

function IncidentLayer({ incidents, onIncidentClick, since, category }: { incidents: Incident[]; onIncidentClick?: (incident: Incident) => void; since?: string | null; category?: string | null }) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(map.getZoom());

  useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => {
      map.off('zoomend', handler);
    };
  }, [map]);

  // A zoom bajo (país/región) usamos agregados del servidor (densidad real)
  // en vez de pintar miles de markers.
  if (zoom <= HEATMAP_MAX_ZOOM) {
    return <HeatmapGridLayer since={since} category={category} />;
  }

  return (
    <MarkerClusterGroup maxClusterRadius={60} showCoverageOnHover={false} spiderfyOnMaxZoom>
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.latitude, incident.longitude]}
          icon={customIcon(SEVERITY_MARKER_COLORS[incident.severity] || MARKER_COLOR_ACCENT)}
        >
          <Popup maxWidth={300} className="incident-popup">
            <IncidentPopupContentMemo incident={incident} onClick={onIncidentClick} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}

const IncidentLayerMemo = memo(IncidentLayer);

function MapView({ incidents = [], selectedIncident, center, zoom, focus, onLocationSelect, selectedLocation, interactive, showLocationControls = true, onIncidentClick, onBoundsChange, since, category }: MapViewProps) {
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
        <IncidentLayerMemo incidents={incidents} onIncidentClick={onIncidentClick} since={since} category={category} />
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
