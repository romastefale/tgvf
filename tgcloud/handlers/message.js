// handlers/message.js recebe a Message (update.message). Bot API: Message, Chat, User.
import { api } from 'sdk';
import { USERNAME, addBot, configProblem, isOwner, listBots, removeAll, removeBot, verifyAll } from '../lib/verification.js';

const HELP = 'Comandos:\n/verificar - verifica o seu perfil e os seus bots\n/remover - remove as verificações\n/bots - lista os bots cadastrados\n/addbot @username - cadastra um bot\n/rmbot @username - remove um bot do cadastro';

const format = ({ ok, label, detail }) => (ok ? `OK | ${label}` : `FALHOU | ${label}: ${detail}`);

export default async function (message) {
  // Só o dono, em chat privado; os demais updates são ignorados.
  if (message.chat.type !== 'private' || !isOwner(message.from?.id)) return;

  // Comando = primeira palavra, sem o @bot que o Telegram acrescenta em grupos.
  const [first, arg] = (message.text ?? '').trim().split(/\s+/);
  const command = (first ?? '').split('@')[0].toLowerCase();

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
  } else if (command === '/bots') {
    const list = await listBots();
    text = list.length ? list.join('\n') : 'Nenhum bot cadastrado. Use /addbot @username.';
  } else if (command === '/addbot' || command === '/rmbot') {
    if (!USERNAME.test(arg ?? '')) {
      text = `Use ${command} @username.`;
    } else if (command === '/addbot') {
      text = (await addBot(arg)) ? `${arg} cadastrado.` : `${arg} já estava cadastrado.`;
    } else {
      text = (await removeBot(arg)) ? `${arg} removido.` : `${arg} não estava cadastrado.`;
    }
  } else {
    return;
  }

  await api.sendMessage({ chat_id: message.chat.id, text });
}
