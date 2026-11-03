import { readFile } from "node:fs/promises"

import { z } from "zod"

import { platforms, strategyNames } from "./types.js"

const destinationSchema = z.object({
    strategy: z.enum(strategyNames),
    target: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    platforms: z.array(z.enum(platforms)).default([]),
    minDiscountPercentage: z.number().int().min(1).max(99).nullable().default(null),
    keywords: z.array(z.string().trim().min(1)).default([]),
})

export const configSchema = z
    .object({
        serverUrl: z.url(),
        token: z.string().startsWith("amb_", "O token de divulgação começa com amb_"),
        maxQueuedPerDestination: z.number().int().min(1).default(50),
        strategies: z
            .object({
                telegram: z
                    .object({ botToken: z.string().min(1), sendIntervalMs: z.number().int().min(0).optional() })
                    .optional(),
                discord: z
                    .object({ botToken: z.string().min(1), sendIntervalMs: z.number().int().min(0).optional() })
                    .optional(),
                whatsapp: z
                    .object({
                        authDir: z.string().min(1).default("./whatsapp-auth"),
                        sendIntervalMs: z.number().int().min(0).optional(),
                        sendJitterMs: z.number().int().min(0).optional(),
                    })
                    .optional(),
            })
            .default({}),
        destinations: z.array(destinationSchema).min(1, "Configure pelo menos um destino"),
    })
    .superRefine((config, context) => {
        config.destinations.forEach((currentDestination, index) => {
            if (!config.strategies[currentDestination.strategy]) {
                context.addIssue({
                    code: "custom",
                    path: ["destinations", index, "strategy"],
                    message: `A estratégia ${currentDestination.strategy} não está configurada em "strategies"`,
                })
            }
        })
    })

export type BroadcastBotConfig = z.infer<typeof configSchema>

type Environment = Record<string, string | undefined>

export function applyEnvironment(rawConfig: unknown, environment: Environment): unknown {
    const config = (typeof rawConfig === "object" && rawConfig !== null ? rawConfig : {}) as Record<string, unknown>
    const strategies = (config.strategies ?? {}) as Record<string, Record<string, unknown> | undefined>
    const withBotToken = (strategy: Record<string, unknown> | undefined, token: string | undefined) => {
        if (!strategy && !token) return strategy

        return { ...strategy, botToken: strategy?.botToken ?? token }
    }

    return {
        ...config,
        serverUrl: environment.AFILIMAX_SERVER_URL ?? config.serverUrl,
        token: environment.AFILIMAX_BROADCAST_TOKEN ?? config.token,
        strategies: {
            ...strategies,
            telegram: withBotToken(strategies.telegram, environment.TELEGRAM_BOT_TOKEN),
            discord: withBotToken(strategies.discord, environment.DISCORD_BOT_TOKEN),
        },
    }
}

export function parseConfig(rawConfig: unknown, environment: Environment = process.env): BroadcastBotConfig {
    const result = configSchema.safeParse(applyEnvironment(rawConfig, environment))

    if (!result.success) {
        const details = result.error.issues
            .map((currentIssue) => `- ${currentIssue.path.join(".") || "config"}: ${currentIssue.message}`)
            .join("\n")

        throw new Error(`Configuração inválida:\n${details}`)
    }

    return result.data
}

export async function loadConfig(path: string, environment: Environment = process.env) {
    const content = await readFile(path, "utf8")

    return parseConfig(JSON.parse(content), environment)
}

export const exampleConfig = {
    serverUrl: "http://localhost:3003",
    token: "amb_seu_token_de_divulgacao",
    strategies: {
        telegram: { botToken: "token do @BotFather" },
        discord: { botToken: "token do Discord Developer Portal" },
        whatsapp: { authDir: "./whatsapp-auth" },
    },
    destinations: [
        { strategy: "telegram", target: "-1001234567890", name: "Canal de ofertas" },
        { strategy: "whatsapp", target: "120363000000000000@g.us", name: "Grupo VIP", minDiscountPercentage: 30 },
        { strategy: "discord", target: "123456789012345678", name: "#ofertas", platforms: ["amazon", "shopee"] },
    ],
}
