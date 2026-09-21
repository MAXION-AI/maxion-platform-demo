import { MotionConfig } from "motion/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"

import { MaxionPlatformPrototypePage } from "@/features/platform-prototype/MaxionPlatformPrototypePage"
import { PresenterGuidePage } from "@/features/demo/PresenterGuidePage"
import { dropFreshFlag, prepareDemo, startDemoPresence, watchDemoAddress } from "@/features/demo/session"

import "./styles.css"
import "./design/tokens.css"
import "./design/primitives.css"
import "@/features/platform-prototype/portal-shell.css"

const root = document.getElementById("root")
const Router = import.meta.env.BASE_URL === "/" ? BrowserRouter : HashRouter

if (!root) throw new Error("MAXION prototype root is missing")

// `/demo` is shorthand for the customer demo; it keeps the start it was given.
function DemoRedirect() {
  const { search } = useLocation()
  const start = new URLSearchParams(search).get("start") === "package" ? "&start=package" : ""
  return <Navigate to={`/maxion-prototype?demo=revenue${start}`} replace />
}

// The customer demo (?demo=revenue, or /demo) resolves before any module reads its saved state.
prepareDemo()
dropFreshFlag()
startDemoPresence()
watchDemoAddress()

// Motion follows the viewer's reduced-motion setting: springs, slides and layout moves
// land at once, and only opacity may still ease. Timed product steps (the Discovery
// handoff, demo ticks) keep their own clocks and never wait on an animation.
createRoot(root).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Router>
        <Routes>
          <Route path="/maxion-prototype" element={<MaxionPlatformPrototypePage />} />
          <Route path="/agentix-prototype" element={<MaxionPlatformPrototypePage />} />
          <Route path="/discovery-prototype" element={<MaxionPlatformPrototypePage />} />
          <Route path="/demo" element={<DemoRedirect />} />
          <Route path="/demo-guide" element={<PresenterGuidePage />} />
          <Route path="/" element={<Navigate to="/maxion-prototype" replace />} />
          <Route path="*" element={<Navigate to="/maxion-prototype" replace />} />
        </Routes>
      </Router>
    </MotionConfig>
  </StrictMode>,
)
