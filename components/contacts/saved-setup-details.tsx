"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useUserPreferences } from "@/lib/hooks/use-user-preferences"
import { saveUserPreferences, type UserPreferences } from "@/lib/user-preferences"

export function SavedSetupDetails({ preferences, onEdit }: { preferences: UserPreferences; onEdit: () => void }) {
  return (
    <section className="space-y-4 rounded-xl border p-5" aria-labelledby="saved-setup-heading">
      <h2 id="saved-setup-heading" className="text-xl font-semibold">Saved on this device</h2>
      <p className="text-sm text-muted-foreground">These are the details you entered in setup. Calling opens your phone&apos;s dialer; it does not enroll anyone in text alerts.</p>
      <h3 className="font-semibold">Call contacts</h3>
      {preferences.emergencyContacts.length === 0 ? <p className="text-sm">No call contacts saved.</p> : (
        <ul className="space-y-3">
          {preferences.emergencyContacts.map((contact) => (
            <li key={contact.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div><p className="font-medium">{contact.name}</p><p className="text-sm text-muted-foreground">{contact.relationship}{contact.relationship ? " · " : ""}{contact.phone}</p></div>
              <Button asChild variant="outline"><a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>Call {contact.name}</a></Button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="font-semibold">Where you keep naloxone</h3>
      {preferences.naloxoneLocations.length === 0 ? <p className="text-sm">No naloxone locations saved.</p> : (
        <ul className="space-y-3">
          {preferences.naloxoneLocations.map((location) => (
            <li key={location.id} className="rounded-lg border p-3 wrap-break-word">
              <p className="font-medium">{location.description}</p><p>{location.location}</p>
              {location.instructions && <p className="text-sm text-muted-foreground">{location.instructions}</p>}
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" onClick={onEdit}>Edit setup details</Button>
    </section>
  )
}

export function SavedSetupPanel() {
  const preferences = useUserPreferences()
  const router = useRouter()
  if (!preferences) return <p role="status">Loading saved setup…</p>
  return <SavedSetupDetails preferences={preferences} onEdit={() => {
    saveUserPreferences({ hasCompletedOnboarding: false })
    router.push("/")
  }} />
}
