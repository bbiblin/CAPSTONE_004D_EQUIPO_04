import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NOMINATIM_URL, NOMINATIM_LIMIT } from './constants';
import type { SearchResult } from '@/types';

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, displayName: string, termsAccepted: boolean, photoConsent: boolean, termsVersion: string) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        terms_accepted: termsAccepted,
        photo_consent: photoConsent,
        terms_version: termsVersion,
      },
    },
  });
}

export async function acceptTerms(termsVersion: string, acceptTerms: boolean, acceptPhoto: boolean) {
  return await supabase.rpc('accept_terms', {
    p_terms_version: termsVersion,
    p_accept_terms: acceptTerms,
    p_accept_photo: acceptPhoto,
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getProfile() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) return null;
  return data;
}

export async function getIncidents(filters?: { status?: string; category?: string; severity?: number; limit?: number; offset?: number }) {
  let query = supabase.from('incidents_public').select('*').order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.severity) query = query.eq('severity', filters.severity);
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);

  return await query;
}

export async function getAdminIncidents(filters?: { status?: string; category?: string; limit?: number }) {
  let query = supabase.from('incidents_with_stats').select('*').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.limit) query = query.limit(filters.limit);
  return await query;
}

export async function getIncidentById(id: string) {
  return await supabase.from('incidents_with_stats').select('*').eq('id', id).single();
}

