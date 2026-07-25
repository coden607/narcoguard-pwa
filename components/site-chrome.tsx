"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HeartPulse, Home, LogIn, Menu, ShieldCheck, Sparkles, Watch, X } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/ng2-watch", label: "NG Watch", icon: Watch },
  { href: "/ar", label: "Training", icon: Sparkles },
  { href: "/hero-signup", label: "Hero Network", icon: ShieldCheck },
  { href: "/fund", label: "Support", icon: HeartPulse },
  { href: "/auth", label: "Account", icon: LogIn },
]

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/"
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [open])

  const isActive = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href))

  return <div className="site-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <div className="ambient-orb ambient-orb-one" aria-hidden="true" /><div className="ambient-orb ambient-orb-two" aria-hidden="true" />
    <header className="site-header"><div className="site-header-inner">
      <Link href="/" className="brand" aria-label="NarcoGuard home" onClick={() => setOpen(false)}><span className="brand-mark"><HeartPulse aria-hidden="true" /></span><span><strong>NARCOGUARD</strong><small>Always within reach</small></span></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn("nav-link", isActive(href) && "is-active")}><Icon aria-hidden="true" />{label}</Link>)}</nav>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button>
    </div><nav id="mobile-nav" className={cn("mobile-nav", open && "is-open")} aria-label="Mobile navigation" aria-hidden={!open}>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} tabIndex={open ? 0 : -1} aria-current={isActive(href) ? "page" : undefined} onClick={() => setOpen(false)} className={cn("nav-link", isActive(href) && "is-active")}><Icon aria-hidden="true" />{label}</Link>)}</nav></header>
    <main id="main-content" className="site-main">{children}</main>
    <footer className="site-footer"><div><span className="brand-dot" />A public concept for stronger community response.</div><div className="footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
  </div>
}
