// Verificação em nome da organização que o bot representa.
// Bot API: verifyUser, verifyChat, removeUserVerification, removeChatVerification.
// SDK: `api.<método>(params)` devolve o resultado já sem o envelope e lança BotApiError
// (.code, .description, .parameters) quando a Bot API responde { ok: false }.
import { api, db, BotApiError, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { bots } from '../schema.js';
import { OWNER_ID } from './config.js';

export const USERNAME = /^@\w{5,32}$/;

export async function listBots() {
  const rows = await db.select().from(bots).all();
  return rows.map((r) => r.username);
}

// Devolve false se o bot já estava na lista.
export async function addBot(username) {
  const found = await db.select().from(bots).where(eq(bots.username, username)).get();
  if (found) return false;
  await db.insert(bots).values({ username }).run();
  return true;
}

// Devolve false se o bot não estava na lista.
export async function removeBot(username) {
  const found = await db.select().from(bots).where(eq(bots.username, username)).get();
  if (!found) return false;
  await db.delete(bots).where(eq(bots.username, username)).run();
  return true;
}

// Motivo de o OWNER_ID não estar preenchido, ou null.
export function configProblem() {
  if (!Number.isInteger(OWNER_ID) || OWNER_ID <= 0) return 'OWNER_ID não preenchido';
  return null;
}

export function isOwner(userId) {
  return Number.isInteger(OWNER_ID) && OWNER_ID > 0 && userId === OWNER_ID;
}

// Endpoints: ctx.initData já foi verificado pela plataforma, mas `user` é opcional nele.
// Recusa com EndpointError, que chega ao Mini App com a descrição e os parameters.
export function assertOwner(ctx) {
  const problem = configProblem();
  if (problem) throw new EndpointError('Configuração incompleta', { code: 'NOT_CONFIGURED', problem });
  if (!isOwner(ctx.initData?.user?.id)) throw new EndpointError('Acesso negado', { code: 'FORBIDDEN' });
}

// Uma chamada da Bot API vira { label, ok, detail? }. Só o BotApiError é tratado; o resto é relançado.
async function attempt(label, call) {
  try {
    await call();
    return { label, ok: true };
  } catch (e) {
    if (!(e instanceof BotApiError)) throw e;
    const retry = e.parameters?.retry_after;
    return { label, ok: false, detail: `${e.code} ${e.description}${retry ? ` (retry_after ${retry}s)` : ''}` };
  }
}

export async function verifyAll() {
  const results = [await attempt('perfil', () => api.verifyUser({ user_id: OWNER_ID }))];
  for (const username of await listBots()) {
    results.push(await attempt(username, () => api.verifyChat({ chat_id: username })));
  }
  return results;
}

export async function removeAll() {
  const results = [await attempt('perfil', () => api.removeUserVerification({ user_id: OWNER_ID }))];
  for (const username of await listBots()) {
    results.push(await attempt(username, () => api.removeChatVerification({ chat_id: username })));
  }
  return results;
}
