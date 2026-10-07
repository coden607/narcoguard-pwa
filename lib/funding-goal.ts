// The public fundraising goal: 80 prototype units at the current candidate BOM model shown on /watch
// (components $325.40 + assembly $35 + quality testing $25 + compliance testing $15 + packaging $8
// + naloxone refill $42 = $450.40 per unit). Update this together with the BOM on app/watch/page.tsx,
// the GoFundMe campaign (marketing/GOFUNDME_CAMPAIGN.md) and marketing/campaign-config.json.
// It funds prototype builds and testing; it does not promise devices to anyone.
export const PROTOTYPE_UNITS = 80
export const PROTOTYPE_UNIT_COST = 450.4
export const FUNDING_GOAL = Math.round(PROTOTYPE_UNITS * PROTOTYPE_UNIT_COST) // 36,032
export const formatUsd = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
