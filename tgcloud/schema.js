import { table, text } from 'sdk/db';

// Bots (@username) que /verificar e o Mini App verificam. Fica no banco, que persiste
// entre invocações, e é gerenciado pelo dono com /addbot e /rmbot.
export const bots = table('bots', {
  username: text('username').primaryKey(),
});
