export function normalizeIssue(node) {
  return {
    id: node.identifier || node.id,
    linearId: node.id,
    title: node.title,
    status: node.state?.name ?? null,
    statusType: node.state?.type ?? null,
    priority: node.priorityLabel ?? node.priority ?? null,
    assignee: node.assignee?.displayName ?? node.assignee?.name ?? null,
    project: node.project?.name ?? null,
    projectId: node.project?.id ?? null,
    labels: (node.labels?.nodes ?? []).map(l => l.name),
    updatedAt: node.updatedAt,
    url: node.url
  };
}

export function normalizeProject(node) {
  return {
    id: node.id,
    name: node.name,
    status: node.status?.name ?? null,
    statusType: node.status?.type ?? null,
    priority: node.priority ?? null,
    lead: node.lead?.displayName ?? node.lead?.name ?? null,
    labels: (node.labels?.nodes ?? []).map(l => l.name),
    updatedAt: node.updatedAt,
    url: node.url
  };
}

export function normalizeProjectUpdate(node, projectHint = {}) {
  const project = node.project ?? projectHint ?? {};
  const creator = node.creator ?? node.user ?? node.author ?? null;
  return {
    id: node.id,
    projectId: project.id ?? node.projectId ?? projectHint.id ?? projectHint.projectId ?? null,
    projectName: project.name ?? node.projectName ?? projectHint.name ?? projectHint.projectName ?? null,
    body: node.body ?? node.content ?? node.description ?? null,
    health: node.health ?? node.status ?? null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    url: node.url,
    creator: creator ? (creator.displayName ?? creator.name ?? creator.email ?? creator.id ?? null) : null
  };
}
