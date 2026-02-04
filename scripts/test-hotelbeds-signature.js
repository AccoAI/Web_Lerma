/**
 * Script local para probar la firma X-Signature de Hotelbeds.
 * Ejecutar: node scripts/test-hotelbeds-signature.js
 *
 * Usa las variables de entorno API_Key y API_Secret, o pásalas:
 * API_Key=xxx API_Secret=yyy node scripts/test-hotelbeds-signature.js
 */
import { createHash } from 'crypto';

const apiKey = process.env.API_Key || process.env.HOTELBEDS_API_KEY || '';
const secret = process.env.API_Secret || process.env.HOTELBEDS_API_SECRET || '';

if (!apiKey || !secret) {
  console.log('Uso: API_Key=tu_key API_Secret=tu_secret node scripts/test-hotelbeds-signature.js');
  process.exit(1);
}

const ts = Math.floor(Date.now() / 1000);
const str = apiKey + secret + ts;
const signature = createHash('sha256').update(str, 'utf8').digest('hex');

console.log('Timestamp (segundos):', ts);
console.log('String a hashear:', apiKey + '***' + secret + ts);
console.log('X-Signature:', signature);
console.log('');
console.log('Prueba con curl:');
console.log(`curl -X GET "https://api.test.hotelbeds.com/hotel-api/1.0/status" \\`);
console.log(`  -H "Accept: application/json" \\`);
console.log(`  -H "Api-key: ${apiKey}" \\`);
console.log(`  -H "X-Signature: ${signature}"`);
console.log('');
console.log('(El endpoint /status es GET sin body - para probar auth)');
