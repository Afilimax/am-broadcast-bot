import type { BroadcastOffer } from "../src/types.js"

export function createOffer(overrides: Partial<BroadcastOffer> = {}): BroadcastOffer {
    return {
        id: "job-1",
        platform: "shopee",
        platformLabel: "Shopee",
        title: "Fone Bluetooth <TWS> & Case",
        price: 89.9,
        oldPrice: 159.9,
        discountPercentage: 44,
        coupons: ["PROMO10"],
        affiliateUrl: "https://s.shopee.com.br/abc",
        originalUrl: "https://shopee.com.br/produto",
        sourceChannelName: "Ofertas",
        createdAt: "2026-11-03T12:00:00.000Z",
        message: "Fone Bluetooth",
        ...overrides,
    }
}
