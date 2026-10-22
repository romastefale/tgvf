// Testes do verificador. Rodar com:  node --test tests/verificador.test.mjs
// Usa só o que o Node 22 traz (node:test); não instala nada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const stubUrl = pathToFileURL(new URL('./sdk-stub.mjs', import.meta.url).pathname).href;

// 1) `import ... from 'sdk'` aponta para o SDK simulado.
// 2) Em tgcloud/lib/verifier.js, preenche OWNER_ID e MY_BOTS (o arquivo real vai com eles vazios).
//    A instância pedida com `?cru` fica sem preencher, para testar esse estado.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'sdk') return { url: stubUrl, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (!url.includes('/tgcloud/')) return next(url, context);
    const loaded = next(url, { ...context, format: 'module' });
    let source = String(loaded.source);
    if (url.endsWith('/lib/verifier.js')) {
      source = source
        .replace('OWNER_ID = 0;', 'OWNER_ID = 111;')
        .replace('MY_BOTS = [];', "MY_BOTS = ['@a_bot', '@b_bot'];");
    }
    return { format: 'module', source, shortCircuit: true };
  },
});

const sdk = await import('./sdk-stub.mjs');
const handler = (await import('../tgcloud/handlers/message.js')).default;
const verify = (await import('../tgcloud/endpoints/verify.js')).default;
const cru = await import('../tgcloud/lib/verifier.js?cru');

const OWNER = 111;
const message = (text, from = OWNER, type = 'private') => ({ chat: { id: from, type }, from: { id: from }, text });
const methods = () => sdk.calls.map((c) => c.method);
const reply = () => sdk.calls.find((c) => c.method === 'sendMessage').params.text;

test.beforeEach(() => {
  sdk.calls.length = 0;
  for (const k of Object.keys(sdk.behavior)) delete sdk.behavior[k];
});

// ---- bot (handler) ----

test('ignora quem não é o dono e chats que não são privados', async () => {
  await handler(message('/verificar', 222));
  await handler(message('/verificar', OWNER, 'group'));
  assert.equal(sdk.calls.length, 0);
});

test('/verificar do dono verifica o perfil e cada bot e responde o resultado', async () => {
  await handler(message('/verificar'));
  assert.deepEqual(methods(), ['verifyUser', 'verifyChat', 'verifyChat', 'sendMessage']);
  assert.deepEqual(sdk.calls[0].params, { user_id: OWNER });
  assert.deepEqual(sdk.calls[1].params, { chat_id: '@a_bot' });
  assert.equal(reply(), 'OK | perfil\nOK | @a_bot\nOK | @b_bot');
});

test('uma falha em um item não impede os outros e o motivo aparece', async () => {
  sdk.behavior.verifyChat = (p) => {
    if (p.chat_id === '@a_bot') throw new sdk.BotApiError(400, 'Bad Request: chat not found', 'verifyChat');
  };
  await handler(message('/verificar'));
  assert.equal(reply(), 'OK | perfil\nFALHOU | @a_bot: 400 Bad Request: chat not found\nOK | @b_bot');
});

// ---- endpoint do Mini App ----

test('o endpoint recusa quem não é o dono, inclusive init data sem user', async () => {
  const forbidden = (e) => e.parameters.code === 'FORBIDDEN';
  await assert.rejects(verify({}, { initData: { user: { id: 222 } } }), forbidden);
  await assert.rejects(verify({}, { initData: {} }), forbidden);
  assert.equal(sdk.calls.length, 0);
});

test('o endpoint devolve as linhas ao dono', async () => {
  const rows = await verify({}, { initData: { user: { id: OWNER } } });
  assert.deepEqual(rows, [
    { label: 'perfil', ok: true },
    { label: '@a_bot', ok: true },
    { label: '@b_bot', ok: true },
  ]);
});

// ---- estado como o arquivo real vai (sem OWNER_ID e MY_BOTS preenchidos) ----

test('sem preencher: aponta o que falta e o endpoint avisa em vez de verificar', () => {
  assert.equal(cru.configProblem(), 'OWNER_ID não preenchido');
  assert.throws(
    () => cru.assertOwner({ initData: { user: { id: OWNER } } }),
    (e) => e.parameters.code === 'NOT_CONFIGURED',
  );
});

// ---- página do Mini App (app/index.html) com um DOM de mentira ----

// Pega o script da página e encurta o limite de espera de 30 s para 50 ms.
const pageScript = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace('30000', '50');

function openPage(tg) {
  const element = () => ({
    children: [],
    listeners: {},
    className: '',
    disabled: false,
    _text: '',
    get textContent() { return this._text; },
    set textContent(v) { this._text = v; if (v === '') this.children = []; },
    append(...nodes) { this.children.push(...nodes); },
    addEventListener(type, fn) { this.listeners[type] = fn; },
  });
  const buttons = [element(), element()];
  const out = element();
  const ids = { out, verify: buttons[0], unverify: buttons[1] };
  const document = { getElementById: (id) => ids[id], querySelectorAll: () => buttons, createElement: element };
  new Function('window', 'document', 'setTimeout', 'clearTimeout', pageScript)({ Telegram: tg }, document, setTimeout, clearTimeout);
  return { buttons, out };
}

const webApp = (call) => ({ ready() {}, expand() {}, showConfirm() {}, Serverless: { call } });

test('a página mostra o resultado devolvido pelo endpoint', () => {
  const rows = [{ label: 'perfil', ok: true }, { label: '@a_bot', ok: false, detail: '400 erro' }];
  const { buttons, out } = openPage({ WebApp: webApp((name, cb) => cb(null, rows)) });
  buttons[0].listeners.click();
  assert.equal(out.children.length, 2);
  assert.equal(out.children[1].children[1].textContent, '400 erro');
  assert.equal(buttons[0].disabled, false);
});

test('sem resposta, a página reabilita os botões e ignora uma resposta tardia', async () => {
  let late;
  const { buttons, out } = openPage({ WebApp: webApp((name, cb) => { late = cb; }) });
  buttons[0].listeners.click();
  assert.equal(buttons[0].disabled, true);
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(buttons[0].disabled, false);
  assert.equal(out.children[0].children[1].textContent, 'Sem resposta. Tente de novo.');
  late(null, [{ label: 'tarde', ok: true }]);
  assert.equal(out.children[0].children[1].textContent, 'Sem resposta. Tente de novo.');
});
