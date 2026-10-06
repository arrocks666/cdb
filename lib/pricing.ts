// lib/pricing.ts
// Pricing logic. Smooth markup blending at tier boundaries.

export type MarkupTier = {
  min: number;
  max: number;
  multiplier: number;
  label?: string;
};

export type PricingConfig = {
  cnyToUsd: number;
  usdToBdt: number;
  tiers: MarkupTier[];
  roundingStep: number;
};

export const DEFAULT_PRICING: PricingConfig = {
  cnyToUsd: 0.14,
  usdToBdt: 121,
  roundingStep: 1,     // ✅ round to ৳1 (was ৳10 — too coarse)
  tiers: [
    { min: 0,     max: 500,      multiplier: 1.50, label: "0 – ৳500" },
    { min: 500,   max: 2000,     multiplier: 1.35, label: "৳500 – ৳2,000" },
    { min: 2000,  max: 5000,     multiplier: 1.25, label: "৳2,000 – ৳5,000" },
    { min: 5000,  max: 10000,    multiplier: 1.18, label: "৳5,000 – ৳10,000" },
    { min: 10000, max: Infinity, multiplier: 1.12, label: "৳10,000+" },
  ],
};

const MIN_SELLING_PRICE_BDT = 20;

export function cnyToCostBdt(
  priceCny: number,
  config: PricingConfig = DEFAULT_PRICING
): number {
  if (!priceCny || priceCny <= 0) return 0;
  const usd = priceCny * config.cnyToUsd;
  return usd * config.usdToBdt;
}

/**
 * ✅ Returns the effective markup multiplier for a given cost, with
 * smooth interpolation near tier boundaries to avoid price inversions.
 *
 * Example: cost=500 is right at the boundary between 1.5 and 1.35.
 * Instead of jumping straight to 1.35, we blend over a window so the
 * resulting selling price never decreases as cost increases.
 */
export function findMarkupMultiplierSmooth(
  costBdt: number,
  config: PricingConfig = DEFAULT_PRICING
): number {
  const tiers = config.tiers;

  // Find which tier this cost belongs to
  let tierIndex = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (costBdt >= tiers[i].min && costBdt < tiers[i].max) {
      tierIndex = i;
      break;
    }
  }

  const tier = tiers[tierIndex];
  const baseMultiplier = tier.multiplier;

  // ✅ Smooth transition near the END of this tier
  // If we're within 20% of the boundary, blend toward the next tier's multiplier
  if (tierIndex < tiers.length - 1) {
    const nextMultiplier = tiers[tierIndex + 1].multiplier;
    const tierRange = tier.max - tier.min;
    const blendWindow = tierRange * 0.2;  // last 20% of the tier blends
    const blendStart = tier.max - blendWindow;

    if (costBdt >= blendStart && costBdt < tier.max) {
      const t = (costBdt - blendStart) / blendWindow;  // 0 → 1
      return baseMultiplier + (nextMultiplier - baseMultiplier) * t;
    }
  }

  return baseMultiplier;
}

export function findTier(
  costBdt: number,
  config: PricingConfig = DEFAULT_PRICING
): MarkupTier {
  for (const tier of config.tiers) {
    if (costBdt >= tier.min && costBdt < tier.max) return tier;
  }
  return config.tiers[config.tiers.length - 1];
}

export function roundPrice(price: number, step: number): number {
  if (price <= 0) return 0;
  const rounded =
    step <= 1 ? Math.round(price) : Math.round(price / step) * step;
  return Math.max(MIN_SELLING_PRICE_BDT, rounded);
}

export type PriceBreakdown = {
  priceCny: number;
  priceUsd: number;
  costBdt: number;
  markupMultiplier: number;
  markupLabel: string;
  sellingRaw: number;
  sellingBdt: number;
  profit: number;
  marginPercent: number;
};

export function computePrice(
  priceCny: number,
  config: PricingConfig = DEFAULT_PRICING
): PriceBreakdown {
  const priceUsd = priceCny * config.cnyToUsd;
  const costBdt = priceUsd * config.usdToBdt;

  // ✅ Use smooth multiplier so price is always monotonic
  const multiplier = findMarkupMultiplierSmooth(costBdt, config);
  const sellingRaw = costBdt * multiplier;
  const sellingBdt = roundPrice(sellingRaw, config.roundingStep);

  const tier = findTier(costBdt, config);
  const profit = sellingBdt - costBdt;
  const marginPercent = sellingBdt > 0 ? (profit / sellingBdt) * 100 : 0;

  return {
    priceCny,
    priceUsd,
    costBdt,
    markupMultiplier: multiplier,
    markupLabel: tier.label ?? `${tier.min}-${tier.max}`,
    sellingRaw,
    sellingBdt,
    profit,
    marginPercent,
  };
}

export function formatBDTPrice(amount: number): string {
  return `৳${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatCNY(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}