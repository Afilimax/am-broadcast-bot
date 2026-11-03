import { io, type Socket } from "socket.io-client"

import type { BroadcastOffer } from "./types.js"

export const broadcastEvents = {
    ready: "broadcast.ready",
    offer: "broadcast.offer",
    error: "broadcast.error",
} as const

export interface OfferSourceHandlers {
    onReady(userName: string): void
    onOffer(offer: BroadcastOffer): void
    onDisconnect(reason: string): void
    onError(error: Error, isFatal: boolean): void
}

export interface OfferSource {
    connect(handlers: OfferSourceHandlers): void
    disconnect(): void
}

export interface SocketOfferSourceOptions {
    serverUrl: string
    token: string
}

export class SocketOfferSource implements OfferSource {
    private socket: Socket | null = null

    constructor(private readonly options: SocketOfferSourceOptions) {}

    connect(handlers: OfferSourceHandlers) {
        const namespaceUrl = new URL("/broadcast", this.options.serverUrl).toString()
        const socket = io(namespaceUrl, {
            auth: { token: this.options.token },
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 30000,
        })

        this.socket = socket
        socket.on(broadcastEvents.ready, (payload: { userName: string }) => handlers.onReady(payload.userName))
        socket.on(broadcastEvents.offer, (offer: BroadcastOffer) => handlers.onOffer(offer))
        socket.on(broadcastEvents.error, (payload: { message: string }) =>
            handlers.onError(new Error(payload.message), true),
        )
        socket.on("connect_error", (error) => handlers.onError(error, false))
        socket.on("disconnect", (reason) => handlers.onDisconnect(reason))
    }

    disconnect() {
        this.socket?.disconnect()
        this.socket = null
    }
}
