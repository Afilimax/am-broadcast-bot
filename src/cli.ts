#!/usr/bin/env node
import { existsSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { parseArgs } from "node:util"

import { exampleConfig, loadConfig } from "./config.js"
import { createBotFromConfig } from "./create-bot.js"
import { consoleLogger } from "./logger.js"
import { WhatsappStrategy } from "./strategies/whatsapp.strategy.js"

const defaultConfigPath = "broadcast-bot.config.json"

const helpText = `Uso: afilimax-broadcast-bot <comando> [--config ${defaultConfigPath}]

Comandos:
  init              Cria um arquivo de configuração de exemplo
  start             Conecta à Afilimax e publica as ofertas nos destinos configurados
  whatsapp:groups   Conecta ao WhatsApp e lista os grupos com o JID de cada um

Variáveis de ambiente (têm prioridade sobre o arquivo):
  AFILIMAX_SERVER_URL, AFILIMAX_BROADCAST_TOKEN, TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN`

async function runInit(configPath: string) {
    if (existsSync(configPath)) throw new Error(`${configPath} já existe`)

    await writeFile(configPath, `${JSON.stringify(exampleConfig, null, 4)}\n`, "utf8")
    consoleLogger.info(`Configuração de exemplo criada em ${configPath}`)
}

async function runStart(configPath: string) {
    const config = await loadConfig(configPath)
    const bot = createBotFromConfig(config)
    const shutdown = async () => {
        consoleLogger.info("Encerrando…")
        await bot.stop()
        process.exit(0)
    }

    bot.on("fatal", () => process.exit(1))
    process.once("SIGINT", shutdown)
    process.once("SIGTERM", shutdown)
    await bot.start()
}

async function runWhatsappGroups(configPath: string) {
    const authDir = existsSync(configPath)
        ? ((await loadConfig(configPath)).strategies.whatsapp?.authDir ?? "./whatsapp-auth")
        : "./whatsapp-auth"
    const whatsapp = new WhatsappStrategy({ authDir: authDir })

    await whatsapp.start()

    const groups = await whatsapp.listGroups()

    for (const currentGroup of groups) {
        console.log(`${currentGroup.id}\t${currentGroup.name} (${currentGroup.participants} participantes)`)
    }

    await whatsapp.stop()
    process.exit(0)
}

async function main() {
    const { positionals, values } = parseArgs({
        allowPositionals: true,
        options: {
            config: { type: "string", short: "c", default: defaultConfigPath },
            help: { type: "boolean", short: "h", default: false },
        },
    })
    const command = positionals[0] ?? "start"
    const configPath = resolve(values.config)

    if (values.help) {
        console.log(helpText)
        return
    }

    if (command === "init") return await runInit(configPath)
    if (command === "start") return await runStart(configPath)
    if (command === "whatsapp:groups") return await runWhatsappGroups(configPath)

    console.log(helpText)
    process.exitCode = 1
}

main().catch((error: unknown) => {
    consoleLogger.error(
        error instanceof Error ? error.message : "Erro inesperado",
        error instanceof Error ? undefined : error,
    )
    process.exit(1)
})
