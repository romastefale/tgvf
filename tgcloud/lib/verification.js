// Verificação em nome da organização que o bot representa (Bot API: verifyUser, verifyChat,
// removeUserVerification, removeChatVerification). `api.<método>(params)` devolve o resultado
// sem o envelope e lança BotApiError quando a Bot API responde { ok: false }.
import { api, db, BotApiError, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { bots } from '../schema.js';
import { OWNER_ID } from './config.js';

export function isOwner(userId) {
  return OWNER_ID > 0 && userId === OWNER_ID;
}

// Endpoint: ctx.initData já vem verificado pela plataforma, mas `user` é opcional nele.
export function assertOwner(ctx) {
  if (!isOwner(ctx.initData?.user?.id)) throw new EndpointError('Acesso negado', { code: 'FORBIDDEN' });
}

export async function listBots() {
  const rows = await db.select().from(bots).all();
  return rows.map((row) => row.username);
}

// Idempotente: cadastrar de novo o mesmo @username não altera nada.
export async function addBot(username) {
  await db.insert(bots).values({ username })
    .onConflictDoUpdate({ target: bots.username, set: { username } })
    .run();
}

// Resolve para true se havia um registro para apagar (rowsAffected do resultado da escrita).
export async function removeBot(username) {
  const result = await db.delete(bots).where(eq(bots.username, username)).run();
  return result.rowsAffected > 0;
}

// Uma chamada da Bot API vira { label, ok, detail? }; só o BotApiError é tratado, o resto é relançado.
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
