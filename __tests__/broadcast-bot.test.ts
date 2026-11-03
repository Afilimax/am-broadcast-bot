import { describe, expect, test, vi } from "vitest"

import { BroadcastBot } from "../src/broadcast-bot.js"
import { silentLogger } from "../src/logger.js"
import type { OfferSource, OfferSourceHandlers } from "../src/offer-source.js"
import { SendQueue } from "../src/queue.js"
import { TargetUnavailableError, type BroadcastStrategy } from "../src/strategies/strategy.js"
import type { Destination } from "../src/types.js"
import { createOffer } from "./fixtures.js"

class FakeSource implements OfferSource {
    handlers: OfferSourceHandlers | null = null
    connect = vi.fn((handlers: OfferSourceHandlers) => {
        this.handlers = handlers
    })
    disconnect = vi.fn()
}

const createStrategy = (name: BroadcastStrategy["name"], send = vi.fn(async () => undefined)) => ({
    name: name,
    sendIntervalMs: 0,
    sendJitterMs: 0,
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    send: send,
})

const destination = (overrides: Partial<Destination> = {}): Destination => ({
    strategy: "telegram",
    target: "-100",
    platforms: [],
    minDiscountPercentage: null,
    keywords: [],
    ...overrides,
})

describe("BroadcastBot", () => {
    test("inicia as estratégias e envia as ofertas aos destinos que passam no filtro", async () => {
        const source = new FakeSource()
        const telegram = createStrategy("telegram")
        const bot = new BroadcastBot({
            source: source,
            strategies: [telegram],
            destinations: [destination(), destination({ target: "-200", platforms: ["amazon"] })],
            logger: silentLogger,
        })

        await bot.start()
        source.handlers!.onOffer(createOffer())
        await bot.drain()

        expect(telegram.start).toHaveBeenCalled()
        expect(telegram.send).toHaveBeenCalledTimes(1)
        expect(telegram.send).toHaveBeenCalledWith("-100", expect.objectContaining({ id: "job-1" }))
    })

    test("pausa o destino que não existe mais", async () => {
        const source = new FakeSource()
        const send = vi.fn(async () => Promise.reject(new TargetUnavailableError("-100", "kicked")))
        const telegram = createStrategy("telegram", send)
        const bot = new BroadcastBot({
            source: source,
            strategies: [telegram],
            destinations: [destination()],
            logger: silentLogger,
        })
        const failed = vi.fn()

        bot.on("failed", failed)
        await bot.start()
        source.handlers!.onOffer(createOffer())
        await bot.drain()
        source.handlers!.onOffer(createOffer({ id: "job-2" }))
        await bot.drain()

        expect(send).toHaveBeenCalledTimes(1)
        expect(failed).toHaveBeenCalledTimes(1)
    })

    test("emite fatal quando a Afilimax recusa o token", async () => {
        const source = new FakeSource()
        const bot = new BroadcastBot({
            source: source,
            strategies: [createStrategy("telegram")],
            destinations: [destination()],
            logger: silentLogger,
        })
        const fatal = vi.fn()

        bot.on("fatal", fatal)
        await bot.start()
        source.handlers!.onError(new Error("Token inválido"), true)

        expect(fatal).toHaveBeenCalledWith(expect.objectContaining({ message: "Token inválido" }))
    })

    test("exige estratégia para cada destino", () => {
        expect(
            () =>
                new BroadcastBot({
                    source: new FakeSource(),
                    strategies: [createStrategy("telegram")],
                    destinations: [destination({ strategy: "discord" })],
                    logger: silentLogger,
                }),
        ).toThrow(/discord/)
    })

    test("para a fonte e as estratégias", async () => {
        const source = new FakeSource()
        const telegram = createStrategy("telegram")
        const bot = new BroadcastBot({
            source: source,
            strategies: [telegram],
            destinations: [destination()],
            logger: silentLogger,
        })

        await bot.stop()

        expect(source.disconnect).toHaveBeenCalled()
        expect(telegram.stop).toHaveBeenCalled()
    })
})

describe("SendQueue", () => {
    test("envia em ordem, um por vez, por destino", async () => {
        const queue = new SendQueue({ intervalMs: 0, logger: silentLogger })
        const executionOrder: string[] = []

        queue.enqueue("a", async () => {
            executionOrder.push("start-1")
            await new Promise((resolve) => setTimeout(resolve, 5))
            executionOrder.push("end-1")
        })
        queue.enqueue("a", async () => {
            executionOrder.push("start-2")
        })
        await queue.drain()

        expect(executionOrder).toEqual(["start-1", "end-1", "start-2"])
    })

    test("descarta quando a fila está cheia", () => {
        const queue = new SendQueue({ intervalMs: 0, maxQueued: 1, logger: silentLogger })

        expect(queue.enqueue("a", async () => undefined)).toBe(true)
        expect(queue.enqueue("a", async () => undefined)).toBe(false)
    })
})
