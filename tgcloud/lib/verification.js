// Verificação em nome da organização que o bot representa.
// Bot API: verifyUser, verifyChat, removeUserVerification, removeChatVerification.
// SDK: `api.<método>(params)` devolve o resultado já sem o envelope e lança BotApiError
// (.code, .description, .parameters) quando a Bot API responde { ok: false }.
import { api, BotApiError, EndpointError } from 'sdk';
import { OWNER_ID, MY_BOTS } from './config.js';

// Motivo de a configuração estar incompleta, ou null se está tudo preenchido.
export function configProblem() {
  if (!Number.isInteger(OWNER_ID) || OWNER_ID <= 0) return 'OWNER_ID não preenchido';
  if (!Array.isArray(MY_BOTS) || MY_BOTS.length === 0) return 'MY_BOTS vazio';
  if (!MY_BOTS.every((b) => typeof b === 'string' && /^@\S+$/.test(b))) return 'MY_BOTS deve conter @usernames';
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

const bots = () => [...new Set(MY_BOTS)];

export async function verifyAll() {
  const results = [await attempt('perfil', () => api.verifyUser({ user_id: OWNER_ID }))];
  for (const username of bots()) {
    results.push(await attempt(username, () => api.verifyChat({ chat_id: username })));
  }
  return results;
}

export async function removeAll() {
  const results = [await attempt('perfil', () => api.removeUserVerification({ user_id: OWNER_ID }))];
  for (const username of bots()) {
    results.push(await attempt(username, () => api.removeChatVerification({ chat_id: username })));
  }
  return results;
}
