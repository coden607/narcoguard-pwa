const axios = require("axios")
const fs = require("fs")
const path = require("path")

const configPath = path.join(__dirname, "../marketing/campaign-config.json")
const config = JSON.parse(fs.readFileSync(configPath, "utf8"))

const campaignThemes = [
  {
    day: 1,
    key: "launch",
    title: "Live demo and funding launch",
    hook: "The app is live and the watch blueprint is public.",
    story:
      "NarcoGuard now has a live PWA demo, investor-facing engineering pages, and a clear path to pilot deployment in Broome County.",
    proof: "The production build is live, the PWA installs, and the watch concept page shows realistic candidate parts with explicit validation status.",
    cta: "Try the app and support the pilot.",
    visual: "Homepage + watch blueprint split-screen",
    hashtags: ["NarcoGuard", "SaveLives", "HarmReduction", "BroomeCounty"],
  },
  {
    day: 2,
    key: "hero-network",
    title: "Community response network",
    hook: "A wearable is only useful if help can reach the user fast.",
    story:
      "The Hero Network concept connects emergency contacts, nearby responders, and recovery support into one coordinated flow.",
    proof: "The app already includes onboarding, contacts, naloxone locations, and an emergency response path.",
    cta: "Share this with community organizers and local responders.",
    visual: "Hero network diagram and onboarding flow",
    hashtags: ["HeroNetwork", "OverdosePrevention", "CommunityCare"],
  },
  {
    day: 3,
    key: "recovery",
    title: "Recovery resources on the wrist",
    hook: "Prevention is not enough without recovery support.",
    story:
      "NarcoGuard pairs overdose response with recovery resources, support routing, and practical next steps for people who need help right now.",
    proof: "The app surfaces treatment, support, and follow-up flows instead of treating the device like a one-purpose widget.",
    cta: "Help us reach people who need support before the next crisis.",
    visual: "Recovery resources screen and support cards",
    hashtags: ["RecoverySupport", "AddictionRecovery", "RatPark"],
  },
  {
    day: 4,
    key: "share-request",
    title: "Share request",
    hook: "Distribution improves when the message is repeated in the right places.",
    story:
      "A single share can move the project from private buildout into public awareness, donations, and introductions to local partners.",
    proof: "The app is ready to demonstrate, the blueprint is public, and the campaign links are live.",
    cta: "Share the demo with one person who actually understands community health.",
    visual: "Short demo clip + donation card",
    hashtags: ["ShareToSaveLives", "CommunitySupport", "NarcoGuard"],
  },
  {
    day: 5,
    key: "technology",
    title: "Technology spotlight",
    hook: "This is not a generic smartwatch mockup.",
    story:
      "The concept page shows an engineering stack built around commercially available processors, sensors, and connectivity parts that could support a real prototype path.",
    proof: "The blueprint now labels candidate parts, component callouts, and development status instead of pretending the device is already certified.",
    cta: "Use this when talking to technical partners or investors.",
    visual: "Blueprint diagram with part-number callouts",
    hashtags: ["MedicalTechnology", "Smartwatch", "HealthTech", "Innovation"],
  },
  {
    day: 6,
    key: "local",
    title: "Local community focus",
    hook: "Broome County is the point of origin and the first deployment target.",
    story:
      "The campaign is framed around a specific community so the project can be measured, tested, and improved in one place before scaling.",
    proof: "The site and marketing materials are localized for Binghamton and Broome County users.",
    cta: "Tag local groups, advocates, and people who can help with distribution.",
    visual: "Local map + funding progress",
    hashtags: ["Binghamton", "BroomeCounty", "LocalSupport", "NarcoGuard"],
  },
  {
    day: 7,
    key: "weekly-recap",
    title: "Weekly recap",
    hook: "The work is iterative and public.",
    story:
      "Each weekly cycle should show visible progress: product, blueprint, installability, production readiness, and funding traction.",
    proof: "The build is verified and the production alias is live.",
    cta: "Use this post to summarize progress and restate the mission.",
    visual: "Progress dashboard + install prompt",
    hashtags: ["WeekOneDown", "Grateful", "KeepSharing", "NarcoGuard"],
  },
]

