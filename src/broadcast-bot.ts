import { EventEmitter } from "node:events"

import { matchesFilters } from "./filters.js"
import { consoleLogger } from "./logger.js"
import { SocketOfferSource, type OfferSource } from "./offer-source.js"
import { SendQueue } from "./queue.js"
import { TargetUnavailableError, type BroadcastStrategy } from "./strategies/strategy.js"
import type { BroadcastOffer, Destination, Logger, StrategyName } from "./types.js"

export interface BroadcastBotOptions {
    serverUrl?: string
    token?: string
    source?: OfferSource
    strategies: BroadcastStrategy[]
    destinations: Destination[]
    maxQueuedPerDestination?: number
    logger?: Logger
}

export interface BroadcastBotEvents {
    ready: [userName: string]
    offer: [offer: BroadcastOffer]
    sent: [destination: Destination, offer: BroadcastOffer]
    failed: [destination: Destination, offer: BroadcastOffer, error: unknown]
    fatal: [error: Error]
}

export class BroadcastBot extends EventEmitter<BroadcastBotEvents> {
    private readonly source: OfferSource
    private readonly strategies: Map<StrategyName, BroadcastStrategy>
    private readonly queues: Map<StrategyName, SendQueue>
    private readonly destinations: Destination[]
    private readonly disabledTargets = new Set<string>()
    private readonly logger: Logger

    constructor(options: BroadcastBotOptions) {
        super()

        if (!options.source && (!options.serverUrl || !options.token)) {
            throw new Error("Informe serverUrl e token, ou uma source própria")
        }

        this.logger = options.logger ?? consoleLogger
        this.source = options.source ?? new SocketOfferSource({ serverUrl: options.serverUrl!, token: options.token! })
        this.strategies = new Map(options.strategies.map((currentStrategy) => [currentStrategy.name, currentStrategy]))
        this.destinations = options.destinations
        this.queues = new Map(
            options.strategies.map((currentStrategy) => [
                currentStrategy.name,
                new SendQueue({
                    intervalMs: currentStrategy.sendIntervalMs,
                    jitterMs: currentStrategy.sendJitterMs,
                    maxQueued: options.maxQueuedPerDestination,
                    logger: this.logger,
                }),
            ]),
        )

        const missingStrategies = this.destinations
            .map((currentDestination) => currentDestination.strategy)
            .filter((currentStrategy) => !this.strategies.has(currentStrategy))

        if (missingStrategies.length > 0) {
            throw new Error(`Estratégias sem configuração: ${[...new Set(missingStrategies)].join(", ")}`)
        }
    }

    async start() {
        for (const currentStrategy of this.strategies.values()) {
            await currentStrategy.start()
            this.logger.info(`Estratégia ${currentStrategy.name} pronta`)
        }

        this.source.connect({
            onReady: (userName) => {
                this.logger.info(`Conectado à Afilimax como ${userName}. Aguardando ofertas…`)
                this.emit("ready", userName)
            },
            onOffer: (offer) => this.handleOffer(offer),
            onDisconnect: (reason) => this.logger.warn(`Desconectado da Afilimax (${reason})`),
            onError: (error, isFatal) => {
                if (isFatal) {
                    this.logger.error("A Afilimax recusou a conexão", error)
                    this.emit("fatal", error)
                    return
                }

                this.logger.warn(`Falha de conexão com a Afilimax: ${error.message}. Tentando de novo…`)
            },
        })
    }

    async stop() {
        this.source.disconnect()

        for (const currentStrategy of this.strategies.values()) {
            await currentStrategy.stop()
        }
    }

    async drain() {
        await Promise.all([...this.queues.values()].map((currentQueue) => currentQueue.drain()))
    }

    handleOffer(offer: BroadcastOffer) {
        this.emit("offer", offer)

        for (const currentDestination of this.destinations) {
            const destinationKey = this.getDestinationKey(currentDestination)

            if (this.disabledTargets.has(destinationKey) || !matchesFilters(currentDestination, offer)) continue

            this.queues
                .get(currentDestination.strategy)!
                .enqueue(destinationKey, () => this.deliver(currentDestination, offer))
        }
    }

    private async deliver(destination: Destination, offer: BroadcastOffer) {
        const strategy = this.strategies.get(destination.strategy)!

        try {
            await strategy.send(destination.target, offer)
            this.emit("sent", destination, offer)
        } catch (error) {
            if (error instanceof TargetUnavailableError) {
                this.disabledTargets.add(this.getDestinationKey(destination))
                this.logger.error(`${error.message}. Este destino foi pausado até reiniciar o bot`)
            } else {
                this.logger.error(
                    `Falha ao enviar "${offer.title}" para ${destination.name ?? destination.target}`,
                    error,
                )
            }

            this.emit("failed", destination, offer, error)
        }
    }

    private getDestinationKey(destination: Destination) {
        return `${destination.strategy}:${destination.target}`
    }
}
