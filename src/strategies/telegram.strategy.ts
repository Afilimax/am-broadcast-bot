import { Telegraf, TelegramError } from "telegraf"

import { formatTelegramMessage } from "../formatters.js"
import type { BroadcastOffer } from "../types.js"
import { getOfferUrl } from "../utils/format.js"
import { TargetUnavailableError, type BroadcastStrategy } from "./strategy.js"

export interface TelegramStrategyOptions {
    botToken: string
    sendIntervalMs?: number
}

export class TelegramStrategy implements BroadcastStrategy {
    readonly name = "telegram" as const
    readonly sendIntervalMs: number
    readonly sendJitterMs = 0
    private readonly bot: Telegraf

    constructor(options: TelegramStrategyOptions) {
        this.bot = new Telegraf(options.botToken)
        this.sendIntervalMs = options.sendIntervalMs ?? 3000
    }

    async start() {
        await this.bot.telegram.getMe()
    }

    async stop() {}

    async send(target: string, offer: BroadcastOffer) {
        const url = getOfferUrl(offer)
        const replyMarkup = {
            inline_keyboard: [
                [
                    {
                        text: `🛒 Comprar na ${offer.platformLabel}`,
                        url: url,
                    },
                ],
            ],
        }

        await this.sendWithRetry(target, formatTelegramMessage(offer), replyMarkup, true)
    }

    private async sendWithRetry(
        target: string,
        html: string,
        replyMarkup: { inline_keyboard: { text: string; url: string }[][] },
        canRetry: boolean,
    ): Promise<void> {
        try {
            await this.bot.telegram.sendMessage(target, html, {
                parse_mode: "HTML",
                reply_markup: replyMarkup,
            })
        } catch (error) {
            if (!(error instanceof TelegramError)) throw error

            const retryAfterSeconds = error.parameters?.retry_after

            if (error.code === 429 && retryAfterSeconds && canRetry) {
                await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000))
                return await this.sendWithRetry(target, html, replyMarkup, false)
            }

            if (error.code === 403 || (error.code === 400 && /chat not found/i.test(error.description))) {
                throw new TargetUnavailableError(target, error.description)
            }

            throw error
        }
    }
}
