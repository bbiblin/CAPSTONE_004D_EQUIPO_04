import { useCallback, useEffect, useRef } from 'react';
import { getIncidentsInBounds, type Bounds } from '@/lib/supabase';
import type { Incident } from '@/types';

interface ZoneCacheOptions {
  since?: string | null;
  limit?: number;
  cellDeg?: number;
  maxCells?: number;
  category?: string | null;
}

interface Cell {
  key: string;
  bounds: Bounds;
}

const ALL = 'all';

function norm(v: string | null | undefined) {
  return v || ALL;
}

function cellKey(latIndex: number, lngIndex: number, category: string | null | undefined) {
  return `${latIndex}:${lngIndex}:${norm(category)}`;
}

// Caché por zona (grilla de celdas + FIFO/LRU) para la carga por viewport.
// Al mover/zoomear se piden SOLO las celdas que faltan; las ya visitadas se
// sirven del caché, evitando re-consultar la base al volver a una zona vista.
export function useZoneCache({ since, limit = 500, cellDeg = 0.04, maxCells = 40, category }: ZoneCacheOptions) {
  const cache = useRef<Map<string, Incident[]>>(new Map());
  const order = useRef<string[]>([]);
  const opts = useRef<ZoneCacheOptions>({ since, limit, cellDeg, maxCells, category });
  opts.current = { since, limit, cellDeg, maxCells, category };

  // Si cambia el rango temporal o algún filtro se descarta el caché (los datos
  // de otro período/filtro no son válidos).
  useEffect(() => {
    cache.current = new Map();
    order.current = [];
  }, [since, category]);

  const evict = useCallback(() => {
    const c = cache.current;
    const max = opts.current.maxCells ?? 40;
    while (c.size > max) {
      const oldest = order.current.shift();
      if (oldest == null) break;
      c.delete(oldest);
    }
  }, []);

  const getCellsFor = useCallback((bounds: Bounds): Cell[] => {
    const deg = opts.current.cellDeg ?? 0.04;
    const { category } = opts.current;
    const cells: Cell[] = [];
    const latStart = Math.floor(bounds.minLat / deg);
    const latEnd = Math.floor(bounds.maxLat / deg);
    const lngStart = Math.floor(bounds.minLng / deg);
    const lngEnd = Math.floor(bounds.maxLng / deg);
    for (let li = latStart; li <= latEnd; li++) {
      for (let lj = lngStart; lj <= lngEnd; lj++) {
        cells.push({
          key: cellKey(li, lj, category),
          bounds: {
            minLat: li * deg,
            maxLat: (li + 1) * deg,
            minLng: lj * deg,
            maxLng: (lj + 1) * deg,
          },
        });
      }
    }
    return cells;
  }, []);

  // Devuelve las incidencias del viewport, pidiendo solo las celdas que faltan.
  const getIncidents = useCallback(async (bounds: Bounds): Promise<Incident[]> => {
    const c = cache.current;
    const { since: sinceNow, limit: lim, category } = opts.current;
    const cells = getCellsFor(bounds);
    const missing = cells.filter(cell => !c.has(cell.key));

    await Promise.all(missing.map(async (cell) => {
      const { data, error } = await getIncidentsInBounds(cell.bounds, {
        since: sinceNow,
        limit: lim,
        category,
      });
      // No cachear celdas que fallaron, para reintentarlas en el próximo pan.
      if (error) return;
      const items = (data as Incident[] | null) ?? [];
      c.set(cell.key, items);
      order.current.push(cell.key);
    }));
    evict();

    const seen = new Set<string>();
    const out: Incident[] = [];
    for (const cell of cells) {
      const items = c.get(cell.key) ?? [];
      for (const item of items) {
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);
        if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) continue;
        if (sinceNow && new Date(item.created_at).getTime() < new Date(sinceNow).getTime()) continue;
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
      }
    }
    out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return out.slice(0, lim);
  }, [getCellsFor, evict]);

  // Invalida una incidencia específica (UPDATE/DELETE) para re-consultar luego.
  const invalidate = useCallback((id: string) => {
    for (const [key, items] of cache.current) {
      const filtered = items.filter(i => i.id !== id);
      if (filtered.length !== items.length) cache.current.set(key, filtered);
    }
  }, []);

  // Invalida la celda que contiene un punto (INSERT) para refrescarla luego.
  const invalidatePoint = useCallback((lat: number, lng: number) => {
    const deg = opts.current.cellDeg ?? 0.04;
    const { category } = opts.current;
    const key = cellKey(Math.floor(lat / deg), Math.floor(lng / deg), category);
    cache.current.delete(key);
    const idx = order.current.indexOf(key);
    if (idx >= 0) order.current.splice(idx, 1);
  }, []);

  return { getIncidents, invalidate, invalidatePoint };
}
