import type { BroadcastOffer, StrategyName } from "../types.js"

export interface BroadcastStrategy {
    readonly name: StrategyName
    readonly sendIntervalMs: number
    readonly sendJitterMs: number
    start(): Promise<void>
    stop(): Promise<void>
    send(target: string, offer: BroadcastOffer): Promise<void>
}

export class TargetUnavailableError extends Error {
    constructor(
        readonly target: string,
        reason: string,
    ) {
        super(`Destino ${target} indisponível: ${reason}`)
        this.name = "TargetUnavailableError"
    }
}
