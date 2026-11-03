import type { BroadcastOffer, DestinationFilters } from "./types.js"
import { normalizeSearchText } from "./utils/format.js"

export function matchesFilters(filters: DestinationFilters, offer: BroadcastOffer) {
    if (filters.platforms.length > 0 && !filters.platforms.includes(offer.platform)) return false

    if (filters.minDiscountPercentage !== null) {
        if (offer.discountPercentage === null || offer.discountPercentage < filters.minDiscountPercentage) {
            return false
        }
    }

    if (filters.keywords.length > 0) {
        const normalizedTitle = normalizeSearchText(offer.title)

        return filters.keywords.some((currentKeyword) => normalizedTitle.includes(normalizeSearchText(currentKeyword)))
    }

    return true
}
