// Participante: cliente de linha de comando que conecta ao Leiloeiro.
//
// Uso: npm run participante -- <url> <nome>
//      ex.: npm run participante -- ws://192.168.0.12:8080 joao
//
// Comandos no prompt:
//   <valor>   dá um lance (ex.: 150)
//   estado    consulta o estado do leilão
//   sair      fecha a conexão

import readline from 'node:readline';
import WebSocket from 'ws';
import * as P from './protocolo.js';

const url = process.argv[2] ?? `ws://localhost:${P.DEFAULT_PORT}`;
const nome = process.argv[3] ?? `participante-${process.pid}`;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: `${nome}> ` });
let tecladoFechado = false; // stdin terminou (Ctrl+D ou entrada redirecionada): segue só ouvindo
rl.on('close', () => { tecladoFechado = true; });

// Imprime sem bagunçar o que a pessoa está digitando: apaga a linha do prompt,
// escreve a mensagem e redesenha o prompt com o texto já digitado.
function mostrar(texto) {
  if (process.stdout.isTTY) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  }
  console.log(`[${P.hora()}] ${texto}`);
  if (!tecladoFechado) rl.prompt(true);
}

function formatarEstado(m) {
  const maior = m.highest_bid === null ? 'nenhum lance ainda' : `${m.highest_bid} (${m.highest_bidder})`;
  return `ESTADO  item: ${m.item} | mínimo: ${m.min_bid} | maior lance: ${maior} | ` +
    `restam ${m.remaining_seconds} s | ${m.status === 'OPEN' ? 'aberto' : 'encerrado'}`;
}

const MOTIVOS = {
  [P.LOWER_THAN_CURRENT]: 'não é maior que o lance atual',
  [P.BELOW_MIN_BID]: 'abaixo do lance mínimo',
  [P.CLOSED]: 'leilão encerrado',
  [P.INVALID_MESSAGE]: 'mensagem inválida',
};

const ws = new WebSocket(url);

ws.on('open', () => {
  mostrar(`conectado a ${url} como "${nome}"`);
  ws.send(P.encode({ type: P.JOIN, bidder: nome }));
});

ws.on('message', (raw) => {
  const m = P.decode(raw);
  if (!m) return mostrar(`mensagem não reconhecida: ${raw}`);

  switch (m.type) {
    case P.STATE:
      return mostrar(formatarEstado(m));
    case P.BID_RESULT:
      return mostrar(m.accepted
        ? `SEU LANCE FOI ACEITO: ${m.highest_bid}`
        : `SEU LANCE FOI RECUSADO: ${MOTIVOS[m.reason] ?? m.reason} (maior lance: ${m.highest_bid ?? '-'})`);
    case P.NEW_HIGHEST_BID:
      return mostrar(`NOVO MAIOR LANCE: ${m.amount} de ${m.bidder} (restam ${m.remaining_seconds} s)`);
    case P.AUCTION_CLOSED:
      return mostrar(m.winner
        ? `LEILÃO ENCERRADO. Vencedor: ${m.winner} com ${m.amount}`
        : 'LEILÃO ENCERRADO sem lances.');
    case P.ERROR:
      return mostrar(`ERRO: ${m.message}`);
    default:
      return mostrar(`mensagem desconhecida: ${JSON.stringify(m)}`);
  }
});

// O WebSocket não reconecta sozinho: se o Leiloeiro cair, a conexão fecha e o cliente termina.
// 1000 = fechamento normal; 1006 = conexão perdida sem frame de close (ex.: processo morto).
ws.on('close', (code, reason) => {
  mostrar(`conexão encerrada (código ${code}${reason.length ? `, ${reason}` : ''})`);
  tecladoFechado = true;
  rl.close();
  process.exit(code === 1000 ? 0 : 1);
});

ws.on('error', (err) => {
  mostrar(`erro de conexão: ${err.message}`);
});

rl.on('line', (linha) => {
  const comando = linha.trim();
  if (comando === '') return rl.prompt();

  if (ws.readyState !== WebSocket.OPEN) {
    mostrar('ainda não conectado ao Leiloeiro');
    return;
  }

  if (comando === 'estado') {
    ws.send(P.encode({ type: P.GET_STATE }));
  } else if (comando === 'sair') {
    ws.close(1000, 'participante saiu');
  } else {
    const valor = Number(comando.replace(',', '.'));
    if (!Number.isFinite(valor)) {
      mostrar('comandos: <valor> | estado | sair');
      return;
    }
    ws.send(P.encode({ type: P.BID, bidder: nome, amount: valor }));
  }
  if (!tecladoFechado) rl.prompt();
});

rl.on('SIGINT', () => ws.close(1000, 'participante saiu'));
