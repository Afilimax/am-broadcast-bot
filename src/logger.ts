import type { Logger } from "./types.js"

function timestamp() {
    return new Date().toISOString()
}

export const consoleLogger: Logger = {
    info(message) {
        console.log(`[${timestamp()}] ${message}`)
    },
    warn(message) {
        console.warn(`[${timestamp()}] ⚠️ ${message}`)
    },
    error(message, error) {
        const detail = error instanceof Error ? `: ${error.message}` : error ? `: ${String(error)}` : ""

        console.error(`[${timestamp()}] ❌ ${message}${detail}`)
    },
}

export const silentLogger: Logger = {
    info() {},
    warn() {},
    error() {},
}
