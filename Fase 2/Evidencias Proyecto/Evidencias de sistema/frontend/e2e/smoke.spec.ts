import { test, expect } from '@playwright/test';

/**
 * Smoke tests de lectura (seguros contra local o producción).
 * Verifican que la app carga y que las rutas públicas funcionan.
 *
 * Evidencia: al fallar, Playwright guarda captura en
 * `docs/evidencias/integracion/test-results/`.
 */

const NAV_TIMEOUT = 30_000;

// El despliegue en producción (Render) NO tiene fallback SPA: entrar directo a
// una sub-ruta (p.ej. /register) devuelve 404. Por eso las verificaciones de
// rutas se ejecutan contra el entorno LOCAL (donde Vite sirve el fallback).
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const isLocal = /localhost|127\.0\.0\.1/.test(baseURL);

test.describe('Smoke tests — carga y rutas públicas', () => {
  test('PI-01 | Carga inicial: el mapa y el layout se renderizan', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Layout principal con el mapa.
    await expect(page.getByRole('main')).toBeVisible({ timeout: NAV_TIMEOUT });
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: NAV_TIMEOUT });

    // Sin errores de JS en pantalla.
    expect(errors).toEqual([]);
  });

  test('PI-02 | El buscador de dirección está presente y acepta texto', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const search = page.getByPlaceholder('Buscar dirección...');
    await expect(search).toBeVisible({ timeout: NAV_TIMEOUT });
    await search.fill('Providencia');
    await expect(search).toHaveValue('Providencia');
    // (Las sugerencias dependen de la API externa de Nominatim; no se
    //  verifican aquí para no hacer el smoke dependiente de un servicio externo.)
  });

  test('PI-03 | /report sin sesión muestra aviso de inicio de sesión', async ({ page }) => {
    test.skip(!isLocal, 'Producción devuelve 404 en sub-rutas (sin fallback SPA); correr en local.');
    await page.goto('/report', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /inicia sesión para reportar/i }))
      .toBeVisible({ timeout: NAV_TIMEOUT });
  });

  test('PI-04 | Página de registro carga el formulario', async ({ page }) => {
    test.skip(!isLocal, 'Producción devuelve 404 en sub-rutas (sin fallback SPA); correr en local.');
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Nombre')).toBeVisible({ timeout: NAV_TIMEOUT });
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible();
  });

  test('PI-05 | /admin sin rol admin redirige a inicio', async ({ page }) => {
    test.skip(!isLocal, 'Producción devuelve 404 en sub-rutas (sin fallback SPA); correr en local.');
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    // Sin sesión de admin, se redirige al inicio ("/").
    await page.waitForURL(/\/$/, { timeout: 20_000 });
    await expect(page.getByRole('main')).toBeVisible({ timeout: NAV_TIMEOUT });
  });
});
