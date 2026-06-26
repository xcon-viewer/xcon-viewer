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
    const schemaTypes = new Set(schema.definitions.componentType.enum);
    const publicTypes = [
      'form',
      'list',
      'label',
      'textField',
      'textView',
      'button',
      'panel',
      'checkbox',
      'radioButton',
      'image',
      'videoView',
      'banner',
      'shape',
      'passwordField',
      'textarea',
      'select',
      'slider',
      'switch',
      'colorPicker',
      'datePicker',
      'timePicker',
      'rating',
      'progressBar',
      'spinner',
      'badge',
      'avatar',
      'icon',
      'divider',
      'alert',
      'tooltip',
      'modal',
      'tabs',
      'accordion',
      'grid',
      'flexBox',
      'stack',
      'spacer',
      'card',
      'searchBar',
      'treeView',
      'carousel',
      'gallery',
      'qrCode',
      'barcode',
      'chart',
      'codeEditor',
      'richEditor',
      'dataViz',
      'spanGrid',
      'flipbook',
      'networkDiagram',
      'map',
      'calendar',
      'template',
      'notice',
      'text',
      'chatBubble',
      'myCounter',
      'myProgressBar',
      'myCard',
      'myToggleSwitch',
      'myIconRail',
      'myThemeAccentPanel',
    ];

    for (const componentType of publicTypes) {
      expect(schemaTypes.has(componentType), componentType).toBe(true);
    }
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
