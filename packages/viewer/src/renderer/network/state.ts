import type { NetworkGraphModel, NetworkLink, NetworkNode, NetworkViewState, NetworkVisibleModel } from './types';

const DEFAULT_LINK_TYPE = 'normal';

export function createNetworkState(graph: NetworkGraphModel): NetworkViewState {
  return {
    search: '',
    expandedFolderIds: new Set(),
    enabledGroups: new Set(graph.groups.map((group) => group.id)),
    enabledLinkTypes: new Set(allGraphLinks(graph).map(linkType)),
    minDegree: 0,
  };
}

export function selectNode(state: NetworkViewState, nodeId: string | undefined): NetworkViewState {
  return cloneState(state, { selectedNodeId: nodeId });
}

export function expandFolder(state: NetworkViewState, folderId: string): NetworkViewState {
  return cloneState(state, {
    expandedFolderIds: new Set([...state.expandedFolderIds, folderId]),
  });
}

export function collapseFolder(state: NetworkViewState, folderId: string): NetworkViewState {
  const expandedFolderIds = new Set(state.expandedFolderIds);
  expandedFolderIds.delete(folderId);
  return cloneState(state, { expandedFolderIds });
}

export function toggleFolder(state: NetworkViewState, folderId: string): NetworkViewState {
  return state.expandedFolderIds.has(folderId) ? collapseFolder(state, folderId) : expandFolder(state, folderId);
}

export function visibleNetworkModel(graph: NetworkGraphModel, state: NetworkViewState): NetworkVisibleModel {
  const expanded = expandedGraph(graph, state);
  const degrees = nodeDegrees(expanded.links);
  const query = state.search.trim().toLowerCase();
  const visibleNodes = expanded.nodes.filter((node) => isNodeVisible(node, state, degrees, query));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleLinks = expanded.links.filter((link) => {
    return visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target) && state.enabledLinkTypes.has(linkType(link));
  });
  const highlights = selectedHighlights(state.selectedNodeId, visibleNodeIds, visibleLinks);
  const muted = selectedMutedSets(state.selectedNodeId, visibleNodes, visibleLinks, highlights.highlightedNodeIds, highlights.highlightedLinkIds);

  return {
    nodes: visibleNodes,
    links: visibleLinks,
    highlightedNodeIds: highlights.highlightedNodeIds,
    highlightedLinkIds: highlights.highlightedLinkIds,
    mutedNodeIds: muted.mutedNodeIds,
    mutedLinkIds: muted.mutedLinkIds,
  };
}

function cloneState(state: NetworkViewState, overrides: Partial<NetworkViewState> = {}): NetworkViewState {
  return {
    selectedNodeId: state.selectedNodeId,
    search: state.search,
    expandedFolderIds: new Set(state.expandedFolderIds),
    enabledGroups: new Set(state.enabledGroups),
    enabledLinkTypes: new Set(state.enabledLinkTypes),
    minDegree: state.minDegree,
    ...overrides,
  };
}

function expandedGraph(graph: NetworkGraphModel, state: NetworkViewState): Pick<NetworkGraphModel, 'nodes' | 'links'> {
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const nodeIds = new Set<string>();
  const linkIds = new Set<string>();

  appendUniqueNodes(nodes, nodeIds, graph.nodes);
  appendUniqueLinks(links, linkIds, graph.links);

  for (const folderId of state.expandedFolderIds) {
    const subfolder = graph.subfolders[folderId];
    if (!subfolder) continue;
    appendUniqueNodes(nodes, nodeIds, subfolder.nodes);
    appendUniqueLinks(links, linkIds, subfolder.links);
  }

  return { nodes, links };
}

function allGraphLinks(graph: NetworkGraphModel): NetworkLink[] {
  return [
    ...graph.links,
    ...Object.values(graph.subfolders).flatMap((subfolder) => subfolder.links),
  ];
}

function appendUniqueNodes(target: NetworkNode[], seenIds: Set<string>, nodes: NetworkNode[]): void {
  for (const node of nodes) {
    if (seenIds.has(node.id)) continue;
    seenIds.add(node.id);
    target.push(node);
  }
}

function appendUniqueLinks(target: NetworkLink[], seenIds: Set<string>, links: NetworkLink[]): void {
  for (const link of links) {
    if (seenIds.has(link.id)) continue;
    seenIds.add(link.id);
    target.push(link);
  }
}

function nodeDegrees(links: NetworkLink[]): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const link of links) {
    degrees.set(link.source, (degrees.get(link.source) ?? 0) + 1);
    degrees.set(link.target, (degrees.get(link.target) ?? 0) + 1);
  }
  return degrees;
}

function isNodeVisible(node: NetworkNode, state: NetworkViewState, degrees: Map<string, number>, query: string): boolean {
  if (node.group && !state.enabledGroups.has(node.group)) return false;
  if (state.minDegree > 0 && (degrees.get(node.id) ?? 0) < state.minDegree) return false;
  if (!query) return true;

  return node.id.toLowerCase().includes(query) || node.label.toLowerCase().includes(query);
}

function selectedHighlights(
  selectedNodeId: string | undefined,
  visibleNodeIds: Set<string>,
  visibleLinks: NetworkLink[],
): Pick<NetworkVisibleModel, 'highlightedNodeIds' | 'highlightedLinkIds'> {
  const highlightedNodeIds = new Set<string>();
  const highlightedLinkIds = new Set<string>();
  if (!selectedNodeId || !visibleNodeIds.has(selectedNodeId)) {
    return { highlightedNodeIds, highlightedLinkIds };
  }

  highlightedNodeIds.add(selectedNodeId);
  for (const link of visibleLinks) {
    if (link.source !== selectedNodeId && link.target !== selectedNodeId) continue;
    highlightedLinkIds.add(link.id);
    highlightedNodeIds.add(link.source === selectedNodeId ? link.target : link.source);
  }

  return { highlightedNodeIds, highlightedLinkIds };
}

function selectedMutedSets(
  selectedNodeId: string | undefined,
  visibleNodes: NetworkNode[],
  visibleLinks: NetworkLink[],
  highlightedNodeIds: Set<string>,
  highlightedLinkIds: Set<string>,
): Pick<NetworkVisibleModel, 'mutedNodeIds' | 'mutedLinkIds'> {
  const mutedNodeIds = new Set<string>();
  const mutedLinkIds = new Set<string>();
  if (!selectedNodeId || !highlightedNodeIds.has(selectedNodeId)) return { mutedNodeIds, mutedLinkIds };

  for (const node of visibleNodes) {
    if (!highlightedNodeIds.has(node.id)) mutedNodeIds.add(node.id);
  }
  for (const link of visibleLinks) {
    if (!highlightedLinkIds.has(link.id)) mutedLinkIds.add(link.id);
  }

  return { mutedNodeIds, mutedLinkIds };
}

function linkType(link: NetworkLink): string {
  return link.type ?? DEFAULT_LINK_TYPE;
}
