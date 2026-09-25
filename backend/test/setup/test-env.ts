// Variables de los tests e2e. Solo valores de prueba: nunca poner secretos reales.
// La base es el servicio db-test de docker-compose.yml.
export const testEnv = {
  DATABASE_URL: 'postgresql://user:password@localhost:5433/neopass_test',
  JWT_SECRET: 'test-jwt-secret',
  FRONTEND_URL: 'https://app.neopass.test',
  BACKEND_URL: 'http://localhost:3001',
  MERCADOPAGO_ACCESS_TOKEN: 'TEST-platform-access-token',
  MERCADOPAGO_CLIENT_ID: 'test-client-id',
  MERCADOPAGO_CLIENT_SECRET: 'test-client-secret',
  RESEND_API_KEY: 're_test_key',
  TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
  CLOUDINARY_URL: 'cloudinary://test_api_key:test_api_secret@test-cloud',
};
