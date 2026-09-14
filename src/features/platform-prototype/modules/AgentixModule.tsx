import { AgentixInitiativesPage } from "@/features/agentix/prototype/AgentixInitiativesPage"
import type { WorkflowId } from "@/features/agentix/prototype/initiatives"

import type { AgentixAttention, AgentixIntentSignal } from "../contracts"

export type AgentixModuleProps = {
	active: boolean
	intentSignal: AgentixIntentSignal | null
	onAttentionChange: (attention: AgentixAttention) => void
	onOpenDiscovery: (id: WorkflowId) => void
}

export default function AgentixModule(props: AgentixModuleProps) {
	return <AgentixInitiativesPage {...props} />
}
