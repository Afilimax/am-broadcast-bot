<a href="https://afilimax.net"><img src="https://raw.githubusercontent.com/Afilimax/.github/main/assets/npm-banner.svg" alt="Afilimax — Encontre a oferta. Gere o link. Divulgue sozinho." width="100%" /></a>

[![npm version](https://img.shields.io/npm/v/%40afilimax%2Fbroadcast-bot?logo=npm)](https://www.npmjs.com/package/@afilimax/broadcast-bot)
[![npm downloads](https://img.shields.io/npm/dm/%40afilimax%2Fbroadcast-bot?logo=npm)](https://www.npmjs.com/package/@afilimax/broadcast-bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Afilimax/am-broadcast-bot/blob/HEAD/LICENSE)
[![Website](https://img.shields.io/badge/website-afilimax.net-7857FF)](https://afilimax.net)

# @afilimax/broadcast-bot

Bot de divulgação open source da Afilimax. Ele recebe ofertas com seus links de afiliado pelo WebSocket `/broadcast` e publica nos seus canais e grupos do Telegram, WhatsApp e Discord, na sua própria máquina ou servidor.

## Recursos

- Recebimento de ofertas em tempo real pelo WebSocket da Afilimax.
- Publicação no Telegram, WhatsApp e Discord.
- Filtros por plataforma, desconto mínimo e palavras-chave.
- Filas independentes por destino, com intervalo e variação entre envios.
- Pausa de destinos que se tornam indisponíveis.
- Uso pelo executável `afilimax-broadcast-bot` ou como biblioteca TypeScript.
- Tokens e sessão do WhatsApp mantidos no ambiente onde o bot é executado.

O bot distribui ofertas, mas não gera links. Para isso, o Afilimax Link Builder precisa estar aberto e conectado. Para o Telegram, a plataforma também oferece um bot hospedado que pode ser adicionado ao canal pelo painel.

## Instalação

Requisitos:

- Node.js 20.18 ou mais recente.
- Assinatura ativa da Afilimax e Link Builder conectado.
- Token de divulgação iniciado por `amb_`.
- Credenciais das estratégias que serão utilizadas.

Instalação global:

```bash
npm install -g @afilimax/broadcast-bot
```

Também é possível executar sem instalação global:

```bash
npx @afilimax/broadcast-bot --help
```

## Como usar

Crie uma configuração de exemplo:

```bash
afilimax-broadcast-bot init
```

Edite `broadcast-bot.config.json` e inicie o bot:

```bash
afilimax-broadcast-bot start
```

Para indicar outro arquivo, use `--config <path>` ou `-c <path>`.

### Token de divulgação

O token de divulgação é separado dos tokens do Link Builder e permite apenas ler suas ofertas. Gere ou substitua o token pela API da Afilimax, autenticado com sua sessão:

```http
POST /broadcast/token/rotate
Authorization: Bearer <your-access-token>
```

A resposta apresenta o token completo uma única vez. A rotação invalida o token anterior e desconecta os bots que o utilizavam.

### Configuração por estratégia

**Telegram**

1. Crie um bot no [@BotFather](https://t.me/BotFather) e copie o token.
2. Adicione o bot como administrador do canal ou grupo, com permissão para publicar.
3. Use o ID do chat como `target`. Em canais públicos, `@channel_name` também é aceito.

**WhatsApp**

1. Configure `strategies.whatsapp` e execute `afilimax-broadcast-bot whatsapp:groups`.
2. Leia o QR Code em **WhatsApp > Aparelhos conectados > Conectar aparelho**.
3. Copie o JID do grupo ou canal para `target`.
4. Execute `start`. A sessão fica salva em `authDir`.

A integração usa [Baileys](https://github.com/WhiskeySockets/Baileys), uma biblioteca não oficial. O WhatsApp pode restringir números que enviam mensagens automáticas; use intervalos adequados e envie somente para quem deseja receber as ofertas.

**Discord**

1. Crie uma aplicação e um bot no [Discord Developer Portal](https://discord.com/developers/applications).
2. Convide o bot com permissões para ver canais, enviar mensagens e inserir links.
3. Ative o modo desenvolvedor, copie o ID do canal e use-o como `target`.

### Uso como biblioteca

```typescript
import { BroadcastBot, TelegramStrategy } from "@afilimax/broadcast-bot"

const bot = new BroadcastBot({
    serverUrl: "https://ws.afilimax.net",
    token: process.env.AFILIMAX_BROADCAST_TOKEN!,
    strategies: [new TelegramStrategy({ botToken: process.env.TELEGRAM_BOT_TOKEN! })],
    destinations: [
        {
            strategy: "telegram",
            target: "-1001234567890",
            platforms: [],
            minDiscountPercentage: 20,
            keywords: [],
        },
    ],
})

bot.on("sent", (destination, offer) => {
    console.log(`Sent to ${destination.target}: ${offer.title}`)
})
bot.on("fatal", (error) => {
    console.error("Fatal broadcast error:", error)
    process.exit(1)
})

await bot.start()
```

## Configuração

Exemplo de `broadcast-bot.config.json`:

```json
{
    "serverUrl": "https://ws.afilimax.net",
    "token": "amb_your_broadcast_token",
    "strategies": {
        "telegram": { "botToken": "your-telegram-bot-token" },
        "discord": { "botToken": "your-discord-bot-token" },
        "whatsapp": { "authDir": "./whatsapp-auth" }
    },
    "destinations": [
        { "strategy": "telegram", "target": "-1001234567890", "name": "Deals channel" },
        { "strategy": "whatsapp", "target": "120363000000000000@g.us", "name": "VIP group", "minDiscountPercentage": 30 },
        { "strategy": "discord", "target": "123456789012345678", "name": "#deals", "platforms": ["amazon", "shopee"] }
    ]
}
```

Configure somente as estratégias utilizadas. Cada destino exige que sua estratégia correspondente exista em `strategies`.

| Campo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `serverUrl` | `string` | Obrigatório | URL do WebSocket da Afilimax. |
| `token` | `string` | Obrigatório | Token de divulgação iniciado por `amb_`. |
| `maxQueuedPerDestination` | `number` | `50` | Máximo de ofertas na fila de cada destino. |
| `strategies.telegram.botToken` | `string` | Opcional | Token do bot do Telegram. |
| `strategies.discord.botToken` | `string` | Opcional | Token do bot do Discord. |
| `strategies.whatsapp.authDir` | `string` | `"./whatsapp-auth"` | Diretório da sessão do WhatsApp. |
| `strategies.*.sendIntervalMs` | `number` | Telegram `3000`; Discord `1500`; WhatsApp `8000` | Intervalo entre envios, em milissegundos. |
| `strategies.whatsapp.sendJitterMs` | `number` | `4000` | Variação aleatória máxima somada ao intervalo. |

### Destinos e filtros

| Campo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `strategy` | `StrategyName` | Obrigatório | `telegram`, `discord` ou `whatsapp`. |
| `target` | `string` | Obrigatório | ID do chat ou canal, `@channel_name` ou JID do WhatsApp. |
| `name` | `string` | Opcional | Nome usado nos logs. |
| `platforms` | `Platform[]` | `[]` | Lista de plataformas aceitas; vazio aceita todas. |
| `minDiscountPercentage` | `number \| null` | `null` | Desconto mínimo inteiro entre `1` e `99`. |
| `keywords` | `string[]` | `[]` | Palavras que podem aparecer no título; vazio aceita todos. |

As plataformas disponíveis são `amazon`, `mercado_livre`, `shopee`, `aliexpress` e `magazine_luiza`. A comparação de palavras-chave ignora acentos e diferenças entre maiúsculas e minúsculas.

### Variáveis de ambiente

Estas variáveis têm prioridade sobre o arquivo:

| Variável | Campo substituído |
| :--- | :--- |
| `AFILIMAX_SERVER_URL` | `serverUrl` |
| `AFILIMAX_BROADCAST_TOKEN` | `token` |
| `TELEGRAM_BOT_TOKEN` | `strategies.telegram.botToken` |
| `DISCORD_BOT_TOKEN` | `strategies.discord.botToken` |

## Comandos

| Comando | Finalidade |
| :--- | :--- |
| `afilimax-broadcast-bot init` | Cria um arquivo de configuração de exemplo. |
| `afilimax-broadcast-bot start` | Conecta à Afilimax e publica as ofertas. |
| `afilimax-broadcast-bot whatsapp:groups` | Conecta ao WhatsApp e lista grupos com seus JIDs. |
| `afilimax-broadcast-bot --help` | Exibe a ajuda do CLI. |

Todos aceitam `--config <path>` ou `-c <path>`; o padrão é `broadcast-bot.config.json`.

## Referência da API

### `new BroadcastBot(options)`

| Opção | Tipo | Descrição |
| :--- | :--- | :--- |
| `serverUrl` | `string` | URL da Afilimax; obrigatória quando `source` não é informada. |
| `token` | `string` | Token de divulgação; obrigatório quando `source` não é informada. |
| `source` | `OfferSource` | Fonte personalizada de ofertas. |
| `strategies` | `BroadcastStrategy[]` | Estratégias de envio registradas. |
| `destinations` | `Destination[]` | Destinos e filtros de publicação. |
| `maxQueuedPerDestination` | `number` | Limite opcional da fila por destino. |
| `logger` | `Logger` | Logger personalizado. |

Métodos públicos: `start()`, `stop()`, `drain()` e `handleOffer(offer)`.

Eventos: `ready`, `offer`, `sent`, `failed` e `fatal`.

### Estratégias personalizadas

Implemente `BroadcastStrategy` com `name`, `sendIntervalMs`, `sendJitterMs`, `start()`, `stop()` e `send(target, offer)`. Lance `TargetUnavailableError` quando o destino deixar de existir; o bot pausará esse destino até ser reiniciado.

### Eventos do WebSocket

Para integrar sem este pacote, conecte com Socket.IO no namespace `/broadcast`, enviando o token em `auth.token`.

| Evento | Conteúdo |
| :--- | :--- |
| `broadcast.ready` | `{ userName }`. |
| `broadcast.offer` | Oferta com título, preços, desconto, cupons, URLs, plataforma e mensagem pronta. |
| `broadcast.error` | `{ message }`; a conexão é encerrada em seguida. |

## Desenvolvimento

Instale as dependências com `npm install`. Os scripts disponíveis são:

| Comando | Finalidade |
| :--- | :--- |
| `npm run dev` | Executa `src/cli.ts start` com `tsx`. |
| `npm start` | Executa `dist/cli.js start`. |
| `npm run build` | Compila o TypeScript para `dist/`. |
| `npm test` | Executa os testes com Vitest. |
| `npm run test:watch` | Executa os testes em modo de observação. |
| `npm run test:cov` | Executa os testes com cobertura. |
| `npm run lint` | Executa o ESLint com correção automática. |
| `npm run format` | Formata os arquivos de `src/` e `__tests__/` com Prettier. |

## Licença

Distribuído sob a licença [MIT](./LICENSE).

---

## Automatize sua operação de afiliados

> Use este pacote para automatizar sua operação de afiliados. Conheça a plataforma Afilimax e transforme ofertas em links e divulgação automática.

[Conheça a Afilimax](https://afilimax.net) · [Pacote no npm](https://www.npmjs.com/package/@afilimax/broadcast-bot) · [Repositório no GitHub](https://github.com/Afilimax/am-broadcast-bot)
