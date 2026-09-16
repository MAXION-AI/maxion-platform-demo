import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom"

import { DiscoveryAutonomousPrototypePage } from "@/features/discovery-autonomous/DiscoveryAutonomousPrototypePage"
import { MaxionPlatformPrototypePage } from "@/features/platform-prototype/MaxionPlatformPrototypePage"

import "./styles.css"

const root = document.getElementById("root")
const Router = import.meta.env.BASE_URL === "/" ? BrowserRouter : HashRouter

if (!root) throw new Error("MAXION prototype root is missing")

createRoot(root).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/maxion-prototype" element={<MaxionPlatformPrototypePage />} />
        <Route path="/agentix-prototype" element={<MaxionPlatformPrototypePage />} />
        <Route path="/discovery-prototype" element={<DiscoveryAutonomousPrototypePage />} />
        <Route path="/" element={<Navigate to="/maxion-prototype" replace />} />
        <Route path="*" element={<Navigate to="/maxion-prototype" replace />} />
      </Routes>
    </Router>
  </StrictMode>,
)
