import { isXconObject, XconObject, type XconValue } from '../model/index.js';

type PropertyType = 'string' | 'number' | 'boolean' | 'json' | 'spacing' | 'number-array' | 'string-array';

const stringProperties = new Set([
  'type',
  'id',
  'name',
  'text',
  'label',
  'title',
  'subtitle',
  'message',
  'description',
  'placeholder',
  'src',
  'url',
  'href',
  'alt',
  'format',
  'inputType',
  'bind',
  'group',
  'library',
  'objectFit',
  'objectPosition',
  'backgroundColor',
  'backgroundImage',
  'color',
  'borderColor',
  'foregroundColor',
  'penColor',
  'accentColor',
  'theme',
  'severity',
  'variant',
  'direction',
  'justify',
  'align',
  'textAlign',
  'textVerticalAlign',
  'textOverflow',
  'whiteSpace',
  'position',
  'orientation',
  'trigger',
  'accept',
  'poster',
  'initials',
  'componentsOrder',
  'content',
  'subject',
  'details',
  'errorCorrectionLevel',
  'family',
  'gradient',
  'boxShadow',
  'filled',
  'empty',
  'on',
  'off',
  'value',
  'inputMode',
  'fieldState',
  'floatLabel',
  'leadingBlock',
  'trailingButton',
  'prefixText',
  'suffixText',
  'otpGroup',
  'previewSize',
  'previewPosition',
  'textPosition',
  'animation',
  'chartType',
  'mode',
  'vizType',
  'pageFolder',
  'rootNodeId',
  'tileLayer',
  'initialView',
  'locale',
]);

const numberProperties = new Set([
  'x',
  'y',
  'width',
  'height',
  'top',
  'right',
  'bottom',
  'left',
  'size',
  'fontSize',
  'fontWeight',
  'weight',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'itemWidth',
  'itemHeight',
  'minLength',
  'maxLength',
  'rows',
  'gap',
  'columns',
  'maxSize',
  'maxLines',
  'activeIndex',
  'selectedIndex',
  'opacity',
  'zIndex',
  'rotation',
  'radius',
  'borderWidth',
  'strokeWidth',
  'shadowBlur',
  'penWidth',
  'min',
  'max',
  'step',
  'otpIndex',
  'quality',
  'debounceDelay',
  'delay',
  'pageWidth',
  'pageHeight',
  'pages',
  'linkDistance',
  'charge',
  'friction',
  'gravity',
  'elevation',
  'latitude',
  'longitude',
  'zoom',
]);

const booleanProperties = new Set([
  'visible',
  'enabled',
  'hidden',
  'disabled',
  'readonly',
  'readOnly',
  'required',
  'checked',
  'show',
  'showCharCount',
  'showIcon',
  'showIcons',
  'showText',
  'showPreview',
  'showSearchButton',
  'showClearButton',
  'showSaveButton',
  'showCloseButton',
  'showCaption',
  'showThumbnails',
  'showToggle',
  'multiple',
  'selectable',
  'alpha',
  'allowCrop',
  'allowZoom',
  'controls',
  'autoplay',
  'loop',
  'muted',
  'showDots',
  'displayValue',
  'ticks',
  'backdropClose',
  'closeOnBackdrop',
  'renderHtml',
  'clear',
  'bold',
  'italic',
  'secureTextEntry',
  'clearButton',
  'arrow',
  'designer:locked',
  'responsive',
  'animation',
  'lineNumbers',
  'interactive',
  'showControls',
  'showMiniatures',
  'showZoom',
  'showFullscreen',
  'loadRegions',
  'autoCenter',
  'acceleration',
  'gradients',
  'enableDrag',
  'enableZoom',
  'enablePan',
  'enableClick',
  'enableHover',
  'editable',
  'weekends',
  'autoUpload',
]);

const numberArrayProperties = new Set([
  'pos',
  'contentSize',
  'offset',
]);

const spacingProperties = new Set([
  'padding',
  'margin',
  'inset',
  'thickness',
]);

const stringArrayProperties = new Set([
  'defaultOpen',
  'expandedNodes',
  'tags',
  'classList',
]);

const jsonProperties = new Set([
  'font',
  'border',
  'shadow',
  'effects',
  'background',
  'al',
  'states',
  'icon',
  'icons',
  'prefix',
  'suffix',
  'labels',
  'indicator',
  'itemSize',
  'separator',
  'image',
  'params',
  'content',
  'template',
  'templates',
  'options',
  'data',
  'images',
  'children',
  'actions',
  'triggers',
  'backend',
  'database',
  'auth',
  'storage',
  'server',
  'chartData',
  'chartOptions',
  'modules',
  'config',
  'cells',
  'snapshot',
  'grid',
  'select',
  'fixed',
  'pageData',
  'when',
  'nodes',
  'links',
  'markers',
  'headerToolbar',
  'events',
  'autoplay',
  'dataTemplate',
]);

