// Endpoint chamado pelo Mini App: Telegram.WebApp.Serverless.call('unverify', ...)
// Mesmas fontes de endpoints/verify.js (Serverless > Endpoints).
import { assertOwner, removeAll } from '../lib/verifier.js';

export default async function (input, ctx) {
  assertOwner(ctx);
  return removeAll();
}
