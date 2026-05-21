import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const schemaPath = join(rootDir, 'schema', 'xcon.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const publicComponentTypes = [
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
  'codeEditor',
  'colorPicker',
  'dataViz',
  'datePicker',
  'divider',
  'flexBox',
  'flipbook',
  'form',
  'gallery',
  'grid',
  'icon',
  'image',
  'label',
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
  'progressBar',
  'qrCode',
  'radioButton',
  'rating',
  'richEditor',
  'searchBar',
  'select',
  'shape',
  'slider',
  'spacer',
  'spinner',
  'stack',
  'switch',
  'tabs',
  'template',
  'text',
  'textarea',
  'textField',
  'textView',
  'timePicker',
  'tooltip',
  'treeView',
  'videoView',
].sort((a, b) => a.localeCompare(b));

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

const actionHolderProps = [
  'action',
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
  'onTextChanged',
  'onUnload',
  'success',
  'try',
];

const removedLocalFileProps = ['acceptedTypes', 'maxFiles', 'maxFileSize', 'uploadUrl'];

schema.description =
  'Public viewer-only XCON/JSON schema for declarative UI documents. It covers renderable component documents and nested data for XCON/JSON, XCON/XML, XCON/TAGLESS, and XCON/SKETCH conversion.';
schema.definitions.componentType.enum = publicComponentTypes;
schema.definitions.safeObject = {
  type: 'object',
  additionalProperties: true,
};

for (const key of ['actionType', 'chainStatements', 'actionList', 'actionOrRef', 'action', 'trigger', 'triggers']) {
  delete schema.definitions[key];
}

const component = schema.definitions.component;
const props = component.properties;
for (const prop of [...forbiddenRuntimeProps, ...actionHolderProps]) {
  delete props[prop];
}
for (const prop of removedLocalFileProps) {
  delete props[prop];
}

component.not = {
  anyOf: forbiddenRuntimeProps.map((prop) => ({ required: [prop] })),
};
component.propertyNames = {
  not: { pattern: '^on[A-Z]' },
};
delete component.patternProperties;
schema.definitions.viewerOnlyForbiddenRequirements = component.not;

writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
