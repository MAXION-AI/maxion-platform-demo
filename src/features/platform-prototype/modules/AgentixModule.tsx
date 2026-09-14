import { AgentixInitiativesPage } from "@/features/agentix/prototype/AgentixInitiativesPage"
import type { WorkflowId } from "@/features/agentix/prototype/initiatives"

import { usePlatformSelector } from "../PlatformDemoProvider"
import type { AgentixAttention, AgentixIntentSignal } from "../contracts"
import { selectSelectedProject } from "../platformState"

export type AgentixModuleProps = {
	active: boolean
	intentSignal: AgentixIntentSignal | null
	onAttentionChange: (attention: AgentixAttention) => void
	onOpenDiscovery: (id: WorkflowId) => void
}

export default function AgentixModule(props: AgentixModuleProps) {
	const selectedProject = usePlatformSelector(selectSelectedProject)
	const project = selectedProject ? {
		id: selectedProject.id,
		role: selectedProject.role === "Owner" ? "owner" as const : selectedProject.role === "Member" ? "member" as const : "viewer" as const,
	} : undefined
	return <AgentixInitiativesPage key={project ? `${project.id}:${project.role}` : "unscoped"} {...props} project={project} />
}
