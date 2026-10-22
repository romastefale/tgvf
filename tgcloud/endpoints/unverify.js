// Endpoint chamado pelo Mini App: Telegram.WebApp.Serverless.call('unverify', ...)
// Mesmas fontes de endpoints/verify.js (Serverless > Endpoints).
import { EndpointError } from 'sdk';
import { OWNER_ID, removeAll } from '../lib/verifier.js';

export default async function (input, ctx) {
  if (ctx.initData.user.id !== OWNER_ID) throw new EndpointError('Acesso negado');
  return removeAll();
}
