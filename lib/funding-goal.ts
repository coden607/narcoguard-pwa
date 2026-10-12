// Public Rev 5 development-and-validation planning target.
// This is not a supplier quote, preorder target, or promise to manufacture a fixed number of watches.
// See marketing/campaign-config.json for the planning allocation.
export const FUNDING_GOAL = 75_000

// Legacy estimate retained only for historical/reference calculations in older code paths.
// Do not use these values to describe the current campaign goal or promise a prototype count.
export const PROTOTYPE_UNITS = 80
export const PROTOTYPE_UNIT_COST = 450.4

export const formatUsd = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
