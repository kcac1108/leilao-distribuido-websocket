# Leilão Distribuído com WebSocket

Projeto prático de **Sistemas Distribuídos e Computação Paralela** (PUC-SP, Prof. Carlos Paes) · 2º semestre de 2026
**Grupo 1** · Tecnologia sorteada: **WebSocket**

## Integrantes

- João Avila
- Kauã Cordeiro
- Luan Capella
- Pedro Evaristo

> Status: **Entrega 1 (30/10) — roteiro preliminar**. Código e resultados dos experimentos serão adicionados na Entrega 2 (06/11).

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

**Stack proposta:** a confirmar no grupo. Opção A: Node.js + `ws` (TypeScript). Opção B: Python + `websockets`. Ambas estão entre as ferramentas sugeridas na especificação.

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
| **B — Kauã Cavalheiro** | Participante | Cliente CLI: conectar, consultar, dar lance, exibir notificações (RF1, RF4) |
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

_A preencher na Entrega 2 (comandos, portas, endereços, o que observar na demo)._

## 8. Experimentos

_A preencher na Entrega 2 (falha do Leiloeiro e lances concorrentes)._
