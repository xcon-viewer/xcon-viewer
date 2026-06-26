import { isXconObject } from '@xcon-viewer/core';
import type { NetworkGraphModel, NetworkGroup, NetworkLink, NetworkNode, NetworkSubfolder } from './types';

type PlainRecord = Record<string, unknown>;
type NetworkLinkDraft = Omit<NetworkLink, 'id'> & { id?: string };

export function toNetworkPlainValue(value: unknown): unknown {
  if (isXconObject(value)) {
    const result: PlainRecord = {};
    value.forEach((child, key) => {
      result[key] = toNetworkPlainValue(child);
    });
    return result;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toNetworkPlainValue(item));
  }

  if (isPlainRecord(value)) {
    const result: PlainRecord = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = toNetworkPlainValue(child);
    }
    return result;
  }

  return value;
}

export function normalizeNetworkGraph(input: unknown): NetworkGraphModel {
  const component = asRecord(toNetworkPlainValue(input)) ?? {};
  const data = asRecord(component.data);

  if (data && asRecord(data.list)) {
    return normalizeFullVersionData(data, stringValue(component.rootNodeId));
  }

  const rawNodes = arrayValue(component.nodes);
  if (rawNodes.length === 0) {
    const root = normalizeNode({ id: 'root', label: 'Root', isRoot: true }, 0, 'root');
    return {
      nodes: [root],
      links: [],
      groups: [],
      rootNodeId: 'root',
      subfolders: {},
    };
  }

  const explicitRootNodeId = stringValue(component.rootNodeId);
  const rootNodeId = explicitRootNodeId ?? firstNodeId(rawNodes);
  const nodes = rawNodes.map((item, index) => normalizeNode(item, index, rootNodeId));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const linksSource = component.links !== undefined ? component.links : component.edges;
  const linkDrafts = arrayValue(linksSource)
    .flatMap((item) => normalizeLinkDraft(item))
    .filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));

  return {
    nodes,
    links: finalizeLinkIds(linkDrafts),
    groups: collectGroups(nodes),
    rootNodeId,
    subfolders: {},
  };
}

