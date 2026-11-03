import type { BroadcastOffer } from "./types.js"
import { escapeHtml, formatCurrency, hasDiscount, truncate } from "./utils/format.js"

export function formatTelegramMessage(offer: BroadcastOffer) {
    const priceLine = hasDiscount(offer)
        ? `💸 De <s>${formatCurrency(offer.oldPrice!)}</s> por <b>${formatCurrency(offer.price)}</b> (${offer.discountPercentage}% OFF)`
        : `💸 <b>${formatCurrency(offer.price)}</b>`
    const couponLine =
        offer.coupons.length > 0
            ? `🎟️ Cupom: ${offer.coupons.map((currentCoupon) => `<code>${escapeHtml(currentCoupon)}</code>`).join(", ")}`
            : null

    return [
        `🔥 <b>${escapeHtml(offer.title)}</b>`,
        "",
        priceLine,
        couponLine,
        `🛒 <a href="${escapeHtml(offer.affiliateUrl)}">Comprar na ${escapeHtml(offer.platformLabel)}</a>`,
    ]
        .filter((currentLine) => currentLine !== null)
        .join("\n")
}

export function formatWhatsappMessage(offer: BroadcastOffer) {
    const priceLine = hasDiscount(offer)
        ? `💸 De ~${formatCurrency(offer.oldPrice!)}~ por *${formatCurrency(offer.price)}* (${offer.discountPercentage}% OFF)`
        : `💸 *${formatCurrency(offer.price)}*`
    const couponLine =
        offer.coupons.length > 0
            ? `🎟️ Cupom: ${offer.coupons.map((currentCoupon) => `\`${currentCoupon}\``).join(", ")}`
            : null

    return [`🔥 *${offer.title}*`, "", priceLine, couponLine, `🛒 ${offer.platformLabel}: ${offer.affiliateUrl}`]
        .filter((currentLine) => currentLine !== null)
        .join("\n")
}

export interface DiscordEmbedData {
    title: string
    url: string
    description: string
    color: number
    fields: { name: string; value: string; inline: boolean }[]
    footer: { text: string }
    timestamp: string
}

export const discordBrandColor = 0x7366ff

export function formatDiscordEmbed(offer: BroadcastOffer): DiscordEmbedData {
    const description = hasDiscount(offer)
        ? `De ~~${formatCurrency(offer.oldPrice!)}~~ por **${formatCurrency(offer.price)}** (${offer.discountPercentage}% OFF)`
        : `**${formatCurrency(offer.price)}**`
    const fields =
        offer.coupons.length > 0
            ? [
                  {
                      name: "🎟️ Cupom",
                      value: offer.coupons.map((currentCoupon) => `\`${currentCoupon}\``).join(", "),
                      inline: false,
                  },
              ]
            : []

    return {
        title: truncate(`🔥 ${offer.title}`, 256),
        url: offer.affiliateUrl,
        description: `${description}\n\n[🛒 Comprar na ${offer.platformLabel}](${offer.affiliateUrl})`,
        color: discordBrandColor,
        fields: fields,
        footer: { text: offer.platformLabel },
        timestamp: offer.createdAt,
    }
}
