import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de pruebas end-to-end / integración de Movimap.
 *
 * Ubicación: `frontend/playwright.config.ts` — ejecutar con:
 *   cd frontend && npx playwright test
 *
 * Requiere variables de entorno (o definirlas en el shell / CI):
 *   E2E_BASE_URL      -> URL bajo prueba. Por defecto usa el entorno LOCAL (dev).
 *   E2E_ADMIN_EMAIL   -> usuario admin del seed (admin@movimap.cl)
 *   E2E_ADMIN_PASSWORD
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD -> usuario común (escenarios que crean datos)
 *   E2E_ALLOW_WRITE=true -> habilita tests que crean datos (solo local)
 *
 * Sugerencia de URL:
 *   - Local (dev):  http://localhost:5173  (default)
 *   - Producción:   https://movimap-sprints.onrender.com  (solo smoke tests de lectura)
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    // Evidencias en el repo (carpeta compartida de evidencias).
    ['html', { outputFolder: '../docs/evidencias/integracion/playwright-report', open: 'never' }],
    ['json', { outputFile: '../docs/evidencias/integracion/playwright-report.json' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Evidencias: capturas/traces de fallos van a la carpeta compartida.
  outputDir: '../docs/evidencias/integracion/test-results',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Vista móvil para validar flujos responsivos (igual que el plan base).
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  // Levanta el servidor de dev automáticamente si E2E_BASE_URL apunta a localhost.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
