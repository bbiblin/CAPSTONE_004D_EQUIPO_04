import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, DURATION_OPTIONS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS } from './constants';
import type { IncidentCategory } from '@/types';

export { CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS };

export function getCategoryLabel(category: IncidentCategory): string {
  return INCIDENT_CATEGORIES.find(c => c.value === category)?.label || category;
}

export function getSeverityLabel(severity: number): string {
  return SEVERITY_LEVELS.find(s => s.value === severity)?.label || String(severity);
}

export function getDurationLabel(duration: string): string {
  return DURATION_OPTIONS.find(d => d.value === duration)?.label || duration;
}

// Score (veracidad) = confirmaciones (up) − rechazos (down).
// Se calcula en el frontend; el backend sólo entrega conteos.
export function computeScore(votes_up: number, votes_down: number): number {
  return votes_up - votes_down;
}

// Confirmaciones = cantidad de votos "up" de la incidencia.
export function confirmationCount(votes_up: number): number {
  return votes_up;
}

// El usuario (si está autenticado) ha aceptado los Términos y Condiciones.
export function hasAcceptedTerms(profile?: { accepted_terms_at?: string | null } | null): boolean {
  return !!profile && !!profile.accepted_terms_at;
}

// El usuario ha consentido la cesión/publicación de fotografías.
export function hasPhotoConsent(profile?: { accepted_photo_consent_at?: string | null } | null): boolean {
  return !!profile && !!profile.accepted_photo_consent_at;
}
