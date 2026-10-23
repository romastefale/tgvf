// handlers/message.js recebe a Message (update.message). Bot API: Message, Chat, User.
import { api } from 'sdk';
import { configProblem, isOwner, verifyAll, removeAll } from '../lib/verification.js';

const HELP = 'Comandos:\n/verificar - verifica o seu perfil e os seus bots\n/remover - remove as verificações';

const format = ({ ok, label, detail }) => (ok ? `OK | ${label}` : `FALHOU | ${label}: ${detail}`);

export default async function (message) {
  // Só o dono, em chat privado; os demais updates são ignorados.
  if (message.chat.type !== 'private' || !isOwner(message.from?.id)) return;

  // Comando = primeira palavra, sem o @bot que o Telegram acrescenta em grupos.
  const [command] = (message.text ?? '').trim().toLowerCase().split(/\s+/)[0].split('@');

  let text;
  if (command === '/start' || command === '/ajuda') {
    text = HELP;
  } else if (command === '/verificar' || command === '/remover') {
    const problem = configProblem();
    if (problem) {
      text = `Configuração incompleta: ${problem}.`;
    } else {
      const results = command === '/verificar' ? await verifyAll() : await removeAll();
      text = results.map(format).join('\n');
    }
  } else {
    return;
  }

  await api.sendMessage({ chat_id: message.chat.id, text });
}
