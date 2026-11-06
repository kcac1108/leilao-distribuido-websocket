// Leiloeiro: servidor WebSocket que conduz o leilão de um item.
//
// Uso:   npm run leiloeiro                 (continua o leilão salvo em estado.json, se houver)
//        npm run leiloeiro -- --novo       (ignora o snapshot e começa um leilão novo)
// Config: PORT, ITEM, MIN_BID, DURATION_SECONDS (variáveis de ambiente)
//
// Todas as mensagens são tratadas no event loop do Node, uma de cada vez.
// Por isso dois lances "simultâneos" nunca alteram o estado ao mesmo tempo:
// o que chegar primeiro ao servidor é processado primeiro (experimento RE3).

import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import * as P from './protocolo.js';

const PORT = Number(process.env.PORT ?? P.DEFAULT_PORT);
const SNAPSHOT = path.resolve(process.env.SNAPSHOT_FILE ?? 'estado.json');
const NOVO = process.argv.includes('--novo');

// ---------------------------------------------------------------- estado

function leilaoNovo() {
  const duracao = Number(process.env.DURATION_SECONDS ?? 120);
  return {
    item: process.env.ITEM ?? 'Violão',
    min_bid: Number(process.env.MIN_BID ?? 100),
    highest_bid: null,
    highest_bidder: null,
    // Horário absoluto pelo relógio do Leiloeiro: é a única referência de tempo do sistema.
    ends_at: Date.now() + duracao * 1000,
    status: 'OPEN',
  };
}

function carregarSnapshot() {
  if (NOVO || !fs.existsSync(SNAPSHOT)) return null;
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  } catch (err) {
    log(`snapshot ilegível (${err.message}), começando leilão novo`);
    return null;
  }
}

// Escrita síncrona + rename: o arquivo nunca fica pela metade, e o próximo
// lance só é processado depois que o anterior foi gravado.
function salvarSnapshot() {
  const tmp = SNAPSHOT + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(leilao, null, 2));
  fs.renameSync(tmp, SNAPSHOT);
}

const restaurado = carregarSnapshot();
const leilao = restaurado ?? leilaoNovo();

function segundosRestantes() {
  return Math.max(0, Math.round((leilao.ends_at - Date.now()) / 1000));
}

function mensagemEstado() {
  return {
    type: P.STATE,
    item: leilao.item,
    min_bid: leilao.min_bid,
    highest_bid: leilao.highest_bid,
    highest_bidder: leilao.highest_bidder,
    remaining_seconds: segundosRestantes(),
    status: leilao.status,
  };
}

// ---------------------------------------------------------------- rede

const wss = new WebSocketServer({ host: '0.0.0.0', port: PORT });
const nomes = new Map(); // conexão -> nome do participante
let contadorLances = 0; // ordem de chegada dos lances, para os logs do RE3

function log(texto) {
  console.log(`[${P.hora()}] ${texto}`);
}

function enviar(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(P.encode(msg));
}

function broadcast(msg) {
  const texto = P.encode(msg);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(texto);
  }
}

wss.on('connection', (ws, req) => {
  const origem = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
  log(`conexão aberta de ${origem} (${wss.clients.size} conectados)`);

  ws.on('message', (raw) => tratarMensagem(ws, raw));

  ws.on('close', (code) => {
    log(`conexão fechada: ${nomes.get(ws) ?? origem} (código ${code})`);
    nomes.delete(ws);
  });

  ws.on('error', (err) => log(`erro na conexão ${origem}: ${err.message}`));
});

function tratarMensagem(ws, raw) {
  const msg = P.decode(raw);
  if (!msg) {
    enviar(ws, { type: P.ERROR, message: P.INVALID_MESSAGE });
    return;
  }

  switch (msg.type) {
    case P.JOIN:
      if (typeof msg.bidder !== 'string' || msg.bidder.trim() === '') {
        enviar(ws, { type: P.ERROR, message: P.INVALID_MESSAGE });
        return;
      }
      nomes.set(ws, msg.bidder.trim());
      log(`JOIN ${msg.bidder.trim()}`);
      enviar(ws, mensagemEstado());
      return;

    case P.GET_STATE:
      enviar(ws, mensagemEstado());
      return;

    case P.BID:
      tratarLance(ws, msg);
      return;

    default:
      enviar(ws, { type: P.ERROR, message: P.INVALID_MESSAGE });
  }
}

function recusar(ws, reason) {
  enviar(ws, { type: P.BID_RESULT, accepted: false, reason, highest_bid: leilao.highest_bid });
  return reason;
}

function tratarLance(ws, msg) {
  const ordem = ++contadorLances;
  const bidder = typeof msg.bidder === 'string' && msg.bidder.trim() ? msg.bidder.trim() : nomes.get(ws);
  const amount = msg.amount;

  let resultado;
  if (!bidder || typeof amount !== 'number' || !Number.isFinite(amount)) {
    resultado = recusar(ws, P.INVALID_MESSAGE);
  } else if (leilao.status !== 'OPEN') {
    resultado = recusar(ws, P.CLOSED);
  } else if (amount < leilao.min_bid) {
    resultado = recusar(ws, P.BELOW_MIN_BID);
  } else if (leilao.highest_bid !== null && amount <= leilao.highest_bid) {
    resultado = recusar(ws, P.LOWER_THAN_CURRENT);
  } else {
    leilao.highest_bid = amount;
    leilao.highest_bidder = bidder;
    salvarSnapshot();
    // Primeiro a resposta ao autor (requisição/resposta), depois o push para todos (notificação).
    enviar(ws, { type: P.BID_RESULT, accepted: true, highest_bid: amount });
    broadcast({
      type: P.NEW_HIGHEST_BID,
      bidder,
      amount,
      remaining_seconds: segundosRestantes(),
    });
    resultado = 'ACEITO';
  }

  log(`lance #${ordem}: ${bidder ?? '?'} ofereceu ${amount} -> ${resultado}`);
}

// ---------------------------------------------------------------- encerramento (RF5)

function encerrar() {
  if (leilao.status === 'CLOSED') return;
  leilao.status = 'CLOSED';
  salvarSnapshot();
  const msg = { type: P.AUCTION_CLOSED, winner: leilao.highest_bidder, amount: leilao.highest_bid };
  broadcast(msg);
  log(`LEILÃO ENCERRADO. Vencedor: ${leilao.highest_bidder ?? 'ninguém'} (${leilao.highest_bid ?? '-'})`);
}

if (leilao.status === 'OPEN') {
  if (leilao.ends_at <= Date.now()) {
    // Reiniciou depois do horário de encerramento: fecha na hora.
    encerrar();
  } else {
    setTimeout(encerrar, leilao.ends_at - Date.now());
  }
}

// ---------------------------------------------------------------- início

wss.on('listening', () => {
  if (restaurado) {
    log(`estado restaurado de ${SNAPSHOT}: maior lance ${leilao.highest_bid ?? '-'} de ${leilao.highest_bidder ?? '-'}`);
  } else {
    salvarSnapshot();
  }
  log(`Leiloeiro ouvindo em ws://0.0.0.0:${PORT}`);
  log(`item "${leilao.item}", lance mínimo ${leilao.min_bid}, status ${leilao.status}, ${segundosRestantes()} s restantes`);
  if (leilao.status === 'CLOSED') log('este leilão já terminou; para começar outro use: npm run leiloeiro -- --novo');
});

wss.on('error', (err) => {
  console.error(`não foi possível abrir a porta ${PORT}: ${err.message}`);
  process.exit(1);
});
