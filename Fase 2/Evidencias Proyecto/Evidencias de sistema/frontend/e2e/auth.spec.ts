import { test, expect } from '@playwright/test';

/**
 * Flujos de autenticación (integración con Supabase Auth).
 * Requieren credenciales de prueba en variables de entorno:
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_USER_EMAIL  / E2E_USER_PASSWORD
 *
 * Si no están definidas, los tests se SKIP (no fallan el suite).
 */

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;

test.describe('Autenticación', () => {
  test.skip(!adminEmail || !adminPassword, 'Faltan credenciales E2E (E2E_ADMIN_EMAIL/PASSWORD)');

  test('PI-06 | Login con credenciales válidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/correo|email/i).fill(adminEmail!);
    await page.getByLabel(/contraseña/i).fill(adminPassword!);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Tras el login se vuelve al inicio con el mapa visible.
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });
  });

  test('PI-07 | Login con credenciales inválidas muestra error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/correo|email/i).fill('nadie@movimap.cl');
    await page.getByLabel(/contraseña/i).fill('clave-incorrecta');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page.getByText(/invalid login credentials|credenciales|error/i).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('PI-08 | Cierre de sesión', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/correo|email/i).fill(adminEmail!);
    await page.getByLabel(/contraseña/i).fill(adminPassword!);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });

    // Cerrar sesión (varía según dispositivo: menú lateral u opción superior).
    await page.getByRole('button', { name: /cerrar sesión|salir/i }).first().click();
    // Tras salir, el botón de "Iniciar sesión" vuelve a estar visible.
    await expect(page.getByRole('link', { name: /iniciar sesi[óo]n/i }).filter({ visible: true }).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('PI-09 | Admin accede al panel de administración', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/correo|email/i).fill(adminEmail!);
    await page.getByLabel(/contraseña/i).fill(adminPassword!);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });

    await page.goto('/admin');
    // El panel admin debe mostrarse (título o tabla de reportes/denuncias).
    await expect(page.getByText(/administración|panel|reportes|denuncias/i).first())
      .toBeVisible({ timeout: 20_000 });
  });

  test('PI-10 | Baja y restauración de reporte (admin)', async ({ page }) => {
    test.skip(!userEmail, 'Requerido para tener reportes en el entorno de prueba');
    await page.goto('/login');
    await page.getByLabel(/correo|email/i).fill(adminEmail!);
    await page.getByLabel(/contraseña/i).fill(adminPassword!);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });

    await page.goto('/admin');
    // La lista de reportes usa tarjetas (div), no una tabla. Elijo una incidencia
    // ACTIVA (no oculta) para poder dar de baja. Uso `has` con texto exacto para no
    // confundirla con los estados "Inactivo (...)".
    const card = page.locator('div.rounded-lg.p-3.cursor-pointer')
      .filter({ has: page.getByText('Activo', { exact: true }) }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.click();

    // "Dar de baja" usa un window.prompt nativo: lo acepto con un motivo.
    page.once('dialog', d => d.accept('Baja E2E de prueba'));
    await page.getByRole('button', { name: /dar de baja/i }).first().click();
    await expect(page.getByText(/dada de baja/i).first()).toBeVisible({ timeout: 10_000 });

    // Tras la baja, el detalle muestra "Restaurar".
    const restaurar = page.getByRole('button', { name: /restaurar/i }).first();
    await expect(restaurar).toBeVisible({ timeout: 10_000 });
    await restaurar.click();
    await expect(page.getByText(/restaurad|reactivad|visible/i).first())
      .toBeVisible({ timeout: 10_000 });
  });
});