const componentPropertyTypes: Record<string, Record<string, PropertyType>> = {
  slider: { value: 'number', min: 'number', max: 'number', step: 'number' },
  progressBar: { value: 'number', max: 'number' },
  rating: { value: 'number', max: 'number' },
  spinner: { size: 'number' },
  barcode: { text: 'string', width: 'number', height: 'number', displayValue: 'boolean' },
  qrCode: { text: 'string', size: 'number' },
  colorPicker: { value: 'string', alpha: 'boolean' },
  datePicker: { value: 'string', min: 'string', max: 'string', showIcon: 'boolean' },
  timePicker: { value: 'string', min: 'string', max: 'string', showIcon: 'boolean' },
  textField: {
    value: 'string',
    bind: 'string',
    inputType: 'string',
    inputMode: 'string',
    fieldState: 'string',
    floatLabel: 'string',
    leadingBlock: 'string',
    trailingButton: 'string',
    prefixText: 'string',
    suffixText: 'string',
    otpGroup: 'string',
    readonly: 'boolean',
    readOnly: 'boolean',
    enabled: 'boolean',
    required: 'boolean',
    secureTextEntry: 'boolean',
    clearButton: 'boolean',
    minLength: 'number',
    maxLength: 'number',
    otpIndex: 'number',
  },
  passwordField: { value: 'string' },
  textarea: { value: 'string', rows: 'number', showCharCount: 'boolean' },
  select: { value: 'string' },
  checkbox: { value: 'string', checked: 'boolean' },
  radioButton: { value: 'string', checked: 'boolean' },
  switch: { checked: 'boolean' },
  chart: { chartType: 'string', chartData: 'json', chartOptions: 'json', responsive: 'boolean', animation: 'boolean' },
  codeEditor: { value: 'string', mode: 'string', theme: 'string', lineNumbers: 'boolean', readOnly: 'boolean' },
  richEditor: { theme: 'string', placeholder: 'string', readOnly: 'boolean', modules: 'json' },
  dataViz: { vizType: 'string', data: 'json', config: 'json', interactive: 'boolean' },
  spanGrid: {
    data: 'json',
    dataTemplate: 'json',
    tabledata: 'json',
    cells: 'json',
    config: 'json',
    options: 'json',
    snapshot: 'json',
    grid: 'json',
    merges: 'json',
    mergeCells: 'json',
    spans: 'json',
    select: 'json',
    fixed: 'json',
    fixedRows: 'number',
    fixedColumns: 'number',
    fixedRowCount: 'number',
    fixedColumnCount: 'number',
    columns: 'json',
    cols: 'json',
    rows: 'json',
    readonly: 'boolean',
    readOnly: 'boolean',
    zoom: 'number',
    reserveScrollbarInViewport: 'boolean',
  },
  flipbook: {
    pageWidth: 'number',
    pageHeight: 'number',
    pages: 'number',
    pageFolder: 'string',
    pageData: 'json',
    showControls: 'boolean',
    showMiniatures: 'boolean',
    showZoom: 'boolean',
    showFullscreen: 'boolean',
  },
  networkDiagram: {
    nodeRadius: 'number',
    linkDistance: 'number',
    charge: 'number',
    friction: 'number',
    gravity: 'number',
    nodes: 'json',
    links: 'json',
    showLabels: 'boolean',
    showArrows: 'boolean',
  },
  map: {
    latitude: 'number',
    longitude: 'number',
    zoom: 'number',
    tileLayer: 'string',
    provider: 'string',
    mapProvider: 'string',
    tileUrl: 'string',
    tileTemplate: 'string',
    snapshotUrl: 'string',
    snapshotAlt: 'string',
    snapshotFit: 'string',
    snapshotPosition: 'string',
    staticImage: 'string',
    mapImage: 'string',
    objectFit: 'string',
    objectPosition: 'string',
    attribution: 'string',
    markers: 'json',
    heatmap: 'json',
    polylines: 'json',
    polygons: 'json',
    clustering: 'boolean',
    markerIcons: 'json',
    enableZoom: 'boolean',
    enablePan: 'boolean',
    showControls: 'boolean',
  },
  calendar: {
    initialView: 'string',
    headerToolbar: 'json',
    events: 'json',
    editable: 'boolean',
    selectable: 'boolean',
    weekends: 'boolean',
    locale: 'string',
    theme: 'string',
  },
  myCounter: { value: 'number' },
  myProgressBar: { value: 'number', max: 'number' },
};

export function parseUnquotedPrimitive(raw: string): XconValue {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return jsonValueToXcon(JSON.parse(trimmed));
    } catch {
      return raw;
    }
  }
  return raw;
}

