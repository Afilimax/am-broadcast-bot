import { describe, expect, test } from "vitest"

import * as broadcastBot from "../src/index.js"

describe("exports públicos", () => {
    test("expõe o bot, as estratégias e os utilitários", () => {
        expect(typeof broadcastBot.BroadcastBot).toBe("function")
        expect(typeof broadcastBot.TelegramStrategy).toBe("function")
        expect(typeof broadcastBot.DiscordStrategy).toBe("function")
        expect(typeof broadcastBot.WhatsappStrategy).toBe("function")
        expect(typeof broadcastBot.loadConfig).toBe("function")
        expect(broadcastBot.strategyNames).toEqual(["telegram", "discord", "whatsapp"])
    })
})
