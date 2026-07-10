# NarcoGuard Marketing Automation

## Overview
Automated marketing system for NarcoGuard PWA and GoFundMe campaign.

## Campaign Details
- **GoFundMe URL**: https://gofund.me/9acf270ea
- **Live App**: https://narcoguard.app
- **Demo URL**: https://narcoguard-pwa-iota.vercel.app/
- **GitHub Repo**: https://github.com/coden607/narcoguard-pwa

## Goal
Raise funds to build and deploy 80 NarcoGuard NG watches for Broome County, NY

## Automated Workflows

### 1. Cross-Platform Campaign Generator (daily)
- Builds platform-specific copy for X, Facebook, Instagram, LinkedIn, Reddit, TikTok, and YouTube Shorts
- Writes publish-ready drafts to `marketing/posts/<date>/`
- Optionally relays payloads to a configured social scheduler
- Runs daily from GitHub Actions

### 2. Content Creation
- Fetches campaign stats and generates graphics metadata
- Reuses the same theme cycle across platforms while adapting tone and length
- Focuses on a high-signal, low-noise cadence instead of blasting every platform equally

## 7-Day Campaign Messages

### Day 1: Launch Announcement
Focus: App is live, demo available
Hashtags: #NarcoGuard #SaveLives #HarmReduction

### Day 2: Hero Network
Focus: Volunteer response system
Hashtags: #HeroNetwork #BroomeCounty

### Day 3: Recovery Resources
Focus: Rat Park inspiration, community support
Hashtags: #RecoverySupport #RatPark

### Day 4: Share Request
Focus: Community engagement
Hashtags: #ShareToSaveLives

### Day 5: Technology Showcase
Focus: eSIM alerts, auto-injection
Hashtags: #MedicalTechnology #Innovation

### Day 6: Local Community
Focus: Binghamton/Broome County
Hashtags: #Binghamton #LocalSupport

### Day 7: Weekly Recap
Focus: Gratitude, progress update
Hashtags: #WeekOneDown #Grateful

## Setup Instructions

### Required Secrets (Optional)
Add a relay endpoint or platform credentials if you want automated publishing beyond draft generation:
- `MARKETING_RELAY_URL`
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`
- `FACEBOOK_ACCESS_TOKEN`
- `LINKEDIN_ACCESS_TOKEN`

Without API keys or a relay, the workflow will still:
- Generate platform-specific marketing content
- Save posts to `marketing/posts/<date>/`
- Track campaign progress
- Create graphics metadata

## Manual Posting
If social media APIs aren't configured, find generated content in:
- `marketing/posts/<date>/` - Platform-specific drafts
- `marketing/graphics/` - Graphics metadata
- `marketing/stats/` - Campaign statistics

## Engagement Tips
1. Match the cadence to the platform instead of cross-posting identical text everywhere.
2. Keep X short and direct.
3. Keep LinkedIn more technical and outcome-focused.
4. Keep Reddit plainspoken and disclosure-first.
5. Keep TikTok and YouTube Shorts hook-driven and visual.
6. Include both the demo and GoFundMe links where the platform allows it.
7. Reuse the same weekly theme with different copy structures per platform.

## Key Messages
- **80 watches = 80 lives protected**
- **Auto-naloxone injection saves seconds**
- **Hero Network connects volunteers**
- **Recovery resources transform lives**
- **Broome County's solution to the opioid crisis**

## Target Audience
1. Binghamton/Broome County residents
2. Harm reduction advocates
3. Healthcare professionals
4. Recovery community members
5. Tech enthusiasts
6. Social impact investors

## Success Metrics
- GoFundMe donations
- App demo visits
- Social media engagement
- Share/repost rate
- Community volunteer signups
- Media coverage

## Contact
For questions about the campaign: Stephen Blanford
GitHub: @Coden809
