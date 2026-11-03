import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    type WASocket,
} from "baileys"
import pino from "pino"
import qrcode from "qrcode-terminal"

import { formatWhatsappMessage } from "../formatters.js"
import { consoleLogger } from "../logger.js"
import type { BroadcastOffer, Logger } from "../types.js"
import { TargetUnavailableError, type BroadcastStrategy } from "./strategy.js"

export interface WhatsappStrategyOptions {
    authDir: string
    sendIntervalMs?: number
    sendJitterMs?: number
    logger?: Logger
}

export interface WhatsappGroup {
    id: string
    name: string
    participants: number
}

const reconnectDelayMs = 5000

export class WhatsappStrategy implements BroadcastStrategy {
    readonly name = "whatsapp" as const
    readonly sendIntervalMs: number
    readonly sendJitterMs: number
    private readonly authDir: string
    private readonly logger: Logger
    private socket: WASocket | null = null
    private isStopping = false

    constructor(options: WhatsappStrategyOptions) {
        this.authDir = options.authDir
        this.sendIntervalMs = options.sendIntervalMs ?? 8000
        this.sendJitterMs = options.sendJitterMs ?? 4000
        this.logger = options.logger ?? consoleLogger
    }

    async start() {
        this.isStopping = false
        await this.connect()
    }

    async stop() {
        this.isStopping = true
        this.socket?.end(undefined)
        this.socket = null
    }

    async send(target: string, offer: BroadcastOffer) {
        if (!this.socket) throw new Error("WhatsApp desconectado")

        if (!/@(g\.us|newsletter|s\.whatsapp\.net)$/.test(target)) {
            throw new TargetUnavailableError(target, "use o JID do grupo (…@g.us) ou do canal (…@newsletter)")
        }

        await this.socket.sendMessage(target, { text: formatWhatsappMessage(offer) })
    }

    async listGroups(): Promise<WhatsappGroup[]> {
        if (!this.socket) throw new Error("WhatsApp desconectado")

        const groups = await this.socket.groupFetchAllParticipating()

        return Object.values(groups)
            .map((currentGroup) => ({
                id: currentGroup.id,
                name: currentGroup.subject,
                participants: currentGroup.participants.length,
            }))
            .sort((first, second) => first.name.localeCompare(second.name))
    }

    private async connect() {
        const { state, saveCreds } = await useMultiFileAuthState(this.authDir)
        const { version } = await fetchLatestBaileysVersion()

        await new Promise<void>((resolve, reject) => {
            const socket = makeWASocket({
                version: version,
                auth: state,
                logger: pino({ level: "silent" }),
                markOnlineOnConnect: false,
                syncFullHistory: false,
            })

            this.socket = socket
            socket.ev.on("creds.update", saveCreds)
            socket.ev.on("connection.update", (update) => {
                if (update.qr) {
                    this.logger.info(
                        "Escaneie o QR Code abaixo no WhatsApp (Aparelhos conectados > Conectar aparelho):",
                    )
                    qrcode.generate(update.qr, { small: true })
                }

                if (update.connection === "open") {
                    this.logger.info("WhatsApp conectado")
                    resolve()
                }

                if (update.connection === "close") {
                    const statusCode = (
                        update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
                    )?.output?.statusCode

                    if (statusCode === DisconnectReason.loggedOut) {
                        this.socket = null
                        this.logger.error("Sessão do WhatsApp encerrada pelo aparelho")
                        reject(
                            new Error(
                                `Sessão do WhatsApp encerrada. Apague a pasta ${this.authDir} e conecte de novo.`,
                            ),
                        )
                        return
                    }

                    if (this.isStopping) return

                    this.logger.warn(`WhatsApp desconectado (código ${statusCode ?? "desconhecido"}), reconectando…`)
                    setTimeout(() => {
                        this.connect().then(resolve, reject)
                    }, reconnectDelayMs)
                }
            })
        })
    }
}