function normalizeFullVersionData(data: PlainRecord, explicitRootNodeId?: string): NetworkGraphModel {
  const names = asRecord(data.names) ?? {};
  const infos = asRecord(data.infos) ?? {};
  const list = asRecord(data.list) ?? {};
  const rootNodeId = explicitRootNodeId ?? fullVersionRootNodeId(data);
  const ids = fullVersionNodeIds(data, rootNodeId);

  if (ids.length === 0) {
    const root = normalizeNode({ id: 'root', label: 'Root', isRoot: true }, 0, 'root');
    return {
      nodes: [root],
      links: [],
      groups: [],
      rootNodeId: 'root',
      subfolders: normalizeSubfolders(data.subfolders),
    };
  }

  const nodes = ids.map((id, index) => {
    const metadata = asRecord(infos[id]) ?? {};
    const rawLabel = stringValue(names[id]) ?? id;

    return normalizeNode(
      {
        id,
        label: stripRootPrefix(rawLabel),
        type: fullVersionNodeType(id),
        color: stringValue(metadata.color),
        icon: stringValue(metadata.icon),
        metadata,
      },
      index,
      rootNodeId,
    );
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const linkDrafts: NetworkLinkDraft[] = [];

  for (const [source, targets] of Object.entries(list)) {
    if (!nodeIds.has(source)) continue;
    for (const target of arrayValue(targets)) {
      const targetId = stringValue(target);
      if (!targetId || targetId === source || !nodeIds.has(targetId)) continue;
      linkDrafts.push({
        source,
        target: targetId,
        type: undefined,
        label: undefined,
        weight: undefined,
        metadata: {},
      });
    }
  }

  return {
    nodes,
    links: finalizeLinkIds(linkDrafts),
    groups: collectGroups(nodes),
    rootNodeId,
    subfolders: normalizeSubfolders(data.subfolders),
  };
}

function normalizeSubfolders(value: unknown): Record<string, NetworkSubfolder> {
  const rawSubfolders = asRecord(value);
  if (!rawSubfolders) return {};

  const subfolders: Record<string, NetworkSubfolder> = {};
  for (const [parentId, rawSubfolder] of Object.entries(rawSubfolders)) {
    const subfolder = asRecord(rawSubfolder) ?? {};
    const names = {
      ...(asRecord(subfolder.names) ?? {}),
      ...(asRecord(subfolder.objects) ?? {}),
    };
    const infos = asRecord(subfolder.infos) ?? {};
    const list = asRecord(subfolder.lists) ?? asRecord(subfolder.list) ?? {};
    const nodeIds = uniqueStrings([...Object.keys(list), ...Object.keys(names), ...Object.keys(infos)]);
    const nodes = nodeIds.map((id, index) => {
      const metadata = asRecord(infos[id]) ?? {};
      const rawLabel = stringValue(names[id]) ?? id;

      return normalizeNode(
        {
          id,
          label: stripRootPrefix(rawLabel),
          type: fullVersionNodeType(id),
          color: stringValue(metadata.color),
          icon: stringValue(metadata.icon),
          metadata,
          parentId,
          isRoot: false,
        },
        index,
        undefined,
      );
    });
    const validNodeIds = new Set(nodes.map((node) => node.id));
    const adjacencyLinkDrafts: NetworkLinkDraft[] = [];
    const adjacencyPairs = new Set<string>();

    for (const [source, targets] of Object.entries(list)) {
      if (!validNodeIds.has(source)) continue;
      for (const target of arrayValue(targets)) {
        const targetId = stringValue(target);
        if (!targetId || targetId === source || !validNodeIds.has(targetId)) continue;
        adjacencyPairs.add(linkPairKey(source, targetId));
        adjacencyLinkDrafts.push({
          source,
          target: targetId,
          type: 'folder',
          label: undefined,
          weight: undefined,
          metadata: {},
        });
      }
    }

    const parentLinkDrafts = nodes
      .filter((node) => !adjacencyPairs.has(linkPairKey(parentId, node.id)))
      .map<NetworkLinkDraft>((node) => ({
        source: parentId,
        target: node.id,
        type: 'folder',
        label: undefined,
        weight: undefined,
        metadata: {},
      }));
    const links = finalizeLinkIds([...parentLinkDrafts, ...adjacencyLinkDrafts]);

    subfolders[parentId] = { parentId, nodes, links };
  }

  return subfolders;
}

function normalizeNode(item: unknown, index: number, rootNodeId?: string): NetworkNode {
  const record = asRecord(item) ?? {};
  const id = stringValue(record.id) ?? String(index);
  const metadata = asRecord(record.metadata) ?? {};

  return {
    id,
    label: stringValue(record.label) ?? stringValue(record.name) ?? stringValue(record.title) ?? id,
    type: stringValue(record.type),
    group: stringValue(record.group),
    color: stringValue(record.color),
    icon: stringValue(record.icon),
    metadata,
    x: numberValue(record.x),
    y: numberValue(record.y),
    fixed: booleanValue(record.fixed),
    parentId: stringValue(record.parentId),
    isRoot: booleanValue(record.isRoot) ?? (rootNodeId ? id === rootNodeId : index === 0),
  };
}

function normalizeLinkDraft(item: unknown): NetworkLinkDraft[] {
  const record = asRecord(item);
  if (!record) return [];

  const source = stringValue(record.source) ?? stringValue(record.from);
  const target = stringValue(record.target) ?? stringValue(record.to);
  if (!source || !target) return [];

  return [
    {
      id: stringValue(record.id) ?? `${source}->${target}`,
      source,
      target,
      type: stringValue(record.type),
      label: stringValue(record.label),
      weight: numberValue(record.weight),
      metadata: asRecord(record.metadata) ?? {},
    },
  ];
}

function finalizeLinkIds(links: NetworkLinkDraft[]): NetworkLink[] {
  const idCounts = new Map<string, number>();
  return links.map((link) => ({
    ...link,
    id: uniqueLinkId(link.id ?? `${link.source}->${link.target}`, idCounts),
  }));
}

function uniqueLinkId(baseId: string, idCounts: Map<string, number>): string {
  const count = (idCounts.get(baseId) ?? 0) + 1;
  idCounts.set(baseId, count);
  return count === 1 ? baseId : `${baseId}#${count}`;
}

function collectGroups(nodes: NetworkNode[]): NetworkGroup[] {
  const groups = new Map<string, NetworkGroup>();
  for (const node of nodes) {
    if (!node.group || groups.has(node.group)) continue;
    groups.set(node.group, {
      id: node.group,
      label: node.group,
      color: undefined,
      metadata: {},
    });
  }
  return [...groups.values()];
}

function fullVersionRootNodeId(data: PlainRecord): string | undefined {
  const names = asRecord(data.names) ?? {};
  for (const [id, name] of Object.entries(names)) {
    if (stringValue(name)?.startsWith('ROOT:')) return id;
  }
  return Object.keys(asRecord(data.list) ?? {})[0];
}

function fullVersionNodeIds(data: PlainRecord, rootNodeId?: string): string[] {
  const list = asRecord(data.list) ?? {};
  const names = asRecord(data.names) ?? {};
  const infos = asRecord(data.infos) ?? {};
  const ids: string[] = [];

  addId(ids, rootNodeId);
  for (const [source, targets] of Object.entries(list)) {
    addId(ids, source);
    for (const target of arrayValue(targets)) {
      addId(ids, target);
    }
  }
  for (const id of Object.keys(names)) addId(ids, id);
  for (const id of Object.keys(infos)) addId(ids, id);

  return uniqueStrings(ids);
}

function addId(ids: string[], value: unknown): void {
  const id = stringValue(value);
  if (id) ids.push(id);
}

function firstNodeId(nodes: unknown[]): string | undefined {
  if (nodes.length === 0) return undefined;
  const first = asRecord(nodes[0]);
  return first ? stringValue(first.id) ?? '0' : '0';
}

function fullVersionNodeType(id: string): string {
  return id.startsWith('A') ? 'folder' : 'node';
}

function stripRootPrefix(value: string): string {
  return value.startsWith('ROOT:') ? value.slice(5) : value;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function linkPairKey(source: string, target: string): string {
  return `${source}\u0000${target}`;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): PlainRecord | undefined {
  return isPlainRecord(value) ? value : undefined;
}

function isPlainRecord(value: unknown): value is PlainRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isXconObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}
