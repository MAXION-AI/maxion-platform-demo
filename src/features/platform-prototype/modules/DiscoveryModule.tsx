import { DiscoveryHandoffWorkspace, OperationalDiscoveryEntry } from "@/features/agentix/prototype/DiscoveryHandoffWorkspace"
import type { WorkflowId } from "@/features/agentix/prototype/initiatives"
import { DiscoverWorkspace } from "@/features/discovery-autonomous/DiscoverWorkspace"

import { usePlatformSelector } from "../PlatformDemoProvider"
import type { AgentixIntent, DiscoveryOpenSignal, DiscoveryPackageRef } from "../contracts"
import { selectSelectedProject } from "../platformState"

export type DiscoveryModuleProps = {
	setupSignal: number
	openSignal: DiscoveryOpenSignal | null
	operationalDiscovery: WorkflowId | null
	onPackageReady: (packageRef: DiscoveryPackageRef) => void
	onOpenOperationalDiscovery: (id: WorkflowId) => void
	onCloseOperationalDiscovery: () => void
	onOpenAgentix: (intent: AgentixIntent) => void
}

export default function DiscoveryModule({ setupSignal, openSignal, operationalDiscovery, onPackageReady, onOpenOperationalDiscovery, onCloseOperationalDiscovery, onOpenAgentix }: DiscoveryModuleProps) {
	const selectedProject = usePlatformSelector(selectSelectedProject)
	return (
		<>
			<div hidden={operationalDiscovery !== null} style={{ height: "100%" }}>
				<DiscoverWorkspace embedded setupSignal={setupSignal} openSignal={openSignal} project={selectedProject ? { id: selectedProject.id, name: selectedProject.name, role: selectedProject.role } : null} onPackageReady={onPackageReady} operationalPackages={<OperationalDiscoveryEntry onOpen={onOpenOperationalDiscovery} />} />
			</div>
			{operationalDiscovery ? <DiscoveryHandoffWorkspace workflowId={operationalDiscovery} onBack={onCloseOperationalDiscovery} onSend={(id) => onOpenAgentix({ type: "import", id })} /> : null}
		</>
	)
}
