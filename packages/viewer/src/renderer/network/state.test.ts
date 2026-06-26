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

  test('default state enables link types that appear only in subfolders', () => {
    const graph = subfolderOnlyFolderLinkGraph();
    const state = expandFolder(createNetworkState(graph), 'folder');
    const visible = visibleNetworkModel(graph, state);

    expect(visible.links.map((link) => link.id)).toEqual(['root-folder', 'folder-child']);
  });

  test('folder expansion deduplicates visible node and link ids in first occurrence order', () => {
    const graph = duplicateExpandedGraph();
    const state = expandFolder(expandFolder(createNetworkState(graph), 'folder'), 'other-folder');
    const visible = visibleNetworkModel(graph, state);

    expect(visible.nodes.map((node) => node.id)).toEqual(['root', 'folder', 'other-folder', 'child', 'extra']);
    expect(visible.nodes.find((node) => node.id === 'root')?.label).toBe('Root');
    expect(visible.nodes.find((node) => node.id === 'child')?.label).toBe('First Child');
    expect(visible.links.map((link) => link.id)).toEqual(['root-folder', 'folder-other-folder', 'folder-child', 'other-extra']);
    expect(visible.links.find((link) => link.id === 'root-folder')).toMatchObject({ source: 'root', target: 'folder' });
    expect(visible.links.find((link) => link.id === 'folder-child')).toMatchObject({ source: 'folder', target: 'child' });
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

function subfolderOnlyFolderLinkGraph(): NetworkGraphModel {
  return {
    nodes: [node('root', 'Root', undefined, true), node('folder', 'Folder')],
    links: [link('root-folder', 'root', 'folder')],
    groups: [],
    rootNodeId: 'root',
    subfolders: {
      folder: {
        parentId: 'folder',
        nodes: [node('child', 'Child', undefined, false, 'folder')],
        links: [link('folder-child', 'folder', 'child', 'folder')],
      },
    },
  };
}

function duplicateExpandedGraph(): NetworkGraphModel {
  return {
    nodes: [node('root', 'Root', undefined, true), node('folder', 'Folder'), node('other-folder', 'Other Folder')],
    links: [
      link('root-folder', 'root', 'folder', 'folder'),
      link('folder-other-folder', 'folder', 'other-folder', 'folder'),
    ],
    groups: [],
    rootNodeId: 'root',
    subfolders: {
      folder: {
        parentId: 'folder',
        nodes: [node('root', 'Duplicate Root', undefined, false, 'folder'), node('child', 'First Child', undefined, false, 'folder')],
        links: [
          link('root-folder', 'folder', 'root', 'folder'),
          link('folder-child', 'folder', 'child', 'folder'),
        ],
      },
      'other-folder': {
        parentId: 'other-folder',
        nodes: [node('child', 'Second Child', undefined, false, 'other-folder'), node('extra', 'Extra', undefined, false, 'other-folder')],
        links: [
          link('folder-child', 'other-folder', 'child', 'folder'),
          link('other-extra', 'other-folder', 'extra', 'folder'),
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
