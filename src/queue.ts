import type { Logger } from "./types.js"

export interface SendQueueOptions {
    intervalMs: number
    jitterMs?: number
    maxQueued?: number
    logger?: Logger
}

type QueueState = {
    tail: Promise<void>
    size: number
}

export class SendQueue {
    private readonly queues = new Map<string, QueueState>()
    private readonly intervalMs: number
    private readonly jitterMs: number
    private readonly maxQueued: number
    private readonly logger?: Logger

    constructor(options: SendQueueOptions) {
        this.intervalMs = options.intervalMs
        this.jitterMs = options.jitterMs ?? 0
        this.maxQueued = options.maxQueued ?? 50
        this.logger = options.logger
    }

    enqueue(key: string, task: () => Promise<void>) {
        const queue = this.queues.get(key) ?? { tail: Promise.resolve(), size: 0 }

        if (queue.size >= this.maxQueued) {
            this.logger?.warn(`Fila de ${key} cheia: oferta descartada`)
            return false
        }

        queue.size += 1
        queue.tail = queue.tail
            .then(task)
            .catch((error: unknown) => this.logger?.error(`Falha ao enviar para ${key}`, error))
            .then(() => this.wait(this.intervalMs + Math.floor(Math.random() * (this.jitterMs + 1))))
            .finally(() => {
                queue.size -= 1

                if (queue.size === 0) this.queues.delete(key)
            })
        this.queues.set(key, queue)

        return true
    }

    getQueuedCount(key: string) {
        return this.queues.get(key)?.size ?? 0
    }

    async drain() {
        await Promise.all([...this.queues.values()].map((currentQueue) => currentQueue.tail))
    }

    private wait(milliseconds: number) {
        return new Promise<void>((resolve) => setTimeout(resolve, milliseconds).unref())
    }
}