export async function getPublicIncidentById(id: string) {
  return await supabase.from('incidents_public').select('*').eq('id', id).maybeSingle();
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export async function getIncidentsInBounds(
  bounds: Bounds,
  filters?: { category?: string | null; status?: string | null; limit?: number },
) {
  const limit = filters?.limit ?? 500;
  return await supabase.rpc('get_incidents_in_bounds', {
    p_min_lat: bounds.minLat,
    p_max_lat: bounds.maxLat,
    p_min_lng: bounds.minLng,
    p_max_lng: bounds.maxLng,
    p_category: filters?.category || null,
    p_status: filters?.status || null,
    p_limit: limit,
  });
}

export async function getIncidentActions(incidentId: string) {
  return await supabase.from('incident_votes').select('*').eq('incident_id', incidentId).order('created_at', { ascending: true });
}

export async function createIncident(incident: {
  category: string;
  description: string;
  severity: number;
  observed_at: string;
  estimated_duration: string;
  latitude: number;
  longitude: number;
  image?: File;
  created_by: string;
  place_name?: string | null;
  address?: string | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  comuna?: string | null;
  neighbourhood?: string | null;
  street?: string | null;
  house_number?: string | null;
}) {
  const session = await getSession();
  const userId = incident.created_by || session?.user?.id;

  if (!userId) {
    return { data: null, error: new Error('Usuario no autenticado') };
  }

  let imageUrl: string | null = null;
  if (incident.image) {
    const fileName = `${userId}/${Date.now()}-${incident.image.name}`;
    const { error: uploadError } = await supabase.storage.from('incident-photos').upload(fileName, incident.image);
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
    } else {
      const { data: { publicUrl } } = supabase.storage.from('incident-photos').getPublicUrl(fileName);
      imageUrl = publicUrl;
    }
  }

  const { data: incidentData, error: insertError } = await supabase
    .from('incidents')
    .insert({
      category: incident.category,
      description: incident.description,
      severity: incident.severity,
      observed_at: incident.observed_at,
      estimated_duration: incident.estimated_duration,
      latitude: incident.latitude,
      longitude: incident.longitude,
      image_url: imageUrl,
      place_name: incident.place_name || null,
      address: incident.address || null,
      country: incident.country || null,
      region: incident.region || null,
      province: incident.province || null,
      comuna: incident.comuna || null,
      neighbourhood: incident.neighbourhood || null,
      street: incident.street || null,
      house_number: incident.house_number || null,
      status: 'nuevo',
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) return { data: null, error: insertError };
  return { data: incidentData, error: null };
}

export async function updateIncidentStatus(id: string, status: string, resolvedBy?: string) {
  return await supabase
    .from('incidents')
    .update({
      status,
      resolved_at: status === 'resuelto' ? new Date().toISOString() : null,
      resolved_by: resolvedBy || null,
    })
    .eq('id', id);
}

export type VoteType = 'up' | 'down' | 'resuelta';

export async function voteOnIncident(incidentId: string, voteType: VoteType) {
  const session = await getSession();
  if (!session) return { data: null, error: new Error('No autenticado') };

  const userId = session.user.id;

  const { data: existing } = await supabase
    .from('incident_votes')
    .select('id, vote_type')
    .eq('incident_id', incidentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from('incident_votes')
      .insert({ incident_id: incidentId, user_id: userId, vote_type: voteType });
    if (error) return { data: null, error };
  } else if (existing.vote_type !== voteType) {
    const { error } = await supabase
      .from('incident_votes')
      .update({ vote_type: voteType, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { data: null, error };
  }

  const { data, error } = await supabase
    .from('incidents_with_stats')
    .select('*')
    .eq('id', incidentId)
    .single();

  return { data, error };
}

export async function getMyVote(incidentId: string) {
  const session = await getSession();
  if (!session) return { data: null, error: new Error('No autenticado') };

  return await supabase
    .from('incident_votes')
    .select('vote_type')
    .eq('incident_id', incidentId)
    .eq('user_id', session.user.id)
    .maybeSingle();
}

export async function reportIncident(incidentId: string, reason?: string) {
  const session = await getSession();
  if (!session) return { data: null, error: new Error('No autenticado') };

  const userId = session.user.id;

  const { error } = await supabase
    .from('incident_reports')
    .insert({
      incident_id: incidentId,
      reported_by: userId,
      reason: reason || null,
      status: 'pendiente',
    });

  if (error && error.code === '23505') {
    return { data: null, error: null };
  }

  return { data: null, error };
}

export async function getReportedIncidents() {
  return await supabase
    .from('incident_reports')
    .select('*, incidents(*), reporter:profiles(*)')
    .order('created_at', { ascending: false });
}

export async function updateReportStatus(id: string, status: 'resuelto' | 'rechazado') {
  return await supabase
    .from('incident_reports')
    .update({ status })
    .eq('id', id);
}

export async function getHeatmapData() {
  return await supabase.rpc('get_heatmap_data');
}

export async function findNearbyIncidents(lat: number, lng: number, category?: string, radiusM = 50) {
  return await supabase.rpc('find_nearby_incidents', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_category: category || null,
  });
}

// Jerarquía administrativa local de Chile. Nominatim la expone en el objeto
// `address` (con addressdetails=1) con este mapeo:
//   * estado (state)         -> region
//   * condado (county)       -> province
//   * city / town / village / municipality -> comuna
//   * suburb / neighbourhood / quarter     -> neighbourhood (barrio)
//   * road                   -> street
//   * house_number           -> house_number
//   * country                -> country
function pickAddress(address: any, keys: string[]): string | null {
  if (!address) return null;
  for (const key of keys) {
    const value = address[key];
    if (value && typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

// Búsqueda de lugares restringida a Chile.
// Filtra en la URL con `countrycodes=cl` y refuerza con `country_code` del
// resultado `address` (evita que se cuelen puntos de frontera de otros países).
export async function searchPlaces(query: string): Promise<SearchResult[]> {
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=${NOMINATIM_LIMIT}&countrycodes=cl&addressdetails=1&accept-language=es`;
    const res = await fetch(url);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter((item: any) => {
      const cc = item?.address?.country_code;
      return !cc || cc.toLowerCase() === 'cl';
    });
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{
  place_name: string | null;
  address: string | null;
  country: string | null;
  region: string | null;
  province: string | null;
  comuna: string | null;
  neighbourhood: string | null;
  street: string | null;
  house_number: string | null;
}> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url);
    const data = await res.json();
    const addr = data?.address || null;
    const address = data?.display_name || null;
    const place_name =
      data?.address?.amenity ||
      data?.address?.building ||
      data?.address?.road ||
      data?.name ||
      address;
    return {
      place_name: place_name || null,
      address,
      country: pickAddress(addr, ['country']),
      region: pickAddress(addr, ['state']),
      province: pickAddress(addr, ['county']),
      comuna: pickAddress(addr, ['city', 'town', 'village', 'municipality']),
      neighbourhood: pickAddress(addr, ['suburb', 'neighbourhood', 'quarter', 'hamlet']),
      street: pickAddress(addr, ['road']),
      house_number: pickAddress(addr, ['house_number']),
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return { place_name: null, address: null, country: null, region: null, province: null, comuna: null, neighbourhood: null, street: null, house_number: null };
  }
}

export async function getUserIncidents(userId: string) {
  return await supabase
    .from('incidents_with_stats')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
}

export async function getUserActions(userId: string) {
  return await supabase
    .from('incident_votes')
    .select('*, incidents(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}
