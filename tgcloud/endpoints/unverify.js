// POST /api/unverify, chamado por Telegram.WebApp.Serverless.call('unverify', cb).
import { assertOwner, removeAll } from '../lib/verification.js';

export default async function (input, ctx) {
  assertOwner(ctx);
  return removeAll();
}
