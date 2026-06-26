import { describe, expect, test } from 'vitest';
import type { NetworkGraphModel, NetworkLink, NetworkNode } from './types';
import { createNetworkState, expandFolder, selectNode, visibleNetworkModel } from './state';

describe('network state helpers', () => {
  test('selectNode highlights selected node plus direct neighbors and incident links', () => {
    const state = selectNode(createNetworkState(baseGraph()), 'a');
    const visible = visibleNetworkModel(baseGraph(), state);

    expect([...visible.highlightedNodeIds]).toEqual(['a', 'b', 'c']);
    expect([...visible.highlightedLinkIds]).toEqual(['a-b', 'c-a']);
    expect([...visible.mutedNodeIds]).toEqual(['folder']);
    expect([...visible.mutedLinkIds]).toEqual(['b-folder']);
  });

  test('search filters by label or id case-insensitively and removes links whose endpoints are not both visible', () => {
    const state = {
      ...createNetworkState(baseGraph()),
      search: 'ALP',
    };
    const visible = visibleNetworkModel(baseGraph(), state);

    expect(visible.nodes.map((node) => node.id)).toEqual(['a']);
    expect(visible.links).toEqual([]);

    const idState = {
      ...createNetworkState(baseGraph()),
      search: 'FOLDER',
    };
    const idVisible = visibleNetworkModel(baseGraph(), idState);

    expect(idVisible.nodes.map((node) => node.id)).toEqual(['folder']);
  });

  test('group filter removes disabled groups and affected links', () => {
    const state = {
      ...createNetworkState(baseGraph()),
      enabledGroups: new Set(['core']),
    };
    const visible = visibleNetworkModel(baseGraph(), state);

    expect(visible.nodes.map((node) => node.id)).toEqual(['a', 'c', 'folder']);
    expect(visible.links.map((link) => link.id)).toEqual(['c-a']);
  });

  test('folder expansion adds child nodes and folder links locally', () => {
    const graph = baseGraph();
    const state = expandFolder(createNetworkState(graph), 'folder');
    const visible = visibleNetworkModel(graph, state);

    expect(visible.nodes.map((node) => node.id)).toEqual(['a', 'b', 'c', 'folder', 'child-a', 'child-b']);
    expect(visible.links.map((link) => link.id)).toEqual(['a-b', 'b-folder', 'c-a', 'folder-child-a', 'folder-child-b', 'child-a-child-b']);
  });

  test('link type filter removes disabled link types after endpoint filtering', () => {
    const state = {
      ...createNetworkState(baseGraph()),
      enabledLinkTypes: new Set(['normal']),
    };
    const visible = visibleNetworkModel(baseGraph(), state);

    expect(visible.links.map((link) => link.id)).toEqual(['a-b']);
  });

  test('does not highlight or mute when selected node is filtered out', () => {
    const state = {
      ...selectNode(createNetworkState(baseGraph()), 'a'),
      search: 'Beta',
    };
    const visible = visibleNetworkModel(baseGraph(), state);

    expect(visible.nodes.map((node) => node.id)).toEqual(['b']);
    expect(visible.links).toEqual([]);
    expect([...visible.highlightedNodeIds]).toEqual([]);
    expect([...visible.highlightedLinkIds]).toEqual([]);
    expect([...visible.mutedNodeIds]).toEqual([]);
    expect([...visible.mutedLinkIds]).toEqual([]);
  });

  test('helpers keep state sets immutable', () => {
    const state = createNetworkState(baseGraph());
    const expanded = expandFolder(state, 'folder');

    expect(state.expandedFolderIds).not.toBe(expanded.expandedFolderIds);
    expect([...state.expandedFolderIds]).toEqual([]);
    expect([...expanded.expandedFolderIds]).toEqual(['folder']);
  });
});

function baseGraph(): NetworkGraphModel {
  const nodes = [
    node('a', 'Alpha', 'core', true),
    node('b', 'Beta', 'secondary'),
    node('c', 'Gamma', 'core'),
    node('folder', 'Projects'),
  ];
  const links = [
    link('a-b', 'a', 'b'),
    link('b-folder', 'b', 'folder', 'folder'),
    link('c-a', 'c', 'a', 'ref'),
  ];

  return {
    nodes,
    links,
    groups: [
      { id: 'core', label: 'core', metadata: {} },
      { id: 'secondary', label: 'secondary', metadata: {} },
    ],
    rootNodeId: 'a',
    subfolders: {
      folder: {
        parentId: 'folder',
        nodes: [node('child-a', 'Child A', 'secondary', false, 'folder'), node('child-b', 'Child B', undefined, false, 'folder')],
        links: [
          link('folder-child-a', 'folder', 'child-a', 'folder'),
          link('folder-child-b', 'folder', 'child-b', 'folder'),
          link('child-a-child-b', 'child-a', 'child-b', 'folder'),
        ],
      },
    },
  };
}

function node(id: string, label: string, group?: string, isRoot = false, parentId?: string): NetworkNode {
  return {
    id,
    label,
    group,
    metadata: {},
    parentId,
    isRoot,
  };
}

function link(id: string, source: string, target: string, type?: string): NetworkLink {
  return {
    id,
    source,
    target,
    type,
    metadata: {},
  };
}
