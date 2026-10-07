// The five Maslow levels as NarcoGuard presents them on /about and in the first-run introduction.
// A planning aid only: every kind of help stays available at every level. Find Help groups resources
// by NEED_LEVELS in lib/resource-finder.ts; keep these titles consistent with it (levels 4 and 5 both
// map to its "Growth and goals" group).

export const MASLOW_LEVELS = [
  {
    id: "physiological",
    title: "1. Body and basic needs",
    covers: "Food, water, a place to sleep, toilets, showers and laundry.",
    links: [{ href: "/help", label: "Find Help: search your needs nearby" }, { href: "/stability", label: "Guardian planner: daily needs check-in" }],
  },
  {
    id: "safety",
    title: "2. Safety and health",
    covers: "Overdose response, naloxone, clinics, pharmacies and emergency rooms.",
    links: [{ href: "/", label: "Dashboard: emergency steps and 911" }, { href: "/ar", label: "Training: overdose and CPR guides" }, { href: "/help", label: "Find Help: clinics, pharmacies, emergency rooms" }],
  },
  {
    id: "belonging",
    title: "3. Recovery and connection",
    covers: "Treatment, someone to talk to, peer support, community spaces and people you trust.",
    links: [{ href: "/help", label: "Find Help: treatment and community" }, { href: "/angel", label: "Angel AI: talk it through" }, { href: "/contacts", label: "Emergency contacts you choose" }, { href: "/hero-signup", label: "Hero Network: train to help others" }],
  },
  {
    id: "esteem",
    title: "4. Stability and independence",
    covers: "Work, income, internet and phone charging, and skills you can be proud of.",
    links: [{ href: "/help", label: "Find Help: job help and libraries" }, { href: "/hero-signup", label: "Hero certification" }],
  },
  {
    id: "growth",
    title: "5. Growth and your own goals",
    covers: "The goals you choose, broken into small steps you can take tomorrow.",
    links: [{ href: "/stability", label: "Guardian planner: goals and tomorrow's task" }, { href: "/angel", label: "Angel AI: turn a goal into steps" }, { href: "/constitution", label: "Help shape NarcoGuard" }],
  },
] as const
