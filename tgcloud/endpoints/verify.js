// Endpoint chamado pelo Mini App: Telegram.WebApp.Serverless.call('verify', ...)
//  - assinatura (input, ctx) e ctx.initData já validado pela plataforma: Serverless > Endpoints
import { assertOwner, verifyAll } from '../lib/verifier.js';

export default async function (input, ctx) {
  assertOwner(ctx);
  return verifyAll();
}
