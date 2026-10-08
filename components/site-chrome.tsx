"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, LifeBuoy, HandHeart, HeartPulse, Home, LogIn, MapPin, Menu, ShieldCheck, Sparkles, Watch, X } from "lucide-react"
import { useEffect, useState } from "react"
import { InstallButton } from "@/components/pwa/install-button"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/help", label: "Find Help", icon: MapPin },
  { href: "/safer-use", label: "Stay Safer", icon: LifeBuoy },
  { href: "/angel", label: "Angel AI", icon: HandHeart },
  { href: "/watch", label: "NG Watch", icon: Watch },
  { href: "/ar", label: "Training", icon: Sparkles },
  { href: "/hero-signup", label: "Hero Network", icon: ShieldCheck },
  { href: "/fund", label: "Support", icon: HeartPulse },
  { href: "/account", label: "Account", icon: LogIn },
]

/** One consistent way back on every page: the previous page in this app, or the dashboard. */
function BackButton() {
  const router = useRouter()
  const goBack = () => {
    const cameFromHere = typeof document !== "undefined" && document.referrer.startsWith(window.location.origin)
    if (cameFromHere && window.history.length > 1) router.back()
    else router.push("/")
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-3">
      <button type="button" onClick={goBack} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary" data-testid="back-button">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back
      </button>
    </div>
  )
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/"
  // The menu belongs to the page it was opened on, so navigating closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === pathname
  const setOpen = (nextOpen: boolean) => setOpenPath(nextOpen ? pathname : null)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPath(null)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [open])

  const isActive = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href))

  return <div className="site-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <div className="ambient-orb ambient-orb-one" aria-hidden="true" /><div className="ambient-orb ambient-orb-two" aria-hidden="true" />
    <header className="site-header"><div className="site-header-inner">
      <Link href="/" className="brand" aria-label="NarcoGuard Always within reach, home" onClick={() => setOpen(false)}><span className="brand-mark"><Image src="/images/narcoguard-logo-96.webp" alt="" width={44} height={44} priority /></span><span><strong>NARCOGUARD</strong>{" "}<small>Always within reach</small></span></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn("nav-link", isActive(href) && "is-active")}><Icon aria-hidden="true" />{label}</Link>)}</nav>
      <div className="header-actions"><InstallButton /><button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button></div>
    </div><nav id="mobile-nav" className={cn("mobile-nav", open && "is-open")} aria-label="Mobile navigation" aria-hidden={!open}>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} tabIndex={open ? 0 : -1} aria-current={isActive(href) ? "page" : undefined} onClick={() => setOpen(false)} className={cn("nav-link", isActive(href) && "is-active")}><Icon aria-hidden="true" />{label}</Link>)}</nav></header>
    <main id="main-content" className="site-main">
      {pathname !== "/" && <BackButton />}
      {children}
    </main>
    <footer className="site-footer"><div><span className="brand-dot" />A public concept for stronger community response.</div><div className="footer-links"><Link href="/about">About</Link><Link href="/constitution">Constitution</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
  </div>
}
