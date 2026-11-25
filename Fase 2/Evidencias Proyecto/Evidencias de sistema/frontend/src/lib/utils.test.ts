import { describe, it, expect } from 'vitest';
import {
  computeScore,
  confirmationCount,
  getCategoryLabel,
  getSeverityLabel,
  getDurationLabel,
  hasAcceptedTerms,
  hasPhotoConsent,
} from './utils';

describe('computeScore', () => {
  it('resta los rechazos a las confirmaciones', () => {
    expect(computeScore(5, 2)).toBe(3);
    expect(computeScore(0, 0)).toBe(0);
  });

  it('puede ser negativo', () => {
    expect(computeScore(1, 4)).toBe(-3);
  });
});

describe('confirmationCount', () => {
  it('devuelve la cantidad de votos up', () => {
    expect(confirmationCount(7)).toBe(7);
    expect(confirmationCount(0)).toBe(0);
  });
});

describe('getCategoryLabel', () => {
  it('devuelve la etiqueta de una categoría conocida', () => {
    expect(getCategoryLabel('vereda_cortada')).toBeTruthy();
  });

  it('deja el valor tal cual si la categoría no existe', () => {
    expect(getCategoryLabel('otro' as never)).toBeTruthy();
  });
});

describe('getSeverityLabel', () => {
  it('devuelve la etiqueta de una severidad válida', () => {
    expect(getSeverityLabel(1)).toBeTruthy();
    expect(getSeverityLabel(3)).toBeTruthy();
  });

  it('fallback a número si no existe', () => {
    expect(getSeverityLabel(9)).toBe('9');
  });
});

describe('getDurationLabel', () => {
  it('devuelve la etiqueta de una duración válida', () => {
    expect(getDurationLabel('temporal')).toBeTruthy();
    expect(getDurationLabel('permanente')).toBeTruthy();
  });

  it('fallback a la cadena si no existe', () => {
    expect(getDurationLabel('desconocido')).toBe('desconocido');
  });
});

describe('consentimiento de términos y fotos', () => {
  it('hasAcceptedTerms es true solo si hay accepted_terms_at', () => {
    expect(hasAcceptedTerms({ accepted_terms_at: '2026-01-01' })).toBe(true);
    expect(hasAcceptedTerms({ accepted_terms_at: null })).toBe(false);
    expect(hasAcceptedTerms(null)).toBe(false);
    expect(hasAcceptedTerms(undefined)).toBe(false);
  });

  it('hasPhotoConsent es true solo si hay accepted_photo_consent_at', () => {
    expect(hasPhotoConsent({ accepted_photo_consent_at: '2026-01-01' })).toBe(true);
    expect(hasPhotoConsent({ accepted_photo_consent_at: null })).toBe(false);
    expect(hasPhotoConsent(null)).toBe(false);
  });
});
