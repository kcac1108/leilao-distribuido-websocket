# Leilão Distribuído com WebSocket

Projeto prático de **Sistemas Distribuídos e Computação Paralela** (PUC-SP, Prof. Carlos Paes) · 2º semestre de 2026
**Grupo 1** · Tecnologia sorteada: **WebSocket**

## Integrantes

- João Avila
- Kauã Cordeiro
- Luan Capella
- Pedro Evaristo

> Status: **Entrega 2 (06/11) — POC implementada** (RF1–RF6). Slides do seminário em [`slides/seminario.pptx`](slides/seminario.pptx). Experimentos RE2/RE3 executados localmente; falta repetir em duas máquinas (RE1) e anotar os resultados finais.

---

## 1. Tecnologia e paradigma

**WebSocket** (RFC 6455) é um protocolo de comunicação **bidirecional e persistente** sobre uma única conexão TCP, iniciada por um handshake HTTP (`Upgrade: websocket`).

- **Paradigma:** troca de mensagens (comunicação direta entre processos), com conexão aberta que permite **push** do servidor para o cliente sem novo pedido.
- **Modelo:** cliente/servidor, assíncrono e orientado a eventos; ambos os lados podem enviar mensagens a qualquer momento.
- **Diferença para REST/polling:** o Participante não precisa consultar o Leiloeiro periodicamente; é notificado na hora.

_(Vantagens, desvantagens e casos de uso em grandes empresas: a preencher no resumo de estudo, verificando na documentação oficial.)_

## 2. Arquitetura da POC

```
 Participante A ──┐
 (máquina 1)      │  WebSocket (JSON)
 Participante B ──┼──────────────────►  Leiloeiro (servidor)
 (máquina 2)      │  ◄──────────────────  - estado do leilão em memória
 Participante C ──┘   push de eventos      - valida e serializa lances
                                           - timer de encerramento
```

| Componente | Responsabilidade |
|---|---|
| **Leiloeiro** | Mantém o estado do leilão (item, lance mínimo, maior lance, vencedor, horário de encerramento). Recebe lances, aceita só os maiores que o atual, responde ao autor e faz *broadcast* a todos. Encerra no horário e anuncia o vencedor. |
| **Participante** | Conecta ao Leiloeiro, consulta o estado, envia lances (CLI interativa) e imprime no console as notificações recebidas. |

**Quem inicia a comunicação:** o Participante abre a conexão; depois disso, ambos enviam mensagens livremente.

**Decisões de design (preliminares):**
- Estado em memória, com *snapshot* simples em arquivo JSON a cada novo maior lance (para o experimento de falha: o maior lance sobrevive ao reinício?).
- Tratamento de lances em um único *event loop*, o que serializa lances simultâneos (base do experimento de concorrência).
- O Leiloeiro é a única fonte de verdade sobre o tempo: usa o relógio dele para o encerramento e envia `remaining_seconds` aos clientes (evita depender dos relógios dos participantes).

