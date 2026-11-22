// Theme choice for the whole app. Dark is the default; light is an opt-in that is remembered on
// this device. A saved choice always wins over the operating-system preference.

export type Theme = "dark" | "light"

export const THEME_STORAGE_KEY = "ng-theme"
export const DEFAULT_THEME: Theme = "dark"

/** Only an explicit "light" or "dark" counts as a choice; anything else falls back to dark. */
export function resolveTheme(stored: string | null | undefined): Theme {
  return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME
}

/**
 * Runs in <head> before first paint (inline, so it works offline and before hydration). The server
 * already renders <html class="dark">, so with no saved choice, no storage, or no JavaScript the page
 * is dark; a saved "light" removes the class before anything is drawn.
 */
export const THEME_INIT_SCRIPT = `(function(){var t="${DEFAULT_THEME}";try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");if(s==="light"||s==="dark")t=s}catch(e){}var d=document.documentElement;d.classList.toggle("dark",t==="dark");d.style.colorScheme=t})()`

/** Applies a theme to the live document and remembers it. Returns false when storage is unavailable. */
export function applyTheme(theme: Theme, doc: Document = document, storage: Pick<Storage, "setItem"> | null = safeStorage()): boolean {
  const root = doc.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme)
    return storage !== null
  } catch {
    return false
  }
}

export function currentTheme(doc: Document = document): Theme {
  return doc.documentElement.classList.contains("dark") ? "dark" : "light"
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage
  } catch {
    return null
  }
}
