import { describe, expect, test } from "vitest"

import { matchesFilters } from "../src/filters.js"
import { formatDiscordEmbed, formatTelegramMessage, formatWhatsappMessage } from "../src/formatters.js"
import { createOffer } from "./fixtures.js"

const noFilters = { platforms: [], minDiscountPercentage: null, keywords: [] }

describe("matchesFilters", () => {
    test("aceita tudo sem filtros", () => {
        expect(matchesFilters(noFilters, createOffer())).toBe(true)
    })

    test("filtra por plataforma", () => {
        expect(matchesFilters({ ...noFilters, platforms: ["amazon"] }, createOffer())).toBe(false)
        expect(matchesFilters({ ...noFilters, platforms: ["shopee"] }, createOffer())).toBe(true)
    })

    test("filtra por desconto mínimo e recusa ofertas sem desconto", () => {
        expect(matchesFilters({ ...noFilters, minDiscountPercentage: 50 }, createOffer())).toBe(false)
        expect(matchesFilters({ ...noFilters, minDiscountPercentage: 40 }, createOffer())).toBe(true)
        expect(
            matchesFilters(
                { ...noFilters, minDiscountPercentage: 10 },
                createOffer({ oldPrice: null, discountPercentage: null }),
            ),
        ).toBe(false)
    })

    test("filtra por palavra-chave ignorando acentos e caixa", () => {
        expect(matchesFilters({ ...noFilters, keywords: ["FONÉ"] }, createOffer())).toBe(true)
        expect(matchesFilters({ ...noFilters, keywords: ["notebook"] }, createOffer())).toBe(false)
    })
})

describe("formatadores", () => {
    test("Telegram usa HTML escapado", () => {
        const message = formatTelegramMessage(createOffer())

        expect(message).toContain("<b>Fone Bluetooth &lt;TWS&gt; &amp; Case</b>")
        expect(message).toContain("De <s>R$ 159,90</s> por <b>R$ 89,90</b> (44% OFF)")
        expect(message).toContain("<code>PROMO10</code>")
        expect(message).toContain('<a href="https://s.shopee.com.br/abc">Comprar na Shopee</a>')
    })

    test("WhatsApp usa a marcação do WhatsApp", () => {
        const message = formatWhatsappMessage(createOffer())

        expect(message).toContain("*Fone Bluetooth <TWS> & Case*")
        expect(message).toContain("De ~R$ 159,90~ por *R$ 89,90*")
        expect(message).toContain("Shopee: https://s.shopee.com.br/abc")
    })

    test("WhatsApp mostra só o preço quando não há desconto", () => {
        const message = formatWhatsappMessage(createOffer({ oldPrice: null, discountPercentage: null, coupons: [] }))

        expect(message).toContain("💸 *R$ 89,90*")
        expect(message).not.toContain("Cupom")
    })

    test("Discord monta um embed com a cor da marca", () => {
        const embed = formatDiscordEmbed(createOffer())

        expect(embed.url).toBe("https://s.shopee.com.br/abc")
        expect(embed.color).toBe(0x7366ff)
        expect(embed.fields).toEqual([{ name: "🎟️ Cupom", value: "`PROMO10`", inline: false }])
        expect(embed.title.length).toBeLessThanOrEqual(256)
    })

    test("Discord corta títulos longos", () => {
        expect(formatDiscordEmbed(createOffer({ title: "x".repeat(400) })).title.length).toBe(256)
    })
})
