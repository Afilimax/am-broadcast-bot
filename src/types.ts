export const platforms = ["amazon", "mercado_livre", "shopee", "aliexpress", "magazine_luiza"] as const

export type Platform = (typeof platforms)[number]

export const strategyNames = ["telegram", "discord", "whatsapp"] as const

export type StrategyName = (typeof strategyNames)[number]

export interface BroadcastOffer {
    id: string
    platform: Platform
    platformLabel: string
    title: string
    price: number
    oldPrice: number | null
    discountPercentage: number | null
    coupons: string[]
    affiliateUrl: string
    originalUrl: string
    sourceChannelName: string
    createdAt: string
    message: string
}

export interface DestinationFilters {
    platforms: Platform[]
    minDiscountPercentage: number | null
    keywords: string[]
}

export interface Destination extends DestinationFilters {
    strategy: StrategyName
    target: string
    name?: string
}

export interface Logger {
    info(message: string): void
    warn(message: string): void
    error(message: string, error?: unknown): void
}
