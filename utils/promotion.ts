type PromotionFields = {
    isPromoted?: boolean | null;
    promotionExpiresAt?: string | null;
    promotionPackageName?: string | null;
    createdAt?: string | null;
    price?: number | null;
};

type SortMode = 'newest' | 'price_asc' | 'price_desc' | 'nearest' | undefined;

const toTime = (value?: string | null) => {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
};

const compareNewest = (a: PromotionFields, b: PromotionFields) => toTime(b.createdAt) - toTime(a.createdAt);

const comparePrice = (a: PromotionFields, b: PromotionFields, direction: 'asc' | 'desc') => {
    const priceA = Number(a.price);
    const priceB = Number(b.price);

    if (!Number.isFinite(priceA) && !Number.isFinite(priceB)) return compareNewest(a, b);
    if (!Number.isFinite(priceA)) return 1;
    if (!Number.isFinite(priceB)) return -1;

    const diff = direction === 'asc' ? priceA - priceB : priceB - priceA;
    return diff || compareNewest(a, b);
};

export const isActivePromotion = (item: PromotionFields) => {
    if (item.isPromoted !== true) return false;

    const expiresAt = toTime(item.promotionExpiresAt);
    if (!expiresAt) return true;

    return expiresAt > Date.now();
};

export const getPromotionBadgeLabel = (item: PromotionFields) => {
    if (!isActivePromotion(item)) return null;
    return item.promotionPackageName || 'VIP';
};

export const sortFeaturedFirst = <T extends PromotionFields>(items: T[], sortMode?: SortMode): T[] => (
    items
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const promotedA = isActivePromotion(a.item);
            const promotedB = isActivePromotion(b.item);

            if (promotedA !== promotedB) return promotedA ? -1 : 1;

            let result = 0;
            if (sortMode === 'price_asc') {
                result = comparePrice(a.item, b.item, 'asc');
            } else if (sortMode === 'price_desc') {
                result = comparePrice(a.item, b.item, 'desc');
            } else {
                result = compareNewest(a.item, b.item);
            }

            return result || a.index - b.index;
        })
        .map(({ item }) => item)
);
