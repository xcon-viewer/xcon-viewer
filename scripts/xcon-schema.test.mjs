import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const schema = JSON.parse(readFileSync(join(rootDir, 'schema', 'xcon.schema.json'), 'utf8'));
const privateBrandPattern = new RegExp('xa' + 'mong', 'i');
const forbiddenRuntimeProps = [
  'action',
  'actions',
  'triggers',
  'actionRef',
  'dataSourceRef',
  'backend',
  'database',
  'auth',
  'storage',
  'server',
  'requestPayload',
  'successResult',
  'failureCases',
  'requiredPermission',
  'validStatuses',
  'serverDerived',
  'cellAction',
  'dummyAction',
  'easySelectAction',
  'deleteAction',
  'after',
  'catch',
  'failure',
  'onBeginEdit',
  'onCheckedChanged',
  'onClick',
  'onCreate',
  'onEndEdit',
  'onEnter',
  'onKeyDown',
  'onKeyUp',
  'onLoad',
  'onPause',
  'onResume',
  'onShowEffect',
  'onTextChanged',
  'onHideEffect',
  'onUnload',
  'success',
  'try',
];

describe('XCON JSON schema', () => {
  test('describes the public viewer-only XCON document contract', () => {
    expect(schema.$id).toBe('https://xconviewer.dev/xcon.schema.json');
    expect(schema.description).toContain('viewer-only');
    expect(schema.description).not.toMatch(privateBrandPattern);
    expect(schema.description).not.toMatch(/runtime actions/i);
  });

  test('keeps component types aligned with the public viewer surface', () => {
    const publicTypes = [
      'accordion',
      'alert',
      'avatar',
      'badge',
      'banner',
      'barcode',
      'button',
      'calendar',
      'card',
      'carousel',
      'chart',
      'chatBubble',
      'checkbox',
      'chord',
      'codeEditor',
      'connector',
      'colorPicker',
      'dataViz',
      'datePicker',
      'divider',
      'flexBox',
      'flipbook',
      'forceGraph',
      'form',
      'gallery',
      'grid',
      'icon',
      'image',
      'label',
      'line',
      'list',
      'map',
      'modal',
      'myCard',
      'myCounter',
      'myIconRail',
      'myProgressBar',
      'myThemeAccentPanel',
      'myToggleSwitch',
      'networkDiagram',
      'notice',
      'panel',
      'passwordField',
      'plot',
      'progressBar',
      'qrCode',
      'radioButton',
      'rating',
      'richEditor',
      'sankey',
      'searchBar',
      'select',
      'shape',
      'slider',
      'spacer',
      'spanGrid',
      'spinner',
      'stack',
      'sunburst',
      'switch',
      'tabs',
      'template',
      'text',
      'textarea',
      'textField',
      'textView',
      'timePicker',
      'tooltip',
      'treemap',
      'treeView',
      'videoView',
    ];

    expect(schema.definitions.componentType.enum).toEqual(publicTypes);
    const schemaTypes = new Set(schema.definitions.componentType.enum);
    expect(schemaTypes.has('xForm')).toBe(false);
    expect(schemaTypes.has('xList')).toBe(false);
    expect(schemaTypes.has('mediaPlayer')).toBe(false);
    expect(schemaTypes.has('threeDViewer')).toBe(false);
  });

  test('forbids executable runtime references in public documents', () => {
    const componentProps = schema.definitions.component.properties;
    const forbidden = schema.definitions.viewerOnlyForbiddenRequirements;
    const schemaText = JSON.stringify(schema);
    const safePublicNetworkProps = [
      'theme',
      'showControls',
      'showSearch',
      'showFilters',
      'showLegend',
      'selectedColor',
      'neighborColor',
      'mutedOpacity',
      'clusterColors',
      'panelBackground',
      'edges',
    ];

    expect(schema.definitions.action).toBeFalsy();
    expect(schema.definitions.actionType).toBeFalsy();
    expect(schema.definitions.actionList).toBeFalsy();
    expect(schema.definitions.actionOrRef).toBeFalsy();
    expect(schema.definitions.triggers).toBeFalsy();
    expect(schema.definitions.chainStatements).toBeFalsy();

    for (const prop of forbiddenRuntimeProps) {
      expect(componentProps[prop], prop).toBeFalsy();
      expect(JSON.stringify(forbidden), prop).toContain(`"required":["${prop}"]`);
    }
    for (const prop of safePublicNetworkProps) {
      expect(componentProps[prop], prop).toBeTruthy();
    }
    expect(schemaText).not.toContain('#/definitions/action');
    expect(schema.definitions.component.propertyNames).toEqual({ not: { pattern: '^on[A-Z]' } });
  });

  test('restricts networkDiagram themes without narrowing global component themes', () => {
    const component = schema.definitions.component;
    const theme = component.properties.theme;
    expect(theme).toBeTruthy();
    expect(theme.type).toBe('string');
    expect(theme.enum).toBeFalsy();

    const networkThemeCondition = component.allOf?.find((entry) => {
      return entry?.if?.properties?.type?.const === 'networkDiagram' && Array.isArray(entry?.then?.properties?.theme?.enum);
    });

    expect(networkThemeCondition).toBeTruthy();
    expect(networkThemeCondition.then.properties.theme.enum).toEqual(['obsidian', 'light', 'auto', 'custom']);
  });
});
