// Endpoint chamado pelo Mini App: Telegram.WebApp.Serverless.call('verify', ...)
//  - assinatura (input, ctx) e ctx.initData já validado pela plataforma: Serverless > Endpoints
//  - EndpointError recusa a chamada com uma mensagem que o Mini App pode mostrar
import { EndpointError } from 'sdk';
import { OWNER_ID, verifyAll } from '../lib/verifier.js';

export default async function (input, ctx) {
  if (ctx.initData.user.id !== OWNER_ID) throw new EndpointError('Acesso negado');
  return verifyAll();
}
