// POST /api/verify, chamado por Telegram.WebApp.Serverless.call('verify', cb).
import { assertOwner, verifyAll } from '../lib/verification.js';

export default async function (input, ctx) {
  assertOwner(ctx);
  return verifyAll();
}
