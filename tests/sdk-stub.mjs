// SDK simulado, escrito a partir do texto oficial do Serverless (The Bot API, Endpoints).
// Só serve para os testes locais: prova a lógica do código, não o comportamento real da plataforma.

export class BotApiError extends Error {
  constructor(code, description, method, parameters) {
    super(description);
    this.code = code;
    this.description = description;
    this.method = method;
    this.parameters = parameters;
  }
}

export class EndpointError extends Error {
  constructor(description, parameters) {
    super(description);
    this.description = description;
    this.parameters = parameters;
  }
}

export const calls = [];     // toda chamada feita a api.<método>
export const behavior = {};  // método -> função que lança, para simular uma falha

export const api = new Proxy({}, {
  get: (_, method) => async (params) => {
    calls.push({ method, params });
    if (behavior[method]) behavior[method](params);
    return true;
  },
});
