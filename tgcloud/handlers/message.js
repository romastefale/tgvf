// Handler de mensagens do bot verificador (Telegram Serverless).
//  - estrutura do handler (export default recebe a Message): Serverless > Handlers
//  - message.from (User, opcional) e message.text: Bot API > Message
import { api } from 'sdk';
import { OWNER_ID, verifyAll, removeAll } from '../lib/verifier.js';

export default async function (message) {
  // Só o dono comanda o bot.
  if (message.from?.id !== OWNER_ID) return;

  const text = message.text ?? '';
  let rows;
  if (text.startsWith('/verificar')) rows = await verifyAll();
  else if (text.startsWith('/remover')) rows = await removeAll();
  else return;

  const lines = rows.map((r) => (r.ok ? `OK | ${r.label}` : `FALHOU | ${r.label}: ${r.detail}`));
  await api.sendMessage({ chat_id: message.chat.id, text: lines.join('\n') });
}
