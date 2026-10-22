// Handler de mensagens do bot verificador (Telegram Serverless).
//  - estrutura do handler (export default recebe a Message): Serverless > Handlers
//  - message.from (User, opcional), message.chat.type ("private", ...) e message.text: Bot API > Message e Chat
import { api } from 'sdk';
import { isOwner, configProblem, verifyAll, removeAll } from '../lib/verifier.js';

const HELP = 'Comandos:\n/verificar - verifica o seu perfil e os seus bots\n/remover - remove as verificações';

const line = (r) => (r.ok ? `OK | ${r.label}` : `FALHOU | ${r.label}: ${r.detail}`);

export default async function (message) {
  // Só o dono, e só em chat privado. Qualquer outra pessoa é ignorada em silêncio.
  if (message.chat?.type !== 'private' || !isOwner(message.from?.id)) return;

  // Primeira palavra, sem o sufixo @bot que o Telegram pode acrescentar.
  const command = (message.text ?? '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();

  let reply;
  if (command === '/verificar' || command === '/remover') {
    const problem = configProblem();
    if (problem) {
      reply = `Configuração incompleta: ${problem}.`;
    } else {
      const rows = command === '/verificar' ? await verifyAll() : await removeAll();
      reply = rows.map(line).join('\n');
    }
  } else if (command === '/start' || command === '/ajuda') {
    reply = HELP;
  } else {
    return;
  }

  await api.sendMessage({ chat_id: message.chat.id, text: reply });
}
