# @afilimax/broadcast-bot

Bot de divulgação open source da [Afilimax](https://afilimax.net). Ele se conecta ao WebSocket da Afilimax, recebe em tempo real as ofertas já convertidas em **links de afiliado seus** e publica cada uma nos seus canais e grupos do **Telegram**, **WhatsApp** e **Discord**.

Você roda o bot na sua máquina ou servidor: os tokens dos bots e a sessão do WhatsApp ficam com você.

> Prefere não hospedar nada? Para o Telegram, a Afilimax também tem um bot pronto: é só adicioná-lo ao seu canal pelo painel.

## Como funciona

1. O app desktop **Afilimax Link Builder** gera os links de afiliado com as suas credenciais.
2. A Afilimax envia cada link aceito para este bot pelo WebSocket `/broadcast`.
3. O bot aplica os filtros de cada destino e publica a oferta, respeitando um intervalo entre envios para não ser bloqueado.

Os links só existem enquanto o app desktop estiver aberto e conectado. O bot distribui as ofertas, mas não as gera.

## Requisitos

- Node.js 20.18 ou mais recente
- Assinatura ativa da Afilimax e o app desktop conectado
- Um **token de divulgação** (começa com `amb_`)
- Credenciais da estratégia que você for usar:
  - **Telegram:** token de um bot criado no [@BotFather](https://t.me/BotFather), adicionado como administrador do canal ou grupo
  - **Discord:** token de um bot criado no [Discord Developer Portal](https://discord.com/developers/applications), convidado para o servidor com permissão de enviar mensagens e embeds
  - **WhatsApp:** um número de WhatsApp para conectar por QR Code

### Como gerar o token de divulgação

O token é separado da chave de API do app desktop e só permite **ler** as suas ofertas. Gere ou troque o token pela API da Afilimax, autenticado com a sua sessão:

```http
POST /broadcast/token/rotate
Authorization: Bearer <seu access token>
```

A resposta traz o token completo **uma única vez**. Gerar um novo token invalida o anterior e desconecta os bots que usavam o antigo.

## Instalação

```bash
npm install -g @afilimax/broadcast-bot
```

Ou rode sem instalar, com `npx @afilimax/broadcast-bot`.

## Uso rápido

```bash
afilimax-broadcast-bot init
```

Isso cria um `broadcast-bot.config.json` de exemplo. Edite-o e inicie:

```bash
afilimax-broadcast-bot start
```

Comandos disponíveis:

| Comando | O que faz |
|---|---|
| `init` | Cria um arquivo de configuração de exemplo |
| `start` | Conecta à Afilimax e publica as ofertas nos destinos configurados |
| `whatsapp:groups` | Conecta ao WhatsApp e lista os grupos com o JID de cada um |

Use `--config caminho/arquivo.json` (ou `-c`) para indicar outro arquivo.

## Configuração

```json
{
    "serverUrl": "https://ws.afilimax.net",
    "token": "amb_seu_token_de_divulgacao",
    "strategies": {
        "telegram": { "botToken": "token do @BotFather" },
        "discord": { "botToken": "token do Discord Developer Portal" },
        "whatsapp": { "authDir": "./whatsapp-auth" }
    },
    "destinations": [
        { "strategy": "telegram", "target": "-1001234567890", "name": "Canal de ofertas" },
        { "strategy": "whatsapp", "target": "120363000000000000@g.us", "name": "Grupo VIP", "minDiscountPercentage": 30 },
        { "strategy": "discord", "target": "123456789012345678", "name": "#ofertas", "platforms": ["amazon", "shopee"] }
    ]
}
```

| Campo | Descrição |
|---|---|
| `serverUrl` | URL do WebSocket da Afilimax (`https://ws.afilimax.net`; o painel mostra o valor certo) |
| `token` | Token de divulgação (`amb_…`) |
| `maxQueuedPerDestination` | Máximo de ofertas na fila de cada destino antes de descartar. Padrão: `50` |
| `strategies.telegram.botToken` | Token do bot do Telegram |
| `strategies.discord.botToken` | Token do bot do Discord |
| `strategies.whatsapp.authDir` | Pasta onde a sessão do WhatsApp é salva. Padrão: `./whatsapp-auth` |
| `strategies.*.sendIntervalMs` | Intervalo entre envios no mesmo destino. Padrões: Telegram 3 s, Discord 1,5 s, WhatsApp 8 s |
| `strategies.whatsapp.sendJitterMs` | Variação aleatória somada ao intervalo do WhatsApp. Padrão: 4 s |

Configure só as estratégias que você usa. Cada destino precisa que a estratégia dele esteja em `strategies`.

### Destinos e filtros

| Campo | Descrição |
|---|---|
| `strategy` | `telegram`, `discord` ou `whatsapp` |
| `target` | Telegram: ID do chat (ex.: `-1001234567890`) ou `@canal`. Discord: ID do canal. WhatsApp: JID do grupo (`…@g.us`) ou do canal (`…@newsletter`) |
| `name` | Nome para identificar o destino nos logs (opcional) |
| `platforms` | Só envia ofertas dessas lojas: `amazon`, `mercado_livre`, `shopee`, `aliexpress`, `magazine_luiza`. Vazio envia todas |
| `minDiscountPercentage` | Só envia ofertas com pelo menos esse desconto (1 a 99). Ofertas sem preço anterior são ignoradas |
| `keywords` | Só envia ofertas cujo título contém alguma dessas palavras (sem diferenciar acentos e maiúsculas) |

### Variáveis de ambiente

Para não deixar segredos no arquivo, você pode passar estes valores por variável de ambiente. Elas têm prioridade sobre o arquivo:

| Variável | Substitui |
|---|---|
| `AFILIMAX_SERVER_URL` | `serverUrl` |
| `AFILIMAX_BROADCAST_TOKEN` | `token` |
| `TELEGRAM_BOT_TOKEN` | `strategies.telegram.botToken` |
| `DISCORD_BOT_TOKEN` | `strategies.discord.botToken` |

## Guia por estratégia

### Telegram

1. Crie o bot no [@BotFather](https://t.me/BotFather) e copie o token.
2. Adicione o bot como **administrador** do canal ou grupo, com permissão de postar.
3. Use o ID do chat como `target`. Em canais públicos, `@nome_do_canal` também funciona.

### WhatsApp

1. Configure `strategies.whatsapp` e rode `afilimax-broadcast-bot whatsapp:groups`.
2. Escaneie o QR Code em **WhatsApp > Aparelhos conectados > Conectar aparelho**.
3. Copie o JID dos grupos listados (`…@g.us`) para os seus destinos.
4. Rode `start`. A sessão fica salva em `authDir` e não pede QR Code de novo.

> **Atenção:** a integração usa o [Baileys](https://github.com/WhiskeySockets/Baileys), uma biblioteca **não oficial**. O WhatsApp pode restringir ou banir números que enviam mensagens automáticas. Prefira um número dedicado, mantenha intervalos generosos e envie só para grupos onde as pessoas querem receber ofertas. O uso é por sua conta e risco.

### Discord

1. Crie uma aplicação no [Discord Developer Portal](https://discord.com/developers/applications), adicione um bot e copie o token.
2. Convide o bot para o servidor com as permissões **Ver canais**, **Enviar mensagens** e **Inserir links**.
3. Ative o **Modo desenvolvedor** no Discord, clique com o botão direito no canal e copie o ID para usar como `target`.

## Uso como biblioteca

```ts
import { BroadcastBot, TelegramStrategy } from "@afilimax/broadcast-bot"

const bot = new BroadcastBot({
    serverUrl: "https://ws.afilimax.net",
    token: process.env.AFILIMAX_BROADCAST_TOKEN!,
    strategies: [new TelegramStrategy({ botToken: process.env.TELEGRAM_BOT_TOKEN! })],
    destinations: [
        { strategy: "telegram", target: "-1001234567890", platforms: [], minDiscountPercentage: 20, keywords: [] },
    ],
})

bot.on("sent", (destination, offer) => console.log(`Enviado para ${destination.target}: ${offer.title}`))
bot.on("fatal", () => process.exit(1))

await bot.start()
```

Para criar uma estratégia própria, implemente a interface `BroadcastStrategy` (`name`, `sendIntervalMs`, `sendJitterMs`, `start`, `stop` e `send`). Lance `TargetUnavailableError` quando o destino não existir mais, e o bot pausa esse destino.

### Eventos do WebSocket

Para integrar sem este pacote, conecte com o [Socket.IO](https://socket.io/) no namespace `/broadcast`, enviando o token em `auth.token`:

| Evento | Payload |
|---|---|
| `broadcast.ready` | `{ userName }` |
| `broadcast.offer` | Oferta com `title`, `price`, `oldPrice`, `discountPercentage`, `coupons`, `affiliateUrl`, `trackingUrl` (link curto que conta os cliques nas métricas), `platform`, `platformLabel` e `message` (texto pronto para enviar) |
| `broadcast.error` | `{ message }`. A conexão é encerrada em seguida |

## Desenvolvimento

```bash
npm install
npm run dev        # roda o CLI com tsx
npm run test:run   # testes com Vitest
npm run lint
npm run build
```

## Licença

[MIT](./LICENSE)
