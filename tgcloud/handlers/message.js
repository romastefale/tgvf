// handlers/message.js recebe a Message (update.message).
// Message.entities traz a entidade "bot_command" (ex.: /start@jobs_bot) com offset e length em UTF-16.
import { api } from 'sdk';
import { addBot, isOwner, listBots, removeAll, removeBot, verifyAll } from '../lib/verification.js';

const HELP = [
  'Comandos:',
  '/verificar - verifica o seu perfil e os seus bots',
  '/remover - remove as verificações',
  '/bots - lista os bots cadastrados',
  '/addbot @username - cadastra um bot',
  '/rmbot @username - remove um bot do cadastro',
].join('\n');

const format = ({ ok, label, detail }) => (ok ? `OK | ${label}` : `FALHOU | ${label}: ${detail}`);

export default async function (message) {
  if (message.chat.type !== 'private' || !isOwner(message.from?.id)) return;

  const entity = message.entities?.find((e) => e.type === 'bot_command' && e.offset === 0);
  if (!entity) return;
  const [command] = message.text.slice(0, entity.length).split('@');
  const argument = message.text.slice(entity.length).trim();

  let text;
  switch (command) {
    case '/start':
    case '/ajuda':
      text = HELP;
      break;
    case '/verificar':
      text = (await verifyAll()).map(format).join('\n');
      break;
    case '/remover':
      text = (await removeAll()).map(format).join('\n');
      break;
    case '/bots': {
      const list = await listBots();
      text = list.length ? list.join('\n') : 'Nenhum bot cadastrado. Use /addbot @username.';
      break;
    }
    case '/addbot':
      if (!argument.startsWith('@')) { text = 'Use /addbot @username.'; break; }
      await addBot(argument);
      text = `${argument} cadastrado.`;
      break;
    case '/rmbot':
      if (!argument.startsWith('@')) { text = 'Use /rmbot @username.'; break; }
      text = (await removeBot(argument)) ? `${argument} removido.` : `${argument} não estava cadastrado.`;
      break;
    default:
      return;
  }

  await api.sendMessage({ chat_id: message.chat.id, text });
}