const platformRules = {
  x: {
    label: "X/Twitter",
    maxLength: 280,
    cadence: [0, 1, 2, 3, 4, 5, 6],
    hashtagCount: 3,
    style: "compact",
  },
  facebook: {
    label: "Facebook",
    maxLength: 900,
    cadence: [0, 1, 2, 3, 4, 5, 6],
    hashtagCount: 4,
    style: "story",
  },
  instagram: {
    label: "Instagram",
    maxLength: 1200,
    cadence: [0, 1, 2, 3, 4, 5, 6],
    hashtagCount: 8,
    style: "caption",
  },
  linkedin: {
    label: "LinkedIn",
    maxLength: 1400,
    cadence: [1, 3, 5],
    hashtagCount: 2,
    style: "professional",
  },
  reddit: {
    label: "Reddit",
    maxLength: 2400,
    cadence: [2, 4, 6],
    hashtagCount: 0,
    style: "community",
  },
  tiktok: {
    label: "TikTok",
    maxLength: 600,
    cadence: [0, 2, 4, 6],
    hashtagCount: 4,
    style: "shortform",
  },
  youtube: {
    label: "YouTube Shorts",
    maxLength: 800,
    cadence: [1, 4, 6],
    hashtagCount: 3,
    style: "shorts",
  },
}

function getCampaignDay() {
  const forceDay = process.env.FORCE_DAY
  if (forceDay) {
    const parsed = Number.parseInt(forceDay, 10)
    if (!Number.isNaN(parsed) && parsed > 0) return parsed
  }

  const startDate = new Date(config.campaign.startDate || "2025-01-01")
  const today = new Date()
  const diffMs = today.getTime() - startDate.getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  return (diffDays % campaignThemes.length) + 1
}

