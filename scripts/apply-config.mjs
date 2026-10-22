// Grava a configuração de deploy em tgcloud/lib/config.js a partir de variáveis do GitHub.
// O runtime do tgcloud não lê variáveis de ambiente: só enxerga os módulos publicados,
// então o valor precisa ser escrito no módulo ANTES do `tgcloud push` (feito no CI).
//
//   OWNER   o ID numérico do Telegram do dono
//
// O valor entra em código JavaScript, então nunca é copiado sem validar, e nunca
// é impresso no log.
import fs from 'node:fs';
import path from 'node:path';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const ownerRaw = (process.env.OWNER ?? '').trim();
if (!ownerRaw) fail('OWNER não definido (Settings → Secrets and variables → Actions).');
if (!/^\d{1,15}$/.test(ownerRaw)) fail('OWNER inválido: use só o ID numérico do Telegram.');

const file = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../tgcloud/lib/config.js');
let src = fs.readFileSync(file, 'utf8');
const reOwner = /export const OWNER_ID = \d+;/;
if (!reOwner.test(src)) fail('Linha "export const OWNER_ID = ...;" não encontrada em config.js.');
src = src.replace(reOwner, `export const OWNER_ID = ${Number(ownerRaw)};`);
fs.writeFileSync(file, src);
console.log('Configuração gravada: dono definido.');
