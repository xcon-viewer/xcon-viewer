import { describe, expect, test } from 'vitest';
import { normalizeNetworkGraph } from './data';

describe('normalizeNetworkGraph', () => {
  test('normalizes public nodes and links with edges alias', () => {
    const graph = normalizeNetworkGraph({
      type: 'networkDiagram',
      rootNodeId: 'root',
      nodes: [
        { id: 'root', label: 'Root', group: 'core', x: 10, y: 20, color: '#60a5fa', metadata: { degree: 3 } },
        { id: 'child', name: 'Child', type: 'note' },
      ],
      edges: [{ from: 'root', to: 'child', type: 'ref', weight: 2 }],
    });

    expect(graph.rootNodeId).toBe('root');
    expect(graph.nodes).toEqual([
      {
        id: 'root',
        label: 'Root',
        type: undefined,
        group: 'core',
        color: '#60a5fa',
        icon: undefined,
        metadata: { degree: 3 },
        x: 10,
        y: 20,
        fixed: undefined,
        parentId: undefined,
        isRoot: true,
      },
      {
        id: 'child',
        label: 'Child',
        type: 'note',
        group: undefined,
        color: undefined,
        icon: undefined,
        metadata: {},
        x: undefined,
        y: undefined,
        fixed: undefined,
        parentId: undefined,
        isRoot: false,
      },
    ]);
    expect(graph.links).toEqual([
      {
        id: 'root->child',
        source: 'root',
        target: 'child',
        type: 'ref',
        label: undefined,
        weight: 2,
        metadata: {},
      },
    ]);
  });

  test('normalizes full-version data list with infos names and subfolders', () => {
    const graph = normalizeNetworkGraph({
      type: 'networkDiagram',
      data: {
        names: { root: 'ROOT:Vault', folderA: 'Projects', noteA: 'Launch Plan' },
        infos: { root: { color: '#8b5cf6', cid: 'r1' }, noteA: { tid: 'note' } },
        list: { root: ['folderA'], folderA: ['noteA'], noteA: [] },
        subfolders: {
          folderA: {
            objects: { noteB: 'Hidden Note' },
            infos: { noteB: { tid: 'note' } },
            lists: { noteB: [] },
          },
        },
      },
    });

    expect(graph.rootNodeId).toBe('root');
    expect(graph.nodes.map((node) => node.id)).toEqual(['root', 'folderA', 'noteA']);
    expect(graph.nodes.find((node) => node.id === 'root')).toMatchObject({
      label: 'Vault',
      isRoot: true,
      metadata: { color: '#8b5cf6', cid: 'r1' },
    });
    expect(graph.links.map((link) => `${link.source}->${link.target}`)).toEqual(['root->folderA', 'folderA->noteA']);
    expect(graph.subfolders.folderA.nodes).toEqual([
      {
        id: 'noteB',
        label: 'Hidden Note',
        type: 'node',
        group: undefined,
        color: undefined,
        icon: undefined,
        metadata: { tid: 'note' },
        x: undefined,
        y: undefined,
        fixed: undefined,
        parentId: 'folderA',
        isRoot: false,
      },
    ]);
  });
});
