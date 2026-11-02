// The one list of overdose steps, shared by the emergency modal and the bystander page (#272), so
// the two can never disagree. Changes here need clinical review.
export const OVERDOSE_STEPS = [
  "Call 911. Say the person is not breathing or won't wake up.",
  "Give naloxone (Narcan): one spray in one nostril.",
  "If you are trained, give rescue breaths: one every 5 seconds.",
  "No response after 2–3 minutes? Give a second dose in the other nostril.",
  "If they are breathing, roll them onto their side (recovery position).",
  "Stay with them. Naloxone can wear off before the opioid does.",
] as const
