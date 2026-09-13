import { ArrowRight, FileText, ShieldCheck } from "@phosphor-icons/react"
import type { ReactNode } from "react"
import type { WorkflowExample } from "./initiatives"
export function Button({ children, onClick, primary = false, disabled = false }: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return <button type="button" className={`agw-button${primary ? " is-primary" : ""}`} onClick={onClick} disabled={disabled}>{children}</button>
}
export function DiscoveryEvidence({ workflow: w }: { workflow: WorkflowExample }) {
	return <>
		<section className="axi-section"><span className="axi-eyebrow">Target outcome</span><h2>{w.outcome}</h2><p>Design v1 · {w.owner} · Illustrative Discovery evidence.</p></section>
		<section className="axi-section"><h2>What changes—and why</h2><div className="axi-change-list">{w.changes.map((change, i) => <article key={change.before}><span className="axi-step-number">0{i + 1}</span><div><span className="axi-eyebrow">Current state</span><p>{change.before}</p><small>{change.finding}</small></div><ArrowRight className="axi-change-arrow" size={18} /><div><span className="axi-eyebrow">Approved future state</span><p>{change.after}</p></div></article>)}</div></section>
		<section className="axi-section"><h2>Supporting evidence</h2><div className="axi-source-list">{w.sources.map(source => <details key={source.title}><summary><FileText size={17} /><span>{source.title}</span></summary><p>{source.detail}</p><small>Illustrative source · {w.id.toUpperCase()}-v1 · Read-only snapshot</small></details>)}</div></section>
		<section className="axi-section"><h2>Success checks</h2><ul className="axi-check-list">{w.success.map(check => <li key={check}><ShieldCheck size={17} />{check}</li>)}</ul></section>
	</>
}
