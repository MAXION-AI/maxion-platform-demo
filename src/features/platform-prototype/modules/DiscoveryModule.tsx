import { DiscoveryHandoffWorkspace, OperationalDiscoveryEntry } from "@/features/agentix/prototype/DiscoveryHandoffWorkspace"
import type { WorkflowId } from "@/features/agentix/prototype/initiatives"
import { DiscoveryAutonomousPrototypePage } from "@/features/discovery-autonomous/DiscoveryAutonomousPrototypePage"

import type { AgentixIntent, DiscoveryOpenSignal } from "../contracts"

export type DiscoveryModuleProps = {
	setupSignal: number
	openSignal: DiscoveryOpenSignal | null
	operationalDiscovery: WorkflowId | null
	onPackageReady: () => void
	onOpenOperationalDiscovery: (id: WorkflowId) => void
	onCloseOperationalDiscovery: () => void
	onOpenAgentix: (intent: AgentixIntent) => void
}

export default function DiscoveryModule({ setupSignal, openSignal, operationalDiscovery, onPackageReady, onOpenOperationalDiscovery, onCloseOperationalDiscovery, onOpenAgentix }: DiscoveryModuleProps) {
	return (
		<>
			<div hidden={operationalDiscovery !== null} style={{ height: "100%" }}>
				<DiscoveryAutonomousPrototypePage embedded setupSignal={setupSignal} openSignal={openSignal} onPackageReady={onPackageReady} operationalPackages={<OperationalDiscoveryEntry onOpen={onOpenOperationalDiscovery} />} />
			</div>
			{operationalDiscovery ? <DiscoveryHandoffWorkspace workflowId={operationalDiscovery} onBack={onCloseOperationalDiscovery} onSend={(id) => onOpenAgentix({ type: "import", id })} /> : null}
		</>
	)
}
