// Configuração do dono. OWNER_ID é gravado aqui pelo CI (scripts/apply-config.mjs) a partir
// da variável OWNER do GitHub, antes do `tgcloud push`: o runtime não lê variáveis de ambiente.
export const OWNER_ID = 0;   // user_id numérico do dono
export const MY_BOTS = [];   // @username dos seus bots, ex.: ['@meubot1', '@meubot2', '@meubot3']
