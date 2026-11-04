import { Button, EmptyState, PageHeader } from "@/design/primitives"
import { AccountUtilityModule, PortalTopbar } from "./PortalReplicaModules"
import { NavGlyph } from "./NavGlyphs"
import type { OrganizationMembership } from "./scope"
import type { MaxionModuleId, PortalProject } from "./model"

type Restricted = { section: string; title: string; heading: string; body: string }

// Each state names why there is nothing here and who can change it (D-059): a missing setup, a
// denied permission and a module outside the agreement are not the same thing to the person.
function restrictedState(module: MaxionModuleId, organization: OrganizationMembership): Restricted | null {
	switch (module) {
		case "discovery": return { section: "Discover", title: "Discover", heading: `No Discovery in ${organization.name}`, body: `Starting one takes a project Manager, and you're a Viewer on this organization's project. ${organization.owner}, its Owner, can change that.` }
		case "agentix": return { section: "Agentix", title: "Agentix", heading: "Agentix isn't in this organization's agreement", body: `${organization.owner}, the Owner of ${organization.name}, can ask MAXION to add it. Your Agentix work in other organizations isn't affected.` }
		case "settings": return { section: "Account", title: "Settings", heading: "Settings are held by Owners and Admins", body: `You're a ${organization.role} of ${organization.name}. ${organization.owner}, its Owner, manages members and policy.` }
		case "integrations": return { section: "Account", title: "Integrations", heading: `No connections of yours in ${organization.name}`, body: "Connections belong to one organization, so yours elsewhere don't apply here. Connecting a system here takes access to one of its projects." }
		case "knowledge": return { section: "Account", title: "Knowledge", heading: `${organization.name} has published no knowledge`, body: `${organization.owner}, its Owner, publishes what agents should know about this organization.` }
		case "usage": return { section: "Account", title: "Usage", heading: "Usage is shown to Owners and Admins", body: `You're a ${organization.role} of ${organization.name}. ${organization.owner}, its Owner, can see this organization's usage.` }
		default: return null
	}
}

// What a person sees in an organization other than the home one. It reads nothing from the home
// organization's Discovery, Agentix or settings, so no customer content can cross the switch.
export function ScopedWorkspace({ module, organization, homeName, projects, onNavigate, onSwitchHome, onCommand }: { module: MaxionModuleId; organization: OrganizationMembership; homeName: string; projects: PortalProject[]; onNavigate: (module: MaxionModuleId) => void; onSwitchHome: () => void; onCommand: () => void }) {
	if (module === "approvals" || module === "help") return <AccountUtilityModule module={module} onNavigate={onNavigate} onCommand={onCommand} approvals={[]} />
	if (module === "dashboard") {
		return (
			<div className="ds-scope acc-frame">
				<PortalTopbar section={organization.name} title="Dashboard" onCommand={onCommand} />
				<div className="acc-page">
					<PageHeader title="Dashboard" description={`${organization.name}. You're a ${organization.role}, and nothing here is waiting on you.`} actions={<Button variant="primary" onClick={() => onNavigate("projects")}>Open projects</Button>} />
					<div className="acc-list" aria-label="Your projects here">
						{projects.map((project) => (
							<div key={project.id} className="acc-row">
								<span className="acc-row-main"><strong>{project.name}</strong><small>{project.description}</small></span>
								<span className="acc-row-value">{project.role}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}
	const state = restrictedState(module, organization)
	if (!state) return null
	return (
		<div className="ds-scope acc-frame">
			<PortalTopbar section={state.section} title={state.title} onCommand={onCommand} />
			<div className="acc-page">
				<PageHeader title={state.title} />
				<EmptyState icon={<NavGlyph name={module === "discovery" ? "discovery" : module === "agentix" ? "agentix" : module === "knowledge" ? "knowledge" : module === "integrations" ? "integrations" : module === "usage" ? "usage" : "settings"} />} title={state.heading} action={<Button onClick={onSwitchHome}>Back to {homeName}</Button>}>
					<p>{state.body}</p>
				</EmptyState>
			</div>
		</div>
	)
}
