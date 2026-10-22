// Lógica compartilhada pelo handler do bot e pelos endpoints do Mini App.
// Fontes oficiais:
//  - `api.<método>(params)` e BotApiError (.code, .description, .parameters): Serverless > The Bot API
//  - EndpointError(description, parameters?): Serverless > Endpoints
//  - verifyUser / verifyChat / removeUserVerification / removeChatVerification: Bot API
//  - `console` disponível nos módulos: Serverless > Logging
//  - módulos em lib/ importados por caminho relativo com .js: Serverless > The module system
import { api, BotApiError, EndpointError } from 'sdk';

// Preencha antes do deploy.
export const OWNER_ID = 0;   // seu user_id numérico (Integer)
export const MY_BOTS = [];   // @username dos seus bots, ex.: ['@meubot1', '@meubot2', '@meubot3']

// Devolve o motivo da configuração incompleta, ou null se está tudo preenchido.
export function configProblem() {
  if (!Number.isInteger(OWNER_ID) || OWNER_ID <= 0) return 'OWNER_ID não preenchido';
  if (!Array.isArray(MY_BOTS) || MY_BOTS.length === 0) return 'MY_BOTS vazio';
  if (!MY_BOTS.every((b) => typeof b === 'string' && /^@\S+$/.test(b))) {
    return 'MY_BOTS deve conter @usernames';
  }
  return null;
}

export function isOwner(userId) {
  return Number.isInteger(OWNER_ID) && OWNER_ID > 0 && userId === OWNER_ID;
}

// Usada pelos endpoints. O init data já vem verificado pela plataforma (ctx.initData),
// mas o campo `user` é opcional, então é checado aqui.
export function assertOwner(ctx) {
  const problem = configProblem();
  if (problem) throw new EndpointError('Configuração incompleta', { code: 'NOT_CONFIGURED', problem });
  if (!isOwner(ctx.initData?.user?.id)) throw new EndpointError('Acesso negado', { code: 'FORBIDDEN' });
}

// Executa uma chamada da Bot API e devolve { label, ok, detail? }. Falha esperada da
// Bot API (BotApiError) vira linha de resultado e não impede os demais itens; qualquer
// outro erro é relançado.
async function step(label, call) {
  try {
    await call();
    return { label, ok: true };
  } catch (e) {
    // Serverless > The SDK > The Bot API: captura o BotApiError esperado e relança o resto.
    if (e instanceof BotApiError) {
      const wait = e.parameters?.retry_after;
      return { label, ok: false, detail: `${e.code} ${e.description}${wait ? ` (tente em ${wait}s)` : ''}` };
    }
    throw e;
  }
}

const targets = () => [...new Set(MY_BOTS)];

// custom_description é omitido: o texto oficial exige vazio se a organização não tiver permissão.
export async function verifyAll() {
  const rows = [await step('perfil', () => api.verifyUser({ user_id: OWNER_ID }))];
  for (const bot of targets()) {
    rows.push(await step(bot, () => api.verifyChat({ chat_id: bot })));
  }
  return rows;
}

export async function removeAll() {
  const rows = [await step('perfil', () => api.removeUserVerification({ user_id: OWNER_ID }))];
  for (const bot of targets()) {
    rows.push(await step(bot, () => api.removeChatVerification({ chat_id: bot })));
  }
  return rows;
}
