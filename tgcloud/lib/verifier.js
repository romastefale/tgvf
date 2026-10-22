// Lógica compartilhada pelo handler do bot e pelos endpoints do Mini App.
// Fontes oficiais:
//  - `api.<método>(params)` e BotApiError (.code, .description): Serverless > The Bot API
//  - verifyUser / verifyChat / removeUserVerification / removeChatVerification: Bot API
//  - módulos em lib/ importados por caminho relativo com .js: Serverless > The module system
import { api, BotApiError } from 'sdk';

// Preencha antes do push.
export const OWNER_ID = 0;                                   // seu user_id numérico (Integer)
export const MY_BOTS = ['@bot_um', '@bot_dois', '@bot_tres']; // @username dos seus 3 bots

// Executa uma chamada da Bot API e devolve { label, ok, detail? }.
async function step(label, call) {
  try {
    await call();
    return { label, ok: true };
  } catch (e) {
    if (e instanceof BotApiError) return { label, ok: false, detail: `${e.code} ${e.description}` };
    throw e;
  }
}

// custom_description é omitido: o texto oficial exige vazio se a organização não tiver permissão.
export async function verifyAll() {
  const rows = [await step('perfil', () => api.verifyUser({ user_id: OWNER_ID }))];
  for (const bot of MY_BOTS) {
    rows.push(await step(bot, () => api.verifyChat({ chat_id: bot })));
  }
  return rows;
}

export async function removeAll() {
  const rows = [await step('perfil', () => api.removeUserVerification({ user_id: OWNER_ID }))];
  for (const bot of MY_BOTS) {
    rows.push(await step(bot, () => api.removeChatVerification({ chat_id: bot })));
  }
  return rows;
}
