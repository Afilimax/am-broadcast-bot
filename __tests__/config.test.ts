import { describe, expect, test } from "vitest"

import { exampleConfig, parseConfig } from "../src/config.js"

const baseConfig = {
    serverUrl: "http://localhost:3003",
    token: "amb_abc",
    strategies: { telegram: { botToken: "telegram-token" } },
    destinations: [{ strategy: "telegram", target: "-100123" }],
}

describe("parseConfig", () => {
    test("aplica os valores padrão dos filtros", () => {
        const config = parseConfig(baseConfig, {})

        expect(config.destinations[0]).toEqual({
            strategy: "telegram",
            target: "-100123",
            platforms: [],
            minDiscountPercentage: null,
            keywords: [],
        })
        expect(config.maxQueuedPerDestination).toBe(50)
    })

    test("variáveis de ambiente têm prioridade sobre o arquivo", () => {
        const config = parseConfig(
            { ...baseConfig, strategies: { telegram: {} } },
            {
                AFILIMAX_SERVER_URL: "https://backend.exemplo.com",
                AFILIMAX_BROADCAST_TOKEN: "amb_do_ambiente",
                TELEGRAM_BOT_TOKEN: "token-do-ambiente",
            },
        )

        expect(config.serverUrl).toBe("https://backend.exemplo.com")
        expect(config.token).toBe("amb_do_ambiente")
        expect(config.strategies.telegram?.botToken).toBe("token-do-ambiente")
    })

    test("ativa a estratégia só com a variável de ambiente", () => {
        const config = parseConfig(
            { ...baseConfig, strategies: {}, destinations: [{ strategy: "discord", target: "1" }] },
            { DISCORD_BOT_TOKEN: "discord-token" },
        )

        expect(config.strategies.discord?.botToken).toBe("discord-token")
    })

    test("exige que a estratégia de cada destino esteja configurada", () => {
        expect(() =>
            parseConfig({ ...baseConfig, destinations: [{ strategy: "whatsapp", target: "1@g.us" }] }, {}),
        ).toThrow(/whatsapp não está configurada/)
    })

    test("recusa a chave do Link Builder no lugar do token de divulgação", () => {
        expect(() => parseConfig({ ...baseConfig, token: "dev_chave" }, {})).toThrow(/amb_/)
    })

    test("o exemplo gerado pelo init é uma configuração válida", () => {
        expect(() => parseConfig(exampleConfig, {})).not.toThrow()
    })
})
