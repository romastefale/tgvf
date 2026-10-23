// OWNER_ID é gravado aqui pelo CI (scripts/apply-config.mjs) a partir da variável OWNER do GitHub,
// antes do `tgcloud push`: o runtime não lê variáveis de ambiente. Os bots ficam no banco (schema.js).
export const OWNER_ID = 0;   // user_id numérico do dono
