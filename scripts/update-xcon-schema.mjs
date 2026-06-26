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
  'connector',
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
  'spanGrid',
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
];

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

const safePublicNetworkProps = {
  showControls: { type: 'boolean' },
  showSearch: { type: 'boolean' },
  showFilters: { type: 'boolean' },
  showLegend: { type: 'boolean' },
  selectedColor: { $ref: '#/definitions/color' },
  neighborColor: { $ref: '#/definitions/color' },
  mutedOpacity: { type: 'number', minimum: 0, maximum: 1 },
  clusterColors: { type: 'array', items: { $ref: '#/definitions/color' } },
  panelBackground: { $ref: '#/definitions/color' },
  edges: { type: 'array', items: { $ref: '#/definitions/safeObject' } },
};
const safePublicNetworkThemeProp = { type: 'string', enum: ['obsidian', 'light', 'auto', 'custom'] };

const preservedSharedProps = {
  weight: { $ref: '#/definitions/stringOrNumber' },
  objectFit: { type: 'string' },
  objectPosition: { type: 'string' },
};

schema.description =
  'Public viewer-only XCON/JSON schema for declarative UI documents. It covers renderable component documents and nested data for XCON/SKETCH, XCON/JSON, XCON/XML, and XCON/TAGLESS conversion.';
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
Object.assign(props, preservedSharedProps);
if (!props.theme) {
  props.theme = safePublicNetworkThemeProp;
} else if (props.theme.type === 'string') {
  delete props.theme.enum;
}
Object.assign(props, safePublicNetworkProps);

component.not = {
  anyOf: forbiddenRuntimeProps.map((prop) => ({ required: [prop] })),
};
component.propertyNames = {
  not: { pattern: '^on[A-Z]' },
};
delete component.patternProperties;
schema.definitions.viewerOnlyForbiddenRequirements = component.not;

let output = `${JSON.stringify(schema, null, 2)}\n`;
output = preserveLegacyDuplicateComponentProps(output);

writeFileSync(schemaPath, output, 'utf8');

function preserveLegacyDuplicateComponentProps(outputText) {
  let text = outputText;

  text = text.replace(
    /("rotation": \{\r?\n\s+"type": "number"\r?\n\s+\},\r?\n)(\s+"initials": \{)/,
    `$1        "weight": {\n          "type": "number"\n        },\n$2`,
  );

  text = text.replace(
    /("mapImage": \{\r?\n\s+"type": "string"\r?\n\s+\},\r?\n)(\s+"attribution": \{)/,
    `$1        "objectFit": {\n          "type": "string"\n        },\n        "objectPosition": {\n          "type": "string"\n        },\n$2`,
  );

  return text;
}
