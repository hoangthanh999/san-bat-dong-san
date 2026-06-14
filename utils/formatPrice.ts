const COMPACT_FALLBACK = 'Thỏa thuận';

function parseVND(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const trimmed = value.trim();
    if (!trimmed) return null;

    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return direct;

    const digitsOnly = Number(trimmed.replace(/[^\d.-]/g, ''));
    return Number.isFinite(digitsOnly) ? digitsOnly : null;
}

function formatDecimal(value: number): string {
    return Number.isInteger(value)
        ? value.toLocaleString('vi-VN')
        : value.toLocaleString('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        });
}

export function formatCompactVND(value: number | string | null | undefined): string {
    const amount = parseVND(value);
    if (!amount || amount <= 0) return COMPACT_FALLBACK;

    if (amount < 1_000_000) {
        return `${formatDecimal(amount / 1_000)} nghìn`;
    }

    if (amount < 1_000_000_000) {
        return `${formatDecimal(amount / 1_000_000)} triệu`;
    }

    return `${formatDecimal(amount / 1_000_000_000)} tỷ`;
}

export function formatFullVND(value: number | string | null | undefined): string {
    const amount = parseVND(value);
    if (!amount || amount <= 0) return COMPACT_FALLBACK;

    return `${amount.toLocaleString('vi-VN')} đ`;
}
