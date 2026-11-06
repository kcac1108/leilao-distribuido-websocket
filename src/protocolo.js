// Formato das mensagens trocadas entre Leiloeiro e Participantes (RF6).
// Toda mensagem é um objeto JSON com o campo "type". O README (seção 3) documenta cada uma.

// Participante -> Leiloeiro
export const JOIN = 'JOIN';
export const GET_STATE = 'GET_STATE';
export const BID = 'BID';

// Leiloeiro -> Participante
export const STATE = 'STATE';
export const BID_RESULT = 'BID_RESULT';
export const NEW_HIGHEST_BID = 'NEW_HIGHEST_BID';
export const AUCTION_CLOSED = 'AUCTION_CLOSED';
export const ERROR = 'ERROR';

// Motivos de recusa de um lance / erro
export const LOWER_THAN_CURRENT = 'LOWER_THAN_CURRENT';
export const BELOW_MIN_BID = 'BELOW_MIN_BID';
export const CLOSED = 'AUCTION_CLOSED';
export const INVALID_MESSAGE = 'INVALID_MESSAGE';

export const DEFAULT_PORT = 8080;

/** Serializa uma mensagem para enviar pela conexão. */
export function encode(msg) {
  return JSON.stringify(msg);
}

/**
 * Converte o texto recebido em mensagem. Devolve null se não for JSON
 * ou se não tiver um "type" em texto.
 */
export function decode(raw) {
  try {
    const msg = JSON.parse(raw.toString());
    if (msg && typeof msg === 'object' && typeof msg.type === 'string') return msg;
  } catch {
    // cai no return null abaixo
  }
  return null;
}

/** Hora local HH:MM:SS.mmm, usada nos logs dos experimentos. */
export function hora(date = new Date()) {
  return date.toTimeString().slice(0, 8) + '.' + String(date.getMilliseconds()).padStart(3, '0');
}
