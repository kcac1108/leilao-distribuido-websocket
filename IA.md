# Registro de uso de IA

Registro exigido pela Seção 9 da especificação. Ele também é a base do slide **"Uso de IA"** do seminário e vale **10% da nota** (IA.md + slide).

O que a especificação exige:

1. **Registro:** ferramentas usadas, principais prompts e o que foi **aproveitado, adaptado ou descartado**.
2. **Domínio do conteúdo:** todos sabem explicar qualquer parte do código (o professor escolhe quem responde).
3. **Análise crítica:** pelo menos **um caso em que a IA errou** ou sugeriu algo inadequado, e como o grupo percebeu e corrigiu.
4. **Verificação:** o que veio da IA (casos de uso, dados, comparações) foi conferido em documentação oficial ou nas referências da disciplina.

> **Como preencher:** cada integrante adiciona as próprias linhas logo depois de usar a IA. Escrevam o que aconteceu de fato; não completem de memória no fim.
> Status por linha: **Aproveitado** (usado como veio), **Adaptado** (usado com mudanças, diga quais) ou **Descartado** (não usado, diga por quê).

---

## 1. Ferramentas utilizadas

| Ferramenta | Quem usou | Para que foi usada |
|---|---|---|
| Claude Code (Anthropic) | Kauã | Ler a especificação, planejar a Entrega 2 e reestruturar este arquivo |
| _ex.: ChatGPT / Copilot / Gemini_ | | |

## 2. Registro de prompts

Uma linha por uso relevante, em ordem cronológica.

| # | Data | Quem | Ferramenta | Prompt (resumo) | Resultado | Status | O que mudamos / por quê |
|---|---|---|---|---|---|---|---|
| 1 | 30/10 | | | Rascunho do roteiro preliminar da POC a partir da especificação | Arquitetura, formato JSON das mensagens e mapeamento RF/RE no README | _preencher_ | _ex.: trocamos nomes de campos, escolhemos o relógio do Leiloeiro como única fonte de tempo_ |
| 2 | 06/11 | Kauã | Claude Code | "Como seguir para a Entrega 2?" + pedido para reestruturar o IA.md | Checklist da Entrega 2 e esta estrutura do IA.md | Adaptado | _preencher após revisão do grupo_ |
| 3 | 06/11 | Kauã | Claude Code | Implementar a POC em Node.js + `ws` seguindo o plano revisado pelo grupo | `src/`, `experimentos/`, seções 7 e 8 do README | _preencher após revisão do grupo_ | Os testes locais da IA pegaram dois bugs no próprio código dela (prompt após fechar stdin; mensagem `STATE` perdida no script do RE3), corrigidos antes do commit |
| 4 | | | | | | | |

### Por área (preencher conforme o uso)

- **Estudo da tecnologia** (paradigma, vantagens/desvantagens, casos de uso):
- **Leiloeiro / servidor:**
- **Participante / cliente:**
- **Encerramento, persistência e experimentos (RE2/RE3):**
- **README e slides:**

## 3. Casos em que a IA errou ou sugeriu algo inadequado

Obrigatório ter **pelo menos um** caso, e ele vai para o slide. Registrem quando acontecer, com o trecho original sempre que possível.

| # | O que a IA sugeriu | Como percebemos o problema | Como corrigimos | Fonte usada para confirmar |
|---|---|---|---|---|
| 1 | | | | |

**Onde é comum a IA errar neste projeto** (para ficarem atentos, não são casos registrados):

- Tratar **Socket.IO** como se fosse WebSocket puro. O Socket.IO tem protocolo próprio por cima, e um cliente WebSocket comum não conversa com um servidor Socket.IO.
- Dizer que o WebSocket **reconecta sozinho** ou **garante entrega** das mensagens. O protocolo não faz nenhuma das duas coisas: reconexão e reenvio ficam por conta da aplicação.
- Usar API de versão antiga da biblioteca (por exemplo, assinaturas antigas de handler do `websockets` em Python).
- Inventar casos de uso em empresas ou números sem fonte.
- Propor um lock para "resolver a concorrência" quando o event loop de uma única thread já serializa os lances. Isso mostra que o código não foi entendido.

## 4. Verificação em fontes oficiais

| Afirmação / informação | Origem (IA ou outra) | Fonte oficial consultada | Confere? | Observação |
|---|---|---|---|---|
| Handshake via HTTP `Upgrade: websocket` | | RFC 6455, Seções 1.3 e 4 | | |
| Conexão full-duplex e persistente sobre TCP | | RFC 6455, Seção 1 | | |
| Frames de controle ping/pong e close | | RFC 6455, Seções 5.5 e 7 | | |
| Comportamento da biblioteca usada (broadcast, fechamento de conexão) | | Documentação oficial da biblioteca (`websockets` ou `ws`) | | |
| Casos de uso em grandes empresas (slide 2) | | Blog/documentação técnica da própria empresa | | |

Referências da disciplina: slides do Prof. Carlos Paes; Coulouris et al. (2013); Tanenbaum e van Steen (2007).

## 5. Domínio do código

Antes do seminário, cada integrante confirma que sabe explicar cada parte, inclusive as escritas com IA ou por outro colega.

| Parte | João | Kauã | Luan | Pedro |
|---|---|---|---|---|
| Handshake e conexão WebSocket | ☐ | ☐ | ☐ | ☐ |
| Validação de lance e broadcast (RF3/RF4) | ☐ | ☐ | ☐ | ☐ |
| Timer e encerramento (RF5) | ☐ | ☐ | ☐ | ☐ |
| Snapshot JSON e experimento de falha (RE2) | ☐ | ☐ | ☐ | ☐ |
| Por que lances simultâneos não geram conflito (RE3) | ☐ | ☐ | ☐ | ☐ |
| Formato das mensagens (RF6) | ☐ | ☐ | ☐ | ☐ |

## 6. Avaliação do grupo sobre o uso de IA

Escrever no fim, e reaproveitar no slide e no formulário individual:

- **Onde ajudou mais:**
- **Onde atrapalhou ou exigiu mais cuidado:**
- **O que faríamos diferente:**
