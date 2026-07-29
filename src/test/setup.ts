import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// jsdom ships a real matchMedia whose queries never match, which leaves
// prefers-reduced-motion false and runs every streamed-text and count-up
// animation at word cadence inside the suite. Tests want the instant paths.
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: () => undefined,
  writable: true,
})

Object.defineProperty(HTMLElement.prototype, "scrollTo", {
  configurable: true,
  value: () => undefined,
  writable: true,
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
