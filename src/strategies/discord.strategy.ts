import { Client, DiscordAPIError, GatewayIntentBits } from "discord.js"

import { formatDiscordEmbed } from "../formatters.js"
import type { BroadcastOffer } from "../types.js"
import { TargetUnavailableError, type BroadcastStrategy } from "./strategy.js"

export interface DiscordStrategyOptions {
    botToken: string
    sendIntervalMs?: number
}

const unavailableErrorCodes = new Set([10003, 50001, 50013])

export class DiscordStrategy implements BroadcastStrategy {
    readonly name = "discord" as const
    readonly sendIntervalMs: number
    readonly sendJitterMs = 0
    private readonly client = new Client({ intents: [GatewayIntentBits.Guilds] })
    private readonly botToken: string

    constructor(options: DiscordStrategyOptions) {
        this.botToken = options.botToken
        this.sendIntervalMs = options.sendIntervalMs ?? 1500
    }

    async start() {
        const ready = new Promise<void>((resolve) => this.client.once("clientReady", () => resolve()))

        await this.client.login(this.botToken)
        await ready
    }

    async stop() {
        await this.client.destroy()
    }

    async send(target: string, offer: BroadcastOffer) {
        try {
            const channel = await this.client.channels.fetch(target)

            if (!channel || !channel.isSendable()) {
                throw new TargetUnavailableError(target, "o canal não existe ou não aceita mensagens")
            }

            await channel.send({ embeds: [formatDiscordEmbed(offer)] })
        } catch (error) {
            if (
                error instanceof DiscordAPIError &&
                typeof error.code === "number" &&
                unavailableErrorCodes.has(error.code)
            ) {
                throw new TargetUnavailableError(target, error.message)
            }

            throw error
        }
    }
}
