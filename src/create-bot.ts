import { BroadcastBot } from "./broadcast-bot.js"
import type { BroadcastBotConfig } from "./config.js"
import { consoleLogger } from "./logger.js"
import { DiscordStrategy } from "./strategies/discord.strategy.js"
import type { BroadcastStrategy } from "./strategies/strategy.js"
import { TelegramStrategy } from "./strategies/telegram.strategy.js"
import { WhatsappStrategy } from "./strategies/whatsapp.strategy.js"
import type { Logger } from "./types.js"

export function createStrategies(config: BroadcastBotConfig, logger: Logger = consoleLogger) {
    const usedStrategies = new Set(config.destinations.map((currentDestination) => currentDestination.strategy))
    const strategies: BroadcastStrategy[] = []

    if (usedStrategies.has("telegram") && config.strategies.telegram) {
        strategies.push(new TelegramStrategy(config.strategies.telegram))
    }

    if (usedStrategies.has("discord") && config.strategies.discord) {
        strategies.push(new DiscordStrategy(config.strategies.discord))
    }

    if (usedStrategies.has("whatsapp") && config.strategies.whatsapp) {
        strategies.push(new WhatsappStrategy({ ...config.strategies.whatsapp, logger: logger }))
    }

    return strategies
}

export function createBotFromConfig(config: BroadcastBotConfig, logger: Logger = consoleLogger) {
    return new BroadcastBot({
        serverUrl: config.serverUrl,
        token: config.token,
        strategies: createStrategies(config, logger),
        destinations: config.destinations,
        maxQueuedPerDestination: config.maxQueuedPerDestination,
        logger: logger,
    })
}
