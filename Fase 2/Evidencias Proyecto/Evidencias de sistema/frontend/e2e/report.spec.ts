import { test, expect, type Page } from '@playwright/test';

/**
 * Flujo de creación de reporte y votación (ESCENARIOS QUE CREAN DATOS).
 * Solo deben ejecutarse contra un entorno LOCAL / de pruebas (nunca producción)
 * y con la variable E2E_ALLOW_WRITE=true.
 *
 * Requiere:
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD (usuario con términos aceptados)
 *   E2E_BASE_URL apuntando al entorno local (default http://localhost:5173)
 */

const allowWrite = process.env.E2E_ALLOW_WRITE === 'true';
const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;

// ID de una incidencia demo del seed (estable en el proyecto). Se usa para el
// flujo de votación, evitando depender de la interacción con markers del mapa.
const DEMO_INCIDENT_ID = process.env.E2E_INCIDENT_ID || '0008b886-e19c-42ce-8c70-cdf33e12471e';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });
}

// Si aparece el gate de términos (usuario sin consentimiento), lo acepta.
async function acceptTermsIfNeeded(page: Page) {
  const acceptNow = page.getByRole('button', { name: /aceptar ahora/i });
  const visible = await acceptNow.isVisible().catch(() => false);
  if (!visible) return;
  await acceptNow.click();
  // Tres consentimientos: términos, política de privacidad y fotografías.
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('checkbox').nth(2).check();
  await page.getByRole('button', { name: /aceptar y continuar/i }).click();
  await expect(acceptNow).toBeHidden({ timeout: 10_000 });
}

test.describe('Reporte de incidencia (solo entorno local)', () => {
  test.skip(!allowWrite || !userEmail || !userPassword,
    'Requiere E2E_ALLOW_WRITE=true y credenciales de usuario en un entorno local');

  test('PI-11 | Crear reporte sin foto', async ({ page }) => {
    await login(page, userEmail!, userPassword!);

    await page.goto('/report');
    await expect(page.getByText(/nuevo reporte/i).first()).toBeVisible({ timeout: 15_000 });
    await acceptTermsIfNeeded(page);

    // Categoría (valor del seed: rampa_inexistente).
    await page.getByLabel(/categoría/i).selectOption('rampa_inexistente');
    // Descripción.
    await page.getByLabel(/descripción/i).fill('Prueba E2E: rampa inexistente en la vereda.');
    // Severidad = Moderado (botón, no combobox).
    await page.getByRole('button', { name: /moderado/i }).click();
    // Fecha de observación (hoy).
    await page.getByLabel(/fecha de observación/i).fill(new Date().toISOString().split('T')[0]);
    // Duración estimada: temporal.
    await page.getByLabel(/duración estimada/i).selectOption('temporal');
    // Seleccionar punto en el mapa interactivo visible (panel derecho en desktop).
    await page.locator('.leaflet-container:visible').click({ position: { x: 250, y: 180 } });

    // Enviar.
    await page.getByRole('button', { name: /enviar reporte/i }).click();
    await expect(page.getByText(/reporte creado exitosamente/i).first())
      .toBeVisible({ timeout: 20_000 });
  });

  test('PI-12 | Votar y cambiar voto sobre un reporte', async ({ page }) => {
    await login(page, userEmail!, userPassword!);

    // Ir al detalle de una incidencia demo estable.
    await page.goto(`/incident/${DEMO_INCIDENT_ID}`);
    await expect(page.getByText(/apoyar esta incidencia/i).first()).toBeVisible({ timeout: 20_000 });
    await acceptTermsIfNeeded(page);

    // Votar "Confirmar".
    const confirmar = page.getByRole('button', { name: /confirmar \(/i });
    await expect(confirmar).toBeVisible({ timeout: 15_000 });
    await confirmar.click();
    await expect(page.getByText(/confirmado/i).first()).toBeVisible({ timeout: 10_000 });

    // Cambiar voto a "Rechazar".
    const rechazar = page.getByRole('button', { name: /rechazar \(/i });
    await rechazar.click();
    await expect(page.getByText(/rechazado/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
