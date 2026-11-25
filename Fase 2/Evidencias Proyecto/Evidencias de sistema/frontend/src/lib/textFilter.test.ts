import { describe, it, expect } from 'vitest';
import { containsProfanity, sanitizeDescription } from './textFilter';

describe('containsProfanity', () => {
  it('detecta una mala palabra en español (listado propio)', () => {
    expect(containsProfanity('esto es una mierda')).toBe(true);
    expect(containsProfanity('que wea')).toBe(true);
  });

  it('detecta insensible a mayúsculas', () => {
    expect(containsProfanity('MIERDA')).toBe(true);
  });

  it('detecta insensible a tildes', () => {
    expect(containsProfanity('maricón')).toBe(true);
    expect(containsProfanity('maricon')).toBe(true);
  });

  it('detecta letras repetidas (obfuscación por pausa)', () => {
    expect(containsProfanity('que weaaa')).toBe(true);
  });

  it('detecta letras separadas por caracteres no alfabéticos', () => {
    expect(containsProfanity('m-i-e-r-d-a')).toBe(true);
    expect(containsProfanity('m i e r d a')).toBe(true);
    expect(containsProfanity('m/i/e/r/d/a')).toBe(true);
  });

  it('no genera falsos positivos por límites de palabra', () => {
    expect(containsProfanity('no tengo ganas')).toBe(false);
    expect(containsProfanity('algo monótono')).toBe(false);
  });

  it('una frase limpia no se marca', () => {
    expect(containsProfanity('la vereda está en mal estado')).toBe(false);
  });
});

describe('sanitizeDescription', () => {
  it('reemplaza la palabra ofensiva por *** y marca replaced', () => {
    const res = sanitizeDescription('esto es una mierda muy grande');
    expect(res.replaced).toBe(true);
    expect(res.text).toBe('esto es una *** muy grande');
  });

  it('no modifica el texto si no hay ofensas', () => {
    const res = sanitizeDescription('no hay ofensas aquí');
    expect(res.replaced).toBe(false);
    expect(res.text).toBe('no hay ofensas aquí');
  });

  it('reemplaza cada palabra ofensiva por ***', () => {
    const res = sanitizeDescription('que wea pinche maricon');
    expect(res.replaced).toBe(true);
    expect(res.text).toBe('que *** pinche ***');
  });
});
