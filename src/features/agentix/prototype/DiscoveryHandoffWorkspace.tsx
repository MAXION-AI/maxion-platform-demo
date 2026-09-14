import { ArrowLeft, ArrowRight, CaretDown, CheckCircle, FileText, Info } from "@phosphor-icons/react"

import { WORKFLOWS, type WorkflowId } from "./initiatives"
import { workflowFor } from "./operationsState"
import { Button, DiscoveryEvidence } from "./WorkspaceParts"
import "./agentix-initiatives.css"
import "./workspace.css"

export function OperationalDiscoveryEntry({ onOpen }: { onOpen: (id: WorkflowId) => void }) {
	return <section className="agw-discovery-packages" aria-label="Operational redesign packages"><details>
		<summary><span><FileText size={18} /><strong>Process designs ready for Agentix</strong></span><span>4 completed designs<CaretDown size={16} /></span></summary>
		<p>Review an approved process design, then carry its evidence and controls into Agentix.</p>
		<div>{WORKFLOWS.map((workflow) => <button type="button" key={workflow.id} onClick={() => onOpen(workflow.id)}><span><strong>{workflow.title}</strong><small>{workflow.category} · Approved design</small></span><ArrowRight size={18} /></button>)}</div>
	</details></section>
}

export function DiscoveryHandoffWorkspace({ workflowId, onBack, onSend }: { workflowId: WorkflowId; onBack: () => void; onSend: (id: WorkflowId) => void }) {
	const workflow = workflowFor(workflowId)
	return <div className="axi-root agw-discovery-detail"><header className="axi-topbar"><Button onClick={onBack}><ArrowLeft size={16} />All discoveries</Button><span className="agw-demo-label"><Info size={14} />Demo workspace</span></header>
		<main className="axi-main axi-main--reading"><header className="axi-page-heading"><span className="axi-eyebrow">Discovery / Completed process design</span><h1>{workflow.title}</h1><p>The process, technical assessment and controls are ready. Agentix will propose an agent deployment from this approved design.</p></header>
			<section className="agw-handoff-summary"><div><span className="agw-status is-complete"><CheckCircle size={15} />Ready for handoff</span><p>Carry the process, {workflow.sources.length} evidence sources, owner and success checks forward. Agentix checks execution readiness before deployment; completed Discovery is not permission to act.</p></div><Button primary onClick={() => onSend(workflow.id)}>Send to Agentix<ArrowRight size={16} /></Button></section>
			<DiscoveryEvidence workflow={workflow} />
		</main></div>
}
