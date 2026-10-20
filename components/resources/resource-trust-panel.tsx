"use client"

import { useEffect, useState } from "react"

export function ResourceTrustPanel() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  return (
    <aside className="rounded-xl border border-primary/20 bg-card/40 p-4 text-sm space-y-2" aria-label="Resource search reliability">
      <p className="font-semibold">Before you travel</p>
      <p className="text-muted-foreground">
        Public-directory hours, eligibility and availability can change. Call the provider first when possible. NarcoGuard does not guarantee a listing is open or has space.
      </p>
      <p className="text-muted-foreground">
        Searching does not require an account. Your browser only shares location after you choose a location control; a ZIP code can be used instead.
      </p>
      {!online && (
        <p role="status" className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-amber-100">
          You are offline. Previously opened pages may still work, but live resource searches and availability checks need a connection.
        </p>
      )}
      <p className="text-muted-foreground">
        If the directory cannot find a match, you can call <a className="underline text-primary" href="tel:211">211</a> for local service navigation. For an immediate emergency, call <a className="underline text-primary" href="tel:911">911</a>.
      </p>
    </aside>
  )
}
