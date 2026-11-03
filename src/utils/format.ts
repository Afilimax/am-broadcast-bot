const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export function formatCurrency(value: number) {
    return currencyFormatter.format(value).replace(/ /g, " ")
}

export function normalizeSearchText(value: string) {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim()
}

export function escapeHtml(value: string) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

export function hasDiscount(offer: { oldPrice: number | null; discountPercentage: number | null }) {
    return offer.oldPrice !== null && offer.discountPercentage !== null
}