**Stack:** Node.js (≥ 20) com JavaScript puro e a biblioteca [`ws`](https://github.com/websockets/ws), que implementa o protocolo WebSocket sem camadas extras. Não usamos Socket.IO porque ele tem protocolo próprio por cima do WebSocket.

**Estrutura do código:**

```
src/protocolo.js               tipos de mensagem, motivos de recusa, encode/decode (RF6)
src/leiloeiro.js               servidor: estado, lances, broadcast, timer, snapshot
src/participante.js            cliente CLI: estado, lances, notificações
experimentos/lances-simultaneos.js   script do experimento RE3
```

## 3. Formato das mensagens (JSON)

Todas as mensagens têm o campo `type`.

**Participante → Leiloeiro**

```json
{"type": "JOIN", "bidder": "joao"}
{"type": "GET_STATE"}
{"type": "BID", "bidder": "joao", "amount": 150.00}
```

**Leiloeiro → Participante**

```json
{"type": "STATE", "item": "Violão", "min_bid": 100.0, "highest_bid": 150.0,
 "highest_bidder": "joao", "remaining_seconds": 87, "status": "OPEN"}
{"type": "BID_RESULT", "accepted": false, "reason": "LOWER_THAN_CURRENT", "highest_bid": 150.0}
{"type": "NEW_HIGHEST_BID", "bidder": "maria", "amount": 160.0, "remaining_seconds": 80}
{"type": "AUCTION_CLOSED", "winner": "maria", "amount": 160.0}
{"type": "ERROR", "message": "AUCTION_CLOSED"}
```

Motivos de recusa previstos: `LOWER_THAN_CURRENT`, `BELOW_MIN_BID`, `AUCTION_CLOSED`, `INVALID_MESSAGE`.

## 4. Mapeamento para os requisitos

| Requisito | Como será atendido |
|---|---|
| RF1 | 1 Leiloeiro + ≥ 2 Participantes em processos distintos |
| RF2 | Item, lance mínimo e duração configuráveis; `GET_STATE` → `STATE` |
| RF3 | `BID` → `BID_RESULT` (aceito/recusado) |
| RF4 | `NEW_HIGHEST_BID` enviado por push a todas as conexões abertas |
| RF5 | Timer no Leiloeiro → status `CLOSED`, recusa novos lances, envia `AUCTION_CLOSED` |
| RF6 | Seção 3 deste README |
| RE1 | Demo com Leiloeiro em uma máquina e Participantes em outra(s) |
| RE2 | Derrubar o Leiloeiro durante o leilão, observar clientes, reiniciar e verificar o maior lance |
| RE3 | Dois Participantes enviam lances quase simultâneos; observar qual é aceito e por quê |
| RE4 | Este repositório, com instruções abaixo |

## 5. Divisão de tarefas

| Integrante | Foco | Entregáveis |
|---|---|---|
| **A — João Avila** | Leiloeiro (núcleo) | Servidor WebSocket, estado do leilão, validação de lances, broadcast (RF2, RF3, RF4) |
| **B — Kauã Cordeiro** | Participante | Cliente CLI: conectar, consultar, dar lance, exibir notificações (RF1, RF4) |
| **C — Luan Capella** | Encerramento, persistência e experimentos | Timer/encerramento (RF5), snapshot em JSON, roteiro e execução de RE2 e RE3 |
| **D — Pedro Evaristo** | Documentação e seminário | README, `IA.md`, diagrama, execução em duas máquinas (RE1), slides, vídeo plano B |

**Todos:** resumo de estudo da tecnologia (Seção 1 e vantagens/desvantagens/casos de uso), e preparo para responder qualquer pergunta sobre o código no seminário.

## 6. Cronograma

| Data | Marco |
|---|---|
| 30/10 | Entrega 1: repositório, roteiro preliminar, primeira comunicação (lance → aceito/recusado) |
| 06/11 | Entrega 2: implementação RF1–RF6, experimentos RE2/RE3, README completo, slides |
| 13/11 | Seminário (10 min + 2 min de perguntas) e formulário individual |

## 7. Como executar

**Pré-requisito:** Node.js 20 ou mais novo em todas as máquinas (`node -v`).

```bash
git clone <url-deste-repositório>
cd leilao-distribuido-websocket
npm install
```

### Máquina 1: Leiloeiro

```bash
npm run leiloeiro -- --novo
```

Configuração opcional por variáveis de ambiente (valores padrão entre parênteses): `PORT` (8080), `ITEM` (Violão), `MIN_BID` (100), `DURATION_SECONDS` (120). Exemplo:

```bash
ITEM="Guitarra" MIN_BID=200 DURATION_SECONDS=180 npm run leiloeiro -- --novo
```

- `--novo` começa um leilão do zero. **Sem** `--novo`, o Leiloeiro continua o leilão salvo em `estado.json` (usado no experimento de falha).
- O servidor escuta em `0.0.0.0`, ou seja, aceita conexões de outras máquinas. Descubra o IP da máquina 1:
  - macOS: `ipconfig getifaddr en0`
  - Linux: `hostname -I`
  - Windows: `ipconfig` (campo "Endereço IPv4")
- Se o sistema perguntar, permita conexões de entrada para o `node`. As máquinas precisam estar na mesma rede.

### Máquina 2 (e outras): Participantes

Um terminal por participante:

```bash
npm run participante -- ws://IP_DA_MAQUINA_1:8080 joao
```

```bash
npm run participante -- ws://IP_DA_MAQUINA_1:8080 maria
```

Comandos no prompt:

| Comando | O que faz |
|---|---|
| `150` (um número) | Dá um lance de 150 (`BID`) |
| `estado` | Consulta o estado do leilão (`GET_STATE`) |
| `sair` ou Ctrl+C | Fecha a conexão |

### Vídeo da demonstração

[`docs/demo-local.mov`](docs/demo-local.mov): gravação de 06/11 com Leiloeiro e Participantes na mesma máquina (funcionamento normal, RE2 e RE3). Serve de plano B para o seminário.

### O que observar na demonstração

1. Ao conectar, cada Participante recebe o estado do leilão (RF2).
2. Um lance abaixo do mínimo ou não maior que o atual é **recusado com o motivo**. Um lance maior é **aceito** (RF3).
3. Quando alguém dá um lance aceito, **os outros Participantes imprimem o novo maior lance sem digitar nada**. Isso é o push do servidor pela conexão aberta, sem polling (RF4).
4. No fim do tempo, todos recebem o vencedor, e lances posteriores são recusados com "leilão encerrado" (RF5).
5. O console do Leiloeiro mostra cada conexão e cada lance numerado na ordem de chegada.

## 8. Experimentos

> Os resultados abaixo foram obtidos **numa única máquina** (localhost), em 06/11, durante o desenvolvimento. **TODO:** repetir com Leiloeiro e Participantes em máquinas diferentes e atualizar esta seção com o que observarmos.

### RE2: falha do Leiloeiro

**Roteiro:**

1. `DURATION_SECONDS=180 npm run leiloeiro -- --novo` e dois Participantes conectados. Dar alguns lances.
2. Matar o Leiloeiro sem aviso: `kill -9 <pid>` (ou fechar o terminal). Ctrl+C também serve.
3. Observar os Participantes.
4. Reiniciar **sem** `--novo`: `npm run leiloeiro`. Conectar os Participantes de novo e digitar `estado`.

**O que aconteceu (local):**

- Os Participantes imprimiram `conexão encerrada (código 1006)` e terminaram. O código **1006** indica fechamento anormal: a conexão TCP caiu sem o frame de close do WebSocket (RFC 6455, seção 7.1.5).
- Ao reiniciar, o Leiloeiro mostrou `estado restaurado de estado.json: maior lance 300 de joao`. O novo Participante viu o **mesmo maior lance** e o **mesmo horário de encerramento** (55 s restantes, contados a partir do `ends_at` gravado), e um lance de 300 foi recusado por não ser maior.

**Por quê:**

- O WebSocket é uma conexão com estado entre dois processos. Se um lado cai, o outro só descobre pelo fechamento da conexão, e **nada reconecta sozinho**: o protocolo não tem reconexão nem reenvio. Lances digitados durante a queda são perdidos.
- O maior lance sobreviveu porque o Leiloeiro grava `estado.json` **antes** de confirmar o lance (escrita síncrona + `rename`, então o arquivo nunca fica pela metade).
- Enquanto o Leiloeiro está fora não existe leilão: ele é um ponto único de falha. Para outro processo assumir seria preciso replicação e eleição de líder (Bully/anel), que estão fora da POC.
- O tempo restante é calculado pelo relógio do Leiloeiro (`ends_at` absoluto). Se ele reiniciar depois do horário, o leilão é encerrado na hora.

### RE3: lances concorrentes

**Roteiro:**

```bash
npm run re3 -- ws://IP_DA_MAQUINA_1:8080 5       # ana e bia oferecem o MESMO valor, 5 rodadas
npm run re3 -- ws://IP_DA_MAQUINA_1:8080 5 10    # bia oferece 10 a mais que ana
```

O script abre duas conexões (`ana` e `bia`) e, em cada rodada, envia os dois lances **no mesmo tick** do event loop. Para comparar com pessoas reais, dois integrantes podem combinar e apertar Enter juntos.

**O que aconteceu (local):**

| Cenário | Resultado em 5 rodadas |
|---|---|
| Mesmo valor (ex.: 100 e 100) | `ana` aceita nas 5; `bia` recusada com `LOWER_THAN_CURRENT` nas 5 |
| `bia` +10 (ex.: 150 e 160) | Os dois aceitos nas 5, em sequência: primeiro 150, depois 160 |

O log do Leiloeiro mostra a ordem de processamento: `lance #1: ana ofereceu 100 -> ACEITO`, `lance #2: bia ofereceu 100 -> LOWER_THAN_CURRENT`, com os dois no mesmo milissegundo.

**Por quê:**

- O Leiloeiro roda num **único event loop**: cada mensagem é tratada inteira (validar, atualizar, gravar, notificar) antes da próxima. Não há duas threads alterando o maior lance ao mesmo tempo, então não existe condição de corrida nem estado inconsistente, e não é preciso lock.
- Vale a **ordem de chegada ao servidor**, não a ordem de envio nem o relógio de quem enviou. Com o mesmo valor, o primeiro a chegar ganha e o segundo deixa de ser "maior que o atual".
- Localmente a `ana` sempre chega primeiro porque o script envia o lance dela primeiro e não há rede no meio. Entre máquinas diferentes, a latência de cada conexão pode inverter a ordem. **TODO:** anotar o que acontece no teste em duas máquinas.
- Os relógios dos participantes não entram na decisão: se entrassem, seria preciso sincronizá-los (Cristian/NTP) ou ordenar por relógio lógico (Lamport).
