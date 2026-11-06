// Experimento RE3: dois Participantes dão lances praticamente ao mesmo tempo.
//
// Uso: npm run re3 -- <url> [rodadas] [diferença]
//      ex.: npm run re3 -- ws://192.168.0.12:8080 5
//           npm run re3 -- ws://192.168.0.12:8080 5 10   (bia oferece 10 a mais que ana)
//
// Em cada rodada o script consulta o maior lance atual, calcula um valor acima
// dele e envia o lance de "ana" e o de "bia" no mesmo tick do event loop, por
// duas conexões diferentes. Depois mostra qual foi aceito.

import WebSocket from 'ws';
import * as P from '../src/protocolo.js';

const url = process.argv[2] ?? `ws://localhost:${P.DEFAULT_PORT}`;
const rodadas = Number(process.argv[3] ?? 5);
const diferenca = Number(process.argv[4] ?? 0);

// Conecta, faz JOIN e só devolve a conexão depois de receber o STATE de resposta.
function conectar(nome) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.once('open', () => {
      esperar(ws, P.STATE).then(() => resolve(ws));
      ws.send(P.encode({ type: P.JOIN, bidder: nome }));
    });
    ws.once('error', reject);
  });
}

// Espera a próxima mensagem do tipo pedido nessa conexão.
function esperar(ws, tipo) {
  return new Promise((resolve) => {
    const handler = (raw) => {
      const m = P.decode(raw);
      if (m?.type === tipo) {
        ws.off('message', handler);
        resolve({ msg: m, t: performance.now() });
      }
    };
    ws.on('message', handler);
  });
}

const [ana, bia] = await Promise.all([conectar('ana'), conectar('bia')]);

const placar = { ana: 0, bia: 0, ambos: 0, nenhum: 0 };

for (let i = 1; i <= rodadas; i++) {
  ana.send(P.encode({ type: P.GET_STATE }));
  const { msg: estado } = await esperar(ana, P.STATE);
  if (estado.status !== 'OPEN') {
    console.log('leilão encerrado, fim do experimento');
    break;
  }

  const base = estado.highest_bid === null ? estado.min_bid : estado.highest_bid + 10;
  const valorAna = base;
  const valorBia = base + diferenca;

  const respostas = Promise.all([esperar(ana, P.BID_RESULT), esperar(bia, P.BID_RESULT)]);
  const t0 = performance.now();
  // Os dois send() no mesmo tick: saem do cliente com microssegundos de diferença.
  ana.send(P.encode({ type: P.BID, bidder: 'ana', amount: valorAna }));
  bia.send(P.encode({ type: P.BID, bidder: 'bia', amount: valorBia }));
  const [ra, rb] = await respostas;

  const desc = (nome, valor, r) =>
    `${nome} ${valor} -> ${r.msg.accepted ? 'ACEITO' : `recusado (${r.msg.reason})`} em ${(r.t - t0).toFixed(1)} ms`;
  console.log(`rodada ${i}: ${desc('ana', valorAna, ra)} | ${desc('bia', valorBia, rb)}`);

  if (ra.msg.accepted && rb.msg.accepted) placar.ambos++;
  else if (ra.msg.accepted) placar.ana++;
  else if (rb.msg.accepted) placar.bia++;
  else placar.nenhum++;
}

console.log('\nresumo (quem teve o lance aceito):', placar);
ana.close(1000);
bia.close(1000);
