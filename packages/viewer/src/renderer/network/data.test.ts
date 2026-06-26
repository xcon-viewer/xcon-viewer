import { describe, expect, test } from 'vitest';
import { XconObject } from '@xcon-viewer/core';
import { normalizeNetworkGraph, toNetworkPlainValue } from './data';

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

  test('keeps full-version nodes referenced outside list keys', () => {
    const graph = normalizeNetworkGraph({
      type: 'networkDiagram',
      rootNodeId: 'explicitRoot',
      data: {
        names: {
          explicitRoot: 'ROOT:Explicit Vault',
          leaf: 'Leaf Note',
          namedOnly: 'Named Only',
        },
        infos: {
          leaf: { tid: 'note' },
          infoOnly: { tid: 'file' },
        },
        list: {
          explicitRoot: ['leaf', 'infoOnly'],
        },
      },
    });

    expect(graph.rootNodeId).toBe('explicitRoot');
    expect(graph.nodes.map((node) => node.id)).toEqual(['explicitRoot', 'leaf', 'infoOnly', 'namedOnly']);
    expect(graph.nodes.find((node) => node.id === 'explicitRoot')).toMatchObject({
      label: 'Explicit Vault',
      isRoot: true,
    });
    expect(graph.links.map((link) => `${link.source}->${link.target}`)).toEqual(['explicitRoot->leaf', 'explicitRoot->infoOnly']);
  });

  test('adds deterministic parent links for direct subfolder nodes', () => {
    const graph = normalizeNetworkGraph({
      type: 'networkDiagram',
      data: {
        names: { root: 'ROOT:Vault', folderA: 'Projects' },
        list: { root: ['folderA'], folderA: [] },
        subfolders: {
          folderA: {
            objects: { noteB: 'Hidden Note', noteC: 'Hidden Child' },
            lists: { noteB: ['noteC'], noteC: [] },
          },
        },
      },
    });

    expect(graph.subfolders.folderA.links.map((link) => `${link.id}:${link.source}->${link.target}`)).toEqual([
      'folderA->noteB:folderA->noteB',
      'folderA->noteC:folderA->noteC',
      'noteB->noteC:noteB->noteC',
    ]);
    expect(graph.subfolders.folderA.links.every((link) => link.type === 'folder')).toBe(true);
  });

  test('deduplicates generated link ids in public full-version and subfolder graphs', () => {
    const publicGraph = normalizeNetworkGraph({
      type: 'networkDiagram',
      nodes: [{ id: 'root' }, { id: 'leaf' }],
      links: [
        { source: 'root', target: 'leaf' },
        { from: 'root', to: 'leaf' },
        { id: 'custom', source: 'root', target: 'leaf' },
      ],
    });

    expect(publicGraph.links.map((link) => link.id)).toEqual(['root->leaf', 'root->leaf#2', 'custom']);

    const fullGraph = normalizeNetworkGraph({
      type: 'networkDiagram',
      data: {
        names: { root: 'ROOT:Vault', leaf: 'Leaf' },
        list: { root: ['leaf', 'leaf'] },
        subfolders: {
          folderA: {
            objects: { noteB: 'Hidden Note', noteC: 'Hidden Child' },
            lists: { noteB: ['noteC', 'noteC'], noteC: [] },
          },
        },
      },
    });

    expect(fullGraph.links.map((link) => link.id)).toEqual(['root->leaf', 'root->leaf#2']);
    expect(fullGraph.subfolders.folderA.links.map((link) => link.id)).toEqual([
      'folderA->noteB',
      'folderA->noteC',
      'noteB->noteC',
      'noteB->noteC#2',
    ]);
  });

  test('trims strings and treats empty strings as missing values', () => {
    const graph = normalizeNetworkGraph({
      type: 'networkDiagram',
      nodes: [
        { id: '   ', label: '   ' },
        { id: ' leaf ', label: ' Leaf Node ' },
      ],
      edges: [{ from: ' 0 ', to: ' leaf ' }],
    });

    expect(graph.rootNodeId).toBe('0');
    expect(graph.nodes.map((node) => ({ id: node.id, label: node.label }))).toEqual([
      { id: '0', label: '0' },
      { id: 'leaf', label: 'Leaf Node' },
    ]);
    expect(graph.links.map((link) => `${link.id}:${link.source}->${link.target}`)).toEqual(['0->leaf:0->leaf']);
  });
});

describe('toNetworkPlainValue', () => {
  test('converts real XconObject values recursively', () => {
    const input = new XconObject({
      title: 'Graph',
      nested: new XconObject({
        nodes: [new XconObject({ id: 'root', label: 'Root' })],
      }),
    });

    expect(toNetworkPlainValue(input)).toEqual({
      title: 'Graph',
      nested: {
        nodes: [{ id: 'root', label: 'Root' }],
      },
    });
  });
});
