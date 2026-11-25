import { describe, it, expect } from 'vitest';
import { isAcceptedImageType, processImage, MAX_INPUT_SIZE_BYTES } from './imageCompression';
import { PHOTO_MAX_SIZE_BYTES } from './constants';

function makeFile(name: string, type: string, size: number): File {
  const arr = new ArrayBuffer(Math.max(size, 1));
  const bytes = new Uint8Array(arr);
  bytes[0] = 0xff;
  return new File([bytes], name, { type });
}

describe('isAcceptedImageType', () => {
  it('acepta JPG, PNG y WebP', () => {
    expect(isAcceptedImageType(makeFile('a.jpg', 'image/jpeg', 1))).toBe(true);
    expect(isAcceptedImageType(makeFile('a.png', 'image/png', 1))).toBe(true);
    expect(isAcceptedImageType(makeFile('a.webp', 'image/webp', 1))).toBe(true);
  });

  it('rechaza otros tipos', () => {
    expect(isAcceptedImageType(makeFile('a.gif', 'image/gif', 1))).toBe(false);
    expect(isAcceptedImageType(makeFile('a.bmp', 'image/bmp', 1))).toBe(false);
    expect(isAcceptedImageType(makeFile('a.pdf', 'application/pdf', 1))).toBe(false);
  });
});

describe('processImage (validación sin pasar por canvas)', () => {
  it('rechaza un tipo no permitido', async () => {
    const res = await processImage(makeFile('a.gif', 'image/gif', 100));
    expect(res.file).toBeNull();
    expect(res.error).toContain('JPG, PNG o WebP');
  });

  it('rechaza un archivo que excede 30MB', async () => {
    const res = await processImage(makeFile('a.jpg', 'image/jpeg', MAX_INPUT_SIZE_BYTES + 1));
    expect(res.file).toBeNull();
    expect(res.error).toContain('30MB');
  });

  it('devuelve el archivo tal cual si ya es menor a 2MB (sin comprimir)', async () => {
    const f = makeFile('a.jpg', 'image/jpeg', PHOTO_MAX_SIZE_BYTES);
    const res = await processImage(f);
    expect(res.error).toBeNull();
    expect(res.file).toBe(f);
  });
});