function currentDateStamp() {
  return new Date().toISOString().split("T")[0]
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function trimText(text, maxLength) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function pickHashtags(theme, count) {
  const merged = [...theme.hashtags, ...config.social.hashtags.primary, ...config.social.hashtags.secondary]
  const unique = Array.from(new Set(merged.map((tag) => tag.replace(/^#/, ""))))
  return unique.slice(0, count).map((tag) => `#${tag}`).join(" ")
}

function formatLinks() {
  return [config.links.app, config.links.gofundme].filter(Boolean)
}

function renderTwitter(theme) {
  const hashtags = pickHashtags(theme, platformRules.x.hashtagCount)
  const text = [
    `NarcoGuard NG: ${theme.hook}`,
    theme.proof,
    `${theme.cta} ${formatLinks().join(" | ")}`,
    hashtags,
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.x.maxLength)
}

function renderFacebook(theme) {
  const hashtags = pickHashtags(theme, platformRules.facebook.hashtagCount)
  const text = [
    `NarcoGuard NG update: ${theme.title}`,
    "",
    theme.story,
    "",
    theme.proof,
    "",
    `${theme.cta} ${formatLinks().join(" | ")}`,
    hashtags,
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.facebook.maxLength)
}

function renderInstagram(theme) {
  const hashtags = pickHashtags(theme, platformRules.instagram.hashtagCount)
  const text = [
    `NarcoGuard NG ${theme.title}`,
    "",
    theme.hook,
    theme.story,
    "",
    theme.proof,
    "",
    `Visual: ${theme.visual}`,
    "",
    `${theme.cta} ${config.links.app}`,
    hashtags,
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.instagram.maxLength)
}

function renderLinkedIn(theme) {
  const hashtags = pickHashtags(theme, platformRules.linkedin.hashtagCount)
  const text = [
    `NarcoGuard NG | ${theme.title}`,
    "",
    theme.story,
    "",
    `Engineering note: ${theme.proof}`,
    "",
    `This release is focused on practical execution, credible parts, and clear validation status. ${theme.cta}`,
    "",
    `${config.links.app} | ${config.links.gofundme}`,
    hashtags,
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.linkedin.maxLength)
}

function renderReddit(theme) {
  const body = [
    `Title: NarcoGuard NG - ${theme.title}`,
    "",
    "Context:",
    theme.story,
    "",
    "Why this matters:",
    theme.proof,
    "",
    "What I am asking for:",
    theme.cta,
    "",
    `Links: ${config.links.app} | ${config.links.gofundme}`,
    "",
    "Disclosure: this is a public prototype/demo and the blueprint page is marked as a concept design until validation is complete.",
  ]
    .join("\n")
  return trimText(body, platformRules.reddit.maxLength)
}

function renderTikTok(theme) {
  const hashtags = pickHashtags(theme, platformRules.tiktok.hashtagCount)
  const text = [
    `Hook: ${theme.hook}`,
    `Scene 1: Show the app or blueprint page.`,
    `Scene 2: Explain ${theme.story.toLowerCase()}`,
    `Scene 3: ${theme.cta}`,
    `On-screen text: NarcoGuard NG`,
    `Caption: ${hashtags} ${config.links.app}`,
  ]
    .join("\n")
  return trimText(text, platformRules.tiktok.maxLength)
}

function renderYouTube(theme) {
  const hashtags = pickHashtags(theme, platformRules.youtube.hashtagCount)
  const text = [
    `Title: NarcoGuard NG - ${theme.title}`,
    "",
    `Description: ${theme.story}`,
    "",
    `Proof: ${theme.proof}`,
    "",
    `CTA: ${theme.cta}`,
    "",
    `Links: ${config.links.app} | ${config.links.gofundme}`,
    hashtags,
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.youtube.maxLength)
}

function buildPlatformPost(platform, theme) {
  switch (platform) {
    case "x":
      return renderTwitter(theme)
    case "facebook":
      return renderFacebook(theme)
    case "instagram":
      return renderInstagram(theme)
    case "linkedin":
      return renderLinkedIn(theme)
    case "reddit":
      return renderReddit(theme)
    case "tiktok":
      return renderTikTok(theme)
    case "youtube":
      return renderYouTube(theme)
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

function shouldPublishToday(platform, date) {
  return platformRules[platform].cadence.includes(date.getUTCDay())
}

async function pushToRelay(relayUrl, payload) {
  if (!relayUrl) return { status: "skipped" }
  await axios.post(relayUrl, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  })
  return { status: "sent", relayUrl }
}

async function main() {
  const today = new Date()
  const dayNumber = getCampaignDay()
  const theme = campaignThemes[(dayNumber - 1) % campaignThemes.length]
  const dateStamp = currentDateStamp()
  const outboxDir = path.join(__dirname, "../marketing/posts", dateStamp)
  ensureDir(outboxDir)

  const bundle = {
    generatedAt: today.toISOString(),
    dayNumber,
    theme,
    appUrl: config.links.app,
    gofundmeUrl: config.links.gofundme,
    platforms: {},
  }

  const relayUrl = process.env.MARKETING_RELAY_URL || ""
  const published = []
  const drafts = []

  for (const [platform, rules] of Object.entries(platformRules)) {
    const post = buildPlatformPost(platform, theme)
    const publishToday = shouldPublishToday(platform, today)
    const payload = {
      platform,
      label: rules.label,
      publishToday,
      style: rules.style,
      post,
      theme,
      links: config.links,
      generatedAt: today.toISOString(),
    }

    bundle.platforms[platform] = payload
    fs.writeFileSync(path.join(outboxDir, `${platform}.md`), post)
    fs.writeFileSync(path.join(outboxDir, `${platform}.json`), JSON.stringify(payload, null, 2))

    if (publishToday) {
      const relayResult = await pushToRelay(relayUrl, payload)
      published.push({ platform, ...relayResult })
    } else {
      drafts.push(platform)
    }
  }

  fs.writeFileSync(path.join(outboxDir, "campaign-bundle.json"), JSON.stringify(bundle, null, 2))

  console.log(`[marketing] Generated campaign bundle for day ${dayNumber}: ${theme.title}`)
  console.log(`[marketing] Saved drafts to ${outboxDir}`)
  console.log(`[marketing] Platforms scheduled today: ${published.filter((item) => item.status === "sent").map((item) => item.platform).join(", ") || "none"}`)
  console.log(`[marketing] Draft-only platforms: ${drafts.join(", ") || "none"}`)

  if (!relayUrl) {
    console.log("[marketing] No MARKETING_RELAY_URL configured, so the workflow generated publish-ready drafts only.")
  }
}

main().catch((error) => {
  console.error("[marketing] Error generating campaign bundle:", error)
  process.exit(1)
})