export function parseAttributeByPropertySpec(key: string, value: string, componentType?: string): XconValue {
  return coercePrimitive(value, getPropertyType(key, componentType));
}

export function applyPropertyTypes<T extends XconValue>(value: T): T {
  return coerceValue(value, undefined, undefined) as T;
}

function coerceValue(value: XconValue, key: string | undefined, componentType: string | undefined): XconValue {
  const propertyType = getPropertyType(key, componentType);

  if (isXconObject(value)) return coerceObject(value);
  if (Array.isArray(value)) return coerceArray(value, propertyType);
  if (typeof value === 'string') return coercePrimitive(value, propertyType);
  return value;
}

function coerceObject(object: XconObject): XconObject {
  const componentType = typeof object.get('type') === 'string' ? object.getString('type') : undefined;
  object.forEach((value, key) => {
    object.set(key, coerceValue(value, key, componentType));
  });
  return object;
}

function coerceArray(value: XconValue[], propertyType: PropertyType | undefined): XconValue[] {
  if (propertyType === 'number-array') return value.map((item) => coerceArrayItem(item, 'number'));
  if (propertyType === 'spacing') return value.map((item) => coerceArrayItem(item, 'number'));
  if (propertyType === 'string-array') return value.map((item) => coerceArrayItem(item, 'string'));
  return value.map((item) => coerceValue(item, undefined, undefined));
}

function coerceArrayItem(value: XconValue, propertyType: PropertyType): XconValue {
  if (typeof value === 'string') return coercePrimitive(value, propertyType);
  if (isXconObject(value)) return coerceObject(value);
  if (Array.isArray(value)) return value.map((item) => coerceArrayItem(item, propertyType));
  return value;
}

function coercePrimitive(value: string, propertyType: PropertyType | undefined): XconValue {
  if (!propertyType) return value;
  if (propertyType === 'string') return value;

  const trimmed = value.trim();
  if (trimmed === 'null') return null;

  if (propertyType === 'json' || propertyType === 'spacing' || propertyType === 'number-array' || propertyType === 'string-array') {
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = jsonValueToXcon(JSON.parse(trimmed));
        if (propertyType === 'spacing' && Array.isArray(parsed)) return coerceArray(parsed, 'number-array');
        if (propertyType === 'number-array' && Array.isArray(parsed)) return coerceArray(parsed, 'number-array');
        if (propertyType === 'string-array' && Array.isArray(parsed)) return coerceArray(parsed, 'string-array');
        return applyPropertyTypes(parsed);
      } catch {
        return value;
      }
    }
    if (propertyType === 'spacing' && /^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
    if (propertyType === 'number-array' && isCommaSeparatedNumberList(trimmed)) {
      return trimmed.split(',').map((item) => Number(item.trim()));
    }
    if (propertyType === 'json') {
      const parsedObjectAttribute = parseKeyValueObjectAttribute(trimmed);
      if (parsedObjectAttribute) return parsedObjectAttribute;
    }
    return value;
  }

  if (propertyType === 'boolean') {
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    return value;
  }

  if (propertyType === 'number') {
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return value;
  }

  return value;
}

function isCommaSeparatedNumberList(value: string): boolean {
  return /^-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)+$/.test(value);
}

function parseKeyValueObjectAttribute(value: string): XconObject | null {
  if (!value.includes(':')) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^(data|mailto|tel|urn):/i.test(value)) return null;

  const parts = value.split(';').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const output = new XconObject();
  for (const part of parts) {
    const separator = part.indexOf(':');
    if (separator <= 0) return null;

    const key = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    if (!/^[A-Za-z_][\w:-]*$/.test(key)) return null;

    output.add(key, coercePrimitive(rawValue, getPropertyType(key, undefined)));
  }

  return output.count > 0 ? output : null;
}

function getPropertyType(key: string | undefined, componentType: string | undefined): PropertyType | undefined {
  if (!key) return undefined;
  const componentTypeMap = componentType ? componentPropertyTypes[componentType] : undefined;
  if (componentTypeMap?.[key]) return componentTypeMap[key];
  if (spacingProperties.has(key)) return 'spacing';
  if (numberArrayProperties.has(key)) return 'number-array';
  if (stringArrayProperties.has(key)) return 'string-array';
  if (jsonProperties.has(key)) return 'json';
  if (stringProperties.has(key)) return 'string';
  if (numberProperties.has(key)) return 'number';
  if (booleanProperties.has(key)) return 'boolean';
  return undefined;
}

function jsonValueToXcon(value: unknown): XconValue {
  if (value === undefined || value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value ?? null;
  }
  if (Array.isArray(value)) return value.map((item) => jsonValueToXcon(item));
  if (typeof value === 'object') return new XconObject(value as Record<string, unknown>);
  return String(value);
}
