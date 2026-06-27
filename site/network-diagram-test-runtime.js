// packages/core/src/model/index.ts
var XconObject = class _XconObject {
  names = [];
  values = [];
  indexes = /* @__PURE__ */ new Map();
  constructor(initial) {
    if (!initial) return;
    if (Symbol.iterator in Object(initial) && !isPlainObject(initial)) {
      for (const [name, value] of initial) {
        this.add(name, toXconValue(value));
      }
      return;
    }
    for (const [name, value] of Object.entries(initial)) {
      this.add(name, toXconValue(value));
    }
  }
  get count() {
    return this.names.length;
  }
  add(name, value) {
    if (this.contains(name)) return this.set(name, value);
    this.indexes.set(name, this.names.length);
    this.names.push(name);
    this.values.push(toXconValue(value));
    return this;
  }
  set(name, value) {
    const index2 = this.indexOf(name);
    if (index2 < 0) return this.add(name, value);
    this.values[index2] = toXconValue(value);
    return this;
  }
  insert(index2, name, value) {
    if (this.contains(name)) this.remove(name);
    const nextIndex = Math.max(0, Math.min(index2, this.names.length));
    this.names.splice(nextIndex, 0, name);
    this.values.splice(nextIndex, 0, toXconValue(value));
    this.reindex();
    return this;
  }
  get(name, defaultValue) {
    const index2 = this.indexOf(name);
    if (index2 < 0) return defaultValue;
    return this.values[index2];
  }
  getKey(index2) {
    return this.names[index2];
  }
  getValue(index2) {
    return this.values[index2];
  }
  getString(name, defaultValue = "") {
    const value = this.get(name);
    return value === void 0 || value === null ? defaultValue : String(value);
  }
  contains(name) {
    return this.indexes.has(name);
  }
  indexOf(name) {
    return this.indexes.get(name) ?? -1;
  }
  remove(name) {
    const index2 = this.indexOf(name);
    if (index2 < 0) return false;
    this.removeAt(index2);
    return true;
  }
  removeAt(index2) {
    if (index2 < 0 || index2 >= this.names.length) return false;
    this.names.splice(index2, 1);
    this.values.splice(index2, 1);
    this.reindex();
    return true;
  }
  clear() {
    this.names.length = 0;
    this.values.length = 0;
    this.indexes.clear();
  }
  forEach(callback) {
    this.names.forEach((name, index2) => callback(this.values[index2], name, index2));
  }
  map(callback) {
    return this.names.map((name, index2) => callback(this.values[index2], name, index2));
  }
  filter(callback) {
    const next = new _XconObject();
    this.forEach((value, name, index2) => {
      if (callback(value, name, index2)) next.add(name, cloneXconValue(value, true));
    });
    return next;
  }
  reduce(callback, initialValue) {
    let accumulator = initialValue;
    this.forEach((value, name, index2) => {
      accumulator = callback(accumulator, value, name, index2);
    });
    return accumulator;
  }
  some(callback) {
    return this.names.some((name, index2) => callback(this.values[index2], name, index2));
  }
  every(callback) {
    return this.names.every((name, index2) => callback(this.values[index2], name, index2));
  }
  clone() {
    return new _XconObject(this);
  }
  deepClone() {
    const next = new _XconObject();
    this.forEach((value, name) => next.add(name, cloneXconValue(value, true)));
    return next;
  }
  copy(source) {
    this.clear();
    const next = isXconObject(source) ? source : new _XconObject(source);
    next.forEach((value, name) => this.add(name, cloneXconValue(value, true)));
    return this;
  }
  entries() {
    return this.names.map((name, index2) => [name, this.values[index2]]);
  }
  keys() {
    return [...this.names];
  }
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
  reindex() {
    this.indexes.clear();
    this.names.forEach((name, index2) => this.indexes.set(name, index2));
  }
};
function isXconObject(value) {
  return value instanceof XconObject || !!value && typeof value === "object" && typeof value.get === "function" && typeof value.set === "function" && typeof value.contains === "function";
}
function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  if (isXconObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function toXconValue(value) {
  if (value === void 0) return null;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (isXconObject(value)) return value;
  if (Array.isArray(value)) return value.map((item) => toXconValue(item));
  if (isPlainObject(value)) return new XconObject(value);
  return String(value);
}
function cloneXconValue(value, deep = false) {
  if (!deep) return value;
  if (isXconObject(value)) return value.deepClone();
  if (Array.isArray(value)) return value.map((item) => cloneXconValue(item, true));
  return value;
}

// packages/core/src/parser/property-types.ts
var stringProperties = /* @__PURE__ */ new Set([
  "type",
  "id",
  "name",
  "text",
  "label",
  "title",
  "subtitle",
  "message",
  "description",
  "placeholder",
  "src",
  "url",
  "href",
  "alt",
  "format",
  "inputType",
  "bind",
  "group",
  "library",
  "objectFit",
  "objectPosition",
  "backgroundColor",
  "backgroundImage",
  "color",
  "borderColor",
  "foregroundColor",
  "penColor",
  "accentColor",
  "selectedColor",
  "neighborColor",
  "panelBackground",
  "theme",
  "severity",
  "variant",
  "direction",
  "justify",
  "align",
  "textAlign",
  "textVerticalAlign",
  "textOverflow",
  "whiteSpace",
  "position",
  "orientation",
  "trigger",
  "accept",
  "poster",
  "initials",
  "componentsOrder",
  "content",
  "subject",
  "details",
  "errorCorrectionLevel",
  "family",
  "gradient",
  "boxShadow",
  "filled",
  "empty",
  "on",
  "off",
  "value",
  "inputMode",
  "fieldState",
  "floatLabel",
  "leadingBlock",
  "trailingButton",
  "prefixText",
  "suffixText",
  "otpGroup",
  "previewSize",
  "previewPosition",
  "textPosition",
  "animation",
  "chartType",
  "mode",
  "vizType",
  "pageFolder",
  "rootNodeId",
  "tileLayer",
  "initialView",
  "locale"
]);
var numberProperties = /* @__PURE__ */ new Set([
  "x",
  "y",
  "width",
  "height",
  "top",
  "right",
  "bottom",
  "left",
  "size",
  "fontSize",
  "fontWeight",
  "weight",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "itemWidth",
  "itemHeight",
  "minLength",
  "maxLength",
  "rows",
  "gap",
  "columns",
  "maxSize",
  "maxLines",
  "activeIndex",
  "selectedIndex",
  "opacity",
  "zIndex",
  "rotation",
  "radius",
  "borderWidth",
  "strokeWidth",
  "shadowBlur",
  "penWidth",
  "min",
  "max",
  "step",
  "otpIndex",
  "quality",
  "debounceDelay",
  "delay",
  "pageWidth",
  "pageHeight",
  "pages",
  "linkDistance",
  "charge",
  "friction",
  "gravity",
  "mutedOpacity",
  "elevation",
  "latitude",
  "longitude",
  "zoom"
]);
var booleanProperties = /* @__PURE__ */ new Set([
  "visible",
  "enabled",
  "hidden",
  "disabled",
  "readonly",
  "readOnly",
  "required",
  "checked",
  "show",
  "showCharCount",
  "showIcon",
  "showIcons",
  "showText",
  "showPreview",
  "showSearchButton",
  "showClearButton",
  "showSaveButton",
  "showCloseButton",
  "showCaption",
  "showThumbnails",
  "showToggle",
  "multiple",
  "selectable",
  "alpha",
  "allowCrop",
  "allowZoom",
  "controls",
  "autoplay",
  "loop",
  "muted",
  "showDots",
  "displayValue",
  "ticks",
  "backdropClose",
  "closeOnBackdrop",
  "renderHtml",
  "clear",
  "bold",
  "italic",
  "secureTextEntry",
  "clearButton",
  "arrow",
  "designer:locked",
  "responsive",
  "animation",
  "lineNumbers",
  "interactive",
  "showControls",
  "showSearch",
  "showFilters",
  "showLegend",
  "showMiniatures",
  "showZoom",
  "showFullscreen",
  "loadRegions",
  "autoCenter",
  "acceleration",
  "gradients",
  "enableDrag",
  "enableZoom",
  "enablePan",
  "enableClick",
  "enableHover",
  "editable",
  "weekends",
  "autoUpload"
]);
var numberArrayProperties = /* @__PURE__ */ new Set([
  "pos",
  "contentSize",
  "offset"
]);
var spacingProperties = /* @__PURE__ */ new Set([
  "padding",
  "margin",
  "inset",
  "thickness"
]);
var stringArrayProperties = /* @__PURE__ */ new Set([
  "defaultOpen",
  "expandedNodes",
  "tags",
  "classList"
]);
var jsonProperties = /* @__PURE__ */ new Set([
  "font",
  "border",
  "shadow",
  "effects",
  "background",
  "al",
  "states",
  "icon",
  "icons",
  "prefix",
  "suffix",
  "labels",
  "indicator",
  "itemSize",
  "separator",
  "image",
  "params",
  "content",
  "template",
  "templates",
  "options",
  "data",
  "images",
  "children",
  "actions",
  "triggers",
  "backend",
  "database",
  "auth",
  "storage",
  "server",
  "chartData",
  "chartOptions",
  "modules",
  "config",
  "cells",
  "snapshot",
  "grid",
  "select",
  "fixed",
  "pageData",
  "when",
  "nodes",
  "links",
  "edges",
  "clusterColors",
  "markers",
  "headerToolbar",
  "events",
  "autoplay",
  "dataTemplate"
]);
var componentPropertyTypes = {
  slider: { value: "number", min: "number", max: "number", step: "number" },
  progressBar: { value: "number", max: "number" },
  rating: { value: "number", max: "number" },
  spinner: { size: "number" },
  barcode: { text: "string", width: "number", height: "number", displayValue: "boolean" },
  qrCode: { text: "string", size: "number" },
  colorPicker: { value: "string", alpha: "boolean" },
  datePicker: { value: "string", min: "string", max: "string", showIcon: "boolean" },
  timePicker: { value: "string", min: "string", max: "string", showIcon: "boolean" },
  textField: {
    value: "string",
    bind: "string",
    inputType: "string",
    inputMode: "string",
    fieldState: "string",
    floatLabel: "string",
    leadingBlock: "string",
    trailingButton: "string",
    prefixText: "string",
    suffixText: "string",
    otpGroup: "string",
    readonly: "boolean",
    readOnly: "boolean",
    enabled: "boolean",
    required: "boolean",
    secureTextEntry: "boolean",
    clearButton: "boolean",
    minLength: "number",
    maxLength: "number",
    otpIndex: "number"
  },
  passwordField: { value: "string" },
  textarea: { value: "string", rows: "number", showCharCount: "boolean" },
  select: { value: "string" },
  checkbox: { value: "string", checked: "boolean" },
  radioButton: { value: "string", checked: "boolean" },
  switch: { checked: "boolean" },
  chart: { chartType: "string", chartData: "json", chartOptions: "json", responsive: "boolean", animation: "boolean" },
  codeEditor: { value: "string", mode: "string", theme: "string", lineNumbers: "boolean", readOnly: "boolean" },
  richEditor: { theme: "string", placeholder: "string", readOnly: "boolean", modules: "json" },
  dataViz: { vizType: "string", data: "json", config: "json", interactive: "boolean" },
  spanGrid: {
    data: "json",
    dataTemplate: "json",
    tabledata: "json",
    cells: "json",
    config: "json",
    options: "json",
    snapshot: "json",
    grid: "json",
    merges: "json",
    mergeCells: "json",
    spans: "json",
    select: "json",
    fixed: "json",
    fixedRows: "number",
    fixedColumns: "number",
    fixedRowCount: "number",
    fixedColumnCount: "number",
    columns: "json",
    cols: "json",
    rows: "json",
    readonly: "boolean",
    readOnly: "boolean",
    zoom: "number",
    reserveScrollbarInViewport: "boolean"
  },
  flipbook: {
    pageWidth: "number",
    pageHeight: "number",
    pages: "number",
    pageFolder: "string",
    pageData: "json",
    showControls: "boolean",
    showMiniatures: "boolean",
    showZoom: "boolean",
    showFullscreen: "boolean"
  },
  networkDiagram: {
    nodeRadius: "number",
    linkDistance: "number",
    charge: "number",
    friction: "number",
    gravity: "number",
    nodes: "json",
    links: "json",
    edges: "json",
    clusterColors: "json",
    showLabels: "boolean",
    showArrows: "boolean",
    showControls: "boolean",
    showSearch: "boolean",
    showFilters: "boolean",
    showLegend: "boolean",
    enableDrag: "boolean",
    enableZoom: "boolean",
    enablePan: "boolean",
    enableHover: "boolean",
    mutedOpacity: "number",
    theme: "string",
    selectedColor: "string",
    neighborColor: "string",
    panelBackground: "string"
  },
  map: {
    latitude: "number",
    longitude: "number",
    zoom: "number",
    tileLayer: "string",
    provider: "string",
    mapProvider: "string",
    tileUrl: "string",
    tileTemplate: "string",
    snapshotUrl: "string",
    snapshotAlt: "string",
    snapshotFit: "string",
    snapshotPosition: "string",
    staticImage: "string",
    mapImage: "string",
    objectFit: "string",
    objectPosition: "string",
    attribution: "string",
    markers: "json",
    heatmap: "json",
    polylines: "json",
    polygons: "json",
    clustering: "boolean",
    markerIcons: "json",
    enableZoom: "boolean",
    enablePan: "boolean",
    showControls: "boolean"
  },
  calendar: {
    initialView: "string",
    headerToolbar: "json",
    events: "json",
    editable: "boolean",
    selectable: "boolean",
    weekends: "boolean",
    locale: "string",
    theme: "string"
  },
  myCounter: { value: "number" },
  myProgressBar: { value: "number", max: "number" }
};
function parseUnquotedPrimitive(raw) {
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
function parseAttributeByPropertySpec(key, value, componentType) {
  return coercePrimitive(value, getPropertyType(key, componentType));
}
function applyPropertyTypes(value) {
  return coerceValue(value, void 0, void 0);
}
function coerceValue(value, key, componentType) {
  const propertyType = getPropertyType(key, componentType);
  if (isXconObject(value)) return coerceObject(value);
  if (Array.isArray(value)) return coerceArray(value, propertyType);
  if (typeof value === "string") return coercePrimitive(value, propertyType);
  return value;
}
function coerceObject(object) {
  const componentType = typeof object.get("type") === "string" ? object.getString("type") : void 0;
  object.forEach((value, key) => {
    object.set(key, coerceValue(value, key, componentType));
  });
  return object;
}
function coerceArray(value, propertyType) {
  if (propertyType === "number-array") return value.map((item) => coerceArrayItem(item, "number"));
  if (propertyType === "spacing") return value.map((item) => coerceArrayItem(item, "number"));
  if (propertyType === "string-array") return value.map((item) => coerceArrayItem(item, "string"));
  return value.map((item) => coerceValue(item, void 0, void 0));
}
function coerceArrayItem(value, propertyType) {
  if (typeof value === "string") return coercePrimitive(value, propertyType);
  if (isXconObject(value)) return coerceObject(value);
  if (Array.isArray(value)) return value.map((item) => coerceArrayItem(item, propertyType));
  return value;
}
function coercePrimitive(value, propertyType) {
  if (!propertyType) return value;
  if (propertyType === "string") return value;
  const trimmed = value.trim();
  if (trimmed === "null") return null;
  if (propertyType === "json" || propertyType === "spacing" || propertyType === "number-array" || propertyType === "string-array") {
    if (trimmed.startsWith("[") && trimmed.endsWith("]") || trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = jsonValueToXcon(JSON.parse(trimmed));
        if (propertyType === "spacing" && Array.isArray(parsed)) return coerceArray(parsed, "number-array");
        if (propertyType === "number-array" && Array.isArray(parsed)) return coerceArray(parsed, "number-array");
        if (propertyType === "string-array" && Array.isArray(parsed)) return coerceArray(parsed, "string-array");
        return applyPropertyTypes(parsed);
      } catch {
        return value;
      }
    }
    if (propertyType === "spacing" && /^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
    if (propertyType === "number-array" && isCommaSeparatedNumberList(trimmed)) {
      return trimmed.split(",").map((item) => Number(item.trim()));
    }
    if (propertyType === "json") {
      const parsedObjectAttribute = parseKeyValueObjectAttribute(trimmed);
      if (parsedObjectAttribute) return parsedObjectAttribute;
    }
    return value;
  }
  if (propertyType === "boolean") {
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    return value;
  }
  if (propertyType === "number") {
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return value;
  }
  return value;
}
function isCommaSeparatedNumberList(value) {
  return /^-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)+$/.test(value);
}
function parseKeyValueObjectAttribute(value) {
  if (!value.includes(":")) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^(data|mailto|tel|urn):/i.test(value)) return null;
  const parts = value.split(";").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const output = new XconObject();
  for (const part of parts) {
    const separator = part.indexOf(":");
    if (separator <= 0) return null;
    const key = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    if (!/^[A-Za-z_][\w:-]*$/.test(key)) return null;
    output.add(key, coercePrimitive(rawValue, getPropertyType(key, void 0)));
  }
  return output.count > 0 ? output : null;
}
function getPropertyType(key, componentType) {
  if (!key) return void 0;
  const componentTypeMap = componentType ? componentPropertyTypes[componentType] : void 0;
  if (componentTypeMap?.[key]) return componentTypeMap[key];
  if (spacingProperties.has(key)) return "spacing";
  if (numberArrayProperties.has(key)) return "number-array";
  if (stringArrayProperties.has(key)) return "string-array";
  if (jsonProperties.has(key)) return "json";
  if (stringProperties.has(key)) return "string";
  if (numberProperties.has(key)) return "number";
  if (booleanProperties.has(key)) return "boolean";
  return void 0;
}
function jsonValueToXcon(value) {
  if (value === void 0 || value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value ?? null;
  }
  if (Array.isArray(value)) return value.map((item) => jsonValueToXcon(item));
  if (typeof value === "object") return new XconObject(value);
  return String(value);
}

// packages/core/src/parser/json/index.ts
function fromJSON(input) {
  const parsed = typeof input === "string" ? JSON.parse(input) : input;
  return fromJSONObject(parsed);
}
function fromJSONObject(input) {
  const value = toXconValue(input);
  if (!isXconObject(value)) {
    throw new TypeError("XCON/JSON root must be an object.");
  }
  return applyPropertyTypes(value);
}

// packages/core/src/parser/xml/index.ts
var semanticTypeAliases = {
  XCON: "xcon",
  Form: "form",
  List: "list",
  XList: "list",
  Label: "label",
  Text: "label",
  TextField: "textField",
  TextView: "textView",
  Button: "button",
  Panel: "panel",
  Checkbox: "checkbox",
  RadioButton: "radioButton",
  Image: "image",
  VideoView: "videoView",
  Banner: "banner",
  Shape: "shape",
  Stack: "stack",
  FlexBox: "flexBox",
  Grid: "grid",
  Card: "card"
};
function fromXml(xmlString) {
  const document2 = parseXml(xmlString);
  const root2 = firstElement(document2);
  if (!root2) throw new Error("XML document is empty.");
  if (isMachineWrapper(root2)) {
    const child = firstElement(root2);
    if (!child) throw new Error("XCON XML wrapper does not contain a value.");
    return requireObject(parseMachineValue(child));
  }
  if (isMachineValueNode(root2)) return requireObject(parseMachineValue(root2));
  return parseSemanticComponent(root2);
}
function requireObject(value) {
  if (!isXconObject(value)) throw new Error("XCON XML root must be an object.");
  return value;
}
function parseXml(input) {
  const root2 = { name: "#document", attrs: {}, children: [] };
  const stack = [root2];
  const tokenPattern = /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][\w:.-]*(?:\s+[^<>]*?)?\/?>|[^<]+/g;
  const tokens = input.match(tokenPattern) ?? [];
  for (const token of tokens) {
    if (!token || token.startsWith("<?") || token.startsWith("<!--")) continue;
    if (token.startsWith("<![CDATA[")) {
      current(stack).children.push(token.slice(9, -3));
      continue;
    }
    if (token.startsWith("</")) {
      const name = token.slice(2, -1).trim();
      const node = stack.pop();
      if (!node || node.name !== name) throw new Error(`Mismatched XML closing tag: ${name}`);
      continue;
    }
    if (token.startsWith("<")) {
      const selfClosing = token.endsWith("/>");
      const body = token.slice(1, selfClosing ? -2 : -1).trim();
      const [name = ""] = body.split(/\s+/, 1);
      const attrs = parseAttributes(body.slice(name.length));
      const node = { name, attrs, children: [] };
      current(stack).children.push(node);
      if (!selfClosing) stack.push(node);
      continue;
    }
    if (token.trim()) current(stack).children.push(decodeXml(token));
  }
  if (stack.length !== 1) throw new Error(`Unclosed XML tag: ${current(stack).name}`);
  return root2;
}
function parseAttributes(input) {
  const attrs = {};
  const attrPattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while (match = attrPattern.exec(input)) {
    attrs[match[1]] = decodeXml(match[2] ?? match[3] ?? "");
  }
  return attrs;
}
function current(stack) {
  return stack[stack.length - 1];
}
function firstElement(node) {
  return node.children.find((child) => typeof child !== "string") ?? null;
}
function elementChildren(node) {
  return node.children.filter((child) => typeof child !== "string");
}
function textContent(node) {
  return node.children.filter((child) => typeof child === "string").join("").trim();
}
function isMachineWrapper(node) {
  return node.name.toLowerCase() === "xcon" && !!firstElement(node) && isMachineValueNode(firstElement(node));
}
function isMachineValueNode(node) {
  return ["x", "c", "o", "int", "double", "number", "bool", "datetime", "null"].includes(
    node.name.toLowerCase()
  );
}
function parseMachineValue(node) {
  const name = node.name.toLowerCase();
  if (name === "x") return parseMachineObject(node);
  if (name === "c") return elementChildren(node).map((child) => parseMachineValue(child));
  if (name === "int") return Number.parseInt(textContent(node), 10);
  if (name === "double" || name === "number") return Number(textContent(node));
  if (name === "bool") return textContent(node).toLowerCase() === "true";
  if (name === "null") return null;
  return textContent(node);
}
function parseMachineObject(node) {
  const output = new XconObject();
  const children2 = elementChildren(node);
  for (let index2 = 0; index2 < children2.length; index2 += 1) {
    const keyNode = children2[index2];
    if (keyNode.name.toLowerCase() !== "n") continue;
    const key = textContent(keyNode);
    const valueNode = children2[index2 + 1];
    if (!key || !valueNode) continue;
    if (!output.contains(key)) output.add(key, parseMachineValue(valueNode));
    index2 += 1;
  }
  return output;
}
function parseSemanticComponent(node, stripStructuralName = false) {
  const output = new XconObject();
  const type2 = toPublicType(node.name);
  output.add("type", type2);
  const metadata = new XconObject();
  for (const [name, rawValue] of Object.entries(node.attrs)) {
    if (stripStructuralName && name === "name") continue;
    if (name.startsWith("xcon-prop-")) {
      output.add(name.slice(10), parseAttributeByPropertySpec(name.slice(10), rawValue, type2));
      continue;
    }
    if (name.includes(":")) {
      metadata.add(name, parseAttributeByPropertySpec(name, rawValue, type2));
    } else {
      output.add(name, parseAttributeByPropertySpec(name, rawValue, type2));
    }
  }
  if (metadata.count > 0) output.add("metadata", metadata);
  const text = textContent(node);
  if (text && !output.contains("text")) output.add("text", text);
  const childElements = elementChildren(node);
  const arrayChildren = childElements.filter(isSemanticArrayWrapper);
  arrayChildren.forEach((child) => {
    output.set(toArrayPropertyName(child.name), parseSemanticArray(child));
  });
  const componentChildren = childElements.filter((child) => !isSemanticArrayWrapper(child));
  if (componentChildren.length > 0) {
    const components = new XconObject();
    componentChildren.forEach((child, index2) => {
      const structuralName = child.attrs.name;
      const component = parseSemanticComponent(child, typeof structuralName === "string" && !!structuralName);
      const id2 = component.get("id");
      const key = typeof id2 === "string" && id2 ? id2 : typeof structuralName === "string" && structuralName ? structuralName : `${component.getString("type", "component")}${index2 + 1}`;
      components.add(key, component);
    });
    if (output.contains("componentsOrder")) {
      components.add("componentsOrder", output.get("componentsOrder"));
      output.remove("componentsOrder");
    }
    output.add("components", components);
  }
  return output;
}
function isSemanticArrayWrapper(node) {
  return ["items", "slides"].includes(node.name.toLowerCase());
}
function toArrayPropertyName(name) {
  const normalized = name.toLowerCase();
  if (normalized === "items") return "items";
  return "slides";
}
function parseSemanticArray(node) {
  return elementChildren(node).map((child) => {
    if (child.name === "Value") {
      const raw = child.attrs.json ?? textContent(child);
      try {
        return jsonValueToXcon2(JSON.parse(raw));
      } catch {
        return parseAttributeValue(raw);
      }
    }
    return parseSemanticComponent(child, child.attrs.name !== void 0);
  });
}
function toPublicType(name) {
  return semanticTypeAliases[name] ?? name.charAt(0).toLowerCase() + name.slice(1);
}
function parseAttributeValue(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]") || trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return jsonValueToXcon2(parsed);
    } catch {
      return value;
    }
  }
  return value;
}
function jsonValueToXcon2(value) {
  if (value === void 0 || value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value ?? null;
  }
  if (Array.isArray(value)) return value.map((item) => jsonValueToXcon2(item));
  if (typeof value === "object") return new XconObject(value);
  return String(value);
}
function decodeXml(value) {
  return value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&amp;", "&");
}

// packages/core/src/parser/tagless/index.ts
function fromTagless(text) {
  const trimmed = text.trim();
  if (trimmed.length < 8) throw new Error("TAGLESS input is too short.");
  const prefix = Array.from(trimmed.slice(0, 8)).slice(0, 4).join("");
  const suffix = Array.from(trimmed).slice(-4).join("");
  const markerSet = createMarkerSet(prefix, suffix);
  const body = trimmed.slice(prefix.length, trimmed.length - suffix.length);
  const cursor = { index: 0 };
  const value = readValue(body, cursor, markerSet);
  if (!isXconObject(value)) throw new Error("TAGLESS root must be a dictionary.");
  return applyPropertyTypes(value);
}
function createMarkerSet(markers, endMarkers) {
  const open = Array.from(markers);
  const close = Array.from(endMarkers);
  if (open.length !== 4 || close.length !== 4) {
    throw new Error("TAGLESS markers and endMarkers must each contain exactly 4 characters.");
  }
  if (new Set(open).size !== 4 || new Set(close).size !== 4) {
    throw new Error("TAGLESS markers must be unique.");
  }
  if ([...open, ...close].some((marker) => /\s|\p{Cc}|%/u.test(marker))) {
    throw new Error("TAGLESS markers cannot contain whitespace, percent signs, or control characters.");
  }
  return { open, close, prefix: open.join(""), suffix: close.join("") };
}
function readValue(text, cursor, markerSet) {
  skipWhitespace(text, cursor);
  const { open, close } = markerSet;
  const marker = text[cursor.index];
  if (marker === open[0]) return readObject(text, cursor, markerSet);
  if (marker === open[1]) return readArray(text, cursor, markerSet);
  if (marker === open[2]) return readPrimitive(text, cursor, markerSet);
  throw new Error(`Unexpected TAGLESS marker at ${cursor.index}: ${marker || "<eof>"}`);
}
function readObject(text, cursor, markerSet) {
  const { open, close } = markerSet;
  const output = new XconObject();
  cursor.index += open[0].length;
  while (cursor.index < text.length && text[cursor.index] !== close[0]) {
    skipWhitespace(text, cursor);
    if (text[cursor.index] === close[0]) break;
    expect(text, cursor, open[3]);
    const key = readUntil(text, cursor, close[3]);
    const value = readValue(text, cursor, markerSet);
    if (!output.contains(key)) output.add(key, value);
  }
  expect(text, cursor, close[0]);
  return output;
}
function readArray(text, cursor, markerSet) {
  const { open, close } = markerSet;
  const output = [];
  cursor.index += open[1].length;
  while (cursor.index < text.length && text[cursor.index] !== close[1]) {
    skipWhitespace(text, cursor);
    if (text[cursor.index] === close[1]) break;
    output.push(readValue(text, cursor, markerSet));
  }
  expect(text, cursor, close[1]);
  return output;
}
function readPrimitive(text, cursor, markerSet) {
  const { open, close } = markerSet;
  cursor.index += open[2].length;
  const raw = readUntil(text, cursor, close[2]);
  return parseUnquotedPrimitive(raw);
}
function expect(text, cursor, marker) {
  skipWhitespace(text, cursor);
  if (text[cursor.index] !== marker) {
    throw new Error(`Expected TAGLESS marker "${marker}" at ${cursor.index}.`);
  }
  cursor.index += marker.length;
}
function readUntil(text, cursor, marker) {
  const end = text.indexOf(marker, cursor.index);
  if (end < 0) throw new Error(`Unclosed TAGLESS marker "${marker}".`);
  const value = text.slice(cursor.index, end);
  cursor.index = end + marker.length;
  return decodePayload(value);
}
function decodePayload(value) {
  return decodeURIComponent(value);
}
function skipWhitespace(text, cursor) {
  while (cursor.index < text.length && /\s/.test(text[cursor.index])) cursor.index += 1;
}

// packages/core/src/parser/sketch/index.ts
var quotedTokenPrefix = "\0quoted:";
var SketchParseError = class extends SyntaxError {
  constructor(message, line, column = 1) {
    super(`XCON/SKETCH parse error at line ${line}: ${message}`);
    this.line = line;
    this.column = column;
    this.name = "SketchParseError";
  }
  line;
  column;
};
function fromSketch(source) {
  const lines = preprocessLines(source);
  const root2 = parseRoot(lines);
  normalizeSketchAliases(root2);
  return fromJSONObject(root2);
}
function parseRoot(lines) {
  if (lines.length === 0) throw new SketchParseError("Expected screen declaration.", 1);
  const root2 = {
    type: "form",
    pos: [0, 0, 360, 220]
  };
  const components = [];
  const stack = [{ kind: "root", indent: -1, target: root2, children: components }];
  const counts = /* @__PURE__ */ new Map();
  let hasScreen = false;
  for (let index2 = 0; index2 < lines.length; index2 += 1) {
    const line = lines[index2];
    if (line.text.startsWith("screen ")) {
      if (line.indent !== 0) throw new SketchParseError("Screen declaration must not be indented.", line.number);
      Object.assign(root2, parseScreen(line));
      hasScreen = true;
      continue;
    }
    if (!hasScreen) throw new SketchParseError("Expected root screen declaration.", line.number);
    while (line.indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (line.text.startsWith("- ")) {
      if (parent.kind !== "array") throw new SketchParseError("Array item must be indented under an array property.", line.number);
      parent.items.push(parseScalar(line.text.slice(2).trim(), line));
      continue;
    }
    if (isComponentDeclaration(line.text)) {
      if (parent.kind !== "root" && parent.kind !== "component") {
        throw new SketchParseError("Components must be declared under a screen or component.", line.number);
      }
      const component = parseComponent(line, counts);
      parent.children.push(component);
      stack.push({ kind: "component", indent: line.indent, component, children: component.children });
      continue;
    }
    if (parent.kind === "object") {
      const consumedJsonPropertyIndex2 = consumeJsonProperty(parent.target, lines, index2);
      if (consumedJsonPropertyIndex2 !== null) {
        index2 = consumedJsonPropertyIndex2;
        continue;
      }
      applyObjectProperty(parent.target, line);
      continue;
    }
    if (parent.kind === "array") throw new SketchParseError('Array items must start with "- ".', line.number);
    const target = parent.kind === "component" ? parent.component.props : parent.target;
    const consumedJsonPropertyIndex = consumeJsonProperty(target, lines, index2);
    if (consumedJsonPropertyIndex !== null) {
      index2 = consumedJsonPropertyIndex;
      continue;
    }
    if (isBlockProperty(line, lines[index2 + 1])) {
      stack.push(createBlockProperty(target, line, lines[index2 + 1]));
      continue;
    }
    applyProperty(target, line);
  }
  if (!hasScreen) throw new SketchParseError("Expected screen declaration.", lines[0]?.number ?? 1);
  if (components.length > 0) root2.components = emitComponents(components);
  return root2;
}
function preprocessLines(source) {
  const rawLines = source.replace(/\r\n/g, "\n").split("\n");
  for (let index2 = 0; index2 < rawLines.length; index2 += 1) {
    if (rawLines[index2].includes("	")) {
      throw new SketchParseError("Tabs are not supported for indentation. Use spaces.", index2 + 1);
    }
  }
  const contentLines = rawLines.filter((raw) => stripComment(raw).trim());
  const commonIndent = contentLines.length === 0 ? 0 : Math.min(...contentLines.map((raw) => raw.length - raw.trimStart().length));
  return rawLines.map((raw, index2) => {
    if (raw.includes("	")) {
      throw new SketchParseError("Tabs are not supported for indentation. Use spaces.", index2 + 1);
    }
    const dedented = raw.slice(commonIndent);
    const withoutComment = stripComment(dedented);
    const text = withoutComment.trim();
    if (!text) return null;
    return {
      number: index2 + 1,
      indent: withoutComment.length - withoutComment.trimStart().length,
      text
    };
  }).filter((line) => Boolean(line));
}
function stripComment(raw) {
  let quoted = false;
  for (let index2 = 0; index2 < raw.length - 1; index2 += 1) {
    const char = raw[index2];
    if (char === '"' && raw[index2 - 1] !== "\\") {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === "/" && raw[index2 + 1] === "/" && (index2 === 0 || /\s/.test(raw[index2 - 1]))) {
      return raw.slice(0, index2);
    }
  }
  return raw;
}
function parseScreen(line) {
  const tokens = tokenize(line.text);
  if (tokens.shift() !== "screen") throw new SketchParseError("Expected screen declaration.", line.number);
  const root2 = { type: "form" };
  if (tokens.length === 0) throw new SketchParseError("Expected screen size like 390x844.", line.number);
  if (tokens[0] && !isSizeToken(tokens[0])) {
    root2.name = parseStringToken(tokens.shift(), line);
  }
  const size = tokens.shift();
  if (!size) throw new SketchParseError("Expected screen size like 390x844.", line.number);
  const dimensions = parseDimensions(size);
  if (!dimensions) throw new SketchParseError("Expected screen size like 390x844.", line.number);
  root2.pos = [0, 0, dimensions[0], dimensions[1]];
  applyInlineProps(root2, tokens, line);
  return root2;
}
function isComponentDeclaration(text) {
  return /^[A-Za-z_][\w-]*\s*:\s*[A-Za-z_][\w-]*/.test(text) || /^line\s+from\s+/.test(text) || /^(?:connector|arrow)\s+from\s+/.test(text) || /^[A-Za-z_][\w-]*(?:\s+"(?:[^"\\]|\\.)*")?\s+at\s+/.test(text);
}
function parseComponent(line, counts) {
  const tokens = tokenize(line.text);
  const first = tokens.shift();
  if (!first) throw new SketchParseError("Expected component declaration.", line.number);
  let name;
  let type2;
  if (tokens[0] === ":") {
    name = first;
    tokens.shift();
    const explicitType = tokens.shift();
    if (!explicitType) throw new SketchParseError("Expected component type after name.", line.number);
    type2 = explicitType;
  } else {
    type2 = first;
    name = nextComponentName(type2, counts);
  }
  const props = { type: type2, name };
  if (type2 === "line" && tokens[0] === "from") {
    Object.assign(props, parseLineFromLayout(tokens, line));
    applyInlineProps(props, tokens, line);
    return { name, props, children: [] };
  }
  if ((type2 === "connector" || type2 === "arrow") && tokens[0] === "from") {
    Object.assign(props, parseConnectorLayout(tokens, line, type2));
    applyInlineProps(props, tokens, line);
    return { name, props, children: [] };
  }
  const text = tokens[0] && tokens[0] !== "at" ? parseStringToken(tokens.shift(), line) : void 0;
  Object.assign(props, primaryText(type2, text));
  if (tokens.shift() !== "at") throw new SketchParseError("Expected component layout: at x y width height.", line.number);
  props.pos = parsePosition(tokens, line);
  applyInlineProps(props, tokens, line);
  return { name, props, children: [] };
}
function parseConnectorLayout(tokens, line, declaredType) {
  if (tokens.shift() !== "from") throw new SketchParseError("Expected connector layout: from source.anchor to target.anchor.", line.number);
  const from = parseConnectorEndpoint(tokens, line, "Expected connector source after from.");
  if (tokens.shift() !== "to") throw new SketchParseError("Expected connector layout: from source.anchor to target.anchor.", line.number);
  const to = parseConnectorEndpoint(tokens, line, "Expected connector target after to.");
  return {
    type: "connector",
    from,
    to,
    ...declaredType === "arrow" ? { end: "arrow" } : {}
  };
}
function parseConnectorEndpoint(tokens, line, message) {
  const ref = tokens.shift();
  if (!ref || ref === "to") throw new SketchParseError(message, line.number);
  const parsed = parseStringToken(ref, line);
  if (!parsed) throw new SketchParseError(message, line.number);
  if (parsed.includes(".")) {
    const parts = parsed.split(".");
    const anchor2 = parts.pop() || "center";
    const target = parts.join(".");
    if (!target) throw new SketchParseError(message, line.number);
    return { target, anchor: anchor2 };
  }
  const anchor = tokens[0] && tokens[0] !== "to" ? parseStringToken(tokens.shift(), line) : "center";
  return { target: parsed, anchor: anchor || "center" };
}
function parseLineFromLayout(tokens, line) {
  if (tokens.shift() !== "from") throw new SketchParseError("Expected line layout: from x y to x y.", line.number);
  const start2 = parsePoint(tokens, line, "Expected line start point after from.");
  if (tokens.shift() !== "to") throw new SketchParseError("Expected line layout: from x y to x y.", line.number);
  const end = parsePoint(tokens, line, "Expected line end point after to.");
  const left = Math.min(start2[0], end[0]);
  const top = Math.min(start2[1], end[1]);
  const width = Math.abs(end[0] - start2[0]);
  const height = Math.abs(end[1] - start2[1]);
  return {
    pos: [left, top, width, height],
    from: [start2[0] - left, start2[1] - top],
    to: [end[0] - left, end[1] - top]
  };
}
function parsePoint(tokens, line, message) {
  const first = tokens.shift();
  if (!first) throw new SketchParseError(message, line.number);
  const point = parseNumberListToken(first, line);
  while (point.length < 2 && tokens[0] && isNumberToken(tokens[0])) {
    point.push(parseNumber(tokens.shift(), line));
  }
  if (point.length < 2) throw new SketchParseError(message, line.number);
  return [point[0], point[1]];
}
function parsePosition(tokens, line) {
  const first = tokens.shift();
  if (!first) throw new SketchParseError("Expected position after at.", line.number);
  const pos = parseNumberListToken(first, line);
  while (pos.length < 4 && tokens[0] && isNumberToken(tokens[0])) {
    pos.push(parseNumber(tokens.shift(), line));
  }
  return pos;
}
function applyInlineProps(target, tokens, line) {
  let index2 = 0;
  while (index2 < tokens.length) {
    const key = normalizePropName(tokens[index2]);
    const value = tokens[index2 + 1];
    if (!key || value === void 0) throw new SketchParseError("Expected inline property name and value.", line.number);
    if (key === "size") {
      target.size = parseSizeValue(value, line);
    } else {
      target[key] = parseScalar(value, line);
    }
    index2 += 2;
  }
}
function applyProperty(props, line) {
  const tokens = tokenize(line.text);
  const key = tokens[0];
  const values = tokens.slice(1);
  if (!key || values.length === 0) throw new SketchParseError("Property requires a name and value.", line.number);
  if (key === "bg") props.backgroundColor = required(values, line, "bg requires a color.");
  else if (key === "color") props.color = required(values, line, "color requires a value.");
  else if (key === "font") props.font = parseFont(values, line);
  else if (key === "align") props.textAlign = required(values, line, "align requires a value.");
  else if (key === "valign") props.textVerticalAlign = required(values, line, "valign requires a value.");
  else if (key === "radius") mergeObject(props, "border", { radius: parseNumber(required(values, line, "radius requires a number."), line) });
  else if (key === "border") mergeObject(props, "border", parseBorder(values, line));
  else if (key === "shadow") props.shadow = parseShadow(values, line);
  else if (key === "gap") mergeObject(props, "al", { gap: parseScalar(required(values, line, "gap requires a value."), line) });
  else if (key === "padding") mergeObject(props, "al", { padding: parseSpacing(values, line) });
  else if (key === "layout") {
    const layout = required(values, line, "layout requires a value.");
    if (props.type === "button") props.layout = layout;
    else mergeObject(props, "al", { direction: layout });
  } else if (key === "scroll") props.scroll = required(values, line, "scroll requires a mode.");
  else props[normalizePropName(key)] = values.length === 1 ? parseScalar(values[0], line) : values.map((value) => parseScalar(value, line));
}
function applyObjectProperty(target, line) {
  const tokens = tokenize(line.text);
  const key = tokens[0];
  if (!key || tokens.length < 2) throw new SketchParseError("Object property requires a name and value.", line.number);
  target[normalizePropName(key)] = tokens.length === 2 ? parseScalar(tokens[1], line) : tokens.slice(1).map((value) => parseScalar(value, line)).join(" ");
}
function consumeJsonProperty(target, lines, index2) {
  const start2 = parseJsonPropertyStart(lines[index2]);
  if (!start2) return null;
  const fragments = [start2.value];
  let endIndex = index2;
  while (!isCompleteJsonValue(fragments.join("\n"))) {
    endIndex += 1;
    const next = lines[endIndex];
    if (!next) {
      throw new SketchParseError(`Unterminated JSON value for "${start2.key}".`, lines[index2].number);
    }
    fragments.push(next.text);
  }
  const json = fragments.join("\n");
  try {
    target[normalizePropName(start2.key)] = JSON.parse(json);
  } catch {
    throw new SketchParseError(`Invalid JSON value for "${start2.key}".`, lines[index2].number);
  }
  return endIndex;
}
function parseJsonPropertyStart(line) {
  const match = line.text.match(/^([A-Za-z_][\w-]*)\s+([\s\S]+)$/);
  if (!match) return null;
  const value = match[2].trim();
  if (!value.startsWith("{") && !value.startsWith("[")) return null;
  return { key: match[1], value };
}
function isCompleteJsonValue(value) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const char of value) {
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        quoted = false;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
    }
  }
  return depth === 0 && !quoted;
}
function isBlockProperty(line, next) {
  return tokenize(line.text).length === 1 && Boolean(next && next.indent > line.indent);
}
function createBlockProperty(props, line, next) {
  const key = normalizePropName(line.text);
  if (!next) throw new SketchParseError("Block property requires indented content.", line.number);
  if (next.text.startsWith("- ")) {
    const items = [];
    props[key] = items;
    return { kind: "array", indent: line.indent, items };
  }
  const target = {};
  props[key] = target;
  return { kind: "object", indent: line.indent, target };
}
function required(values, line, message) {
  if (!values[0]) throw new SketchParseError(message, line.number);
  return parseStringToken(values[0], line);
}
function parseFont(values, line) {
  if (values.length < 1) throw new SketchParseError("font requires at least a size.", line.number);
  if (values.length === 1) return { size: parseScalar(values[0], line) };
  if (isNumberToken(values[0])) return { size: parseNumber(values[0], line), weight: parseScalar(values[1], line) };
  return {
    family: parseStringToken(values[0], line),
    size: parseScalar(values[1], line),
    ...values[2] ? { weight: parseScalar(values[2], line) } : {}
  };
}
function parseBorder(values, line) {
  if (values.length < 1) throw new SketchParseError("border requires width.", line.number);
  return {
    width: parseNumber(values[0], line),
    ...values[1] ? { color: parseStringToken(values[1], line) } : {},
    ...values[2] ? { radius: parseNumber(values[2], line) } : {}
  };
}
function parseShadow(values, line) {
  if (values.length < 4) throw new SketchParseError("shadow requires x y blur opacity.", line.number);
  return {
    x: parseNumber(values[0], line),
    y: parseNumber(values[1], line),
    blur: parseNumber(values[2], line),
    opacity: parseNumber(values[3], line)
  };
}
function parseSpacing(values, line) {
  if (values.length === 0) throw new SketchParseError("spacing requires at least one value.", line.number);
  if (values.length === 1) return parseScalar(values[0], line);
  return values.map((value) => parseNumber(value, line));
}
function parseScalar(value, line) {
  if (value.startsWith(quotedTokenPrefix)) return value.slice(quotedTokenPrefix.length);
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (isNumberToken(value)) return Number(value);
  if (isNumberListToken(value)) return value.split(",").map(Number);
  if (isSizeToken(value)) return parseDimensions(value);
  if (value.startsWith("[") && value.endsWith("]") || value.startsWith("{") && value.endsWith("}")) {
    try {
      return JSON.parse(value);
    } catch {
      throw new SketchParseError(`Invalid JSON value "${value}".`, line.number);
    }
  }
  return value;
}
function parseStringToken(value, line) {
  const parsed = parseScalar(value, line);
  return parsed === null ? "null" : String(parsed);
}
function parseSizeValue(value, line) {
  if (isSizeToken(value)) return parseDimensions(value);
  return parseScalar(value, line);
}
function parseNumberListToken(value, line) {
  if (isNumberListToken(value)) return value.split(",").map(Number);
  if (isNumberToken(value)) return [Number(value)];
  throw new SketchParseError("Expected numeric position.", line.number);
}
function parseNumber(value, line) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new SketchParseError(`Expected number but received "${value}".`, line.number);
  return number;
}
function isNumberToken(value) {
  return /^-?(?:\d+|\d*\.\d+)$/.test(value);
}
function isNumberListToken(value) {
  return /^-?(?:\d+|\d*\.\d+),-?(?:\d+|\d*\.\d+)(?:,-?(?:\d+|\d*\.\d+))*$/.test(value);
}
function isSizeToken(value) {
  return /^-?(?:\d+|\d*\.\d+)x-?(?:\d+|\d*\.\d+)$/i.test(value);
}
function parseDimensions(value) {
  const match = value.match(/^(-?(?:\d+|\d*\.\d+))x(-?(?:\d+|\d*\.\d+))$/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}
function normalizePropName(key) {
  if (key === "bg") return "backgroundColor";
  return key;
}
function nextComponentName(type2, counts) {
  const count = (counts.get(type2) ?? 0) + 1;
  counts.set(type2, count);
  return `${type2}${count}`;
}
function primaryText(type2, text) {
  if (text === void 0) return {};
  if (type2 === "button") return { label: text };
  if (type2 === "textField" || type2 === "searchBar") return { placeholder: text };
  if (type2 === "label" || type2 === "textView" || type2 === "shape") return { text };
  return { text };
}
function emitComponents(components) {
  const output = {
    componentsOrder: components.map((component) => component.name).join(",")
  };
  for (const component of components) {
    if (component.children.length > 0) component.props.components = emitComponents(component.children);
    output[component.name] = component.props;
  }
  return output;
}
function mergeObject(target, key, patch) {
  const current3 = target[key];
  target[key] = { ...isRecord(current3) ? current3 : {}, ...patch };
}
function normalizeSketchAliases(value) {
  if (Array.isArray(value)) {
    value.forEach(normalizeSketchAliases);
    return;
  }
  if (!isRecord(value)) return;
  const font = value.font;
  if (isRecord(font)) {
    if (value.textAlign === void 0 && font.align !== void 0) {
      value.textAlign = font.align;
    }
    if (value.textVerticalAlign === void 0) {
      if (font.valign !== void 0) value.textVerticalAlign = font.valign;
      else if (font.verticalAlign !== void 0) value.textVerticalAlign = font.verticalAlign;
    }
    delete font.align;
    delete font.valign;
    delete font.verticalAlign;
  }
  Object.values(value).forEach(normalizeSketchAliases);
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function tokenize(input) {
  const tokens = [];
  let current3 = "";
  let quoted = false;
  let escaped = false;
  const push = () => {
    if (current3.length === 0) return;
    tokens.push(current3);
    current3 = "";
  };
  const pushQuoted = () => {
    tokens.push(`${quotedTokenPrefix}${current3}`);
    current3 = "";
  };
  for (let index2 = 0; index2 < input.length; index2 += 1) {
    const char = input[index2];
    if (quoted) {
      if (escaped) {
        if (char === "n") current3 += "\n";
        else if (char === "r") current3 += "\r";
        else if (char === "t") current3 += "	";
        else current3 += char;
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        quoted = false;
        pushQuoted();
        continue;
      }
      current3 += char;
      continue;
    }
    if (char === '"') {
      push();
      quoted = true;
      continue;
    }
    if (char === "{" || char === "[") {
      push();
      const jsonToken = readJsonToken(input, index2);
      if (jsonToken) {
        tokens.push(jsonToken.token);
        index2 = jsonToken.end;
        continue;
      }
    }
    if (/\s/.test(char)) {
      push();
      continue;
    }
    if (char === ":" && /^[A-Za-z_][\w-]*$/.test(current3) && input[index2 + 1] !== "/") {
      push();
      tokens.push(":");
      continue;
    }
    current3 += char;
  }
  push();
  return tokens;
}
function readJsonToken(input, start2) {
  const opener = input[start2];
  if (opener !== "{" && opener !== "[") return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index2 = start2; index2 < input.length; index2 += 1) {
    const char = input[index2];
    if (quoted) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === "{" || char === "[") {
      depth += 1;
      continue;
    }
    if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) return { token: input.slice(start2, index2 + 1), end: index2 };
    }
  }
  return null;
}

// packages/core/src/converter/index.ts
function parseBySyntax(input, syntax) {
  if (syntax === "json") return fromJSON(input);
  if (syntax === "xml") return fromXml(input);
  if (syntax === "sketch") return fromSketch(input);
  return fromTagless(input);
}

// packages/core/dist/model/index.js
var XconObject3 = class _XconObject {
  names = [];
  values = [];
  indexes = /* @__PURE__ */ new Map();
  constructor(initial) {
    if (!initial)
      return;
    if (Symbol.iterator in Object(initial) && !isPlainObject2(initial)) {
      for (const [name, value] of initial) {
        this.add(name, toXconValue2(value));
      }
      return;
    }
    for (const [name, value] of Object.entries(initial)) {
      this.add(name, toXconValue2(value));
    }
  }
  get count() {
    return this.names.length;
  }
  add(name, value) {
    if (this.contains(name))
      return this.set(name, value);
    this.indexes.set(name, this.names.length);
    this.names.push(name);
    this.values.push(toXconValue2(value));
    return this;
  }
  set(name, value) {
    const index2 = this.indexOf(name);
    if (index2 < 0)
      return this.add(name, value);
    this.values[index2] = toXconValue2(value);
    return this;
  }
  insert(index2, name, value) {
    if (this.contains(name))
      this.remove(name);
    const nextIndex = Math.max(0, Math.min(index2, this.names.length));
    this.names.splice(nextIndex, 0, name);
    this.values.splice(nextIndex, 0, toXconValue2(value));
    this.reindex();
    return this;
  }
  get(name, defaultValue) {
    const index2 = this.indexOf(name);
    if (index2 < 0)
      return defaultValue;
    return this.values[index2];
  }
  getKey(index2) {
    return this.names[index2];
  }
  getValue(index2) {
    return this.values[index2];
  }
  getString(name, defaultValue = "") {
    const value = this.get(name);
    return value === void 0 || value === null ? defaultValue : String(value);
  }
  contains(name) {
    return this.indexes.has(name);
  }
  indexOf(name) {
    return this.indexes.get(name) ?? -1;
  }
  remove(name) {
    const index2 = this.indexOf(name);
    if (index2 < 0)
      return false;
    this.removeAt(index2);
    return true;
  }
  removeAt(index2) {
    if (index2 < 0 || index2 >= this.names.length)
      return false;
    this.names.splice(index2, 1);
    this.values.splice(index2, 1);
    this.reindex();
    return true;
  }
  clear() {
    this.names.length = 0;
    this.values.length = 0;
    this.indexes.clear();
  }
  forEach(callback) {
    this.names.forEach((name, index2) => callback(this.values[index2], name, index2));
  }
  map(callback) {
    return this.names.map((name, index2) => callback(this.values[index2], name, index2));
  }
  filter(callback) {
    const next = new _XconObject();
    this.forEach((value, name, index2) => {
      if (callback(value, name, index2))
        next.add(name, cloneXconValue2(value, true));
    });
    return next;
  }
  reduce(callback, initialValue) {
    let accumulator = initialValue;
    this.forEach((value, name, index2) => {
      accumulator = callback(accumulator, value, name, index2);
    });
    return accumulator;
  }
  some(callback) {
    return this.names.some((name, index2) => callback(this.values[index2], name, index2));
  }
  every(callback) {
    return this.names.every((name, index2) => callback(this.values[index2], name, index2));
  }
  clone() {
    return new _XconObject(this);
  }
  deepClone() {
    const next = new _XconObject();
    this.forEach((value, name) => next.add(name, cloneXconValue2(value, true)));
    return next;
  }
  copy(source) {
    this.clear();
    const next = isXconObject2(source) ? source : new _XconObject(source);
    next.forEach((value, name) => this.add(name, cloneXconValue2(value, true)));
    return this;
  }
  entries() {
    return this.names.map((name, index2) => [name, this.values[index2]]);
  }
  keys() {
    return [...this.names];
  }
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
  reindex() {
    this.indexes.clear();
    this.names.forEach((name, index2) => this.indexes.set(name, index2));
  }
};
function isXconObject2(value) {
  return value instanceof XconObject3 || !!value && typeof value === "object" && typeof value.get === "function" && typeof value.set === "function" && typeof value.contains === "function";
}
function isPlainObject2(value) {
  if (!value || typeof value !== "object")
    return false;
  if (Array.isArray(value))
    return false;
  if (isXconObject2(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function toXconValue2(value) {
  if (value === void 0)
    return null;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (isXconObject2(value))
    return value;
  if (Array.isArray(value))
    return value.map((item) => toXconValue2(item));
  if (isPlainObject2(value))
    return new XconObject3(value);
  return String(value);
}
function cloneXconValue2(value, deep = false) {
  if (!deep)
    return value;
  if (isXconObject2(value))
    return value.deepClone();
  if (Array.isArray(value))
    return value.map((item) => cloneXconValue2(item, true));
  return value;
}

// packages/core/dist/parser/property-types.js
var stringProperties2 = /* @__PURE__ */ new Set([
  "type",
  "id",
  "name",
  "text",
  "label",
  "title",
  "subtitle",
  "message",
  "description",
  "placeholder",
  "src",
  "url",
  "href",
  "alt",
  "format",
  "inputType",
  "bind",
  "group",
  "library",
  "objectFit",
  "objectPosition",
  "backgroundColor",
  "backgroundImage",
  "color",
  "borderColor",
  "foregroundColor",
  "penColor",
  "accentColor",
  "selectedColor",
  "neighborColor",
  "panelBackground",
  "theme",
  "severity",
  "variant",
  "direction",
  "justify",
  "align",
  "textAlign",
  "textVerticalAlign",
  "textOverflow",
  "whiteSpace",
  "position",
  "orientation",
  "trigger",
  "accept",
  "poster",
  "initials",
  "componentsOrder",
  "content",
  "subject",
  "details",
  "errorCorrectionLevel",
  "family",
  "gradient",
  "boxShadow",
  "filled",
  "empty",
  "on",
  "off",
  "value",
  "inputMode",
  "fieldState",
  "floatLabel",
  "leadingBlock",
  "trailingButton",
  "prefixText",
  "suffixText",
  "otpGroup",
  "previewSize",
  "previewPosition",
  "textPosition",
  "animation",
  "chartType",
  "mode",
  "vizType",
  "pageFolder",
  "rootNodeId",
  "tileLayer",
  "initialView",
  "locale"
]);
var numberProperties2 = /* @__PURE__ */ new Set([
  "x",
  "y",
  "width",
  "height",
  "top",
  "right",
  "bottom",
  "left",
  "size",
  "fontSize",
  "fontWeight",
  "weight",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "itemWidth",
  "itemHeight",
  "minLength",
  "maxLength",
  "rows",
  "gap",
  "columns",
  "maxSize",
  "maxLines",
  "activeIndex",
  "selectedIndex",
  "opacity",
  "zIndex",
  "rotation",
  "radius",
  "borderWidth",
  "strokeWidth",
  "shadowBlur",
  "penWidth",
  "min",
  "max",
  "step",
  "otpIndex",
  "quality",
  "debounceDelay",
  "delay",
  "pageWidth",
  "pageHeight",
  "pages",
  "linkDistance",
  "charge",
  "friction",
  "gravity",
  "mutedOpacity",
  "elevation",
  "latitude",
  "longitude",
  "zoom"
]);
var booleanProperties2 = /* @__PURE__ */ new Set([
  "visible",
  "enabled",
  "hidden",
  "disabled",
  "readonly",
  "readOnly",
  "required",
  "checked",
  "show",
  "showCharCount",
  "showIcon",
  "showIcons",
  "showText",
  "showPreview",
  "showSearchButton",
  "showClearButton",
  "showSaveButton",
  "showCloseButton",
  "showCaption",
  "showThumbnails",
  "showToggle",
  "multiple",
  "selectable",
  "alpha",
  "allowCrop",
  "allowZoom",
  "controls",
  "autoplay",
  "loop",
  "muted",
  "showDots",
  "displayValue",
  "ticks",
  "backdropClose",
  "closeOnBackdrop",
  "renderHtml",
  "clear",
  "bold",
  "italic",
  "secureTextEntry",
  "clearButton",
  "arrow",
  "designer:locked",
  "responsive",
  "animation",
  "lineNumbers",
  "interactive",
  "showControls",
  "showSearch",
  "showFilters",
  "showLegend",
  "showMiniatures",
  "showZoom",
  "showFullscreen",
  "loadRegions",
  "autoCenter",
  "acceleration",
  "gradients",
  "enableDrag",
  "enableZoom",
  "enablePan",
  "enableClick",
  "enableHover",
  "editable",
  "weekends",
  "autoUpload"
]);
var numberArrayProperties2 = /* @__PURE__ */ new Set([
  "pos",
  "contentSize",
  "offset"
]);
var spacingProperties2 = /* @__PURE__ */ new Set([
  "padding",
  "margin",
  "inset",
  "thickness"
]);
var stringArrayProperties2 = /* @__PURE__ */ new Set([
  "defaultOpen",
  "expandedNodes",
  "tags",
  "classList"
]);
var jsonProperties2 = /* @__PURE__ */ new Set([
  "font",
  "border",
  "shadow",
  "effects",
  "background",
  "al",
  "states",
  "icon",
  "icons",
  "prefix",
  "suffix",
  "labels",
  "indicator",
  "itemSize",
  "separator",
  "image",
  "params",
  "content",
  "template",
  "templates",
  "options",
  "data",
  "images",
  "children",
  "actions",
  "triggers",
  "backend",
  "database",
  "auth",
  "storage",
  "server",
  "chartData",
  "chartOptions",
  "modules",
  "config",
  "cells",
  "snapshot",
  "grid",
  "select",
  "fixed",
  "pageData",
  "when",
  "nodes",
  "links",
  "edges",
  "clusterColors",
  "markers",
  "headerToolbar",
  "events",
  "autoplay",
  "dataTemplate"
]);
var componentPropertyTypes2 = {
  slider: { value: "number", min: "number", max: "number", step: "number" },
  progressBar: { value: "number", max: "number" },
  rating: { value: "number", max: "number" },
  spinner: { size: "number" },
  barcode: { text: "string", width: "number", height: "number", displayValue: "boolean" },
  qrCode: { text: "string", size: "number" },
  colorPicker: { value: "string", alpha: "boolean" },
  datePicker: { value: "string", min: "string", max: "string", showIcon: "boolean" },
  timePicker: { value: "string", min: "string", max: "string", showIcon: "boolean" },
  textField: {
    value: "string",
    bind: "string",
    inputType: "string",
    inputMode: "string",
    fieldState: "string",
    floatLabel: "string",
    leadingBlock: "string",
    trailingButton: "string",
    prefixText: "string",
    suffixText: "string",
    otpGroup: "string",
    readonly: "boolean",
    readOnly: "boolean",
    enabled: "boolean",
    required: "boolean",
    secureTextEntry: "boolean",
    clearButton: "boolean",
    minLength: "number",
    maxLength: "number",
    otpIndex: "number"
  },
  passwordField: { value: "string" },
  textarea: { value: "string", rows: "number", showCharCount: "boolean" },
  select: { value: "string" },
  checkbox: { value: "string", checked: "boolean" },
  radioButton: { value: "string", checked: "boolean" },
  switch: { checked: "boolean" },
  chart: { chartType: "string", chartData: "json", chartOptions: "json", responsive: "boolean", animation: "boolean" },
  codeEditor: { value: "string", mode: "string", theme: "string", lineNumbers: "boolean", readOnly: "boolean" },
  richEditor: { theme: "string", placeholder: "string", readOnly: "boolean", modules: "json" },
  dataViz: { vizType: "string", data: "json", config: "json", interactive: "boolean" },
  spanGrid: {
    data: "json",
    dataTemplate: "json",
    tabledata: "json",
    cells: "json",
    config: "json",
    options: "json",
    snapshot: "json",
    grid: "json",
    merges: "json",
    mergeCells: "json",
    spans: "json",
    select: "json",
    fixed: "json",
    fixedRows: "number",
    fixedColumns: "number",
    fixedRowCount: "number",
    fixedColumnCount: "number",
    columns: "json",
    cols: "json",
    rows: "json",
    readonly: "boolean",
    readOnly: "boolean",
    zoom: "number",
    reserveScrollbarInViewport: "boolean"
  },
  flipbook: {
    pageWidth: "number",
    pageHeight: "number",
    pages: "number",
    pageFolder: "string",
    pageData: "json",
    showControls: "boolean",
    showMiniatures: "boolean",
    showZoom: "boolean",
    showFullscreen: "boolean"
  },
  networkDiagram: {
    nodeRadius: "number",
    linkDistance: "number",
    charge: "number",
    friction: "number",
    gravity: "number",
    nodes: "json",
    links: "json",
    edges: "json",
    clusterColors: "json",
    showLabels: "boolean",
    showArrows: "boolean",
    showControls: "boolean",
    showSearch: "boolean",
    showFilters: "boolean",
    showLegend: "boolean",
    enableDrag: "boolean",
    enableZoom: "boolean",
    enablePan: "boolean",
    enableHover: "boolean",
    mutedOpacity: "number",
    theme: "string",
    selectedColor: "string",
    neighborColor: "string",
    panelBackground: "string"
  },
  map: {
    latitude: "number",
    longitude: "number",
    zoom: "number",
    tileLayer: "string",
    provider: "string",
    mapProvider: "string",
    tileUrl: "string",
    tileTemplate: "string",
    snapshotUrl: "string",
    snapshotAlt: "string",
    snapshotFit: "string",
    snapshotPosition: "string",
    staticImage: "string",
    mapImage: "string",
    objectFit: "string",
    objectPosition: "string",
    attribution: "string",
    markers: "json",
    heatmap: "json",
    polylines: "json",
    polygons: "json",
    clustering: "boolean",
    markerIcons: "json",
    enableZoom: "boolean",
    enablePan: "boolean",
    showControls: "boolean"
  },
  calendar: {
    initialView: "string",
    headerToolbar: "json",
    events: "json",
    editable: "boolean",
    selectable: "boolean",
    weekends: "boolean",
    locale: "string",
    theme: "string"
  },
  myCounter: { value: "number" },
  myProgressBar: { value: "number", max: "number" }
};
function parseUnquotedPrimitive2(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return jsonValueToXcon3(JSON.parse(trimmed));
    } catch {
      return raw;
    }
  }
  return raw;
}
function parseAttributeByPropertySpec2(key, value, componentType) {
  return coercePrimitive2(value, getPropertyType2(key, componentType));
}
function applyPropertyTypes2(value) {
  return coerceValue2(value, void 0, void 0);
}
function coerceValue2(value, key, componentType) {
  const propertyType = getPropertyType2(key, componentType);
  if (isXconObject2(value))
    return coerceObject2(value);
  if (Array.isArray(value))
    return coerceArray2(value, propertyType);
  if (typeof value === "string")
    return coercePrimitive2(value, propertyType);
  return value;
}
function coerceObject2(object) {
  const componentType = typeof object.get("type") === "string" ? object.getString("type") : void 0;
  object.forEach((value, key) => {
    object.set(key, coerceValue2(value, key, componentType));
  });
  return object;
}
function coerceArray2(value, propertyType) {
  if (propertyType === "number-array")
    return value.map((item) => coerceArrayItem2(item, "number"));
  if (propertyType === "spacing")
    return value.map((item) => coerceArrayItem2(item, "number"));
  if (propertyType === "string-array")
    return value.map((item) => coerceArrayItem2(item, "string"));
  return value.map((item) => coerceValue2(item, void 0, void 0));
}
function coerceArrayItem2(value, propertyType) {
  if (typeof value === "string")
    return coercePrimitive2(value, propertyType);
  if (isXconObject2(value))
    return coerceObject2(value);
  if (Array.isArray(value))
    return value.map((item) => coerceArrayItem2(item, propertyType));
  return value;
}
function coercePrimitive2(value, propertyType) {
  if (!propertyType)
    return value;
  if (propertyType === "string")
    return value;
  const trimmed = value.trim();
  if (trimmed === "null")
    return null;
  if (propertyType === "json" || propertyType === "spacing" || propertyType === "number-array" || propertyType === "string-array") {
    if (trimmed.startsWith("[") && trimmed.endsWith("]") || trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = jsonValueToXcon3(JSON.parse(trimmed));
        if (propertyType === "spacing" && Array.isArray(parsed))
          return coerceArray2(parsed, "number-array");
        if (propertyType === "number-array" && Array.isArray(parsed))
          return coerceArray2(parsed, "number-array");
        if (propertyType === "string-array" && Array.isArray(parsed))
          return coerceArray2(parsed, "string-array");
        return applyPropertyTypes2(parsed);
      } catch {
        return value;
      }
    }
    if (propertyType === "spacing" && /^-?\d+(?:\.\d+)?$/.test(trimmed))
      return Number(trimmed);
    if (propertyType === "number-array" && isCommaSeparatedNumberList2(trimmed)) {
      return trimmed.split(",").map((item) => Number(item.trim()));
    }
    if (propertyType === "json") {
      const parsedObjectAttribute = parseKeyValueObjectAttribute2(trimmed);
      if (parsedObjectAttribute)
        return parsedObjectAttribute;
    }
    return value;
  }
  if (propertyType === "boolean") {
    if (trimmed === "true")
      return true;
    if (trimmed === "false")
      return false;
    return value;
  }
  if (propertyType === "number") {
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed))
      return Number(trimmed);
    return value;
  }
  return value;
}
function isCommaSeparatedNumberList2(value) {
  return /^-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)+$/.test(value);
}
function parseKeyValueObjectAttribute2(value) {
  if (!value.includes(":"))
    return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^(data|mailto|tel|urn):/i.test(value))
    return null;
  const parts = value.split(";").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0)
    return null;
  const output = new XconObject3();
  for (const part of parts) {
    const separator = part.indexOf(":");
    if (separator <= 0)
      return null;
    const key = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    if (!/^[A-Za-z_][\w:-]*$/.test(key))
      return null;
    output.add(key, coercePrimitive2(rawValue, getPropertyType2(key, void 0)));
  }
  return output.count > 0 ? output : null;
}
function getPropertyType2(key, componentType) {
  if (!key)
    return void 0;
  const componentTypeMap = componentType ? componentPropertyTypes2[componentType] : void 0;
  if (componentTypeMap?.[key])
    return componentTypeMap[key];
  if (spacingProperties2.has(key))
    return "spacing";
  if (numberArrayProperties2.has(key))
    return "number-array";
  if (stringArrayProperties2.has(key))
    return "string-array";
  if (jsonProperties2.has(key))
    return "json";
  if (stringProperties2.has(key))
    return "string";
  if (numberProperties2.has(key))
    return "number";
  if (booleanProperties2.has(key))
    return "boolean";
  return void 0;
}
function jsonValueToXcon3(value) {
  if (value === void 0 || value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value ?? null;
  }
  if (Array.isArray(value))
    return value.map((item) => jsonValueToXcon3(item));
  if (typeof value === "object")
    return new XconObject3(value);
  return String(value);
}

// packages/core/dist/parser/json/index.js
function fromJSON2(input) {
  const parsed = typeof input === "string" ? JSON.parse(input) : input;
  return fromJSONObject2(parsed);
}
function fromJSONObject2(input) {
  const value = toXconValue2(input);
  if (!isXconObject2(value)) {
    throw new TypeError("XCON/JSON root must be an object.");
  }
  return applyPropertyTypes2(value);
}

// packages/core/dist/parser/xml/index.js
var semanticTypeAliases2 = {
  XCON: "xcon",
  Form: "form",
  List: "list",
  XList: "list",
  Label: "label",
  Text: "label",
  TextField: "textField",
  TextView: "textView",
  Button: "button",
  Panel: "panel",
  Checkbox: "checkbox",
  RadioButton: "radioButton",
  Image: "image",
  VideoView: "videoView",
  Banner: "banner",
  Shape: "shape",
  Stack: "stack",
  FlexBox: "flexBox",
  Grid: "grid",
  Card: "card"
};
function fromXml2(xmlString) {
  const document2 = parseXml2(xmlString);
  const root2 = firstElement2(document2);
  if (!root2)
    throw new Error("XML document is empty.");
  if (isMachineWrapper2(root2)) {
    const child = firstElement2(root2);
    if (!child)
      throw new Error("XCON XML wrapper does not contain a value.");
    return requireObject2(parseMachineValue2(child));
  }
  if (isMachineValueNode2(root2))
    return requireObject2(parseMachineValue2(root2));
  return parseSemanticComponent2(root2);
}
function requireObject2(value) {
  if (!isXconObject2(value))
    throw new Error("XCON XML root must be an object.");
  return value;
}
function parseXml2(input) {
  const root2 = { name: "#document", attrs: {}, children: [] };
  const stack = [root2];
  const tokenPattern = /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][\w:.-]*(?:\s+[^<>]*?)?\/?>|[^<]+/g;
  const tokens = input.match(tokenPattern) ?? [];
  for (const token of tokens) {
    if (!token || token.startsWith("<?") || token.startsWith("<!--"))
      continue;
    if (token.startsWith("<![CDATA[")) {
      current2(stack).children.push(token.slice(9, -3));
      continue;
    }
    if (token.startsWith("</")) {
      const name = token.slice(2, -1).trim();
      const node = stack.pop();
      if (!node || node.name !== name)
        throw new Error(`Mismatched XML closing tag: ${name}`);
      continue;
    }
    if (token.startsWith("<")) {
      const selfClosing = token.endsWith("/>");
      const body = token.slice(1, selfClosing ? -2 : -1).trim();
      const [name = ""] = body.split(/\s+/, 1);
      const attrs = parseAttributes2(body.slice(name.length));
      const node = { name, attrs, children: [] };
      current2(stack).children.push(node);
      if (!selfClosing)
        stack.push(node);
      continue;
    }
    if (token.trim())
      current2(stack).children.push(decodeXml2(token));
  }
  if (stack.length !== 1)
    throw new Error(`Unclosed XML tag: ${current2(stack).name}`);
  return root2;
}
function parseAttributes2(input) {
  const attrs = {};
  const attrPattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while (match = attrPattern.exec(input)) {
    attrs[match[1]] = decodeXml2(match[2] ?? match[3] ?? "");
  }
  return attrs;
}
function current2(stack) {
  return stack[stack.length - 1];
}
function firstElement2(node) {
  return node.children.find((child) => typeof child !== "string") ?? null;
}
function elementChildren2(node) {
  return node.children.filter((child) => typeof child !== "string");
}
function textContent2(node) {
  return node.children.filter((child) => typeof child === "string").join("").trim();
}
function isMachineWrapper2(node) {
  return node.name.toLowerCase() === "xcon" && !!firstElement2(node) && isMachineValueNode2(firstElement2(node));
}
function isMachineValueNode2(node) {
  return ["x", "c", "o", "int", "double", "number", "bool", "datetime", "null"].includes(node.name.toLowerCase());
}
function parseMachineValue2(node) {
  const name = node.name.toLowerCase();
  if (name === "x")
    return parseMachineObject2(node);
  if (name === "c")
    return elementChildren2(node).map((child) => parseMachineValue2(child));
  if (name === "int")
    return Number.parseInt(textContent2(node), 10);
  if (name === "double" || name === "number")
    return Number(textContent2(node));
  if (name === "bool")
    return textContent2(node).toLowerCase() === "true";
  if (name === "null")
    return null;
  return textContent2(node);
}
function parseMachineObject2(node) {
  const output = new XconObject3();
  const children2 = elementChildren2(node);
  for (let index2 = 0; index2 < children2.length; index2 += 1) {
    const keyNode = children2[index2];
    if (keyNode.name.toLowerCase() !== "n")
      continue;
    const key = textContent2(keyNode);
    const valueNode = children2[index2 + 1];
    if (!key || !valueNode)
      continue;
    if (!output.contains(key))
      output.add(key, parseMachineValue2(valueNode));
    index2 += 1;
  }
  return output;
}
function parseSemanticComponent2(node, stripStructuralName = false) {
  const output = new XconObject3();
  const type2 = toPublicType2(node.name);
  output.add("type", type2);
  const metadata = new XconObject3();
  for (const [name, rawValue] of Object.entries(node.attrs)) {
    if (stripStructuralName && name === "name")
      continue;
    if (name.startsWith("xcon-prop-")) {
      output.add(name.slice(10), parseAttributeByPropertySpec2(name.slice(10), rawValue, type2));
      continue;
    }
    if (name.includes(":")) {
      metadata.add(name, parseAttributeByPropertySpec2(name, rawValue, type2));
    } else {
      output.add(name, parseAttributeByPropertySpec2(name, rawValue, type2));
    }
  }
  if (metadata.count > 0)
    output.add("metadata", metadata);
  const text = textContent2(node);
  if (text && !output.contains("text"))
    output.add("text", text);
  const childElements = elementChildren2(node);
  const arrayChildren = childElements.filter(isSemanticArrayWrapper2);
  arrayChildren.forEach((child) => {
    output.set(toArrayPropertyName2(child.name), parseSemanticArray2(child));
  });
  const componentChildren = childElements.filter((child) => !isSemanticArrayWrapper2(child));
  if (componentChildren.length > 0) {
    const components = new XconObject3();
    componentChildren.forEach((child, index2) => {
      const structuralName = child.attrs.name;
      const component = parseSemanticComponent2(child, typeof structuralName === "string" && !!structuralName);
      const id2 = component.get("id");
      const key = typeof id2 === "string" && id2 ? id2 : typeof structuralName === "string" && structuralName ? structuralName : `${component.getString("type", "component")}${index2 + 1}`;
      components.add(key, component);
    });
    if (output.contains("componentsOrder")) {
      components.add("componentsOrder", output.get("componentsOrder"));
      output.remove("componentsOrder");
    }
    output.add("components", components);
  }
  return output;
}
function isSemanticArrayWrapper2(node) {
  return ["items", "slides"].includes(node.name.toLowerCase());
}
function toArrayPropertyName2(name) {
  const normalized = name.toLowerCase();
  if (normalized === "items")
    return "items";
  return "slides";
}
function parseSemanticArray2(node) {
  return elementChildren2(node).map((child) => {
    if (child.name === "Value") {
      const raw = child.attrs.json ?? textContent2(child);
      try {
        return jsonValueToXcon4(JSON.parse(raw));
      } catch {
        return parseAttributeValue2(raw);
      }
    }
    return parseSemanticComponent2(child, child.attrs.name !== void 0);
  });
}
function toPublicType2(name) {
  return semanticTypeAliases2[name] ?? name.charAt(0).toLowerCase() + name.slice(1);
}
function parseAttributeValue2(value) {
  const trimmed = value.trim();
  if (trimmed === "true")
    return true;
  if (trimmed === "false")
    return false;
  if (trimmed === "null")
    return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed))
    return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]") || trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return jsonValueToXcon4(parsed);
    } catch {
      return value;
    }
  }
  return value;
}
function jsonValueToXcon4(value) {
  if (value === void 0 || value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value ?? null;
  }
  if (Array.isArray(value))
    return value.map((item) => jsonValueToXcon4(item));
  if (typeof value === "object")
    return new XconObject3(value);
  return String(value);
}
function decodeXml2(value) {
  return value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&amp;", "&");
}

// packages/core/dist/parser/tagless/index.js
function fromTagless2(text) {
  const trimmed = text.trim();
  if (trimmed.length < 8)
    throw new Error("TAGLESS input is too short.");
  const prefix = Array.from(trimmed.slice(0, 8)).slice(0, 4).join("");
  const suffix = Array.from(trimmed).slice(-4).join("");
  const markerSet = createMarkerSet2(prefix, suffix);
  const body = trimmed.slice(prefix.length, trimmed.length - suffix.length);
  const cursor = { index: 0 };
  const value = readValue2(body, cursor, markerSet);
  if (!isXconObject2(value))
    throw new Error("TAGLESS root must be a dictionary.");
  return applyPropertyTypes2(value);
}
function createMarkerSet2(markers, endMarkers) {
  const open = Array.from(markers);
  const close = Array.from(endMarkers);
  if (open.length !== 4 || close.length !== 4) {
    throw new Error("TAGLESS markers and endMarkers must each contain exactly 4 characters.");
  }
  if (new Set(open).size !== 4 || new Set(close).size !== 4) {
    throw new Error("TAGLESS markers must be unique.");
  }
  if ([...open, ...close].some((marker) => /\s|\p{Cc}|%/u.test(marker))) {
    throw new Error("TAGLESS markers cannot contain whitespace, percent signs, or control characters.");
  }
  return { open, close, prefix: open.join(""), suffix: close.join("") };
}
function readValue2(text, cursor, markerSet) {
  skipWhitespace2(text, cursor);
  const { open, close } = markerSet;
  const marker = text[cursor.index];
  if (marker === open[0])
    return readObject2(text, cursor, markerSet);
  if (marker === open[1])
    return readArray2(text, cursor, markerSet);
  if (marker === open[2])
    return readPrimitive2(text, cursor, markerSet);
  throw new Error(`Unexpected TAGLESS marker at ${cursor.index}: ${marker || "<eof>"}`);
}
function readObject2(text, cursor, markerSet) {
  const { open, close } = markerSet;
  const output = new XconObject3();
  cursor.index += open[0].length;
  while (cursor.index < text.length && text[cursor.index] !== close[0]) {
    skipWhitespace2(text, cursor);
    if (text[cursor.index] === close[0])
      break;
    expect2(text, cursor, open[3]);
    const key = readUntil2(text, cursor, close[3]);
    const value = readValue2(text, cursor, markerSet);
    if (!output.contains(key))
      output.add(key, value);
  }
  expect2(text, cursor, close[0]);
  return output;
}
function readArray2(text, cursor, markerSet) {
  const { open, close } = markerSet;
  const output = [];
  cursor.index += open[1].length;
  while (cursor.index < text.length && text[cursor.index] !== close[1]) {
    skipWhitespace2(text, cursor);
    if (text[cursor.index] === close[1])
      break;
    output.push(readValue2(text, cursor, markerSet));
  }
  expect2(text, cursor, close[1]);
  return output;
}
function readPrimitive2(text, cursor, markerSet) {
  const { open, close } = markerSet;
  cursor.index += open[2].length;
  const raw = readUntil2(text, cursor, close[2]);
  return parseUnquotedPrimitive2(raw);
}
function expect2(text, cursor, marker) {
  skipWhitespace2(text, cursor);
  if (text[cursor.index] !== marker) {
    throw new Error(`Expected TAGLESS marker "${marker}" at ${cursor.index}.`);
  }
  cursor.index += marker.length;
}
function readUntil2(text, cursor, marker) {
  const end = text.indexOf(marker, cursor.index);
  if (end < 0)
    throw new Error(`Unclosed TAGLESS marker "${marker}".`);
  const value = text.slice(cursor.index, end);
  cursor.index = end + marker.length;
  return decodePayload2(value);
}
function decodePayload2(value) {
  return decodeURIComponent(value);
}
function skipWhitespace2(text, cursor) {
  while (cursor.index < text.length && /\s/.test(text[cursor.index]))
    cursor.index += 1;
}

// packages/core/dist/parser/sketch/index.js
var quotedTokenPrefix2 = "\0quoted:";
var SketchParseError2 = class extends SyntaxError {
  line;
  column;
  constructor(message, line, column = 1) {
    super(`XCON/SKETCH parse error at line ${line}: ${message}`);
    this.line = line;
    this.column = column;
    this.name = "SketchParseError";
  }
};
function fromSketch2(source) {
  const lines = preprocessLines2(source);
  const root2 = parseRoot2(lines);
  normalizeSketchAliases2(root2);
  return fromJSONObject2(root2);
}
function fromSketchLenient(source, options = {}) {
  const activeLines = source.replace(/\r\n/g, "\n").split("\n").map((text, index2) => ({
    text,
    originalNumber: index2 + 1
  }));
  const errors = [];
  const maxRecoveries = options.maxRecoveries ?? Math.max(8, activeLines.length);
  for (let attempt = 0; attempt <= maxRecoveries; attempt += 1) {
    const currentSource = activeLines.map((line) => line.text).join("\n");
    try {
      return { document: fromSketch2(currentSource), errors };
    } catch (error) {
      if (!(error instanceof SketchParseError2))
        throw error;
      const lineIndex = error.line - 1;
      const activeLine = activeLines[lineIndex];
      if (!activeLine)
        throw error;
      errors.push({
        line: activeLine.originalNumber,
        column: error.column,
        message: rewriteErrorLine(error.message, error.line, activeLine.originalNumber),
        source: activeLine.text.trim()
      });
      activeLines.splice(lineIndex, removableSketchBlockLineCount(activeLines, lineIndex));
      if (activeLines.length === 0)
        throw error;
    }
  }
  throw new SketchParseError2(`Could not recover after ${maxRecoveries} SKETCH parse error(s).`, 1);
}
function parseRoot2(lines) {
  if (lines.length === 0)
    throw new SketchParseError2("Expected screen declaration.", 1);
  const root2 = {
    type: "form",
    pos: [0, 0, 360, 220]
  };
  const components = [];
  const stack = [{ kind: "root", indent: -1, target: root2, children: components }];
  const counts = /* @__PURE__ */ new Map();
  let hasScreen = false;
  for (let index2 = 0; index2 < lines.length; index2 += 1) {
    const line = lines[index2];
    if (line.text.startsWith("screen ")) {
      if (line.indent !== 0)
        throw new SketchParseError2("Screen declaration must not be indented.", line.number);
      Object.assign(root2, parseScreen2(line));
      hasScreen = true;
      continue;
    }
    if (!hasScreen)
      throw new SketchParseError2("Expected root screen declaration.", line.number);
    while (line.indent <= stack[stack.length - 1].indent)
      stack.pop();
    const parent = stack[stack.length - 1];
    if (line.text.startsWith("- ")) {
      if (parent.kind !== "array")
        throw new SketchParseError2("Array item must be indented under an array property.", line.number);
      parent.items.push(parseScalar2(line.text.slice(2).trim(), line));
      continue;
    }
    if (isComponentDeclaration2(line.text)) {
      if (parent.kind !== "root" && parent.kind !== "component") {
        throw new SketchParseError2("Components must be declared under a screen or component.", line.number);
      }
      const component = parseComponent2(line, counts);
      parent.children.push(component);
      stack.push({ kind: "component", indent: line.indent, component, children: component.children });
      continue;
    }
    if (parent.kind === "object") {
      const consumedJsonPropertyIndex2 = consumeJsonProperty2(parent.target, lines, index2);
      if (consumedJsonPropertyIndex2 !== null) {
        index2 = consumedJsonPropertyIndex2;
        continue;
      }
      applyObjectProperty2(parent.target, line);
      continue;
    }
    if (parent.kind === "array")
      throw new SketchParseError2('Array items must start with "- ".', line.number);
    const target = parent.kind === "component" ? parent.component.props : parent.target;
    const consumedJsonPropertyIndex = consumeJsonProperty2(target, lines, index2);
    if (consumedJsonPropertyIndex !== null) {
      index2 = consumedJsonPropertyIndex;
      continue;
    }
    if (isBlockProperty2(line, lines[index2 + 1])) {
      stack.push(createBlockProperty2(target, line, lines[index2 + 1]));
      continue;
    }
    applyProperty2(target, line);
  }
  if (!hasScreen)
    throw new SketchParseError2("Expected screen declaration.", lines[0]?.number ?? 1);
  if (components.length > 0)
    root2.components = emitComponents2(components);
  return root2;
}
function preprocessLines2(source) {
  const rawLines = source.replace(/\r\n/g, "\n").split("\n");
  for (let index2 = 0; index2 < rawLines.length; index2 += 1) {
    if (rawLines[index2].includes("	")) {
      throw new SketchParseError2("Tabs are not supported for indentation. Use spaces.", index2 + 1);
    }
  }
  const contentLines = rawLines.filter((raw) => stripComment2(raw).trim());
  const commonIndent = contentLines.length === 0 ? 0 : Math.min(...contentLines.map((raw) => raw.length - raw.trimStart().length));
  return rawLines.map((raw, index2) => {
    if (raw.includes("	")) {
      throw new SketchParseError2("Tabs are not supported for indentation. Use spaces.", index2 + 1);
    }
    const dedented = raw.slice(commonIndent);
    const withoutComment = stripComment2(dedented);
    const text = withoutComment.trim();
    if (!text)
      return null;
    return {
      number: index2 + 1,
      indent: withoutComment.length - withoutComment.trimStart().length,
      text
    };
  }).filter((line) => Boolean(line));
}
function stripComment2(raw) {
  let quoted = false;
  for (let index2 = 0; index2 < raw.length - 1; index2 += 1) {
    const char = raw[index2];
    if (char === '"' && raw[index2 - 1] !== "\\") {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === "/" && raw[index2 + 1] === "/" && (index2 === 0 || /\s/.test(raw[index2 - 1]))) {
      return raw.slice(0, index2);
    }
  }
  return raw;
}
function rewriteErrorLine(message, currentLine, originalLine) {
  return message.replace(`line ${currentLine}:`, `line ${originalLine}:`);
}
function removableSketchBlockLineCount(lines, startIndex) {
  const start2 = lines[startIndex];
  if (!start2)
    return 1;
  const baseIndent = leadingSpaceCount(start2.text);
  let count = 1;
  for (let index2 = startIndex + 1; index2 < lines.length; index2 += 1) {
    const text = lines[index2].text;
    if (!text.trim()) {
      count += 1;
      continue;
    }
    if (leadingSpaceCount(text) <= baseIndent)
      break;
    count += 1;
  }
  return count;
}
function leadingSpaceCount(text) {
  return text.length - text.trimStart().length;
}
function parseScreen2(line) {
  const tokens = tokenize2(line.text);
  if (tokens.shift() !== "screen")
    throw new SketchParseError2("Expected screen declaration.", line.number);
  const root2 = { type: "form" };
  if (tokens.length === 0)
    throw new SketchParseError2("Expected screen size like 390x844.", line.number);
  if (tokens[0] && !isSizeToken2(tokens[0])) {
    root2.name = parseStringToken2(tokens.shift(), line);
  }
  const size = tokens.shift();
  if (!size)
    throw new SketchParseError2("Expected screen size like 390x844.", line.number);
  const dimensions = parseDimensions2(size);
  if (!dimensions)
    throw new SketchParseError2("Expected screen size like 390x844.", line.number);
  root2.pos = [0, 0, dimensions[0], dimensions[1]];
  applyInlineProps2(root2, tokens, line);
  return root2;
}
function isComponentDeclaration2(text) {
  return /^[A-Za-z_][\w-]*\s*:\s*[A-Za-z_][\w-]*/.test(text) || /^line\s+from\s+/.test(text) || /^(?:connector|arrow)\s+from\s+/.test(text) || /^[A-Za-z_][\w-]*(?:\s+"(?:[^"\\]|\\.)*")?\s+at\s+/.test(text);
}
function parseComponent2(line, counts) {
  const tokens = tokenize2(line.text);
  const first = tokens.shift();
  if (!first)
    throw new SketchParseError2("Expected component declaration.", line.number);
  let name;
  let type2;
  if (tokens[0] === ":") {
    name = first;
    tokens.shift();
    const explicitType = tokens.shift();
    if (!explicitType)
      throw new SketchParseError2("Expected component type after name.", line.number);
    type2 = explicitType;
  } else {
    type2 = first;
    name = nextComponentName2(type2, counts);
  }
  const props = { type: type2, name };
  if (type2 === "line" && tokens[0] === "from") {
    Object.assign(props, parseLineFromLayout2(tokens, line));
    applyInlineProps2(props, tokens, line);
    return { name, props, children: [] };
  }
  if ((type2 === "connector" || type2 === "arrow") && tokens[0] === "from") {
    Object.assign(props, parseConnectorLayout2(tokens, line, type2));
    applyInlineProps2(props, tokens, line);
    return { name, props, children: [] };
  }
  const text = tokens[0] && tokens[0] !== "at" ? parseStringToken2(tokens.shift(), line) : void 0;
  Object.assign(props, primaryText2(type2, text));
  if (tokens.shift() !== "at")
    throw new SketchParseError2("Expected component layout: at x y width height.", line.number);
  props.pos = parsePosition2(tokens, line);
  applyInlineProps2(props, tokens, line);
  return { name, props, children: [] };
}
function parseConnectorLayout2(tokens, line, declaredType) {
  if (tokens.shift() !== "from")
    throw new SketchParseError2("Expected connector layout: from source.anchor to target.anchor.", line.number);
  const from = parseConnectorEndpoint2(tokens, line, "Expected connector source after from.");
  if (tokens.shift() !== "to")
    throw new SketchParseError2("Expected connector layout: from source.anchor to target.anchor.", line.number);
  const to = parseConnectorEndpoint2(tokens, line, "Expected connector target after to.");
  return {
    type: "connector",
    from,
    to,
    ...declaredType === "arrow" ? { end: "arrow" } : {}
  };
}
function parseConnectorEndpoint2(tokens, line, message) {
  const ref = tokens.shift();
  if (!ref || ref === "to")
    throw new SketchParseError2(message, line.number);
  const parsed = parseStringToken2(ref, line);
  if (!parsed)
    throw new SketchParseError2(message, line.number);
  if (parsed.includes(".")) {
    const parts = parsed.split(".");
    const anchor2 = parts.pop() || "center";
    const target = parts.join(".");
    if (!target)
      throw new SketchParseError2(message, line.number);
    return { target, anchor: anchor2 };
  }
  const anchor = tokens[0] && tokens[0] !== "to" ? parseStringToken2(tokens.shift(), line) : "center";
  return { target: parsed, anchor: anchor || "center" };
}
function parseLineFromLayout2(tokens, line) {
  if (tokens.shift() !== "from")
    throw new SketchParseError2("Expected line layout: from x y to x y.", line.number);
  const start2 = parsePoint2(tokens, line, "Expected line start point after from.");
  if (tokens.shift() !== "to")
    throw new SketchParseError2("Expected line layout: from x y to x y.", line.number);
  const end = parsePoint2(tokens, line, "Expected line end point after to.");
  const left = Math.min(start2[0], end[0]);
  const top = Math.min(start2[1], end[1]);
  const width = Math.abs(end[0] - start2[0]);
  const height = Math.abs(end[1] - start2[1]);
  return {
    pos: [left, top, width, height],
    from: [start2[0] - left, start2[1] - top],
    to: [end[0] - left, end[1] - top]
  };
}
function parsePoint2(tokens, line, message) {
  const first = tokens.shift();
  if (!first)
    throw new SketchParseError2(message, line.number);
  const point = parseNumberListToken2(first, line);
  while (point.length < 2 && tokens[0] && isNumberToken2(tokens[0])) {
    point.push(parseNumber2(tokens.shift(), line));
  }
  if (point.length < 2)
    throw new SketchParseError2(message, line.number);
  return [point[0], point[1]];
}
function parsePosition2(tokens, line) {
  const first = tokens.shift();
  if (!first)
    throw new SketchParseError2("Expected position after at.", line.number);
  const pos = parseNumberListToken2(first, line);
  while (pos.length < 4 && tokens[0] && isNumberToken2(tokens[0])) {
    pos.push(parseNumber2(tokens.shift(), line));
  }
  return pos;
}
function applyInlineProps2(target, tokens, line) {
  let index2 = 0;
  while (index2 < tokens.length) {
    const key = normalizePropName2(tokens[index2]);
    const value = tokens[index2 + 1];
    if (!key || value === void 0)
      throw new SketchParseError2("Expected inline property name and value.", line.number);
    if (key === "size") {
      target.size = parseSizeValue2(value, line);
    } else {
      target[key] = parseScalar2(value, line);
    }
    index2 += 2;
  }
}
function applyProperty2(props, line) {
  const tokens = tokenize2(line.text);
  const key = tokens[0];
  const values = tokens.slice(1);
  if (!key || values.length === 0)
    throw new SketchParseError2("Property requires a name and value.", line.number);
  if (key === "bg")
    props.backgroundColor = required2(values, line, "bg requires a color.");
  else if (key === "color")
    props.color = required2(values, line, "color requires a value.");
  else if (key === "font")
    props.font = parseFont2(values, line);
  else if (key === "align")
    props.textAlign = required2(values, line, "align requires a value.");
  else if (key === "valign")
    props.textVerticalAlign = required2(values, line, "valign requires a value.");
  else if (key === "radius")
    mergeObject2(props, "border", { radius: parseNumber2(required2(values, line, "radius requires a number."), line) });
  else if (key === "border")
    mergeObject2(props, "border", parseBorder2(values, line));
  else if (key === "shadow")
    props.shadow = parseShadow2(values, line);
  else if (key === "gap")
    mergeObject2(props, "al", { gap: parseScalar2(required2(values, line, "gap requires a value."), line) });
  else if (key === "padding")
    mergeObject2(props, "al", { padding: parseSpacing2(values, line) });
  else if (key === "layout") {
    const layout = required2(values, line, "layout requires a value.");
    if (props.type === "button")
      props.layout = layout;
    else
      mergeObject2(props, "al", { direction: layout });
  } else if (key === "scroll")
    props.scroll = required2(values, line, "scroll requires a mode.");
  else
    props[normalizePropName2(key)] = values.length === 1 ? parseScalar2(values[0], line) : values.map((value) => parseScalar2(value, line));
}
function applyObjectProperty2(target, line) {
  const tokens = tokenize2(line.text);
  const key = tokens[0];
  if (!key || tokens.length < 2)
    throw new SketchParseError2("Object property requires a name and value.", line.number);
  target[normalizePropName2(key)] = tokens.length === 2 ? parseScalar2(tokens[1], line) : tokens.slice(1).map((value) => parseScalar2(value, line)).join(" ");
}
function consumeJsonProperty2(target, lines, index2) {
  const start2 = parseJsonPropertyStart2(lines[index2]);
  if (!start2)
    return null;
  const fragments = [start2.value];
  let endIndex = index2;
  while (!isCompleteJsonValue2(fragments.join("\n"))) {
    endIndex += 1;
    const next = lines[endIndex];
    if (!next) {
      throw new SketchParseError2(`Unterminated JSON value for "${start2.key}".`, lines[index2].number);
    }
    fragments.push(next.text);
  }
  const json = fragments.join("\n");
  try {
    target[normalizePropName2(start2.key)] = JSON.parse(json);
  } catch {
    throw new SketchParseError2(`Invalid JSON value for "${start2.key}".`, lines[index2].number);
  }
  return endIndex;
}
function parseJsonPropertyStart2(line) {
  const match = line.text.match(/^([A-Za-z_][\w-]*)\s+([\s\S]+)$/);
  if (!match)
    return null;
  const value = match[2].trim();
  if (!value.startsWith("{") && !value.startsWith("["))
    return null;
  return { key: match[1], value };
}
function isCompleteJsonValue2(value) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const char of value) {
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        quoted = false;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
    }
  }
  return depth === 0 && !quoted;
}
function isBlockProperty2(line, next) {
  return tokenize2(line.text).length === 1 && Boolean(next && next.indent > line.indent);
}
function createBlockProperty2(props, line, next) {
  const key = normalizePropName2(line.text);
  if (!next)
    throw new SketchParseError2("Block property requires indented content.", line.number);
  if (next.text.startsWith("- ")) {
    const items = [];
    props[key] = items;
    return { kind: "array", indent: line.indent, items };
  }
  const target = {};
  props[key] = target;
  return { kind: "object", indent: line.indent, target };
}
function required2(values, line, message) {
  if (!values[0])
    throw new SketchParseError2(message, line.number);
  return parseStringToken2(values[0], line);
}
function parseFont2(values, line) {
  if (values.length < 1)
    throw new SketchParseError2("font requires at least a size.", line.number);
  if (values.length === 1)
    return { size: parseScalar2(values[0], line) };
  if (isNumberToken2(values[0]))
    return { size: parseNumber2(values[0], line), weight: parseScalar2(values[1], line) };
  return {
    family: parseStringToken2(values[0], line),
    size: parseScalar2(values[1], line),
    ...values[2] ? { weight: parseScalar2(values[2], line) } : {}
  };
}
function parseBorder2(values, line) {
  if (values.length < 1)
    throw new SketchParseError2("border requires width.", line.number);
  return {
    width: parseNumber2(values[0], line),
    ...values[1] ? { color: parseStringToken2(values[1], line) } : {},
    ...values[2] ? { radius: parseNumber2(values[2], line) } : {}
  };
}
function parseShadow2(values, line) {
  if (values.length < 4)
    throw new SketchParseError2("shadow requires x y blur opacity.", line.number);
  return {
    x: parseNumber2(values[0], line),
    y: parseNumber2(values[1], line),
    blur: parseNumber2(values[2], line),
    opacity: parseNumber2(values[3], line)
  };
}
function parseSpacing2(values, line) {
  if (values.length === 0)
    throw new SketchParseError2("spacing requires at least one value.", line.number);
  if (values.length === 1)
    return parseScalar2(values[0], line);
  return values.map((value) => parseNumber2(value, line));
}
function parseScalar2(value, line) {
  if (value.startsWith(quotedTokenPrefix2))
    return value.slice(quotedTokenPrefix2.length);
  if (value === "true")
    return true;
  if (value === "false")
    return false;
  if (value === "null")
    return null;
  if (isNumberToken2(value))
    return Number(value);
  if (isNumberListToken2(value))
    return value.split(",").map(Number);
  if (isSizeToken2(value))
    return parseDimensions2(value);
  if (value.startsWith("[") && value.endsWith("]") || value.startsWith("{") && value.endsWith("}")) {
    try {
      return JSON.parse(value);
    } catch {
      throw new SketchParseError2(`Invalid JSON value "${value}".`, line.number);
    }
  }
  return value;
}
function parseStringToken2(value, line) {
  const parsed = parseScalar2(value, line);
  return parsed === null ? "null" : String(parsed);
}
function parseSizeValue2(value, line) {
  if (isSizeToken2(value))
    return parseDimensions2(value);
  return parseScalar2(value, line);
}
function parseNumberListToken2(value, line) {
  if (isNumberListToken2(value))
    return value.split(",").map(Number);
  if (isNumberToken2(value))
    return [Number(value)];
  throw new SketchParseError2("Expected numeric position.", line.number);
}
function parseNumber2(value, line) {
  const number = Number(value);
  if (!Number.isFinite(number))
    throw new SketchParseError2(`Expected number but received "${value}".`, line.number);
  return number;
}
function isNumberToken2(value) {
  return /^-?(?:\d+|\d*\.\d+)$/.test(value);
}
function isNumberListToken2(value) {
  return /^-?(?:\d+|\d*\.\d+),-?(?:\d+|\d*\.\d+)(?:,-?(?:\d+|\d*\.\d+))*$/.test(value);
}
function isSizeToken2(value) {
  return /^-?(?:\d+|\d*\.\d+)x-?(?:\d+|\d*\.\d+)$/i.test(value);
}
function parseDimensions2(value) {
  const match = value.match(/^(-?(?:\d+|\d*\.\d+))x(-?(?:\d+|\d*\.\d+))$/i);
  if (!match)
    return null;
  return [Number(match[1]), Number(match[2])];
}
function normalizePropName2(key) {
  if (key === "bg")
    return "backgroundColor";
  return key;
}
function nextComponentName2(type2, counts) {
  const count = (counts.get(type2) ?? 0) + 1;
  counts.set(type2, count);
  return `${type2}${count}`;
}
function primaryText2(type2, text) {
  if (text === void 0)
    return {};
  if (type2 === "button")
    return { label: text };
  if (type2 === "textField" || type2 === "searchBar")
    return { placeholder: text };
  if (type2 === "label" || type2 === "textView" || type2 === "shape")
    return { text };
  return { text };
}
function emitComponents2(components) {
  const output = {
    componentsOrder: components.map((component) => component.name).join(",")
  };
  for (const component of components) {
    if (component.children.length > 0)
      component.props.components = emitComponents2(component.children);
    output[component.name] = component.props;
  }
  return output;
}
function mergeObject2(target, key, patch) {
  const current3 = target[key];
  target[key] = { ...isRecord2(current3) ? current3 : {}, ...patch };
}
function normalizeSketchAliases2(value) {
  if (Array.isArray(value)) {
    value.forEach(normalizeSketchAliases2);
    return;
  }
  if (!isRecord2(value))
    return;
  const font = value.font;
  if (isRecord2(font)) {
    if (value.textAlign === void 0 && font.align !== void 0) {
      value.textAlign = font.align;
    }
    if (value.textVerticalAlign === void 0) {
      if (font.valign !== void 0)
        value.textVerticalAlign = font.valign;
      else if (font.verticalAlign !== void 0)
        value.textVerticalAlign = font.verticalAlign;
    }
    delete font.align;
    delete font.valign;
    delete font.verticalAlign;
  }
  Object.values(value).forEach(normalizeSketchAliases2);
}
function isRecord2(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function tokenize2(input) {
  const tokens = [];
  let current3 = "";
  let quoted = false;
  let escaped = false;
  const push = () => {
    if (current3.length === 0)
      return;
    tokens.push(current3);
    current3 = "";
  };
  const pushQuoted = () => {
    tokens.push(`${quotedTokenPrefix2}${current3}`);
    current3 = "";
  };
  for (let index2 = 0; index2 < input.length; index2 += 1) {
    const char = input[index2];
    if (quoted) {
      if (escaped) {
        if (char === "n")
          current3 += "\n";
        else if (char === "r")
          current3 += "\r";
        else if (char === "t")
          current3 += "	";
        else
          current3 += char;
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        quoted = false;
        pushQuoted();
        continue;
      }
      current3 += char;
      continue;
    }
    if (char === '"') {
      push();
      quoted = true;
      continue;
    }
    if (char === "{" || char === "[") {
      push();
      const jsonToken = readJsonToken2(input, index2);
      if (jsonToken) {
        tokens.push(jsonToken.token);
        index2 = jsonToken.end;
        continue;
      }
    }
    if (/\s/.test(char)) {
      push();
      continue;
    }
    if (char === ":" && /^[A-Za-z_][\w-]*$/.test(current3) && input[index2 + 1] !== "/") {
      push();
      tokens.push(":");
      continue;
    }
    current3 += char;
  }
  push();
  return tokens;
}
function readJsonToken2(input, start2) {
  const opener = input[start2];
  if (opener !== "{" && opener !== "[")
    return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index2 = start2; index2 < input.length; index2 += 1) {
    const char = input[index2];
    if (quoted) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"')
        quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === "{" || char === "[") {
      depth += 1;
      continue;
    }
    if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0)
        return { token: input.slice(start2, index2 + 1), end: index2 };
    }
  }
  return null;
}

// packages/core/dist/converter/index.js
function detectXconSyntax(input) {
  const trimmed = input.trim();
  if (trimmed.startsWith("<"))
    return "xml";
  if (trimmed.startsWith("{"))
    return "json";
  if (looksLikeSketch(trimmed))
    return "sketch";
  return "tagless";
}
function deserialize(input) {
  const trimmed = input.trim();
  const syntax = detectXconSyntax(trimmed);
  if (syntax === "xml")
    return fromXml2(trimmed);
  if (syntax === "json")
    return fromJSON2(trimmed);
  if (syntax === "sketch")
    return fromSketch2(trimmed);
  try {
    return fromTagless2(trimmed);
  } catch (taglessError) {
    try {
      return fromJSON2(trimmed);
    } catch {
      throw taglessError;
    }
  }
}
function looksLikeSketch(source) {
  const firstLine = source.split(/\r?\n/).find((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("//");
  })?.trim() ?? "";
  return firstLine.startsWith("screen ") || /^[A-Za-z_][\w-]*\s*:\s*[A-Za-z_][\w-]*(?:\s+"(?:[^"\\]|\\.)*")?\s+at\s+/.test(firstLine);
}

// node_modules/d3-dispatch/src/dispatch.js
var noop = { value: () => {
} };
function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}
function Dispatch(_) {
  this._ = _;
}
function parseTypenames(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return { type: t, name };
  });
}
Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._, T = parseTypenames(typename + "", _), t, i = -1, n = T.length;
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
      return;
    }
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
    }
    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type2, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type2)) throw new Error("unknown type: " + type2);
    for (t = this._[type2], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type2, that, args) {
    if (!this._.hasOwnProperty(type2)) throw new Error("unknown type: " + type2);
    for (var t = this._[type2], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};
function get(type2, name) {
  for (var i = 0, n = type2.length, c2; i < n; ++i) {
    if ((c2 = type2[i]).name === name) {
      return c2.value;
    }
  }
}
function set(type2, name, callback) {
  for (var i = 0, n = type2.length; i < n; ++i) {
    if (type2[i].name === name) {
      type2[i] = noop, type2 = type2.slice(0, i).concat(type2.slice(i + 1));
      break;
    }
  }
  if (callback != null) type2.push({ name, value: callback });
  return type2;
}
var dispatch_default = dispatch;

// node_modules/d3-selection/src/namespaces.js
var xhtml = "http://www.w3.org/1999/xhtml";
var namespaces_default = {
  svg: "http://www.w3.org/2000/svg",
  xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

// node_modules/d3-selection/src/namespace.js
function namespace_default(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces_default.hasOwnProperty(prefix) ? { space: namespaces_default[prefix], local: name } : name;
}

// node_modules/d3-selection/src/creator.js
function creatorInherit(name) {
  return function() {
    var document2 = this.ownerDocument, uri = this.namespaceURI;
    return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
  };
}
function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}
function creator_default(name) {
  var fullname = namespace_default(name);
  return (fullname.local ? creatorFixed : creatorInherit)(fullname);
}

// node_modules/d3-selection/src/selector.js
function none() {
}
function selector_default(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
}

// node_modules/d3-selection/src/selection/select.js
function select_default(select) {
  if (typeof select !== "function") select = selector_default(select);
  for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }
  return new Selection(subgroups, this._parents);
}

// node_modules/d3-selection/src/array.js
function array(x2) {
  return x2 == null ? [] : Array.isArray(x2) ? x2 : Array.from(x2);
}

// node_modules/d3-selection/src/selectorAll.js
function empty() {
  return [];
}
function selectorAll_default(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
}

// node_modules/d3-selection/src/selection/selectAll.js
function arrayAll(select) {
  return function() {
    return array(select.apply(this, arguments));
  };
}
function selectAll_default(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll_default(select);
  for (var groups = this._groups, m2 = groups.length, subgroups = [], parents = [], j = 0; j < m2; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }
  return new Selection(subgroups, parents);
}

// node_modules/d3-selection/src/matcher.js
function matcher_default(selector) {
  return function() {
    return this.matches(selector);
  };
}
function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}

// node_modules/d3-selection/src/selection/selectChild.js
var find = Array.prototype.find;
function childFind(match) {
  return function() {
    return find.call(this.children, match);
  };
}
function childFirst() {
  return this.firstElementChild;
}
function selectChild_default(match) {
  return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
}

// node_modules/d3-selection/src/selection/selectChildren.js
var filter = Array.prototype.filter;
function children() {
  return Array.from(this.children);
}
function childrenFilter(match) {
  return function() {
    return filter.call(this.children, match);
  };
}
function selectChildren_default(match) {
  return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}

// node_modules/d3-selection/src/selection/filter.js
function filter_default(match) {
  if (typeof match !== "function") match = matcher_default(match);
  for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }
  return new Selection(subgroups, this._parents);
}

// node_modules/d3-selection/src/selection/sparse.js
function sparse_default(update) {
  return new Array(update.length);
}

// node_modules/d3-selection/src/selection/enter.js
function enter_default() {
  return new Selection(this._enter || this._groups.map(sparse_default), this._parents);
}
function EnterNode(parent, datum2) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum2;
}
EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) {
    return this._parent.insertBefore(child, this._next);
  },
  insertBefore: function(child, next) {
    return this._parent.insertBefore(child, next);
  },
  querySelector: function(selector) {
    return this._parent.querySelector(selector);
  },
  querySelectorAll: function(selector) {
    return this._parent.querySelectorAll(selector);
  }
};

// node_modules/d3-selection/src/constant.js
function constant_default(x2) {
  return function() {
    return x2;
  };
}

// node_modules/d3-selection/src/selection/data.js
function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0, node, groupLength = group.length, dataLength = data.length;
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}
function bindKey(parent, group, enter, update, exit, data, key) {
  var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }
  for (i = 0; i < dataLength; ++i) {
    keyValue = key.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
      exit[i] = node;
    }
  }
}
function datum(node) {
  return node.__data__;
}
function data_default(value, key) {
  if (!arguments.length) return Array.from(this, datum);
  var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
  if (typeof value !== "function") value = constant_default(value);
  for (var m2 = groups.length, update = new Array(m2), enter = new Array(m2), exit = new Array(m2), j = 0; j < m2; ++j) {
    var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength) ;
        previous._next = next || null;
      }
    }
  }
  update = new Selection(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}
function arraylike(data) {
  return typeof data === "object" && "length" in data ? data : Array.from(data);
}

// node_modules/d3-selection/src/selection/exit.js
function exit_default() {
  return new Selection(this._exit || this._groups.map(sparse_default), this._parents);
}

// node_modules/d3-selection/src/selection/join.js
function join_default(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  if (typeof onenter === "function") {
    enter = onenter(enter);
    if (enter) enter = enter.selection();
  } else {
    enter = enter.append(onenter + "");
  }
  if (onupdate != null) {
    update = onupdate(update);
    if (update) update = update.selection();
  }
  if (onexit == null) exit.remove();
  else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}

// node_modules/d3-selection/src/selection/merge.js
function merge_default(context) {
  var selection2 = context.selection ? context.selection() : context;
  for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m2 = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m2; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }
  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }
  return new Selection(merges, this._parents);
}

// node_modules/d3-selection/src/selection/order.js
function order_default() {
  for (var groups = this._groups, j = -1, m2 = groups.length; ++j < m2; ) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }
  return this;
}

// node_modules/d3-selection/src/selection/sort.js
function sort_default(compare) {
  if (!compare) compare = ascending;
  function compareNode(a2, b) {
    return a2 && b ? compare(a2.__data__, b.__data__) : !a2 - !b;
  }
  for (var groups = this._groups, m2 = groups.length, sortgroups = new Array(m2), j = 0; j < m2; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }
  return new Selection(sortgroups, this._parents).order();
}
function ascending(a2, b) {
  return a2 < b ? -1 : a2 > b ? 1 : a2 >= b ? 0 : NaN;
}

// node_modules/d3-selection/src/selection/call.js
function call_default() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}

// node_modules/d3-selection/src/selection/nodes.js
function nodes_default() {
  return Array.from(this);
}

// node_modules/d3-selection/src/selection/node.js
function node_default() {
  for (var groups = this._groups, j = 0, m2 = groups.length; j < m2; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }
  return null;
}

// node_modules/d3-selection/src/selection/size.js
function size_default() {
  let size = 0;
  for (const node of this) ++size;
  return size;
}

// node_modules/d3-selection/src/selection/empty.js
function empty_default() {
  return !this.node();
}

// node_modules/d3-selection/src/selection/each.js
function each_default(callback) {
  for (var groups = this._groups, j = 0, m2 = groups.length; j < m2; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }
  return this;
}

// node_modules/d3-selection/src/selection/attr.js
function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}
function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}
function attrConstant(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}
function attrConstantNS(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}
function attrFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}
function attrFunctionNS(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}
function attr_default(name, value) {
  var fullname = namespace_default(name);
  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
  }
  return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
}

// node_modules/d3-selection/src/window.js
function window_default(node) {
  return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
}

// node_modules/d3-selection/src/selection/style.js
function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}
function styleConstant(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}
function styleFunction(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}
function style_default(name, value, priority) {
  return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
}
function styleValue(node, name) {
  return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
}

// node_modules/d3-selection/src/selection/property.js
function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}
function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}
function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}
function property_default(name, value) {
  return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
}

// node_modules/d3-selection/src/selection/classed.js
function classArray(string) {
  return string.trim().split(/^|\s+/);
}
function classList(node) {
  return node.classList || new ClassList(node);
}
function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}
ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};
function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}
function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}
function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}
function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}
function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}
function classed_default(name, value) {
  var names = classArray(name + "");
  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }
  return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
}

// node_modules/d3-selection/src/selection/text.js
function textRemove() {
  this.textContent = "";
}
function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}
function textFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}
function text_default(value) {
  return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
}

// node_modules/d3-selection/src/selection/html.js
function htmlRemove() {
  this.innerHTML = "";
}
function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}
function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}
function html_default(value) {
  return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
}

// node_modules/d3-selection/src/selection/raise.js
function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}
function raise_default() {
  return this.each(raise);
}

// node_modules/d3-selection/src/selection/lower.js
function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function lower_default() {
  return this.each(lower);
}

// node_modules/d3-selection/src/selection/append.js
function append_default(name) {
  var create2 = typeof name === "function" ? name : creator_default(name);
  return this.select(function() {
    return this.appendChild(create2.apply(this, arguments));
  });
}

// node_modules/d3-selection/src/selection/insert.js
function constantNull() {
  return null;
}
function insert_default(name, before) {
  var create2 = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
  return this.select(function() {
    return this.insertBefore(create2.apply(this, arguments), select.apply(this, arguments) || null);
  });
}

// node_modules/d3-selection/src/selection/remove.js
function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}
function remove_default() {
  return this.each(remove);
}

// node_modules/d3-selection/src/selection/clone.js
function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function clone_default(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}

// node_modules/d3-selection/src/selection/datum.js
function datum_default(value) {
  return arguments.length ? this.property("__data__", value) : this.node().__data__;
}

// node_modules/d3-selection/src/selection/on.js
function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}
function parseTypenames2(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return { type: t, name };
  });
}
function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m2 = on.length, o; j < m2; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}
function onAdd(typename, value, options) {
  return function() {
    var on = this.__on, o, listener = contextListener(value);
    if (on) for (var j = 0, m2 = on.length; j < m2; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = { type: typename.type, name: typename.name, value, listener, options };
    if (!on) this.__on = [o];
    else on.push(o);
  };
}
function on_default(typename, value, options) {
  var typenames = parseTypenames2(typename + ""), i, n = typenames.length, t;
  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m2 = on.length, o; j < m2; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }
  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
  return this;
}

// node_modules/d3-selection/src/selection/dispatch.js
function dispatchEvent(node, type2, params) {
  var window2 = window_default(node), event = window2.CustomEvent;
  if (typeof event === "function") {
    event = new event(type2, params);
  } else {
    event = window2.document.createEvent("Event");
    if (params) event.initEvent(type2, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type2, false, false);
  }
  node.dispatchEvent(event);
}
function dispatchConstant(type2, params) {
  return function() {
    return dispatchEvent(this, type2, params);
  };
}
function dispatchFunction(type2, params) {
  return function() {
    return dispatchEvent(this, type2, params.apply(this, arguments));
  };
}
function dispatch_default2(type2, params) {
  return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type2, params));
}

// node_modules/d3-selection/src/selection/iterator.js
function* iterator_default() {
  for (var groups = this._groups, j = 0, m2 = groups.length; j < m2; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
}

// node_modules/d3-selection/src/selection/index.js
var root = [null];
function Selection(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}
function selection() {
  return new Selection([[document.documentElement]], root);
}
function selection_selection() {
  return this;
}
Selection.prototype = selection.prototype = {
  constructor: Selection,
  select: select_default,
  selectAll: selectAll_default,
  selectChild: selectChild_default,
  selectChildren: selectChildren_default,
  filter: filter_default,
  data: data_default,
  enter: enter_default,
  exit: exit_default,
  join: join_default,
  merge: merge_default,
  selection: selection_selection,
  order: order_default,
  sort: sort_default,
  call: call_default,
  nodes: nodes_default,
  node: node_default,
  size: size_default,
  empty: empty_default,
  each: each_default,
  attr: attr_default,
  style: style_default,
  property: property_default,
  classed: classed_default,
  text: text_default,
  html: html_default,
  raise: raise_default,
  lower: lower_default,
  append: append_default,
  insert: insert_default,
  remove: remove_default,
  clone: clone_default,
  datum: datum_default,
  on: on_default,
  dispatch: dispatch_default2,
  [Symbol.iterator]: iterator_default
};
var selection_default = selection;

// node_modules/d3-color/src/define.js
function define_default(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}
function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

// node_modules/d3-color/src/color.js
function Color() {
}
var darker = 0.7;
var brighter = 1 / darker;
var reI = "\\s*([+-]?\\d+)\\s*";
var reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*";
var reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
var reHex = /^#([0-9a-f]{3,8})$/;
var reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`);
var reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`);
var reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`);
var reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`);
var reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`);
var reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
var named = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
define_default(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor(), this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});
function color_formatHex() {
  return this.rgb().formatHex();
}
function color_formatHex8() {
  return this.rgb().formatHex8();
}
function color_formatHsl() {
  return hslConvert(this).formatHsl();
}
function color_formatRgb() {
  return this.rgb().formatRgb();
}
function color(format) {
  var m2, l;
  format = (format + "").trim().toLowerCase();
  return (m2 = reHex.exec(format)) ? (l = m2[1].length, m2 = parseInt(m2[1], 16), l === 6 ? rgbn(m2) : l === 3 ? new Rgb(m2 >> 8 & 15 | m2 >> 4 & 240, m2 >> 4 & 15 | m2 & 240, (m2 & 15) << 4 | m2 & 15, 1) : l === 8 ? rgba(m2 >> 24 & 255, m2 >> 16 & 255, m2 >> 8 & 255, (m2 & 255) / 255) : l === 4 ? rgba(m2 >> 12 & 15 | m2 >> 8 & 240, m2 >> 8 & 15 | m2 >> 4 & 240, m2 >> 4 & 15 | m2 & 240, ((m2 & 15) << 4 | m2 & 15) / 255) : null) : (m2 = reRgbInteger.exec(format)) ? new Rgb(m2[1], m2[2], m2[3], 1) : (m2 = reRgbPercent.exec(format)) ? new Rgb(m2[1] * 255 / 100, m2[2] * 255 / 100, m2[3] * 255 / 100, 1) : (m2 = reRgbaInteger.exec(format)) ? rgba(m2[1], m2[2], m2[3], m2[4]) : (m2 = reRgbaPercent.exec(format)) ? rgba(m2[1] * 255 / 100, m2[2] * 255 / 100, m2[3] * 255 / 100, m2[4]) : (m2 = reHslPercent.exec(format)) ? hsla(m2[1], m2[2] / 100, m2[3] / 100, 1) : (m2 = reHslaPercent.exec(format)) ? hsla(m2[1], m2[2] / 100, m2[3] / 100, m2[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
}
function rgbn(n) {
  return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
}
function rgba(r, g, b, a2) {
  if (a2 <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a2);
}
function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb();
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}
function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}
function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}
define_default(Rgb, rgb, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));
function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}
function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function rgb_formatRgb() {
  const a2 = clampa(this.opacity);
  return `${a2 === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a2 === 1 ? ")" : `, ${a2})`}`;
}
function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}
function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}
function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}
function hsla(h, s, l, a2) {
  if (a2 <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a2);
}
function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl();
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255, g = o.g / 255, b = o.b / 255, min2 = Math.min(r, g, b), max2 = Math.max(r, g, b), h = NaN, s = max2 - min2, l = (max2 + min2) / 2;
  if (s) {
    if (r === max2) h = (g - b) / s + (g < b) * 6;
    else if (g === max2) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max2 + min2 : 2 - max2 - min2;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}
function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}
function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}
define_default(Hsl, hsl, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a2 = clampa(this.opacity);
    return `${a2 === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a2 === 1 ? ")" : `, ${a2})`}`;
  }
}));
function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}
function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
}

// node_modules/d3-interpolate/src/basis.js
function basis(t1, v0, v1, v2, v3) {
  var t2 = t1 * t1, t3 = t2 * t1;
  return ((1 - 3 * t1 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
}
function basis_default(values) {
  var n = values.length - 1;
  return function(t) {
    var i = t <= 0 ? t = 0 : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n), v1 = values[i], v2 = values[i + 1], v0 = i > 0 ? values[i - 1] : 2 * v1 - v2, v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
}

// node_modules/d3-interpolate/src/basisClosed.js
function basisClosed_default(values) {
  var n = values.length;
  return function(t) {
    var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n), v0 = values[(i + n - 1) % n], v1 = values[i % n], v2 = values[(i + 1) % n], v3 = values[(i + 2) % n];
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
}

// node_modules/d3-interpolate/src/constant.js
var constant_default2 = (x2) => () => x2;

// node_modules/d3-interpolate/src/color.js
function linear(a2, d) {
  return function(t) {
    return a2 + t * d;
  };
}
function exponential(a2, b, y2) {
  return a2 = Math.pow(a2, y2), b = Math.pow(b, y2) - a2, y2 = 1 / y2, function(t) {
    return Math.pow(a2 + t * b, y2);
  };
}
function gamma(y2) {
  return (y2 = +y2) === 1 ? nogamma : function(a2, b) {
    return b - a2 ? exponential(a2, b, y2) : constant_default2(isNaN(a2) ? b : a2);
  };
}
function nogamma(a2, b) {
  var d = b - a2;
  return d ? linear(a2, d) : constant_default2(isNaN(a2) ? b : a2);
}

// node_modules/d3-interpolate/src/rgb.js
var rgb_default = (function rgbGamma(y2) {
  var color2 = gamma(y2);
  function rgb2(start2, end) {
    var r = color2((start2 = rgb(start2)).r, (end = rgb(end)).r), g = color2(start2.g, end.g), b = color2(start2.b, end.b), opacity = nogamma(start2.opacity, end.opacity);
    return function(t) {
      start2.r = r(t);
      start2.g = g(t);
      start2.b = b(t);
      start2.opacity = opacity(t);
      return start2 + "";
    };
  }
  rgb2.gamma = rgbGamma;
  return rgb2;
})(1);
function rgbSpline(spline) {
  return function(colors) {
    var n = colors.length, r = new Array(n), g = new Array(n), b = new Array(n), i, color2;
    for (i = 0; i < n; ++i) {
      color2 = rgb(colors[i]);
      r[i] = color2.r || 0;
      g[i] = color2.g || 0;
      b[i] = color2.b || 0;
    }
    r = spline(r);
    g = spline(g);
    b = spline(b);
    color2.opacity = 1;
    return function(t) {
      color2.r = r(t);
      color2.g = g(t);
      color2.b = b(t);
      return color2 + "";
    };
  };
}
var rgbBasis = rgbSpline(basis_default);
var rgbBasisClosed = rgbSpline(basisClosed_default);

// node_modules/d3-interpolate/src/number.js
function number_default(a2, b) {
  return a2 = +a2, b = +b, function(t) {
    return a2 * (1 - t) + b * t;
  };
}

// node_modules/d3-interpolate/src/string.js
var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
var reB = new RegExp(reA.source, "g");
function zero(b) {
  return function() {
    return b;
  };
}
function one(b) {
  return function(t) {
    return b(t) + "";
  };
}
function string_default(a2, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
  a2 = a2 + "", b = b + "";
  while ((am = reA.exec(a2)) && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) {
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs;
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) {
      if (s[i]) s[i] += bm;
      else s[++i] = bm;
    } else {
      s[++i] = null;
      q.push({ i, x: number_default(am, bm) });
    }
    bi = reB.lastIndex;
  }
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs;
    else s[++i] = bs;
  }
  return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
    for (var i2 = 0, o; i2 < b; ++i2) s[(o = q[i2]).i] = o.x(t);
    return s.join("");
  });
}

// node_modules/d3-interpolate/src/transform/decompose.js
var degrees = 180 / Math.PI;
var identity = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};
function decompose_default(a2, b, c2, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a2 * a2 + b * b)) a2 /= scaleX, b /= scaleX;
  if (skewX = a2 * c2 + b * d) c2 -= a2 * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c2 * c2 + d * d)) c2 /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a2 * d < b * c2) a2 = -a2, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a2) * degrees,
    skewX: Math.atan(skewX) * degrees,
    scaleX,
    scaleY
  };
}

// node_modules/d3-interpolate/src/transform/parse.js
var svgNode;
function parseCss(value) {
  const m2 = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
  return m2.isIdentity ? identity : decompose_default(m2.a, m2.b, m2.c, m2.d, m2.e, m2.f);
}
function parseSvg(value) {
  if (value == null) return identity;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
  value = value.matrix;
  return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
}

// node_modules/d3-interpolate/src/transform/index.js
function interpolateTransform(parse, pxComma, pxParen, degParen) {
  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }
  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }
  function rotate(a2, b, s, q) {
    if (a2 !== b) {
      if (a2 - b > 180) b += 360;
      else if (b - a2 > 180) a2 += 360;
      q.push({ i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number_default(a2, b) });
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }
  function skewX(a2, b, s, q) {
    if (a2 !== b) {
      q.push({ i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number_default(a2, b) });
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }
  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }
  return function(a2, b) {
    var s = [], q = [];
    a2 = parse(a2), b = parse(b);
    translate(a2.translateX, a2.translateY, b.translateX, b.translateY, s, q);
    rotate(a2.rotate, b.rotate, s, q);
    skewX(a2.skewX, b.skewX, s, q);
    scale(a2.scaleX, a2.scaleY, b.scaleX, b.scaleY, s, q);
    a2 = b = null;
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}
var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

// node_modules/d3-timer/src/timer.js
var frame = 0;
var timeout = 0;
var interval = 0;
var pokeDelay = 1e3;
var taskHead;
var taskTail;
var clockLast = 0;
var clockNow = 0;
var clockSkew = 0;
var clock = typeof performance === "object" && performance.now ? performance : Date;
var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
  setTimeout(f, 17);
};
function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}
function clearNow() {
  clockNow = 0;
}
function Timer() {
  this._call = this._time = this._next = null;
}
Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};
function timer(callback, delay, time) {
  var t = new Timer();
  t.restart(callback, delay, time);
  return t;
}
function timerFlush() {
  now();
  ++frame;
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(void 0, e);
    t = t._next;
  }
  --frame;
}
function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}
function poke() {
  var now2 = clock.now(), delay = now2 - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now2;
}
function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}
function sleep(time) {
  if (frame) return;
  if (timeout) timeout = clearTimeout(timeout);
  var delay = time - clockNow;
  if (delay > 24) {
    if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

// node_modules/d3-timer/src/timeout.js
function timeout_default(callback, delay, time) {
  var t = new Timer();
  delay = delay == null ? 0 : +delay;
  t.restart((elapsed) => {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
}

// node_modules/d3-transition/src/transition/schedule.js
var emptyOn = dispatch_default("start", "end", "cancel", "interrupt");
var emptyTween = [];
var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;
function schedule_default(node, name, id2, index2, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id2 in schedules) return;
  create(node, id2, {
    name,
    index: index2,
    // For context during callback.
    group,
    // For context during callback.
    on: emptyOn,
    tween: emptyTween,
    time: timing.time,
    delay: timing.delay,
    duration: timing.duration,
    ease: timing.ease,
    timer: null,
    state: CREATED
  });
}
function init(node, id2) {
  var schedule = get2(node, id2);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}
function set2(node, id2) {
  var schedule = get2(node, id2);
  if (schedule.state > STARTED) throw new Error("too late; already running");
  return schedule;
}
function get2(node, id2) {
  var schedule = node.__transition;
  if (!schedule || !(schedule = schedule[id2])) throw new Error("transition not found");
  return schedule;
}
function create(node, id2, self) {
  var schedules = node.__transition, tween;
  schedules[id2] = self;
  self.timer = timer(schedule, 0, self.time);
  function schedule(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start2, self.delay, self.time);
    if (self.delay <= elapsed) start2(elapsed - self.delay);
  }
  function start2(elapsed) {
    var i, j, n, o;
    if (self.state !== SCHEDULED) return stop();
    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;
      if (o.state === STARTED) return timeout_default(start2);
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      } else if (+i < id2) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("cancel", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }
    }
    timeout_default(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return;
    self.state = STARTED;
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }
  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1), i = -1, n = tween.length;
    while (++i < n) {
      tween[i].call(node, t);
    }
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }
  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id2];
    for (var i in schedules) return;
    delete node.__transition;
  }
}

// node_modules/d3-transition/src/interrupt.js
function interrupt_default(node, name) {
  var schedules = node.__transition, schedule, active, empty2 = true, i;
  if (!schedules) return;
  name = name == null ? null : name + "";
  for (i in schedules) {
    if ((schedule = schedules[i]).name !== name) {
      empty2 = false;
      continue;
    }
    active = schedule.state > STARTING && schedule.state < ENDING;
    schedule.state = ENDED;
    schedule.timer.stop();
    schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
    delete schedules[i];
  }
  if (empty2) delete node.__transition;
}

// node_modules/d3-transition/src/selection/interrupt.js
function interrupt_default2(name) {
  return this.each(function() {
    interrupt_default(this, name);
  });
}

// node_modules/d3-transition/src/transition/tween.js
function tweenRemove(id2, name) {
  var tween0, tween1;
  return function() {
    var schedule = set2(this, id2), tween = schedule.tween;
    if (tween !== tween0) {
      tween1 = tween0 = tween;
      for (var i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1 = tween1.slice();
          tween1.splice(i, 1);
          break;
        }
      }
    }
    schedule.tween = tween1;
  };
}
function tweenFunction(id2, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error();
  return function() {
    var schedule = set2(this, id2), tween = schedule.tween;
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = { name, value }, i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1[i] = t;
          break;
        }
      }
      if (i === n) tween1.push(t);
    }
    schedule.tween = tween1;
  };
}
function tween_default(name, value) {
  var id2 = this._id;
  name += "";
  if (arguments.length < 2) {
    var tween = get2(this.node(), id2).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }
  return this.each((value == null ? tweenRemove : tweenFunction)(id2, name, value));
}
function tweenValue(transition2, name, value) {
  var id2 = transition2._id;
  transition2.each(function() {
    var schedule = set2(this, id2);
    (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
  });
  return function(node) {
    return get2(node, id2).value[name];
  };
}

// node_modules/d3-transition/src/transition/interpolate.js
function interpolate_default(a2, b) {
  var c2;
  return (typeof b === "number" ? number_default : b instanceof color ? rgb_default : (c2 = color(b)) ? (b = c2, rgb_default) : string_default)(a2, b);
}

// node_modules/d3-transition/src/transition/attr.js
function attrRemove2(name) {
  return function() {
    this.removeAttribute(name);
  };
}
function attrRemoveNS2(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}
function attrConstant2(name, interpolate, value1) {
  var string00, string1 = value1 + "", interpolate0;
  return function() {
    var string0 = this.getAttribute(name);
    return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
  };
}
function attrConstantNS2(fullname, interpolate, value1) {
  var string00, string1 = value1 + "", interpolate0;
  return function() {
    var string0 = this.getAttributeNS(fullname.space, fullname.local);
    return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
  };
}
function attrFunction2(name, interpolate, value) {
  var string00, string10, interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttribute(name);
    string0 = this.getAttribute(name);
    string1 = value1 + "";
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}
function attrFunctionNS2(fullname, interpolate, value) {
  var string00, string10, interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    string0 = this.getAttributeNS(fullname.space, fullname.local);
    string1 = value1 + "";
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}
function attr_default2(name, value) {
  var fullname = namespace_default(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
  return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS2 : attrFunction2)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS2 : attrRemove2)(fullname) : (fullname.local ? attrConstantNS2 : attrConstant2)(fullname, i, value));
}

// node_modules/d3-transition/src/transition/attrTween.js
function attrInterpolate(name, i) {
  return function(t) {
    this.setAttribute(name, i.call(this, t));
  };
}
function attrInterpolateNS(fullname, i) {
  return function(t) {
    this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
  };
}
function attrTweenNS(fullname, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
    return t0;
  }
  tween._value = value;
  return tween;
}
function attrTween(name, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
    return t0;
  }
  tween._value = value;
  return tween;
}
function attrTween_default(name, value) {
  var key = "attr." + name;
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error();
  var fullname = namespace_default(name);
  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
}

// node_modules/d3-transition/src/transition/delay.js
function delayFunction(id2, value) {
  return function() {
    init(this, id2).delay = +value.apply(this, arguments);
  };
}
function delayConstant(id2, value) {
  return value = +value, function() {
    init(this, id2).delay = value;
  };
}
function delay_default(value) {
  var id2 = this._id;
  return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id2, value)) : get2(this.node(), id2).delay;
}

// node_modules/d3-transition/src/transition/duration.js
function durationFunction(id2, value) {
  return function() {
    set2(this, id2).duration = +value.apply(this, arguments);
  };
}
function durationConstant(id2, value) {
  return value = +value, function() {
    set2(this, id2).duration = value;
  };
}
function duration_default(value) {
  var id2 = this._id;
  return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id2, value)) : get2(this.node(), id2).duration;
}

// node_modules/d3-transition/src/transition/ease.js
function easeConstant(id2, value) {
  if (typeof value !== "function") throw new Error();
  return function() {
    set2(this, id2).ease = value;
  };
}
function ease_default(value) {
  var id2 = this._id;
  return arguments.length ? this.each(easeConstant(id2, value)) : get2(this.node(), id2).ease;
}

// node_modules/d3-transition/src/transition/easeVarying.js
function easeVarying(id2, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error();
    set2(this, id2).ease = v;
  };
}
function easeVarying_default(value) {
  if (typeof value !== "function") throw new Error();
  return this.each(easeVarying(this._id, value));
}

// node_modules/d3-transition/src/transition/filter.js
function filter_default2(match) {
  if (typeof match !== "function") match = matcher_default(match);
  for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }
  return new Transition(subgroups, this._parents, this._name, this._id);
}

// node_modules/d3-transition/src/transition/merge.js
function merge_default2(transition2) {
  if (transition2._id !== this._id) throw new Error();
  for (var groups0 = this._groups, groups1 = transition2._groups, m0 = groups0.length, m1 = groups1.length, m2 = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m2; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }
  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }
  return new Transition(merges, this._parents, this._name, this._id);
}

// node_modules/d3-transition/src/transition/on.js
function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}
function onFunction(id2, name, listener) {
  var on0, on1, sit = start(name) ? init : set2;
  return function() {
    var schedule = sit(this, id2), on = schedule.on;
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
    schedule.on = on1;
  };
}
function on_default2(name, listener) {
  var id2 = this._id;
  return arguments.length < 2 ? get2(this.node(), id2).on.on(name) : this.each(onFunction(id2, name, listener));
}

// node_modules/d3-transition/src/transition/remove.js
function removeFunction(id2) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id2) return;
    if (parent) parent.removeChild(this);
  };
}
function remove_default2() {
  return this.on("end.remove", removeFunction(this._id));
}

// node_modules/d3-transition/src/transition/select.js
function select_default2(select) {
  var name = this._name, id2 = this._id;
  if (typeof select !== "function") select = selector_default(select);
  for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule_default(subgroup[i], name, id2, i, subgroup, get2(node, id2));
      }
    }
  }
  return new Transition(subgroups, this._parents, name, id2);
}

// node_modules/d3-transition/src/transition/selectAll.js
function selectAll_default2(select) {
  var name = this._name, id2 = this._id;
  if (typeof select !== "function") select = selectorAll_default(select);
  for (var groups = this._groups, m2 = groups.length, subgroups = [], parents = [], j = 0; j < m2; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children2 = select.call(node, node.__data__, i, group), child, inherit2 = get2(node, id2), k = 0, l = children2.length; k < l; ++k) {
          if (child = children2[k]) {
            schedule_default(child, name, id2, k, children2, inherit2);
          }
        }
        subgroups.push(children2);
        parents.push(node);
      }
    }
  }
  return new Transition(subgroups, parents, name, id2);
}

// node_modules/d3-transition/src/transition/selection.js
var Selection2 = selection_default.prototype.constructor;
function selection_default2() {
  return new Selection2(this._groups, this._parents);
}

// node_modules/d3-transition/src/transition/style.js
function styleNull(name, interpolate) {
  var string00, string10, interpolate0;
  return function() {
    var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
  };
}
function styleRemove2(name) {
  return function() {
    this.style.removeProperty(name);
  };
}
function styleConstant2(name, interpolate, value1) {
  var string00, string1 = value1 + "", interpolate0;
  return function() {
    var string0 = styleValue(this, name);
    return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
  };
}
function styleFunction2(name, interpolate, value) {
  var string00, string10, interpolate0;
  return function() {
    var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
    if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}
function styleMaybeRemove(id2, name) {
  var on0, on1, listener0, key = "style." + name, event = "end." + key, remove2;
  return function() {
    var schedule = set2(this, id2), on = schedule.on, listener = schedule.value[key] == null ? remove2 || (remove2 = styleRemove2(name)) : void 0;
    if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
    schedule.on = on1;
  };
}
function style_default2(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate_default;
  return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove2(name)) : typeof value === "function" ? this.styleTween(name, styleFunction2(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant2(name, i, value), priority).on("end.style." + name, null);
}

// node_modules/d3-transition/src/transition/styleTween.js
function styleInterpolate(name, i, priority) {
  return function(t) {
    this.style.setProperty(name, i.call(this, t), priority);
  };
}
function styleTween(name, value, priority) {
  var t, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
    return t;
  }
  tween._value = value;
  return tween;
}
function styleTween_default(name, value, priority) {
  var key = "style." + (name += "");
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error();
  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
}

// node_modules/d3-transition/src/transition/text.js
function textConstant2(value) {
  return function() {
    this.textContent = value;
  };
}
function textFunction2(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}
function text_default2(value) {
  return this.tween("text", typeof value === "function" ? textFunction2(tweenValue(this, "text", value)) : textConstant2(value == null ? "" : value + ""));
}

// node_modules/d3-transition/src/transition/textTween.js
function textInterpolate(i) {
  return function(t) {
    this.textContent = i.call(this, t);
  };
}
function textTween(value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
    return t0;
  }
  tween._value = value;
  return tween;
}
function textTween_default(value) {
  var key = "text";
  if (arguments.length < 1) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error();
  return this.tween(key, textTween(value));
}

// node_modules/d3-transition/src/transition/transition.js
function transition_default() {
  var name = this._name, id0 = this._id, id1 = newId();
  for (var groups = this._groups, m2 = groups.length, j = 0; j < m2; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit2 = get2(node, id0);
        schedule_default(node, name, id1, i, group, {
          time: inherit2.time + inherit2.delay + inherit2.duration,
          delay: 0,
          duration: inherit2.duration,
          ease: inherit2.ease
        });
      }
    }
  }
  return new Transition(groups, this._parents, name, id1);
}

// node_modules/d3-transition/src/transition/end.js
function end_default() {
  var on0, on1, that = this, id2 = that._id, size = that.size();
  return new Promise(function(resolve, reject) {
    var cancel = { value: reject }, end = { value: function() {
      if (--size === 0) resolve();
    } };
    that.each(function() {
      var schedule = set2(this, id2), on = schedule.on;
      if (on !== on0) {
        on1 = (on0 = on).copy();
        on1._.cancel.push(cancel);
        on1._.interrupt.push(cancel);
        on1._.end.push(end);
      }
      schedule.on = on1;
    });
    if (size === 0) resolve();
  });
}

// node_modules/d3-transition/src/transition/index.js
var id = 0;
function Transition(groups, parents, name, id2) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id2;
}
function transition(name) {
  return selection_default().transition(name);
}
function newId() {
  return ++id;
}
var selection_prototype = selection_default.prototype;
Transition.prototype = transition.prototype = {
  constructor: Transition,
  select: select_default2,
  selectAll: selectAll_default2,
  selectChild: selection_prototype.selectChild,
  selectChildren: selection_prototype.selectChildren,
  filter: filter_default2,
  merge: merge_default2,
  selection: selection_default2,
  transition: transition_default,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: on_default2,
  attr: attr_default2,
  attrTween: attrTween_default,
  style: style_default2,
  styleTween: styleTween_default,
  text: text_default2,
  textTween: textTween_default,
  remove: remove_default2,
  tween: tween_default,
  delay: delay_default,
  duration: duration_default,
  ease: ease_default,
  easeVarying: easeVarying_default,
  end: end_default,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};

// node_modules/d3-ease/src/cubic.js
function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

// node_modules/d3-transition/src/selection/transition.js
var defaultTiming = {
  time: null,
  // Set on use.
  delay: 0,
  duration: 250,
  ease: cubicInOut
};
function inherit(node, id2) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id2])) {
    if (!(node = node.parentNode)) {
      throw new Error(`transition ${id2} not found`);
    }
  }
  return timing;
}
function transition_default2(name) {
  var id2, timing;
  if (name instanceof Transition) {
    id2 = name._id, name = name._name;
  } else {
    id2 = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
  }
  for (var groups = this._groups, m2 = groups.length, j = 0; j < m2; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule_default(node, name, id2, i, group, timing || inherit(node, id2));
      }
    }
  }
  return new Transition(groups, this._parents, name, id2);
}

// node_modules/d3-transition/src/selection/index.js
selection_default.prototype.interrupt = interrupt_default2;
selection_default.prototype.transition = transition_default2;

// node_modules/d3-brush/src/brush.js
var { abs, max, min } = Math;
function number1(e) {
  return [+e[0], +e[1]];
}
function number2(e) {
  return [number1(e[0]), number1(e[1])];
}
var X = {
  name: "x",
  handles: ["w", "e"].map(type),
  input: function(x2, e) {
    return x2 == null ? null : [[+x2[0], e[0][1]], [+x2[1], e[1][1]]];
  },
  output: function(xy) {
    return xy && [xy[0][0], xy[1][0]];
  }
};
var Y = {
  name: "y",
  handles: ["n", "s"].map(type),
  input: function(y2, e) {
    return y2 == null ? null : [[e[0][0], +y2[0]], [e[1][0], +y2[1]]];
  },
  output: function(xy) {
    return xy && [xy[0][1], xy[1][1]];
  }
};
var XY = {
  name: "xy",
  handles: ["n", "w", "e", "s", "nw", "ne", "sw", "se"].map(type),
  input: function(xy) {
    return xy == null ? null : number2(xy);
  },
  output: function(xy) {
    return xy;
  }
};
function type(t) {
  return { type: t };
}

// node_modules/d3-force/src/center.js
function center_default(x2, y2) {
  var nodes, strength = 1;
  if (x2 == null) x2 = 0;
  if (y2 == null) y2 = 0;
  function force() {
    var i, n = nodes.length, node, sx = 0, sy = 0;
    for (i = 0; i < n; ++i) {
      node = nodes[i], sx += node.x, sy += node.y;
    }
    for (sx = (sx / n - x2) * strength, sy = (sy / n - y2) * strength, i = 0; i < n; ++i) {
      node = nodes[i], node.x -= sx, node.y -= sy;
    }
  }
  force.initialize = function(_) {
    nodes = _;
  };
  force.x = function(_) {
    return arguments.length ? (x2 = +_, force) : x2;
  };
  force.y = function(_) {
    return arguments.length ? (y2 = +_, force) : y2;
  };
  force.strength = function(_) {
    return arguments.length ? (strength = +_, force) : strength;
  };
  return force;
}

// node_modules/d3-quadtree/src/add.js
function add_default(d) {
  const x2 = +this._x.call(null, d), y2 = +this._y.call(null, d);
  return add(this.cover(x2, y2), x2, y2, d);
}
function add(tree, x2, y2, d) {
  if (isNaN(x2) || isNaN(y2)) return tree;
  var parent, node = tree._root, leaf = { data: d }, x0 = tree._x0, y0 = tree._y0, x1 = tree._x1, y1 = tree._y1, xm, ym, xp, yp, right, bottom, i, j;
  if (!node) return tree._root = leaf, tree;
  while (node.length) {
    if (right = x2 >= (xm = (x0 + x1) / 2)) x0 = xm;
    else x1 = xm;
    if (bottom = y2 >= (ym = (y0 + y1) / 2)) y0 = ym;
    else y1 = ym;
    if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
  }
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  if (x2 === xp && y2 === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
  do {
    parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
    if (right = x2 >= (xm = (x0 + x1) / 2)) x0 = xm;
    else x1 = xm;
    if (bottom = y2 >= (ym = (y0 + y1) / 2)) y0 = ym;
    else y1 = ym;
  } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | xp >= xm));
  return parent[j] = node, parent[i] = leaf, tree;
}
function addAll(data) {
  var d, i, n = data.length, x2, y2, xz = new Array(n), yz = new Array(n), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (i = 0; i < n; ++i) {
    if (isNaN(x2 = +this._x.call(null, d = data[i])) || isNaN(y2 = +this._y.call(null, d))) continue;
    xz[i] = x2;
    yz[i] = y2;
    if (x2 < x0) x0 = x2;
    if (x2 > x1) x1 = x2;
    if (y2 < y0) y0 = y2;
    if (y2 > y1) y1 = y2;
  }
  if (x0 > x1 || y0 > y1) return this;
  this.cover(x0, y0).cover(x1, y1);
  for (i = 0; i < n; ++i) {
    add(this, xz[i], yz[i], data[i]);
  }
  return this;
}

// node_modules/d3-quadtree/src/cover.js
function cover_default(x2, y2) {
  if (isNaN(x2 = +x2) || isNaN(y2 = +y2)) return this;
  var x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1;
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x2)) + 1;
    y1 = (y0 = Math.floor(y2)) + 1;
  } else {
    var z = x1 - x0 || 1, node = this._root, parent, i;
    while (x0 > x2 || x2 >= x1 || y0 > y2 || y2 >= y1) {
      i = (y2 < y0) << 1 | x2 < x0;
      parent = new Array(4), parent[i] = node, node = parent, z *= 2;
      switch (i) {
        case 0:
          x1 = x0 + z, y1 = y0 + z;
          break;
        case 1:
          x0 = x1 - z, y1 = y0 + z;
          break;
        case 2:
          x1 = x0 + z, y0 = y1 - z;
          break;
        case 3:
          x0 = x1 - z, y0 = y1 - z;
          break;
      }
    }
    if (this._root && this._root.length) this._root = node;
  }
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  return this;
}

// node_modules/d3-quadtree/src/data.js
function data_default2() {
  var data = [];
  this.visit(function(node) {
    if (!node.length) do
      data.push(node.data);
    while (node = node.next);
  });
  return data;
}

// node_modules/d3-quadtree/src/extent.js
function extent_default(_) {
  return arguments.length ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]];
}

// node_modules/d3-quadtree/src/quad.js
function quad_default(node, x0, y0, x1, y1) {
  this.node = node;
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
}

// node_modules/d3-quadtree/src/find.js
function find_default(x2, y2, radius) {
  var data, x0 = this._x0, y0 = this._y0, x1, y1, x22, y22, x3 = this._x1, y3 = this._y1, quads = [], node = this._root, q, i;
  if (node) quads.push(new quad_default(node, x0, y0, x3, y3));
  if (radius == null) radius = Infinity;
  else {
    x0 = x2 - radius, y0 = y2 - radius;
    x3 = x2 + radius, y3 = y2 + radius;
    radius *= radius;
  }
  while (q = quads.pop()) {
    if (!(node = q.node) || (x1 = q.x0) > x3 || (y1 = q.y0) > y3 || (x22 = q.x1) < x0 || (y22 = q.y1) < y0) continue;
    if (node.length) {
      var xm = (x1 + x22) / 2, ym = (y1 + y22) / 2;
      quads.push(
        new quad_default(node[3], xm, ym, x22, y22),
        new quad_default(node[2], x1, ym, xm, y22),
        new quad_default(node[1], xm, y1, x22, ym),
        new quad_default(node[0], x1, y1, xm, ym)
      );
      if (i = (y2 >= ym) << 1 | x2 >= xm) {
        q = quads[quads.length - 1];
        quads[quads.length - 1] = quads[quads.length - 1 - i];
        quads[quads.length - 1 - i] = q;
      }
    } else {
      var dx = x2 - +this._x.call(null, node.data), dy = y2 - +this._y.call(null, node.data), d2 = dx * dx + dy * dy;
      if (d2 < radius) {
        var d = Math.sqrt(radius = d2);
        x0 = x2 - d, y0 = y2 - d;
        x3 = x2 + d, y3 = y2 + d;
        data = node.data;
      }
    }
  }
  return data;
}

// node_modules/d3-quadtree/src/remove.js
function remove_default3(d) {
  if (isNaN(x2 = +this._x.call(null, d)) || isNaN(y2 = +this._y.call(null, d))) return this;
  var parent, node = this._root, retainer, previous, next, x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1, x2, y2, xm, ym, right, bottom, i, j;
  if (!node) return this;
  if (node.length) while (true) {
    if (right = x2 >= (xm = (x0 + x1) / 2)) x0 = xm;
    else x1 = xm;
    if (bottom = y2 >= (ym = (y0 + y1) / 2)) y0 = ym;
    else y1 = ym;
    if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
    if (!node.length) break;
    if (parent[i + 1 & 3] || parent[i + 2 & 3] || parent[i + 3 & 3]) retainer = parent, j = i;
  }
  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
  if (next = node.next) delete node.next;
  if (previous) return next ? previous.next = next : delete previous.next, this;
  if (!parent) return this._root = next, this;
  next ? parent[i] = next : delete parent[i];
  if ((node = parent[0] || parent[1] || parent[2] || parent[3]) && node === (parent[3] || parent[2] || parent[1] || parent[0]) && !node.length) {
    if (retainer) retainer[j] = node;
    else this._root = node;
  }
  return this;
}
function removeAll(data) {
  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
  return this;
}

// node_modules/d3-quadtree/src/root.js
function root_default() {
  return this._root;
}

// node_modules/d3-quadtree/src/size.js
function size_default2() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length) do
      ++size;
    while (node = node.next);
  });
  return size;
}

// node_modules/d3-quadtree/src/visit.js
function visit_default(callback) {
  var quads = [], q, node = this._root, child, x0, y0, x1, y1;
  if (node) quads.push(new quad_default(node, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
      if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
      if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
      if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
    }
  }
  return this;
}

// node_modules/d3-quadtree/src/visitAfter.js
function visitAfter_default(callback) {
  var quads = [], next = [], q;
  if (this._root) quads.push(new quad_default(this._root, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
      if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
      if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
      if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.y0, q.x1, q.y1);
  }
  return this;
}

// node_modules/d3-quadtree/src/x.js
function defaultX(d) {
  return d[0];
}
function x_default(_) {
  return arguments.length ? (this._x = _, this) : this._x;
}

// node_modules/d3-quadtree/src/y.js
function defaultY(d) {
  return d[1];
}
function y_default(_) {
  return arguments.length ? (this._y = _, this) : this._y;
}

// node_modules/d3-quadtree/src/quadtree.js
function quadtree(nodes, x2, y2) {
  var tree = new Quadtree(x2 == null ? defaultX : x2, y2 == null ? defaultY : y2, NaN, NaN, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}
function Quadtree(x2, y2, x0, y0, x1, y1) {
  this._x = x2;
  this._y = y2;
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  this._root = void 0;
}
function leaf_copy(leaf) {
  var copy = { data: leaf.data }, next = copy;
  while (leaf = leaf.next) next = next.next = { data: leaf.data };
  return copy;
}
var treeProto = quadtree.prototype = Quadtree.prototype;
treeProto.copy = function() {
  var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1), node = this._root, nodes, child;
  if (!node) return copy;
  if (!node.length) return copy._root = leaf_copy(node), copy;
  nodes = [{ source: node, target: copy._root = new Array(4) }];
  while (node = nodes.pop()) {
    for (var i = 0; i < 4; ++i) {
      if (child = node.source[i]) {
        if (child.length) nodes.push({ source: child, target: node.target[i] = new Array(4) });
        else node.target[i] = leaf_copy(child);
      }
    }
  }
  return copy;
};
treeProto.add = add_default;
treeProto.addAll = addAll;
treeProto.cover = cover_default;
treeProto.data = data_default2;
treeProto.extent = extent_default;
treeProto.find = find_default;
treeProto.remove = remove_default3;
treeProto.removeAll = removeAll;
treeProto.root = root_default;
treeProto.size = size_default2;
treeProto.visit = visit_default;
treeProto.visitAfter = visitAfter_default;
treeProto.x = x_default;
treeProto.y = y_default;

// node_modules/d3-force/src/constant.js
function constant_default4(x2) {
  return function() {
    return x2;
  };
}

// node_modules/d3-force/src/jiggle.js
function jiggle_default(random) {
  return (random() - 0.5) * 1e-6;
}

// node_modules/d3-force/src/link.js
function index(d) {
  return d.index;
}
function find2(nodeById, nodeId) {
  var node = nodeById.get(nodeId);
  if (!node) throw new Error("node not found: " + nodeId);
  return node;
}
function link_default(links) {
  var id2 = index, strength = defaultStrength, strengths, distance = constant_default4(30), distances, nodes, count, bias, random, iterations = 1;
  if (links == null) links = [];
  function defaultStrength(link) {
    return 1 / Math.min(count[link.source.index], count[link.target.index]);
  }
  function force(alpha) {
    for (var k = 0, n = links.length; k < iterations; ++k) {
      for (var i = 0, link, source, target, x2, y2, l, b; i < n; ++i) {
        link = links[i], source = link.source, target = link.target;
        x2 = target.x + target.vx - source.x - source.vx || jiggle_default(random);
        y2 = target.y + target.vy - source.y - source.vy || jiggle_default(random);
        l = Math.sqrt(x2 * x2 + y2 * y2);
        l = (l - distances[i]) / l * alpha * strengths[i];
        x2 *= l, y2 *= l;
        target.vx -= x2 * (b = bias[i]);
        target.vy -= y2 * b;
        source.vx += x2 * (b = 1 - b);
        source.vy += y2 * b;
      }
    }
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, m2 = links.length, nodeById = new Map(nodes.map((d, i2) => [id2(d, i2, nodes), d])), link;
    for (i = 0, count = new Array(n); i < m2; ++i) {
      link = links[i], link.index = i;
      if (typeof link.source !== "object") link.source = find2(nodeById, link.source);
      if (typeof link.target !== "object") link.target = find2(nodeById, link.target);
      count[link.source.index] = (count[link.source.index] || 0) + 1;
      count[link.target.index] = (count[link.target.index] || 0) + 1;
    }
    for (i = 0, bias = new Array(m2); i < m2; ++i) {
      link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
    }
    strengths = new Array(m2), initializeStrength();
    distances = new Array(m2), initializeDistance();
  }
  function initializeStrength() {
    if (!nodes) return;
    for (var i = 0, n = links.length; i < n; ++i) {
      strengths[i] = +strength(links[i], i, links);
    }
  }
  function initializeDistance() {
    if (!nodes) return;
    for (var i = 0, n = links.length; i < n; ++i) {
      distances[i] = +distance(links[i], i, links);
    }
  }
  force.initialize = function(_nodes, _random) {
    nodes = _nodes;
    random = _random;
    initialize();
  };
  force.links = function(_) {
    return arguments.length ? (links = _, initialize(), force) : links;
  };
  force.id = function(_) {
    return arguments.length ? (id2 = _, force) : id2;
  };
  force.iterations = function(_) {
    return arguments.length ? (iterations = +_, force) : iterations;
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default4(+_), initializeStrength(), force) : strength;
  };
  force.distance = function(_) {
    return arguments.length ? (distance = typeof _ === "function" ? _ : constant_default4(+_), initializeDistance(), force) : distance;
  };
  return force;
}

// node_modules/d3-force/src/lcg.js
var a = 1664525;
var c = 1013904223;
var m = 4294967296;
function lcg_default() {
  let s = 1;
  return () => (s = (a * s + c) % m) / m;
}

// node_modules/d3-force/src/simulation.js
function x(d) {
  return d.x;
}
function y(d) {
  return d.y;
}
var initialRadius = 10;
var initialAngle = Math.PI * (3 - Math.sqrt(5));
function simulation_default(nodes) {
  var simulation, alpha = 1, alphaMin = 1e-3, alphaDecay = 1 - Math.pow(alphaMin, 1 / 300), alphaTarget = 0, velocityDecay = 0.6, forces = /* @__PURE__ */ new Map(), stepper = timer(step), event = dispatch_default("tick", "end"), random = lcg_default();
  if (nodes == null) nodes = [];
  function step() {
    tick();
    event.call("tick", simulation);
    if (alpha < alphaMin) {
      stepper.stop();
      event.call("end", simulation);
    }
  }
  function tick(iterations) {
    var i, n = nodes.length, node;
    if (iterations === void 0) iterations = 1;
    for (var k = 0; k < iterations; ++k) {
      alpha += (alphaTarget - alpha) * alphaDecay;
      forces.forEach(function(force) {
        force(alpha);
      });
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        if (node.fx == null) node.x += node.vx *= velocityDecay;
        else node.x = node.fx, node.vx = 0;
        if (node.fy == null) node.y += node.vy *= velocityDecay;
        else node.y = node.fy, node.vy = 0;
      }
    }
    return simulation;
  }
  function initializeNodes() {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.index = i;
      if (node.fx != null) node.x = node.fx;
      if (node.fy != null) node.y = node.fy;
      if (isNaN(node.x) || isNaN(node.y)) {
        var radius = initialRadius * Math.sqrt(0.5 + i), angle = i * initialAngle;
        node.x = radius * Math.cos(angle);
        node.y = radius * Math.sin(angle);
      }
      if (isNaN(node.vx) || isNaN(node.vy)) {
        node.vx = node.vy = 0;
      }
    }
  }
  function initializeForce(force) {
    if (force.initialize) force.initialize(nodes, random);
    return force;
  }
  initializeNodes();
  return simulation = {
    tick,
    restart: function() {
      return stepper.restart(step), simulation;
    },
    stop: function() {
      return stepper.stop(), simulation;
    },
    nodes: function(_) {
      return arguments.length ? (nodes = _, initializeNodes(), forces.forEach(initializeForce), simulation) : nodes;
    },
    alpha: function(_) {
      return arguments.length ? (alpha = +_, simulation) : alpha;
    },
    alphaMin: function(_) {
      return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
    },
    alphaDecay: function(_) {
      return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
    },
    alphaTarget: function(_) {
      return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
    },
    velocityDecay: function(_) {
      return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
    },
    randomSource: function(_) {
      return arguments.length ? (random = _, forces.forEach(initializeForce), simulation) : random;
    },
    force: function(name, _) {
      return arguments.length > 1 ? (_ == null ? forces.delete(name) : forces.set(name, initializeForce(_)), simulation) : forces.get(name);
    },
    find: function(x2, y2, radius) {
      var i = 0, n = nodes.length, dx, dy, d2, node, closest;
      if (radius == null) radius = Infinity;
      else radius *= radius;
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        dx = x2 - node.x;
        dy = y2 - node.y;
        d2 = dx * dx + dy * dy;
        if (d2 < radius) closest = node, radius = d2;
      }
      return closest;
    },
    on: function(name, _) {
      return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
    }
  };
}

// node_modules/d3-force/src/manyBody.js
function manyBody_default() {
  var nodes, node, random, alpha, strength = constant_default4(-30), strengths, distanceMin2 = 1, distanceMax2 = Infinity, theta2 = 0.81;
  function force(_) {
    var i, n = nodes.length, tree = quadtree(nodes, x, y).visitAfter(accumulate);
    for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
  }
  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, node2;
    strengths = new Array(n);
    for (i = 0; i < n; ++i) node2 = nodes[i], strengths[node2.index] = +strength(node2, i, nodes);
  }
  function accumulate(quad) {
    var strength2 = 0, q, c2, weight = 0, x2, y2, i;
    if (quad.length) {
      for (x2 = y2 = i = 0; i < 4; ++i) {
        if ((q = quad[i]) && (c2 = Math.abs(q.value))) {
          strength2 += q.value, weight += c2, x2 += c2 * q.x, y2 += c2 * q.y;
        }
      }
      quad.x = x2 / weight;
      quad.y = y2 / weight;
    } else {
      q = quad;
      q.x = q.data.x;
      q.y = q.data.y;
      do
        strength2 += strengths[q.data.index];
      while (q = q.next);
    }
    quad.value = strength2;
  }
  function apply(quad, x1, _, x2) {
    if (!quad.value) return true;
    var x3 = quad.x - node.x, y2 = quad.y - node.y, w = x2 - x1, l = x3 * x3 + y2 * y2;
    if (w * w / theta2 < l) {
      if (l < distanceMax2) {
        if (x3 === 0) x3 = jiggle_default(random), l += x3 * x3;
        if (y2 === 0) y2 = jiggle_default(random), l += y2 * y2;
        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
        node.vx += x3 * quad.value * alpha / l;
        node.vy += y2 * quad.value * alpha / l;
      }
      return true;
    } else if (quad.length || l >= distanceMax2) return;
    if (quad.data !== node || quad.next) {
      if (x3 === 0) x3 = jiggle_default(random), l += x3 * x3;
      if (y2 === 0) y2 = jiggle_default(random), l += y2 * y2;
      if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
    }
    do
      if (quad.data !== node) {
        w = strengths[quad.data.index] * alpha / l;
        node.vx += x3 * w;
        node.vy += y2 * w;
      }
    while (quad = quad.next);
  }
  force.initialize = function(_nodes, _random) {
    nodes = _nodes;
    random = _random;
    initialize();
  };
  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default4(+_), initialize(), force) : strength;
  };
  force.distanceMin = function(_) {
    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
  };
  force.distanceMax = function(_) {
    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
  };
  force.theta = function(_) {
    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
  };
  return force;
}

// node_modules/d3-zoom/src/transform.js
function Transform(k, x2, y2) {
  this.k = k;
  this.x = x2;
  this.y = y2;
}
Transform.prototype = {
  constructor: Transform,
  scale: function(k) {
    return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
  },
  translate: function(x2, y2) {
    return x2 === 0 & y2 === 0 ? this : new Transform(this.k, this.x + this.k * x2, this.y + this.k * y2);
  },
  apply: function(point) {
    return [point[0] * this.k + this.x, point[1] * this.k + this.y];
  },
  applyX: function(x2) {
    return x2 * this.k + this.x;
  },
  applyY: function(y2) {
    return y2 * this.k + this.y;
  },
  invert: function(location) {
    return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
  },
  invertX: function(x2) {
    return (x2 - this.x) / this.k;
  },
  invertY: function(y2) {
    return (y2 - this.y) / this.k;
  },
  rescaleX: function(x2) {
    return x2.copy().domain(x2.range().map(this.invertX, this).map(x2.invert, x2));
  },
  rescaleY: function(y2) {
    return y2.copy().domain(y2.range().map(this.invertY, this).map(y2.invert, y2));
  },
  toString: function() {
    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
  }
};
var identity2 = new Transform(1, 0, 0);
transform.prototype = Transform.prototype;
function transform(node) {
  while (!node.__zoom) if (!(node = node.parentNode)) return identity2;
  return node.__zoom;
}

// packages/viewer/src/renderer/network/state.ts
var DEFAULT_LINK_TYPE = "normal";
function createNetworkState(graph) {
  return {
    search: "",
    expandedFolderIds: /* @__PURE__ */ new Set(),
    enabledGroups: new Set(graph.groups.map((group) => group.id)),
    enabledLinkTypes: new Set(allGraphLinks(graph).map(linkType)),
    minDegree: 0
  };
}
function selectNode(state, nodeId) {
  return cloneState(state, { selectedNodeId: nodeId });
}
function expandFolder(state, folderId) {
  return cloneState(state, {
    expandedFolderIds: /* @__PURE__ */ new Set([...state.expandedFolderIds, folderId])
  });
}
function collapseFolder(state, folderId) {
  const expandedFolderIds = new Set(state.expandedFolderIds);
  expandedFolderIds.delete(folderId);
  return cloneState(state, { expandedFolderIds });
}
function toggleFolder(state, folderId) {
  return state.expandedFolderIds.has(folderId) ? collapseFolder(state, folderId) : expandFolder(state, folderId);
}
function visibleNetworkModel(graph, state) {
  const expanded = expandedGraph(graph, state);
  const degrees2 = nodeDegrees(expanded.links);
  const query = state.search.trim().toLowerCase();
  const visibleNodes = expanded.nodes.filter((node) => isNodeVisible(node, state, degrees2, query));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleLinks = expanded.links.filter((link) => {
    return visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target) && state.enabledLinkTypes.has(linkType(link));
  });
  const highlights = selectedHighlights(state.selectedNodeId, visibleNodeIds, visibleLinks);
  const muted = selectedMutedSets(state.selectedNodeId, visibleNodes, visibleLinks, highlights.highlightedNodeIds, highlights.highlightedLinkIds);
  return {
    nodes: visibleNodes,
    links: visibleLinks,
    highlightedNodeIds: highlights.highlightedNodeIds,
    highlightedLinkIds: highlights.highlightedLinkIds,
    mutedNodeIds: muted.mutedNodeIds,
    mutedLinkIds: muted.mutedLinkIds
  };
}
function cloneState(state, overrides = {}) {
  return {
    selectedNodeId: state.selectedNodeId,
    search: state.search,
    expandedFolderIds: new Set(state.expandedFolderIds),
    enabledGroups: new Set(state.enabledGroups),
    enabledLinkTypes: new Set(state.enabledLinkTypes),
    minDegree: state.minDegree,
    ...overrides
  };
}
function expandedGraph(graph, state) {
  const nodes = [];
  const links = [];
  const nodeIds = /* @__PURE__ */ new Set();
  const linkIds = /* @__PURE__ */ new Set();
  appendUniqueNodes(nodes, nodeIds, graph.nodes);
  appendUniqueLinks(links, linkIds, graph.links);
  for (const folderId of state.expandedFolderIds) {
    const subfolder = graph.subfolders[folderId];
    if (!subfolder) continue;
    appendUniqueNodes(nodes, nodeIds, subfolder.nodes);
    appendUniqueLinks(links, linkIds, subfolder.links);
  }
  return { nodes, links };
}
function allGraphLinks(graph) {
  return [
    ...graph.links,
    ...Object.values(graph.subfolders).flatMap((subfolder) => subfolder.links)
  ];
}
function appendUniqueNodes(target, seenIds, nodes) {
  for (const node of nodes) {
    if (seenIds.has(node.id)) continue;
    seenIds.add(node.id);
    target.push(node);
  }
}
function appendUniqueLinks(target, seenIds, links) {
  for (const link of links) {
    if (seenIds.has(link.id)) continue;
    seenIds.add(link.id);
    target.push(link);
  }
}
function nodeDegrees(links) {
  const degrees2 = /* @__PURE__ */ new Map();
  for (const link of links) {
    degrees2.set(link.source, (degrees2.get(link.source) ?? 0) + 1);
    degrees2.set(link.target, (degrees2.get(link.target) ?? 0) + 1);
  }
  return degrees2;
}
function isNodeVisible(node, state, degrees2, query) {
  if (node.group && !state.enabledGroups.has(node.group)) return false;
  if (state.minDegree > 0 && (degrees2.get(node.id) ?? 0) < state.minDegree) return false;
  if (!query) return true;
  return node.id.toLowerCase().includes(query) || node.label.toLowerCase().includes(query);
}
function selectedHighlights(selectedNodeId, visibleNodeIds, visibleLinks) {
  const highlightedNodeIds = /* @__PURE__ */ new Set();
  const highlightedLinkIds = /* @__PURE__ */ new Set();
  if (!selectedNodeId || !visibleNodeIds.has(selectedNodeId)) {
    return { highlightedNodeIds, highlightedLinkIds };
  }
  highlightedNodeIds.add(selectedNodeId);
  for (const link of visibleLinks) {
    if (link.source !== selectedNodeId && link.target !== selectedNodeId) continue;
    highlightedLinkIds.add(link.id);
    highlightedNodeIds.add(link.source === selectedNodeId ? link.target : link.source);
  }
  return { highlightedNodeIds, highlightedLinkIds };
}
function selectedMutedSets(selectedNodeId, visibleNodes, visibleLinks, highlightedNodeIds, highlightedLinkIds) {
  const mutedNodeIds = /* @__PURE__ */ new Set();
  const mutedLinkIds = /* @__PURE__ */ new Set();
  if (!selectedNodeId || !highlightedNodeIds.has(selectedNodeId)) return { mutedNodeIds, mutedLinkIds };
  for (const node of visibleNodes) {
    if (!highlightedNodeIds.has(node.id)) mutedNodeIds.add(node.id);
  }
  for (const link of visibleLinks) {
    if (!highlightedLinkIds.has(link.id)) mutedLinkIds.add(link.id);
  }
  return { mutedNodeIds, mutedLinkIds };
}
function linkType(link) {
  return link.type ?? DEFAULT_LINK_TYPE;
}

// packages/viewer/src/renderer/network/runtime.ts
var SVG_NS = "http://www.w3.org/2000/svg";
var DEFAULT_WIDTH = 800;
var DEFAULT_HEIGHT = 600;
var MIN_VIEWPORT_SCALE = 0.05;
var MAX_VIEWPORT_SCALE = 4;
function hydrateNetworkDiagrams(root2 = document) {
  const hosts = Array.from(root2.querySelectorAll('[data-xcon-network="true"]'));
  for (const host of hosts) {
    if (host.dataset.xconNetworkBound === "true") continue;
    hydrateHost(host);
  }
}
function hydrateHost(host) {
  const svg = host.querySelector("svg");
  if (!svg) return;
  const graph = parseGraph(host.dataset.xconNetworkModel);
  const options = parseOptions(host.dataset.xconNetworkOptions);
  if (!graph || !options) return;
  host.dataset.xconNetworkBound = "true";
  let state = createNetworkState(graph);
  const context = {
    layoutCache: /* @__PURE__ */ new Map(),
    layout: /* @__PURE__ */ new Map(),
    transform: defaultTransform()
  };
  const render2 = () => {
    const visible = visibleNetworkModel(graph, state);
    renderSvg(svg, visible, graph, options, host, state, context, updateState);
  };
  const updateState = (nextState) => {
    state = nextState;
    render2();
  };
  bindViewportInteractions(svg, options, context);
  if (options.showControls) {
    buildControls(host, svg, graph, options, context, () => state, updateState);
  }
  render2();
}
function buildControls(host, svg, graph, options, context, getState, updateState) {
  const toolbar = ensureToolbar(host);
  toolbar.replaceChildren();
  let search;
  let syncFilterControls = () => void 0;
  if (options.showSearch) {
    const searchInput = document.createElement("input");
    search = searchInput;
    searchInput.type = "search";
    searchInput.value = getState().search;
    searchInput.placeholder = "Search";
    searchInput.ariaLabel = "Search network";
    searchInput.dataset.xconNetworkSearch = "true";
    searchInput.addEventListener("input", () => {
      updateState({ ...getState(), search: searchInput.value });
      syncFilterControls();
    });
    toolbar.append(searchInput);
  }
  const fit = document.createElement("button");
  fit.type = "button";
  fit.textContent = "Fit";
  fit.title = "Fit graph to view";
  fit.dataset.xconNetworkFit = "true";
  fit.addEventListener("click", () => {
    fitGraphToView(svg, host, options, context);
  });
  toolbar.append(fit);
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset";
  reset.title = "Reset graph view and filters";
  reset.dataset.xconNetworkReset = "true";
  reset.addEventListener("click", () => {
    delete host.dataset.xconNetworkSelected;
    if (search) search.value = "";
    context.transform = defaultTransform();
    context.layoutCache.clear();
    updateState(createNetworkState(graph));
    syncFilterControls();
    applyViewportTransform(svg, context.transform);
  });
  toolbar.append(reset);
  if (options.showLegend && graph.groups.length > 0) {
    toolbar.append(renderLegend(graph.groups));
  }
  if (options.showFilters) {
    syncFilterControls = buildFilterControls(host, toolbar, graph, getState, updateState);
  } else {
    host.querySelector("[data-xcon-network-filters]")?.remove();
  }
}
function ensureToolbar(host) {
  const existing = host.querySelector("[data-xcon-network-toolbar]");
  if (existing) return existing;
  const toolbar = document.createElement("div");
  toolbar.className = "xa-network-toolbar";
  toolbar.dataset.xconNetworkToolbar = "true";
  host.insertBefore(toolbar, host.firstChild);
  return toolbar;
}
function renderLegend(groups) {
  const legend = document.createElement("div");
  legend.dataset.xconNetworkLegend = "true";
  for (const group of groups) {
    const item = document.createElement("span");
    item.dataset.xconNetworkLegendItem = group.id;
    item.textContent = group.label;
    if (group.color) item.setAttribute("style", `--xcon-network-group-color:${safeCssValue(group.color) ?? "currentColor"}`);
    legend.append(item);
  }
  return legend;
}
function setToggleButtonState(button, enabled) {
  button.setAttribute("aria-pressed", String(enabled));
  setClassTokens(button, ["xa-network-filter-toggle", enabled ? "enabled" : "disabled"]);
}
function linkTypes(graph) {
  return Array.from(new Set(allGraphLinks2(graph).map(linkType2))).sort();
}
function allGraphLinks2(graph) {
  return [
    ...graph.links,
    ...Object.values(graph.subfolders).flatMap((subfolder) => subfolder.links)
  ];
}
function linkType2(link) {
  return link.type ?? "normal";
}
function buildFilterControls(host, toolbar, graph, getState, updateState) {
  const existing = host.querySelector("[data-xcon-network-filters]");
  existing?.remove();
  const filters = document.createElement("div");
  filters.className = "xa-network-filters";
  filters.dataset.xconNetworkFilters = "true";
  const commit = (state) => {
    updateState(state);
    sync();
  };
  for (const group of graph.groups) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = group.label;
    button.dataset.xconNetworkFilterGroup = group.id;
    button.addEventListener("click", () => {
      const enabledGroups = new Set(getState().enabledGroups);
      if (enabledGroups.has(group.id)) enabledGroups.delete(group.id);
      else enabledGroups.add(group.id);
      commit({ ...getState(), enabledGroups });
    });
    filters.append(button);
  }
  for (const type2 of linkTypes(graph)) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = type2;
    button.dataset.xconNetworkFilterLinkType = type2;
    button.addEventListener("click", () => {
      const enabledLinkTypes = new Set(getState().enabledLinkTypes);
      if (enabledLinkTypes.has(type2)) enabledLinkTypes.delete(type2);
      else enabledLinkTypes.add(type2);
      commit({ ...getState(), enabledLinkTypes });
    });
    filters.append(button);
  }
  const minDegree = document.createElement("input");
  minDegree.type = "number";
  minDegree.min = "0";
  minDegree.step = "1";
  minDegree.placeholder = "Degree";
  minDegree.title = "Minimum node degree";
  minDegree.ariaLabel = "Minimum node degree";
  minDegree.dataset.xconNetworkMinDegree = "true";
  minDegree.addEventListener("input", () => {
    const value = Math.max(0, Math.floor(Number(minDegree.value) || 0));
    commit({ ...getState(), minDegree: value });
  });
  filters.append(minDegree);
  toolbar.parentNode?.insertBefore(filters, toolbar.nextSibling);
  sync();
  return sync;
  function sync() {
    const state = getState();
    for (const button of Array.from(filters.querySelectorAll("[data-xcon-network-filter-group]"))) {
      const group = button.dataset.xconNetworkFilterGroup ?? "";
      setToggleButtonState(button, state.enabledGroups.has(group));
    }
    for (const button of Array.from(filters.querySelectorAll("[data-xcon-network-filter-link-type]"))) {
      const type2 = button.dataset.xconNetworkFilterLinkType ?? "";
      setToggleButtonState(button, state.enabledLinkTypes.has(type2));
    }
    minDegree.value = String(state.minDegree);
  }
}
function renderSvg(svg, visible, graph, options, host, state, context, updateState) {
  const { width, height } = svgSize(svg, host);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.replaceChildren();
  const layout = cachedLayout(visible.nodes, visible.links, options, width, height, context);
  const arrowId = `xcon-network-arrow-${safeId(host.dataset.key ?? host.id ?? "root")}`;
  if (options.showArrows) svg.append(renderArrowDefs(arrowId));
  const viewport = svgElement("g", {
    class: "network-viewport",
    "data-xcon-network-viewport": "true",
    transform: transformAttribute(context.transform)
  });
  const linkLayer = svgElement("g", { class: "network-links" });
  const nodeLayer = svgElement("g", { class: "network-nodes" });
  viewport.append(linkLayer, nodeLayer);
  svg.append(viewport);
  for (const link of visible.links) {
    const source = layout.get(link.source);
    const target = layout.get(link.target);
    if (!source || !target) continue;
    const line = svgElement("line", {
      class: classNames(
        "network-link",
        ...linkClassTokens(link),
        visible.highlightedLinkIds.has(link.id) && "highlighted",
        visible.mutedLinkIds.has(link.id) && "muted"
      ),
      "data-network-link-id": link.id,
      "data-network-link-source": link.source,
      "data-network-link-target": link.target,
      x1: String(source.x),
      y1: String(source.y),
      x2: String(target.x),
      y2: String(target.y),
      "marker-end": options.showArrows ? `url(#${arrowId})` : void 0
    });
    linkLayer.append(line);
  }
  for (const node of visible.nodes) {
    const point = layout.get(node.id);
    if (!point) continue;
    const group = svgElement("g", {
      class: classNames(
        "network-node-group",
        node.isRoot && "root-node",
        host.dataset.xconNetworkSelected === node.id && "selected",
        visible.highlightedNodeIds.has(node.id) && "highlighted",
        visible.mutedNodeIds.has(node.id) && "muted"
      ),
      "data-network-node-id": node.id,
      transform: `translate(${trim(point.x)} ${trim(point.y)})`
    });
    group.addEventListener("click", () => {
      host.dataset.xconNetworkSelected = node.id;
      const selected = selectNode(state, node.id);
      const nextState = graph.subfolders[node.id] ? toggleFolder(selected, node.id) : selected;
      updateState(nextState);
    });
    if (options.enableHover) bindHover(group, host, node);
    if (options.enableDrag) bindDrag(group, svg, node.id, layout, context);
    group.append(svgElement("circle", {
      class: classNames("network-node", node.isRoot && "root-node"),
      "data-network-node-circle": "true",
      r: String(options.nodeRadius),
      fill: nodeFill(node)
    }));
    if (options.showLabels) {
      const label = svgElement("text", { class: "network-label", y: String(options.nodeRadius + 16), "text-anchor": "middle" });
      label.textContent = node.label;
      group.append(label);
    }
    nodeLayer.append(group);
  }
}
function bindViewportInteractions(svg, options, context) {
  if (options.enableZoom) {
    svg.addEventListener("wheel", (event) => {
      event.preventDefault();
      const wheel = event;
      const factor = wheel.deltaY < 0 ? 1.12 : 0.88;
      const previous = context.transform;
      const nextScale = clamp(previous.k * factor, MIN_VIEWPORT_SCALE, MAX_VIEWPORT_SCALE);
      if (nextScale === previous.k) return;
      const anchorX = finiteCoordinate(wheel.clientX) ?? 0;
      const anchorY = finiteCoordinate(wheel.clientY) ?? 0;
      context.transform = {
        x: anchorX - (anchorX - previous.x) * (nextScale / previous.k),
        y: anchorY - (anchorY - previous.y) * (nextScale / previous.k),
        k: nextScale
      };
      applyViewportTransform(svg, context.transform);
    });
  }
  if (options.enablePan) {
    svg.addEventListener("mousedown", (event) => {
      if (event.target !== svg) return;
      const start2 = event;
      const startTransform = { ...context.transform };
      const owner = svg.ownerDocument ?? document;
      const move = (moveEvent) => {
        context.transform = {
          ...startTransform,
          x: startTransform.x + moveEvent.clientX - start2.clientX,
          y: startTransform.y + moveEvent.clientY - start2.clientY
        };
        applyViewportTransform(svg, context.transform);
      };
      const end = () => {
        owner.removeEventListener("mousemove", move);
        owner.removeEventListener("mouseup", end);
      };
      owner.addEventListener("mousemove", move);
      owner.addEventListener("mouseup", end);
    });
  }
}
function bindHover(group, host, node) {
  group.addEventListener("mouseenter", (event) => {
    const tooltip = ensureTooltip(host);
    tooltip.textContent = node.label;
    const mouse = event;
    const anchor = tooltipAnchor(group, host, mouse);
    const style = `left:${trim(anchor.x)}px;top:${trim(anchor.y)}px`;
    tooltip.setAttribute("style", style);
    addClassToken(tooltip, "show");
  });
  group.addEventListener("mouseleave", () => {
    const tooltip = ensureTooltip(host);
    tooltip.textContent = "";
    removeClassToken(tooltip, "show");
  });
}
function tooltipAnchor(group, host, mouse) {
  const hostRect = host.getBoundingClientRect();
  const circle = group.querySelector("[data-network-node-circle]");
  if (circle) {
    const rect = circle.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return {
        x: finiteCoordinate(rect.left + rect.width / 2 - hostRect.left) ?? 0,
        y: finiteCoordinate(rect.top - hostRect.top) ?? 0
      };
    }
  }
  const groupRect = group.getBoundingClientRect();
  if (groupRect.width > 0 || groupRect.height > 0) {
    return {
      x: finiteCoordinate(groupRect.left + groupRect.width / 2 - hostRect.left) ?? 0,
      y: finiteCoordinate(groupRect.top - hostRect.top) ?? 0
    };
  }
  return {
    x: finiteCoordinate(mouse.clientX - hostRect.left + 12) ?? 0,
    y: finiteCoordinate(mouse.clientY - hostRect.top + 12) ?? 0
  };
}
function bindDrag(group, svg, nodeId, layout, context) {
  group.addEventListener("mousedown", (event) => {
    const point = layout.get(nodeId);
    if (!point) return;
    event.preventDefault();
    const start2 = event;
    const startPoint = { x: point.x, y: point.y };
    const owner = svg.ownerDocument ?? document;
    const move = (moveEvent) => {
      const scale = context.transform.k || 1;
      point.x = startPoint.x + (moveEvent.clientX - start2.clientX) / scale;
      point.y = startPoint.y + (moveEvent.clientY - start2.clientY) / scale;
      updateRenderedNodePosition(svg, nodeId, point.x, point.y);
    };
    const end = () => {
      owner.removeEventListener("mousemove", move);
      owner.removeEventListener("mouseup", end);
    };
    owner.addEventListener("mousemove", move);
    owner.addEventListener("mouseup", end);
  });
}
function updateRenderedNodePosition(svg, nodeId, x2, y2) {
  const group = svg.querySelector(`[data-network-node-id="${cssAttrValue(nodeId)}"]`);
  group?.setAttribute("transform", `translate(${trim(x2)} ${trim(y2)})`);
  for (const link of Array.from(svg.querySelectorAll("[data-network-link-id]"))) {
    if (link.getAttribute("data-network-link-source") === nodeId) {
      link.setAttribute("x1", String(x2));
      link.setAttribute("y1", String(y2));
    }
    if (link.getAttribute("data-network-link-target") === nodeId) {
      link.setAttribute("x2", String(x2));
      link.setAttribute("y2", String(y2));
    }
  }
}
function nodeFill(node) {
  return safeSvgPaint(node.color) ?? (node.isRoot ? "var(--xcon-network-primary)" : "var(--xcon-network-node)");
}
function linkClassTokens(link) {
  const type2 = link.type?.trim();
  if (!type2) return [];
  const typed = `${safeClassToken(type2)}-link`;
  const tokens = [typed];
  if (isReferenceLink(type2)) tokens.push("ref-link");
  return Array.from(new Set(tokens));
}
function isReferenceLink(type2) {
  const normalized = type2?.toLowerCase();
  return normalized === "folder" || normalized === "ref";
}
function ensureTooltip(host) {
  const existing = host.querySelector("[data-xcon-network-tooltip]");
  if (existing) return existing;
  const tooltip = document.createElement("div");
  tooltip.className = "network-tooltip";
  tooltip.dataset.xconNetworkTooltip = "true";
  host.append(tooltip);
  return tooltip;
}
function applyViewportTransform(svg, transform2) {
  svg.querySelector("[data-xcon-network-viewport]")?.setAttribute("transform", transformAttribute(transform2));
}
function fitGraphToView(svg, host, options, context) {
  const { width, height } = svgSize(svg, host);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const bounds = renderedGraphBounds(svg, context, options);
  context.transform = bounds ? fitTransform(bounds, width, height, options) : defaultTransform();
  applyViewportTransform(svg, context.transform);
}
function renderedGraphBounds(svg, context, options) {
  const nodeIds = Array.from(svg.querySelectorAll("[data-network-node-id]")).map((node) => node.getAttribute("data-network-node-id")).filter((id2) => Boolean(id2));
  if (nodeIds.length === 0) return null;
  const radius = Math.max(1, options.nodeRadius);
  const labelBottom = options.showLabels ? radius + 28 : radius;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const id2 of nodeIds) {
    const point = context.layout.get(id2);
    if (!point) continue;
    minX = Math.min(minX, point.x - radius);
    minY = Math.min(minY, point.y - radius);
    maxX = Math.max(maxX, point.x + radius);
    maxY = Math.max(maxY, point.y + labelBottom);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}
function fitTransform(bounds, width, height, options) {
  const padding = fitPadding(width, height, options);
  const usableWidth = Math.max(1, width - padding.left - padding.right);
  const usableHeight = Math.max(1, height - padding.top - padding.bottom);
  const scale = clamp(Math.min(usableWidth / bounds.width, usableHeight / bounds.height, 1), MIN_VIEWPORT_SCALE, 1);
  return {
    x: padding.left + (usableWidth - bounds.width * scale) / 2 - bounds.minX * scale,
    y: padding.top + (usableHeight - bounds.height * scale) / 2 - bounds.minY * scale,
    k: scale
  };
}
function fitPadding(width, height, options) {
  const base = clamp(Math.min(width, height) * 0.12, 32, 72);
  const controlsTop = options.showControls ? Math.min(height * 0.36, base + 70) : base;
  return {
    top: controlsTop,
    right: base,
    bottom: base,
    left: base
  };
}
function defaultTransform() {
  return { x: 0, y: 0, k: 1 };
}
function transformAttribute(transform2) {
  return `translate(${trim(transform2.x)} ${trim(transform2.y)}) scale(${trim(transform2.k)})`;
}
function cachedLayout(nodes, links, options, width, height, context) {
  const key = layoutCacheKey(nodes, links, options, width, height);
  const cached = context.layoutCache.get(key);
  if (cached) {
    context.layout = cached;
    return cached;
  }
  const layout = layoutGraph(nodes, links, options, width, height);
  context.layoutCache.set(key, layout);
  context.layout = layout;
  return layout;
}
function layoutCacheKey(nodes, links, options, width, height) {
  return JSON.stringify({
    width,
    height,
    linkDistance: options.linkDistance,
    charge: options.charge,
    friction: options.friction,
    nodes: nodes.map((node) => [node.id, node.x ?? null, node.y ?? null, node.fixed === true]),
    links: links.map((link) => [link.id, link.source, link.target, link.type ?? null, link.weight ?? null])
  });
}
function layoutGraph(nodes, links, options, width, height) {
  const positioned = nodes.map((node, index2) => {
    const fallback = fallbackPoint(index2, nodes.length, width, height);
    return {
      ...node,
      x: finiteCoordinate(node.x) ?? fallback.x,
      y: finiteCoordinate(node.y) ?? fallback.y,
      fx: node.fixed ? finiteCoordinate(node.x) ?? fallback.x : void 0,
      fy: node.fixed ? finiteCoordinate(node.y) ?? fallback.y : void 0
    };
  });
  const linkData = links.map((link) => ({ ...link }));
  simulation_default(positioned).force("link", link_default(linkData).id((node) => node.id).distance(options.linkDistance)).force("charge", manyBody_default().strength(options.charge)).force("center", center_default(width / 2, height / 2)).velocityDecay(1 - clamp(options.friction, 0, 1)).stop().tick(80);
  return new Map(positioned.map((node) => [node.id, node]));
}
function parseGraph(value) {
  const parsed = parseJson(value);
  if (!isPlainRecord(parsed)) return null;
  const graph = parsed;
  if (!isNodeArray(graph.nodes)) return null;
  if (!isLinkArray(graph.links)) return null;
  if (!isGroupArray(graph.groups)) return null;
  if (graph.rootNodeId !== void 0 && typeof graph.rootNodeId !== "string") return null;
  if (!isSubfolderRecord(graph.subfolders)) return null;
  return graph;
}
function isNodeArray(value) {
  return Array.isArray(value) && value.every(isNetworkNode);
}
function isNetworkNode(value) {
  if (!isPlainRecord(value)) return false;
  return isNonEmptyString(value.id) && typeof value.label === "string" && isPlainRecord(value.metadata) && typeof value.isRoot === "boolean" && isOptionalString(value.type) && isOptionalString(value.group) && isOptionalString(value.color) && isOptionalString(value.icon) && isOptionalString(value.parentId) && isOptionalFiniteNumber(value.x) && isOptionalFiniteNumber(value.y) && (value.fixed === void 0 || typeof value.fixed === "boolean");
}
function isLinkArray(value) {
  return Array.isArray(value) && value.every(isNetworkLink);
}
function isNetworkLink(value) {
  if (!isPlainRecord(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value.source) && isNonEmptyString(value.target) && isPlainRecord(value.metadata) && isOptionalString(value.type) && isOptionalString(value.label) && isOptionalFiniteNumber(value.weight);
}
function isGroupArray(value) {
  return Array.isArray(value) && value.every(isNetworkGroup);
}
function isNetworkGroup(value) {
  if (!isPlainRecord(value)) return false;
  return isNonEmptyString(value.id) && typeof value.label === "string" && isPlainRecord(value.metadata) && isOptionalString(value.color);
}
function isSubfolderRecord(value) {
  if (!isPlainRecord(value)) return false;
  return Object.values(value).every((subfolder) => {
    if (!isPlainRecord(subfolder)) return false;
    return typeof subfolder.parentId === "string" && isNodeArray(subfolder.nodes) && isLinkArray(subfolder.links);
  });
}
function isPlainRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
function isOptionalString(value) {
  return value === void 0 || typeof value === "string";
}
function isOptionalFiniteNumber(value) {
  return value === void 0 || typeof value === "number" && Number.isFinite(value);
}
function parseOptions(value) {
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed;
  return {
    nodeRadius: numberOption(record.nodeRadius, 25, 1),
    linkDistance: numberOption(record.linkDistance, 80),
    charge: numberOption(record.charge, -1500),
    friction: numberOption(record.friction, 0.75, 0),
    showControls: booleanOption(record.showControls, true),
    showSearch: booleanOption(record.showSearch, true),
    showFilters: booleanOption(record.showFilters, true),
    showLegend: booleanOption(record.showLegend, true),
    showLabels: booleanOption(record.showLabels, true),
    showArrows: booleanOption(record.showArrows, true),
    enableDrag: booleanOption(record.enableDrag, true),
    enableZoom: booleanOption(record.enableZoom, true),
    enablePan: booleanOption(record.enablePan, true),
    enableHover: booleanOption(record.enableHover, true)
  };
}
function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
function svgSize(svg, host) {
  const width = positiveFiniteNumber(host.clientWidth) ?? positiveFiniteNumber(svg.clientWidth) ?? DEFAULT_WIDTH;
  const height = positiveFiniteNumber(host.clientHeight) ?? positiveFiniteNumber(svg.clientHeight) ?? DEFAULT_HEIGHT;
  return { width: Math.max(1, width), height: Math.max(1, height) };
}
function fallbackPoint(index2, count, width, height) {
  const angle = Math.PI * 2 * index2 / Math.max(1, count);
  return {
    x: width / 2 + Math.cos(angle) * Math.min(width * 0.28, 220),
    y: height / 2 + Math.sin(angle) * Math.min(height * 0.25, 170)
  };
}
function svgElement(name, attrs) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== void 0) element.setAttribute(key, value);
  }
  return element;
}
function renderArrowDefs(arrowId) {
  const defs = svgElement("defs", {});
  const marker = svgElement("marker", {
    id: arrowId,
    viewBox: "0 -5 10 10",
    refX: "10",
    refY: "0",
    markerWidth: "5",
    markerHeight: "5",
    orient: "auto"
  });
  marker.append(svgElement("path", { d: "M0,-5L10,0L0,5", class: "network-arrow", fill: "currentColor" }));
  defs.append(marker);
  return defs;
}
function numberOption(value, fallback, min2) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : fallback;
  const finite = Number.isFinite(parsed) ? parsed : fallback;
  return min2 === void 0 ? finite : Math.max(min2, finite);
}
function booleanOption(value, fallback) {
  if (value === void 0 || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") return false;
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
  return fallback;
}
function clamp(value, min2, max2) {
  return Math.max(min2, Math.min(max2, value));
}
function finiteCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : void 0;
}
function positiveFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : void 0;
}
function classNames(...tokens) {
  return tokens.filter(Boolean).join(" ");
}
function setClassTokens(element, tokens) {
  element.setAttribute("class", tokens.filter(Boolean).join(" "));
}
function addClassToken(element, token) {
  const tokens = new Set((element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean));
  tokens.add(token);
  element.setAttribute("class", Array.from(tokens).join(" "));
}
function removeClassToken(element, token) {
  const tokens = (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).filter((item) => item !== token);
  element.setAttribute("class", tokens.join(" "));
}
function trim(value) {
  return Number(value.toFixed(3)).toString();
}
function safeId(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-") || "root";
}
function safeClassToken(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "typed";
}
function cssAttrValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
var SAFE_SVG_PAINT = /^(?:#(?:[\da-f]{3}|[\da-f]{6})|[a-zA-Z]+|var\(\s*--[a-zA-Z0-9_-]+\s*\)|rgba?\([^)]+\)|hsla?\([^)]+\))$/i;
var UNSAFE_CSS_VALUE = /javascript:|vbscript:|expression\s*\(|url\s*\(/i;
function safeSvgPaint(value) {
  const color2 = value?.trim();
  if (!color2 || UNSAFE_CSS_VALUE.test(color2)) return void 0;
  return SAFE_SVG_PAINT.test(color2) ? color2 : void 0;
}
function safeCssValue(value) {
  const text = value.trim();
  return text && !UNSAFE_CSS_VALUE.test(text) ? text : void 0;
}

// packages/viewer/src/renderer/network/data.ts
function toNetworkPlainValue(value) {
  if (isXconObject2(value)) {
    const result = {};
    value.forEach((child, key) => {
      result[key] = toNetworkPlainValue(child);
    });
    return result;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toNetworkPlainValue(item));
  }
  if (isPlainRecord2(value)) {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = toNetworkPlainValue(child);
    }
    return result;
  }
  return value;
}
function normalizeNetworkGraph(input) {
  const component = asRecord(toNetworkPlainValue(input)) ?? {};
  const data = asRecord(component.data);
  if (data && asRecord(data.list)) {
    return normalizeFullVersionData(data, stringValue(component.rootNodeId));
  }
  const rawNodes = arrayValue(component.nodes);
  if (rawNodes.length === 0) {
    const root2 = normalizeNode({ id: "root", label: "Root", isRoot: true }, 0, "root");
    return {
      nodes: [root2],
      links: [],
      groups: [],
      rootNodeId: "root",
      subfolders: {}
    };
  }
  const explicitRootNodeId = stringValue(component.rootNodeId);
  const rootNodeId = explicitRootNodeId ?? firstNodeId(rawNodes);
  const nodes = rawNodes.map((item, index2) => normalizeNode(item, index2, rootNodeId));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const linksSource = component.links !== void 0 ? component.links : component.edges;
  const linkDrafts = arrayValue(linksSource).flatMap((item) => normalizeLinkDraft(item)).filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target));
  return {
    nodes,
    links: finalizeLinkIds(linkDrafts),
    groups: collectGroups(nodes),
    rootNodeId,
    subfolders: {}
  };
}
function normalizeFullVersionData(data, explicitRootNodeId) {
  const names = asRecord(data.names) ?? {};
  const infos = asRecord(data.infos) ?? {};
  const list = asRecord(data.list) ?? {};
  const rootNodeId = explicitRootNodeId ?? fullVersionRootNodeId(data);
  const ids = fullVersionNodeIds(data, rootNodeId);
  if (ids.length === 0) {
    const root2 = normalizeNode({ id: "root", label: "Root", isRoot: true }, 0, "root");
    return {
      nodes: [root2],
      links: [],
      groups: [],
      rootNodeId: "root",
      subfolders: normalizeSubfolders(data.subfolders)
    };
  }
  const nodes = ids.map((id2, index2) => {
    const metadata = asRecord(infos[id2]) ?? {};
    const rawLabel = stringValue(names[id2]) ?? id2;
    return normalizeNode(
      {
        id: id2,
        label: stripRootPrefix(rawLabel),
        type: fullVersionNodeType(id2),
        color: stringValue(metadata.color),
        icon: stringValue(metadata.icon),
        metadata
      },
      index2,
      rootNodeId
    );
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const linkDrafts = [];
  for (const [source, targets] of Object.entries(list)) {
    if (!nodeIds.has(source)) continue;
    for (const target of arrayValue(targets)) {
      const targetId = stringValue(target);
      if (!targetId || targetId === source || !nodeIds.has(targetId)) continue;
      linkDrafts.push({
        source,
        target: targetId,
        type: void 0,
        label: void 0,
        weight: void 0,
        metadata: {}
      });
    }
  }
  return {
    nodes,
    links: finalizeLinkIds(linkDrafts),
    groups: collectGroups(nodes),
    rootNodeId,
    subfolders: normalizeSubfolders(data.subfolders)
  };
}
function normalizeSubfolders(value) {
  const rawSubfolders = asRecord(value);
  if (!rawSubfolders) return {};
  const subfolders = {};
  for (const [parentId, rawSubfolder] of Object.entries(rawSubfolders)) {
    const subfolder = asRecord(rawSubfolder) ?? {};
    const names = {
      ...asRecord(subfolder.names) ?? {},
      ...asRecord(subfolder.objects) ?? {}
    };
    const infos = asRecord(subfolder.infos) ?? {};
    const list = asRecord(subfolder.lists) ?? asRecord(subfolder.list) ?? {};
    const nodeIds = uniqueStrings([...Object.keys(list), ...Object.keys(names), ...Object.keys(infos)]);
    const nodes = nodeIds.map((id2, index2) => {
      const metadata = asRecord(infos[id2]) ?? {};
      const rawLabel = stringValue(names[id2]) ?? id2;
      return normalizeNode(
        {
          id: id2,
          label: stripRootPrefix(rawLabel),
          type: fullVersionNodeType(id2),
          color: stringValue(metadata.color),
          icon: stringValue(metadata.icon),
          metadata,
          parentId,
          isRoot: false
        },
        index2,
        void 0
      );
    });
    const validNodeIds = new Set(nodes.map((node) => node.id));
    const adjacencyLinkDrafts = [];
    const adjacencyPairs = /* @__PURE__ */ new Set();
    for (const [source, targets] of Object.entries(list)) {
      if (!validNodeIds.has(source)) continue;
      for (const target of arrayValue(targets)) {
        const targetId = stringValue(target);
        if (!targetId || targetId === source || !validNodeIds.has(targetId)) continue;
        adjacencyPairs.add(linkPairKey(source, targetId));
        adjacencyLinkDrafts.push({
          source,
          target: targetId,
          type: "folder",
          label: void 0,
          weight: void 0,
          metadata: {}
        });
      }
    }
    const parentLinkDrafts = nodes.filter((node) => !adjacencyPairs.has(linkPairKey(parentId, node.id))).map((node) => ({
      source: parentId,
      target: node.id,
      type: "folder",
      label: void 0,
      weight: void 0,
      metadata: {}
    }));
    const links = finalizeLinkIds([...parentLinkDrafts, ...adjacencyLinkDrafts]);
    subfolders[parentId] = { parentId, nodes, links };
  }
  return subfolders;
}
function normalizeNode(item, index2, rootNodeId) {
  const record = asRecord(item) ?? {};
  const id2 = stringValue(record.id) ?? String(index2);
  const metadata = asRecord(record.metadata) ?? {};
  return {
    id: id2,
    label: stringValue(record.label) ?? stringValue(record.name) ?? stringValue(record.title) ?? id2,
    type: stringValue(record.type),
    group: stringValue(record.group),
    color: stringValue(record.color),
    icon: stringValue(record.icon),
    metadata,
    x: numberValue(record.x),
    y: numberValue(record.y),
    fixed: booleanValue(record.fixed),
    parentId: stringValue(record.parentId),
    isRoot: booleanValue(record.isRoot) ?? (rootNodeId ? id2 === rootNodeId : index2 === 0)
  };
}
function normalizeLinkDraft(item) {
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
      metadata: asRecord(record.metadata) ?? {}
    }
  ];
}
function finalizeLinkIds(links) {
  const idCounts = /* @__PURE__ */ new Map();
  return links.map((link) => ({
    ...link,
    id: uniqueLinkId(link.id ?? `${link.source}->${link.target}`, idCounts)
  }));
}
function uniqueLinkId(baseId, idCounts) {
  const count = (idCounts.get(baseId) ?? 0) + 1;
  idCounts.set(baseId, count);
  return count === 1 ? baseId : `${baseId}#${count}`;
}
function collectGroups(nodes) {
  const groups = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    if (!node.group || groups.has(node.group)) continue;
    groups.set(node.group, {
      id: node.group,
      label: node.group,
      color: void 0,
      metadata: {}
    });
  }
  return [...groups.values()];
}
function fullVersionRootNodeId(data) {
  const names = asRecord(data.names) ?? {};
  for (const [id2, name] of Object.entries(names)) {
    if (stringValue(name)?.startsWith("ROOT:")) return id2;
  }
  return Object.keys(asRecord(data.list) ?? {})[0];
}
function fullVersionNodeIds(data, rootNodeId) {
  const list = asRecord(data.list) ?? {};
  const names = asRecord(data.names) ?? {};
  const infos = asRecord(data.infos) ?? {};
  const ids = [];
  addId(ids, rootNodeId);
  for (const [source, targets] of Object.entries(list)) {
    addId(ids, source);
    for (const target of arrayValue(targets)) {
      addId(ids, target);
    }
  }
  for (const id2 of Object.keys(names)) addId(ids, id2);
  for (const id2 of Object.keys(infos)) addId(ids, id2);
  return uniqueStrings(ids);
}
function addId(ids, value) {
  const id2 = stringValue(value);
  if (id2) ids.push(id2);
}
function firstNodeId(nodes) {
  if (nodes.length === 0) return void 0;
  const first = asRecord(nodes[0]);
  return first ? stringValue(first.id) ?? "0" : "0";
}
function fullVersionNodeType(id2) {
  return id2.startsWith("A") ? "folder" : "node";
}
function stripRootPrefix(value) {
  return value.startsWith("ROOT:") ? value.slice(5) : value;
}
function uniqueStrings(values) {
  return [...new Set(values)];
}
function linkPairKey(source, target) {
  return `${source}\0${target}`;
}
function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}
function asRecord(value) {
  return isPlainRecord2(value) ? value : void 0;
}
function isPlainRecord2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || isXconObject2(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function stringValue(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? void 0 : trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return void 0;
}
function numberValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : void 0;
  if (typeof value !== "string" || value.trim() === "") return void 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function booleanValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return void 0;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return void 0;
}

// packages/viewer/src/renderer/network/theme.ts
var COLOR_KEYS = [
  "backgroundColor",
  "nodeColor",
  "linkColor",
  "refLinkColor",
  "primaryColor",
  "accentColor",
  "textColor",
  "selectedColor",
  "neighborColor",
  "panelBackground"
];
var OBSIDIAN_THEME = {
  name: "obsidian",
  backgroundColor: "#11131a",
  nodeColor: "#8b5cf6",
  linkColor: "#455066",
  refLinkColor: "#64748b",
  primaryColor: "#8b5cf6",
  accentColor: "#60a5fa",
  textColor: "#d8dee9",
  selectedColor: "#f8fafc",
  neighborColor: "#60a5fa",
  mutedOpacity: 0.18,
  panelBackground: "#1b2030",
  clusterColors: ["#60a5fa", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#14b8a6"]
};
var LIGHT_THEME = {
  name: "light",
  backgroundColor: "#f8fafc",
  nodeColor: "#2563eb",
  linkColor: "#cbd5e1",
  refLinkColor: "#94a3b8",
  primaryColor: "#2563eb",
  accentColor: "#db2777",
  textColor: "#0f172a",
  selectedColor: "#111827",
  neighborColor: "#2563eb",
  mutedOpacity: 0.22,
  panelBackground: "#ffffff",
  clusterColors: ["#2563eb", "#14b8a6", "#8b5cf6", "#f97316", "#10b981", "#db2777"]
};
var HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
var COLOR_NAME = /^[a-zA-Z]+$/;
var CSS_VAR = /^var\(\s*--[a-zA-Z0-9_-]+\s*\)$/;
var UNSAFE_CSS_VALUE2 = /javascript:|vbscript:|expression\s*\(|url\s*\(/i;
function resolveNetworkTheme(input) {
  const requestedTheme = themeNameValue(input.theme);
  let theme;
  if (requestedTheme === "light") {
    theme = copyTheme(LIGHT_THEME);
  } else if (requestedTheme === "auto") {
    theme = copyTheme(shouldUseLightTheme(input.backgroundColor) ? LIGHT_THEME : OBSIDIAN_THEME);
  } else if (requestedTheme === "custom") {
    theme = {
      ...copyTheme(OBSIDIAN_THEME),
      name: "custom"
    };
  } else {
    theme = copyTheme(OBSIDIAN_THEME);
  }
  return applyThemeOverrides(theme, input);
}
function networkThemeStyle(theme) {
  const clusterColors = theme.clusterColors.map((color2) => safeStyleColor(color2)).filter(Boolean);
  return [
    `--xcon-network-bg:${safeStyleColor(theme.backgroundColor)}`,
    `--xcon-network-node:${safeStyleColor(theme.nodeColor)}`,
    `--xcon-network-link:${safeStyleColor(theme.linkColor)}`,
    `--xcon-network-ref-link:${safeStyleColor(theme.refLinkColor)}`,
    `--xcon-network-primary:${safeStyleColor(theme.primaryColor)}`,
    `--xcon-network-accent:${safeStyleColor(theme.accentColor)}`,
    `--xcon-network-text:${safeStyleColor(theme.textColor)}`,
    `--xcon-network-selected:${safeStyleColor(theme.selectedColor)}`,
    `--xcon-network-neighbor:${safeStyleColor(theme.neighborColor)}`,
    `--xcon-network-muted-opacity:${clampOpacity(theme.mutedOpacity)}`,
    `--xcon-network-panel:${safeStyleColor(theme.panelBackground)}`,
    `--xcon-network-cluster-colors:${clusterColors.join(",")}`
  ].join(";");
}
function applyThemeOverrides(theme, input) {
  for (const key of COLOR_KEYS) {
    const value = safeColorValue(input[key]);
    if (value) theme[key] = value;
  }
  const clusterColors = clusterColorsValue(input.clusterColors);
  if (clusterColors.length > 0) theme.clusterColors = clusterColors;
  const mutedOpacity = numberValue2(input.mutedOpacity);
  if (mutedOpacity !== void 0) theme.mutedOpacity = clampOpacity(mutedOpacity);
  return theme;
}
function copyTheme(theme) {
  return {
    ...theme,
    clusterColors: [...theme.clusterColors]
  };
}
function themeNameValue(value) {
  const name = stringValue2(value)?.toLowerCase();
  if (name === "obsidian" || name === "light" || name === "auto" || name === "custom") return name;
  return void 0;
}
function shouldUseLightTheme(backgroundColor) {
  const color2 = safeColorValue(backgroundColor);
  if (!color2 || !HEX_COLOR.test(color2)) return false;
  const { r, g, b } = hexToRgb(color2);
  return relativeLuminance(r, g, b) > 0.5;
}
function safeStyleColor(value) {
  return safeColorValue(value) ?? "";
}
function safeColorValue(value) {
  const color2 = stringValue2(value);
  if (!color2 || UNSAFE_CSS_VALUE2.test(color2)) return void 0;
  if (HEX_COLOR.test(color2) || COLOR_NAME.test(color2) || CSS_VAR.test(color2)) return color2;
  return void 0;
}
function clusterColorsValue(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const color2 = safeColorValue(item);
    return color2 ? [color2] : [];
  });
}
function stringValue2(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed === "" ? void 0 : trimmed;
}
function numberValue2(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : void 0;
  if (typeof value !== "string" || value.trim() === "") return void 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : void 0;
}
function clampOpacity(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
function hexToRgb(hexColor) {
  const hex2 = hexColor.slice(1);
  if (hex2.length === 3) {
    return {
      r: Number.parseInt(hex2[0] + hex2[0], 16),
      g: Number.parseInt(hex2[1] + hex2[1], 16),
      b: Number.parseInt(hex2[2] + hex2[2], 16)
    };
  }
  return {
    r: Number.parseInt(hex2.slice(0, 2), 16),
    g: Number.parseInt(hex2.slice(2, 4), 16),
    b: Number.parseInt(hex2.slice(4, 6), 16)
  };
}
function relativeLuminance(red, green, blue) {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// packages/viewer/src/renderer/network/static.ts
function renderNetworkStatic(input) {
  const plainComponent = toNetworkPlainValue(input.component);
  const component = asRecord2(plainComponent) ?? {};
  const graph = normalizeNetworkGraph(plainComponent);
  const theme = resolveNetworkTheme(component);
  const key = sanitizeKey(input.key);
  const options = networkOptions(component);
  const containerAttrs = {
    id: `network-container-${key}`,
    class: "xa-network-diagram-container",
    style: `position:relative;width:100%;height:100%;background:var(--xcon-network-bg);${networkThemeStyle(theme)}`,
    "data-key": key,
    "data-xcon-network": "true",
    "data-xcon-network-bound": "false",
    "data-xcon-network-theme": theme.name,
    "data-xcon-network-model": jsonAttribute(graph),
    "data-xcon-network-options": jsonAttribute(options)
  };
  const container = tag(
    "div",
    containerAttrs,
    tag("div", { class: "xa-network-toolbar", "data-xcon-network-toolbar": "true" }, "") + tag(
      "svg",
      { id: `network-diagram-${key}`, class: "network-svg", style: "width:100%;height:100%;", viewBox: "0 0 800 600", role: "img" },
      renderStaticSvg(graph, key, options, theme)
    ) + tag("div", { class: "network-tooltip", "data-xcon-network-tooltip": "true" }, "")
  );
  return tag(
    "div",
    input.attrs,
    container
  );
}
function renderStaticSvg(graph, key, options, theme) {
  const positions = fallbackPositions(graph.nodes);
  const defs = options.showArrows ? tag(
    "defs",
    {},
    tag("marker", { id: `arrow-${key}`, viewBox: "0 -5 10 10", refX: "10", refY: "0", markerWidth: "5", markerHeight: "5", orient: "auto" }, tag("path", { d: "M0,-5L10,0L0,5", class: "network-arrow", fill: theme.linkColor }, "")) + tag("marker", { id: `ref-arrow-${key}`, viewBox: "0 -5 10 10", refX: "10", refY: "0", markerWidth: "5", markerHeight: "5", orient: "auto" }, tag("path", { d: "M0,-5L10,0L0,5", class: "network-arrow ref-arrow", fill: theme.refLinkColor }, ""))
  ) : "";
  const links = graph.links.map((link) => {
    const source = positions.get(link.source);
    const target = positions.get(link.target);
    if (!source || !target) return "";
    const isRef = isReferenceLink2(link.type);
    return tag(
      "line",
      {
        class: `network-link${isRef ? " ref-link" : ""}`,
        x1: String(source.x),
        y1: String(source.y),
        x2: String(target.x),
        y2: String(target.y),
        stroke: isRef ? theme.refLinkColor : theme.linkColor,
        "marker-end": options.showArrows ? `url(#${isRef ? "ref-arrow" : "arrow"}-${key})` : void 0
      },
      ""
    );
  }).join("");
  const nodes = graph.nodes.map((node, index2) => {
    const point = positions.get(node.id) ?? { x: 400, y: 300 };
    const isRoot = node.isRoot || index2 === 0;
    const nodeFill2 = safeSvgPaint2(node.color) ?? (isRoot ? theme.primaryColor : theme.nodeColor);
    return tag(
      "g",
      { class: `network-node-group${isRoot ? " root-node" : ""}`, "data-node-id": node.id },
      tag("circle", { class: `network-node${isRoot ? " root-node" : ""}`, cx: String(point.x), cy: String(point.y), r: String(options.nodeRadius), fill: nodeFill2 }, "") + (options.showLabels ? tag("text", { class: `network-label${isRoot ? " root-label" : ""}`, x: String(point.x), y: String(point.y + options.nodeRadius + 19), "text-anchor": "middle", fill: theme.textColor }, escapeHtml(node.label)) : "")
    );
  }).join("");
  return defs + links + nodes;
}
function fallbackPositions(nodes) {
  const items = nodes.length ? nodes : [{ id: "root", label: "Root", metadata: {}, isRoot: true }];
  return new Map(
    items.map((node, index2) => {
      const angle = Math.PI * 2 * index2 / Math.max(1, items.length);
      return [node.id, { x: node.x ?? 400 + Math.cos(angle) * 190, y: node.y ?? 300 + Math.sin(angle) * 150 }];
    })
  );
}
function networkOptions(component) {
  return {
    nodeRadius: numberOption2(component.nodeRadius, 25, 1),
    linkDistance: numberOption2(component.linkDistance, 80),
    charge: numberOption2(component.charge, -1500),
    friction: numberOption2(component.friction, 0.75),
    gravity: numberOption2(component.gravity, 0.08),
    showLabels: booleanOption2(component.showLabels, true),
    showArrows: booleanOption2(component.showArrows, true),
    showControls: booleanOption2(component.showControls, true),
    showSearch: booleanOption2(component.showSearch, true),
    showFilters: booleanOption2(component.showFilters, true),
    showLegend: booleanOption2(component.showLegend, true),
    enableDrag: booleanOption2(component.enableDrag, true),
    enableZoom: booleanOption2(component.enableZoom, true),
    enablePan: booleanOption2(component.enablePan, true),
    enableHover: booleanOption2(component.enableHover, true)
  };
}
function numberOption2(value, fallback, min2) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : fallback;
  const finite = Number.isFinite(parsed) ? parsed : fallback;
  return min2 === void 0 ? finite : Math.max(min2, finite);
}
function booleanOption2(value, fallback) {
  if (value === void 0 || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") return false;
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
  return fallback;
}
function isReferenceLink2(type2) {
  const normalized = type2?.toLowerCase();
  return normalized === "folder" || normalized === "ref";
}
function jsonAttribute(value) {
  return JSON.stringify(value);
}
function sanitizeKey(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-") || "root";
}
function asRecord2(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
var SAFE_SVG_PAINT2 = /^(?:#(?:[\da-f]{3}|[\da-f]{6})|[a-zA-Z]+|var\(\s*--[a-zA-Z0-9_-]+\s*\)|rgba?\([^)]+\)|hsla?\([^)]+\))$/i;
var UNSAFE_SVG_PAINT = /javascript:|vbscript:|expression\s*\(|url\s*\(/i;
function safeSvgPaint2(value) {
  const color2 = value?.trim();
  if (!color2 || UNSAFE_SVG_PAINT.test(color2)) return void 0;
  return SAFE_SVG_PAINT2.test(color2) ? color2 : void 0;
}
function tag(name, attrs, body) {
  return `<${name}${renderAttrs(attrs)}>${body}</${name}>`;
}
function renderAttrs(attrs) {
  return Object.entries(attrs).filter(([, value]) => value !== void 0 && value !== null).map(([name, value]) => value === "" && name !== "value" ? ` ${name}` : ` ${name}="${escapeAttr(String(value))}"`).join("");
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

// packages/viewer/src/renderer/index.ts
var defaultOptions = {
  allowExternalResources: false,
  allowHtml: false,
  maxDepth: 64,
  maxNodes: 1e4
};
var leafletCssUrl = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
var leafletJsUrl = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
var openStreetMapTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
var openStreetMapAttribution = "(C) OpenStreetMap contributors";
var bannerStates = /* @__PURE__ */ new WeakMap();
var extCarouselStates = /* @__PURE__ */ new WeakMap();
var shapeImageAnimationStates = /* @__PURE__ */ new WeakMap();
var bannerTransition = "transform .42s cubic-bezier(.22,1,.36,1)";
var customSelectDocumentBound = false;
var leafletRuntimePromise;
var allowedCssProperties = /* @__PURE__ */ new Set([
  "align-items",
  "align-self",
  "background",
  "background-color",
  "border",
  "border-color",
  "border-radius",
  "border-style",
  "border-width",
  "box-sizing",
  "box-shadow",
  "color",
  "display",
  "flex",
  "flex-direction",
  "flex-wrap",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "gap",
  "grid-template-columns",
  "height",
  "justify-content",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "object-fit",
  "object-position",
  "opacity",
  "overflow",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "text-decoration",
  "vertical-align",
  "white-space",
  "width"
]);
var activeCssPattern = /expression\s*\(|javascript:|vbscript:|url\s*\(|behavior\s*:/i;
var themeTokenAliasPattern = /(^|[\s,(])@([A-Za-z_][\w-]*)(?=$|[\s,),])/g;
var viewerCss = `
:root,[data-xcon-theme="light"] {
  color-scheme:light;
  --bg:#F7F4EF;--bg2:#EFEBE3;--surface:#FDFCFA;--surface2:#F2EDE5;
  --border:rgba(60,45,25,.1);--border2:rgba(60,45,25,.18);
  --ink:#1C1710;--ink-2:#6B5F4E;--ink-3:#A8998A;
  --accent:#C4622D;--accent-2:#9A4A1F;--accent-lt:#F0D5C4;--accent-dk:#9A4A1F;--accent-hover:#9A4A1F;--accent-rgb:196,98,45;--accent-gradient-end:#E88B5A;
  --green:#2D7D4F;--green-lt:#D1EAD9;--red:#C03A2B;--red-lt:#FAD7D3;--blue:#2B5FA0;--blue-lt:#D1DFF5;--yellow:#B07D12;--yellow-lt:#FAF0C0;
  --r-sm:6px;--r-lg:16px;
  --shadow:0 4px 16px rgba(60,45,25,.1),0 2px 6px rgba(60,45,25,.06);--shadow-sm:0 1px 4px rgba(60,45,25,.08);--shadow-md:0 4px 16px rgba(60,45,25,.1),0 2px 6px rgba(60,45,25,.06);--shadow-lg:0 12px 40px rgba(60,45,25,.14),0 4px 12px rgba(60,45,25,.08);--shadow-card:0 12px 40px rgba(60,45,25,.12);--shadow-pill:0 1px 6px rgba(60,45,25,.12);
  --font-body:"Plus Jakarta Sans",Inter,system-ui,sans-serif;
}
html[data-theme="dark"],[data-xcon-theme="dark"] {
  color-scheme:dark;
  --bg:#0C0C0F;--bg2:#121218;--surface:#16161A;--surface2:#1E1E24;
  --border:rgba(255,255,255,.055);--border2:rgba(255,255,255,.1);
  --ink:#F0EEF8;--ink-2:#8B88A0;--ink-3:#5A5770;
  --accent:#7C6AF7;--accent-2:#A594FF;--accent-lt:rgba(124,106,247,.18);--accent-dk:#C4B8FF;--accent-hover:#A594FF;--accent-rgb:124,106,247;--accent-gradient-end:#A594FF;
  --green:#34D399;--green-lt:rgba(52,211,153,.12);--red:#F87171;--red-lt:rgba(248,113,113,.12);--blue:#60A5FA;--blue-lt:rgba(96,165,250,.12);--yellow:#FBBF24;--yellow-lt:rgba(251,191,36,.12);
  --shadow:0 4px 24px rgba(0,0,0,.4);--shadow-sm:0 1px 4px rgba(0,0,0,.35);--shadow-md:0 4px 24px rgba(0,0,0,.4);--shadow-lg:0 12px 48px rgba(0,0,0,.55);--shadow-card:0 12px 40px rgba(0,0,0,.5);--shadow-pill:0 1px 6px rgba(0,0,0,.3);
}
[data-xcon-type],[data-xcon-type]::before,[data-xcon-type]::after{box-sizing:border-box}
.xa-al-form-root{position:relative;display:flex;flex-direction:column;width:100%;min-height:100%;overflow:hidden;color:var(--ink);font-family:var(--font-body)}
.xa-al-form__header{height:52px;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--border);font-weight:700;box-sizing:border-box;background:var(--surface)}
.xa-al-close{appearance:none;border:0;background:transparent;color:var(--ink-3);font-size:22px;line-height:1;cursor:pointer;padding:4px 0}
.xa-form-hidden-scrollbar{-ms-overflow-style:none;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}
.xa-form-hidden-scrollbar::-webkit-scrollbar{display:none;width:0;height:0;background:transparent}
.xa-al-form__body{display:flex;flex-direction:column;width:100%;min-width:0;min-height:0;box-sizing:border-box;overflow:auto;scrollbar-width:none}
.xa-al-form__body::-webkit-scrollbar{display:none}
.xa-al-form__stack{display:flex;width:100%;min-width:0;box-sizing:border-box}
.xa-al-panel-root{min-width:0;display:flex;flex-direction:column;box-sizing:border-box}
.xa-al-panel__body{display:flex;flex-direction:column;width:100%;min-width:0;box-sizing:border-box}
.xa-al-panel__stack{display:flex;width:100%;min-width:0;box-sizing:border-box}
.xa-panel-hidden-scrollbar,.xa-panel-hidden-scrollbar .xa-al-panel__body{-ms-overflow-style:none;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}
.xa-panel-hidden-scrollbar::-webkit-scrollbar,.xa-panel-hidden-scrollbar .xa-al-panel__body::-webkit-scrollbar{display:none;width:0;height:0;background:transparent}
.xa-al-panel__stack--layers{display:grid!important;grid-template-columns:1fr;grid-template-rows:1fr;align-items:stretch;justify-items:stretch}
.xa-al-panel__layer{position:relative;min-width:0}
.xa-al-label{display:flex!important;flex-direction:column;align-items:stretch;justify-content:flex-start;min-width:0;box-sizing:border-box}
.xa-al-label__text{display:flex;align-items:center;min-width:0;width:100%;gap:5px;box-sizing:border-box}
.xa-al-label__value{min-width:0}
.xa-al-label__dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:0 0 auto}
.xa-al-label__suffix{margin-left:3px;flex:0 0 auto}
.xa-al-label__icon{display:block;flex:0 0 auto;width:1em;height:1em}
.xa-al-label__editorial-row{display:flex;align-items:center;gap:12px;width:100%;min-width:0}
.xa-al-label__editorial-row .xa-al-label__text{flex:1 1 auto}
.xa-al-label__editorial-bar{flex:0 0 28px;width:28px;height:2px;background:var(--accent)}
.xa-al-label__hint{font-size:11px;color:var(--ink-3,#888);margin-top:4px;line-height:1.45}
button.xa-al-btn{appearance:none;-webkit-appearance:none;display:inline-flex!important;align-items:center;justify-content:center;gap:8px;margin:0;box-sizing:border-box;font:inherit;line-height:1.2;white-space:nowrap;min-width:0;flex-shrink:1;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:filter .15s ease,box-shadow .15s ease,opacity .15s ease}
button.xa-al-btn:not(:disabled):not(.xa-al-btn--loading):not(.xa-al-btn--link):hover{filter:brightness(1.04)}
button.xa-al-btn:not(:disabled):not(.xa-al-btn--loading):not(.xa-al-btn--link):active{filter:brightness(.96)}
.xa-al-btn--disabled,button.xa-al-btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none!important}
.xa-al-btn--loading{opacity:.88;pointer-events:none}
.xa-al-btn--block{width:100%;justify-content:center}
.xa-al-btn--link{background:transparent!important;border-color:transparent!important;box-shadow:none!important;color:var(--accent)!important;padding-inline:8px!important}
.xa-al-btn--link:hover{filter:none!important;opacity:.9;text-decoration:underline}
.xa-al-btn__label{display:block;max-width:100%;text-align:center}
.xa-al-btn__icon{display:block;flex-shrink:0;width:1.1em;height:1.1em}
.xa-al-btn--stack-col .xa-al-btn__icon{width:22px;height:22px}
.xa-al-btn--icon-only .xa-al-btn__icon{width:18px;height:18px}
.xa-al-btn__label--empty{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
.xa-al-btn__img{display:block;flex-shrink:0;max-height:1.25em;width:auto}
@keyframes xa-al-btn-spin{to{transform:rotate(360deg)}}
.xa-al-btn__spinner{width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;display:inline-block;flex-shrink:0;animation:xa-al-btn-spin .65s linear infinite;opacity:.9}
.xa-al-btn--seg-first{border-radius:var(--r-sm) 0 0 var(--r-sm)!important;border-right-width:0!important}
.xa-al-btn--seg-mid{border-radius:0!important;border-right-width:0!important}
.xa-al-btn--seg-last{border-radius:0 var(--r-sm) var(--r-sm) 0!important}
.xa-al-btn--split-main{border-radius:var(--r-sm) 0 0 var(--r-sm)!important;border-right:none!important}
.xa-al-btn--split-caret{border-radius:0 var(--r-sm) var(--r-sm) 0!important;border-left:1px solid rgba(255,255,255,.38)!important;min-width:40px!important;padding-inline:10px!important}
.xa-al-tf-root,.xa-al-tv-root{width:100%;min-width:0;display:block;box-sizing:border-box}
.xa-al-tf-root--disabled{pointer-events:none}
input.xa-al-tf,textarea.xa-al-tf{width:100%;height:100%;min-height:0;margin:0;box-sizing:border-box;border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2));border-radius:var(--xa-tf-radius,var(--r-sm));background:var(--xa-tf-bg,var(--surface));color:var(--ink);font-family:var(--font-body);font-size:14px;outline:none;padding:10px 14px;transition:border-color .2s,box-shadow .2s,background .2s;box-shadow:var(--shadow-sm)}
input.xa-al-tf::placeholder,textarea.xa-al-tf::placeholder{color:var(--ink-3)}
input.xa-al-tf:focus,textarea.xa-al-tf:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb),.14),var(--shadow-sm)}
input.xa-al-tf:disabled,textarea.xa-al-tf:disabled{background:var(--bg2);color:var(--ink-3);cursor:not-allowed}
input.xa-al-tf--success{border-color:var(--green)!important;box-shadow:0 0 0 3px rgba(45,125,79,.12),var(--shadow-sm)!important}
input.xa-al-tf--error{border-color:var(--red)!important;box-shadow:0 0 0 3px rgba(192,58,43,.12),var(--shadow-sm)!important}
input.xa-al-tf--success:focus{border-color:var(--green)!important;box-shadow:0 0 0 3px rgba(45,125,79,.14),var(--shadow-sm)!important}
input.xa-al-tf--error:focus{border-color:var(--red)!important;box-shadow:0 0 0 3px rgba(192,58,43,.14),var(--shadow-sm)!important}
textarea.xa-al-tf-multiline{resize:vertical;min-height:80px;line-height:1.5;overflow:auto}
.xa-al-tv-root--html .xa-al-tv-html-chrome{border:none;padding:0;margin:0;background:transparent}
.xa-al-tv-static{min-width:0}
.xa-al-tv-static .tv-article{font-size:15px;line-height:1.8;color:var(--ink-2);max-width:560px}
.xa-al-tv-static .tv-article .tv-lead{font-family:"Playfair Display",serif;font-size:20px;line-height:1.5;color:var(--ink);font-weight:400;margin-bottom:16px}
.xa-al-tv-static .tv-article p{margin-bottom:12px}.xa-al-tv-static .tv-article strong{color:var(--ink);font-weight:600}.xa-al-tv-static .tv-article em{font-style:italic;color:var(--accent-dk)}.xa-al-tv-static .tv-article a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}.xa-al-tv-static .tv-article a:hover{color:var(--accent-dk)}
.xa-al-tv-static .tv-quote{border-left:3px solid var(--accent);padding:4px 0 4px 20px;margin:14px 0}.xa-al-tv-static .tv-quote p{font-family:"Playfair Display",serif;font-size:18px;font-style:italic;color:var(--ink);line-height:1.5;margin:0}.xa-al-tv-static .tv-quote cite{display:block;font-size:11px;color:var(--ink-3);margin-top:6px;font-style:normal;letter-spacing:1px;text-transform:uppercase}
.xa-al-tv-static .tv-code{background:var(--ink);color:#e2dfda;font-family:"JetBrains Mono",monospace;font-size:12px;padding:16px 18px;border-radius:var(--r);line-height:1.7;overflow-x:auto;position:relative}.xa-al-tv-static .tv-code__lang{position:absolute;top:10px;right:14px;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.3)}.xa-al-tv-static .tv-code .kw{color:#c78cf0}.xa-al-tv-static .tv-code .str{color:#98d484}.xa-al-tv-static .tv-code .fn{color:#69c6f7}.xa-al-tv-static .tv-code .num{color:#f0a96e}.xa-al-tv-static .tv-code .cmt{color:rgba(255,255,255,.3);font-style:italic}
.xa-al-tv-static .tv-truncate{font-size:13px;color:var(--ink-2);line-height:1.7}.xa-al-tv-static .tv-truncate.collapsed{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.xa-al-tv-static .tv-read-more{background:none;border:none;color:var(--accent);font-size:12px;font-weight:600;cursor:pointer;padding:6px 0 0;font-family:var(--font-body)}
.xa-al-tv-static .tv-highlight{background:rgba(var(--accent-rgb),.12);padding:1px 4px;border-radius:3px;color:var(--accent-dk)}
.xa-al-tv-static .tv-list{padding-left:0;list-style:none;display:flex;flex-direction:column;gap:6px}.xa-al-tv-static .tv-list li{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--ink-2)}.xa-al-tv-static .tv-list li::before{content:"\u2192";color:var(--accent);flex-shrink:0;font-weight:700}
.xa-al-vv-root{min-width:0}.xa-al-vv-root .vv-showcase{display:flex;flex-direction:column;gap:20px}.xa-al-vv-root .video-player{position:relative;background:#000;border-radius:var(--r);overflow:hidden;aspect-ratio:16/9;width:100%;box-shadow:var(--shadow-lg)}.xa-al-vv-root .video-player video{width:100%;height:100%;display:block}.xa-al-vv-root .video-player__poster{position:absolute;inset:0;background:linear-gradient(135deg,#1c1710 0%,#3a2d1a 100%);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;cursor:pointer}.xa-al-vv-root .video-player__poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5}.xa-al-vv-root .video-player__poster-inner{position:relative;z-index:1;text-align:center}.xa-al-vv-root .video-player__play-btn{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.5);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;cursor:pointer;transition:background .2s,transform .15s}.xa-al-vv-root .video-player__play-btn:hover{background:rgba(var(--accent-rgb),.7);border-color:var(--accent);transform:scale(1.08)}.xa-al-vv-root .video-player__play-btn svg{width:24px;height:24px;fill:#fff;margin-left:3px}.xa-al-vv-root .video-player__title{font-family:"Playfair Display",serif;font-size:18px;color:#fff}.xa-al-vv-root .video-player__sub{font-size:12px;color:rgba(255,255,255,.6);margin-top:4px}.xa-al-vv-root .video-controls{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 100%);padding:20px 16px 14px;opacity:0;transition:opacity .25s}.xa-al-vv-root .video-player:hover .video-controls{opacity:1}.xa-al-vv-root .video-progress{width:100%;height:4px;background:rgba(255,255,255,.25);border-radius:2px;cursor:pointer;margin-bottom:10px;position:relative}.xa-al-vv-root .video-progress__fill{height:100%;background:var(--accent);border-radius:2px;width:35%;transition:width .1s}.xa-al-vv-root .video-progress__thumb{position:absolute;top:50%;right:calc(65% - 6px);transform:translateY(-50%);width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 4px rgba(0,0,0,.5)}.xa-al-vv-root .video-ctrl-row{display:flex;align-items:center;gap:10px}.xa-al-vv-root .vc-btn{background:none;border:none;color:rgba(255,255,255,.85);cursor:pointer;padding:0;transition:color .15s;display:flex;align-items:center;justify-content:center}.xa-al-vv-root .vc-btn:hover{color:#fff}.xa-al-vv-root .vc-btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.xa-al-vv-root .vc-btn.vc-fill svg{fill:currentColor;stroke:none}.xa-al-vv-root .vc-time{font-size:12px;color:rgba(255,255,255,.7);font-family:"JetBrains Mono",monospace}.xa-al-vv-root .vc-spacer{flex:1}.xa-al-vv-root .vc-vol{display:flex;align-items:center;gap:6px}.xa-al-vv-root .vc-vol-slider{width:60px;height:3px;background:rgba(255,255,255,.3);border-radius:2px;cursor:pointer}.xa-al-vv-root .vc-vol-fill{height:100%;width:70%;background:#fff;border-radius:2px}.xa-al-vv-root .sub-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px;margin-top:18px}.xa-al-vv-root .sub-label:first-child{margin-top:0}.xa-al-vv-root .video-thumb-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.xa-al-vv-root .video-thumb-strip::-webkit-scrollbar{display:none}.xa-al-vv-root .vt-item{flex-shrink:0;position:relative;cursor:pointer;border-radius:6px;overflow:hidden;width:100px}.xa-al-vv-root .vt-item img{width:100%;height:58px;object-fit:cover;display:block;transition:opacity .2s}.xa-al-vv-root .vt-item:hover img{opacity:.8}.xa-al-vv-root .vt-item.active::after{content:"";position:absolute;inset:0;border:2px solid var(--accent);border-radius:6px;pointer-events:none}.xa-al-vv-root .vt-dur{position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,.7);color:#fff;font-size:9px;font-family:"JetBrains Mono",monospace;padding:1px 5px;border-radius:3px}
.xa-al-tf-addon-wrap{position:relative;width:100%;height:100%;display:flex;align-items:center}
.xa-al-tf-addon-wrap .xa-al-tf{height:100%;flex:1;min-width:0}
.xa-al-tf-addon-wrap.has-prefix .xa-al-tf{padding-left:38px}
.xa-al-tf-addon-wrap.has-prefix-text .xa-al-tf{padding-left:34px}
.xa-al-tf-addon-wrap.has-suffix .xa-al-tf{padding-right:38px}
.xa-al-tf-prefix,.xa-al-tf-suffix{position:absolute;top:50%;transform:translateY(-50%);z-index:1;color:var(--ink-3);display:inline-flex;align-items:center;justify-content:center}
.xa-al-tf-prefix{left:12px;pointer-events:none;font-size:14px}.xa-al-tf-suffix{right:12px;pointer-events:none}
.xa-al-tf-prefix-icon .xa-al-tf-ico,.xa-al-tf-suffix:not(.xa-al-tf-suffix-btn) .xa-al-tf-ico{width:16px;height:16px;display:block}
.xa-al-tf-suffix--success{color:var(--green)!important}
.xa-al-tf-suffix-text{font-size:11px;font-weight:500}
.xa-al-tf-suffix-btn{pointer-events:auto;cursor:pointer;background:none;border:none;padding:0;color:var(--ink-3);transition:color .15s}.xa-al-tf-suffix-btn:hover{color:var(--ink)}
.xa-al-tf-suffix-btn .xa-al-tf-ico{width:15px;height:15px;display:block}
.xa-al-tf-suffix--clear{color:var(--ink-3)!important}
.xa-al-tf-suffix--clear:hover{color:var(--red)!important}
.xa-al-tf-block-wrap{display:flex;width:100%;height:100%;align-items:stretch}
.xa-al-tf-pre{display:flex;align-items:center;padding:0 12px;background:var(--bg2);border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2));border-right:none;border-radius:var(--xa-tf-radius,var(--r-sm)) 0 0 var(--xa-tf-radius,var(--r-sm));font-size:13px;color:var(--ink-2);white-space:nowrap;font-family:"JetBrains Mono",monospace}
.xa-al-tf-block-wrap .xa-al-tf--with-leading{border-radius:0 var(--xa-tf-radius,var(--r-sm)) var(--xa-tf-radius,var(--r-sm)) 0;flex:1;min-width:0}
.xa-al-tf-post{display:flex;align-items:center;padding:0 12px;background:var(--accent);border:var(--xa-tf-border-width,1.5px) solid var(--accent);border-left:none;border-radius:0 var(--xa-tf-radius,var(--r-sm)) var(--xa-tf-radius,var(--r-sm)) 0;font-size:12px;font-weight:600;color:#fff;cursor:pointer;white-space:nowrap;font-family:var(--font-body)}
.xa-al-tf-block-wrap .xa-al-tf--has-post{border-radius:var(--xa-tf-radius,var(--r-sm)) 0 0 var(--xa-tf-radius,var(--r-sm));flex:1;min-width:0}
.xa-al-tf-float-group{position:relative;padding-top:8px;width:100%;height:100%;box-sizing:border-box}
.xa-al-tf-float{background:transparent!important;border:none!important;border-bottom:1.5px solid var(--border2)!important;border-radius:0!important;box-shadow:none!important;padding:10px 2px 6px!important}
.xa-al-tf-float:focus{border-bottom-color:var(--accent)!important;box-shadow:none!important}
.xa-al-tf-float-label{position:absolute;top:18px;left:2px;font-size:14px;color:var(--ink-3);pointer-events:none;transition:top .2s,font-size .2s,color .2s;font-family:var(--font-body)}
.xa-al-tf-float:focus~.xa-al-tf-float-label,.xa-al-tf-float.xa-al-tf-float--has-val~.xa-al-tf-float-label{top:0;font-size:10px;color:var(--accent);letter-spacing:1px;text-transform:uppercase}
input.xa-al-tf--otp{width:44px!important;height:48px!important;min-height:48px!important;padding:10px 0!important;text-align:center;font-family:"JetBrains Mono",monospace!important;font-size:20px!important;font-weight:700!important;flex-shrink:0}
.xa-al-img-overlay-wrap{position:relative;overflow:hidden;box-sizing:border-box;background:var(--surface2)}
.xa-al-img-overlay-wrap img{width:100%;height:100%;display:block;object-position:center center;transition:transform .45s ease}
.xa-al-img-overlay-wrap:hover img{transform:scale(1.03)}
.xa-al-img-overlay{position:absolute;inset:0;background:linear-gradient(to top, rgba(28,23,16,.88) 0%, rgba(28,23,16,0) 58%);display:flex;flex-direction:column;justify-content:flex-end;padding:18px 20px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.28);z-index:2;pointer-events:none}
.xa-al-img-overlay-title{font-family:"Playfair Display",Georgia,serif;font-size:18px;font-weight:700;line-height:1.2;color:#fff}.xa-al-img-overlay-sub{font-size:12px;line-height:1.35;margin-top:4px;color:rgba(255,255,255,.72);white-space:pre-line}
.xa-al-img-overlay-cta{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#fff}
.xa-al-img-overlay-tag{position:absolute;left:14px;top:14px;z-index:3;background:var(--accent);color:#fff;font-size:10px;font-weight:800;line-height:1;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:4px}
.xa-al-sk-shimmer{background:linear-gradient(90deg,var(--bg2) 25%,var(--bg) 50%,var(--bg2) 75%)!important;background-size:200% 100%!important;position:relative!important;overflow:hidden!important}
.xa-al-sk-shimmer--rtl{animation:xa-al-shimmer-rtl 1.5s infinite!important}
.xa-al-sk-shimmer--ltr{animation:xa-al-shimmer-ltr 1.5s infinite!important}
@keyframes xa-al-shimmer-rtl{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes xa-al-shimmer-ltr{0%{background-position:-200% 0}100%{background-position:200% 0}}
.xa-al-cb-item,.xa-al-rb-item{display:inline-flex;align-items:center;gap:10px;box-sizing:border-box;cursor:pointer;user-select:none}
.xa-al-cb-item{display:flex;align-items:flex-start;width:100%;min-width:0;font-family:var(--font-body)}
.xa-al-cb-input,.xa-al-rb-input{position:absolute;inline-size:1px;block-size:1px;opacity:0;pointer-events:none}
.xa-al-cb-box{width:18px;height:18px;border:1.5px solid var(--border2);border-radius:4px;background:var(--surface);display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;color:#fff;box-sizing:border-box;transition:background .18s,border-color .18s,box-shadow .18s;margin-top:1px}
.xa-al-cb-box svg{width:10px;height:10px;stroke:#fff;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:0;transition:opacity .15s}
.xa-al-cb-item:has(.xa-al-cb-input:checked) .xa-al-cb-box{background:var(--accent);border-color:var(--accent);box-shadow:0 2px 6px rgba(var(--accent-rgb),.25)}
.xa-al-cb-item:has(.xa-al-cb-input:checked) .xa-al-cb-box svg{opacity:1}
.xa-al-cb-item:hover .xa-al-cb-box{border-color:var(--accent)}
.xa-al-cb-box--indeterminate{background:var(--accent)!important;border-color:var(--accent)!important}
.xa-al-cb-box--indeterminate svg{opacity:0!important}
.xa-al-cb-box--indeterminate::before{content:"";display:block;width:8px;height:2px;background:#fff;border-radius:1px}
.xa-al-cb-box--green{background:var(--green)!important;border-color:var(--green)!important;box-shadow:0 2px 6px rgba(45,125,79,.25)}
.xa-al-cb-box--blue{background:var(--blue)!important;border-color:var(--blue)!important;box-shadow:0 2px 6px rgba(43,95,160,.25)}
.xa-al-panel__stack.xa-al-rb-btn-group{flex-direction:row!important;flex-wrap:nowrap!important;align-items:stretch!important;gap:0!important;padding:0!important;border:1.5px solid var(--border2);border-radius:var(--r-sm);overflow:hidden}
.xa-al-panel__stack.xa-al-rb-plan-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px!important;padding:12px 0 0!important;align-items:stretch!important}
.xa-al-panel-root:has(.xa-al-rb-plan),.xa-al-panel-root:has(.xa-al-rb-plan)>.xa-al-panel__body{overflow:visible!important}
.xa-al-panel__stack.xa-al-rb-plan-section{flex-direction:column!important;align-items:stretch!important;width:100%}
.xa-al-panel__stack.xa-al-rb-plan-section>[data-component="label"],.xa-al-panel__stack.xa-al-rb-plan-section>[data-component="panel"]{flex:0 0 auto;width:100%;max-width:100%}
.xa-al-panel__stack.xa-al-rb-plan-section>[data-component="panel"]{border-top:1px solid var(--border);padding-top:12px;margin-top:0;box-sizing:border-box}
.xa-al-panel__stack.xa-al-rb-plan-grid.xa-al-rb-plan-grid--cards{width:100%}
.xa-al-rb-item{display:flex;align-items:flex-start;gap:10px;width:100%;min-width:0;font-family:var(--font-body)}
.xa-al-rb-input{display:none}
.xa-al-rb-circle{width:18px;height:18px;border:1.5px solid var(--border2);border-radius:999px;background:var(--surface);display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;box-sizing:border-box;transition:border-color .18s,box-shadow .18s;margin-top:1px}
.xa-al-rb-circle::after{content:"";width:7px;height:7px;border-radius:999px;background:var(--accent);transform:scale(0);transition:transform .18s cubic-bezier(.175,.885,.32,1.275)}
.xa-al-rb-item:has(.xa-al-rb-input:checked) .xa-al-rb-circle{border-color:var(--accent)}
.xa-al-rb-item:has(.xa-al-rb-input:checked) .xa-al-rb-circle{box-shadow:0 0 0 3px rgba(var(--accent-rgb),.12)}
.xa-al-rb-item:has(.xa-al-rb-input:checked) .xa-al-rb-circle::after{transform:scale(1)}
.xa-al-rb-item:hover .xa-al-rb-circle{border-color:var(--accent)}
.xa-al-cb-label{display:flex;flex-direction:column;gap:0;min-width:0;color:inherit;font:inherit;line-height:1.5}
.xa-al-cb-label p{font-size:13px;font-weight:500;color:var(--ink);margin:0}
.xa-al-cb-label small{font-size:11px;color:var(--ink-3);display:block}
.xa-al-cb-label--plain{display:inline-flex;font-size:13px;font-weight:500;color:var(--ink)}
.xa-al-cb-item--disabled,.xa-al-rb-item--disabled{opacity:.45;cursor:not-allowed;pointer-events:none}
.xa-al-cb-terms-wrap{font-size:12px;color:var(--ink-2);line-height:1.6}.xa-al-cb-terms-wrap a{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
.xa-al-cb-card{position:relative;display:flex;flex-direction:column;gap:6px;border:1.5px solid var(--border2);border-radius:10px;padding:16px 14px 14px;cursor:pointer;transition:border-color .2s,background .2s,box-shadow .2s;box-sizing:border-box;min-width:0;overflow:visible;min-height:min-content}
.xa-al-cb-card-input{position:absolute;opacity:0;pointer-events:none}
.xa-al-cb-card:hover{border-color:var(--accent);background:rgba(var(--accent-rgb),.02)}
.xa-al-cb-card:has(.xa-al-cb-card-input:checked){border-color:var(--accent);background:var(--accent-lt);box-shadow:0 0 0 1px var(--accent)}
.xa-al-cb-card-icon{font-size:22px;line-height:1.2;margin:0 0 4px 0;overflow:visible;flex-shrink:0}.xa-al-cb-card-title{font-size:13px;font-weight:600;color:var(--ink);line-height:1.35;padding-right:22px}.xa-al-cb-card-sub{font-size:11px;color:var(--ink-3);line-height:1.4;padding-right:22px}
.xa-al-cb-card-check{position:absolute;top:10px;right:10px;width:18px;height:18px;border-radius:50%;background:var(--accent-lt);border:1.5px solid var(--accent);display:none;align-items:center;justify-content:center}.xa-al-cb-card:has(.xa-al-cb-card-input:checked) .xa-al-cb-card-check{display:flex}.xa-al-cb-card-check svg{width:9px;height:9px;stroke:var(--accent);fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.xa-al-cb-pill{display:inline-flex;align-items:center;cursor:pointer;user-select:none;flex:0 0 auto}.xa-al-cb-pill-input{display:none}.xa-al-cb-pill-lbl{padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;border:1.5px solid var(--border2);color:var(--ink-2);transition:all .15s;cursor:pointer}.xa-al-cb-pill-input:checked+.xa-al-cb-pill-lbl{border-color:var(--accent);background:var(--accent-lt);color:var(--accent)}.xa-al-cb-pill:hover .xa-al-cb-pill-lbl{border-color:var(--accent)}
.xa-al-rb-btn-item{flex:1;position:relative;min-width:0}.xa-al-rb-seg-inp{position:absolute;opacity:0}.xa-al-rb-btn-label{display:block;text-align:center;padding:8px 12px;font-size:12px;font-weight:600;color:var(--ink-2);cursor:pointer;transition:background .15s,color .15s;border-right:1px solid var(--border)}.xa-al-rb-btn-item:last-child .xa-al-rb-btn-label{border-right:none}.xa-al-rb-btn-item input:checked~.xa-al-rb-btn-label{background:var(--accent);color:#fff}.xa-al-rb-btn-item input:not(:checked)~.xa-al-rb-btn-label:hover{background:var(--bg2);color:var(--ink)}
.xa-al-rb-plan{position:relative;border:1.5px solid var(--border2);border-radius:10px;padding:16px 14px;cursor:pointer;transition:border-color .2s,box-shadow .2s;box-sizing:border-box;min-width:0;display:block}.xa-al-rb-plan-input{position:absolute;opacity:0}.xa-al-rb-plan:has(input:checked){border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),var(--shadow-sm)}.xa-al-rb-plan__badge{display:none;position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:20px}.xa-al-rb-plan:has(input:checked) .xa-al-rb-plan__badge{display:block}.xa-al-rb-plan__name{font-size:12px;font-weight:700;color:var(--ink);margin-bottom:4px}.xa-al-rb-plan__price{font-family:"Playfair Display",serif;font-size:22px;font-weight:700;color:var(--ink);line-height:1}.xa-al-rb-plan__per{font-size:10px;color:var(--ink-3);font-family:var(--font-body);font-weight:600}.xa-al-rb-plan__features{margin-top:10px;display:flex;flex-direction:column;gap:4px}.xa-al-rb-plan__feat{font-size:11px;color:var(--ink-2);display:flex;align-items:center;gap:5px}.xa-al-rb-plan__feat::before{content:"\u2713";color:var(--green);font-weight:700;font-size:10px}
.xa-al-rb-rating-row{display:flex;gap:6px}.xa-al-rb-star{font-size:24px;cursor:pointer;color:var(--border2);transition:color .15s,transform .1s;line-height:1}.xa-al-rb-star:hover,.xa-al-rb-star.on{color:#e8a020;transform:scale(1.15)}.xa-al-rb-rating-cap{font-size:11px;color:var(--ink-3);margin:6px 0 0 0}
.xa-al-xlist-root{overflow:hidden;box-sizing:border-box}
.xlist-content{position:relative;width:100%;height:100%;box-sizing:border-box;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.xlist-content::-webkit-scrollbar{display:none}
.xlist-items-container{display:flex;box-sizing:border-box}
.xlist-item{position:relative;border:none;border-radius:6px;background:#fff;transition:all .2s;box-sizing:border-box;overflow:hidden}
.xlist-chat-row{display:flex;width:100%;box-sizing:border-box;padding:6px 10px;align-items:flex-end;gap:8px}
.xlist-chat-row--you{justify-content:flex-start}
.xlist-chat-row--me{justify-content:flex-end;flex-direction:row-reverse}
.xlist-chat-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;flex:0 0 32px;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.xlist-chat-stack{display:flex;flex-direction:column;max-width:85%;min-width:0}
.xlist-chat-row--me .xlist-chat-stack{align-items:flex-end}
.xlist-chat-name{font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:500}
.xlist-chat-bubble{font-size:14px;padding:10px 14px;line-height:1.45;word-break:break-word;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.xlist-chat-row--you .xlist-chat-bubble{background:#e5e7eb;color:#1f2937;border-radius:12px 12px 12px 0}
.xlist-chat-row--me .xlist-chat-bubble{background:var(--accent);color:#fff;border-radius:12px 12px 0 12px}
.xlist-chat-time{font-size:11px;color:#6b7280;margin-top:4px}
.xlist-chat-row--me .xlist-chat-time{color:rgba(255,255,255,.85)}
.f-label{display:block;font-size:12px;font-weight:500;color:var(--ink-2);margin-bottom:6px;letter-spacing:.3px}
.xa-ext-password-host,.xa-ext-textarea-host{width:100%;min-width:0;box-sizing:border-box}
.f-input{width:100%;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--ink);font-family:var(--font-body);font-size:14px;padding:10px 14px;outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}
.f-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb),.18)}
.f-input::placeholder{color:var(--ink-3)}.f-input:disabled{opacity:.55;cursor:not-allowed}
.f-hint{font-size:11px;color:var(--ink-3);margin:5px 0 0}
.pw-wrap{position:relative;width:100%;min-width:0}.pw-wrap .f-input{padding-right:44px}
.pw-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--ink-3);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:color .2s}
.pw-toggle:hover{color:var(--ink)}.pw-toggle svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pw-strength{display:flex;gap:4px;margin-top:8px}.pw-strength__bar{flex:1;height:3px;border-radius:2px;background:var(--border2);transition:background .3s}.pw-strength__bar.weak{background:var(--red)}.pw-strength__bar.medium{background:var(--yellow)}.pw-strength__bar.strong{background:var(--green)}
.f-textarea{width:100%;min-height:100px;resize:vertical;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--ink);font-family:var(--font-body);font-size:14px;padding:10px 14px;outline:none;transition:border-color .2s,box-shadow .2s;scrollbar-width:thin;box-sizing:border-box}
.f-textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb),.18)}.f-textarea::placeholder{color:var(--ink-3)}.f-textarea:disabled{opacity:.55;cursor:not-allowed}
.textarea-footer{display:flex;justify-content:flex-end;font-size:11px;color:var(--ink-3);margin-top:5px}
.grid-demo{width:100%}.grid-demo__controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.grid-pill{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;background:var(--surface2);border:1px solid var(--border2);color:var(--ink-2);transition:background .15s,color .15s,border-color .15s}.grid-pill.active{background:var(--accent);border-color:var(--accent);color:#fff}.grid-canvas{display:grid;gap:6px}.grid-cell{height:40px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;font-family:"Syne Mono",monospace;color:var(--ink-3);transition:background .2s}.grid-cell:nth-child(3n+1){background:rgba(var(--accent-rgb),.1);border-color:rgba(var(--accent-rgb),.2);color:var(--accent-2)}.grid-cell:nth-child(3n+2){background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.15);color:var(--green)}
.flex-controls{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px}.flex-ctrl-group{display:flex;flex-direction:column;gap:4px}.flex-ctrl-group label{font-size:10px;color:var(--ink-3);letter-spacing:1px;text-transform:uppercase}.flex-ctrl-group select{background:var(--surface2);border:1px solid var(--border2);border-radius:4px;color:var(--ink);font-family:var(--font-body);font-size:11px;padding:5px 8px;outline:none}.flex-canvas{min-height:100px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;transition:all .3s}.flex-box{height:36px;padding:0 12px;border-radius:6px;display:flex;align-items:center;font-size:10px;font-family:"Syne Mono",monospace;white-space:nowrap}.flex-box:nth-child(1){background:rgba(var(--accent-rgb),.2);color:var(--accent-2);min-width:60px}.flex-box:nth-child(2){background:rgba(52,211,153,.15);color:var(--green);min-width:80px}.flex-box:nth-child(3){background:rgba(251,191,36,.15);color:var(--yellow);min-width:50px}.flex-box:nth-child(4){background:rgba(248,113,113,.15);color:var(--red);min-width:70px}.flex-box:nth-child(5){background:rgba(96,165,250,.15);color:var(--blue);min-width:55px}
.stack-demo{display:flex;gap:24px;align-items:flex-start}.stack-v{display:flex;flex-direction:column;gap:6px;flex:1}.stack-h{display:flex;flex-direction:row;gap:6px;flex-wrap:wrap}.stack-item{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--ink-2);font-family:"Syne Mono",monospace}.stack-label{font-size:10px;color:var(--ink-3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px}
.spacer-item{display:flex;flex-direction:column;gap:0;margin-bottom:6px}.spacer-box{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:11px;color:var(--ink-2)}.spacer-visual{background:repeating-linear-gradient(45deg,rgba(var(--accent-rgb),.05),rgba(var(--accent-rgb),.05) 4px,transparent 4px,transparent 10px);border-left:1px dashed rgba(var(--accent-rgb),.3);border-right:1px dashed rgba(var(--accent-rgb),.3);display:flex;align-items:center;justify-content:center;font-family:"Syne Mono",monospace;font-size:10px;color:var(--accent);opacity:.8}
.xa-ext-select-host,.xa-ext-slider-host,.xa-ext-switch-host,.xa-ext-progress-host,.xa-ext-spinner-host{width:100%;min-width:0;box-sizing:border-box}
.f-select-wrap{position:relative;width:100%;min-width:0}
select.f-select{width:100%;appearance:none;-webkit-appearance:none;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--ink);font-family:var(--font-body);font-size:14px;padding:10px 40px 10px 14px;outline:none;cursor:pointer;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}
select.f-select[multiple],select.f-select[size]:not([size="1"]){height:auto;min-height:42px}
select.f-select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb),.18)}
.f-select-arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ink-3)}
.f-select-arrow svg{display:block;width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.f-select option{background:var(--surface2)}
.custom-select{position:relative;width:100%;min-width:0;z-index:0}
.custom-select.open{z-index:var(--xa-z-dropdown,60000);isolation:isolate}
.custom-select__trigger{display:flex;align-items:center;justify-content:space-between;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--ink);font-size:14px;padding:10px 14px;cursor:pointer;user-select:none;transition:border-color .2s;box-sizing:border-box}
.custom-select__trigger:hover,.custom-select.open .custom-select__trigger{border-color:var(--accent)}
.custom-select__trigger svg{width:14px;height:14px;flex:0 0 auto}
.custom-select__dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:calc(var(--xa-z-dropdown,60000) + 1);background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r-sm);overflow:hidden;box-shadow:var(--shadow);opacity:0;transform:translateY(-6px);pointer-events:none;transition:opacity .18s,transform .18s}
.custom-select.open .custom-select__dropdown{opacity:1;transform:translateY(0);pointer-events:all}
.custom-select__opt{padding:9px 14px;font-size:13px;color:var(--ink-2);box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s,color .15s}
.custom-select__opt:hover{background:rgba(var(--accent-rgb),.12);color:var(--ink)}
.custom-select__opt.selected{background:rgba(var(--accent-rgb),.08);color:var(--accent-2)}
.xa-al-panel-root:has(.custom-select.open){overflow:visible!important;z-index:var(--xa-z-panel-elevated,100)}
.xa-al-panel__body:has(.custom-select.open),.xa-al-form__body:has(.custom-select.open){overflow:visible!important}
.xa-al-panel__stack:has(.custom-select.open),.xa-al-form__stack:has(.custom-select.open){overflow:visible!important}
.xa-ext-slider-host .f-label{display:block;font-size:12px;font-weight:500;color:var(--ink-2);margin-bottom:6px;letter-spacing:.3px}
.xa-ext-slider-host .slider-value{text-align:center;font-family:"JetBrains Mono","Syne Mono",monospace;font-size:22px;font-weight:600;color:var(--ink);margin-bottom:8px}
.xa-ext-slider-host .slider-wrap{width:100%;min-width:0;padding:8px 0}
.xa-ext-slider-host .f-range{appearance:none;-webkit-appearance:none;width:100%;height:4px;background:var(--border2);border-radius:4px;outline:none;cursor:pointer;--fill:40%;background:linear-gradient(to right,var(--accent) var(--fill),var(--border2) var(--fill))}
.xa-ext-slider-host .f-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--ink);border:2px solid var(--accent);cursor:grab;transition:transform .15s,box-shadow .15s;box-shadow:0 0 0 0 rgba(var(--accent-rgb),0)}
.xa-ext-slider-host .f-range::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.2);box-shadow:0 0 0 6px rgba(var(--accent-rgb),.25)}
.xa-ext-slider-host .f-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--ink);border:2px solid var(--accent);cursor:grab}
.xa-ext-slider-host .slider-labels{display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3);margin-top:6px}
.xa-ext-switch-host--showcase{display:flex;flex-direction:column;gap:0}
.xa-ext-switch-host .switch-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid var(--border);width:100%;box-sizing:border-box}
.xa-ext-switch-host .switch-row:last-child{border-bottom:none}
.xa-ext-switch-host .switch-row--control-only{justify-content:flex-end;border-bottom:none;padding:8px 0}
.xa-ext-switch-host .switch-info{flex:1;min-width:0}.xa-ext-switch-host .switch-info p{margin:0;font-size:13px;font-weight:500;color:var(--ink)}.xa-ext-switch-host .switch-info small{display:block;margin-top:2px;font-size:11px;color:var(--ink-3);line-height:1.35}
.xa-ext-switch-host .switch{position:relative;flex-shrink:0}.xa-ext-switch-host .switch input{opacity:0;width:0;height:0;position:absolute}
.xa-ext-switch-host .switch__track{position:absolute;inset:0;border-radius:999px;background:var(--surface2);border:1px solid var(--border2);cursor:pointer;transition:background .25s,border-color .25s;box-sizing:border-box}
.xa-ext-switch-host .switch__track::after{content:"";position:absolute;top:3px;left:3px;border-radius:50%;background:var(--ink-3);transition:transform .25s,background .25s}
.xa-ext-switch-host .switch input:checked~.switch__track{background:var(--accent);border-color:var(--accent)}
.xa-ext-switch-host .switch input:checked~.switch__track::after{background:#fff}
.xa-ext-switch-host .switch.switch--md{width:44px;height:24px}.xa-ext-switch-host .switch.switch--md .switch__track{border-radius:12px}.xa-ext-switch-host .switch.switch--md .switch__track::after{width:16px;height:16px}.xa-ext-switch-host .switch.switch--md input:checked~.switch__track::after{transform:translateX(20px)}
.xa-ext-switch-host .switch.switch--sm{width:36px;height:20px}.xa-ext-switch-host .switch.switch--sm .switch__track{border-radius:10px}.xa-ext-switch-host .switch.switch--sm .switch__track::after{width:14px;height:14px;top:2px;left:2px}.xa-ext-switch-host .switch.switch--sm input:checked~.switch__track::after{transform:translateX(16px)}
.xa-ext-switch-host .switch.switch--lg{width:52px;height:28px}.xa-ext-switch-host .switch.switch--lg .switch__track{border-radius:14px}.xa-ext-switch-host .switch.switch--lg .switch__track::after{width:20px;height:20px;top:3px;left:3px}.xa-ext-switch-host .switch.switch--lg input:checked~.switch__track::after{transform:translateX(24px)}
.xa-ext-progress-host--showcase{display:flex;flex-direction:column;gap:12px}
.xa-ext-progress-host .progress-item{width:100%;min-width:0}.xa-ext-progress-host .progress-label{display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;font-size:12px;font-weight:600;color:var(--ink-2,#6b5f4e)}
.xa-ext-progress-host .progress-label span:last-child{font-variant-numeric:tabular-nums;color:var(--ink,#1c1710)}
.xa-ext-progress-host .progress-track{position:relative;width:100%;height:8px;border-radius:999px;background:var(--surface2,#f2ede5);overflow:hidden;box-sizing:border-box}.xa-ext-progress-host .progress-fill{height:100%;border-radius:inherit;width:0;min-width:0;transition:width .35s ease;box-sizing:border-box}
.xa-ext-progress-host .progress-fill--a{background:linear-gradient(90deg,var(--accent,#c4622d) 0%,var(--accent-gradient-end,#e88b5a) 100%)}.xa-ext-progress-host .progress-fill--b{background:linear-gradient(90deg,var(--blue,#2b5fa0) 0%,var(--blue-lt,#d1dff5) 100%)}.xa-ext-progress-host .progress-fill--c{background:linear-gradient(90deg,var(--green,#2d7d4f) 0%,var(--green-lt,#d1ead9) 100%)}.xa-ext-progress-host .progress-fill--d{background:linear-gradient(90deg,var(--ink-3,#a8998a) 0%,var(--border2,rgba(60,45,25,.18)) 100%)}
.xa-ext-progress-host .progress-track.xa-ext-progress-stripes .progress-fill{position:relative;overflow:hidden}.xa-ext-progress-host .progress-track.xa-ext-progress-stripes .progress-fill::after{content:"";position:absolute;inset:0;border-radius:inherit;background-image:linear-gradient(45deg,rgba(255,255,255,.22) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.22) 50%,rgba(255,255,255,.22) 75%,transparent 75%,transparent);background-size:1rem 1rem;animation:xa-ext-pb-stripes-move 1s linear infinite;pointer-events:none}
@keyframes xa-ext-pb-stripes-move{0%{background-position:1rem 0}100%{background-position:0 0}}
.xa-ext-spinner-host{display:flex;align-items:center;justify-content:center;--xa-spin-rgb:0,123,255}[data-component="spinner"] .spinners-row,.xa-ext-spinner-host .spinners-row{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:flex-start;gap:14px 18px;width:100%;min-height:min-content;box-sizing:border-box}[data-component="spinner"] .spinner-item,.xa-ext-spinner-host .spinner-item{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:52px}[data-component="spinner"] .spinner-label,.xa-ext-spinner-host .spinner-label{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3,#a8998a)}
[data-component="spinner"] .sp-ring,.xa-ext-spinner-host .sp-ring{display:inline-block;box-sizing:border-box;border-radius:50%;border-style:solid;border-color:rgb(var(--xa-spin-rgb,0,123,255) / .22);border-top-color:rgb(var(--xa-spin-rgb,0,123,255) / 1);animation:xa-ext-spin-ring .85s linear infinite}[data-component="spinner"] .sp-ring--sm,.xa-ext-spinner-host .sp-ring--sm{width:18px;height:18px;border-width:2px}[data-component="spinner"] .sp-ring--md,.xa-ext-spinner-host .sp-ring--md{width:28px;height:28px;border-width:3px}[data-component="spinner"] .sp-ring--lg,.xa-ext-spinner-host .sp-ring--lg{width:40px;height:40px;border-width:4px}
[data-component="spinner"] .sp-dots,.xa-ext-spinner-host .sp-dots{display:inline-flex;flex-direction:row;align-items:center;justify-content:center;gap:5px}[data-component="spinner"] .sp-dots span,.xa-ext-spinner-host .sp-dots span{display:block;width:7px;height:7px;border-radius:50%;background:rgb(var(--xa-spin-rgb,0,123,255) / 1);animation:xa-ext-spin-dots 1.25s ease-in-out infinite both}[data-component="spinner"] .sp-dots span:nth-child(2),.xa-ext-spinner-host .sp-dots span:nth-child(2){animation-delay:.14s}[data-component="spinner"] .sp-dots span:nth-child(3),.xa-ext-spinner-host .sp-dots span:nth-child(3){animation-delay:.28s}
[data-component="spinner"] .sp-pulse,.xa-ext-spinner-host .sp-pulse{width:28px;height:28px;border-radius:50%;background:rgb(var(--xa-spin-rgb,0,123,255) / .95);animation:xa-ext-spin-pulse 1.15s ease-in-out infinite}[data-component="spinner"] .sp-bars,.xa-ext-spinner-host .sp-bars{display:inline-flex;flex-direction:row;align-items:flex-end;justify-content:center;gap:4px;height:28px}[data-component="spinner"] .sp-bars span,.xa-ext-spinner-host .sp-bars span{display:block;width:4px;height:22px;border-radius:2px;background:rgb(var(--xa-spin-rgb,0,123,255) / 1);transform-origin:center bottom;animation:xa-ext-spin-bars .9s ease-in-out infinite}[data-component="spinner"] .sp-bars span:nth-child(2),.xa-ext-spinner-host .sp-bars span:nth-child(2){animation-delay:.1s}[data-component="spinner"] .sp-bars span:nth-child(3),.xa-ext-spinner-host .sp-bars span:nth-child(3){animation-delay:.2s}[data-component="spinner"] .sp-bars span:nth-child(4),.xa-ext-spinner-host .sp-bars span:nth-child(4){animation-delay:.3s}
.sp-dots.xa-ext-spin-scale--sm{gap:4px}.sp-dots.xa-ext-spin-scale--sm span{width:5px;height:5px}.sp-dots.xa-ext-spin-scale--lg{gap:6px}.sp-dots.xa-ext-spin-scale--lg span{width:9px;height:9px}.xa-ext-spin-scale--sm.sp-pulse{width:22px;height:22px}.xa-ext-spin-scale--lg.sp-pulse{width:36px;height:36px}.xa-ext-spin-scale--sm.sp-bars{height:22px;gap:3px}.xa-ext-spin-scale--sm.sp-bars span{width:3px;height:16px}.xa-ext-spin-scale--lg.sp-bars{height:34px;gap:5px}.xa-ext-spin-scale--lg.sp-bars span{width:5px;height:28px}
@keyframes xa-ext-spin-ring{to{transform:rotate(360deg)}}@keyframes xa-ext-spin-dots{0%,80%,100%{transform:scale(.35);opacity:.45}40%{transform:scale(1);opacity:1}}@keyframes xa-ext-spin-pulse{0%,100%{transform:scale(.55);opacity:.55}50%{transform:scale(1);opacity:1}}@keyframes xa-ext-spin-bars{0%,100%{transform:scaleY(.35);opacity:.55}50%{transform:scaleY(1);opacity:1}}
.badges-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.bdg{display:inline-flex;align-items:center;gap:5px;border-radius:20px;font-size:11px;font-weight:600;padding:3px 10px;letter-spacing:.3px}.bdg--dot::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}.bdg-purple{background:rgba(var(--accent-rgb),.18);color:var(--accent-2);border:1px solid rgba(var(--accent-rgb),.25)}.bdg-green{background:rgba(52,211,153,.15);color:var(--green);border:1px solid rgba(52,211,153,.25)}.bdg-red{background:rgba(248,113,113,.15);color:var(--red);border:1px solid rgba(248,113,113,.25)}.bdg-yellow{background:rgba(251,191,36,.15);color:var(--yellow);border:1px solid rgba(251,191,36,.25)}.bdg-blue{background:rgba(96,165,250,.15);color:var(--blue);border:1px solid rgba(96,165,250,.25)}.bdg-outline{background:transparent;color:var(--ink-2);border:1px solid var(--border2)}.notif-badge-wrap{position:relative;display:inline-flex}.notif-icon-btn{width:40px;height:40px;border-radius:10px;background:var(--surface2);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;color:var(--ink-2);cursor:pointer;transition:background .15s}.notif-icon-btn:hover{background:var(--border2)}.notif-icon-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.notif-count{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--red);color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid var(--surface)}
.avatars-row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px}.av{position:relative;flex-shrink:0}.av__img{border-radius:50%;object-fit:cover;display:block;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);border:2px solid var(--surface)}.av__img--sm{width:28px;height:28px}.av__img--md{width:40px;height:40px}.av__img--lg{width:56px;height:56px}.av__img--xl{width:72px;height:72px}.av__initials{border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"Syne",sans-serif;font-weight:700;color:#fff;font-size:14px;box-sizing:border-box}.av__initials--sm{width:28px;height:28px;font-size:10px}.av__initials--md{width:40px;height:40px;font-size:14px}.av__initials--lg{width:56px;height:56px;font-size:18px}.av__status{position:absolute;bottom:2px;right:2px;width:10px;height:10px;border-radius:50%;border:2px solid var(--surface);box-sizing:border-box}.av__status--online{background:var(--green)}.av__status--away{background:var(--yellow)}.av__status--offline{background:var(--ink-3)}.av-group{display:flex}.av-group .av{margin-left:-10px}.av-group .av:first-child{margin-left:0}.avatar-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.avatar{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;background:var(--accent-lt);color:var(--accent);font-weight:800;border:2px solid var(--surface);box-shadow:var(--shadow-sm);flex:0 0 auto}.avatar img{width:100%;height:100%;object-fit:cover;display:block}.avatar--sm{width:32px;height:32px;font-size:11px}.avatar--md{width:44px;height:44px;font-size:14px}.avatar--lg{width:64px;height:64px;font-size:20px}.avatar-stack{display:flex}.avatar-stack .avatar{margin-left:-10px}.avatar-stack .avatar:first-child{margin-left:0}
.rating-wrap{display:flex;flex-direction:column;gap:16px}.rating-row{display:flex;align-items:center;gap:10px}.rating-row__label{font-size:12px;color:var(--ink-2);width:60px;flex-shrink:0}.stars-input,.hearts-input{display:flex;gap:4px}.stars-input label{cursor:pointer;font-size:22px;color:var(--border2);transition:color .15s,transform .15s}.stars-input label:hover,.stars-input label.active{color:var(--yellow);transform:scale(1.15)}.stars-input input{display:none}.hearts-input label{cursor:pointer;font-size:20px;color:var(--border2);transition:color .15s,transform .15s}.hearts-input label:hover,.hearts-input label.active{color:var(--red);transform:scale(1.15)}.hearts-input input{display:none}.rating-score{font-family:"Syne Mono","JetBrains Mono",ui-monospace,monospace;font-size:13px;color:var(--ink-2);min-width:28px}.rt-stars{display:inline-flex;align-items:center;gap:4px;color:var(--yellow);font-size:22px;line-height:1}.rt-star{color:var(--border2)}.rt-star.on{color:var(--yellow)}.rt-value{margin-left:8px;font-size:12px;font-weight:700;color:var(--ink-2)}
.ui-card{background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;transition:transform .2s,box-shadow .2s}.ui-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-card)}.ui-card__img{width:100%;height:140px;object-fit:cover;display:block}.ui-card__body{padding:16px}.ui-card__title{font-family:"Syne",var(--font-body),sans-serif;font-weight:700;font-size:15px;color:var(--ink);margin:0 0 6px}.ui-card__text{font-size:12px;color:var(--ink-2);line-height:1.6;margin:0 0 14px}.ui-card__footer{display:flex;align-items:center;justify-content:space-between}.ui-card__footer .bdg{font-size:10px;padding:2px 8px}.ext-card{border:1px solid var(--border2);border-radius:var(--r-lg);background:var(--surface);box-shadow:var(--shadow-md);overflow:hidden;box-sizing:border-box}.ext-card__media{width:100%;height:150px;object-fit:cover;display:block;background:var(--bg2)}.ext-card__body{padding:16px}.ext-card__title{font-size:16px;font-weight:800;color:var(--ink);margin:0 0 6px}.ext-card__text{font-size:13px;line-height:1.6;color:var(--ink-2);margin:0}
.tabs-nav{display:flex;border-bottom:1px solid var(--border);margin-bottom:20px;gap:2px}.tab-btn{padding:9px 18px;background:none;border:none;color:var(--ink-3);font-family:var(--font-body);font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .2s,border-color .2s,background .2s;white-space:nowrap;display:flex;align-items:center;gap:6px}.tab-btn:hover{color:var(--ink)}.tab-btn.active{color:var(--accent-2);border-bottom-color:var(--accent)}.tab-content{display:none}.tab-content.active{display:block;animation:xa-ext-tabs-fadeIn .2s ease}.tab-panel-inner{color:var(--ink-2);font-size:13px;line-height:1.7}.tabs-nav--pill{border-bottom:none;background:var(--surface2);border-radius:8px;padding:4px;gap:2px;margin-bottom:16px}.tabs-nav--pill .tab-btn{border-radius:6px;border-bottom:none;margin-bottom:0;padding:7px 16px}.tabs-nav--pill .tab-btn.active{background:var(--surface);color:var(--ink);box-shadow:var(--shadow-pill)}@keyframes xa-ext-tabs-fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}.tabs{border:1px solid var(--border2);border-radius:var(--r-sm);overflow:hidden;background:var(--surface);box-shadow:var(--shadow-sm)}.tab-list{display:flex;gap:0;border-bottom:1px solid var(--border);background:var(--bg2);overflow:auto}
.accordion-item{border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:6px;overflow:hidden;transition:border-color .2s;background:var(--surface)}.accordion-item.open{border-color:var(--accent)}.accordion-trigger{display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 16px;background:none;border:none;color:var(--ink);font-family:var(--font-body);font-size:13px;font-weight:500;cursor:pointer;text-align:left;transition:background .15s}.accordion-trigger:hover{background:var(--tap-hover-weak)}.accordion-chevron{width:16px;height:16px;stroke:var(--ink-3);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;transition:transform .25s}.accordion-trigger.has-children.expanded .accordion-chevron,.accordion-item.open .accordion-chevron{transform:rotate(180deg);stroke:var(--accent-2)}.accordion-body{max-height:0;overflow:hidden;transition:max-height .35s cubic-bezier(.4,0,.2,1)}.accordion-item.open .accordion-body{max-height:220px}.accordion-body-inner{padding:0 16px 14px;font-size:13px;color:var(--ink-2);line-height:1.7}.accordion{display:flex;flex-direction:column;gap:8px}.acc-item{border:1px solid var(--border2);border-radius:var(--r-sm);background:var(--surface);overflow:hidden;box-shadow:var(--shadow-sm)}.acc-title{display:flex;align-items:center;justify-content:space-between;width:100%;padding:12px 14px;font-weight:700;color:var(--ink);cursor:pointer}.acc-body{padding:0 14px 14px;color:var(--ink-2);font-size:13px;line-height:1.6}
.alert{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:var(--r-sm);margin-bottom:10px;border:1px solid transparent}.alert:last-child{margin-bottom:0}.alert__icon{font-size:16px;flex-shrink:0;margin-top:1px}.alert__body{flex:1;min-width:0}.alert__title{font-weight:600;font-size:13px;margin-bottom:2px}.alert__text{font-size:12px;line-height:1.5}.alert__close{background:none;border:none;cursor:pointer;color:inherit;opacity:.5;padding:0;transition:opacity .15s;flex-shrink:0}.alert__close:hover{opacity:1}.alert__close svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}.alert--info{background:rgba(96,165,250,.08);border-color:rgba(96,165,250,.25);color:#93c5fd}.alert--success{background:rgba(52,211,153,.08);border-color:rgba(52,211,153,.25);color:#6ee7b7}.alert--warning{background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.25);color:#fde68a}.alert--error{background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.25);color:#fca5a5}.xa-ext-alert{display:flex;gap:10px;border-radius:var(--r-sm);padding:12px 14px;border:1px solid var(--border2);background:var(--surface);color:var(--ink-2);box-sizing:border-box}.xa-ext-alert__icon{font-weight:900;flex:0 0 auto}.xa-ext-alert__title{font-size:13px;font-weight:800;color:var(--ink);margin-bottom:3px}.xa-ext-alert__message{font-size:12px;line-height:1.5}.xa-ext-alert--info{border-color:rgba(43,95,160,.28);background:var(--blue-lt)}.xa-ext-alert--success{border-color:rgba(45,125,79,.28);background:var(--green-lt)}.xa-ext-alert--warning{border-color:rgba(176,125,18,.28);background:var(--yellow-lt)}.xa-ext-alert--error{border-color:rgba(192,58,43,.28);background:var(--red-lt)}
.search-outer{position:relative;z-index:0}.search-outer:focus-within,.search-outer:has(.search-results.show){z-index:13200}.search-input-wrap{display:flex;align-items:center;gap:10px;background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:0 14px;transition:border-color .2s,box-shadow .2s}.search-input-wrap:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb),.18)}.search-icon{color:var(--ink-3);flex-shrink:0}.search-icon svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;display:block}.search-field{flex:1;background:none;border:none;outline:none;color:var(--ink);font-family:var(--font-body);font-size:14px;padding:11px 0;min-width:0}.search-field::placeholder{color:var(--ink-3)}.search-kbd{font-family:"Syne Mono",monospace;font-size:10px;color:var(--ink-3);background:var(--surface);border:1px solid var(--border2);border-radius:4px;padding:2px 6px;white-space:nowrap;flex-shrink:0}.search-clear{background:none;border:none;color:var(--ink-3);cursor:pointer;padding:0;display:none;align-items:center;justify-content:center;transition:color .15s}.search-clear.show{display:flex}.search-clear:hover{color:var(--ink)}.search-clear svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}.search-results{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:13300;background:var(--surface2);border:1px solid var(--border2);border-radius:10px;box-shadow:var(--shadow);overflow:hidden;display:none}.search-results.show{display:block}.search-result-item{display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13px;color:var(--ink-2);cursor:pointer;transition:background .15s}.search-result-item:hover{background:rgba(var(--accent-rgb),.08);color:var(--ink)}.search-result-item .icon{font-size:14px}.search-result-item .label{flex:1}.search-result-item mark{background:none;color:var(--accent-2);font-weight:600}.search-result-item .type{font-size:10px;color:var(--ink-3)}.search-divider{height:1px;background:var(--border);margin:4px 0}.search-recent-label{padding:6px 14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink-3)}.xa-ext-search{position:relative;width:100%;min-width:0}.xa-ext-search input{width:100%;height:42px;border:1.5px solid var(--border2);border-radius:999px;background:var(--surface);box-shadow:var(--shadow-sm);font:inherit;color:var(--ink);padding:0 42px;outline:none}.xa-ext-search input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb),.14),var(--shadow-sm)}.xa-ext-search__icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ink-3);width:18px;height:18px}.xa-ext-search__clear{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--ink-3);font-size:16px}
.xa-ext-picker{display:flex;align-items:center;gap:10px;border:1.5px solid var(--border2);border-radius:var(--r-sm);background:var(--surface);box-shadow:var(--shadow-sm);padding:10px 12px;box-sizing:border-box;color:var(--ink-2);min-width:0}.xa-ext-picker input{font:inherit;color:var(--ink);background:transparent;border:0;outline:none;min-width:0}
.xa-ext-color-picker-host,.xa-ext-date-picker-host,.xa-ext-time-picker-host{width:100%;min-width:0;box-sizing:border-box}
.color-picker-wrap{width:100%;min-width:0}.color-preview{width:100%;height:60px;border-radius:8px;margin-bottom:14px;border:1px solid var(--border);transition:background .2s;box-sizing:border-box}.color-spectrum{width:100%;height:14px;border-radius:8px;margin-bottom:12px;cursor:crosshair;accent-color:var(--accent)}.color-swatches{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.color-swatch{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform .15s,border-color .15s;padding:0;appearance:none}.color-swatch:hover{transform:scale(1.2)}.color-swatch.selected{border-color:var(--ink)}.color-hex-row{display:flex;gap:8px;align-items:center;margin-top:10px}.color-hex-row input{flex:1;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;color:var(--ink);font-family:"Syne Mono","JetBrains Mono",ui-monospace,monospace;font-size:13px;padding:8px 12px;outline:none;transition:border-color .2s;min-width:0}.color-hex-row input[type="color"]{flex:0 0 48px;width:48px;height:36px;padding:0;cursor:pointer}.color-hex-row input:focus{border-color:var(--accent)}.color-hex-dot{width:32px;height:32px;border-radius:8px;border:1px solid var(--border2);flex-shrink:0}
.date-picker{width:100%;min-width:0}.date-picker__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.date-picker__nav{width:30px;height:30px;border-radius:6px;background:var(--surface2);border:1px solid var(--border2);color:var(--ink-2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}.date-picker__nav:hover{background:var(--border2);color:var(--ink)}.date-picker__nav svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.date-picker__month{font-family:"Syne",var(--font-body),sans-serif;font-weight:700;font-size:14px}.date-picker__grid{width:100%;border-collapse:collapse}.date-picker__grid th{font-size:10px;letter-spacing:1px;color:var(--ink-3);text-align:center;padding:4px 0 8px;font-weight:500}.date-picker__grid td{text-align:center;padding:2px}.date-day{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:auto;font-size:12px;cursor:pointer;color:var(--ink-2);transition:background .15s,color .15s}.date-day:hover{background:var(--surface2);color:var(--ink)}.date-day.today{color:var(--accent-2);font-weight:700}.date-day.selected{background:var(--accent);color:#fff}.date-day.other-month{color:var(--ink-3)}.date-day.in-range{background:rgba(var(--accent-rgb),.15);border-radius:0;color:var(--ink)}
.picker-input-wrap{position:relative;width:100%;min-width:0}.picker-input-wrap input{width:100%;height:40px;padding:8px 40px 8px 10px;border:1px solid var(--border2);border-radius:6px;box-sizing:border-box;background:var(--surface);color:var(--ink);font:inherit}.picker-input-icon{position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ink-3);font-size:0}.picker-input-icon::before{font-size:15px}.picker-input-wrap--date .picker-input-icon::before{content:"\u{1F4C5}"}.picker-input-wrap--time .picker-input-icon::before{content:"\u{1F550}"}
.time-picker{width:100%;min-width:0}.time-picker__display{text-align:center;padding:14px;background:var(--surface2);border-radius:8px;margin-bottom:16px}.time-picker__time{font-family:"Syne Mono","JetBrains Mono",ui-monospace,monospace;font-size:36px;font-weight:600;color:var(--ink);letter-spacing:2px}.time-picker__ampm{font-size:13px;color:var(--ink-3);margin-left:6px}.time-picker__cols{display:flex;gap:16px}.time-picker__col{flex:1}.time-picker__col-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink-3);text-align:center;margin-bottom:8px}.time-picker__scroll{max-height:140px;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;border-radius:6px;background:var(--surface2)}.time-picker__scroll::-webkit-scrollbar{display:none}.time-picker__item{padding:8px;text-align:center;font-size:13px;cursor:pointer;color:var(--ink-3);scroll-snap-align:start;transition:background .15s,color .15s}.time-picker__item:hover{color:var(--ink)}.time-picker__item.selected{color:var(--accent-2);font-weight:600;background:rgba(var(--accent-rgb),.1)}
.tree{width:100%}.tree-container{border:1px solid var(--border);border-radius:4px;background:var(--surface);overflow-y:auto;max-height:280px}.tree-node{user-select:none}.tree-row{display:flex;align-items:center;gap:6px;padding:5px 0 5px 4px;border-radius:5px;cursor:pointer;color:var(--ink-2);font-size:13px;transition:background .15s,color .15s}.tree-row:hover{background:var(--tap-hover);color:var(--ink)}.tree-row.selected{background:rgba(var(--accent-rgb),.1);color:var(--accent-2)}.tree-chevron{width:14px;height:14px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s;visibility:hidden}.tree-row.has-children .tree-chevron{visibility:visible}.tree-row.has-children.expanded .tree-chevron{transform:rotate(90deg)}.tree-icon{font-size:13px;flex-shrink:0}.tree-label{flex:1;font-size:12px}.tree-children{margin-left:16px;border-left:1px solid var(--border);padding-left:8px;overflow:hidden}.tree-children.collapsed{display:none}
.xa-ext-gallery-host{width:100%;min-width:0}.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:auto;gap:6px}.gallery-item{position:relative;border-radius:6px;overflow:hidden;cursor:pointer;background:var(--surface2)}.gallery-item:nth-child(1){grid-row:span 2}.gallery-item:nth-child(4){grid-column:span 2}.gallery-item img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s;min-height:80px}.gallery-item:hover img{transform:scale(1.06)}.gallery-caption{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;padding:16px 12px 8px;font-size:14px}.gallery-item__overlay{position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;transition:background .3s}.gallery-item:hover .gallery-item__overlay{background:rgba(0,0,0,.35)}.gallery-item__overlay svg{opacity:0;stroke:#fff;fill:none;width:24px;height:24px;stroke-width:2;transition:opacity .3s}.gallery-item:hover .gallery-item__overlay svg{opacity:1}.lightbox{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:20000;display:none;align-items:center;justify-content:center}.lightbox.open{display:flex}.lightbox img{max-width:90vw;max-height:90vh;border-radius:8px;object-fit:contain}.lightbox-close{position:absolute;top:16px;right:16px;width:36px;height:36px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:50%;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:background .2s}.lightbox-close:hover{background:rgba(255,255,255,.2)}.lightbox-close svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}
.qr-wrap,.barcode-wrap{display:flex;flex-direction:column;align-items:center;gap:14px}.qr-canvas{border-radius:8px;border:1px solid var(--border);background:#fff}.qr-input-row{display:flex;gap:8px;width:100%}.qr-input-row .f-input{flex:1}.qr-gen-btn{padding:0 16px;background:var(--accent);color:#fff;border:none;border-radius:var(--r-sm);font-family:var(--font-body);font-weight:600;font-size:12px;cursor:pointer;white-space:nowrap;transition:background .2s}.qr-gen-btn:hover{background:var(--accent-2)}.qr-text{font-size:12px;color:var(--ink-3);word-break:break-all;text-align:center}.barcode-canvas{border-radius:6px;background:#fff;padding:12px;border:1px solid var(--border)}.barcode-text{font-family:"Syne Mono",monospace;font-size:13px;color:var(--ink-2);letter-spacing:3px}
.xa-ext-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.xa-ext-gallery img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:var(--r-sm);display:block}.xa-ext-tree{border:1px solid var(--border2);border-radius:var(--r-sm);background:var(--surface);padding:10px 12px;color:var(--ink-2);font-size:13px;line-height:1.8}.xa-ext-tree ul{list-style:none;margin:0;padding-left:16px}.xa-ext-tree li::before{content:"\u203A";color:var(--accent);font-weight:800;margin-right:6px}
.xa-ext-code{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border2);border-radius:var(--r-sm);background:repeating-linear-gradient(45deg,var(--surface),var(--surface) 6px,var(--bg2) 6px,var(--bg2) 12px);color:var(--ink);font-family:"JetBrains Mono",monospace;font-weight:800;min-width:120px;min-height:72px;padding:16px;box-sizing:border-box}
.icon-grid{display:flex;flex-wrap:wrap;gap:8px}.icon-item{width:44px;height:44px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,border-color .15s;position:relative}.icon-item:hover{background:rgba(var(--accent-rgb),.12);border-color:var(--accent)}.icon-item svg{width:18px;height:18px;stroke:var(--ink-2);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.icon-item:hover svg{stroke:var(--accent-2)}.icon-container{display:inline-flex;align-items:center;justify-content:center;line-height:1}.icon-sizes{display:flex;align-items:center;gap:12px;margin-top:14px}.icon-sizes svg{stroke:var(--ink-2);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.divider{height:1px;background:var(--border);margin:16px 0}.divider--thick{height:2px;background:var(--border2)}.divider--dashed{height:0;border-top:1px dashed var(--border2)}.divider--gradient{height:1px;background:linear-gradient(to right,transparent,var(--accent),transparent)}.divider--label{display:flex;align-items:center;gap:12px;margin:16px 0}.divider--label::before,.divider--label::after{content:"";flex:1;height:1px;background:var(--border)}.divider--label span{font-size:11px;color:var(--ink-3);white-space:nowrap}
.tooltip-demo{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.tooltip-wrap{position:relative;display:inline-flex;z-index:0}.tooltip-wrap:hover{z-index:13000}.tooltip-target{padding:8px 16px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;font-size:12px;cursor:default;color:var(--ink-2);transition:background .15s}.tooltip-trigger{padding:8px 16px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;font-size:12px;cursor:pointer;color:var(--ink-2);transition:background .15s,color .15s;display:inline-flex;align-items:center;justify-content:center}.tooltip-target:hover,.tooltip-trigger:hover{background:var(--border2);color:var(--ink)}.tooltip-bubble{position:absolute;z-index:13100;background:var(--ink);color:var(--bg);font-size:11px;font-weight:500;padding:6px 10px;border-radius:5px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s}.tooltip{position:absolute;z-index:13100;background:var(--ink);color:var(--bg);font-size:11px;font-weight:500;padding:6px 10px;border-radius:5px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s}.tooltip-light{background:var(--surface);color:var(--ink);border:1px solid var(--border2);box-shadow:var(--shadow-md)}.tooltip-bubble::after,.tooltip-arrow{content:"";position:absolute;border:4px solid transparent}.tooltip-wrap.tip-top .tooltip-bubble,.tooltip-top{bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(4px)}.tooltip-wrap.tip-top .tooltip-bubble::after,.tooltip-top .tooltip-arrow{top:100%;left:50%;transform:translateX(-50%);border-top-color:var(--ink)}.tooltip-wrap.tip-top:hover .tooltip-bubble,.tooltip-top.open{opacity:1;transform:translateX(-50%) translateY(0)}.tooltip-wrap.tip-bottom .tooltip-bubble,.tooltip-bottom{top:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(-4px)}.tooltip-wrap.tip-bottom .tooltip-bubble::after,.tooltip-bottom .tooltip-arrow{bottom:100%;left:50%;transform:translateX(-50%);border-bottom-color:var(--ink)}.tooltip-wrap.tip-bottom:hover .tooltip-bubble,.tooltip-bottom.open{opacity:1;transform:translateX(-50%) translateY(0)}.tooltip-wrap.tip-right .tooltip-bubble,.tooltip-right{left:calc(100% + 8px);top:50%;transform:translateY(-50%) translateX(-4px)}.tooltip-wrap.tip-right .tooltip-bubble::after,.tooltip-right .tooltip-arrow{right:100%;top:50%;transform:translateY(-50%);border-right-color:var(--ink)}.tooltip-wrap.tip-right:hover .tooltip-bubble,.tooltip-right.open{opacity:1;transform:translateY(-50%) translateX(0)}.tooltip-left{right:calc(100% + 8px);top:50%;transform:translateY(-50%) translateX(4px)}.tooltip-left .tooltip-arrow{left:100%;top:50%;transform:translateY(-50%);border-left-color:var(--ink)}.tooltip-left.open{opacity:1;transform:translateY(-50%) translateX(0)}.tooltip-light .tooltip-arrow{border-top-color:var(--surface);border-bottom-color:var(--surface);border-left-color:var(--surface);border-right-color:var(--surface)}
.btn-sm{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:background .2s,transform .15s;border:none;font-family:var(--font-body)}.btn-sm:active{transform:scale(.96)}.btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{background:var(--accent-hover)}.btn-ghost{background:transparent;color:var(--ink-2);border:1px solid var(--border2)}.btn-ghost:hover{background:var(--surface2);color:var(--ink)}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s}.modal-backdrop.open,.modal-overlay.open{opacity:1;pointer-events:all}.modal-box{background:var(--surface);border:1px solid var(--border2);border-radius:14px;width:480px;max-width:calc(100vw - 32px);box-shadow:0 24px 80px rgba(0,0,0,.6);transform:scale(.95) translateY(10px);transition:transform .25s}.modal-content{background:var(--surface);border:1px solid var(--border2);border-radius:14px;width:480px;max-width:calc(100vw - 32px);box-shadow:0 24px 80px rgba(0,0,0,.6);transform:scale(.95) translateY(10px);transition:transform .25s;max-height:90vh;overflow-y:auto}.modal-backdrop.open .modal-box,.modal-overlay.open .modal-content{transform:scale(1) translateY(0)}.modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid var(--border)}.modal-header h3{font-family:"Syne",sans-serif;font-weight:700;font-size:17px;margin:0;color:var(--ink)}.modal-close{width:30px;height:30px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;color:var(--ink-2);display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}.modal-close:hover{background:var(--border2);color:var(--ink)}.modal-close svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}.modal-body{padding:20px 24px;font-size:13px;color:var(--ink-2);line-height:1.7}.modal-body p{margin:0}.modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:16px 24px 20px;border-top:1px solid var(--border)}.modal-trigger-btn{padding:10px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-family:var(--font-body);font-weight:600;font-size:13px;cursor:pointer;transition:background .2s}.modal-trigger-btn:hover{background:var(--accent-2)}
.xa-al-banner{position:relative;overflow:hidden;box-sizing:border-box;cursor:grab;display:block;touch-action:pan-y;user-select:none}
.xa-al-banner[data-orientation="vertical"]{touch-action:pan-x}
.xa-al-banner .banner-container{display:flex;width:100%;height:100%;box-sizing:border-box;transition:transform .42s cubic-bezier(.22,1,.36,1);will-change:transform}
.xa-al-banner .banner-slide{position:relative;flex:0 0 100%;width:100%;min-width:100%;height:100%;box-sizing:border-box;overflow:hidden}
.xa-al-banner .banner-slide>[data-component]{width:100%;height:100%;min-height:0}
.xa-al-banner img{user-select:none;-webkit-user-drag:none}
.banner-indicators{position:absolute;left:0;right:0;bottom:10px;width:100%;display:flex;justify-content:center;align-items:center;gap:8px;pointer-events:none;z-index:12}
.banner-indicator{width:8px;height:8px;border-radius:999px;border:0;padding:0;cursor:pointer;pointer-events:auto;transition:opacity .25s ease,transform .2s ease}
.banner-indicator[aria-current="true"]{opacity:1!important;transform:scale(1.15)}
.xa-ext-carousel-host{width:100%;max-width:100%;min-width:0;box-sizing:border-box;display:block;touch-action:pan-y;user-select:none;cursor:grab}
.xa-ext-carousel-host:active{cursor:grabbing}
.carousel-container{position:relative;border:1px solid var(--border);border-radius:var(--r-sm);overflow:hidden;background:var(--surface);height:100%;min-height:inherit;box-sizing:border-box;display:flex;flex-direction:column}
.carousel-content{flex:1;min-height:0;padding:8px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden}
.carousel-item{display:none;text-align:center;width:100%;height:100%;box-sizing:border-box;color:var(--ink-2)}
.carousel-item img,.carousel-img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;vertical-align:middle;border-radius:4px;user-select:none;-webkit-user-drag:none}
.carousel-title{margin:8px 0 4px;font-size:16px;font-weight:800;color:var(--ink);line-height:1.3}.carousel-desc{margin:4px 0 0;font-size:13px;line-height:1.5;color:var(--ink-2)}
.carousel-empty{display:block;text-align:center;padding:24px;color:var(--ink-3)}
.carousel-prev,.carousel-next{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border:0;border-radius:999px;background:rgba(0,0,0,.5);color:#fff;font-size:28px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;box-shadow:0 2px 8px rgba(0,0,0,.14)}
.carousel-prev{left:8px}.carousel-next{right:8px}.carousel-prev:hover,.carousel-next:hover{background:rgba(0,0,0,.64)}
.carousel-dots{text-align:center;margin-top:12px;padding:0 8px 12px;display:flex;align-items:center;justify-content:center;gap:8px}
.carousel-dot{display:inline-block;width:12px;height:12px;border-radius:50%;border:0;padding:0;background:#ccc;cursor:pointer}.carousel-dot.active,.carousel-dot[aria-current="true"]{background:var(--accent)}
.xa-chart-container,.xa-code-editor-container,.xa-rich-editor-container,.xa-dataviz-container,.xa-spangrid-container{min-width:0}
.xa-spangrid-container{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;box-sizing:border-box;color:var(--ink);font-family:var(--font-body)}
.xa-spangrid-surface{width:100%;height:100%;overflow:auto;background:var(--surface)}
.xa-spangrid-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;line-height:1.35}
.xa-spangrid-table th,.xa-spangrid-table td{border:1px solid var(--border);padding:6px 8px;min-width:72px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--surface);box-sizing:border-box}
.xa-spangrid-table th{background:var(--surface2);font-weight:700;color:var(--ink)}
.xa-spangrid-cell--fixed-row,.xa-spangrid-cell--fixed-col{position:sticky;background:var(--surface);box-shadow:0 0 0 1px var(--border);background-clip:padding-box}
.xa-spangrid-cell--fixed-row{background:var(--surface2);z-index:3}
.xa-spangrid-cell--fixed-col{z-index:2}
.xa-spangrid-cell--fixed-corner{z-index:4}
.xa-spangrid-empty{height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-3);font-size:13px}
.xa-spangrid-container--hydrated .xa-spangrid-table{pointer-events:none}
.xa-frame-hidden-scrollbar{-ms-overflow-style:none;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}.xa-frame-hidden-scrollbar::-webkit-scrollbar{display:none;width:0;height:0;background:transparent}
.xa-chart-preview,.xa-dataviz-preview{position:absolute;inset:10px;width:calc(100% - 20px);height:calc(100% - 20px);pointer-events:none}
.xa-code-editor-container textarea{background:#fff;color:#111}
.xa-rich-editor-toolbar{height:38px;display:flex;align-items:center;gap:6px;padding:0 10px;border-bottom:1px solid #ddd;background:#f8f9fa;box-sizing:border-box}.xa-rich-editor-toolbar span{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border:1px solid #ddd;border-radius:4px;background:#fff;font-size:12px;color:#444}.xa-rich-editor-surface{padding:12px;box-sizing:border-box;overflow:auto;color:#333}
.xa-dataviz-empty{height:100%;display:flex;align-items:center;justify-content:center;color:#888;font-size:13px}
.xa-flipbook-container .catalog-app{width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center}.xa-flipbook-container .flipbook-viewer{position:relative;display:flex;align-items:center;justify-content:center;min-width:600px;min-height:400px}.xa-flipbook-container .ui-flipbook{position:relative;margin:0 auto;box-shadow:0 4px 20px rgba(0,0,0,.3);border-radius:8px;overflow:visible}.xa-flipbook-container .ui-flipbook .page{background:white;border:1px solid #ddd;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;width:220px;height:320px}.xa-flipbook-container .ui-flipbook .page img{max-width:100%;max-height:100%;object-fit:contain}.page-content{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}.flipbook-page-placeholder{padding:20px;text-align:center;color:#666}.flipbook-controls{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);padding:10px;border-radius:5px;display:flex;gap:10px;z-index:1000}.flipbook-control-btn{background:#333;color:white;border:none;padding:8px 12px;border-radius:3px;cursor:pointer;font-size:14px}.flipbook-control-btn:hover{background:#555}.flipbook-page-info{color:white;display:flex;align-items:center;font-size:14px;margin:0 10px}.flipbook-miniatures{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);padding:10px;border-radius:5px;display:none;max-width:80%;overflow-x:auto}.flipbook-miniature{display:inline-block;width:60px;height:80px;margin:0 5px;cursor:pointer;border:2px solid transparent;border-radius:3px;overflow:hidden;background:transparent;padding:0}.flipbook-miniature:hover{border-color:#fff}.flipbook-miniature.active{border-color:#007bff}.flipbook-miniature img{width:100%;height:100%;object-fit:cover}.ui-arrow-control{position:absolute;top:50%;transform:translateY(-50%);width:50px;height:50px;background:rgba(0,0,0,.6);color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:1001;border-radius:25px;font-size:24px;font-weight:bold;transition:all .3s ease;border:2px solid rgba(255,255,255,.3)}.ui-arrow-control:hover{background:rgba(0,0,0,.8);border-color:rgba(255,255,255,.6);transform:translateY(-50%) scale(1.1)}.ui-arrow-next-page{right:10px}.ui-arrow-previous-page{left:10px}.ui-arrow-next-page::before{content:"\u203A"}.ui-arrow-previous-page::before{content:"\u2039"}
.xa-network-diagram-container{position:relative;background:linear-gradient(135deg,#f7fafc 0%,#e2e8f0 100%);border:none;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.1),0 8px 16px rgba(0,0,0,.06);backdrop-filter:blur(10px)}.network-svg{cursor:grab;transition:all .3s ease}.network-svg:active{cursor:grabbing}.network-node{cursor:pointer;stroke:#fff;stroke-width:3px;filter:drop-shadow(0 6px 12px rgba(0,0,0,.15));transition:stroke .2s ease,stroke-width .2s ease,filter .2s ease}.network-node:hover{stroke:var(--xcon-network-accent,#f093fb);stroke-width:4px;filter:drop-shadow(0 12px 24px rgba(0,0,0,.2))}.network-node.root-node{stroke:#fff;stroke-width:5px;filter:drop-shadow(0 8px 16px rgba(102,126,234,.4))}.network-node-group.selected .network-node{stroke:var(--xcon-network-selected,#f8fafc);stroke-width:5px}.network-node-group.highlighted .network-node{stroke:var(--xcon-network-neighbor,#60a5fa);stroke-width:4px}.network-node-group.selected.highlighted .network-node{stroke:var(--xcon-network-selected,#f8fafc);stroke-width:5px}.network-node-group.muted .network-node{opacity:var(--xcon-network-muted-opacity,.22)}.network-node.expanded{stroke:var(--xcon-network-accent,#f093fb);stroke-width:4px;filter:drop-shadow(0 6px 12px rgba(240,147,251,.3))}.network-link{fill:none;stroke:var(--xcon-network-link,#cbd5e0);stroke-width:3px;stroke-opacity:.7;transition:all .3s ease}.network-link:hover{stroke:var(--xcon-network-primary,#667eea);stroke-width:4px;stroke-opacity:.9}.network-link.highlighted{stroke:var(--xcon-network-selected,#f8fafc);stroke-opacity:1;stroke-width:4px}.network-link.muted{stroke-opacity:var(--xcon-network-muted-opacity,.22)}.network-link.folder-link{stroke-dasharray:8,4}.network-link.ref-link{stroke:var(--xcon-network-ref-link,#a0aec0);stroke-opacity:.5;stroke-width:2px;stroke-dasharray:8,4;animation:dash 2s linear infinite}@keyframes dash{to{stroke-dashoffset:-12}}.network-link.marker-only{stroke:var(--xcon-network-accent,#f093fb);stroke-opacity:.7;stroke-width:3px}.network-label{fill:var(--xcon-network-text,#2d3748);font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;font-weight:600;text-anchor:middle;pointer-events:none;user-select:none;text-shadow:0 2px 4px rgba(255,255,255,.8);transition:all .3s ease}.network-label:hover{fill:var(--xcon-network-primary,#667eea);font-weight:700}.network-label.root-label{font-weight:800;font-size:14px;fill:var(--xcon-network-primary,#667eea);text-shadow:0 3px 6px rgba(0,0,0,.15)}.network-tooltip{position:absolute;background:linear-gradient(135deg,rgba(102,126,234,.95) 0%,rgba(118,75,162,.95) 100%);color:white;padding:16px 20px;border-radius:12px;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-weight:500;pointer-events:none;opacity:0;transition:all .4s cubic-bezier(.4,0,.2,1);z-index:1000;box-shadow:0 12px 24px rgba(0,0,0,.2);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.3);text-align:center}.network-tooltip.show{opacity:1;transform:translateY(-4px)}.network-tooltip::before{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:8px solid transparent;border-top-color:rgba(102,126,234,.95)}.network-arrow{fill:var(--xcon-network-link,#cbd5e0);transition:all .3s ease}.network-arrow.ref-arrow{fill:var(--xcon-network-ref-link,#a0aec0)}.network-group{cursor:pointer;transition:all .3s ease}.network-border{fill:none;stroke:var(--xcon-network-ref-link,#a0aec0);stroke-width:2px;stroke-opacity:.4;stroke-dasharray:5,5;transition:all .3s ease}.network-border:hover{stroke:var(--xcon-network-primary,#667eea);stroke-opacity:.8;stroke-width:3px}.network-image{pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.1))}.loading-spinner{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:18px;color:var(--xcon-network-text,#2d3748);font-weight:500;animation:pulse 2s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.xa-network-toolbar{position:absolute;left:12px;top:12px;right:12px;z-index:5;display:flex;align-items:center;gap:8px;flex-wrap:wrap;pointer-events:none}.xa-network-toolbar>*{pointer-events:auto}.xa-network-toolbar input[type="search"]{width:220px;max-width:100%;height:34px;border:1px solid rgba(148,163,184,.22);border-radius:8px;background:rgba(15,23,42,.72);color:var(--xcon-network-text,#e5e7eb);outline:none;padding:0 12px;font:600 12px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:inset 0 0 0 1px rgba(255,255,255,.03),0 8px 20px rgba(0,0,0,.18);backdrop-filter:blur(14px)}.xa-network-toolbar input[type="search"]::placeholder{color:rgba(226,232,240,.56)}.xa-network-toolbar input[type="search"]:focus{border-color:var(--xcon-network-accent,#8b5cf6);box-shadow:0 0 0 3px rgba(139,92,246,.18),0 8px 20px rgba(0,0,0,.22)}.xa-network-toolbar button{height:34px;border:1px solid rgba(148,163,184,.22);border-radius:8px;background:rgba(15,23,42,.7);color:var(--xcon-network-text,#e5e7eb);padding:0 12px;font:800 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,.18);backdrop-filter:blur(14px);cursor:pointer;transition:background .16s,border-color .16s,transform .16s}.xa-network-toolbar button:hover{background:rgba(30,41,59,.88);border-color:rgba(226,232,240,.34);transform:translateY(-1px)}.xa-network-toolbar [data-xcon-network-legend]{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-height:34px;padding:3px 6px;border:1px solid rgba(148,163,184,.18);border-radius:999px;background:rgba(15,23,42,.48);box-shadow:0 8px 20px rgba(0,0,0,.16);backdrop-filter:blur(14px)}.xa-network-toolbar [data-xcon-network-legend-item]{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 8px;border-radius:999px;color:var(--xcon-network-text,#e5e7eb);font:700 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.xa-network-toolbar [data-xcon-network-legend-item]::before{content:"";width:7px;height:7px;border-radius:999px;background:var(--xcon-network-group-color,currentColor);box-shadow:0 0 0 2px rgba(255,255,255,.1)}.xa-network-filters{position:absolute;left:12px;top:58px;right:12px;z-index:5;display:flex;align-items:center;gap:6px;flex-wrap:wrap;pointer-events:none}.xa-network-filters>*{pointer-events:auto}.xa-network-filter-toggle{height:28px;border:1px solid rgba(148,163,184,.2);border-radius:999px;background:rgba(15,23,42,.58);color:var(--xcon-network-text,#e5e7eb);padding:0 9px;font:800 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.14);backdrop-filter:blur(12px);transition:background .16s,border-color .16s,opacity .16s}.xa-network-filter-toggle.enabled{background:rgba(59,130,246,.22);border-color:rgba(125,211,252,.46);color:#f8fafc}.xa-network-filter-toggle.disabled{opacity:.48}.xa-network-filter-toggle:hover{border-color:rgba(226,232,240,.36)}.xa-network-filters input[data-xcon-network-min-degree]{width:70px;height:28px;border:1px solid rgba(148,163,184,.2);border-radius:999px;background:rgba(15,23,42,.58);color:var(--xcon-network-text,#e5e7eb);padding:0 10px;font:800 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;outline:none;box-shadow:0 6px 16px rgba(0,0,0,.14);backdrop-filter:blur(12px)}.xa-network-filters input[data-xcon-network-min-degree]:focus{border-color:var(--xcon-network-accent,#8b5cf6);box-shadow:0 0 0 3px rgba(139,92,246,.18),0 6px 16px rgba(0,0,0,.18)}.network-tooltip{max-width:240px;padding:10px 12px;border-radius:8px;font:800 12px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;letter-spacing:0;background:linear-gradient(135deg,rgba(102,126,234,.95) 0%,rgba(118,75,162,.95) 100%);box-shadow:0 14px 34px rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.28);transform:translate(-50%,calc(-100% - 8px));transition:opacity .16s,transform .16s}.network-tooltip.show{opacity:1;transform:translate(-50%,calc(-100% - 12px))}.network-tooltip::before{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:8px solid transparent;border-top-color:rgba(102,126,234,.95)}
.xa-map-container{position:relative;background:#eef3ed;border:1px solid #d5dee7;border-radius:10px;overflow:hidden}.xa-map-static{position:relative;width:100%;height:100%;min-height:180px;overflow:hidden;background:#e8efe5}.xa-map-static::before{content:"";position:absolute;inset:0;background-image:linear-gradient(0deg,rgba(132,153,166,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(132,153,166,.18) 1px,transparent 1px),linear-gradient(45deg,rgba(255,255,255,.42) 16%,transparent 16.5%,transparent 83%,rgba(255,255,255,.42) 83.5%);background-size:64px 64px,64px 64px,96px 96px;opacity:.9}.xa-map-static::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 24% 28%,rgba(255,255,255,.46),transparent 28%),radial-gradient(circle at 74% 72%,rgba(255,255,255,.36),transparent 24%);pointer-events:none}.xa-map-static--snapshot::before,.xa-map-static--snapshot::after,.xa-map-static--leaflet::before,.xa-map-static--leaflet::after{display:none}.xa-map-snapshot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;z-index:1;background:#dfe7dc}.xa-map-layer{position:absolute;display:block;pointer-events:none}.xa-map-water{left:-10%;top:58%;width:120%;height:70px;border-radius:999px;background:linear-gradient(90deg,rgba(126,190,217,.62),rgba(167,213,231,.8),rgba(126,190,217,.58));transform:rotate(-7deg);box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);opacity:.9}.xa-map-park{background:rgba(129,190,112,.34);border:1px solid rgba(86,145,91,.16);border-radius:18px}.xa-map-park--north{left:5%;top:9%;width:28%;height:30%;transform:rotate(-12deg)}.xa-map-park--south{right:8%;bottom:8%;width:30%;height:28%;transform:rotate(8deg)}.xa-map-road{background:rgba(255,255,255,.95);border-radius:999px;box-shadow:0 0 0 1px rgba(151,163,176,.26),0 2px 7px rgba(79,92,111,.1)}.xa-map-road--main{left:-8%;top:47%;width:116%;height:18px;transform:rotate(-13deg)}.xa-map-road--cross{left:20%;top:-8%;width:16px;height:116%;transform:rotate(19deg)}.xa-map-road--vertical{left:63%;top:-10%;width:14px;height:120%;transform:rotate(-4deg)}.xa-map-road--ring{left:55%;top:18%;width:126px;height:88px;border:10px solid rgba(255,255,255,.92);border-radius:999px;background:transparent;box-shadow:0 0 0 1px rgba(151,163,176,.26),0 3px 8px rgba(79,92,111,.1)}.xa-map-label{z-index:5;color:#5f6f5d;background:rgba(255,255,255,.72);border:1px solid rgba(137,154,135,.25);border-radius:999px;padding:3px 7px;font-size:10px;font-weight:700;letter-spacing:.01em;box-shadow:0 2px 6px rgba(74,87,71,.12)}.xa-map-label--north{left:8%;top:12%}.xa-map-label--center{left:42%;top:35%}.xa-map-label--south{right:9%;bottom:14%}.xa-map-attribution{position:absolute;right:8px;bottom:6px;z-index:10;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.76);color:#6b7280;font-size:9px;box-shadow:0 1px 4px rgba(0,0,0,.1)}.xa-map-marker{position:absolute;z-index:9;transform:translate(-50%,-100%);min-width:24px;height:24px;border-radius:999px;background:#667eea;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,.24);border:2px solid rgba(255,255,255,.8)}.xcon-leaflet-marker{width:28px!important;height:28px!important;margin-left:-14px!important;margin-top:-28px!important;background:#2563eb;border:2px solid #fff;border-radius:999px;box-shadow:0 8px 18px rgba(15,23,42,.34);color:#fff;display:flex!important;align-items:center;justify-content:center;font:800 11px/1 system-ui,sans-serif}.xcon-leaflet-marker::after{content:"";position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);border:7px solid transparent;border-top-color:#2563eb}.xcon-leaflet-marker--rain,.xcon-leaflet-marker--wind{background:#0ea5e9}.xcon-leaflet-marker--rain::after,.xcon-leaflet-marker--wind::after{border-top-color:#0ea5e9}.xcon-leaflet-marker--cloud,.xcon-leaflet-marker--cool{background:#64748b}.xcon-leaflet-marker--cloud::after,.xcon-leaflet-marker--cool::after{border-top-color:#64748b}.xcon-leaflet-marker--sun{background:#f97316}.xcon-leaflet-marker--sun::after{border-top-color:#f97316}.xa-map .leaflet-control-container{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif}.xa-map .leaflet-popup-content-wrapper{border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15)}.xa-map .leaflet-popup-content{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.4}
.xa-calendar-container{position:relative;background:#fff;border:1px solid #dee2e6;border-radius:8px;overflow:hidden;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif}.xa-calendar-static{height:100%;display:flex;flex-direction:column;padding:12px;box-sizing:border-box}.fc-header-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.fc-button-primary{background:#667eea;border:1px solid #667eea;color:#fff;border-radius:4px;padding:5px 10px}.xa-calendar .fc-button-primary:hover{background:#5a67d8;border-color:#5a67d8}.fc-scrollgrid{width:100%;border-collapse:collapse;table-layout:fixed;flex:1}.fc-scrollgrid th{background:#f8f9fa;color:#495057;font-size:12px;border:1px solid #dee2e6;padding:6px}.fc-scrollgrid td{height:34px;border:1px solid #dee2e6;vertical-align:top;padding:2px}.fc-daygrid-day-number{background:none;border:0;color:#495057;font-size:12px;padding:2px 4px}.fc-today{background:rgba(102,126,234,.1)!important}.xa-calendar .fc-theme-standard .fc-scrollgrid{border:1px solid #dee2e6}.xa-calendar .fc-theme-standard .fc-col-header-cell{background:#f8f9fa;border-color:#dee2e6}.xa-calendar .fc-theme-standard .fc-daygrid-day{border-color:#dee2e6}.xa-calendar .fc-button-primary{background:#667eea;border-color:#667eea}.xa-calendar .fc-event{border-radius:4px;border:none;padding:2px 4px}.xa-calendar .fc-event-title{font-weight:500}.xa-calendar .fc-today{background:rgba(102,126,234,.1)!important}
.xa-map-loading,.xa-calendar-loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,.9);padding:20px;border-radius:8px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.1);display:none}.xa-map-loading .spinner,.xa-calendar-loading .spinner{width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #667eea;border-radius:50%;animation:xa-advanced-spin 1s linear infinite;margin:0 auto 10px}@keyframes xa-advanced-spin{to{transform:rotate(360deg)}}
`.trim();
var viewerScript = `
(() => {
  const states = new WeakMap();
  const extStates = new WeakMap();
  const shapeImageStates = new WeakMap();
  const transition = 'transform .42s cubic-bezier(.22,1,.36,1)';
  function stateFor(banner) {
    let state = states.get(banner);
    if (!state) {
      state = { index: 0, timer: null, bound: false, width: 0, startX: 0, startY: 0, dragging: false };
      states.set(banner, state);
    }
    return state;
  }
  function sync(banner) {
    const track = banner.querySelector('.banner-container');
    if (!track) return 0;
    const slides = Array.from(track.children);
    const state = stateFor(banner);
    const vertical = banner.dataset.orientation === 'vertical';
    const rawAxis = vertical ? banner.clientHeight || banner.offsetHeight : banner.clientWidth || banner.offsetWidth;
    let axis = Math.round(rawAxis || state.width || 0);
    if (axis && state.width && Math.abs(axis - state.width) <= 2) axis = state.width;
    if (!axis) return 0;
    state.width = axis;
    track.style.display = 'flex';
    track.style.flexDirection = vertical ? 'column' : 'row';
    track.style.width = vertical ? '100%' : String(axis * slides.length) + 'px';
    track.style.height = vertical ? String(axis * slides.length) + 'px' : '100%';
    slides.forEach((slide) => {
      slide.style.flex = '0 0 ' + axis + 'px';
      slide.style.width = vertical ? '100%' : axis + 'px';
      slide.style.minWidth = vertical ? '0' : axis + 'px';
      slide.style.maxWidth = vertical ? '' : axis + 'px';
      slide.style.height = vertical ? axis + 'px' : '100%';
      slide.style.minHeight = vertical ? axis + 'px' : '0';
      slide.style.maxHeight = vertical ? axis + 'px' : '';
      slide.style.boxSizing = 'border-box';
    });
    return axis;
  }
  function logicalCount(banner) {
    return Number(banner.dataset.slideCount || banner.querySelectorAll('.banner-indicator').length || 0);
  }
  function updateDots(banner) {
    const state = stateFor(banner);
    const count = logicalCount(banner);
    const current = count ? state.index % count : 0;
    banner.querySelectorAll('.banner-indicator').forEach((dot, index) => {
      const on = index === current;
      dot.style.opacity = on ? '1' : '0.5';
      dot.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }
  function setTrackOffset(banner, offset) {
    const track = banner.querySelector('.banner-container');
    if (!track) return;
    track.style.transform = banner.dataset.orientation === 'vertical' ? 'translate3d(0,' + Math.round(offset) + 'px,0)' : 'translate3d(' + Math.round(offset) + 'px,0,0)';
  }
  function goTo(banner, index, noTransition) {
    const track = banner.querySelector('.banner-container');
    if (!track) return;
    const state = stateFor(banner);
    const axis = sync(banner);
    if (!axis) return;
    state.index = Math.max(0, index);
    track.style.transition = noTransition ? 'none' : transition;
    const offset = -Math.round(state.index * axis);
    setTrackOffset(banner, offset);
    updateDots(banner);
    const rolling = banner.dataset.rolling === 'true';
    const loop = banner.dataset.loop === 'true';
    const count = logicalCount(banner);
    if (rolling && loop && count > 1 && state.index === count) {
      window.setTimeout(() => {
        track.style.transition = 'none';
        state.index = 0;
        setTrackOffset(banner, 0);
        updateDots(banner);
        void track.offsetHeight;
        track.style.transition = transition;
      }, 430);
    }
  }
  function next(banner) {
    const state = stateFor(banner);
    const count = logicalCount(banner);
    if (!count) return;
    const rolling = banner.dataset.rolling === 'true';
    const loop = banner.dataset.loop === 'true';
    if (state.index < count - 1) goTo(banner, state.index + 1);
    else if (rolling && loop) goTo(banner, count);
    else if (loop) goTo(banner, 0);
  }
  function start(banner) {
    const state = stateFor(banner);
    if (state.timer) window.clearInterval(state.timer);
    if (banner.dataset.autoScroll !== 'true') return;
    const duration = Math.max(800, Number(banner.dataset.duration || 3000));
    state.timer = window.setInterval(() => next(banner), duration);
  }
  function bind(banner) {
    const state = stateFor(banner);
    if (state.bound) return;
    state.bound = true;
    banner.querySelectorAll('.banner-indicator').forEach((dot) => {
      dot.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const idx = Number(dot.getAttribute('data-xcon-banner-dot') || 0);
        goTo(banner, idx);
        start(banner);
      });
    });
    banner.addEventListener('pointerdown', (event) => {
      state.dragging = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      if (state.timer) window.clearInterval(state.timer);
      state.timer = null;
      banner.setPointerCapture && banner.setPointerCapture(event.pointerId);
      const track = banner.querySelector('.banner-container');
      if (track) track.style.transition = 'none';
    });
    banner.addEventListener('pointermove', (event) => {
      if (!state.dragging) return;
      const axis = sync(banner);
      if (!axis) return;
      const track = banner.querySelector('.banner-container');
      if (!track) return;
      const vertical = banner.dataset.orientation === 'vertical';
      let delta = vertical ? event.clientY - state.startY : event.clientX - state.startX;
      const count = logicalCount(banner);
      const loop = banner.dataset.loop === 'true';
      if (!loop && ((state.index === 0 && delta > 0) || (state.index >= count - 1 && delta < 0))) delta *= 0.35;
      track.style.transition = 'none';
      setTrackOffset(banner, -Math.round(state.index * axis) + delta);
    });
    const finishDrag = (event, canceled) => {
      if (!state.dragging) return;
      state.dragging = false;
      if (banner.releasePointerCapture && event) {
        try { banner.releasePointerCapture(event.pointerId); } catch {}
      }
      const vertical = banner.dataset.orientation === 'vertical';
      const delta = canceled ? 0 : vertical ? event.clientY - state.startY : event.clientX - state.startX;
      if (!canceled && Math.abs(delta) > 40) {
        delta < 0 ? next(banner) : goTo(banner, Math.max(0, state.index - 1));
      } else {
        goTo(banner, state.index);
      }
      start(banner);
    };
    banner.addEventListener('pointerup', (event) => finishDrag(event, false));
    banner.addEventListener('pointercancel', (event) => finishDrag(event, true));
    window.addEventListener('resize', () => goTo(banner, state.index, true));
  }
  function hydrateTextFields(root) {
    (root || document).querySelectorAll('[data-xcon-tf-toggle="visibility"]').forEach((button) => {
      if (button.dataset.xconTfBound === 'true') return;
      button.dataset.xconTfBound = 'true';
      button.addEventListener('click', () => {
        const wrap = button.closest('.xa-al-tf-addon-wrap,.xa-al-tf-block-wrap,.xa-al-tf-float-group,.pw-wrap');
        const input = wrap && wrap.querySelector('input.xa-al-tf,input.f-input');
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
    (root || document).querySelectorAll('[data-xcon-tf-clear]').forEach((button) => {
      if (button.dataset.xconTfClearBound === 'true') return;
      button.dataset.xconTfClearBound = 'true';
      button.addEventListener('click', () => {
        const wrap = button.closest('.xa-al-tf-addon-wrap,.xa-al-tf-block-wrap,.xa-al-tf-float-group');
        const input = wrap && wrap.querySelector('input.xa-al-tf');
        if (!input || input.disabled || input.readOnly) return;
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.focus();
      });
    });
    (root || document).querySelectorAll('[data-xcon-pw-strength]').forEach((strength) => {
      if (strength.dataset.xconPwBound === 'true') return;
      strength.dataset.xconPwBound = 'true';
      const host = strength.closest('.xa-ext-password-host');
      const input = host && host.querySelector('input.f-input');
      const hint = host && host.querySelector('[data-xcon-pw-hint]');
      const bars = Array.from(strength.querySelectorAll('.pw-strength__bar'));
      const sync = () => {
        const val = input ? input.value || '' : '';
        let score = 0;
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;
        const levels = ['', 'weak', 'medium', 'strong', 'strong'];
        const labels = ['', 'Weak', 'Medium', 'Strong', 'Very Strong'];
        bars.forEach((bar, index) => {
          bar.className = 'pw-strength__bar';
          if (index < score && levels[score]) bar.classList.add(levels[score]);
        });
        if (hint) hint.textContent = val ? 'Strength: ' + labels[score] : '';
      };
      if (input) input.addEventListener('input', sync);
      sync();
    });
    (root || document).querySelectorAll('textarea.f-textarea[data-xcon-ta]').forEach((textarea) => {
      if (textarea.dataset.xconTaBound === 'true') return;
      textarea.dataset.xconTaBound = 'true';
      const host = textarea.closest('.xa-ext-textarea-host');
      const count = host && host.querySelector('[data-xcon-ta-count]');
      const sync = () => { if (count) count.textContent = String((textarea.value || '').length); };
      textarea.addEventListener('input', sync);
      sync();
    });
    (root || document).querySelectorAll('input.xa-al-tf-float').forEach((input) => {
      const sync = () => input.classList.toggle('xa-al-tf-float--has-val', input.value.length > 0);
      sync();
      if (input.dataset.xconFloatBound === 'true') return;
      input.dataset.xconFloatBound = 'true';
      input.addEventListener('input', sync);
    });
    const groups = new Map();
    (root || document).querySelectorAll('input.xa-al-tf--otp[data-xa-otp-index]').forEach((input) => {
      const group = input.dataset.xaOtpGroup || 'default';
      const items = groups.get(group) || [];
      items.push(input);
      groups.set(group, items);
    });
    groups.forEach((inputs) => {
      inputs.sort((a, b) => Number(a.dataset.xaOtpIndex || 0) - Number(b.dataset.xaOtpIndex || 0));
      inputs.forEach((input, index) => {
        if (input.dataset.xconOtpBound === 'true') return;
        input.dataset.xconOtpBound = 'true';
        input.addEventListener('input', () => {
          input.value = input.value.replace(/\\D/g, '').slice(0, 1);
          if (input.value && inputs[index + 1]) inputs[index + 1].focus();
        });
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Backspace' && !input.value && inputs[index - 1]) inputs[index - 1].focus();
        });
      });
    });
  }
  function hydrateTextViews(root) {
    (root || document).querySelectorAll('[data-xa-trunc-toggle]').forEach((button) => {
      if (button.dataset.xconTvBound === 'true') return;
      button.dataset.xconTvBound = 'true';
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-xa-trunc-toggle');
        const target = id && (root || document).querySelector('#' + CSS.escape(id));
        if (!target) return;
        const collapsed = target.classList.toggle('collapsed');
        button.textContent = collapsed ? 'Read more \u2193' : 'Show less \u2191';
      });
    });
  }
  function hydrateLayoutShowcases(root) {
    (root || document).querySelectorAll('[data-xcon-grid-showcase]').forEach((demo) => {
      if (demo.dataset.xconGridBound === 'true') return;
      demo.dataset.xconGridBound = 'true';
      const canvas = demo.querySelector('.grid-canvas');
      demo.querySelectorAll('.grid-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          demo.querySelectorAll('.grid-pill').forEach((item) => item.classList.remove('active'));
          pill.classList.add('active');
          const cols = pill.getAttribute('data-cols');
          if (canvas) canvas.style.gridTemplateColumns = cols === 'auto' ? 'repeat(auto-fill,minmax(80px,1fr))' : 'repeat(' + cols + ',1fr)';
        });
      });
    });
    (root || document).querySelectorAll('[data-xcon-flex-showcase]').forEach((demo) => {
      if (demo.dataset.xconFlexBound === 'true') return;
      demo.dataset.xconFlexBound = 'true';
      const canvas = demo.querySelector('[data-xcon-flex-canvas]');
      const justify = demo.querySelector('[data-xcon-flex-justify]');
      const align = demo.querySelector('[data-xcon-flex-align]');
      const sync = () => {
        if (!canvas) return;
        if (justify) canvas.style.justifyContent = justify.value;
        if (align) canvas.style.alignItems = align.value;
      };
      if (justify) justify.addEventListener('change', sync);
      if (align) align.addEventListener('change', sync);
      sync();
    });
  }
  let customSelectDocBound = false;
  function ensureCustomSelectDocClose() {
    if (customSelectDocBound) return;
    customSelectDocBound = true;
    document.addEventListener('click', (event) => {
      document.querySelectorAll('.custom-select.open').forEach((select) => {
        if (!select.contains(event.target)) select.classList.remove('open');
      });
    });
  }
  function hydrateCustomSelects(root) {
    ensureCustomSelectDocClose();
    (root || document).querySelectorAll('[data-xcon-custom-select="true"]').forEach((select) => {
      if (select.dataset.xconCustomSelectBound === 'true') return;
      select.dataset.xconCustomSelectBound = 'true';
      const trigger = select.querySelector('[data-xcon-custom-select-trigger]');
      const value = select.querySelector('[data-xcon-custom-select-value]');
      const toggle = (event) => {
        event.preventDefault();
        event.stopPropagation();
        document.querySelectorAll('.custom-select.open').forEach((open) => {
          if (open !== select) open.classList.remove('open');
        });
        select.classList.toggle('open');
      };
      if (trigger) {
        trigger.addEventListener('click', toggle);
        trigger.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') toggle(event);
          if (event.key === 'Escape') select.classList.remove('open');
        });
      }
      select.querySelectorAll('[data-xcon-custom-select-option]').forEach((option) => {
        option.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          select.querySelectorAll('[data-xcon-custom-select-option]').forEach((item) => item.classList.remove('selected'));
          option.classList.add('selected');
          if (value) value.textContent = option.textContent || '';
          select.classList.remove('open');
        });
      });
    });
  }
  function rangeFillPercent(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || min);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return '0.0';
    const clamped = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
    return (((clamped - min) / (max - min)) * 100).toFixed(1);
  }
  function syncRange(input) {
    input.style.setProperty('--fill', rangeFillPercent(input) + '%');
    const targetId = input.getAttribute('data-xcon-range-value-target');
    const target = targetId && document.getElementById(targetId);
    if (target) target.textContent = input.value;
  }
  function hydrateRanges(root) {
    (root || document).querySelectorAll('input.f-range[data-xcon-range]').forEach((input) => {
      if (input.dataset.xconRangeBound !== 'true') {
        input.dataset.xconRangeBound = 'true';
        input.addEventListener('input', () => syncRange(input));
      }
      syncRange(input);
    });
  }
  function hydrateSwitches(root) {
    (root || document).querySelectorAll('input[data-xcon-switch]').forEach((input) => {
      const syncSwitch = () => input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      if (input.dataset.xconSwitchBound !== 'true') {
        input.dataset.xconSwitchBound = 'true';
        input.addEventListener('change', syncSwitch);
      }
      syncSwitch();
    });
  }
  function hydrateDisclosureControls(root) {
    (root || document).querySelectorAll('[data-xcon-tabs-nav]').forEach((nav) => {
      if (nav.dataset.xconTabsBound === 'true') return;
      nav.dataset.xconTabsBound = 'true';
      const scope = nav.closest('.tabs-wrap') || nav.parentElement;
      nav.querySelectorAll('[data-xcon-tabs-button]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = button.getAttribute('data-tab');
          nav.querySelectorAll('[data-xcon-tabs-button]').forEach((item) => {
            const active = item === button;
            item.classList.toggle('active', active);
            item.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          if (scope) scope.querySelectorAll('.tab-content').forEach((panel) => panel.classList.toggle('active', panel.id === id));
        });
      });
    });
    (root || document).querySelectorAll('.tabs-header').forEach((header) => {
      if (header.dataset.xconTabsSingleBound === 'true') return;
      const buttons = Array.from(header.querySelectorAll('[data-xcon-tabs-single-tab]'));
      if (!buttons.length) return;
      header.dataset.xconTabsSingleBound = 'true';
      const scope = header.closest('.tabs-container');
      const panels = scope ? Array.from(scope.querySelectorAll('.tabs-content .tab-content')) : [];
      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          const id = button.getAttribute('data-tab');
          buttons.forEach((item) => {
            const active = item === button;
            item.classList.toggle('active', active);
            item.setAttribute('aria-selected', active ? 'true' : 'false');
            syncSingleTabsVisualState(header, item, active);
          });
          panels.forEach((panel) => {
            panel.style.display = panel.id === id ? 'block' : 'none';
          });
        });
      });
    });
    (root || document).querySelectorAll('[data-xcon-accordion-toggle]').forEach((button) => {
      if (button.dataset.xconAccordionBound === 'true') return;
      button.dataset.xconAccordionBound = 'true';
      button.addEventListener('click', () => {
        const item = button.closest('.accordion-item');
        if (!item) return;
        const content = item.querySelector('.accordion-content');
        const arrow = item.querySelector('.accordion-arrow');
        if (content) {
          const container = item.closest('.xa-ext-accordion-host');
          const multiple = button.getAttribute('data-xcon-accordion-multiple') === 'true';
          const open = content.style.display !== 'block';
          if (!multiple && container) {
            container.querySelectorAll('.accordion-content').forEach((panel) => {
              panel.style.display = 'none';
            });
            container.querySelectorAll('.accordion-arrow').forEach((icon) => {
              icon.style.transform = 'rotate(0deg)';
            });
            container.querySelectorAll('[data-xcon-accordion-toggle]').forEach((toggle) => {
              toggle.setAttribute('aria-expanded', 'false');
            });
          }
          content.style.display = open ? 'block' : 'none';
          if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
          button.setAttribute('aria-expanded', open ? 'true' : 'false');
          return;
        }
        const body = item.querySelector('.accordion-body');
        const open = !item.classList.contains('open');
        item.classList.toggle('open', open);
        button.classList.toggle('expanded', open);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (body) body.style.maxHeight = open ? body.scrollHeight + 'px' : '0';
      });
    });
    (root || document).querySelectorAll('[data-xcon-alert-close]').forEach((button) => {
      if (button.dataset.xconAlertBound === 'true') return;
      button.dataset.xconAlertBound = 'true';
      button.addEventListener('click', () => {
        const alert = button.closest('.alert');
        if (alert) alert.remove();
      });
    });
    (root || document).querySelectorAll('[data-xcon-search-single]').forEach((search) => {
      if (search.dataset.xconSearchSingleBound === 'true') return;
      search.dataset.xconSearchSingleBound = 'true';
      const input = search.querySelector('[data-xcon-search-single-input]');
      const clear = search.querySelector('[data-xcon-search-single-clear]');
      const submit = search.querySelector('[data-xcon-search-single-submit]');
      const rawDelay = Number(input ? input.getAttribute('data-xcon-search-debounce-delay') : 0);
      const debounceDelay = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 0;
      let debounceTimer = 0;
      const sync = () => {
        if (clear && input) clear.style.display = input.value ? '' : 'none';
      };
      const emitInput = () => {
        if (!input) return;
        search.dispatchEvent(new CustomEvent('xcon-search-input', { bubbles: true, detail: { value: input.value } }));
      };
      const scheduleInput = () => {
        sync();
        if (debounceTimer) window.clearTimeout(debounceTimer);
        if (debounceDelay > 0) {
          debounceTimer = window.setTimeout(emitInput, debounceDelay);
        } else {
          emitInput();
        }
      };
      if (input) {
        input.addEventListener('input', scheduleInput);
        input.addEventListener('keypress', (event) => {
          if (event.key === 'Enter' && submit) submit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
      }
      if (clear) {
        clear.addEventListener('click', () => {
          if (!input) return;
          input.value = '';
          scheduleInput();
          input.focus();
        });
      }
      sync();
    });
    (root || document).querySelectorAll('[data-xcon-search]').forEach((search) => {
      if (search.dataset.xconSearchBound === 'true') return;
      search.dataset.xconSearchBound = 'true';
      const input = search.querySelector('[data-xcon-search-field]');
      const clear = search.querySelector('[data-xcon-search-clear]');
      const results = input ? document.getElementById(input.getAttribute('data-xcon-search-field')) : null;
      const sync = () => {
        if (clear) clear.classList.toggle('show', !!(input && input.value));
        if (results) results.classList.toggle('show', !!(document.activeElement === input || (input && input.value)));
      };
      if (input) {
        input.addEventListener('input', sync);
        input.addEventListener('focus', sync);
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && results) results.classList.remove('show');
        });
      }
      if (clear) clear.addEventListener('click', () => {
        if (!input) return;
        input.value = '';
        input.focus();
        sync();
      });
      if (results) {
        results.querySelectorAll('.search-result-item').forEach((item) => {
          item.addEventListener('click', () => {
            const label = item.querySelector('.label');
            if (input && label) input.value = label.textContent || '';
            results.classList.remove('show');
            sync();
          });
        });
      }
      sync();
    });
  }
  function syncSingleTabsVisualState(header, button, active) {
    const container = header.closest('.tabs-container');
    const host = container && container.closest('.xa-ext-tabs-host');
    const variant = (host && host.getAttribute('data-tabs-variant')) ||
      (header.classList.contains('tabs-header-underline') ? 'underline' : header.classList.contains('tabs-header-pills') ? 'pills' : 'default');
    const position = (host && host.getAttribute('data-tabs-position')) ||
      (container && container.classList.contains('tabs-position-bottom') ? 'bottom' :
        container && container.classList.contains('tabs-position-left') ? 'left' :
          container && container.classList.contains('tabs-position-right') ? 'right' : 'top');
    const radiusByPos = { top: '4px 4px 0 0', bottom: '0 0 4px 4px', left: '4px 0 0 4px', right: '0 4px 4px 0' };
    const underlineSide = { top: 'borderBottom', bottom: 'borderTop', left: 'borderRight', right: 'borderLeft' }[position] || 'borderBottom';
    button.style.borderTop = 'none';
    button.style.borderRight = 'none';
    button.style.borderBottom = 'none';
    button.style.borderLeft = 'none';
    if (variant === 'underline') {
      button.style.backgroundColor = 'transparent';
      button.style.color = active ? '#007bff' : '#6b7280';
      button.style.border = 'none';
      button.style[underlineSide] = '2px solid ' + (active ? '#007bff' : 'transparent');
      button.style.borderRadius = '0';
    } else if (variant === 'pills') {
      button.style.backgroundColor = active ? '#007bff' : '#e9ecef';
      button.style.color = active ? 'white' : '#495057';
      button.style.border = 'none';
      button.style.borderRadius = '20px';
    } else {
      button.style.backgroundColor = active ? '#007bff' : '#f8f9fa';
      button.style.color = active ? 'white' : '#333';
      button.style.border = '1px solid #ddd';
      button.style.borderRadius = radiusByPos[position] || radiusByPos.top;
    }
  }
  function extStateFor(carousel) {
    let state = extStates.get(carousel);
    if (!state) {
      state = { index: 0, timer: null, bound: false, startX: 0, startY: 0, dragging: false };
      extStates.set(carousel, state);
    }
    return state;
  }
  function extCarouselItems(carousel) {
    return Array.from(carousel.querySelectorAll('.carousel-content .carousel-item'));
  }
  function syncExtCarousel(carousel) {
    const state = extStateFor(carousel);
    const items = extCarouselItems(carousel);
    const count = items.length;
    if (!count) return;
    state.index = ((state.index % count) + count) % count;
    items.forEach((item, index) => {
      item.style.display = index === state.index ? 'block' : 'none';
    });
    carousel.querySelectorAll('.carousel-dot').forEach((dot, index) => {
      const active = index === state.index;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }
  function goToExtCarousel(carousel, index) {
    const items = extCarouselItems(carousel);
    if (!items.length) return;
    const state = extStateFor(carousel);
    state.index = ((index % items.length) + items.length) % items.length;
    syncExtCarousel(carousel);
  }
  function nextExtCarousel(carousel) {
    const state = extStateFor(carousel);
    goToExtCarousel(carousel, state.index + 1);
  }
  function previousExtCarousel(carousel) {
    const state = extStateFor(carousel);
    goToExtCarousel(carousel, state.index - 1);
  }
  function startExtCarouselAutoplay(carousel) {
    const state = extStateFor(carousel);
    if (state.timer) window.clearInterval(state.timer);
    state.timer = null;
    if (carousel.dataset.carouselAutoplay !== 'true') return;
    const interval = Math.max(800, Number(carousel.dataset.carouselInterval || 3000));
    state.timer = window.setInterval(() => nextExtCarousel(carousel), interval);
  }
  function hydrateExtCarousels(root) {
    (root || document).querySelectorAll('[data-xcon-ext-carousel="true"]').forEach((carousel) => {
      const state = extStateFor(carousel);
      if (!state.bound) {
        state.bound = true;
        const restart = () => startExtCarouselAutoplay(carousel);
        const prev = carousel.querySelector('[data-xcon-carousel-prev]');
        const next = carousel.querySelector('[data-xcon-carousel-next]');
        if (prev) prev.addEventListener('click', (event) => {
          event.preventDefault();
          previousExtCarousel(carousel);
          restart();
        });
        if (next) next.addEventListener('click', (event) => {
          event.preventDefault();
          nextExtCarousel(carousel);
          restart();
        });
        carousel.querySelectorAll('[data-xcon-carousel-dot]').forEach((dot) => {
          dot.addEventListener('click', (event) => {
            event.preventDefault();
            goToExtCarousel(carousel, Number(dot.getAttribute('data-xcon-carousel-dot') || 0));
            restart();
          });
        });
        carousel.addEventListener('pointerdown', (event) => {
          if (event.target && event.target.closest && event.target.closest('button')) return;
          state.dragging = true;
          state.startX = event.clientX;
          state.startY = event.clientY;
          if (state.timer) window.clearInterval(state.timer);
          state.timer = null;
          if (typeof carousel.setPointerCapture === 'function') carousel.setPointerCapture(event.pointerId);
        });
        const finishDrag = (event, canceled) => {
          if (!state.dragging) return;
          state.dragging = false;
          if (typeof carousel.releasePointerCapture === 'function') {
            try { carousel.releasePointerCapture(event.pointerId); } catch {}
          }
          const delta = canceled ? 0 : event.clientX - state.startX;
          if (!canceled && Math.abs(delta) > 40) {
            if (delta < 0) nextExtCarousel(carousel);
            else previousExtCarousel(carousel);
          } else {
            syncExtCarousel(carousel);
          }
          restart();
        };
        carousel.addEventListener('pointerup', (event) => finishDrag(event, false));
        carousel.addEventListener('pointercancel', (event) => finishDrag(event, true));
        carousel.addEventListener('mouseleave', restart);
      }
      syncExtCarousel(carousel);
      startExtCarouselAutoplay(carousel);
    });
  }
  function hydratePickerControls(root) {
    const pickerSuffix = (picker, fallback) => String(picker.getAttribute('data-xcon-picker-suffix') || picker.getAttribute('data-key') || picker.id || fallback).replace(/[^a-zA-Z0-9_-]/g, '_');
    (root || document).querySelectorAll('[data-xcon-date-picker]').forEach((picker) => {
      if (picker.dataset.xconDateBound === 'true') return;
      picker.dataset.xconDateBound = 'true';
      const suffix = pickerSuffix(picker, 'datePicker');
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      let cur = new Date();
      let selected = null;
      const monthLabel = picker.querySelector('#dpMonthLabel_' + suffix);
      const body = picker.querySelector('#dpBody_' + suffix);
      const prevBtn = picker.querySelector('#dpPrev_' + suffix);
      const nextBtn = picker.querySelector('#dpNext_' + suffix);
      if (!monthLabel || !body || !prevBtn || !nextBtn) return;
      const render = () => {
        monthLabel.textContent = months[cur.getMonth()] + ' ' + cur.getFullYear();
        body.innerHTML = '';
        const first = new Date(cur.getFullYear(), cur.getMonth(), 1).getDay();
        const days = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
        const today = new Date();
        let row = document.createElement('tr');
        let count = 0;
        for (let i = 0; i < first; i += 1) {
          const prevDate = new Date(cur.getFullYear(), cur.getMonth(), -first + i + 1);
          const td = document.createElement('td');
          const d = document.createElement('div');
          d.className = 'date-day other-month';
          d.textContent = String(prevDate.getDate());
          td.appendChild(d);
          row.appendChild(td);
          count += 1;
        }
        for (let day = 1; day <= days; day += 1) {
          const td = document.createElement('td');
          const div = document.createElement('div');
          div.className = 'date-day';
          div.textContent = String(day);
          if (day === today.getDate() && cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear()) div.classList.add('today');
          if (selected && day === selected.getDate() && cur.getMonth() === selected.getMonth() && cur.getFullYear() === selected.getFullYear()) div.classList.add('selected');
          div.addEventListener('click', () => {
            selected = new Date(cur.getFullYear(), cur.getMonth(), day);
            render();
          });
          td.appendChild(div);
          row.appendChild(td);
          count += 1;
          if (count % 7 === 0) {
            body.appendChild(row);
            row = document.createElement('tr');
          }
        }
        if (count % 7 !== 0) {
          while (count % 7 !== 0) {
            row.appendChild(document.createElement('td'));
            count += 1;
          }
          body.appendChild(row);
        }
      };
      prevBtn.addEventListener('click', () => {
        cur.setMonth(cur.getMonth() - 1);
        render();
      });
      nextBtn.addEventListener('click', () => {
        cur.setMonth(cur.getMonth() + 1);
        render();
      });
      render();
    });
    (root || document).querySelectorAll('[data-xcon-time-picker]').forEach((picker) => {
      if (picker.dataset.xconTimeBound === 'true') return;
      picker.dataset.xconTimeBound = 'true';
      const suffix = pickerSuffix(picker, 'timePicker');
      const hourList = picker.querySelector('#tpHourList_' + suffix);
      const minList = picker.querySelector('#tpMinList_' + suffix);
      const tpHour = picker.querySelector('#tpHour_' + suffix);
      const tpMin = picker.querySelector('#tpMin_' + suffix);
      const tpAmpm = picker.querySelector('#tpAmpm_' + suffix);
      const tpAmpmList = picker.querySelector('#tpAmpmList_' + suffix);
      if (!hourList || !minList || !tpHour || !tpMin || !tpAmpm || !tpAmpmList) return;
      let selH = 9;
      let selM = 30;
      let selAP = 'AM';
      for (let i = 1; i <= 12; i += 1) {
        const el = document.createElement('div');
        el.className = 'time-picker__item' + (i === selH ? ' selected' : '');
        el.textContent = String(i).padStart(2, '0');
        el.setAttribute('data-v', String(i));
        el.addEventListener('click', () => {
          selH = i;
          hourList.querySelectorAll('.time-picker__item').forEach((item) => item.classList.remove('selected'));
          el.classList.add('selected');
          tpHour.textContent = String(i).padStart(2, '0');
        });
        hourList.appendChild(el);
      }
      for (let i = 0; i < 60; i += 5) {
        const el = document.createElement('div');
        el.className = 'time-picker__item' + (i === selM ? ' selected' : '');
        el.textContent = String(i).padStart(2, '0');
        el.setAttribute('data-v', String(i));
        el.addEventListener('click', () => {
          selM = i;
          minList.querySelectorAll('.time-picker__item').forEach((item) => item.classList.remove('selected'));
          el.classList.add('selected');
          tpMin.textContent = String(i).padStart(2, '0');
        });
        minList.appendChild(el);
      }
      tpAmpmList.querySelectorAll('.time-picker__item').forEach((el) => {
        el.addEventListener('click', () => {
          selAP = el.getAttribute('data-v') || 'AM';
          tpAmpmList.querySelectorAll('.time-picker__item').forEach((item) => item.classList.remove('selected'));
          el.classList.add('selected');
          tpAmpm.textContent = selAP;
        });
      });
    });
    (root || document).querySelectorAll('[data-xcon-color-picker]').forEach((picker) => {
      if (picker.dataset.xconColorBound === 'true') return;
      picker.dataset.xconColorBound = 'true';
      const preview = picker.querySelector('[data-xcon-color-preview]');
      const dot = picker.querySelector('[data-xcon-color-dot]');
      const hexInput = picker.querySelector('[data-xcon-color-hex]');
      const colorInput = picker.querySelector('[data-xcon-color-input]');
      const applyHex = (hex) => {
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
        if (preview) preview.style.background = hex;
        if (dot) dot.style.background = hex;
        if (hexInput) hexInput.value = hex;
        if (colorInput) colorInput.value = hex;
      };
      picker.querySelectorAll('.color-swatch[data-hex]').forEach((swatch) => {
        swatch.addEventListener('click', () => {
          picker.querySelectorAll('.color-swatch').forEach((item) => item.classList.remove('selected'));
          swatch.classList.add('selected');
          applyHex(swatch.getAttribute('data-hex') || '');
        });
      });
      if (hexInput) hexInput.addEventListener('input', () => applyHex(hexInput.value || ''));
      if (colorInput) colorInput.addEventListener('input', () => applyHex(colorInput.value || ''));
      const hue = picker.querySelector('[data-xcon-color-hue]');
      if (hue) hue.addEventListener('input', () => applyHex(hslToHex(Number(hue.value || 0), 70, 60)));
    });
  }
  function hydrateGalleryControls(root) {
    (root || document).querySelectorAll('[data-xcon-gallery]').forEach((gallery) => {
      if (gallery.dataset.xconGalleryBound === 'true') return;
      gallery.dataset.xconGalleryBound = 'true';
      const singleModal = gallery.querySelector('[data-xcon-gallery-single-modal]');
      if (singleModal) {
        const modalImg = singleModal.querySelector('[data-xcon-gallery-single-image]');
        const items = Array.from(gallery.querySelectorAll('[data-xcon-gallery-single-item]'));
        let index = 0;
        const show = (nextIndex) => {
          if (!items.length || !modalImg) return;
          index = ((nextIndex % items.length) + items.length) % items.length;
          const img = items[index].querySelector('img');
          if (!img) return;
          modalImg.src = img.currentSrc || img.src || '';
          modalImg.alt = img.alt || '';
          singleModal.style.display = 'flex';
        };
        const hideSingle = () => { singleModal.style.display = 'none'; };
        items.forEach((item, itemIndex) => item.addEventListener('click', () => show(itemIndex)));
        const closeSingle = singleModal.querySelector('[data-xcon-gallery-single-close]');
        const prev = singleModal.querySelector('[data-xcon-gallery-single-prev]');
        const next = singleModal.querySelector('[data-xcon-gallery-single-next]');
        if (closeSingle) closeSingle.addEventListener('click', hideSingle);
        if (prev) prev.addEventListener('click', (event) => { event.stopPropagation(); show(index - 1); });
        if (next) next.addEventListener('click', (event) => { event.stopPropagation(); show(index + 1); });
        singleModal.addEventListener('click', (event) => { if (event.target === singleModal) hideSingle(); });
        return;
      }
      const lightbox = gallery.querySelector('[data-xcon-gallery-lightbox]');
      const lightboxImg = gallery.querySelector('[data-xcon-gallery-lightbox-img]');
      const close = gallery.querySelector('[data-xcon-gallery-close]');
      gallery.querySelectorAll('.gallery-item').forEach((item) => {
        item.addEventListener('click', () => {
          const img = item.querySelector('img');
          if (!img || !lightbox || !lightboxImg) return;
          lightboxImg.src = (img.currentSrc || img.src || '').replace('w=400', 'w=1200');
          lightboxImg.alt = img.alt || '';
          lightbox.classList.add('open');
        });
      });
      const hide = () => { if (lightbox) lightbox.classList.remove('open'); };
      if (close) close.addEventListener('click', hide);
      if (lightbox) lightbox.addEventListener('click', (event) => { if (event.target === lightbox) hide(); });
    });
  }
  function hydrateTreeViews(root) {
    (root || document).querySelectorAll('[data-xcon-tree-view]').forEach((tree) => {
      if (tree.dataset.xconTreeBound === 'true') return;
      tree.dataset.xconTreeBound = 'true';
      tree.querySelectorAll('[data-xcon-tree-row]').forEach((row) => {
        row.addEventListener('click', () => {
          const children = row.parentElement && row.parentElement.querySelector(':scope > .tree-children');
          if (children) {
            const open = row.classList.contains('expanded');
            row.classList.toggle('expanded', !open);
            children.classList.toggle('collapsed', open);
          }
          tree.querySelectorAll('.tree-row').forEach((item) => item.classList.remove('selected'));
          row.classList.add('selected');
        });
      });
    });
  }
  function hydrateQrCodes(root) {
    (root || document).querySelectorAll('[data-xcon-qr-code]').forEach((host) => {
      if (host.dataset.xconQrBound === 'true') return;
      host.dataset.xconQrBound = 'true';
      const canvas = host.querySelector('[data-xcon-qr-canvas]');
      const input = host.querySelector('[data-xcon-qr-input]');
      const button = host.querySelector('[data-xcon-qr-generate]');
      const run = () => drawPseudoQr(canvas, input ? input.value : canvas ? canvas.getAttribute('data-xcon-qr-text') : '');
      if (button) button.addEventListener('click', run);
      if (input) input.addEventListener('change', run);
      run();
    });
  }
  function hydrateBarcodes(root) {
    (root || document).querySelectorAll('[data-xcon-barcode]').forEach((host) => {
      if (host.dataset.xconBarcodeBound === 'true') return;
      host.dataset.xconBarcodeBound = 'true';
      const canvas = host.querySelector('[data-xcon-barcode-canvas]');
      const textEl = host.querySelector('[data-xcon-barcode-text]');
      const input = host.querySelector('[data-xcon-barcode-input]');
      const button = host.querySelector('[data-xcon-barcode-draw]');
      const run = () => drawPseudoBarcode(canvas, textEl, input ? input.value : canvas ? canvas.getAttribute('data-xcon-barcode-value') : '');
      if (button) button.addEventListener('click', run);
      if (input) input.addEventListener('change', run);
      run();
    });
  }
  function cssEscapeIdentifier(id) {
    return String(id).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  }
  function hydrateImageFallbacks(root) {
    (root || document).querySelectorAll('[data-xcon-image-fallback]').forEach((image) => {
      if (image.dataset.xconImageFallbackBound === 'true') return;
      image.dataset.xconImageFallbackBound = 'true';
      image.addEventListener('error', () => {
        const fallback = image.getAttribute('data-xcon-image-fallback');
        if (!fallback) return;
        if (image.getAttribute('src') !== fallback) image.setAttribute('src', fallback);
        else image.style.display = 'none';
      });
    });
  }
  function hydrateImageSlideshows(root) {
    (root || document).querySelectorAll('[data-xcon-image-slideshow="true"]').forEach((image) => {
      if (image.dataset.xconImageSlideshowBound === 'true') return;
      image.dataset.xconImageSlideshowBound = 'true';
      let images = [];
      try { images = JSON.parse(image.getAttribute('data-xcon-image-slideshow-images') || '[]'); } catch { images = []; }
      images = Array.isArray(images) ? images.filter((item) => typeof item === 'string' && item) : [];
      if (images.length <= 1) return;
      const duration = Math.max(100, Number(image.getAttribute('data-xcon-image-slideshow-duration') || 3000) || 3000);
      const mode = String(image.getAttribute('data-xcon-image-slideshow-mode') || 'loop').toLowerCase();
      let index = Math.max(0, images.indexOf(image.getAttribute('src') || images[0]));
      const timer = window.setInterval(() => {
        if (mode === 'once' && index >= images.length - 1) {
          window.clearInterval(timer);
          return;
        }
        index = (index + 1) % images.length;
        image.setAttribute('src', images[index]);
      }, duration);
    });
  }
  function hydrateTooltipControls(root) {
    (root || document).querySelectorAll('[data-xcon-tooltip]').forEach((host) => {
      if (host.dataset.xconTooltipBound === 'true') return;
      host.dataset.xconTooltipBound = 'true';
      const trigger = host.querySelector('.tooltip-trigger');
      const tooltip = host.querySelector('.tooltip');
      if (!trigger || !tooltip) return;
      const rawDelay = Number(host.getAttribute('data-xcon-tooltip-delay') || 0);
      const delay = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 0;
      let showTimer = 0;
      const show = () => tooltip.classList.add('open');
      const showDelayed = () => {
        window.clearTimeout(showTimer);
        if (delay > 0) showTimer = window.setTimeout(show, delay);
        else show();
      };
      const hide = () => {
        window.clearTimeout(showTimer);
        tooltip.classList.remove('open');
      };
      const toggle = (event) => {
        event.preventDefault();
        tooltip.classList.toggle('open');
      };
      if (host.getAttribute('data-xcon-tooltip-trigger') === 'click') {
        trigger.addEventListener('click', toggle);
        trigger.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') toggle(event);
          if (event.key === 'Escape') hide();
        });
      } else {
        trigger.addEventListener('mouseenter', showDelayed);
        trigger.addEventListener('mouseleave', hide);
        trigger.addEventListener('focus', showDelayed);
        trigger.addEventListener('blur', hide);
      }
    });
  }
  function hydrateModalControls(root) {
    (root || document).querySelectorAll('[data-xcon-modal]').forEach((host) => {
      if (host.dataset.xconModalBound === 'true') return;
      host.dataset.xconModalBound = 'true';
      const modalById = (id) => id ? host.querySelector('#' + cssEscapeIdentifier(id)) : null;
      const open = (id) => {
        const modal = modalById(id);
        if (modal) modal.classList.add('open');
      };
      const close = (id) => {
        const modal = modalById(id);
        if (modal) modal.classList.remove('open');
      };
      host.querySelectorAll('[data-xcon-modal-open]').forEach((button) => {
        button.addEventListener('click', () => open(button.getAttribute('data-xcon-modal-open')));
      });
      host.querySelectorAll('[data-xcon-modal-close]').forEach((button) => {
        button.addEventListener('click', () => close(button.getAttribute('data-xcon-modal-close')));
      });
      host.querySelectorAll('[data-xcon-modal-target]').forEach((modal) => {
        modal.addEventListener('click', (event) => {
          if (event.target === modal && modal.getAttribute('data-xcon-modal-close-on-backdrop') !== 'false') modal.classList.remove('open');
        });
      });
    });
  }
  function hydrateRatingControls(root) {
    (root || document).querySelectorAll('[data-xcon-rating-group]').forEach((group) => {
      if (group.dataset.xconRatingBound === 'true') return;
      group.dataset.xconRatingBound = 'true';
      const labels = Array.from(group.querySelectorAll('[data-xcon-rating-star]'));
      const row = group.closest('.rating-row');
      const score = row ? row.querySelector('[data-xcon-rating-score]') : null;
      let current = Number(group.getAttribute('data-xcon-rating-value') || 0);
      const paint = (value) => {
        labels.forEach((label, index) => {
          const active = index < value;
          label.classList.toggle('active', active);
          if (label.classList.contains('rating-star')) label.style.color = active ? '#ffc107' : '#e9ecef';
        });
      };
      labels.forEach((label, index) => {
        const value = index + 1;
        label.addEventListener('mouseenter', () => paint(value));
        label.addEventListener('mouseleave', () => paint(current));
        label.addEventListener('focus', () => paint(value));
        label.addEventListener('blur', () => paint(current));
        label.addEventListener('click', () => {
          current = value;
          group.setAttribute('data-xcon-rating-value', String(current));
          if (score) {
            score.textContent = group.classList.contains('rating-stars') ? current + '/' + labels.length : current + '.0';
          }
          paint(current);
        });
        label.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            label.click();
          }
        });
      });
      paint(current);
    });
  }
  function drawPseudoQr(canvas, text) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width || 180;
    const foreground = canvas.getAttribute('data-xcon-qr-foreground') || '#000';
    const background = canvas.getAttribute('data-xcon-qr-background') || '#fff';
    const cell = Math.max(3, Math.floor(size / 30));
    const margin = 2;
    const cols = Math.floor((size - margin * 2) / cell);
    const value = text != null ? String(text) : 'https://xconviewer.dev';
    ctx.fillStyle = background; ctx.fillRect(0, 0, size, size);
    let seed = value.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 0) >>> 0;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
    const finder = (x, y) => {
      ctx.fillStyle = foreground; ctx.fillRect(x, y, cell * 7, cell * 7);
      ctx.fillStyle = background; ctx.fillRect(x + cell, y + cell, cell * 5, cell * 5);
      ctx.fillStyle = foreground; ctx.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3);
    };
    const off = margin * cell;
    finder(off, off); finder(size - off - cell * 7, off); finder(off, size - off - cell * 7);
    for (let r = 0; r < cols; r++) for (let c = 0; c < cols; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c >= cols - 8) || (r >= cols - 8 && c < 8)) continue;
      if (rand() > .5) { ctx.fillStyle = foreground; ctx.fillRect(margin * cell + c * cell, margin * cell + r * cell, cell - 1, cell - 1); }
    }
  }
  function drawPseudoBarcode(canvas, textEl, value) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width || 280;
    const height = canvas.height || 80;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    const code = String(value || '').replace(/\\D/g, '').substring(0, 13).padStart(13, '0');
    if (textEl) textEl.textContent = code.split('').join(' ');
    const enc = {
      0: '0001101',
      1: '0011001',
      2: '0010011',
      3: '0111101',
      4: '0100011',
      5: '0110001',
      6: '0101111',
      7: '0111011',
      8: '0110111',
      9: '0001011'
    };
    const rEnc = {
      0: '1110010',
      1: '1100110',
      2: '1101100',
      3: '1000010',
      4: '1011100',
      5: '1001110',
      6: '1010000',
      7: '1000100',
      8: '1001000',
      9: '1110100'
    };
    let bits = '101';
    for (let i = 1; i <= 6; i++) bits += enc[+code[i]];
    bits += '01010';
    for (let i = 7; i <= 12; i++) bits += rEnc[+code[i]];
    bits += '101';
    const requestedBarWidth = Number(canvas.getAttribute('data-xcon-barcode-bar-width') || 0);
    const barW = requestedBarWidth > 0 ? Math.min(requestedBarWidth, (width - 20) / bits.length) : (width - 20) / bits.length;
    ctx.fillStyle = '#000';
    for (let i = 0; i < bits.length; i++) if (bits[i] === '1') ctx.fillRect(10 + i * barW, 4, barW + .5, height - 12);
  }
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  }
  function shapeStateFor(shape) {
    let state = shapeImageStates.get(shape);
    if (!state) {
      state = { index: 0, timer: null, bound: false, forward: true, iterationCount: 0 };
      shapeImageStates.set(shape, state);
    }
    return state;
  }
  function shapeImages(shape) {
    try {
      const parsed = JSON.parse(shape.dataset.xconShapeImages || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item) : [];
    } catch {
      return [];
    }
  }
  function shapeCssUrl(url) {
    return 'url("' + String(url).replace(/["\\\\]/g, '\\\\$&') + '")';
  }
  function setShapeImage(shape, url) {
    if (url) shape.style.backgroundImage = shapeCssUrl(url);
  }
  function maxShapeIterations(shape) {
    const mode = shape.dataset.xconShapeMode || 'infinite';
    if (mode === 'infinite') return Infinity;
    return parseInt(mode, 10) || 1;
  }
  function advanceShapeImage(state, images, direction) {
    if (direction === 'alternate') {
      if (state.forward) {
        state.index += 1;
        if (state.index >= images.length - 1) {
          state.index = images.length - 1;
          state.forward = false;
          state.iterationCount += 1;
        }
      } else {
        state.index -= 1;
        if (state.index <= 0) {
          state.index = 0;
          state.forward = true;
          state.iterationCount += 1;
        }
      }
      return;
    }
    if (direction === 'reverse') {
      state.index = state.index <= 0 ? images.length - 1 : state.index - 1;
      if (state.index === images.length - 1) state.iterationCount += 1;
      return;
    }
    state.index = (state.index + 1) % images.length;
    if (state.index === 0) state.iterationCount += 1;
  }
  function scheduleShapeImage(shape) {
    const state = shapeStateFor(shape);
    const images = shapeImages(shape);
    if (images.length <= 1) return;
    const maxIterations = maxShapeIterations(shape);
    if (state.iterationCount >= maxIterations) return;
    const duration = Math.max(100, Number(shape.dataset.xconShapeDuration || 3000));
    state.timer = window.setTimeout(() => {
      advanceShapeImage(state, images, shape.dataset.xconShapeDirection || 'normal');
      setShapeImage(shape, images[state.index]);
      scheduleShapeImage(shape);
    }, duration);
  }
  function hydrateShapeImageAnimations(root) {
    (root || document).querySelectorAll('[data-xcon-shape-image-animation="true"]').forEach((shape) => {
      const images = shapeImages(shape);
      if (images.length <= 1) return;
      const state = shapeStateFor(shape);
      if (state.timer) window.clearTimeout(state.timer);
      state.timer = null;
      if (!state.bound) state.bound = true;
      state.index = 0;
      state.forward = true;
      state.iterationCount = 0;
      setShapeImage(shape, images[0]);
      scheduleShapeImage(shape);
    });
  }
  function hydrateFlipbooks(root) {
    (root || document).querySelectorAll('.xa-flipbook-container').forEach((host) => {
      if (host.dataset.xconFlipbookBound === 'true') return;
      host.dataset.xconFlipbookBound = 'true';
      const pages = Array.from(host.querySelectorAll('.ui-flipbook .page'));
      if (!pages.length) return;
      const current = host.querySelector('[id^="current-page-"]');
      const miniatures = Array.from(host.querySelectorAll('[data-xcon-flipbook-page]'));
      const miniatureList = host.querySelector('[data-xcon-flipbook-miniatures-list]');
      const viewer = host.querySelector('.flipbook-viewer');
      let index = 0;
      let zoomed = false;
      const show = (next) => {
        index = Math.max(0, Math.min(pages.length - 1, next));
        pages.forEach((page, pageIndex) => { page.style.display = pageIndex === index ? 'flex' : 'none'; });
        if (current) current.textContent = String(index + 1);
        miniatures.forEach((button, pageIndex) => button.classList.toggle('active', pageIndex === index));
      };
      host.querySelectorAll('[data-xcon-flipbook-next]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          show(index + 1 >= pages.length ? 0 : index + 1);
        });
      });
      host.querySelectorAll('[data-xcon-flipbook-prev]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          show(index - 1 < 0 ? pages.length - 1 : index - 1);
        });
      });
      miniatures.forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          show(Number(button.getAttribute('data-xcon-flipbook-page') || 1) - 1);
        });
      });
      host.querySelectorAll('[data-xcon-flipbook-miniatures]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          if (miniatureList) miniatureList.style.display = miniatureList.style.display === 'none' ? 'block' : 'none';
        });
      });
      host.querySelectorAll('[data-xcon-flipbook-zoom]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          zoomed = !zoomed;
          if (viewer) viewer.style.transform = zoomed ? 'scale(1.5)' : '';
        });
      });
      host.querySelectorAll('[data-xcon-flipbook-fullscreen]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
          else if (host.requestFullscreen) host.requestFullscreen();
        });
      });
      show(0);
    });
  }
  function hydrateSpanGrids(root) {
    (root || document).querySelectorAll('[data-xcon-spangrid]').forEach((host) => {
      if (host.dataset.xconSpangridBound === 'true') return;
      host.dataset.xconSpangridBound = 'true';
      host.classList.add('xa-spangrid-container--hydrated');
    });
  }
  let leafletLoadPromise = null;
  function ensureLeafletStyles(rootNode) {
    const isShadow = rootNode && rootNode.toString && String(rootNode).includes('ShadowRoot');
    const target = isShadow ? rootNode : document.head;
    if (!target || target.querySelector('link[data-xcon-leaflet-css]')) return Promise.resolve();
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-xcon-leaflet-css', 'true');
      link.addEventListener('load', () => resolve());
      link.addEventListener('error', () => resolve());
      target.appendChild(link);
    });
  }
  function loadLeafletRuntime() {
    if (window.L && typeof window.L.map === 'function') return Promise.resolve(window.L);
    if (leafletLoadPromise) return leafletLoadPromise;
    leafletLoadPromise = new Promise((resolve, reject) => {
      ensureLeafletStyles(document);
      const existing = document.querySelector('script[data-xcon-leaflet-js]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.L));
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-xcon-leaflet-js', 'true');
      script.addEventListener('load', () => resolve(window.L));
      script.addEventListener('error', reject);
      document.head.appendChild(script);
    });
    return leafletLoadPromise;
  }
  function parseLeafletMarkers(host) {
    try {
      const parsed = JSON.parse(host.getAttribute('data-xcon-map-markers') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function parseLeafletJsonAttr(host, name, fallback) {
    try {
      const raw = host.getAttribute(name);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }
  function xconLeafletPoint(value) {
    if (Array.isArray(value)) {
      const lat = Number(value[0]);
      const lng = Number(value[1]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : undefined;
    }
    if (value && typeof value === 'object') {
      const lat = Number(value.lat ?? value.latitude);
      const lng = Number(value.lng ?? value.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : undefined;
    }
    return undefined;
  }
  function xconLeafletLayerPoints(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value)
      ? (value.points || value.path || value.coordinates || value.latlngs || value.latLngs)
      : value;
    if (!Array.isArray(source)) return [];
    return source.map(xconLeafletPoint).filter(Boolean);
  }
  function xconLeafletLayerStyle(layer, fallbackColor) {
    const source = layer && typeof layer === 'object' ? layer : {};
    const color = String(source.color || source.stroke || source.strokeColor || fallbackColor);
    return {
      color,
      weight: Number(source.weight || source.strokeWidth || 3),
      opacity: Number(source.opacity || 0.85),
      fillColor: String(source.fillColor || source.fill || color),
      fillOpacity: Number(source.fillOpacity || 0.18),
    };
  }
  function applyLeafletMapLayers(L, map, host) {
    parseLeafletJsonAttr(host, 'data-xcon-map-polylines', []).forEach((layer) => {
      const points = xconLeafletLayerPoints(layer);
      if (points.length < 2 || typeof L.polyline !== 'function') return;
      L.polyline(points, xconLeafletLayerStyle(layer, '#2563eb')).addTo(map);
    });
    parseLeafletJsonAttr(host, 'data-xcon-map-polygons', []).forEach((layer) => {
      const points = xconLeafletLayerPoints(layer);
      if (points.length < 3 || typeof L.polygon !== 'function') return;
      L.polygon(points, xconLeafletLayerStyle(layer, '#14b8a6')).addTo(map);
    });
    const heatmap = parseLeafletJsonAttr(host, 'data-xcon-map-heatmap', []);
    if (Array.isArray(heatmap) && heatmap.length && typeof L.heatLayer === 'function') {
      const points = heatmap.map((point) => {
        if (Array.isArray(point)) {
          const lat = Number(point[0]);
          const lng = Number(point[1]);
          const intensity = Number(point[2] ?? 1);
          return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng, Number.isFinite(intensity) ? intensity : 1] : undefined;
        }
        if (point && typeof point === 'object') {
          const lat = Number(point.lat ?? point.latitude);
          const lng = Number(point.lng ?? point.longitude);
          const intensity = Number(point.value ?? point.intensity ?? point.weight ?? 1);
          return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng, Number.isFinite(intensity) ? intensity : 1] : undefined;
        }
        return undefined;
      }).filter(Boolean);
      if (points.length) L.heatLayer(points, { radius: 24, blur: 18 }).addTo(map);
    }
  }
  function xconLeafletSafeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function xconLeafletMarkerIcon(L, marker, label) {
    if (!L || typeof L.divIcon !== 'function') return undefined;
    const status = String((marker && marker.status) || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const text = xconLeafletSafeHtml(String(label || '').slice(0, 2) || '\u2022');
    return L.divIcon({
      className: 'xcon-leaflet-marker' + (status ? ' xcon-leaflet-marker--' + status : ''),
      html: text,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -24],
    });
  }
  function hydrateLeafletMaps(root) {
    (root || document).querySelectorAll('[data-xcon-leaflet-map]').forEach((host) => {
      if (host.dataset.xconLeafletBound === 'true' || host.dataset.xconLeafletBound === 'pending') return;
      host.dataset.xconLeafletBound = 'pending';
      Promise.all([loadLeafletRuntime(), ensureLeafletStyles(host.getRootNode ? host.getRootNode() : document)]).then(([L]) => {
        if (!L || typeof L.map !== 'function') throw new Error('Leaflet unavailable');
        const lat = Number(host.getAttribute('data-latitude') || 37.5665);
        const lng = Number(host.getAttribute('data-longitude') || 126.978);
        const zoom = Number(host.getAttribute('data-zoom') || 10);
        const showControls = host.getAttribute('data-xcon-map-show-controls') !== 'false';
        const enableZoom = host.getAttribute('data-xcon-map-enable-zoom') !== 'false';
        const enablePan = host.getAttribute('data-xcon-map-enable-pan') !== 'false';
        const tileUrl = host.getAttribute('data-xcon-map-tile-url') || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const attribution = host.getAttribute('data-xcon-map-attribution') || '(C) OpenStreetMap contributors';
        host.innerHTML = '';
        host.classList.add('xa-map-static--live');
        const map = L.map(host, {
          zoomControl: showControls,
          dragging: enablePan,
          scrollWheelZoom: enableZoom,
          doubleClickZoom: enableZoom,
          boxZoom: enableZoom,
          keyboard: enableZoom,
          attributionControl: true,
        }).setView([lat, lng], zoom);
        L.tileLayer(tileUrl, {
          attribution,
          maxZoom: 19,
        }).addTo(map);
        host._xconLeafletMap = map;
        host._leaflet_map = map;
        parseLeafletMarkers(host).forEach((marker, index) => {
          const markerLat = Number(marker && (marker.lat ?? marker.latitude));
          const markerLng = Number(marker && (marker.lng ?? marker.longitude));
          if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) return;
          const label = String((marker && (marker.label ?? marker.title ?? marker.popup)) || index + 1);
          const icon = xconLeafletMarkerIcon(L, marker, label);
          const pin = L.marker([markerLat, markerLng], icon ? { icon } : undefined).addTo(map);
          if (label) pin.bindPopup(label);
        });
        applyLeafletMapLayers(L, map, host);
        window.setTimeout(() => map.invalidateSize(), 50);
        host.dataset.xconLeafletBound = 'true';
      }).catch(() => {
        host.dataset.xconLeafletBound = 'failed';
      });
    });
  }
  function hydrate(root) {
    (root || document).querySelectorAll('[data-xcon-carousel="true"]').forEach((banner) => {
      sync(banner);
      bind(banner);
      goTo(banner, 0, true);
      start(banner);
    });
    hydrateTextFields(root || document);
    hydrateTextViews(root || document);
    hydrateLayoutShowcases(root || document);
    hydrateCustomSelects(root || document);
    hydrateRanges(root || document);
    hydrateSwitches(root || document);
    hydrateDisclosureControls(root || document);
    hydratePickerControls(root || document);
    hydrateGalleryControls(root || document);
    hydrateTreeViews(root || document);
    hydrateQrCodes(root || document);
    hydrateBarcodes(root || document);
    hydrateImageFallbacks(root || document);
    hydrateImageSlideshows(root || document);
    hydrateTooltipControls(root || document);
    hydrateModalControls(root || document);
    hydrateRatingControls(root || document);
    hydrateExtCarousels(root || document);
    hydrateShapeImageAnimations(root || document);
    hydrateFlipbooks(root || document);
    hydrateSpanGrids(root || document);
    hydrateLeafletMaps(root || document);
  }
  window.xconViewerHydrate = hydrate;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => hydrate(document));
  else hydrate(document);
})();
`.trim();
function render(input, target, options = {}) {
  target.replaceChildren();
  const resolved = resolveRenderInput(input);
  const host = target.ownerDocument.createElement("div");
  host.className = "xcon-viewer-host";
  host.setAttribute("data-xcon-viewer-host", "");
  host.setAttribute("style", xconHostFrameStyle(resolved.root));
  host.innerHTML = renderResolvedToHtml(resolved, options);
  target.appendChild(host);
  hydrateXconViewer(target);
}
function xconHostFrameStyle(root2) {
  const pos = rectParts(root2.get("pos"));
  const declarations = [
    "position:relative",
    "display:inline-block",
    "box-sizing:border-box",
    "max-width:100%",
    "overflow:visible",
    "vertical-align:top",
    "isolation:isolate"
  ];
  if (pos) {
    const width = Math.max(0, pos[0]) + pos[2];
    const height = Math.max(0, pos[1]) + pos[3];
    declarations.push(`width:${numberPx(width)}`, `height:${numberPx(height)}`);
  } else {
    declarations.push("width:100%", "min-height:100%");
  }
  return declarations.join(";");
}
function renderResolvedToHtml(resolved, options = {}) {
  const root2 = resolved.root;
  const context = {
    options: { ...defaultOptions, ...options },
    nodes: 0,
    componentBounds: collectComponentBounds(root2)
  };
  return renderComponent(root2, context, 0, { parentFlow: false }, "root") + renderXconDiagnostics(resolved.diagnostics);
}
function hydrateXconViewer(root2 = document) {
  const banners = Array.from(root2.querySelectorAll('[data-xcon-carousel="true"]'));
  for (const banner of banners) hydrateBanner(banner);
  hydrateTextFields(root2);
  hydrateTextViews(root2);
  hydrateLayoutShowcases(root2);
  hydrateCustomSelects(root2);
  hydrateRanges(root2);
  hydrateSwitches(root2);
  hydrateDisclosureControls(root2);
  hydratePickerControls(root2);
  hydrateGalleryControls(root2);
  hydrateTreeViews(root2);
  hydrateQrCodes(root2);
  hydrateBarcodes(root2);
  hydrateImageFallbacks(root2);
  hydrateImageSlideshows(root2);
  hydrateTooltipControls(root2);
  hydrateModalControls(root2);
  hydrateRatingControls(root2);
  hydrateExtCarousels(root2);
  hydrateShapeImageAnimations(root2);
  hydrateFlipbooks(root2);
  hydrateSpanGrids(root2);
  hydrateLeafletMaps(root2);
  hydrateNetworkDiagrams(root2);
}
function hydrateTextFields(root2 = document) {
  root2.querySelectorAll('[data-xcon-tf-toggle="visibility"]').forEach((button) => {
    if (button.dataset.xconTfBound === "true") return;
    button.dataset.xconTfBound = "true";
    button.addEventListener("click", () => {
      const wrap = button.closest(".xa-al-tf-addon-wrap,.xa-al-tf-block-wrap,.xa-al-tf-float-group,.pw-wrap");
      const input = wrap?.querySelector("input.xa-al-tf,input.f-input");
      if (input) input.type = input.type === "password" ? "text" : "password";
    });
  });
  root2.querySelectorAll("[data-xcon-tf-clear]").forEach((button) => {
    if (button.dataset.xconTfClearBound === "true") return;
    button.dataset.xconTfClearBound = "true";
    button.addEventListener("click", () => {
      const wrap = button.closest(".xa-al-tf-addon-wrap,.xa-al-tf-block-wrap,.xa-al-tf-float-group");
      const input = wrap?.querySelector("input.xa-al-tf");
      if (!input || input.disabled || input.readOnly) return;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.focus();
    });
  });
  root2.querySelectorAll("[data-xcon-pw-strength]").forEach((strength) => {
    if (strength.dataset.xconPwBound === "true") return;
    strength.dataset.xconPwBound = "true";
    const host = strength.closest(".xa-ext-password-host");
    const input = host?.querySelector("input.f-input");
    const hint = host?.querySelector("[data-xcon-pw-hint]");
    const bars = Array.from(strength.querySelectorAll(".pw-strength__bar"));
    const sync = () => {
      const current3 = passwordStrength(input?.value ?? "");
      const levels = ["", "weak", "medium", "strong", "strong"];
      bars.forEach((bar, index2) => {
        bar.className = "pw-strength__bar";
        const level = levels[current3.score];
        if (index2 < current3.score && level) bar.classList.add(level);
      });
      if (hint) hint.textContent = current3.hint;
    };
    input?.addEventListener("input", sync);
    sync();
  });
  root2.querySelectorAll("textarea.f-textarea[data-xcon-ta]").forEach((textarea) => {
    if (textarea.dataset.xconTaBound === "true") return;
    textarea.dataset.xconTaBound = "true";
    const host = textarea.closest(".xa-ext-textarea-host");
    const count = host?.querySelector("[data-xcon-ta-count]");
    const sync = () => {
      if (count) count.textContent = String((textarea.value || "").length);
    };
    textarea.addEventListener("input", sync);
    sync();
  });
  root2.querySelectorAll("input.xa-al-tf-float").forEach((input) => {
    const sync = () => {
      input.classList.toggle("xa-al-tf-float--has-val", input.value.length > 0);
    };
    sync();
    if (input.dataset.xconFloatBound === "true") return;
    input.dataset.xconFloatBound = "true";
    input.addEventListener("input", sync);
  });
  const groups = /* @__PURE__ */ new Map();
  root2.querySelectorAll("input.xa-al-tf--otp[data-xa-otp-index]").forEach((input) => {
    const group = input.dataset.xaOtpGroup || "default";
    const items = groups.get(group) ?? [];
    items.push(input);
    groups.set(group, items);
  });
  groups.forEach((inputs) => {
    inputs.sort((a2, b) => Number(a2.dataset.xaOtpIndex ?? 0) - Number(b.dataset.xaOtpIndex ?? 0));
    inputs.forEach((input, index2) => {
      if (input.dataset.xconOtpBound === "true") return;
      input.dataset.xconOtpBound = "true";
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        if (input.value && inputs[index2 + 1]) inputs[index2 + 1].focus();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && inputs[index2 - 1]) inputs[index2 - 1].focus();
      });
    });
  });
}
function hydrateTextViews(root2 = document) {
  root2.querySelectorAll("[data-xa-trunc-toggle]").forEach((button) => {
    if (button.dataset.xconTvBound === "true") return;
    button.dataset.xconTvBound = "true";
    button.addEventListener("click", () => {
      const id2 = button.getAttribute("data-xa-trunc-toggle");
      const target = id2 ? root2.querySelector(`#${CSS.escape(id2)}`) : null;
      if (!target) return;
      const collapsed = target.classList.toggle("collapsed");
      button.textContent = collapsed ? "Read more \u2193" : "Show less \u2191";
    });
  });
}
function hydrateLayoutShowcases(root2 = document) {
  root2.querySelectorAll("[data-xcon-grid-showcase]").forEach((demo) => {
    if (demo.dataset.xconGridBound === "true") return;
    demo.dataset.xconGridBound = "true";
    const canvas = demo.querySelector(".grid-canvas");
    demo.querySelectorAll(".grid-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        demo.querySelectorAll(".grid-pill").forEach((item) => item.classList.remove("active"));
        pill.classList.add("active");
        const cols = pill.getAttribute("data-cols");
        if (canvas) canvas.style.gridTemplateColumns = cols === "auto" ? "repeat(auto-fill,minmax(80px,1fr))" : `repeat(${cols},1fr)`;
      });
    });
  });
  root2.querySelectorAll("[data-xcon-flex-showcase]").forEach((demo) => {
    if (demo.dataset.xconFlexBound === "true") return;
    demo.dataset.xconFlexBound = "true";
    const canvas = demo.querySelector("[data-xcon-flex-canvas]");
    const justify = demo.querySelector("[data-xcon-flex-justify]");
    const align = demo.querySelector("[data-xcon-flex-align]");
    const sync = () => {
      if (!canvas) return;
      if (justify) canvas.style.justifyContent = justify.value;
      if (align) canvas.style.alignItems = align.value;
    };
    justify?.addEventListener("change", sync);
    align?.addEventListener("change", sync);
    sync();
  });
}
function ensureCustomSelectDocumentClose() {
  if (customSelectDocumentBound) return;
  customSelectDocumentBound = true;
  document.addEventListener("click", (event) => {
    document.querySelectorAll(".custom-select.open").forEach((select) => {
      if (event.target instanceof Node && !select.contains(event.target)) select.classList.remove("open");
    });
  });
}
function hydrateCustomSelects(root2 = document) {
  ensureCustomSelectDocumentClose();
  root2.querySelectorAll('[data-xcon-custom-select="true"]').forEach((select) => {
    if (select.dataset.xconCustomSelectBound === "true") return;
    select.dataset.xconCustomSelectBound = "true";
    const trigger = select.querySelector("[data-xcon-custom-select-trigger]");
    const value = select.querySelector("[data-xcon-custom-select-value]");
    const toggle = (event) => {
      event.preventDefault();
      event.stopPropagation();
      document.querySelectorAll(".custom-select.open").forEach((open) => {
        if (open !== select) open.classList.remove("open");
      });
      select.classList.toggle("open");
    };
    trigger?.addEventListener("click", toggle);
    trigger?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") toggle(event);
      if (event.key === "Escape") select.classList.remove("open");
    });
    select.querySelectorAll("[data-xcon-custom-select-option]").forEach((option) => {
      option.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        select.querySelectorAll("[data-xcon-custom-select-option]").forEach((item) => item.classList.remove("selected"));
        option.classList.add("selected");
        if (value) value.textContent = option.textContent || "";
        select.classList.remove("open");
      });
    });
  });
}
function rangeFillPercent(input) {
  const min2 = Number(input.min || 0);
  const max2 = Number(input.max || 100);
  const value = Number(input.value || min2);
  if (!Number.isFinite(min2) || !Number.isFinite(max2) || max2 === min2) return "0.0";
  const clamped = Math.min(max2, Math.max(min2, Number.isFinite(value) ? value : min2));
  return ((clamped - min2) / (max2 - min2) * 100).toFixed(1);
}
function syncRange(input) {
  input.style.setProperty("--fill", `${rangeFillPercent(input)}%`);
  const targetId = input.getAttribute("data-xcon-range-value-target");
  const target = targetId ? document.getElementById(targetId) : null;
  if (target) target.textContent = input.value;
}
function hydrateRanges(root2 = document) {
  root2.querySelectorAll("input.f-range[data-xcon-range]").forEach((input) => {
    if (input.dataset.xconRangeBound !== "true") {
      input.dataset.xconRangeBound = "true";
      input.addEventListener("input", () => syncRange(input));
    }
    syncRange(input);
  });
}
function hydrateSwitches(root2 = document) {
  root2.querySelectorAll("input[data-xcon-switch]").forEach((input) => {
    const syncSwitch = () => {
      input.setAttribute("aria-checked", input.checked ? "true" : "false");
    };
    if (input.dataset.xconSwitchBound !== "true") {
      input.dataset.xconSwitchBound = "true";
      input.addEventListener("change", syncSwitch);
    }
    syncSwitch();
  });
}
function hydrateDisclosureControls(root2 = document) {
  root2.querySelectorAll("[data-xcon-tabs-nav]").forEach((nav) => {
    if (nav.dataset.xconTabsBound === "true") return;
    nav.dataset.xconTabsBound = "true";
    const scope = nav.closest(".tabs-wrap") ?? nav.parentElement;
    nav.querySelectorAll("[data-xcon-tabs-button]").forEach((button) => {
      button.addEventListener("click", () => {
        const id2 = button.getAttribute("data-tab");
        nav.querySelectorAll("[data-xcon-tabs-button]").forEach((item) => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
        });
        scope?.querySelectorAll(".tab-content").forEach((panel) => panel.classList.toggle("active", panel.id === id2));
      });
    });
  });
  root2.querySelectorAll(".tabs-header").forEach((header) => {
    if (header.dataset.xconTabsSingleBound === "true") return;
    const buttons = Array.from(header.querySelectorAll("[data-xcon-tabs-single-tab]"));
    if (!buttons.length) return;
    header.dataset.xconTabsSingleBound = "true";
    const scope = header.closest(".tabs-container");
    const panels = scope ? Array.from(scope.querySelectorAll(".tabs-content .tab-content")) : [];
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const id2 = button.getAttribute("data-tab");
        buttons.forEach((item) => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
          syncSingleTabsVisualState(header, item, active);
        });
        panels.forEach((panel) => {
          panel.style.display = panel.id === id2 ? "block" : "none";
        });
      });
    });
  });
  root2.querySelectorAll("[data-xcon-accordion-toggle]").forEach((button) => {
    if (button.dataset.xconAccordionBound === "true") return;
    button.dataset.xconAccordionBound = "true";
    button.addEventListener("click", () => {
      const item = button.closest(".accordion-item");
      if (!item) return;
      const content = item.querySelector(".accordion-content");
      const arrow = item.querySelector(".accordion-arrow");
      if (content) {
        const container = item.closest(".xa-ext-accordion-host");
        const multiple = button.getAttribute("data-xcon-accordion-multiple") === "true";
        const open2 = content.style.display !== "block";
        if (!multiple && container) {
          container.querySelectorAll(".accordion-content").forEach((panel) => {
            panel.style.display = "none";
          });
          container.querySelectorAll(".accordion-arrow").forEach((icon) => {
            icon.style.transform = "rotate(0deg)";
          });
          container.querySelectorAll("[data-xcon-accordion-toggle]").forEach((toggle) => {
            toggle.setAttribute("aria-expanded", "false");
          });
        }
        content.style.display = open2 ? "block" : "none";
        if (arrow) arrow.style.transform = open2 ? "rotate(90deg)" : "rotate(0deg)";
        button.setAttribute("aria-expanded", open2 ? "true" : "false");
        return;
      }
      const body = item.querySelector(".accordion-body");
      const open = !item.classList.contains("open");
      item.classList.toggle("open", open);
      button.classList.toggle("expanded", open);
      button.setAttribute("aria-expanded", open ? "true" : "false");
      if (body) body.style.maxHeight = open ? `${body.scrollHeight}px` : "0";
    });
  });
  root2.querySelectorAll("[data-xcon-alert-close]").forEach((button) => {
    if (button.dataset.xconAlertBound === "true") return;
    button.dataset.xconAlertBound = "true";
    button.addEventListener("click", () => button.closest(".alert")?.remove());
  });
  root2.querySelectorAll("[data-xcon-search-single]").forEach((search) => {
    if (search.dataset.xconSearchSingleBound === "true") return;
    search.dataset.xconSearchSingleBound = "true";
    const input = search.querySelector("[data-xcon-search-single-input]");
    const clear = search.querySelector("[data-xcon-search-single-clear]");
    const submit = search.querySelector("[data-xcon-search-single-submit]");
    const rawDelay = Number(input?.getAttribute("data-xcon-search-debounce-delay") ?? 0);
    const debounceDelay = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 0;
    let debounceTimer = 0;
    const sync = () => {
      if (clear && input) clear.style.display = input.value ? "" : "none";
    };
    const emitInput = () => {
      if (!input) return;
      search.dispatchEvent(new CustomEvent("xcon-search-input", { bubbles: true, detail: { value: input.value } }));
    };
    const scheduleInput = () => {
      sync();
      if (debounceTimer) window.clearTimeout(debounceTimer);
      if (debounceDelay > 0) {
        debounceTimer = window.setTimeout(emitInput, debounceDelay);
      } else {
        emitInput();
      }
    };
    input?.addEventListener("input", scheduleInput);
    input?.addEventListener("keypress", (event) => {
      if (event.key === "Enter") submit?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    clear?.addEventListener("click", () => {
      if (!input) return;
      input.value = "";
      scheduleInput();
      input.focus();
    });
    sync();
  });
  root2.querySelectorAll("[data-xcon-search]").forEach((search) => {
    if (search.dataset.xconSearchBound === "true") return;
    search.dataset.xconSearchBound = "true";
    const input = search.querySelector("[data-xcon-search-field]");
    const clear = search.querySelector("[data-xcon-search-clear]");
    const results = input ? document.getElementById(input.getAttribute("data-xcon-search-field") ?? "") : null;
    const sync = () => {
      clear?.classList.toggle("show", Boolean(input?.value));
      results?.classList.toggle("show", document.activeElement === input || Boolean(input?.value));
    };
    input?.addEventListener("input", sync);
    input?.addEventListener("focus", sync);
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") results?.classList.remove("show");
    });
    clear?.addEventListener("click", () => {
      if (!input) return;
      input.value = "";
      input.focus();
      sync();
    });
    results?.querySelectorAll(".search-result-item").forEach((item) => {
      item.addEventListener("click", () => {
        const label = item.querySelector(".label");
        if (input && label) input.value = label.textContent ?? "";
        results.classList.remove("show");
        sync();
      });
    });
    sync();
  });
}
function syncSingleTabsVisualState(header, button, active) {
  const container = header.closest(".tabs-container");
  const host = container?.closest(".xa-ext-tabs-host");
  const variant = host?.getAttribute("data-tabs-variant") ?? (header.classList.contains("tabs-header-underline") ? "underline" : header.classList.contains("tabs-header-pills") ? "pills" : "default");
  const position = host?.getAttribute("data-tabs-position") ?? (container?.classList.contains("tabs-position-bottom") ? "bottom" : container?.classList.contains("tabs-position-left") ? "left" : container?.classList.contains("tabs-position-right") ? "right" : "top");
  const radiusByPos = {
    top: "4px 4px 0 0",
    bottom: "0 0 4px 4px",
    left: "4px 0 0 4px",
    right: "0 4px 4px 0"
  };
  const underlineSide = position === "bottom" ? "borderTop" : position === "left" ? "borderRight" : position === "right" ? "borderLeft" : "borderBottom";
  button.style.borderTop = "none";
  button.style.borderRight = "none";
  button.style.borderBottom = "none";
  button.style.borderLeft = "none";
  if (variant === "underline") {
    button.style.backgroundColor = "transparent";
    button.style.color = active ? "#007bff" : "#6b7280";
    button.style.border = "none";
    button.style[underlineSide] = `2px solid ${active ? "#007bff" : "transparent"}`;
    button.style.borderRadius = "0";
    return;
  }
  if (variant === "pills") {
    button.style.backgroundColor = active ? "#007bff" : "#e9ecef";
    button.style.color = active ? "white" : "#495057";
    button.style.border = "none";
    button.style.borderRadius = "20px";
    return;
  }
  button.style.backgroundColor = active ? "#007bff" : "#f8f9fa";
  button.style.color = active ? "white" : "#333";
  button.style.border = "1px solid #ddd";
  button.style.borderRadius = radiusByPos[position] ?? radiusByPos.top;
}
function hydratePickerControls(root2 = document) {
  const pickerSuffix = (picker, fallback) => String(picker.getAttribute("data-xcon-picker-suffix") ?? picker.getAttribute("data-key") ?? picker.id ?? fallback).replace(/[^a-zA-Z0-9_-]/g, "_");
  root2.querySelectorAll("[data-xcon-date-picker]").forEach((picker) => {
    if (picker.dataset.xconDateBound === "true") return;
    picker.dataset.xconDateBound = "true";
    const suffix = pickerSuffix(picker, "datePicker");
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let cur = /* @__PURE__ */ new Date();
    let selected = null;
    const monthLabel = picker.querySelector(`#dpMonthLabel_${suffix}`);
    const body = picker.querySelector(`#dpBody_${suffix}`);
    const prevBtn = picker.querySelector(`#dpPrev_${suffix}`);
    const nextBtn = picker.querySelector(`#dpNext_${suffix}`);
    if (!monthLabel || !body || !prevBtn || !nextBtn) return;
    const render2 = () => {
      monthLabel.textContent = `${months[cur.getMonth()]} ${cur.getFullYear()}`;
      body.innerHTML = "";
      const first = new Date(cur.getFullYear(), cur.getMonth(), 1).getDay();
      const days = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const today = /* @__PURE__ */ new Date();
      let row = document.createElement("tr");
      let count = 0;
      for (let i = 0; i < first; i += 1) {
        const prevDate = new Date(cur.getFullYear(), cur.getMonth(), -first + i + 1);
        const td = document.createElement("td");
        const d = document.createElement("div");
        d.className = "date-day other-month";
        d.textContent = String(prevDate.getDate());
        td.appendChild(d);
        row.appendChild(td);
        count += 1;
      }
      for (let day = 1; day <= days; day += 1) {
        const td = document.createElement("td");
        const div = document.createElement("div");
        div.className = "date-day";
        div.textContent = String(day);
        if (day === today.getDate() && cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear()) div.classList.add("today");
        if (selected && day === selected.getDate() && cur.getMonth() === selected.getMonth() && cur.getFullYear() === selected.getFullYear()) div.classList.add("selected");
        div.addEventListener("click", () => {
          selected = new Date(cur.getFullYear(), cur.getMonth(), day);
          render2();
        });
        td.appendChild(div);
        row.appendChild(td);
        count += 1;
        if (count % 7 === 0) {
          body.appendChild(row);
          row = document.createElement("tr");
        }
      }
      if (count % 7 !== 0) {
        while (count % 7 !== 0) {
          row.appendChild(document.createElement("td"));
          count += 1;
        }
        body.appendChild(row);
      }
    };
    prevBtn.addEventListener("click", () => {
      cur.setMonth(cur.getMonth() - 1);
      render2();
    });
    nextBtn.addEventListener("click", () => {
      cur.setMonth(cur.getMonth() + 1);
      render2();
    });
    render2();
  });
  root2.querySelectorAll("[data-xcon-time-picker]").forEach((picker) => {
    if (picker.dataset.xconTimeBound === "true") return;
    picker.dataset.xconTimeBound = "true";
    const suffix = pickerSuffix(picker, "timePicker");
    const hourList = picker.querySelector(`#tpHourList_${suffix}`);
    const minList = picker.querySelector(`#tpMinList_${suffix}`);
    const tpHour = picker.querySelector(`#tpHour_${suffix}`);
    const tpMin = picker.querySelector(`#tpMin_${suffix}`);
    const tpAmpm = picker.querySelector(`#tpAmpm_${suffix}`);
    const tpAmpmList = picker.querySelector(`#tpAmpmList_${suffix}`);
    if (!hourList || !minList || !tpHour || !tpMin || !tpAmpm || !tpAmpmList) return;
    let selH = 9;
    let selM = 30;
    let selAP = "AM";
    for (let i = 1; i <= 12; i += 1) {
      const el = document.createElement("div");
      el.className = `time-picker__item${i === selH ? " selected" : ""}`;
      el.textContent = String(i).padStart(2, "0");
      el.setAttribute("data-v", String(i));
      el.addEventListener("click", () => {
        selH = i;
        hourList.querySelectorAll(".time-picker__item").forEach((item) => item.classList.remove("selected"));
        el.classList.add("selected");
        tpHour.textContent = String(i).padStart(2, "0");
      });
      hourList.appendChild(el);
    }
    for (let i = 0; i < 60; i += 5) {
      const el = document.createElement("div");
      el.className = `time-picker__item${i === selM ? " selected" : ""}`;
      el.textContent = String(i).padStart(2, "0");
      el.setAttribute("data-v", String(i));
      el.addEventListener("click", () => {
        selM = i;
        minList.querySelectorAll(".time-picker__item").forEach((item) => item.classList.remove("selected"));
        el.classList.add("selected");
        tpMin.textContent = String(i).padStart(2, "0");
      });
      minList.appendChild(el);
    }
    tpAmpmList.querySelectorAll(".time-picker__item").forEach((el) => {
      el.addEventListener("click", () => {
        selAP = el.getAttribute("data-v") ?? "AM";
        tpAmpmList.querySelectorAll(".time-picker__item").forEach((item) => item.classList.remove("selected"));
        el.classList.add("selected");
        tpAmpm.textContent = selAP;
      });
    });
  });
  root2.querySelectorAll("[data-xcon-color-picker]").forEach((picker) => {
    if (picker.dataset.xconColorBound === "true") return;
    picker.dataset.xconColorBound = "true";
    const preview = picker.querySelector("[data-xcon-color-preview]");
    const dot = picker.querySelector("[data-xcon-color-dot]");
    const hexInput = picker.querySelector("[data-xcon-color-hex]");
    const colorInput = picker.querySelector("[data-xcon-color-input]");
    const applyHex = (hex2) => {
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex2)) return;
      if (preview) preview.style.background = hex2;
      if (dot) dot.style.background = hex2;
      if (hexInput) hexInput.value = hex2;
      if (colorInput) colorInput.value = hex2;
    };
    picker.querySelectorAll(".color-swatch[data-hex]").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        picker.querySelectorAll(".color-swatch").forEach((item) => item.classList.remove("selected"));
        swatch.classList.add("selected");
        applyHex(swatch.getAttribute("data-hex") ?? "");
      });
    });
    hexInput?.addEventListener("input", () => applyHex(hexInput.value || ""));
    colorInput?.addEventListener("input", () => applyHex(colorInput.value || ""));
    const hue = picker.querySelector("[data-xcon-color-hue]");
    hue?.addEventListener("input", () => applyHex(hslToHex(Number(hue.value || 0), 70, 60)));
  });
}
function hydrateGalleryControls(root2 = document) {
  root2.querySelectorAll("[data-xcon-gallery]").forEach((gallery) => {
    if (gallery.dataset.xconGalleryBound === "true") return;
    gallery.dataset.xconGalleryBound = "true";
    const singleModal = gallery.querySelector("[data-xcon-gallery-single-modal]");
    if (singleModal) {
      const modalImg = singleModal.querySelector("[data-xcon-gallery-single-image]");
      const items = Array.from(gallery.querySelectorAll("[data-xcon-gallery-single-item]"));
      let index2 = 0;
      const show = (nextIndex) => {
        if (!items.length || !modalImg) return;
        index2 = (nextIndex % items.length + items.length) % items.length;
        const img = items[index2]?.querySelector("img");
        if (!img) return;
        modalImg.src = img.currentSrc || img.src || "";
        modalImg.alt = img.alt || "";
        singleModal.style.display = "flex";
      };
      const hideSingle = () => {
        singleModal.style.display = "none";
      };
      items.forEach((item, itemIndex) => item.addEventListener("click", () => show(itemIndex)));
      singleModal.querySelector("[data-xcon-gallery-single-close]")?.addEventListener("click", hideSingle);
      singleModal.querySelector("[data-xcon-gallery-single-prev]")?.addEventListener("click", (event) => {
        event.stopPropagation();
        show(index2 - 1);
      });
      singleModal.querySelector("[data-xcon-gallery-single-next]")?.addEventListener("click", (event) => {
        event.stopPropagation();
        show(index2 + 1);
      });
      singleModal.addEventListener("click", (event) => {
        if (event.target === singleModal) hideSingle();
      });
      return;
    }
    const lightbox = gallery.querySelector("[data-xcon-gallery-lightbox]");
    const lightboxImg = gallery.querySelector("[data-xcon-gallery-lightbox-img]");
    const close = gallery.querySelector("[data-xcon-gallery-close]");
    gallery.querySelectorAll(".gallery-item").forEach((item) => {
      item.addEventListener("click", () => {
        const img = item.querySelector("img");
        if (!img || !lightbox || !lightboxImg) return;
        lightboxImg.src = (img.currentSrc || img.src || "").replace("w=400", "w=1200");
        lightboxImg.alt = img.alt || "";
        lightbox.classList.add("open");
      });
    });
    const hide = () => {
      lightbox?.classList.remove("open");
    };
    close?.addEventListener("click", hide);
    lightbox?.addEventListener("click", (event) => {
      if (event.target === lightbox) hide();
    });
  });
}
function hydrateTreeViews(root2 = document) {
  root2.querySelectorAll("[data-xcon-tree-view]").forEach((tree) => {
    if (tree.dataset.xconTreeBound === "true") return;
    tree.dataset.xconTreeBound = "true";
    tree.querySelectorAll("[data-xcon-tree-row]").forEach((row) => {
      row.addEventListener("click", () => {
        const children2 = row.parentElement?.querySelector(":scope > .tree-children");
        if (children2) {
          const open = row.classList.contains("expanded");
          row.classList.toggle("expanded", !open);
          children2.classList.toggle("collapsed", open);
        }
        tree.querySelectorAll(".tree-row").forEach((item) => item.classList.remove("selected"));
        row.classList.add("selected");
      });
    });
  });
}
function hydrateQrCodes(root2 = document) {
  root2.querySelectorAll("[data-xcon-qr-code]").forEach((host) => {
    if (host.dataset.xconQrBound === "true") return;
    host.dataset.xconQrBound = "true";
    const canvas = host.querySelector("[data-xcon-qr-canvas]");
    const input = host.querySelector("[data-xcon-qr-input]");
    const button = host.querySelector("[data-xcon-qr-generate]");
    const run = () => drawPseudoQr(canvas, input?.value ?? canvas?.getAttribute("data-xcon-qr-text") ?? "");
    button?.addEventListener("click", run);
    input?.addEventListener("change", run);
    run();
  });
}
function hydrateBarcodes(root2 = document) {
  root2.querySelectorAll("[data-xcon-barcode]").forEach((host) => {
    if (host.dataset.xconBarcodeBound === "true") return;
    host.dataset.xconBarcodeBound = "true";
    const canvas = host.querySelector("[data-xcon-barcode-canvas]");
    const textEl = host.querySelector("[data-xcon-barcode-text]");
    const input = host.querySelector("[data-xcon-barcode-input]");
    const button = host.querySelector("[data-xcon-barcode-draw]");
    const run = () => drawPseudoBarcode(canvas, textEl, input?.value ?? canvas?.getAttribute("data-xcon-barcode-value") ?? "");
    button?.addEventListener("click", run);
    input?.addEventListener("change", run);
    run();
  });
}
function hydrateTooltipControls(root2 = document) {
  root2.querySelectorAll("[data-xcon-tooltip]").forEach((host) => {
    if (host.dataset.xconTooltipBound === "true") return;
    host.dataset.xconTooltipBound = "true";
    const trigger = host.querySelector(".tooltip-trigger");
    const tooltip = host.querySelector(".tooltip");
    if (!trigger || !tooltip) return;
    const rawDelay = Number(host.getAttribute("data-xcon-tooltip-delay") ?? 0);
    const delay = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 0;
    let showTimer = 0;
    const show = () => {
      tooltip.classList.add("open");
    };
    const showDelayed = () => {
      window.clearTimeout(showTimer);
      if (delay > 0) showTimer = window.setTimeout(show, delay);
      else show();
    };
    const hide = () => {
      window.clearTimeout(showTimer);
      tooltip.classList.remove("open");
    };
    const toggle = (event) => {
      event.preventDefault();
      tooltip.classList.toggle("open");
    };
    if (host.getAttribute("data-xcon-tooltip-trigger") === "click") {
      trigger.addEventListener("click", toggle);
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") toggle(event);
        if (event.key === "Escape") hide();
      });
    } else {
      trigger.addEventListener("mouseenter", showDelayed);
      trigger.addEventListener("mouseleave", hide);
      trigger.addEventListener("focus", showDelayed);
      trigger.addEventListener("blur", hide);
    }
  });
}
function hydrateModalControls(root2 = document) {
  root2.querySelectorAll("[data-xcon-modal]").forEach((host) => {
    if (host.dataset.xconModalBound === "true") return;
    host.dataset.xconModalBound = "true";
    const modalById = (id2) => {
      if (!id2) return null;
      return host.querySelector(`#${cssEscapeIdentifier(id2)}`);
    };
    const open = (id2) => {
      modalById(id2)?.classList.add("open");
    };
    const close = (id2) => {
      modalById(id2)?.classList.remove("open");
    };
    host.querySelectorAll("[data-xcon-modal-open]").forEach((button) => {
      button.addEventListener("click", () => open(button.getAttribute("data-xcon-modal-open")));
    });
    host.querySelectorAll("[data-xcon-modal-close]").forEach((button) => {
      button.addEventListener("click", () => close(button.getAttribute("data-xcon-modal-close")));
    });
    host.querySelectorAll("[data-xcon-modal-target]").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal && modal.getAttribute("data-xcon-modal-close-on-backdrop") !== "false") modal.classList.remove("open");
      });
    });
  });
}
function hydrateRatingControls(root2 = document) {
  root2.querySelectorAll("[data-xcon-rating-group]").forEach((group) => {
    if (group.dataset.xconRatingBound === "true") return;
    group.dataset.xconRatingBound = "true";
    const labels = Array.from(group.querySelectorAll("[data-xcon-rating-star]"));
    const row = group.closest(".rating-row");
    const score = row?.querySelector("[data-xcon-rating-score]") ?? null;
    let current3 = Number(group.getAttribute("data-xcon-rating-value") || 0);
    const paint = (value) => {
      labels.forEach((label, index2) => {
        const active = index2 < value;
        label.classList.toggle("active", active);
        if (label.classList.contains("rating-star")) label.style.color = active ? "#ffc107" : "#e9ecef";
      });
    };
    labels.forEach((label, index2) => {
      const value = index2 + 1;
      label.addEventListener("mouseenter", () => paint(value));
      label.addEventListener("mouseleave", () => paint(current3));
      label.addEventListener("focus", () => paint(value));
      label.addEventListener("blur", () => paint(current3));
      label.addEventListener("click", () => {
        current3 = value;
        group.setAttribute("data-xcon-rating-value", String(current3));
        if (score) {
          score.textContent = group.classList.contains("rating-stars") ? `${current3}/${labels.length}` : `${current3}.0`;
        }
        paint(current3);
      });
      label.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          label.click();
        }
      });
    });
    paint(current3);
  });
}
function drawPseudoQr(canvas, text) {
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  const size = canvas.width || 180;
  const foreground = canvas.getAttribute("data-xcon-qr-foreground") || "#000";
  const background = canvas.getAttribute("data-xcon-qr-background") || "#fff";
  const cell = Math.max(3, Math.floor(size / 30));
  const margin = 2;
  const cols = Math.floor((size - margin * 2) / cell);
  const value = text || "https://xconviewer.dev";
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);
  let seed = value.split("").reduce((total, char) => total * 31 + char.charCodeAt(0), 0) >>> 0;
  const rand = () => {
    seed = seed * 1664525 + 1013904223 >>> 0;
    return seed / 4294967296;
  };
  const finder = (x2, y2) => {
    context.fillStyle = foreground;
    context.fillRect(x2, y2, cell * 7, cell * 7);
    context.fillStyle = background;
    context.fillRect(x2 + cell, y2 + cell, cell * 5, cell * 5);
    context.fillStyle = foreground;
    context.fillRect(x2 + cell * 2, y2 + cell * 2, cell * 3, cell * 3);
  };
  const offset = margin * cell;
  finder(offset, offset);
  finder(size - offset - cell * 7, offset);
  finder(offset, size - offset - cell * 7);
  for (let row = 0; row < cols; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (row < 8 && col < 8 || row < 8 && col >= cols - 8 || row >= cols - 8 && col < 8) continue;
      if (rand() > 0.5) {
        context.fillStyle = foreground;
        context.fillRect(margin * cell + col * cell, margin * cell + row * cell, cell - 1, cell - 1);
      }
    }
  }
}
function drawPseudoBarcode(canvas, textEl, value) {
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  const width = canvas.width || 280;
  const height = canvas.height || 80;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  const code = String(value || "").replace(/\D/g, "").substring(0, 13).padStart(13, "0");
  if (textEl) textEl.textContent = code.split("").join(" ");
  const enc = {
    0: "0001101",
    1: "0011001",
    2: "0010011",
    3: "0111101",
    4: "0100011",
    5: "0110001",
    6: "0101111",
    7: "0111011",
    8: "0110111",
    9: "0001011"
  };
  const rEnc = {
    0: "1110010",
    1: "1100110",
    2: "1101100",
    3: "1000010",
    4: "1011100",
    5: "1001110",
    6: "1010000",
    7: "1000100",
    8: "1001000",
    9: "1110100"
  };
  let bits = "101";
  for (let i = 1; i <= 6; i += 1) bits += enc[Number(code[i])];
  bits += "01010";
  for (let i = 7; i <= 12; i += 1) bits += rEnc[Number(code[i])];
  bits += "101";
  const requestedBarWidth = Number(canvas.getAttribute("data-xcon-barcode-bar-width") || 0);
  const barWidth = requestedBarWidth > 0 ? Math.min(requestedBarWidth, (width - 20) / bits.length) : (width - 20) / bits.length;
  context.fillStyle = "#000";
  for (let index2 = 0; index2 < bits.length; index2 += 1) {
    if (bits[index2] === "1") context.fillRect(10 + index2 * barWidth, 4, barWidth + 0.5, height - 12);
  }
}
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a2 = s * Math.min(l, 1 - l);
  const f = (n) => {
    const color2 = l - a2 * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color2).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function shapeImageAnimationStateFor(shape) {
  let state = shapeImageAnimationStates.get(shape);
  if (!state) {
    state = { index: 0, timer: void 0, bound: false, forward: true, iterationCount: 0 };
    shapeImageAnimationStates.set(shape, state);
  }
  return state;
}
function shapeImageAnimationImages(shape) {
  try {
    const parsed = JSON.parse(shape.dataset.xconShapeImages ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && Boolean(item)) : [];
  } catch {
    return [];
  }
}
function shapeCssUrl(url) {
  return `url("${url.replace(/["\\]/g, "\\$&")}")`;
}
function setShapeAnimationImage(shape, url) {
  if (url) shape.style.backgroundImage = shapeCssUrl(url);
}
function maxShapeImageAnimationIterations(shape) {
  const mode = shape.dataset.xconShapeMode || "infinite";
  if (mode === "infinite") return Infinity;
  return Number.parseInt(mode, 10) || 1;
}
function advanceShapeImageAnimation(state, images, direction) {
  if (direction === "alternate") {
    if (state.forward) {
      state.index += 1;
      if (state.index >= images.length - 1) {
        state.index = images.length - 1;
        state.forward = false;
        state.iterationCount += 1;
      }
    } else {
      state.index -= 1;
      if (state.index <= 0) {
        state.index = 0;
        state.forward = true;
        state.iterationCount += 1;
      }
    }
    return;
  }
  if (direction === "reverse") {
    state.index = state.index <= 0 ? images.length - 1 : state.index - 1;
    if (state.index === images.length - 1) state.iterationCount += 1;
    return;
  }
  state.index = (state.index + 1) % images.length;
  if (state.index === 0) state.iterationCount += 1;
}
function scheduleShapeImageAnimation(shape) {
  const state = shapeImageAnimationStateFor(shape);
  const images = shapeImageAnimationImages(shape);
  if (images.length <= 1) return;
  if (state.iterationCount >= maxShapeImageAnimationIterations(shape)) return;
  const duration = Math.max(100, Number(shape.dataset.xconShapeDuration || 3e3));
  state.timer = window.setTimeout(() => {
    advanceShapeImageAnimation(state, images, shape.dataset.xconShapeDirection || "normal");
    setShapeAnimationImage(shape, images[state.index]);
    scheduleShapeImageAnimation(shape);
  }, duration);
}
function hydrateShapeImageAnimations(root2 = document) {
  root2.querySelectorAll('[data-xcon-shape-image-animation="true"]').forEach((shape) => {
    const images = shapeImageAnimationImages(shape);
    if (images.length <= 1) return;
    const state = shapeImageAnimationStateFor(shape);
    if (state.timer !== void 0) window.clearTimeout(state.timer);
    state.timer = void 0;
    state.bound = true;
    state.index = 0;
    state.forward = true;
    state.iterationCount = 0;
    setShapeAnimationImage(shape, images[0]);
    scheduleShapeImageAnimation(shape);
  });
}
function hydrateFlipbooks(root2 = document) {
  root2.querySelectorAll(".xa-flipbook-container").forEach((host) => {
    if (host.dataset.xconFlipbookBound === "true") return;
    host.dataset.xconFlipbookBound = "true";
    const pages = Array.from(host.querySelectorAll(".ui-flipbook .page"));
    if (pages.length === 0) return;
    const current3 = host.querySelector('[id^="current-page-"]');
    const miniatures = Array.from(host.querySelectorAll("[data-xcon-flipbook-page]"));
    const miniatureList = host.querySelector("[data-xcon-flipbook-miniatures-list]");
    const viewer = host.querySelector(".flipbook-viewer");
    let index2 = 0;
    let zoomed = false;
    const show = (next) => {
      index2 = Math.max(0, Math.min(pages.length - 1, next));
      pages.forEach((page, pageIndex) => {
        page.style.display = pageIndex === index2 ? "flex" : "none";
      });
      if (current3) current3.textContent = String(index2 + 1);
      miniatures.forEach((button, pageIndex) => button.classList.toggle("active", pageIndex === index2));
    };
    host.querySelectorAll("[data-xcon-flipbook-next]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        show(index2 + 1 >= pages.length ? 0 : index2 + 1);
      });
    });
    host.querySelectorAll("[data-xcon-flipbook-prev]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        show(index2 - 1 < 0 ? pages.length - 1 : index2 - 1);
      });
    });
    miniatures.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        show(Number(button.getAttribute("data-xcon-flipbook-page") || 1) - 1);
      });
    });
    host.querySelectorAll("[data-xcon-flipbook-miniatures]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (miniatureList) miniatureList.style.display = miniatureList.style.display === "none" ? "block" : "none";
      });
    });
    host.querySelectorAll("[data-xcon-flipbook-zoom]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        zoomed = !zoomed;
        if (viewer) viewer.style.transform = zoomed ? "scale(1.5)" : "";
      });
    });
    host.querySelectorAll("[data-xcon-flipbook-fullscreen]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen();
        else if (host.requestFullscreen) void host.requestFullscreen();
      });
    });
    show(0);
  });
}
function hydrateSpanGrids(root2 = document) {
  root2.querySelectorAll("[data-xcon-spangrid]").forEach((host) => {
    if (host.dataset.xconSpangridBound === "true") return;
    host.dataset.xconSpangridBound = "true";
    host.classList.add("xa-spangrid-container--hydrated");
  });
}
function loadLeafletRuntime() {
  const current3 = window.L;
  if (current3 && typeof current3.map === "function") return Promise.resolve(current3);
  if (leafletRuntimePromise) return leafletRuntimePromise;
  leafletRuntimePromise = new Promise((resolve, reject) => {
    void ensureLeafletStyles(document);
    const existing = document.querySelector("script[data-xcon-leaflet-js]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = leafletJsUrl;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-xcon-leaflet-js", "true");
    script.addEventListener("load", () => resolve(window.L));
    script.addEventListener("error", reject);
    document.head.appendChild(script);
  });
  return leafletRuntimePromise;
}
function ensureLeafletStyles(rootNode) {
  const target = rootNode instanceof ShadowRoot ? rootNode : document.head;
  if (target.querySelector("link[data-xcon-leaflet-css]")) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = leafletCssUrl;
    link.setAttribute("data-xcon-leaflet-css", "true");
    link.addEventListener("load", () => resolve());
    link.addEventListener("error", () => resolve());
    target.appendChild(link);
  });
}
function parseLeafletMarkers(host) {
  try {
    const parsed = JSON.parse(host.getAttribute("data-xcon-map-markers") || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
  } catch {
    return [];
  }
}
function parseLeafletJsonAttr(host, name, fallback) {
  try {
    const raw = host.getAttribute(name);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === void 0 || parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}
function leafletPoint(value) {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) {
    const lat2 = Number(plain[0]);
    const lng2 = Number(plain[1]);
    return Number.isFinite(lat2) && Number.isFinite(lng2) ? [lat2, lng2] : void 0;
  }
  const record = objectRecord(plain);
  if (!record) return void 0;
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lng ?? record.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : void 0;
}
function leafletLayerPoints(value) {
  const record = objectRecord(toPlainValue(value));
  const source = record ? record.points ?? record.path ?? record.coordinates ?? record.latlngs ?? record.latLngs : value;
  if (!Array.isArray(source)) return [];
  return source.map(leafletPoint).filter((point) => Boolean(point));
}
function leafletLayerStyle(layer, fallbackColor) {
  const record = objectRecord(toPlainValue(layer)) ?? {};
  const color2 = String(record.color ?? record.stroke ?? record.strokeColor ?? fallbackColor);
  return {
    color: color2,
    weight: finiteNumber(record.weight ?? record.strokeWidth, 3),
    opacity: finiteNumber(record.opacity, 0.85),
    fillColor: String(record.fillColor ?? record.fill ?? color2),
    fillOpacity: finiteNumber(record.fillOpacity, 0.18)
  };
}
function leafletHeatPoint(value) {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) {
    const lat2 = Number(plain[0]);
    const lng2 = Number(plain[1]);
    const intensity2 = finiteNumber(plain[2], 1);
    return Number.isFinite(lat2) && Number.isFinite(lng2) ? [lat2, lng2, intensity2] : void 0;
  }
  const record = objectRecord(plain);
  if (!record) return void 0;
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lng ?? record.longitude);
  const intensity = finiteNumber(record.value ?? record.intensity ?? record.weight, 1);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng, intensity] : void 0;
}
function applyLeafletMapLayers(leaflet, map, host) {
  const L = leaflet;
  parseLeafletJsonAttr(host, "data-xcon-map-polylines", []).forEach((layer) => {
    const points = leafletLayerPoints(layer);
    if (points.length < 2 || typeof L.polyline !== "function") return;
    L.polyline(points, leafletLayerStyle(layer, "#2563eb")).addTo(map);
  });
  parseLeafletJsonAttr(host, "data-xcon-map-polygons", []).forEach((layer) => {
    const points = leafletLayerPoints(layer);
    if (points.length < 3 || typeof L.polygon !== "function") return;
    L.polygon(points, leafletLayerStyle(layer, "#14b8a6")).addTo(map);
  });
  const heatmap = parseLeafletJsonAttr(host, "data-xcon-map-heatmap", []).map(leafletHeatPoint).filter((point) => Boolean(point));
  if (heatmap.length && typeof L.heatLayer === "function") {
    L.heatLayer(heatmap, { radius: 24, blur: 18 }).addTo(map);
  }
}
function leafletMarkerStatus(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
}
function leafletMarkerIcon(leaflet, marker, label) {
  const L = leaflet;
  if (!L || typeof L.divIcon !== "function") return void 0;
  const status = leafletMarkerStatus(marker.status);
  return L.divIcon({
    className: `xcon-leaflet-marker${status ? ` xcon-leaflet-marker--${status}` : ""}`,
    html: escapeHtml2(label.slice(0, 2) || "\u2022"),
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -24]
  });
}
function hydrateLeafletMaps(root2 = document) {
  root2.querySelectorAll("[data-xcon-leaflet-map]").forEach((host) => {
    if (host.dataset.xconLeafletBound === "true" || host.dataset.xconLeafletBound === "pending") return;
    host.dataset.xconLeafletBound = "pending";
    void Promise.all([loadLeafletRuntime(), ensureLeafletStyles(host.getRootNode())]).then(([leaflet]) => {
      const L = leaflet;
      if (!L || typeof L.map !== "function" || typeof L.tileLayer !== "function") throw new Error("Leaflet unavailable");
      const lat = Number(host.getAttribute("data-latitude") || 37.5665);
      const lng = Number(host.getAttribute("data-longitude") || 126.978);
      const zoom = Number(host.getAttribute("data-zoom") || 10);
      const showControls = host.getAttribute("data-xcon-map-show-controls") !== "false";
      const enableZoom = host.getAttribute("data-xcon-map-enable-zoom") !== "false";
      const enablePan = host.getAttribute("data-xcon-map-enable-pan") !== "false";
      const tileUrl = host.getAttribute("data-xcon-map-tile-url") || openStreetMapTileUrl;
      const attribution = host.getAttribute("data-xcon-map-attribution") || openStreetMapAttribution;
      host.innerHTML = "";
      host.classList.add("xa-map-static--live");
      const map = L.map(host, {
        zoomControl: showControls,
        dragging: enablePan,
        scrollWheelZoom: enableZoom,
        doubleClickZoom: enableZoom,
        boxZoom: enableZoom,
        keyboard: enableZoom,
        attributionControl: true
      });
      map.setView([lat, lng], zoom);
      L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
      const hostWithMap = host;
      hostWithMap._xconLeafletMap = map;
      hostWithMap._leaflet_map = map;
      parseLeafletMarkers(host).forEach((marker, index2) => {
        if (typeof L.marker !== "function") return;
        const markerLat = Number(marker.lat ?? marker.latitude);
        const markerLng = Number(marker.lng ?? marker.longitude);
        if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) return;
        const label = String(marker.label ?? marker.title ?? marker.popup ?? index2 + 1);
        const icon = leafletMarkerIcon(leaflet, marker, label);
        const pin = L.marker([markerLat, markerLng], icon ? { icon } : void 0).addTo(map);
        if (label && typeof pin.bindPopup === "function") pin.bindPopup(label);
      });
      applyLeafletMapLayers(leaflet, map, host);
      window.setTimeout(() => map.invalidateSize(), 50);
      host.dataset.xconLeafletBound = "true";
    }).catch(() => {
      host.dataset.xconLeafletBound = "failed";
    });
  });
}
function extCarouselStateFor(carousel) {
  let state = extCarouselStates.get(carousel);
  if (!state) {
    state = { index: 0, timer: void 0, bound: false, startX: 0, startY: 0, dragging: false };
    extCarouselStates.set(carousel, state);
  }
  return state;
}
function extCarouselItems(carousel) {
  return Array.from(carousel.querySelectorAll(".carousel-content .carousel-item"));
}
function syncExtCarousel(carousel) {
  const state = extCarouselStateFor(carousel);
  const items = extCarouselItems(carousel);
  const count = items.length;
  if (!count) return;
  state.index = (state.index % count + count) % count;
  items.forEach((item, index2) => {
    item.style.display = index2 === state.index ? "block" : "none";
  });
  carousel.querySelectorAll(".carousel-dot").forEach((dot, index2) => {
    const active = index2 === state.index;
    dot.classList.toggle("active", active);
    dot.setAttribute("aria-current", active ? "true" : "false");
  });
}
function goToExtCarousel(carousel, index2) {
  const items = extCarouselItems(carousel);
  if (!items.length) return;
  const state = extCarouselStateFor(carousel);
  state.index = (index2 % items.length + items.length) % items.length;
  syncExtCarousel(carousel);
}
function nextExtCarousel(carousel) {
  const state = extCarouselStateFor(carousel);
  goToExtCarousel(carousel, state.index + 1);
}
function previousExtCarousel(carousel) {
  const state = extCarouselStateFor(carousel);
  goToExtCarousel(carousel, state.index - 1);
}
function startExtCarouselAutoplay(carousel) {
  const state = extCarouselStateFor(carousel);
  if (state.timer !== void 0) window.clearInterval(state.timer);
  state.timer = void 0;
  if (carousel.dataset.carouselAutoplay !== "true") return;
  const interval2 = Math.max(800, Number(carousel.dataset.carouselInterval || 3e3));
  state.timer = window.setInterval(() => nextExtCarousel(carousel), interval2);
}
function hydrateExtCarousels(root2 = document) {
  root2.querySelectorAll('[data-xcon-ext-carousel="true"]').forEach((carousel) => {
    const state = extCarouselStateFor(carousel);
    if (!state.bound) {
      state.bound = true;
      const restart = () => startExtCarouselAutoplay(carousel);
      const prev = carousel.querySelector("[data-xcon-carousel-prev]");
      const next = carousel.querySelector("[data-xcon-carousel-next]");
      prev?.addEventListener("click", (event) => {
        event.preventDefault();
        previousExtCarousel(carousel);
        restart();
      });
      next?.addEventListener("click", (event) => {
        event.preventDefault();
        nextExtCarousel(carousel);
        restart();
      });
      carousel.querySelectorAll("[data-xcon-carousel-dot]").forEach((dot) => {
        dot.addEventListener("click", (event) => {
          event.preventDefault();
          goToExtCarousel(carousel, Number(dot.getAttribute("data-xcon-carousel-dot") || 0));
          restart();
        });
      });
      carousel.addEventListener("pointerdown", (event) => {
        if (event.target instanceof Element && event.target.closest("button")) return;
        state.dragging = true;
        state.startX = event.clientX;
        state.startY = event.clientY;
        if (state.timer !== void 0) window.clearInterval(state.timer);
        state.timer = void 0;
        if (typeof carousel.setPointerCapture === "function") carousel.setPointerCapture(event.pointerId);
      });
      const finishDrag = (event, canceled) => {
        if (!state.dragging) return;
        state.dragging = false;
        if (typeof carousel.releasePointerCapture === "function") {
          try {
            carousel.releasePointerCapture(event.pointerId);
          } catch {
          }
        }
        const delta = canceled ? 0 : event.clientX - state.startX;
        if (!canceled && Math.abs(delta) > 40) {
          if (delta < 0) nextExtCarousel(carousel);
          else previousExtCarousel(carousel);
        } else {
          syncExtCarousel(carousel);
        }
        restart();
      };
      carousel.addEventListener("pointerup", (event) => finishDrag(event, false));
      carousel.addEventListener("pointercancel", (event) => finishDrag(event, true));
      carousel.addEventListener("mouseleave", restart);
    }
    syncExtCarousel(carousel);
    startExtCarouselAutoplay(carousel);
  });
}
function hydrateImageFallbacks(root2 = document) {
  root2.querySelectorAll("[data-xcon-image-fallback]").forEach((image) => {
    if (image.dataset.xconImageFallbackBound === "true") return;
    image.dataset.xconImageFallbackBound = "true";
    image.addEventListener("error", () => {
      const fallback = image.getAttribute("data-xcon-image-fallback");
      if (!fallback) return;
      if (image.getAttribute("src") !== fallback) image.setAttribute("src", fallback);
      else image.style.display = "none";
    });
  });
}
function hydrateImageSlideshows(root2 = document) {
  root2.querySelectorAll('[data-xcon-image-slideshow="true"]').forEach((image) => {
    if (image.dataset.xconImageSlideshowBound === "true") return;
    image.dataset.xconImageSlideshowBound = "true";
    let images = [];
    try {
      images = JSON.parse(image.getAttribute("data-xcon-image-slideshow-images") ?? "[]");
    } catch {
      images = [];
    }
    const slides = Array.isArray(images) ? images.filter((item) => typeof item === "string" && item.length > 0) : [];
    if (slides.length <= 1) return;
    const duration = Math.max(100, Number(image.getAttribute("data-xcon-image-slideshow-duration") ?? 3e3) || 3e3);
    const mode = String(image.getAttribute("data-xcon-image-slideshow-mode") ?? "loop").toLowerCase();
    let index2 = Math.max(0, slides.indexOf(image.getAttribute("src") ?? slides[0]));
    const timer2 = window.setInterval(() => {
      if (mode === "once" && index2 >= slides.length - 1) {
        window.clearInterval(timer2);
        return;
      }
      index2 = (index2 + 1) % slides.length;
      image.setAttribute("src", slides[index2]);
    }, duration);
  });
}
function sanitizeUrl(value, options = {}) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:") || lowered.startsWith("data:text/html") || /[<>"']/.test(trimmed)) {
    return null;
  }
  if (/^(https?:)?\/\//i.test(trimmed) && !options.allowExternalResources) return null;
  if (lowered.startsWith("data:") && !lowered.startsWith("data:image/")) return null;
  return trimmed;
}
function sanitizeInlineStyle(style) {
  if (typeof style !== "string") return "";
  const declarations = [];
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator <= 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (!allowedCssProperties.has(property)) continue;
    if (!value || activeCssPattern.test(value) || activeCssPattern.test(property)) continue;
    declarations.push(`${property}:${expandThemeTokenAliases(value)}`);
  }
  return declarations.join(";");
}
function bannerStateFor(banner) {
  let state = bannerStates.get(banner);
  if (!state) {
    state = { index: 0, timer: void 0, bound: false, width: 0, startX: 0, startY: 0, dragging: false };
    bannerStates.set(banner, state);
  }
  return state;
}
function syncBannerTrackLayout(banner) {
  const track = banner.querySelector(".banner-container");
  if (!track) return 0;
  const slides = Array.from(track.children);
  const state = bannerStateFor(banner);
  const vertical = banner.dataset.orientation === "vertical";
  const rawAxis = vertical ? banner.clientHeight || banner.offsetHeight : banner.clientWidth || banner.offsetWidth;
  let axis = Math.round(rawAxis || state.width || 0);
  if (axis > 0 && state.width > 0 && Math.abs(axis - state.width) <= 2) axis = state.width;
  if (!axis) return 0;
  state.width = axis;
  track.style.display = "flex";
  track.style.flexDirection = vertical ? "column" : "row";
  track.style.width = vertical ? "100%" : `${axis * slides.length}px`;
  track.style.height = vertical ? `${axis * slides.length}px` : "100%";
  for (const slide of slides) {
    slide.style.flex = `0 0 ${axis}px`;
    slide.style.width = vertical ? "100%" : `${axis}px`;
    slide.style.minWidth = vertical ? "0" : `${axis}px`;
    slide.style.maxWidth = vertical ? "" : `${axis}px`;
    slide.style.height = vertical ? `${axis}px` : "100%";
    slide.style.minHeight = vertical ? `${axis}px` : "0";
    slide.style.maxHeight = vertical ? `${axis}px` : "";
    slide.style.boxSizing = "border-box";
  }
  return axis;
}
function bannerLogicalCount(banner) {
  return Number(banner.dataset.slideCount || banner.querySelectorAll(".banner-indicator").length || 0);
}
function updateBannerDots(banner) {
  const state = bannerStateFor(banner);
  const count = bannerLogicalCount(banner);
  const current3 = count ? state.index % count : 0;
  banner.querySelectorAll(".banner-indicator").forEach((dot, index2) => {
    const active = index2 === current3;
    dot.style.opacity = active ? "1" : "0.5";
    dot.setAttribute("aria-current", active ? "true" : "false");
  });
}
function setBannerTrackOffset(banner, offset) {
  const track = banner.querySelector(".banner-container");
  if (!track) return;
  const rounded = Math.round(offset);
  track.style.transform = banner.dataset.orientation === "vertical" ? `translate3d(0,${rounded}px,0)` : `translate3d(${rounded}px,0,0)`;
}
function goToBannerSlide(banner, index2, noTransition = false) {
  const track = banner.querySelector(".banner-container");
  if (!track) return;
  const axis = syncBannerTrackLayout(banner);
  if (!axis) return;
  const state = bannerStateFor(banner);
  state.index = Math.max(0, index2);
  track.style.transition = noTransition ? "none" : bannerTransition;
  const offset = -Math.round(state.index * axis);
  setBannerTrackOffset(banner, offset);
  updateBannerDots(banner);
  const count = bannerLogicalCount(banner);
  if (banner.dataset.rolling === "true" && banner.dataset.loop === "true" && count > 1 && state.index === count) {
    window.setTimeout(() => {
      track.style.transition = "none";
      state.index = 0;
      setBannerTrackOffset(banner, 0);
      updateBannerDots(banner);
      void track.offsetHeight;
      track.style.transition = bannerTransition;
    }, 430);
  }
}
function nextBannerSlide(banner) {
  const state = bannerStateFor(banner);
  const count = bannerLogicalCount(banner);
  if (!count) return;
  if (state.index < count - 1) goToBannerSlide(banner, state.index + 1);
  else if (banner.dataset.rolling === "true" && banner.dataset.loop === "true") goToBannerSlide(banner, count);
  else if (banner.dataset.loop === "true") goToBannerSlide(banner, 0);
}
function startBannerAutoplay(banner) {
  const state = bannerStateFor(banner);
  if (state.timer !== void 0) window.clearInterval(state.timer);
  state.timer = void 0;
  if (banner.dataset.autoScroll !== "true") return;
  const duration = Math.max(800, Number(banner.dataset.duration || 3e3));
  state.timer = window.setInterval(() => nextBannerSlide(banner), duration);
}
function hydrateBanner(banner) {
  const state = bannerStateFor(banner);
  if (!state.bound) {
    state.bound = true;
    banner.querySelectorAll(".banner-indicator").forEach((dot) => {
      dot.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        goToBannerSlide(banner, Number(dot.getAttribute("data-xcon-banner-dot") || 0));
        startBannerAutoplay(banner);
      });
    });
    banner.addEventListener("pointerdown", (event) => {
      state.dragging = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      if (state.timer !== void 0) window.clearInterval(state.timer);
      state.timer = void 0;
      if (typeof banner.setPointerCapture === "function") banner.setPointerCapture(event.pointerId);
      const track = banner.querySelector(".banner-container");
      if (track) track.style.transition = "none";
    });
    banner.addEventListener("pointermove", (event) => {
      if (!state.dragging) return;
      const axis = syncBannerTrackLayout(banner);
      if (!axis) return;
      const track = banner.querySelector(".banner-container");
      if (!track) return;
      const vertical = banner.dataset.orientation === "vertical";
      let delta = vertical ? event.clientY - state.startY : event.clientX - state.startX;
      const count = bannerLogicalCount(banner);
      if (banner.dataset.loop !== "true" && (state.index === 0 && delta > 0 || count > 0 && state.index >= count - 1 && delta < 0)) {
        delta *= 0.35;
      }
      track.style.transition = "none";
      setBannerTrackOffset(banner, -Math.round(state.index * axis) + delta);
    });
    const finishDrag = (event, canceled) => {
      if (!state.dragging) return;
      state.dragging = false;
      if (typeof banner.releasePointerCapture === "function") {
        try {
          banner.releasePointerCapture(event.pointerId);
        } catch {
        }
      }
      const vertical = banner.dataset.orientation === "vertical";
      const delta = canceled ? 0 : vertical ? event.clientY - state.startY : event.clientX - state.startX;
      if (!canceled && Math.abs(delta) > 40) {
        if (delta < 0) nextBannerSlide(banner);
        else goToBannerSlide(banner, Math.max(0, state.index - 1));
      } else {
        goToBannerSlide(banner, state.index);
      }
      startBannerAutoplay(banner);
    };
    banner.addEventListener("pointerup", (event) => finishDrag(event, false));
    banner.addEventListener("pointercancel", (event) => finishDrag(event, true));
    window.addEventListener("resize", () => goToBannerSlide(banner, state.index, true));
  }
  syncBannerTrackLayout(banner);
  goToBannerSlide(banner, 0, true);
  startBannerAutoplay(banner);
}
function renderComponent(component, context, depth, state = { parentFlow: false }, keyPath = "root") {
  if (depth > context.options.maxDepth) throw new Error("XCON render depth limit exceeded.");
  context.nodes += 1;
  if (context.nodes > context.options.maxNodes) throw new Error("XCON render node limit exceeded.");
  const type2 = component.getString("type", "panel");
  const layerStack = type2 === "panel" && isPanelStackLayers(component);
  const childState = {
    parentFlow: usesFlowLayout(component) || isSequentialContainer(type2),
    eagerMedia: state.eagerMedia,
    layerStack
  };
  const children2 = renderChildren(component, context, depth + 1, childState, keyPath);
  const style = buildStyle(component, state, {
    includeAutoLayout: type2 !== "panel" && type2 !== "form" && type2 !== "list",
    isRoot: depth === 0 && keyPath === "root"
  });
  const attrs = baseAttributes(type2, style, component, keyPath);
  switch (type2) {
    case "form":
      return renderForm(component, attrs, children2, context);
    case "panel":
      return renderPanel(component, attrs, renderText(component, context) + children2, context);
    case "shape":
      return renderShape(component, attrs, context, children2);
    case "line":
      return renderLine(component, attrs);
    case "connector":
      return renderConnector(component, attrs, context);
    case "modal":
      return renderModal(component, attrs, children2);
    case "stack":
      if (isShowcaseVariant(component)) return renderStackShowcase(component, attrs);
      if (hasDataDrivenLayoutItems(component)) return renderStackItemsSingle(component, attrs);
      return tag2(
        "div",
        attrsWithStyle(attrs, `display:flex;flex-direction:${stackDirection(component)}`),
        children2 + renderItems(component, context, depth + 1, { parentFlow: true, eagerMedia: state.eagerMedia }, keyPath)
      );
    case "flexBox":
      if (isShowcaseVariant(component)) return renderFlexBoxShowcase(component, attrs);
      if (hasDataDrivenLayoutItems(component)) return renderFlexBoxItemsSingle(component, attrs);
      return tag2(
        "div",
        attrsWithStyle(attrs, `display:flex;${flexStyle(component)}`),
        children2 + renderItems(component, context, depth + 1, { parentFlow: true, eagerMedia: state.eagerMedia }, keyPath)
      );
    case "grid":
      if (isShowcaseVariant(component)) return renderGridShowcase(component, attrs);
      if (hasDataDrivenLayoutItems(component)) return renderGridItemsSingle(component, attrs);
      return tag2(
        "div",
        attrsWithStyle(attrs, `display:grid;${gridStyle(component)}`),
        children2 || renderItems(component, context, depth + 1, { parentFlow: true, eagerMedia: state.eagerMedia }, keyPath)
      );
    case "card":
      return renderCard(component, attrs, context, children2);
    case "label":
      return renderLabel(component, attrs, context);
    case "text":
      return tag2("div", attrs, renderText(component, context));
    case "textView":
      return renderTextView(component, attrs, context);
    case "button":
      return renderButton(component, attrs);
    case "textField":
      return renderTextField(component, attrs, void 0, context);
    case "passwordField":
      return renderPasswordField(component, attrs);
    case "textarea":
      return renderTextarea(component, attrs);
    case "select":
      return renderSelect(component, attrs);
    case "slider":
      return renderSlider(component, attrs);
    case "switch":
      return renderSwitch(component, attrs);
    case "colorPicker":
      return renderColorPicker(component, attrs);
    case "datePicker":
      return renderDatePicker(component, attrs);
    case "timePicker":
      return renderTimePicker(component, attrs);
    case "checkbox":
    case "radioButton":
      return renderChoice(component, attrs, type2, context);
    case "image":
      return renderImage(component, attrs, context, state);
    case "videoView":
      return renderVideo(component, attrs, context);
    case "banner":
      return renderBanner(component, attrs, context, depth + 1, keyPath);
    case "carousel":
      return renderExtCarousel(component, attrs, context);
    case "list":
      return tag2("div", listRootAttrs(component, attrs), renderList(component, context, depth + 1, keyPath));
    case "progressBar":
      return renderProgressBar(component, attrs);
    case "spinner":
      return renderSpinner(component, attrs);
    case "badge":
      return renderBadge(component, attrs);
    case "avatar":
      return renderAvatar(component, attrs, context);
    case "icon":
      return renderIcon(component, attrs);
    case "divider":
      return renderDivider(component, attrs);
    case "alert":
      return renderAlert(component, attrs);
    case "notice":
      return tag2("aside", attrs, escapeHtml2(String(component.get("content") ?? component.get("message") ?? component.get("text") ?? "")));
    case "chatBubble":
      return renderChatBubble(component, attrs, context);
    case "tooltip":
      return renderTooltip(component, attrs, children2);
    case "tabs":
      return renderTabs(component, attrs, context, depth + 1);
    case "accordion":
      return renderAccordion(component, attrs, context, depth + 1);
    case "rating":
      return renderRating(component, attrs);
    case "spacer":
      if (isShowcaseVariant(component)) return renderSpacerShowcase(component, attrs);
      return renderSpacerSingle(component, attrs);
    case "searchBar":
      return renderSearchBar(component, attrs);
    case "treeView":
      return renderTreeView(component, attrs);
    case "gallery":
      return renderGallery(component, attrs, context, depth + 1, keyPath);
    case "qrCode":
      return renderQrCode(component, attrs);
    case "barcode":
      return renderBarcode(component, attrs);
    case "chart":
      return renderAdvancedChart(component, attrs);
    case "codeEditor":
      return renderAdvancedCodeEditor(component, attrs);
    case "richEditor":
      return renderAdvancedRichEditor(component, attrs);
    case "dataViz":
      return renderAdvancedDataViz(component, attrs);
    case "spanGrid":
      return renderAdvancedSpanGrid(component, attrs);
    case "flipbook":
      return renderAdvancedFlipbook(component, attrs, context);
    case "networkDiagram":
      return renderAdvancedNetworkDiagram(component, attrs);
    case "map":
      return renderAdvancedMap(component, attrs, context);
    case "calendar":
      return renderAdvancedCalendar(component, attrs);
    case "template":
      return renderTemplate(component, attrs, context, depth + 1, keyPath);
    case "myCounter":
      return renderMyCounter(component, attrs);
    case "myProgressBar":
      return renderMyProgressBar(component, attrs);
    case "myCard":
      return renderMyCard(component, attrs, context);
    case "myToggleSwitch":
      return renderMyToggleSwitch(component, attrs);
    case "myIconRail":
      return renderMyIconRail(component, attrs);
    case "myThemeAccentPanel":
      return renderMyThemeAccentPanel(component, attrs);
    default:
      return tag2("div", attrs, renderText(component, context) + children2);
  }
}
function resolveRenderInput(input) {
  if (isXconObject2(input)) return { root: input, diagnostics: [] };
  if (typeof input === "string") return resolveStringRenderInput(input);
  return { root: fromJSONObject2(input), diagnostics: [] };
}
function resolveStringRenderInput(input) {
  const source = input.trim();
  const syntax = detectXconSyntax(source);
  if (syntax === "sketch") {
    const parsed = fromSketchLenient(source);
    return { root: parsed.document, diagnostics: parsed.errors };
  }
  return { root: deserialize(source), diagnostics: [] };
}
function renderXconDiagnostics(errors) {
  if (errors.length === 0) return "";
  const items = errors.map((error) => tag2("li", {}, `${escapeHtml2(error.message)}${error.source ? `: ${escapeHtml2(error.source)}` : ""}`)).join("");
  return tag2(
    "details",
    {
      class: "xcon-viewer-diagnostics",
      "data-xcon-diagnostics": "",
      style: "position:relative;z-index:1;margin:8px 0 0;padding:8px 10px;border:1px solid rgba(180,120,20,.24);border-radius:8px;background:rgba(255,247,237,.96);color:#7c2d12;font:12px/1.4 system-ui,sans-serif;box-sizing:border-box"
    },
    tag2("summary", {}, `${errors.length} SKETCH parse warning${errors.length === 1 ? "" : "s"}`) + tag2("ul", { style: "margin:6px 0 0 18px;padding:0" }, items)
  );
}
function collectComponentBounds(component) {
  const bounds = /* @__PURE__ */ new Map();
  collectComponentBoundsInto(component, bounds, "root", "root", [0, 0]);
  return bounds;
}
function collectComponentBoundsInto(component, bounds, keyPath, componentKey, origin) {
  const pos = rectParts(component.get("pos")) ?? [0, 0, 0, 0];
  const absolute = [origin[0] + pos[0], origin[1] + pos[1], pos[2], pos[3]];
  registerComponentBound(bounds, keyPath, absolute, true);
  registerComponentBound(bounds, componentKey, absolute);
  const id2 = component.get("id");
  if (typeof id2 === "string" && id2.trim()) registerComponentBound(bounds, id2.trim(), absolute);
  const name = component.get("name");
  if (typeof name === "string" && name.trim()) registerComponentBound(bounds, name.trim(), absolute);
  const components = component.get("components");
  if (!isXconObject2(components)) return;
  components.forEach((child, key) => {
    if (key === "componentsOrder" || !isXconObject2(child)) return;
    collectComponentBoundsInto(child, bounds, `${keyPath}~${key}`, key, [absolute[0], absolute[1]]);
  });
}
function registerComponentBound(bounds, key, rect, overwrite = false) {
  if (!key || !overwrite && bounds.has(key)) return;
  bounds.set(key, rect);
}
function baseAttributes(type2, style, component, keyPath) {
  const hidden = component.get("visible") === false || component.get("visible") === "false";
  const id2 = component.get("id");
  const inlineStyle = sanitizeInlineStyle(component.get("style"));
  return {
    id: typeof id2 === "string" ? id2 : void 0,
    class: componentClassName(type2, component),
    "data-xcon-type": type2,
    "data-component": dataComponentName(type2, component),
    "data-key": keyPath,
    hidden: hidden ? "" : void 0,
    style: joinStyles(style, inlineStyle)
  };
}
function componentClassName(type2, component) {
  const className = component.get("className") ?? component.get("class") ?? component.get("cssClass") ?? component.get("htmlClass");
  const classes = [];
  if (typeof className === "string") classes.push(...className.split(/\s+/).filter(Boolean));
  if (type2 === "form") classes.push("xa-al-form-root");
  if (type2 === "form" && hidesFormScrollbar(component)) classes.push("xa-form-hidden-scrollbar");
  if (type2 === "panel") classes.push("xa-al-panel-root");
  if (type2 === "panel" && hidesPanelScrollbar(component)) classes.push("xa-panel-hidden-scrollbar");
  if (type2 === "label") classes.push("xa-al-label");
  if (type2 === "textView") classes.push("xa-al-tv-root");
  if (type2 === "button") classes.push("xa-al-btn");
  if (type2 === "textField" || type2 === "passwordField") classes.push("xa-al-tf-root");
  if (type2 === "image") classes.push("xa-al-img-overlay-wrap");
  if (type2 === "list") classes.push("xa-al-xlist-root");
  if (type2 === "banner") {
    classes.push("xa-al-banner");
    const variant = classToken(component.get("bannerVariant") ?? component.get("variant"));
    if (variant) classes.push(`xa-al-banner--${variant}`);
  }
  const al = component.get("al");
  if (isXconObject2(al) && type2 !== "panel") {
    const stackClass = al.get("stackClass");
    if (typeof stackClass === "string") classes.push(...stackClass.split(/\s+/).filter(Boolean));
  }
  return [...new Set(classes)].join(" ") || void 0;
}
function dataComponentName(type2, component) {
  if (type2 === "form") return "xForm";
  if (type2 === "list" && (component.contains("dataTemplate") || component.contains("templates") || component.contains("xListVariant"))) {
    return "xList";
  }
  return type2;
}
function attrsWithStyle(attrs, style) {
  return { ...attrs, style: joinStyles(style, attrs.style ?? "") };
}
function attrsWithAppendedStyle(attrs, style) {
  return { ...attrs, style: joinStyles(attrs.style ?? "", style) };
}
function attrsWithClass(attrs, className) {
  return { ...attrs, class: [attrs.class, className].filter(Boolean).join(" ") };
}
function renderChildren(component, context, depth, state, keyPath) {
  const components = component.get("components");
  if (!isXconObject2(components)) return "";
  const children2 = [];
  const seen = /* @__PURE__ */ new Set();
  for (const key of componentOrder(components)) {
    const child = components.get(key);
    if (isXconObject2(child)) {
      children2.push({ key, child });
      seen.add(key);
    }
  }
  components.forEach((child, key) => {
    if (key === "componentsOrder" || seen.has(key)) return;
    if (isXconObject2(child)) children2.push({ key, child });
  });
  return children2.map(({ key, child }, index2) => {
    const rendered = renderComponent(child, context, depth, state, `${keyPath}~${key}`);
    return state.layerStack ? renderPanelLayer(child, index2, rendered) : rendered;
  }).join("");
}
function renderItems(component, context, depth, state, keyPath) {
  const items = component.get("items");
  if (!Array.isArray(items)) return "";
  return items.map(
    (item, index2) => isXconObject2(item) ? renderComponent(item, context, depth, state, `${keyPath}~items${index2}`) : tag2("div", { "data-key": `${keyPath}~items${index2}` }, escapeHtml2(String(item ?? "")))
  ).join("");
}
function renderText(component, context) {
  const value = component.get("text") ?? component.get("label") ?? component.get("content") ?? "";
  if (context.options.allowHtml && isTruthy(component.get("renderHtml"))) {
    return sanitizeHtml(String(value));
  }
  return escapeHtml2(String(value));
}
function renderShape(component, attrs, context, children2) {
  return tag2("div", shapeAttrs(component, attrs, context), shapeContent(component, context) + children2);
}
function renderConnector(component, attrs, context) {
  const from = resolveConnectorPoint(component.get("from"), context);
  const to = resolveConnectorPoint(component.get("to"), context);
  if (!from || !to) {
    return tag2(
      "div",
      attrsWithClass(attrsWithAppendedStyle(attrs, "pointer-events:none;background:transparent"), "xa-line xa-connector xa-connector--missing"),
      renderText(component, context)
    );
  }
  const left = Math.min(from[0], to[0]);
  const top = Math.min(from[1], to[1]);
  const width = Math.abs(to[0] - from[0]);
  const height = Math.abs(to[1] - from[1]);
  const line = component.deepClone();
  line.set("pos", [left, top, width, height]);
  line.set("from", [from[0] - left, from[1] - top]);
  line.set("to", [to[0] - left, to[1] - top]);
  if (!line.contains("end") && !line.contains("markerEnd") && !line.contains("arrow")) {
    line.set("end", "arrow");
  }
  return renderLine(
    line,
    attrsWithStyle(attrs, buildStyle(line, { parentFlow: false }, { includeAutoLayout: false }))
  );
}
function resolveConnectorPoint(value, context) {
  const endpoint = connectorEndpoint(value);
  if (!endpoint) return null;
  const rect = context.componentBounds.get(endpoint.target) ?? context.componentBounds.get(`root~${endpoint.target}`);
  if (!rect) return null;
  return anchorPoint(rect, endpoint.anchor);
}
function connectorEndpoint(value) {
  if (typeof value === "string") {
    const parsed = parseConnectorEndpointString(value);
    return parsed ? { target: parsed.target, anchor: parsed.anchor } : null;
  }
  if (!isXconObject2(value)) return null;
  const target = value.get("target");
  if (typeof target !== "string" || !target.trim()) return null;
  const anchor = value.get("anchor");
  return { target: target.trim(), anchor: typeof anchor === "string" && anchor.trim() ? anchor.trim() : "center" };
}
function parseConnectorEndpointString(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(".")) return { target: trimmed, anchor: "center" };
  const parts = trimmed.split(".");
  const anchor = parts.pop() || "center";
  const target = parts.join(".");
  return target ? { target, anchor } : null;
}
function anchorPoint(rect, rawAnchor) {
  const anchor = rawAnchor.trim().toLowerCase();
  const left = rect[0];
  const top = rect[1];
  const right = rect[0] + rect[2];
  const bottom = rect[1] + rect[3];
  const centerX = rect[0] + rect[2] / 2;
  const centerY = rect[1] + rect[3] / 2;
  if (anchor === "left" || anchor === "start") return [left, centerY];
  if (anchor === "right" || anchor === "end") return [right, centerY];
  if (anchor === "top") return [centerX, top];
  if (anchor === "bottom") return [centerX, bottom];
  return [centerX, centerY];
}
function renderLine(component, attrs) {
  const pos = rectParts(component.get("pos")) ?? [0, 0, 0, 0];
  const localWidth = Math.max(0, pos[2]);
  const localHeight = Math.max(0, pos[3]);
  const from = pointParts(component.get("from")) ?? [0, 0];
  const to = pointParts(component.get("to")) ?? [localWidth, localHeight];
  const strokeWidth = lineStrokeWidth(component.get("width") ?? component.get("strokeWidth") ?? component.get("weight"));
  const padding = Math.max(6, strokeWidth * 3);
  const minX = Math.min(from[0], to[0]) - padding;
  const minY = Math.min(from[1], to[1]) - padding;
  const svgWidth = Math.max(1, Math.abs(to[0] - from[0])) + padding * 2;
  const svgHeight = Math.max(1, Math.abs(to[1] - from[1])) + padding * 2;
  const x1 = from[0] - minX;
  const y1 = from[1] - minY;
  const x2 = to[0] - minX;
  const y2 = to[1] - minY;
  const stroke = cssColor(component.get("color") ?? component.get("stroke") ?? component.get("strokeColor")) ?? "currentColor";
  const markerStart = lineMarker(component.get("start") ?? component.get("markerStart"));
  const markerEnd = lineMarker(component.get("end") ?? component.get("markerEnd") ?? component.get("arrow"));
  const idBase = domIdFromAttrs(attrs);
  const defs = renderLineMarkers(idBase, stroke, markerStart, markerEnd);
  const label = component.get("label") ?? component.get("text");
  const labelHtml = label === void 0 || label === null || String(label) === "" ? "" : tag2("text", {
    x: trimNumber((x1 + x2) / 2),
    y: trimNumber((y1 + y2) / 2 - Math.max(7, strokeWidth * 2)),
    fill: cssColor(component.get("labelColor") ?? component.get("textColor") ?? component.get("color")) ?? stroke,
    "font-size": attr(component.get("fontSize") ?? fontValue(component, "size") ?? 12),
    "font-weight": attr(fontValue(component, "weight") ?? 700),
    "text-anchor": "middle",
    "dominant-baseline": "central"
  }, escapeHtml2(String(label)));
  const lineAttrs = {
    x1: trimNumber(x1),
    y1: trimNumber(y1),
    x2: trimNumber(x2),
    y2: trimNumber(y2),
    stroke,
    "stroke-width": trimNumber(strokeWidth),
    "stroke-linecap": lineCap(component.get("cap") ?? component.get("lineCap")),
    "stroke-dasharray": lineDashArray(component.get("style") ?? component.get("lineStyle") ?? component.get("dash"), strokeWidth),
    "marker-start": markerStart ? `url(#${idBase}_${markerStart}_start)` : void 0,
    "marker-end": markerEnd ? `url(#${idBase}_${markerEnd}_end)` : void 0
  };
  return tag2(
    "div",
    attrsWithClass(attrsWithAppendedStyle(attrs, "overflow:visible;pointer-events:none;background:transparent"), "xa-line"),
    tag2("svg", {
      class: "xa-line__svg",
      viewBox: `0 0 ${trimNumber(svgWidth)} ${trimNumber(svgHeight)}`,
      width: trimNumber(svgWidth),
      height: trimNumber(svgHeight),
      style: `position:absolute;left:${trimNumber(minX)}px;top:${trimNumber(minY)}px;overflow:visible`,
      "aria-hidden": "true",
      focusable: "false"
    }, defs + tag2("line", lineAttrs, "") + labelHtml)
  );
}
function renderLineMarkers(idBase, stroke, markerStart, markerEnd) {
  const markers = [];
  if (markerStart === "arrow") markers.push(renderLineArrowMarker(`${idBase}_${markerStart}_start`, stroke, true));
  if (markerEnd === "arrow") markers.push(renderLineArrowMarker(`${idBase}_${markerEnd}_end`, stroke, false));
  return markers.length ? tag2("defs", {}, markers.join("")) : "";
}
function renderLineArrowMarker(id2, color2, reverse) {
  return tag2("marker", {
    id: id2,
    viewBox: "0 0 10 10",
    refX: reverse ? "2" : "8",
    refY: "5",
    markerWidth: "6",
    markerHeight: "6",
    orient: reverse ? "auto-start-reverse" : "auto",
    markerUnits: "strokeWidth"
  }, tag2("path", {
    d: reverse ? "M 8 0 L 0 5 L 8 10 z" : "M 0 0 L 10 5 L 0 10 z",
    fill: color2
  }, ""));
}
function shapeAttrs(component, attrs, context) {
  const shape = String(component.get("shape") ?? "rectangle").trim() || "rectangle";
  const animationUrls = shapeImageAnimationUrls(component, context);
  const imageAnimation = animationUrls.length > 1;
  const slideshow = shapeImageSlideshow(component);
  return {
    ...attrsWithAppendedStyle(attrs, shapeStyle(component, context)),
    "data-shape": shape,
    alt: attr(component.get("alt")),
    title: attr(component.get("title")),
    "aria-label": attr(component.get("ariaLabel") ?? component.get("aria-label")),
    role: attr(component.get("role")),
    "data-xcon-shape-image-animation": imageAnimation ? "true" : void 0,
    "data-xcon-shape-images": imageAnimation ? JSON.stringify(animationUrls) : void 0,
    "data-xcon-shape-duration": imageAnimation ? String(shapeAnimationDurationMs(slideshow?.get("duration") ?? component.get("animationDuration"))) : void 0,
    "data-xcon-shape-mode": imageAnimation ? attr(slideshow?.get("mode") ?? component.get("animationMode") ?? "infinite") : void 0,
    "data-xcon-shape-direction": imageAnimation ? attr(component.get("animationDirection") ?? "normal") : void 0
  };
}
function shapeContent(component, context) {
  const image = component.get("image");
  const imageMode = String((isXconObject2(image) ? image.get("mode") : void 0) ?? component.get("imageMode") ?? "background").toLowerCase();
  const imageSource = shapeImageSource(component);
  if (String(imageMode ?? "").toLowerCase() === "content") {
    const src = sanitizeUrl(imageSource, context.options);
    if (src) {
      return voidTag("img", {
        src,
        alt: attr(component.get("alt") ?? component.get("title") ?? ""),
        loading: "lazy",
        style: `display:block;width:100%;height:100%;object-fit:${safeCssValue2(component.get("imageFit")) ?? "cover"};${shapeImageFilter(component)}`
      });
    }
  }
  const html = component.get("html");
  let content = "";
  if (html !== void 0 && html !== null && String(html) !== "") content = context.options.allowHtml ? sanitizeHtml(String(html)) : escapeHtml2(String(html));
  else content = renderText(component, context);
  if (imageMode === "overlay") {
    const src = sanitizeUrl(imageSource, context.options);
    if (src) content += shapeOverlayImage(component, src);
  }
  return content;
}
function shapeImageSource(component) {
  const image = component.get("image");
  if (isXconObject2(image)) return attr(image.get("src") ?? image.get("url"));
  return attr(component.get("src") ?? image);
}
function shapeImageAnimationUrls(component, context) {
  const slideshow = shapeImageSlideshow(component);
  if (slideshow) {
    if (!booleanOption3(slideshow.get("enabled"), false)) return [];
    return shapeImageUrls(slideshow.get("images"), context);
  }
  if (!isTruthy(component.get("imageAnimation"))) return [];
  return shapeImageUrls(component.get("images"), context);
}
function shapeImageSlideshow(component) {
  const image = component.get("image");
  const slideshow = (isXconObject2(image) ? image.get("slideshow") : void 0) ?? component.get("slideshow");
  return isXconObject2(slideshow) ? slideshow : null;
}
function shapeImageUrls(images, context) {
  if (!Array.isArray(images)) return [];
  const urls = [];
  for (const item of images) {
    const source = isXconObject2(item) ? item.get("src") ?? item.get("image") ?? item.get("url") : item;
    const url = sanitizeUrl(stripCssUrl(String(source ?? "")), context.options);
    if (url) urls.push(url);
  }
  return urls;
}
function shapeAnimationDurationMs(value) {
  if (value === void 0 || value === null || value === "") return 3e3;
  if (typeof value === "number") return Math.max(100, value);
  const text = String(value).trim().toLowerCase();
  if (text.endsWith("ms")) {
    const ms = Number.parseFloat(text);
    return Number.isFinite(ms) ? Math.max(100, ms) : 3e3;
  }
  const seconds = Number.parseFloat(text);
  if (!Number.isFinite(seconds)) return 3e3;
  return Math.max(100, text.endsWith("s") ? seconds * 1e3 : seconds);
}
function shapeOverlayImage(component, src) {
  const declarations = [
    "position:absolute",
    "top:0",
    "left:0",
    "width:100%",
    "height:100%",
    `background-image:url(${src})`,
    `background-size:${safeCssValue2(component.get("imageSize")) ?? safeCssValue2(component.get("backgroundSize")) ?? "cover"}`,
    `background-position:${safeCssValue2(component.get("imagePosition")) ?? safeCssValue2(component.get("backgroundPosition")) ?? "center"}`,
    `background-repeat:${safeCssValue2(component.get("imageRepeat")) ?? safeCssValue2(component.get("backgroundRepeat")) ?? "no-repeat"}`,
    `opacity:${safeCssValue2(component.get("imageOpacity")) ?? "1"}`,
    `mix-blend-mode:${safeCssValue2(component.get("imageBlendMode")) ?? "normal"}`,
    shapeImageFilter(component),
    "pointer-events:none"
  ].filter(Boolean);
  return tag2("div", { style: declarations.join(";") }, "");
}
function shapeImageFilter(component) {
  const explicit = safeCssValue2(component.get("imageFilter"));
  if (explicit) return `filter:${explicit}`;
  const filters = [];
  const blur = safeCssValue2(component.get("imageBlur"));
  const brightness = safeCssValue2(component.get("imageBrightness"));
  const contrast = safeCssValue2(component.get("imageContrast"));
  const saturate = safeCssValue2(component.get("imageSaturate"));
  const hueRotate = safeCssValue2(component.get("imageHueRotate"));
  if (blur && blur !== "0") filters.push(`blur(${blur})`);
  if (brightness && brightness !== "1") filters.push(`brightness(${brightness})`);
  if (contrast && contrast !== "1") filters.push(`contrast(${contrast})`);
  if (saturate && saturate !== "1") filters.push(`saturate(${saturate})`);
  if (hueRotate && hueRotate !== "0deg") filters.push(`hue-rotate(${hueRotate})`);
  return filters.length ? `filter:${filters.join(" ")}` : "";
}
function shapeStyle(component, context) {
  const declarations = [];
  const background = component.get("background");
  const backgroundGradient = (isXconObject2(background) ? background.get("gradient") : void 0) ?? component.get("backgroundGradient") ?? shapeGradient(component, (isXconObject2(background) ? background.get("gradientColors") : void 0) ?? component.get("gradientColors"));
  const backgroundColor = isXconObject2(background) ? background.get("color") : void 0;
  appendCss(declarations, "background", safeCssValue2(backgroundGradient));
  appendCss(declarations, "background-color", cssColor(backgroundColor));
  appendShapePatternStyle(declarations, component);
  appendShapeImageStyle(declarations, component, context);
  appendShapeTextStyle(declarations, component);
  appendShapeEffectStyle(declarations, component);
  appendShapeTransformStyle(declarations, component);
  appendShapeAnimationStyle(declarations, component);
  appendCss(declarations, "clip-path", shapeClipPath(component));
  appendShapeMiscStyle(declarations, component);
  appendShapeIndividualRadii(declarations, component);
  return declarations.join(";");
}
function appendShapeImageStyle(declarations, component, context) {
  const image = component.get("image");
  const imageObject = isXconObject2(image) ? image : void 0;
  const imageMode = String(imageObject?.get("mode") ?? component.get("imageMode") ?? "background").toLowerCase();
  const directBackground = component.get("backgroundImage");
  const animationUrls = shapeImageAnimationUrls(component, context);
  const shouldRenderBackground = imageMode === "background" || directBackground !== void 0 || animationUrls.length > 1;
  if (!shouldRenderBackground) return;
  const source = animationUrls[0] ?? imageObject?.get("src") ?? imageObject?.get("url") ?? directBackground ?? component.get("src") ?? (typeof image === "string" ? image : void 0);
  const url = sanitizeUrl(stripCssUrl(String(source ?? "")), context.options);
  if (!url) return;
  declarations.push(`background-image:url(${url})`);
  appendCss(declarations, "background-size", safeCssValue2(imageObject?.get("size") ?? component.get("imageSize") ?? component.get("backgroundSize") ?? "cover"));
  appendCss(declarations, "background-position", safeCssValue2(imageObject?.get("position") ?? component.get("imagePosition") ?? component.get("backgroundPosition") ?? "center"));
  appendCss(declarations, "background-repeat", safeCssValue2(imageObject?.get("repeat") ?? component.get("imageRepeat") ?? component.get("backgroundRepeat") ?? "no-repeat"));
  const imageOpacity = safeCssValue2(component.get("imageOpacity"));
  if (imageOpacity && imageOpacity !== "1") {
    appendCss(declarations, "background-color", `rgba(255,255,255,${1 - Number.parseFloat(imageOpacity)})`);
    appendCss(declarations, "background-blend-mode", "multiply");
  }
}
function appendShapePatternStyle(declarations, component) {
  const pattern = shapePattern(component);
  if (pattern) declarations.push(`background-image:${pattern}`);
}
function shapePattern(component) {
  const pattern = String(component.get("backgroundPattern") ?? "").trim().toLowerCase();
  if (!pattern) return void 0;
  const size = safeCssValue2(component.get("patternSize")) ?? "10px";
  const color2 = safeCssValue2(component.get("patternColor")) ?? "#000000";
  if (pattern === "dots") return `radial-gradient(circle at center, ${color2} 1px, transparent 1px)`;
  if (pattern === "stripes") return `repeating-linear-gradient(45deg, ${color2} 0, ${color2} 1px, transparent 1px, transparent ${size})`;
  if (pattern === "grid") return `linear-gradient(${color2} 1px, transparent 1px), linear-gradient(90deg, ${color2} 1px, transparent 1px)`;
  if (pattern === "checkerboard") return `conic-gradient(${color2} 90deg, transparent 90deg 180deg, ${color2} 180deg 270deg, transparent 270deg)`;
  return void 0;
}
function appendShapeTextStyle(declarations, component) {
  appendCss(declarations, "font-family", fontValue(component, "family") ?? "Arial, sans-serif");
  appendCss(declarations, "font-size", cssSize(fontValue(component, "size") ?? component.get("fontSize") ?? "14px"));
  appendCss(declarations, "font-weight", fontValue(component, "weight") ?? component.get("fontWeight") ?? "normal");
  appendCss(declarations, "font-style", fontValue(component, "style") ?? component.get("fontStyle") ?? "normal");
  appendCss(declarations, "text-decoration", component.get("textDecoration") ?? textDecoration(component) ?? "none");
  appendCss(declarations, "line-height", component.get("lineHeight") ?? "normal");
  appendCss(declarations, "letter-spacing", safeCssValue2(component.get("letterSpacing") ?? "normal"));
  appendCss(declarations, "word-spacing", safeCssValue2(component.get("wordSpacing") ?? "normal"));
  appendCss(declarations, "text-align", component.get("textAlign") ?? "left");
  if (shapeHasContent(component)) {
    const vAlign = String(component.get("verticalAlign") ?? component.get("textVerticalAlign") ?? "middle").toLowerCase();
    if (vAlign !== "top") {
      declarations.push("display:flex");
      appendCss(declarations, "align-items", vAlign === "bottom" ? "flex-end" : "center");
      if (component.get("textAlign") !== void 0 && component.get("textAlign") !== "left") appendCss(declarations, "justify-content", justifyFromTextAlign(component.get("textAlign")));
    }
  }
  appendCss(declarations, "text-shadow", safeCssValue2(component.get("textShadow")));
  appendCss(declarations, "-webkit-text-stroke", safeCssValue2(component.get("textStroke")));
  const outline = safeCssValue2(component.get("textOutline"));
  if (outline) appendCss(declarations, "text-shadow", `-1px -1px 0 ${outline}, 1px -1px 0 ${outline}, -1px 1px 0 ${outline}, 1px 1px 0 ${outline}`);
  appendCss(declarations, "white-space", safeCssValue2(component.get("whiteSpace")));
  appendCss(declarations, "word-wrap", safeCssValue2(component.get("wordWrap")));
  const overflow = String(component.get("textOverflow") ?? "").toLowerCase();
  if (overflow === "ellipsis") {
    declarations.push("overflow:hidden", "text-overflow:ellipsis");
    if (String(component.get("whiteSpace") ?? "normal") === "normal") declarations.push("white-space:nowrap");
  } else if (overflow === "clip") {
    declarations.push("overflow:hidden");
  }
  const maxLines = safeCssValue2(component.get("maxLines"));
  if (maxLines) declarations.push("display:-webkit-box", `-webkit-line-clamp:${maxLines}`, "-webkit-box-orient:vertical", "overflow:hidden");
}
function appendShapeEffectStyle(declarations, component) {
  const effects = component.get("effects");
  const boxShadow = safeCssValue2((isXconObject2(effects) ? effects.get("boxShadow") : void 0) ?? component.get("boxShadow"));
  const innerShadow = safeCssValue2((isXconObject2(effects) ? effects.get("innerShadow") : void 0) ?? component.get("innerShadow"));
  const shadows = [];
  if (boxShadow) shadows.push(boxShadow);
  if (innerShadow) shadows.push(innerShadow.trim().startsWith("inset") ? innerShadow : `inset ${innerShadow}`);
  if (shadows.length) declarations.push(`box-shadow:${shadows.join(", ")}`);
  const glow = safeCssValue2(component.get("glow"));
  if (glow && !shadows.length) appendCss(declarations, "box-shadow", `0 0 ${safeCssValue2(component.get("glowIntensity")) ?? "10px"} ${cssColor(component.get("glowColor")) ?? "#ffffff"}`);
  appendCss(declarations, "opacity", safeCssValue2((isXconObject2(effects) ? effects.get("opacity") : void 0) ?? component.get("opacity")));
  appendCss(declarations, "mix-blend-mode", safeCssValue2((isXconObject2(effects) ? effects.get("mixBlendMode") : void 0) ?? component.get("mixBlendMode") ?? component.get("blendMode")));
  const filter2 = shapeFilter(component, isXconObject2(effects) ? effects.get("filter") : void 0);
  if (filter2) appendCss(declarations, "filter", filter2);
}
function shapeFilter(component, effectFilter) {
  const explicit = safeCssValue2(effectFilter ?? component.get("filter"));
  if (explicit) return explicit;
  const filters = [];
  const entries = [
    ["blur", "blur", "0"],
    ["brightness", "brightness", "1"],
    ["contrast", "contrast", "1"],
    ["saturate", "saturate", "1"],
    ["hueRotate", "hue-rotate", "0deg"],
    ["invert", "invert", "0"],
    ["sepia", "sepia", "0"],
    ["grayscale", "grayscale", "0"]
  ];
  for (const [key, fn, defaultValue] of entries) {
    const value = safeCssValue2(component.get(key));
    if (value && value !== defaultValue) filters.push(`${fn}(${value})`);
  }
  const dropShadow = safeCssValue2(component.get("dropShadow"));
  if (dropShadow) filters.push(`drop-shadow(${dropShadow})`);
  return filters.length ? filters.join(" ") : void 0;
}
function appendShapeTransformStyle(declarations, component) {
  const transform2 = safeCssValue2(component.get("transform"));
  if (transform2) {
    appendCss(declarations, "transform", transform2);
  } else {
    const transforms = [];
    const translateX = safeCssValue2(component.get("translateX"));
    const translateY = safeCssValue2(component.get("translateY"));
    if (translateX && translateX !== "0" || translateY && translateY !== "0") transforms.push(`translate(${translateX ?? "0"}, ${translateY ?? "0"})`);
    const rotate = safeCssValue2(component.get("rotate"));
    if (rotate && rotate !== "0deg") transforms.push(`rotate(${rotate})`);
    const scale = safeCssValue2(component.get("scale"));
    if (scale && scale !== "1") transforms.push(`scale(${scale})`);
    const scaleX = safeCssValue2(component.get("scaleX"));
    const scaleY = safeCssValue2(component.get("scaleY"));
    if (scaleX && scaleX !== "1" || scaleY && scaleY !== "1") transforms.push(`scale(${scaleX ?? "1"}, ${scaleY ?? "1"})`);
    const skew = safeCssValue2(component.get("skew"));
    if (skew && skew !== "0deg") transforms.push(`skew(${skew})`);
    const skewX = safeCssValue2(component.get("skewX"));
    if (skewX && skewX !== "0deg") transforms.push(`skewX(${skewX})`);
    const skewY = safeCssValue2(component.get("skewY"));
    if (skewY && skewY !== "0deg") transforms.push(`skewY(${skewY})`);
    if (transforms.length) appendCss(declarations, "transform", transforms.join(" "));
  }
  const origin = safeCssValue2(component.get("transformOrigin"));
  if (origin && origin !== "center") appendCss(declarations, "transform-origin", origin);
}
function appendShapeAnimationStyle(declarations, component) {
  const animation = safeCssValue2(component.get("animation"));
  if (animation) {
    appendCss(declarations, "animation", animation);
  } else if (component.get("animationName")) {
    const props = [
      safeCssValue2(component.get("animationName")),
      safeCssValue2(component.get("animationDuration")) ?? "3s",
      safeCssValue2(component.get("animationTimingFunction")) ?? "ease",
      safeCssValue2(component.get("animationDelay")) ?? "0s",
      safeCssValue2(component.get("animationIterationCount")) ?? "1",
      safeCssValue2(component.get("animationDirection")) ?? "normal",
      safeCssValue2(component.get("animationFillMode")) ?? "none"
    ].filter(Boolean);
    appendCss(declarations, "animation", props.join(" "));
  }
  const transition2 = safeCssValue2(component.get("transition"));
  if (transition2) {
    appendCss(declarations, "transition", transition2);
  } else if (component.get("transitionProperty") !== void 0 || component.get("transitionDuration") !== void 0) {
    const props = [
      safeCssValue2(component.get("transitionProperty")) ?? "all",
      safeCssValue2(component.get("transitionDuration")) ?? "0.3s",
      safeCssValue2(component.get("transitionTimingFunction")) ?? "ease",
      safeCssValue2(component.get("transitionDelay")) ?? "0s"
    ];
    appendCss(declarations, "transition", props.join(" "));
  }
}
function appendShapeMiscStyle(declarations, component) {
  const misc = [
    ["cursor", component.get("cursor"), "default"],
    ["user-select", component.get("userSelect"), "auto"],
    ["pointer-events", component.get("pointerEvents"), "auto"],
    ["overflow", component.get("overflow"), "visible"],
    ["z-index", component.get("zIndex"), "auto"]
  ];
  for (const [property, value, defaultValue] of misc) {
    const safe = safeCssValue2(value);
    if (safe && safe !== defaultValue) appendCss(declarations, property, safe);
  }
  appendCss(declarations, "min-width", cssSize(component.get("minWidth")));
  appendCss(declarations, "max-width", cssSize(component.get("maxWidth")));
  appendCss(declarations, "min-height", cssSize(component.get("minHeight")));
  appendCss(declarations, "max-height", cssSize(component.get("maxHeight")));
  if (isTruthy(component.get("debug")) || isTruthy(component.get("showBounds"))) declarations.push("outline:2px dashed #ff0000", "outline-offset:-1px");
}
function appendShapeIndividualRadii(declarations, component) {
  appendCss(declarations, "border-top-left-radius", cssSize(component.get("borderTopLeftRadius")));
  appendCss(declarations, "border-top-right-radius", cssSize(component.get("borderTopRightRadius")));
  appendCss(declarations, "border-bottom-left-radius", cssSize(component.get("borderBottomLeftRadius")));
  appendCss(declarations, "border-bottom-right-radius", cssSize(component.get("borderBottomRightRadius")));
}
function shapeClipPath(component) {
  const direct = safeCssValue2(component.get("clipPath"));
  if (direct) return direct;
  const shape = String(component.get("shape") ?? "rectangle").trim().toLowerCase();
  if (shape === "circle") return `circle(${shapeRadius(component.get("circleRadius") ?? component.get("radius") ?? "50%")})`;
  if (shape === "ellipse") return "ellipse(50% 50%)";
  if (shape === "triangle") return "polygon(50% 0%, 0% 100%, 100% 100%)";
  if (shape === "hexagon") return "polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)";
  if (shape === "star") return starClipPath(component);
  if (shape === "polygon") return safeCssValue2(component.get("shapePoints")) ?? polygonClipPath(component);
  if (shape === "custom") return safeCssValue2(component.get("shapePoints"));
  return void 0;
}
function starClipPath(component) {
  const points = Math.max(3, Number(component.get("starPoints") ?? component.get("points") ?? 5) || 5);
  const inner = Math.max(0.05, Math.min(0.95, Number(component.get("starInnerRadius") ?? component.get("innerRadius") ?? 0.5) || 0.5));
  const coords = [];
  for (let index2 = 0; index2 < points * 2; index2 += 1) {
    const radius = index2 % 2 === 0 ? 50 : 50 * inner;
    const angle = -90 + index2 * 180 / points;
    const x2 = 50 + radius * Math.cos(angle * Math.PI / 180);
    const y2 = 50 + radius * Math.sin(angle * Math.PI / 180);
    coords.push(`${trimNumber(x2)}% ${trimNumber(y2)}%`);
  }
  return `polygon(${coords.join(", ")})`;
}
function polygonClipPath(component) {
  const sides = Math.max(3, Number(component.get("sides") ?? component.get("polygonSides") ?? 6) || 6);
  const coords = [];
  for (let index2 = 0; index2 < sides; index2 += 1) {
    const angle = -90 + index2 * 360 / sides;
    const x2 = 50 + 50 * Math.cos(angle * Math.PI / 180);
    const y2 = 50 + 50 * Math.sin(angle * Math.PI / 180);
    coords.push(`${trimNumber(x2)}% ${trimNumber(y2)}%`);
  }
  return `polygon(${coords.join(", ")})`;
}
function shapeHasContent(component) {
  return component.get("text") !== void 0 || component.get("label") !== void 0 || component.get("content") !== void 0 || component.get("html") !== void 0;
}
function shapeRadius(value) {
  if (typeof value === "number") return `${value}px`;
  const text = String(value ?? "50%").trim();
  return text || "50%";
}
function shapeGradient(component, value) {
  if (!Array.isArray(value) || value.length < 2) return void 0;
  const stops = Array.isArray(component.get("gradientStops")) ? component.get("gradientStops") : [];
  const colors = value.map((item, index2) => {
    const color2 = cssColor(item);
    if (!color2) return "";
    const stop = Array.isArray(stops) && stops[index2] ? ` ${stops[index2]}` : "";
    return `${color2}${stop}`;
  }).filter(Boolean);
  if (colors.length < 2) return void 0;
  const type2 = String(component.get("gradientType") ?? "linear").toLowerCase();
  const direction = safeCssValue2(component.get("gradientDirection"));
  if (type2 === "radial") return `radial-gradient(${direction ?? "circle"}, ${colors.join(", ")})`;
  if (type2 === "conic") return `conic-gradient(${direction ?? "from 0deg"}, ${colors.join(", ")})`;
  return `linear-gradient(${direction ?? "to right"}, ${colors.join(", ")})`;
}
function safeCssValue2(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const text = String(value).trim();
  if (!text || activeCssPattern.test(text)) return void 0;
  return expandThemeTokenAliases(text);
}
function stripCssUrl(value) {
  const match = value.trim().match(/^url\((.*)\)$/i);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : value;
}
function trimNumber(value) {
  return String(Math.round(value * 1e3) / 1e3);
}
function renderForm(component, attrs, children2, context) {
  const header = isFalseLike(component.get("hidenavbar")) ? tag2(
    "div",
    { class: "xa-al-form__header" },
    tag2("span", {}, escapeHtml2(String(component.get("title") ?? ""))) + (isFalseLike(component.get("closable")) ? "" : tag2("button", { class: "xa-al-close", type: "button", "aria-label": "close" }, "&times;"))
  ) : "";
  const content = tag2(
    "div",
    { class: `xa-al-form__body${hidesFormScrollbar(component) ? " xa-form-hidden-scrollbar" : ""}`, style: formBodyStyle(component) },
    tag2("div", { class: "xa-al-form__stack", style: formStackStyle(component) }, children2)
  );
  return tag2(
    "div",
    attrsWithStyle(attrsWithAppendedStyle(attrs, formExtraStyle(component, context)), "position:relative;display:flex;flex-direction:column;width:100%;min-height:100%;overflow:hidden"),
    header + content
  );
}
function formExtraStyle(component, context) {
  const declarations = [
    "border:1px solid var(--border, rgba(0,0,0,.08))",
    "border-radius:var(--r-lg, 16px)",
    "background:var(--surface, #fff)",
    "box-shadow:var(--shadow-sm, 0 2px 8px rgba(0,0,0,.08))",
    "overflow:hidden"
  ];
  appendCss(declarations, "background-color", cssColor(component.get("backgroundColor") ?? component.get("bgColor")));
  const imageSource = component.get("bgImage") ?? component.get("backgroundImage");
  if (imageSource !== void 0 && imageSource !== null && imageSource !== "") {
    const url = sanitizeUrl(stripCssUrl(String(imageSource)), context.options);
    if (url) {
      declarations.push(`background-image:url(${url})`);
      appendCss(declarations, "background-size", safeCssValue2(component.get("backgroundSize") ?? "cover"));
      appendCss(declarations, "background-position", safeCssValue2(component.get("backgroundPosition") ?? "center"));
      appendCss(declarations, "background-repeat", safeCssValue2(component.get("backgroundRepeat") ?? "no-repeat"));
    }
  }
  return declarations.join(";");
}
function renderPanel(component, attrs, body, context) {
  const content = tag2(
    "div",
    { class: "xa-al-panel__body", style: panelBodyStyle(component) },
    tag2("div", { class: panelStackClass(component), style: panelStackStyle(component) }, body)
  );
  return tag2(
    "div",
    attrsWithStyle(attrsWithAppendedStyle(attrs, panelExtraStyle(component, context)), "display:flex;flex-direction:column;min-width:0;overflow:hidden;box-sizing:border-box"),
    content
  );
}
function panelExtraStyle(component, context) {
  const declarations = ["overflow:hidden"];
  const imageSource = component.get("bgImage") ?? component.get("backgroundImage");
  if (imageSource !== void 0 && imageSource !== null && imageSource !== "") {
    const url = sanitizeUrl(stripCssUrl(String(imageSource)), context.options);
    if (url) {
      declarations.push(`background-image:url(${url})`);
      appendCss(declarations, "background-size", safeCssValue2(component.get("backgroundSize") ?? "cover"));
      appendCss(declarations, "background-position", safeCssValue2(component.get("backgroundPosition") ?? "center"));
      appendCss(declarations, "background-repeat", safeCssValue2(component.get("backgroundRepeat") ?? "no-repeat"));
    }
  }
  return declarations.join(";");
}
function renderLabel(component, attrs, context) {
  if (isGeneratedBlankLabel(component)) return "";
  const editorial = isTruthy(component.get("editorialBar"));
  const dotHtml = isTruthy(component.get("prefixDot")) ? tag2("span", { class: "xa-al-label__dot", "aria-hidden": "true" }, "") : "";
  const icon = iconName(component.get("icon"));
  const iconHtml = icon ? iconSvg(icon, "none").replaceAll("xa-al-btn__icon", "xa-al-label__icon") : "";
  const suffix = labelSuffixText(component);
  const suffixColor = labelSuffixColor(component);
  const suffixHtml = suffix !== void 0 ? tag2("span", { class: "xa-al-label__suffix", style: suffixColor ? `color:${suffixColor}` : void 0 }, escapeHtml2(suffix)) : "";
  const textHtml = tag2(
    "span",
    { class: "xa-al-label__text", style: labelTextStyle(component) },
    `${dotHtml}${iconHtml}${tag2("span", { class: "xa-al-label__value" }, renderText(component, context))}${suffixHtml}`
  );
  const barColor = cssColor(component.get("editorialBarColor")) ?? "var(--accent)";
  const mainHtml = editorial ? tag2(
    "div",
    { class: "xa-al-label__editorial-row", style: `align-items:${verticalAlign(component)}` },
    tag2("span", { class: "xa-al-label__editorial-bar", style: `background:${barColor}`, "aria-hidden": "true" }, "") + textHtml
  ) : textHtml;
  const hint = labelHintText(component);
  const hintHtml = hint !== void 0 ? tag2("span", { class: "xa-al-label__hint" }, escapeHtml2(hint)) : "";
  return tag2(
    "div",
    attrsWithStyle(
      attrsWithClass(attrs, [editorial ? "xa-al-label--editorial" : "", labelShimmerClass(component)].filter(Boolean).join(" ")),
      `display:flex!important;flex-direction:column;align-items:stretch;justify-content:${labelContainerJustify(component)};min-width:0`
    ),
    mainHtml + hintHtml
  );
}
function labelShimmerClass(component) {
  if (!isTruthy(component.get("shimmer"))) return "";
  const direction = String(component.get("shimmerDirection") ?? "rtl").trim().toLowerCase();
  return `xa-al-sk-shimmer ${direction === "ltr" ? "xa-al-sk-shimmer--ltr" : "xa-al-sk-shimmer--rtl"}`;
}
function labelSuffixText(component) {
  const direct = textValue(component.get("suffixText"));
  if (direct !== void 0) return direct;
  const suffix = component.get("suffix");
  if (isXconObject2(suffix)) return textValue(suffix.get("text") ?? suffix.get("label") ?? suffix.get("value"));
  return textValue(suffix);
}
function labelSuffixColor(component) {
  const direct = cssColor(component.get("suffixTextColor") ?? component.get("suffixColor"));
  if (direct) return direct;
  const suffix = component.get("suffix");
  if (!isXconObject2(suffix)) return void 0;
  return cssColor(suffix.get("color") ?? suffix.get("textColor"));
}
function labelHintText(component) {
  const direct = textValue(component.get("hintText"));
  if (direct !== void 0) return direct;
  const hint = component.get("hint");
  if (isXconObject2(hint)) return textValue(hint.get("text") ?? hint.get("label") ?? hint.get("value"));
  return textValue(hint);
}
function textValue(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  return String(value);
}
function isGeneratedBlankLabel(component) {
  const value = component.get("text") ?? component.get("label") ?? component.get("content") ?? "";
  const text = String(value);
  if (text.includes("\xA0") || text.trim() !== "") return false;
  return !hasLabelVisibleSurface(component);
}
function hasLabelVisibleSurface(component) {
  return component.contains("backgroundColor") || component.contains("labelPadding") || component.contains("padding") || component.contains("borderRadius") || component.contains("round") || component.contains("style") || component.contains("cssClass") || component.contains("className") || isTruthy(component.get("prefixDot")) || isTruthy(component.get("editorialBar")) || isTruthy(component.get("shimmer")) || labelSuffixText(component) !== void 0 || labelHintText(component) !== void 0 || hasVisibleBorder(component);
}
function hasVisibleBorder(component) {
  const border = component.get("border");
  if (isXconObject2(border)) return !isFalseLike(border.get("visible"));
  return border === true || border === "true" || border === 1 || border === "1";
}
function renderButton(component, attrs) {
  const label = component.get("label") ?? component.get("text") ?? "";
  const icon = iconName(component.get("icon"));
  const image = component.get("image");
  const iconOnly = String(label).trim() === "" && Boolean(icon || image);
  const stackColumn = isButtonStackColumn(component);
  const loading = isTruthy(component.get("loading") ?? component.get("busy"));
  const disabled = isButtonDisabled(component);
  const classes = [
    iconOnly ? "xa-al-btn--icon-only" : "",
    stackColumn ? "xa-al-btn--stack-col" : "",
    loading ? "xa-al-btn--loading" : "",
    disabled ? "xa-al-btn--disabled" : "",
    buttonAppearanceClass(component),
    buttonSegmentClass(component),
    buttonSplitClass(component),
    isButtonBlock(component) ? "xa-al-btn--block" : ""
  ].filter(Boolean).join(" ");
  const title = component.get("title");
  const iconHtml = icon ? iconSvg(icon, "none") : "";
  const imageHtml = typeof image === "string" && image ? voidTag("img", { class: "xa-al-btn__img", src: image, alt: "" }) : "";
  const spinnerHtml = loading ? tag2("span", { class: "xa-al-btn__spinner", "aria-hidden": "true" }, "") : "";
  const labelHtml = iconOnly ? tag2("span", { class: "xa-al-btn__label xa-al-btn__label--empty", "aria-hidden": "true" }, "") : tag2("span", { class: "xa-al-btn__label" }, escapeHtml2(String(label)));
  return tag2(
    "button",
    {
      ...attrsWithStyle(attrsWithClass(attrs, classes), buttonStyle(component, { iconOnly, stackColumn })),
      type: "button",
      disabled: disabled ? "" : void 0,
      title: attr(title),
      "aria-busy": loading ? "true" : void 0,
      "aria-label": attr(String(label).trim() || title || icon || "")
    },
    `${imageHtml}${iconHtml}${labelHtml}${spinnerHtml}`
  );
}
function renderTextField(component, attrs, forcedType, _context) {
  const prefixAffix = textFieldAffix(component, "prefix");
  const suffixAffix = textFieldAffix(component, "suffix");
  const prefixIconHtml = prefixAffix.icon ? textFieldIcon(prefixAffix.icon) : "";
  const suffixIconHtml = suffixAffix.icon ? textFieldIcon(suffixAffix.icon) : "";
  const leadingBlock = textValue(component.get("leadingBlock") ?? component.get("leadingText") ?? component.get("prefixBlock"));
  const trailingButton = textValue(component.get("trailingButton") ?? component.get("postButton") ?? component.get("suffixButton"));
  const floatLabel = textValue(component.get("floatLabel"));
  const disabled = isTextFieldDisabled(component);
  const readonly = isTruthy(component.get("readonly") ?? component.get("readOnly"));
  const inputId = domIdFromAttrs(attrs);
  const hasOtp = component.get("otpIndex") !== void 0 && component.get("otpIndex") !== null && component.get("otpIndex") !== "";
  const hasPrefix = Boolean(prefixIconHtml || prefixAffix.text);
  const hasSuffix = Boolean(suffixIconHtml || suffixAffix.text);
  const inputClass = [
    "xa-al-tf",
    textFieldStateClass(component),
    hasOtp ? "xa-al-tf--otp" : "",
    leadingBlock ? "xa-al-tf--with-leading" : "",
    trailingButton ? "xa-al-tf--has-post" : "",
    floatLabel ? "xa-al-tf-float" : "",
    floatLabel && textFieldValue(component) ? "xa-al-tf-float--has-val" : ""
  ].filter(Boolean).join(" ");
  const input = voidTag("input", {
    class: inputClass,
    id: inputId,
    type: textFieldInputType(component, forcedType),
    value: attr(textFieldValue(component)),
    placeholder: attr(component.get("placeholder") ?? ""),
    readonly: readonly ? "" : void 0,
    disabled: disabled ? "" : void 0,
    required: isTruthy(component.get("required")) ? "" : void 0,
    minlength: attr(component.get("minLength")),
    maxlength: attr(component.get("maxLength")),
    pattern: attr(component.get("pattern")),
    inputmode: attr(component.get("inputMode")),
    name: attr(component.get("name")),
    autocomplete: "off",
    "data-xcon-bind": attr(component.get("bind") ?? component.get("binding")),
    "data-xa-otp-index": hasOtp ? attr(component.get("otpIndex")) : void 0,
    "data-xa-otp-group": hasOtp ? attr(component.get("otpGroup") ?? "al-otp") : void 0,
    style: textFieldInputStyle(component, {
      hasPrefix,
      hasPrefixText: Boolean(prefixAffix.text),
      hasSuffix,
      hasLeading: Boolean(leadingBlock),
      hasTrailing: Boolean(trailingButton),
      hasFloatLabel: Boolean(floatLabel),
      hasOtp
    })
  });
  const rootAttrs = nativeInputRootAttrs(component, attrs, disabled ? "xa-al-tf-root--disabled" : "");
  if (floatLabel) {
    return tag2(
      "div",
      rootAttrs,
      tag2(
        "div",
        { class: "xa-al-tf-float-group", style: textFieldFloatGroupStyle() },
        input + tag2("label", { class: "xa-al-tf-float-label", for: inputId, style: textFieldFloatLabelStyle() }, escapeHtml2(floatLabel))
      )
    );
  }
  if (leadingBlock || trailingButton) {
    const leading = leadingBlock ? tag2("span", { class: "xa-al-tf-pre", style: textFieldPreStyle() }, escapeHtml2(leadingBlock)) : "";
    const trailing = trailingButton ? tag2("button", { type: "button", class: "xa-al-tf-post", style: textFieldPostStyle() }, escapeHtml2(trailingButton)) : "";
    return tag2("div", rootAttrs, tag2("div", { class: "xa-al-tf-block-wrap", style: textFieldBlockWrapStyle() }, `${leading}${input}${trailing}`));
  }
  if (!hasPrefix && !hasSuffix) return tag2("div", rootAttrs, input);
  const prefix = hasPrefix ? tag2(
    "span",
    { class: `xa-al-tf-prefix${prefixIconHtml ? " xa-al-tf-prefix-icon" : ""}`, style: textFieldPrefixStyle() },
    prefixIconHtml || escapeHtml2(prefixAffix.text ?? "")
  ) : "";
  const suffix = hasSuffix ? renderTextFieldSuffix(suffixAffix.icon, suffixIconHtml, suffixAffix.text, suffixAffix.clear) : "";
  const wrapClass = [
    "xa-al-tf-addon-wrap",
    prefixIconHtml ? "has-prefix" : "",
    prefixAffix.text ? "has-prefix-text" : "",
    hasSuffix ? "has-suffix" : ""
  ].filter(Boolean).join(" ");
  return tag2("div", rootAttrs, tag2("div", { class: wrapClass, style: textFieldAddonWrapStyle() }, `${prefix}${input}${suffix}`));
}
function renderPasswordField(component, attrs) {
  const inputId = domIdFromAttrs(attrs);
  const label = textValue(component.get("label"));
  const value = textFieldValue(component);
  const disabled = isTextFieldDisabled(component);
  const readonly = isTruthy(component.get("readonly") ?? component.get("readOnly"));
  const showToggle = !isFalseLike(component.get("showToggle"));
  const showStrength = !isFalseLike(component.get("showStrength"));
  const strength = passwordStrength(value);
  const minLength = numberLike(component.get("minLength"));
  const maxLength = numberLike(component.get("maxLength"));
  const labelHtml = label ? tag2("label", { class: "f-label", for: inputId }, escapeHtml2(label)) : "";
  const input = voidTag("input", {
    class: "f-input",
    id: inputId,
    type: "password",
    value: attr(value),
    placeholder: attr(component.get("placeholder") ?? "\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694"),
    minlength: minLength !== void 0 && minLength > 0 ? String(minLength) : void 0,
    maxlength: maxLength === void 0 ? "100" : maxLength > 0 ? String(maxLength) : void 0,
    pattern: attr(component.get("pattern")),
    required: isTruthy(component.get("required")) ? "" : void 0,
    readonly: readonly ? "" : void 0,
    disabled: disabled ? "" : void 0,
    autocomplete: "off",
    style: "width:100%;box-sizing:border-box;"
  });
  const toggle = showToggle ? tag2(
    "button",
    {
      type: "button",
      class: "pw-toggle",
      "aria-label": attr(component.get("toggleAriaLabel") ?? "\uBE44\uBC00\uBC88\uD638 \uD45C\uC2DC"),
      "data-xcon-tf-toggle": "visibility"
    },
    textFieldIcon("eye")
  ) : "";
  const strengthHtml = showStrength ? tag2("div", { class: "pw-strength", "data-xcon-pw-strength": "" }, passwordStrengthBars(strength.score)) + tag2("p", { class: "f-hint", "data-xcon-pw-hint": "" }, escapeHtml2(strength.hint)) : "";
  return tag2("div", attrsWithClass(attrs, `xa-ext-password-host${disabled ? " xa-al-tf-root--disabled" : ""}`), labelHtml + tag2("div", { class: "pw-wrap" }, input + toggle) + strengthHtml);
}
function renderTextarea(component, attrs) {
  const inputId = domIdFromAttrs(attrs);
  const label = textValue(component.get("label"));
  const value = String(component.get("value") ?? component.get("text") ?? "");
  const maxLength = numberLike(component.get("maxLength"));
  const rows = numberLike(component.get("rows"));
  const cols = numberLike(component.get("cols"));
  const showCharCount = maxLength !== void 0 && maxLength > 0 && !isFalseLike(component.get("showCharCount"));
  const disabled = isTextFieldDisabled(component);
  const readonly = isTruthy(component.get("readonly") ?? component.get("readOnly"));
  const labelHtml = label ? tag2("label", { class: "f-label", for: inputId }, escapeHtml2(label)) : "";
  const textarea = tag2(
    "textarea",
    {
      class: "f-textarea",
      id: inputId,
      placeholder: attr(component.get("placeholder") ?? "\uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694"),
      rows: rows !== void 0 && rows > 0 ? String(rows) : void 0,
      cols: cols !== void 0 && cols > 0 ? String(cols) : void 0,
      maxlength: maxLength !== void 0 && maxLength > 0 ? String(maxLength) : void 0,
      required: isTruthy(component.get("required")) ? "" : void 0,
      readonly: readonly ? "" : void 0,
      disabled: disabled ? "" : void 0,
      "data-xcon-ta": showCharCount ? "" : void 0,
      style: `width:100%;box-sizing:border-box;resize:${textareaResize(component.get("resize"))}`
    },
    escapeHtml2(value)
  );
  const footer = showCharCount ? tag2("div", { class: "textarea-footer" }, tag2("span", { "data-xcon-ta-count": "" }, String(value.length)) + `/${maxLength}`) : "";
  return tag2("div", attrsWithClass(attrs, `xa-ext-textarea-host${disabled ? " xa-al-tf-root--disabled" : ""}`), labelHtml + textarea + footer);
}
function domIdFromAttrs(attrs) {
  return `xcon_${String(attrs["data-key"] ?? "component").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}
function showcaseSuffixFromAttrs(attrs) {
  return String(attrs["data-key"] ?? "component").replace(/[^a-zA-Z0-9_-]/g, "_");
}
function numberLike(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : void 0;
}
function textareaResize(value) {
  const resize = String(value ?? "vertical").trim().toLowerCase();
  return ["none", "both", "horizontal", "vertical", "block", "inline"].includes(resize) ? resize : "vertical";
}
function passwordStrength(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  const labels = ["", "Weak", "Medium", "Strong", "Very Strong"];
  return { score, hint: value ? `Strength: ${labels[score]}` : "" };
}
function passwordStrengthBars(score) {
  const levels = ["", "weak", "medium", "strong", "strong"];
  const level = levels[score] ?? "";
  return Array.from({ length: 4 }, (_, index2) => tag2("div", { class: `pw-strength__bar${index2 < score && level ? ` ${level}` : ""}` }, "")).join("");
}
function renderTextView(component, attrs, context) {
  const variant = String(component.get("textViewVariant") ?? component.get("variant") ?? "").trim().toLowerCase();
  const editable = isTruthy(component.get("editable"));
  const htmlReadonly = (isTruthy(component.get("renderHtml")) || isTruthy(component.get("html"))) && !editable;
  const staticModes = /* @__PURE__ */ new Set(["article", "code", "truncate", "list", "metadata"]);
  if (htmlReadonly && staticModes.has(variant)) return renderStaticTextView(component, attrs, context, variant);
  if (htmlReadonly) {
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-al-tv-root--html"),
      tag2("div", { class: "xa-al-tv-html-chrome" }, textViewHtml(component, context))
    );
  }
  const disabled = isTextFieldDisabled(component);
  const textarea = tag2(
    "textarea",
    {
      class: "xa-al-tf xa-al-tf-multiline",
      placeholder: attr(component.get("placeholder") ?? ""),
      maxlength: attr(component.get("maxLength")),
      rows: attr(component.get("lineNumbers") ?? component.get("lineNum") ?? component.get("rows") ?? 4),
      readonly: editable ? void 0 : "",
      disabled: disabled ? "" : void 0,
      style: textViewInputStyle(component)
    },
    escapeHtml2(String(component.get("text") ?? component.get("value") ?? ""))
  );
  return tag2("div", nativeInputRootAttrs(component, attrs, disabled ? "xa-al-tf-root--disabled" : ""), textarea);
}
function renderStaticTextView(component, attrs, context, variant) {
  const rootAttrs = attrsWithClass(textViewStaticAttrs(attrs), "xa-al-tv-static");
  const inner = textViewHtml(component, context);
  if (variant !== "truncate") return tag2("div", rootAttrs, inner);
  const id2 = `xa_tv_trunc_${String(attrs["data-key"] ?? "textView").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  return tag2(
    "div",
    rootAttrs,
    tag2("div", { class: "tv-truncate collapsed", id: id2 }, inner) + tag2("button", { type: "button", class: "tv-read-more", "data-xa-trunc-toggle": id2 }, "Read more \u2193")
  );
}
function textViewHtml(component, context) {
  const raw = String(component.get("text") ?? component.get("value") ?? "");
  return context.options.allowHtml ? sanitizeHtml(raw) : escapeHtml2(raw);
}
function textViewStaticAttrs(attrs) {
  const style = stripStyleDeclarations(attrs.style, /* @__PURE__ */ new Set(["height", "min-height"]));
  return attrsWithStyle({ ...attrs, style }, "height:auto;min-height:0;max-width:100%;width:100%;box-sizing:border-box");
}
function textFieldAffix(component, kind) {
  const objectValue = component.get(kind);
  const sideIcon = kind === "prefix" ? component.get("leftIcon") : component.get("rightIcon");
  const directIcon = component.get(`${kind}Icon`) ?? sideIcon;
  const directText = component.get(`${kind}Text`);
  if (kind === "suffix" && textFieldClearSuffix(component, objectValue, directIcon)) {
    return { icon: "clear", clear: true };
  }
  const icon = iconName(directIcon) ?? iconName(objectValue) ?? iconName(sideIcon);
  let text = textValue(directText);
  if (text === void 0) {
    if (isXconObject2(objectValue)) text = textValue(objectValue.get("text") ?? objectValue.get("label"));
    else if (isXconObject2(sideIcon)) text = textValue(sideIcon.get("text") ?? sideIcon.get("label"));
    else if (typeof objectValue === "string") text = objectValue;
  }
  return { icon, text };
}
function textFieldClearSuffix(component, objectValue, directIcon) {
  if (isTruthy(component.get("clearButton"))) return true;
  if (typeof objectValue === "string" && objectValue.trim().toLowerCase() === "clear") return true;
  if (typeof directIcon === "string" && directIcon.trim().toLowerCase() === "clear") return true;
  if (!isXconObject2(objectValue)) return false;
  return isTruthy(objectValue.get("clear")) || String(objectValue.get("icon") ?? "").trim().toLowerCase() === "clear";
}
function renderTextFieldSuffix(icon, iconHtml, text, clear = false) {
  if (iconHtml) {
    const key = String(icon ?? "").toLowerCase();
    if (clear || key === "clear" || key === "x") {
      return tag2(
        "button",
        {
          type: "button",
          class: "xa-al-tf-suffix xa-al-tf-suffix-btn xa-al-tf-suffix--clear",
          style: textFieldSuffixStyle("var(--ink-3)", true),
          "aria-label": "Clear text",
          "data-xcon-tf-clear": ""
        },
        iconHtml
      );
    }
    if (key === "visibility" || key === "eye") {
      return tag2(
        "button",
        {
          type: "button",
          class: "xa-al-tf-suffix xa-al-tf-suffix-btn",
          style: textFieldSuffixStyle("var(--ink-3)", true),
          "aria-label": "Toggle password",
          "data-xcon-tf-toggle": "visibility"
        },
        iconHtml
      );
    }
    return tag2(
      "span",
      { class: `xa-al-tf-suffix${key === "check" ? " xa-al-tf-suffix--success" : ""}`, style: textFieldSuffixStyle(key === "check" ? "var(--green)" : "var(--ink-3)", false) },
      iconHtml
    );
  }
  if (text !== void 0) return tag2("span", { class: "xa-al-tf-suffix xa-al-tf-suffix-text", style: `${textFieldSuffixStyle("var(--ink-3)", false)};font-size:11px;font-weight:500` }, escapeHtml2(text));
  return "";
}
function textFieldInputType(component, forcedType) {
  if (forcedType) return forcedType;
  const inputType = textValue(component.get("inputType"));
  if (inputType) return inputType;
  if (isTruthy(component.get("secureTextEntry"))) return "password";
  const mode = String(component.get("mode") ?? "").toLowerCase();
  if (mode === "password" || mode === "email" || mode === "number" || mode === "search") return mode;
  return "text";
}
function textFieldValue(component) {
  return nonEmptyTextFieldValue(component.get("value")) ?? nonEmptyTextFieldValue(component.get("text")) ?? nonEmptyTextFieldValue(component.get("bind")) ?? nonEmptyTextFieldValue(component.get("binding")) ?? "";
}
function nonEmptyTextFieldValue(value) {
  if (value === void 0 || value === null) return void 0;
  const text = String(value);
  return text === "" ? void 0 : text;
}
function textFieldStateClass(component) {
  const state = String(component.get("fieldState") ?? component.get("state") ?? "").trim().toLowerCase();
  if (state === "success" || state === "valid") return "xa-al-tf--success";
  if (state === "error" || state === "invalid") return "xa-al-tf--error";
  return "";
}
function isTextFieldDisabled(component) {
  return isFalseLike(component.get("enabled")) || isTruthy(component.get("disabled"));
}
function nativeInputRootAttrs(component, attrs, extraClass = "") {
  const strippedStyle = stripNativeInputRootChrome(attrs.style);
  const stretchFlowWidth = shouldStretchNativeInputRoot(strippedStyle, component);
  const rootStyle = stretchFlowWidth ? stripDefaultNativeInputFlowWidth(strippedStyle) : strippedStyle;
  return attrsWithStyle(attrsWithClass({ ...attrs, style: rootStyle }, extraClass), nativeInputRootStyle(component, { stretchFlowWidth }));
}
function nativeInputRootStyle(component, options = {}) {
  const declarations = [];
  if (options.stretchFlowWidth) {
    declarations.push("align-self:stretch", "width:100%", "max-width:100%", "min-width:0", "box-sizing:border-box");
  }
  const pos = rectParts(component.get("pos"));
  if (pos) {
    appendCss(declarations, "height", cssSize(pos[3]));
    appendCss(declarations, "min-height", cssSize(pos[3]));
  }
  appendCss(declarations, "--xa-tf-radius", borderRadius(component));
  appendTextFieldBorderVars(declarations, component);
  appendCss(declarations, "--xa-tf-bg", cssColor(component.get("backgroundColor") ?? component.get("bgColor")));
  return declarations.join(";");
}
function shouldStretchNativeInputRoot(style, component) {
  if (isTextFieldOtp(component)) return false;
  return Boolean(style && /(?:^|;)width\s*:\s*auto\s*(?:;|$)/i.test(style));
}
function stripDefaultNativeInputFlowWidth(style) {
  if (!style) return void 0;
  const declarations = style.split(";").map((declaration) => declaration.trim()).filter(Boolean).filter((declaration) => !/^width\s*:\s*auto$/i.test(declaration));
  return declarations.join(";") || void 0;
}
function isTextFieldOtp(component) {
  const index2 = component.get("otpIndex");
  return index2 !== void 0 && index2 !== null && String(index2).trim() !== "";
}
function appendTextFieldBorderVars(declarations, component) {
  const border = component.get("border");
  if (isXconObject2(border)) {
    if (isFalseLike(border.get("visible"))) {
      declarations.push("--xa-tf-border-width:0px", "--xa-tf-border-color:transparent");
      return;
    }
    appendCss(declarations, "--xa-tf-border-width", cssSize(border.get("width") ?? component.get("borderWidth")));
    appendCss(declarations, "--xa-tf-border-style", border.get("style") ?? component.get("borderStyle"));
    appendCss(declarations, "--xa-tf-border-color", cssColor(border.get("color") ?? component.get("borderColor")));
    return;
  }
  if (isFalseLike(border)) {
    declarations.push("--xa-tf-border-width:0px", "--xa-tf-border-color:transparent");
    return;
  }
  appendCss(declarations, "--xa-tf-border-width", cssSize(component.get("borderWidth")));
  appendCss(declarations, "--xa-tf-border-style", component.get("borderStyle"));
  appendCss(declarations, "--xa-tf-border-color", cssColor(component.get("borderColor")));
}
function stripNativeInputRootChrome(style) {
  if (!style) return void 0;
  const blocked = /* @__PURE__ */ new Set([
    "background",
    "background-color",
    "border",
    "border-width",
    "border-style",
    "border-color",
    "border-radius",
    "box-shadow",
    "color",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "line-height",
    "object-fit",
    "object-position",
    "text-align",
    "text-decoration",
    "vertical-align",
    "white-space"
  ]);
  const declarations = style.split(";").map((declaration) => declaration.trim()).filter((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator <= 0) return false;
    return !blocked.has(declaration.slice(0, separator).trim().toLowerCase());
  });
  return declarations.join(";") || void 0;
}
function panelStackClass(component) {
  const classes = ["xa-al-panel__stack"];
  if (isPanelStackLayers(component)) classes.push("xa-al-panel__stack--layers");
  const al = component.get("al");
  if (isXconObject2(al)) {
    const stackClass = al.get("stackClass");
    if (typeof stackClass === "string") classes.push(...stackClass.split(/\s+/).filter(Boolean));
  }
  return [...new Set(classes)].join(" ");
}
function renderPanelLayer(child, index2, body) {
  const pe = normalizeLayerPointerEvents(layerValue(child, "layerPointerEvents") ?? child.get("alLayerPointerEvents"));
  const className = `xa-al-panel__layer${pe.capture ? " xa-al-panel__layer--pe-capture" : ""}`;
  return tag2("div", { class: className, style: panelLayerStyle(child, index2, pe.pointerEvents) }, body);
}
function panelLayerStyle(child, index2, pointerEvents) {
  const zRaw = layerValue(child, "layerZ") ?? child.get("alLayerZ");
  const zNumber = Number.parseInt(String(zRaw ?? ""), 10);
  const zIndex = Number.isFinite(zNumber) ? zNumber : 10 + index2 * 10;
  const flexDirection = safeCssValue2(layerValue(child, "layerFlexDirection") ?? child.get("alLayerFlexDirection")) ?? "row";
  const alignItems = safeCssValue2(layerValue(child, "layerAlignItems") ?? child.get("alLayerAlignItems")) ?? "stretch";
  const justifyContent = safeCssValue2(layerValue(child, "layerJustifyContent") ?? child.get("alLayerJustifyContent")) ?? "stretch";
  const padding = cssSize(layerValue(child, "layerPadding") ?? child.get("alLayerPadding")) ?? "0";
  return [
    "grid-area:1/1/-1/-1",
    "align-self:stretch",
    "place-self:stretch",
    "width:100%",
    "height:100%",
    "min-width:0",
    "min-height:100%",
    "display:flex",
    `flex-direction:${flexDirection}`,
    `align-items:${alignItems}`,
    `justify-content:${justifyContent}`,
    `z-index:${zIndex}`,
    `padding:${padding}`,
    `pointer-events:${pointerEvents}`,
    "box-sizing:border-box"
  ].join(";");
}
function layerValue(component, key) {
  const al = component.get("al");
  if (!isXconObject2(al)) return void 0;
  return al.get(key);
}
function normalizeLayerPointerEvents(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (["auto", "all", "fill", "capture", "block"].includes(text)) return { pointerEvents: "auto", capture: true };
  return { pointerEvents: "none", capture: false };
}
function isPanelStackLayers(component) {
  const al = component.get("al");
  const mode = String((isXconObject2(al) ? al.get("stackMode") : void 0) ?? component.get("stackMode") ?? "").trim().toLowerCase();
  return mode === "layers" || mode === "layer" || mode === "overlap";
}
function isPanelFixedHeight(component) {
  const al = component.get("al");
  return isXconObject2(al) && (isTruthy(al.get("fixedHeight")) || al.get("autoHeight") === false || al.get("autoHeight") === "false");
}
function isPanelAutoHeight(component) {
  const al = component.get("al");
  return isXconObject2(al) && isTruthy(al.get("autoHeight")) && !isPanelFixedHeight(component);
}
function hidesPanelScrollbar(component) {
  const scroll = String(component.get("scroll") ?? "none").trim().toLowerCase();
  if (scroll === "none" || scroll === "") return false;
  return !isTruthy(component.get("scrollbarVisible"));
}
function hidesFormScrollbar(component) {
  const scroll = String(component.get("scroll") ?? "none").trim().toLowerCase();
  return scroll !== "none" && scroll !== "";
}
function formBodyStyle(component) {
  const declarations = [
    "display:flex",
    "flex-direction:column",
    "width:100%",
    "min-width:0",
    "box-sizing:border-box",
    "flex:1 1 auto",
    "min-height:0"
  ];
  const al = component.get("al");
  if (isXconObject2(al)) appendCss(declarations, "max-height", al.get("maxHeight") ?? component.get("maxHeight"));
  else appendCss(declarations, "max-height", component.get("maxHeight"));
  const scroll = String(component.get("scroll") ?? "none").trim().toLowerCase();
  if (scroll === "vertical") declarations.push("overflow-y:auto", "overflow-x:hidden");
  else if (scroll === "horizontal") declarations.push("overflow-x:auto", "overflow-y:hidden");
  else if (scroll === "both" || scroll === "auto") declarations.push("overflow:auto");
  else declarations.push("overflow:hidden");
  return declarations.join(";");
}
function formStackStyle(component) {
  const al = component.get("al");
  const direction = normalizeDirection(isXconObject2(al) ? al.get("direction") ?? component.get("direction") ?? "column" : component.get("direction") ?? "column");
  const wrap = isXconObject2(al) ? al.get("wrap") ?? component.get("wrap") ?? "nowrap" : component.get("wrap") ?? "nowrap";
  const declarations = [
    "display:flex",
    `flex-direction:${direction}`,
    `flex-wrap:${attr(wrap)}`,
    `align-items:${attr(isXconObject2(al) ? al.get("alignItems") ?? component.get("alignItems") ?? "stretch" : component.get("alignItems") ?? "stretch")}`,
    `justify-content:${attr(isXconObject2(al) ? al.get("justifyContent") ?? component.get("justifyContent") ?? "flex-start" : component.get("justifyContent") ?? "flex-start")}`,
    "width:100%",
    "min-width:0",
    "box-sizing:border-box",
    "flex:1 1 auto",
    "min-height:0"
  ];
  if (isXconObject2(al)) {
    appendCss(declarations, "gap", cssSize(al.get("gap") ?? component.get("gap")));
    appendSpacing(declarations, "padding", al.get("padding") ?? component.get("padding"));
  } else {
    appendCss(declarations, "gap", cssSize(component.get("gap")));
    appendSpacing(declarations, "padding", component.get("padding"));
  }
  return declarations.join(";");
}
function panelBodyStyle(component) {
  const scroll = String(component.get("scroll") ?? "none").trim().toLowerCase();
  const al = component.get("al");
  const declarations = [
    "display:flex",
    "flex-direction:column",
    "width:100%",
    "min-width:0",
    "box-sizing:border-box"
  ];
  if (scroll !== "none" && scroll !== "") declarations.push("flex:1 1 auto", "min-height:0");
  else if (isPanelAutoHeight(component)) declarations.push("flex:0 0 auto", "min-height:auto");
  else declarations.push("flex:1 1 auto", "min-height:0");
  const maxHeight = isXconObject2(al) ? al.get("maxHeight") : component.get("maxHeight");
  appendCss(declarations, "max-height", maxHeight);
  if (scroll === "vertical") declarations.push("overflow-x:hidden", "overflow-y:auto");
  else if (scroll === "horizontal") declarations.push("overflow-x:auto", "overflow-y:hidden");
  else if (scroll === "both" || scroll === "auto") declarations.push("overflow:auto");
  else declarations.push("overflow:hidden");
  return declarations.join(";");
}
function panelStackStyle(component) {
  const al = component.get("al");
  if (!isXconObject2(al)) {
    return [
      "position:relative",
      "display:block",
      "width:100%",
      "height:100%",
      "min-height:100%",
      "box-sizing:border-box",
      "padding:0"
    ].join(";");
  }
  if (isPanelStackLayers(component)) {
    const declarations2 = [
      "display:grid",
      "grid-template-columns:1fr",
      "grid-template-rows:1fr",
      "align-items:stretch",
      "justify-items:stretch",
      "width:100%",
      "min-width:0",
      "box-sizing:border-box",
      `min-height:${cssSize(isXconObject2(al) ? al.get("minHeight") ?? component.get("minHeight") ?? rectParts(component.get("pos"))?.[3] : component.get("minHeight")) ?? "min(72vw, 420px)"}`
    ];
    if (isPanelFixedHeight(component)) declarations2.push("height:100%");
    declarations2.push("flex:1 1 auto");
    appendSpacing(declarations2, "padding", isXconObject2(al) ? al.get("padding") ?? component.get("padding") : component.get("padding"));
    return declarations2.join(";");
  }
  const direction = normalizeDirection(isXconObject2(al) ? al.get("direction") ?? component.get("direction") ?? "column" : component.get("direction") ?? "column");
  const wrap = isXconObject2(al) ? al.get("wrap") ?? component.get("wrap") ?? "nowrap" : component.get("wrap") ?? "nowrap";
  const declarations = [
    "display:flex",
    `flex-direction:${direction}`,
    `flex-wrap:${attr(wrap)}`,
    `align-items:${attr(isXconObject2(al) ? al.get("alignItems") ?? component.get("alignItems") ?? "stretch" : component.get("alignItems") ?? "stretch")}`,
    `justify-content:${attr(isXconObject2(al) ? al.get("justifyContent") ?? component.get("justifyContent") ?? "flex-start" : component.get("justifyContent") ?? "flex-start")}`,
    "width:100%",
    "min-width:0",
    "box-sizing:border-box"
  ];
  const scroll = String(component.get("scroll") ?? "none").trim().toLowerCase();
  if (scroll === "vertical") declarations.push("flex:0 0 auto", "min-height:min-content");
  else if (scroll === "horizontal") declarations.push("flex:0 0 auto", "min-height:0", "min-width:min-content");
  else if (scroll === "both" || scroll === "auto") declarations.push("flex:0 0 auto", "min-height:min-content", "min-width:min-content");
  else if (isPanelAutoHeight(component)) declarations.push("flex:0 0 auto", "min-height:min-content");
  else declarations.push("flex:1 1 auto", "min-height:0");
  if (isXconObject2(al)) {
    appendCss(declarations, "gap", cssSize(al.get("gap") ?? component.get("gap")));
    appendSpacing(declarations, "padding", al.get("padding") ?? component.get("padding"));
  } else {
    appendCss(declarations, "gap", cssSize(component.get("gap")));
    appendSpacing(declarations, "padding", component.get("padding"));
  }
  return declarations.join(";");
}
function labelTextStyle(component) {
  const declarations = [
    "display:flex",
    `align-items:${verticalAlign(component)}`,
    `justify-content:${labelJustifyFromTextAlign(component.get("textAlign"))}`,
    "flex-wrap:wrap",
    "gap:5px",
    "width:100%",
    "min-width:0",
    "padding:0",
    "margin:0"
  ];
  appendCss(declarations, "line-height", component.get("lineHeight") ?? fontValue(component, "lineHeight") ?? "1.4");
  return declarations.join(";");
}
function labelContainerJustify(component) {
  if (component.contains("textVerticalAlign") || component.contains("verticalAlign") || component.contains("textVAlign") || component.contains("valign")) {
    return verticalAlign(component);
  }
  return "flex-start";
}
function labelJustifyFromTextAlign(value) {
  return justifyFromTextAlign(value, "left");
}
function buttonStyle(component, options = {}) {
  const link = buttonAppearance(component) === "link";
  const fontSize = Number(fontValue(component, "size") ?? 14) || 14;
  const pos = rectParts(component.get("pos"));
  const rawBackground = component.get("backgroundColor") ?? component.get("bgColor");
  const backgroundText = String(rawBackground ?? "").trim();
  const backgroundKey = backgroundText.toLowerCase().replace(/\s/g, "");
  const transparentBackground = link || !backgroundText || backgroundKey.includes("transparent");
  const lightSurfaceBackground = backgroundKey === "#fff" || backgroundKey === "#ffffff" || backgroundKey === "white" || /^rgba?\(\s*255\s*,\s*255\s*,\s*255\b/.test(backgroundKey) || /var\(\s*--surface/.test(backgroundText);
  const ghostish = link || transparentBackground || lightSurfaceBackground;
  const radius = borderRadius(component) ?? "var(--r-sm,6px)";
  const border = link ? "none" : borderCss(component);
  const background = link ? "transparent" : cssColor(rawBackground) ?? "#ffffff";
  const color2 = cssColor(component.get("color")) ?? (link ? "var(--accent,#C4622D)" : ghostish ? "var(--ink-2,#6B5F4E)" : "#ffffff");
  const padding = buttonPadding(fontSize, component.get("buttonPadding") ?? component.get("padding"), link, Boolean(options.iconOnly), Boolean(options.stackColumn));
  const minHeight = buttonMinHeight(fontSize, pos?.[3], link, Boolean(options.iconOnly));
  const shadow = buttonBoxShadow(backgroundText, ghostish, link, buttonHasExplicitBorder(component));
  return [
    "display:inline-flex!important",
    `align-items:${options.stackColumn ? buttonStackAlignItems(component.get("textAlign")) : "center"}`,
    `justify-content:${options.stackColumn ? "center" : justifyFromTextAlign(component.get("textAlign"))}`,
    `flex-direction:${options.stackColumn ? "column" : "row"}`,
    `gap:${buttonLayoutGap(component, Boolean(options.stackColumn))}`,
    "margin:0",
    "box-sizing:border-box",
    `border:${border}`,
    `border-radius:${radius}`,
    `background:${background}`,
    `color:${color2}`,
    `padding:${padding}`,
    `min-height:${minHeight}`,
    "line-height:1.2",
    "white-space:nowrap",
    `cursor:${isButtonDisabled(component) ? "not-allowed" : "pointer"}`,
    "user-select:none",
    `box-shadow:${shadow}`
  ].join(";");
}
function isButtonBlock(component) {
  if (isTruthy(component.get("block") ?? component.get("fullWidth"))) return true;
  const al = component.get("al");
  return isXconObject2(al) && String(al.get("width") ?? "").trim() === "100%";
}
function buttonLayoutGap(component, stackColumn) {
  const explicit = component.get("alButtonLayoutGap") ?? component.get("buttonLayoutGap");
  if (explicit !== void 0 && explicit !== null && String(explicit).trim() !== "") return String(explicit).trim();
  return stackColumn ? "4px" : "8px";
}
function buttonStackAlignItems(value) {
  const textAlign = String(value ?? "center").trim().toLowerCase();
  if (textAlign === "right" || textAlign === "end") return "flex-end";
  if (textAlign === "left" || textAlign === "start") return "flex-start";
  return "center";
}
function buttonPadding(fontSize, explicit, link, iconOnly, stackColumn) {
  if (iconOnly) return "0";
  if (link) return "4px 8px";
  if (explicit !== void 0 && explicit !== null && String(explicit).trim() !== "") return String(explicit).trim();
  if (stackColumn) return "8px 4px";
  if (fontSize <= 11) return "5px 12px";
  if (fontSize <= 12) return "6px 14px";
  if (fontSize <= 13) return "8px 16px";
  if (fontSize <= 14) return "10px 18px";
  return "12px 22px";
}
function buttonMinHeight(fontSize, posHeight, link, iconOnly) {
  if (link || iconOnly) return "auto";
  if (posHeight && posHeight > 0) return `${posHeight}px`;
  if (fontSize <= 11) return "30px";
  if (fontSize <= 12) return "34px";
  if (fontSize <= 13) return "38px";
  if (fontSize <= 14) return "40px";
  return "46px";
}
function buttonBoxShadow(rawBackground, ghostish, link, hasExplicitBorder = false) {
  if (link) return "none";
  if (ghostish && !hasExplicitBorder) return "none";
  if (ghostish) return "var(--shadow-sm, 0 1px 4px rgba(60,45,25,0.08)), 0 1px 2px rgba(60,45,25,0.05)";
  if (rawBackground.includes("--accent")) return "0 2px 10px rgba(var(--accent-rgb), 0.34), 0 1px 3px rgba(60,45,25,0.08)";
  if (rawBackground.includes("--green")) return "0 2px 10px rgba(45, 125, 79, 0.32), 0 1px 3px rgba(60,45,25,0.06)";
  if (rawBackground.includes("--red")) return "0 2px 10px rgba(192, 58, 43, 0.32), 0 1px 3px rgba(60,45,25,0.06)";
  if (rawBackground.includes("--blue")) return "0 2px 10px rgba(43, 95, 160, 0.28), 0 1px 3px rgba(60,45,25,0.06)";
  if (rawBackground.includes("28,23,16") || rawBackground.includes("55,65,81")) return "0 2px 10px rgba(28, 23, 16, 0.22), 0 1px 3px rgba(60,45,25,0.08)";
  return "0 2px 10px rgba(60,45,25,0.14), var(--shadow-sm, 0 1px 4px rgba(60,45,25,0.08))";
}
function buttonHasExplicitBorder(component) {
  const border = component.get("border");
  if (isXconObject2(border)) return !isFalseLike(border.get("visible"));
  return border === true || border === "true" || border === 1 || border === "1";
}
function isButtonDisabled(component) {
  return isFalseLike(component.get("enabled")) || isTruthy(component.get("disabled"));
}
function buttonAppearance(component) {
  return String(component.get("appearance") ?? component.get("buttonAppearance") ?? "").trim().toLowerCase();
}
function buttonAppearanceClass(component) {
  return buttonAppearance(component) === "link" ? "xa-al-btn--link" : "";
}
function buttonSegmentClass(component) {
  const value = String(component.get("segment") ?? component.get("alButtonSegment") ?? "").trim().toLowerCase();
  if (value === "first" || value === "start") return "xa-al-btn--seg-first";
  if (value === "middle" || value === "mid" || value === "center") return "xa-al-btn--seg-mid";
  if (value === "last" || value === "end") return "xa-al-btn--seg-last";
  return "";
}
function buttonSplitClass(component) {
  const value = String(component.get("split") ?? component.get("alButtonSplit") ?? "").trim().toLowerCase();
  if (value === "main") return "xa-al-btn--split-main";
  if (value === "caret" || value === "toggle" || value === "menu") return "xa-al-btn--split-caret";
  return "";
}
function textFieldInputStyle(component, chrome = {
  hasPrefix: false,
  hasPrefixText: false,
  hasSuffix: false,
  hasLeading: false,
  hasTrailing: false,
  hasFloatLabel: false,
  hasOtp: false
}) {
  const disabled = isTextFieldDisabled(component);
  const borderRadius2 = chrome.hasFloatLabel ? "0" : chrome.hasLeading && chrome.hasTrailing ? "0" : chrome.hasLeading ? "0 var(--xa-tf-radius,var(--r-sm)) var(--xa-tf-radius,var(--r-sm)) 0" : chrome.hasTrailing ? "var(--xa-tf-radius,var(--r-sm)) 0 0 var(--xa-tf-radius,var(--r-sm))" : "var(--xa-tf-radius,var(--r-sm))";
  const padding = chrome.hasOtp ? "10px 0" : chrome.hasFloatLabel ? "10px 2px 6px" : chrome.hasPrefix || chrome.hasSuffix ? `10px ${chrome.hasSuffix ? "38px" : "14px"} 10px ${chrome.hasPrefix ? chrome.hasPrefixText ? "34px" : "38px" : "14px"}` : "10px 14px";
  const declarations = [
    "width:100%",
    "height:100%",
    "box-sizing:border-box",
    "margin:0",
    "outline:none",
    "min-height:0",
    chrome.hasFloatLabel ? "border:none" : "border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2))",
    chrome.hasFloatLabel ? "border-bottom:1.5px solid var(--xa-tf-border-color,var(--border2))" : "",
    `border-radius:${borderRadius2}`,
    `background:${disabled ? "var(--bg2)" : chrome.hasFloatLabel ? "transparent" : "var(--xa-tf-bg,var(--surface))"}`,
    "color:var(--ink)",
    "font-family:var(--font-body)",
    "font-size:14px",
    `padding:${padding}`,
    "transition:border-color .2s,box-shadow .2s,background .2s",
    `box-shadow:${chrome.hasFloatLabel ? "none" : "var(--shadow-sm)"}`
  ].filter(Boolean);
  appendCss(declarations, "font-family", fontValue(component, "family"));
  appendCss(declarations, "font-size", cssSize(fontValue(component, "size")));
  appendCss(declarations, "font-weight", fontValue(component, "weight") ?? (isTruthy(fontValue(component, "bold")) ? "bold" : void 0));
  appendCss(declarations, "font-style", fontValue(component, "style") ?? (isTruthy(fontValue(component, "italic")) ? "italic" : void 0));
  appendCss(declarations, "text-decoration", textDecoration(component));
  appendCss(declarations, "text-align", component.get("textAlign"));
  appendCss(declarations, "color", cssColor(component.get("color")));
  return declarations.join(";");
}
function textFieldAddonWrapStyle() {
  return "position:relative;width:100%;height:100%;display:flex;align-items:center";
}
function textFieldPrefixStyle() {
  return "position:absolute;left:12px;top:50%;transform:translateY(-50%);z-index:1;color:var(--ink-3);pointer-events:none;font-size:14px;display:inline-flex;align-items:center;justify-content:center";
}
function textFieldSuffixStyle(color2, interactive) {
  return [
    "position:absolute",
    "right:12px",
    "top:50%",
    "transform:translateY(-50%)",
    "z-index:1",
    `color:${color2}`,
    `pointer-events:${interactive ? "auto" : "none"}`,
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    interactive ? "cursor:pointer" : "",
    interactive ? "background:none" : "",
    interactive ? "border:none" : "",
    interactive ? "padding:0" : ""
  ].filter(Boolean).join(";");
}
function textFieldBlockWrapStyle() {
  return "display:flex;width:100%;height:100%;align-items:stretch";
}
function textFieldPreStyle() {
  return 'display:flex;align-items:center;padding:0 12px;background:var(--bg2);border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2));border-right:none;border-radius:var(--xa-tf-radius,var(--r-sm)) 0 0 var(--xa-tf-radius,var(--r-sm));font-size:13px;color:var(--ink-2);white-space:nowrap;font-family:"JetBrains Mono",monospace';
}
function textFieldPostStyle() {
  return "display:flex;align-items:center;padding:0 12px;background:var(--accent);border:var(--xa-tf-border-width,1.5px) solid var(--accent);border-left:none;border-radius:0 var(--xa-tf-radius,var(--r-sm)) var(--xa-tf-radius,var(--r-sm)) 0;font-size:12px;font-weight:600;color:#fff;cursor:pointer;white-space:nowrap;font-family:var(--font-body)";
}
function textFieldFloatGroupStyle() {
  return "position:relative;padding-top:8px;width:100%;height:100%;box-sizing:border-box";
}
function textFieldFloatLabelStyle() {
  return "position:absolute;top:18px;left:2px;font-size:14px;color:var(--ink-3);pointer-events:none;font-family:var(--font-body)";
}
function textViewInputStyle(component) {
  const disabled = isTextFieldDisabled(component);
  const declarations = [
    "width:100%",
    "height:100%",
    "min-height:80px",
    "box-sizing:border-box",
    "margin:0",
    "outline:none",
    "resize:vertical",
    `overflow:${textViewOverflow(component)}`,
    "border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2))",
    "border-radius:var(--xa-tf-radius,var(--r-sm))",
    `background:${disabled ? "var(--bg2)" : "var(--xa-tf-bg,var(--surface))"}`,
    "color:var(--ink)",
    "font-family:var(--font-body)",
    "font-size:14px",
    "padding:10px 14px",
    "line-height:1.5",
    `vertical-align:${textViewVerticalAlign(component)}`,
    "white-space:pre-wrap",
    "word-wrap:break-word",
    "transition:border-color .2s,box-shadow .2s,background .2s",
    "box-shadow:var(--shadow-sm)"
  ];
  appendCss(declarations, "font-family", fontValue(component, "family"));
  appendCss(declarations, "font-size", cssSize(fontValue(component, "size")));
  appendCss(declarations, "font-weight", fontValue(component, "weight") ?? (isTruthy(fontValue(component, "bold")) ? "bold" : void 0));
  appendCss(declarations, "font-style", fontValue(component, "style") ?? (isTruthy(fontValue(component, "italic")) ? "italic" : void 0));
  appendCss(declarations, "text-decoration", textDecoration(component));
  appendCss(declarations, "text-align", component.get("textAlign"));
  appendCss(declarations, "color", cssColor(component.get("color")));
  return declarations.join(";");
}
function textViewOverflow(component) {
  const scroll = String(component.get("scroll") ?? "vertical").trim().toLowerCase();
  return scroll === "vertical" || scroll === "horizontal" || scroll === "both" ? "auto" : "hidden";
}
function textViewVerticalAlign(component) {
  const value = String(component.get("textVerticalAlign") ?? component.get("textVAlign") ?? "top").trim().toLowerCase();
  if (value === "middle" || value === "center") return "middle";
  if (value === "bottom" || value === "end") return "bottom";
  return "top";
}
function textFieldIcon(name) {
  const paths = {
    email: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    visibility: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    clear: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
  };
  const body = paths[name.toLowerCase()];
  if (!body) return "";
  const extra = name.toLowerCase() === "check" ? " xa-al-tf-ico--success" : "";
  return `<svg class="xa-al-tf-ico${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
function iconName(value) {
  if (typeof value === "string") return value;
  if (!isXconObject2(value)) return void 0;
  const name = value.get("name") ?? value.get("icon") ?? value.get("value");
  return typeof name === "string" && name.trim() ? name.trim() : void 0;
}
function isButtonStackColumn(component) {
  const value = String(component.get("layout") ?? component.get("alButtonLayout") ?? "").toLowerCase();
  return value === "column" || value === "col" || value === "vertical";
}
function iconSvg(name, fallback = "text", options = {}) {
  const key = name.toLowerCase();
  const paths = {
    check: '<polyline points="20 6 9 17 4 12"/>',
    approve: '<polyline points="20 6 9 17 4 12"/>',
    add: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    delete: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    trash_2: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    file_download: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 14 12 18 16 14"/><line x1="12" y1="18" x2="12" y2="10"/>',
    "file-download": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 14 12 18 16 14"/><line x1="12" y1="18" x2="12" y2="10"/>',
    cloud_download: '<path d="M16 16l-4 4-4-4"/><line x1="12" y1="20" x2="12" y2="10"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
    "cloud-download": '<path d="M16 16l-4 4-4-4"/><line x1="12" y1="20" x2="12" y2="10"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
    export: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    share_2: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    schedule: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h5v-5h4v5h5v-9.5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 7.1 5.1l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>',
    favorite: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/>',
    person: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    arrow_back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    "arrow-back": '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    arrow_down: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    chevron_down: '<polyline points="6 9 12 15 18 9"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
  };
  const body = paths[key];
  const size = options.size ?? 18;
  const strokeWidth = options.strokeWidth ?? 2;
  const className = Object.hasOwn(options, "className") ? options.className : "xa-al-btn__icon";
  if (!body) return fallback === "none" ? "" : tag2("span", { class: className || void 0, "aria-hidden": "true" }, escapeHtml2(name));
  const classAttr = className ? ` class="${escapeAttr2(className)}"` : "";
  return `<svg${classAttr} width="${escapeAttr2(String(size))}" height="${escapeAttr2(String(size))}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${escapeAttr2(String(strokeWidth))}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
function checkSvg() {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>';
}
function renderOptional(tagName, value, className) {
  if (value === void 0 || value === null || value === "") return "";
  return tag2(tagName, className ? { class: className } : {}, escapeHtml2(String(value)));
}
function renderGridShowcase(component, attrs) {
  const id2 = `gridCanvas_${showcaseSuffixFromAttrs(attrs)}`;
  const controls = ["2", "3", "4", "auto"].map((cols, index2) => tag2("button", { type: "button", class: `grid-pill${index2 === 0 ? " active" : ""}`, "data-cols": cols }, cols === "auto" ? "Auto" : `${cols} cols`)).join("");
  const cells = Array.from({ length: 6 }, (_, index2) => tag2("div", { class: "grid-cell" }, String(index2 + 1).padStart(2, "0"))).join("");
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-grid-host xa-ext-grid-host--showcase"),
    tag2("div", { class: "grid-demo", "data-xcon-grid-showcase": "" }, tag2("div", { class: "grid-demo__controls" }, controls) + tag2("div", { class: "grid-canvas", id: id2, style: "grid-template-columns:repeat(2,1fr)" }, cells))
  );
}
function renderFlexBoxShowcase(component, attrs) {
  const suffix = showcaseSuffixFromAttrs(attrs);
  const justifyId = `flexJustify_${suffix}`;
  const alignId = `flexAlign_${suffix}`;
  const canvasId = `flexCanvas_${suffix}`;
  const option = (value, selected) => tag2("option", { value, selected: selected ? "" : void 0 }, value);
  const controls = tag2(
    "div",
    { class: "flex-ctrl-group" },
    tag2("label", { for: justifyId }, "justify-content") + tag2("select", { id: justifyId, "data-xcon-flex-justify": "" }, option("flex-start") + option("center") + option("flex-end") + option("space-between") + option("space-around"))
  ) + tag2(
    "div",
    { class: "flex-ctrl-group" },
    tag2("label", { for: alignId }, "align-items") + tag2("select", { id: alignId, "data-xcon-flex-align": "" }, option("flex-start") + option("center", true) + option("flex-end") + option("stretch"))
  );
  const boxes = ["Box A", "Box B longer", "C", "Box D", "E"].map((label) => tag2("div", { class: "flex-box" }, escapeHtml2(label))).join("");
  return tag2(
    "div",
    attrsWithClass({ ...attrs, "data-xcon-flex-showcase": "" }, "xa-ext-flexbox-host xa-ext-flexbox-host--showcase"),
    tag2("div", { class: "flex-controls" }, controls) + tag2("div", { class: "flex-canvas", id: canvasId, "data-xcon-flex-canvas": "" }, boxes)
  );
}
function renderStackShowcase(component, attrs) {
  const vertical = ["Item 1", "Item 2", "Item 3", "Item 4"].map((label) => tag2("div", { class: "stack-item" }, label)).join("");
  const horizontal = ["A", "B", "C", "D"].map((label) => tag2("div", { class: "stack-item" }, label)).join("");
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-stack-host xa-ext-stack-host--showcase"),
    tag2(
      "div",
      { class: "stack-demo" },
      tag2("div", { style: "flex:1" }, tag2("div", { class: "stack-label" }, "Vertical Stack") + tag2("div", { class: "stack-v" }, vertical)) + tag2("div", { style: "flex:1" }, tag2("div", { class: "stack-label" }, "Horizontal Stack") + tag2("div", { class: "stack-h" }, horizontal))
    )
  );
}
function renderSpacerShowcase(component, attrs) {
  const block = (label) => tag2("div", { class: "spacer-box" }, label);
  const visual = (size) => tag2("div", { class: "spacer-visual", style: `height:${size}px` }, tag2("span", {}, `${size}px`));
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-spacer-host xa-ext-spacer-host--showcase"),
    tag2("div", { class: "spacer-item" }, block("Block A") + visual(8) + block("Block B") + visual(16) + block("Block C") + visual(32) + block("Block D"))
  );
}
function hasDataDrivenLayoutItems(component) {
  const items = component.get("items");
  return Array.isArray(items) && items.length > 0 && items.every((item) => !isXconObject2(item) || !item.get("type"));
}
function layoutItemText(item, index2) {
  if (!isXconObject2(item)) return String(item ?? `Item ${index2 + 1}`);
  return String(item.get("content") ?? item.get("text") ?? item.get("label") ?? `Item ${index2 + 1}`);
}
function renderGridItemsSingle(component, attrs) {
  const items = component.get("items");
  const columns = Math.max(1, Number(component.get("columns") ?? 3) || 3);
  const gap = cssSize(component.get("gap")) ?? "16px";
  const responsiveStyle = isFalseLike(component.get("responsive")) ? "" : tag2(
    "style",
    {},
    "@media (max-width: 768px) { .grid-container { grid-template-columns: repeat(2, 1fr) !important; } }@media (max-width: 480px) { .grid-container { grid-template-columns: 1fr !important; } }"
  );
  const itemHtml = (Array.isArray(items) ? items : []).map((item, index2) => tag2("div", { class: "grid-item", style: "padding:8px;border:1px solid #e9ecef;border-radius:4px;background-color:white;" }, escapeHtml2(layoutItemText(item, index2)))).join("");
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-grid-host xa-ext-grid-host--single"),
    tag2("div", { class: "grid-container", style: `display:grid;grid-template-columns:repeat(${columns},1fr);gap:${gap};` }, itemHtml) + responsiveStyle
  );
}
function renderFlexBoxItemsSingle(component, attrs) {
  const items = component.get("items");
  const direction = normalizeDirection(component.get("direction") ?? "row");
  const justify = String(component.get("justify") ?? "flex-start");
  const align = String(component.get("align") ?? "stretch");
  const wrap = String(component.get("wrap") ?? "nowrap");
  const gap = cssSize(component.get("gap")) ?? "8px";
  const itemHtml = (Array.isArray(items) ? items : []).map((item, index2) => {
    const flex = isXconObject2(item) ? String(item.get("flex") ?? "0 1 auto") : "0 1 auto";
    const order = isXconObject2(item) ? String(item.get("order") ?? 0) : "0";
    const alignSelf = isXconObject2(item) ? String(item.get("alignSelf") ?? "auto") : "auto";
    const style = `flex:${flex};order:${order};align-self:${alignSelf};padding:8px;border:1px solid #e9ecef;border-radius:4px;background-color:white;`;
    return tag2("div", { class: "flex-item", style }, escapeHtml2(layoutItemText(item, index2)));
  }).join("");
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-flexbox-host xa-ext-flexbox-host--single"),
    tag2("div", { class: "flex-container", style: `display:flex;flex-direction:${direction};justify-content:${justify};align-items:${align};flex-wrap:${wrap};gap:${gap};` }, itemHtml)
  );
}
function renderStackItemsSingle(component, attrs) {
  const items = component.get("items");
  const direction = normalizeDirection(component.get("direction") ?? "column");
  const alignRaw = String(component.get("align") ?? "stretch");
  const align = alignRaw === "start" ? "flex-start" : alignRaw === "end" ? "flex-end" : alignRaw;
  const gap = cssSize(component.get("spacing") ?? component.get("gap")) ?? "8px";
  const itemHtml = (Array.isArray(items) ? items : []).map((item, index2) => tag2("div", { class: "stack-item", style: "padding:8px;border:1px solid #e9ecef;border-radius:4px;background-color:white;" }, escapeHtml2(layoutItemText(item, index2)))).join("");
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-stack-host xa-ext-stack-host--single"),
    tag2("div", { class: "stack-container", style: `display:flex;flex-direction:${direction};align-items:${align};gap:${gap};` }, itemHtml)
  );
}
function renderSpacerSingle(component, attrs) {
  const size = cssSize(component.get("size") ?? component.get("height") ?? 16) ?? "16px";
  const direction = String(component.get("direction") ?? "vertical");
  const style = direction === "horizontal" || direction === "row" ? `width:${size};height:100%;` : `height:${size};width:100%;`;
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-spacer-host xa-ext-spacer-host--single"),
    tag2("div", { class: "spacer", style }, "")
  );
}
function renderSelect(component, attrs) {
  const showcase = isShowcaseVariant(component);
  const multiple = isTruthy(component.get("multiple"));
  const selected = selectSelectedValues(component.get("value"), multiple);
  const optionRows = selectRows(component.get("options"), { slugStrings: showcase });
  const placeholder = textValue(component.get("placeholder")) ?? "\uC120\uD0DD\uD558\uC138\uC694";
  const selectId = domIdFromAttrs(attrs);
  const disabled = isFalseLike(component.get("enabled"));
  const required3 = isTruthy(component.get("required"));
  if (showcase) {
    const nativePlaceholder = textValue(component.get("nativePlaceholder")) ?? "Choose framework\u2026";
    const hasNative = selected.length > 0;
    const nativeBody = tag2("option", { value: "", selected: hasNative ? void 0 : "", disabled: "" }, escapeHtml2(nativePlaceholder)) + optionRows.map(
      (option) => tag2(
        "option",
        {
          value: attr(option.value),
          selected: selected.includes(option.value) ? "" : void 0,
          disabled: option.disabled ? "" : void 0
        },
        escapeHtml2(option.label)
      )
    ).join("");
    const select2 = tag2(
      "div",
      { class: "f-select-wrap", style: "margin-bottom:14px" },
      tag2(
        "select",
        {
          class: "f-select",
          id: `${selectId}_native`,
          required: required3 ? "" : void 0,
          disabled: disabled ? "" : void 0
        },
        nativeBody
      ) + tag2("span", { class: "f-select-arrow", "aria-hidden": "true" }, iconSvg("chevron_down", "none"))
    );
    const customRows = selectRows(component.get("customOptions"), { slugStrings: true });
    const finalCustomRows = customRows.length > 0 ? customRows : defaultShowcaseCustomSelectRows();
    const customValue = String(component.get("customValue") ?? "");
    const customDisplay = finalCustomRows.find((row) => row.value === customValue)?.label ?? String(component.get("customPlaceholder") ?? component.get("placeholder") ?? "Select a role\u2026");
    const customRootId = `${selectId}_customRoot`;
    const customTriggerId = `${selectId}_csTrigger`;
    const customValueId = `${selectId}_csValue`;
    const customDropdownId = `${selectId}_csDropdown`;
    const custom = tag2(
      "div",
      { class: "custom-select", id: customRootId, "data-xcon-custom-select": "true" },
      tag2(
        "div",
        { class: "custom-select__trigger", id: customTriggerId, role: "button", tabindex: "0", "data-xcon-custom-select-trigger": "" },
        tag2("span", { id: customValueId, "data-xcon-custom-select-value": "" }, escapeHtml2(customDisplay)) + iconSvg("chevron_down", "none")
      ) + tag2(
        "div",
        { class: "custom-select__dropdown", id: customDropdownId },
        finalCustomRows.map(
          (row) => tag2(
            "div",
            {
              class: `custom-select__opt${row.value === customValue ? " selected" : ""}`,
              "data-val": row.value,
              "data-xcon-custom-select-option": ""
            },
            escapeHtml2(row.label)
          )
        ).join("")
      )
    );
    const nativeLabel = tag2("label", { class: "f-label", for: `${selectId}_native` }, escapeHtml2(String(component.get("nativeLabel") ?? "Native Select")));
    const customLabel = renderOptional("label", component.get("customLabel") ?? "Custom Select", "f-label");
    return tag2("div", attrsWithClass(attrs, "xa-ext-select-host xa-ext-select-host--showcase"), nativeLabel + select2 + customLabel + custom);
  }
  const body = (!multiple && placeholder && selected.length === 0 ? tag2("option", { value: "", selected: "", disabled: "" }, escapeHtml2(placeholder)) : "") + optionRows.map(
    (option) => tag2(
      "option",
      {
        value: attr(option.value),
        selected: selected.includes(option.value) ? "" : void 0,
        disabled: option.disabled ? "" : void 0
      },
      escapeHtml2(option.label)
    )
  ).join("");
  const sizeValue = numberLike(component.get("size"));
  const select = tag2(
    "div",
    { class: "f-select-wrap" },
    tag2(
      "select",
      {
        class: "f-select",
        id: selectId,
        multiple: multiple ? "" : void 0,
        size: sizeValue && sizeValue > 1 ? String(sizeValue) : void 0,
        required: required3 ? "" : void 0,
        disabled: disabled ? "" : void 0
      },
      body
    ) + tag2("span", { class: "f-select-arrow", "aria-hidden": "true" }, iconSvg("chevron_down", "none"))
  );
  const labelText = component.contains("label") ? component.get("label") : component.contains("nativeLabel") ? component.get("nativeLabel") : "Native Select";
  const label = labelText !== void 0 && labelText !== null && labelText !== "" ? tag2("label", { class: "f-label", for: selectId }, escapeHtml2(String(labelText))) : "";
  return tag2("div", attrsWithClass(attrs, "xa-ext-select-host xa-ext-select-host--single"), label + select);
}
function selectRows(value, options = {}) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index2) => {
    if (typeof item === "string") {
      return {
        value: options.slugStrings ? selectSlugFromLabel(item, index2) : item,
        label: item,
        disabled: false
      };
    }
    const option = isXconObject2(item) ? item : item && typeof item === "object" && !Array.isArray(item) ? fromJSONObject2(item) : fromJSONObject2({ value: item, label: item });
    const fallbackLabel = option.get("text") ?? option.get("label") ?? option.get("value") ?? option.get("key") ?? `opt${index2}`;
    const rawValue = option.get("value") ?? option.get("key") ?? option.get("label") ?? option.get("text") ?? `opt${index2}`;
    return {
      value: String(option.get("value") ?? option.get("key") ?? (options.slugStrings ? selectSlugFromLabel(fallbackLabel, index2) : rawValue)),
      label: String(option.get("label") ?? option.get("text") ?? fallbackLabel),
      disabled: isTruthy(option.get("disabled"))
    };
  });
}
function defaultShowcaseCustomSelectRows() {
  return [
    { value: "designer", label: "\u{1F3A8} Designer", disabled: false },
    { value: "dev", label: "\u{1F4BB} Developer", disabled: false },
    { value: "pm", label: "\u{1F4CB} Product Manager", disabled: false },
    { value: "data", label: "\u{1F4CA} Data Analyst", disabled: false },
    { value: "devops", label: "\u2699\uFE0F DevOps", disabled: false }
  ];
}
function selectSelectedValues(value, multiple) {
  if (value === void 0 || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  const text = String(value);
  return multiple ? text.split(",").map((item) => item.trim()).filter(Boolean) : [text];
}
function selectSlugFromLabel(label, index2) {
  const text = String(label ?? "").trim();
  const compact = text.toLowerCase().replace(/\s+/g, "");
  const mapped = {
    react: "react",
    vue: "vue",
    svelte: "svelte",
    solidjs: "solid",
    solid: "solid",
    angular: "angular"
  };
  if (mapped[compact]) return mapped[compact];
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 32);
  return slug || `opt${index2}`;
}
function isShowcaseVariant(component) {
  const value = String(component.get("variant") ?? component.get("extVariant") ?? component.get("selectVariant") ?? "").trim().toLowerCase();
  return value === "showcase";
}
function sliderFill(min2, max2, value) {
  if (!Number.isFinite(min2) || !Number.isFinite(max2) || max2 === min2) return "0.0";
  const clamped = Math.min(max2, Math.max(min2, Number.isFinite(value) ? value : min2));
  return ((clamped - min2) / (max2 - min2) * 100).toFixed(1);
}
function switchSizeClass(value) {
  const size = String(value ?? "medium").trim().toLowerCase();
  if (size === "small" || size === "sm") return "switch--sm";
  if (size === "large" || size === "lg") return "switch--lg";
  return "switch--md";
}
function progressVariant(value) {
  const variant = String(value ?? "a").trim().toLowerCase();
  if (variant === "default" || variant === "gradient" || variant === "striped") return "a";
  return ["a", "b", "c", "d"].includes(variant) ? variant : "a";
}
function spinnerKind(value) {
  const kind = String(value ?? "ring").trim().toLowerCase();
  if (kind === "dots") return "dots";
  if (kind === "pulse" || kind === "grow") return "pulse";
  if (kind === "bars") return "bars";
  return "ring";
}
function spinnerRgb(value) {
  const color2 = String(value ?? "").trim();
  const hex2 = color2.startsWith("#") ? color2.slice(1) : "";
  if (hex2.length === 3 || hex2.length === 6) {
    const full = hex2.length === 3 ? hex2.split("").map((part) => part + part).join("") : hex2;
    const numeric = Number.parseInt(full, 16);
    if (Number.isFinite(numeric)) return `${numeric >> 16 & 255}, ${numeric >> 8 & 255}, ${numeric & 255}`;
  }
  const rgba2 = color2.split(",").map((part) => Number.parseInt(part.trim(), 10));
  if (rgba2.length >= 3 && rgba2.slice(0, 3).every(Number.isFinite)) return `${rgba2[0]}, ${rgba2[1]}, ${rgba2[2]}`;
  return "0, 123, 255";
}
function spinnerGraphic(kind, size) {
  const sizeClass = String(size ?? "medium").trim().toLowerCase() === "small" ? "xa-ext-spin-scale--sm" : String(size ?? "").trim().toLowerCase() === "large" ? "xa-ext-spin-scale--lg" : "xa-ext-spin-scale--md";
  if (kind === "dots") return tag2("div", { class: `sp-dots ${sizeClass}`, role: "status", "aria-hidden": "true" }, "<span></span><span></span><span></span>");
  if (kind === "pulse") return tag2("div", { class: `sp-pulse ${sizeClass}`, role: "status", "aria-hidden": "true" }, "");
  if (kind === "bars") return tag2("div", { class: `sp-bars ${sizeClass}`, role: "status", "aria-hidden": "true" }, "<span></span><span></span><span></span><span></span>");
  const ringSize = String(size ?? "medium").trim().toLowerCase() === "small" ? "sp-ring--sm" : String(size ?? "").trim().toLowerCase() === "large" ? "sp-ring--lg" : "sp-ring--md";
  return tag2("div", { class: `sp-ring ${ringSize}`, role: "status", "aria-hidden": "true" }, "");
}
function renderChoice(component, attrs, type2, context) {
  const isCheckbox = type2 === "checkbox";
  if (isCheckbox) return renderCheckbox(component, attrs, context);
  return renderRadio(component, attrs);
}
function renderRadio(component, attrs) {
  const variant = String(component.get("variant") ?? component.get("radioVariant") ?? "").trim().toLowerCase();
  if (variant === "segment") return renderRadioSegment(component, attrs);
  if (variant === "plan") return renderRadioPlan(component, attrs);
  if (variant === "rating") return renderRadioRating(component, attrs);
  return renderRadioList(component, attrs);
}
function renderRadioList(component, attrs) {
  const disabled = isFalseLike(component.get("enabled"));
  const input = radioInput(component, "xa-al-rb-input", disabled);
  const label = radioLabelHtml(component);
  return tag2(
    "label",
    attrsWithClass(radioVariantAttrs(attrs, "list"), `xa-al-rb-item${disabled ? " xa-al-rb-item--disabled" : ""}`),
    `${input}${tag2("span", { class: "xa-al-rb-circle", "aria-hidden": "true" }, "")}${label}`
  );
}
function renderRadioSegment(component, attrs) {
  const disabled = isFalseLike(component.get("enabled"));
  const id2 = radioInputId(attrs);
  const input = radioInput(component, "xa-al-rb-seg-inp", disabled, id2);
  return tag2(
    "div",
    attrsWithClass(radioVariantAttrs(attrs, "segment"), `xa-al-rb-btn-item${disabled ? " xa-al-rb-item--disabled" : ""}`),
    `${input}${tag2("label", { class: "xa-al-rb-btn-label", for: id2 }, escapeHtml2(String(component.get("label") ?? component.get("text") ?? "")))}`
  );
}
function renderRadioPlan(component, attrs) {
  const disabled = isFalseLike(component.get("enabled"));
  const pricePer = textValue(component.get("planPricePer")) ?? "";
  const features = radioPlanFeatures(component.get("planFeatures")).map((feature) => tag2("div", { class: "xa-al-rb-plan__feat" }, escapeHtml2(feature))).join("");
  return tag2(
    "label",
    attrsWithClass(radioVariantAttrs(attrs, "plan"), `xa-al-rb-plan${disabled ? " xa-al-rb-item--disabled" : ""}`),
    `${radioInput(component, "xa-al-rb-plan-input", disabled)}${tag2("div", { class: "xa-al-rb-plan__badge" }, "Popular")}${tag2(
      "div",
      { class: "xa-al-rb-plan__name" },
      escapeHtml2(String(component.get("planName") ?? component.get("label") ?? component.get("text") ?? ""))
    )}${tag2(
      "div",
      { class: "xa-al-rb-plan__price" },
      `${escapeHtml2(String(component.get("planPriceMain") ?? ""))}${tag2("span", { class: "xa-al-rb-plan__per" }, escapeHtml2(pricePer))}`
    )}${tag2("div", { class: "xa-al-rb-plan__features" }, features)}`
  );
}
function renderRadioRating(component, attrs) {
  const rating = Math.max(0, Math.min(5, Number.parseInt(String(component.get("ratingValue") ?? 4), 10) || 4));
  const stars = Array.from(
    { length: 5 },
    (_, index2) => tag2("span", { class: `xa-al-rb-star${index2 + 1 <= rating ? " on" : ""}`, "data-v": String(index2 + 1), role: "presentation" }, "\u2605")
  ).join("");
  return tag2(
    "div",
    attrsWithClass(radioVariantAttrs(attrs, "rating"), "xa-al-rb-rating-wrap"),
    tag2("div", { class: "xa-al-rb-rating-row", "data-xa-rating-value": String(rating) }, stars) + tag2("p", { class: "xa-al-rb-rating-cap" }, escapeHtml2(`${rating.toFixed(1)} out of 5 stars`))
  );
}
function radioInput(component, className, disabled, id2) {
  return voidTag("input", {
    type: "radio",
    class: className,
    id: id2,
    checked: radioChecked(component) ? "" : void 0,
    disabled: disabled ? "" : void 0,
    name: attr(component.get("group") ?? component.get("groupName") ?? "radioGroup"),
    value: attr(radioInputValue(component))
  });
}
function radioInputValue(component) {
  const value = component.get("value");
  if (value !== void 0 && value !== null && String(value) !== "") return String(value);
  const fallback = String(component.get("label") ?? component.get("text") ?? "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
  return fallback || "opt";
}
function radioChecked(component) {
  return isTruthy(component.get("checked")) || String(component.get("state") ?? "").toLowerCase() === "checked";
}
function radioLabelHtml(component) {
  const parts = checkboxSplitTitleSub(String(component.get("label") ?? component.get("text") ?? ""));
  if (parts.sub) {
    return tag2("div", { class: "xa-al-cb-label" }, tag2("p", {}, escapeHtml2(parts.title)) + tag2("small", {}, escapeHtml2(parts.sub)));
  }
  return tag2("div", { class: "xa-al-cb-label xa-al-cb-label--plain" }, escapeHtml2(parts.title));
}
function radioPlanFeatures(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  const text = String(value ?? "");
  if (!text) return [];
  return text.split(text.includes("|") ? "|" : /\r?\n/).map((item) => item.trim()).filter(Boolean);
}
function radioInputId(attrs) {
  return `xa_rb_${String(attrs["data-key"] ?? Math.random()).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}
function radioVariantAttrs(attrs, variant) {
  const blocked = variant === "segment" || variant === "plan" ? /* @__PURE__ */ new Set(["position", "left", "top", "width", "height", "min-height"]) : /* @__PURE__ */ new Set(["position", "left", "top", "height", "min-height"]);
  const style = stripStyleDeclarations(attrs.style, blocked);
  const variantStyle = variant === "segment" || variant === "plan" ? "height:auto;flex:1 1 0;min-width:0;width:auto;max-width:100%;align-self:stretch;box-sizing:border-box" : "height:auto;width:100%;min-width:0;box-sizing:border-box";
  return attrsWithAppendedStyle({ ...attrs, style }, `position:relative;${variantStyle}`);
}
function stripStyleDeclarations(style, blocked) {
  if (!style) return void 0;
  const declarations = style.split(";").map((declaration) => declaration.trim()).filter((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator <= 0) return false;
    return !blocked.has(declaration.slice(0, separator).trim().toLowerCase());
  });
  return declarations.join(";") || void 0;
}
function renderCheckbox(component, attrs, context) {
  const variant = String(component.get("variant") ?? component.get("checkboxVariant") ?? "").trim().toLowerCase();
  if (variant === "card") return renderCheckboxCard(component, attrs);
  if (variant === "pill") return renderCheckboxPill(component, attrs);
  if (variant === "terms") return renderCheckboxTerms(component, attrs, context);
  return renderCheckboxList(component, attrs, context);
}
function renderCheckboxList(component, attrs, context) {
  const disabled = isFalseLike(component.get("enabled"));
  const indeterminate = checkboxIndeterminate(component);
  const appearance = checkboxAppearance(component);
  const input = checkboxInput(component, "xa-al-cb-input", disabled, indeterminate);
  const boxClasses = ["xa-al-cb-box", appearance ? `xa-al-cb-box--${appearance}` : "", indeterminate ? "xa-al-cb-box--indeterminate" : ""].filter(Boolean).join(" ");
  const label = checkboxLabelHtml(component, context);
  return tag2(
    "label",
    attrsWithClass(checkboxVariantAttrs(attrs, "list"), `xa-al-cb-item${disabled ? " xa-al-cb-item--disabled" : ""}`),
    `${input}${tag2("span", { class: boxClasses, "aria-hidden": "true" }, checkSvg())}${label}`
  );
}
function renderCheckboxTerms(component, attrs, context) {
  const disabled = isFalseLike(component.get("enabled"));
  const html = checkboxRichLabel(component, context);
  return tag2(
    "label",
    attrsWithClass(checkboxVariantAttrs(attrs, "terms"), `xa-al-cb-item xa-al-cb-item--terms${disabled ? " xa-al-cb-item--disabled" : ""}`),
    `${checkboxInput(component, "xa-al-cb-input", disabled, false)}${tag2("span", { class: "xa-al-cb-box", "aria-hidden": "true" }, checkSvg())}${tag2(
      "span",
      { class: "xa-al-cb-terms-wrap" },
      html
    )}`
  );
}
function renderCheckboxCard(component, attrs) {
  const disabled = isFalseLike(component.get("enabled"));
  const parsed = checkboxCardParts(String(component.get("label") ?? component.get("text") ?? ""));
  const icon = parsed.icon ? tag2("div", { class: "xa-al-cb-card-icon" }, escapeHtml2(parsed.icon)) : "";
  const sub = parsed.sub ? tag2("div", { class: "xa-al-cb-card-sub" }, escapeHtml2(parsed.sub)) : "";
  return tag2(
    "label",
    attrsWithClass(checkboxVariantAttrs(attrs, "card"), `xa-al-cb-card${disabled ? " xa-al-cb-item--disabled" : ""}`),
    `${checkboxInput(component, "xa-al-cb-card-input", disabled, false)}${tag2("span", { class: "xa-al-cb-card-check", "aria-hidden": "true" }, checkSvg())}${icon}${tag2(
      "div",
      { class: "xa-al-cb-card-title" },
      escapeHtml2(parsed.title)
    )}${sub}`
  );
}
function renderCheckboxPill(component, attrs) {
  const disabled = isFalseLike(component.get("enabled"));
  return tag2(
    "label",
    attrsWithClass(checkboxVariantAttrs(attrs, "pill"), `xa-al-cb-pill${disabled ? " xa-al-cb-item--disabled" : ""}`),
    `${checkboxInput(component, "xa-al-cb-pill-input", disabled, false)}${tag2(
      "span",
      { class: "xa-al-cb-pill-lbl" },
      escapeHtml2(String(component.get("label") ?? component.get("text") ?? ""))
    )}`
  );
}
function checkboxVariantAttrs(attrs, variant) {
  const blocked = /* @__PURE__ */ new Set(["position", "left", "top"]);
  if (variant === "card" || variant === "pill" || variant === "terms") {
    blocked.add("height");
    blocked.add("min-height");
  }
  if (variant === "pill") {
    blocked.add("width");
  }
  const style = stripStyleDeclarations(attrs.style, blocked);
  const base = "position:relative;align-self:stretch;width:100%;max-width:100%;min-width:0;box-sizing:border-box;min-height:0";
  const variantStyle = variant === "card" ? "height:auto;min-height:min-content;overflow:visible;box-sizing:border-box" : variant === "pill" ? "height:auto;width:auto;max-width:100%;flex:0 0 auto;align-self:flex-start" : variant === "terms" ? "height:auto;align-items:flex-start" : "";
  return attrsWithAppendedStyle({ ...attrs, style }, [base, variantStyle].filter(Boolean).join(";"));
}
function checkboxInput(component, className, disabled, indeterminate) {
  return voidTag("input", {
    type: "checkbox",
    class: className,
    checked: checkboxChecked(component) && !indeterminate ? "" : void 0,
    disabled: disabled ? "" : void 0,
    value: attr(component.get("value") ?? ""),
    "data-xa-indeterminate": indeterminate ? "1" : void 0
  });
}
function checkboxChecked(component) {
  return isTruthy(component.get("checked") ?? component.get("value"));
}
function checkboxIndeterminate(component) {
  return isTruthy(component.get("indeterminate")) || String(component.get("state") ?? component.get("value") ?? "").toLowerCase() === "indeterminate";
}
function checkboxAppearance(component) {
  const value = String(component.get("appearance") ?? component.get("checkboxAppearance") ?? "").trim().toLowerCase();
  return value === "green" || value === "blue" ? value : "";
}
function checkboxLabelHtml(component, context) {
  const rich = component.get("labelHtml");
  if (rich !== void 0 && rich !== null && rich !== "") return tag2("span", { class: "xa-al-cb-terms-wrap" }, checkboxRichLabel(component, context));
  const parts = checkboxSplitTitleSub(String(component.get("label") ?? component.get("text") ?? ""));
  if (parts.sub) {
    return tag2(
      "span",
      { class: "xa-al-cb-label" },
      tag2("p", {}, escapeHtml2(parts.title)) + tag2("small", {}, escapeHtml2(parts.sub))
    );
  }
  return tag2("span", { class: "xa-al-cb-label xa-al-cb-label--plain" }, escapeHtml2(parts.title));
}
function checkboxRichLabel(component, context) {
  const raw = String(component.get("labelHtml") ?? component.get("label") ?? component.get("text") ?? "");
  return context.options.allowHtml ? sanitizeHtml(raw) : escapeHtml2(raw);
}
function checkboxSplitTitleSub(text) {
  const index2 = text.indexOf(" \xB7 ");
  if (index2 < 0) return { title: text, sub: "" };
  return { title: text.slice(0, index2), sub: text.slice(index2 + 3) };
}
function checkboxCardParts(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\p{Extended_Pictographic})\s+(.+)$/u);
  const body = match ? match[2] : trimmed;
  const parts = checkboxSplitTitleSub(body);
  return { icon: match ? match[1] : "", ...parts };
}
function renderSlider(component, attrs) {
  const min2 = Number(component.get("min") ?? component.get("minValue") ?? 0);
  const max2 = Number(component.get("max") ?? component.get("maxValue") ?? 100);
  const value = Number(component.get("value") ?? 50);
  const key = domIdFromAttrs(attrs);
  const showValue = !isFalseLike(component.get("showValue"));
  const inputId = `${key}~rng`;
  const valueId = `${key}~sv`;
  const input = renderSliderInput(component, min2, max2, value, inputId, showValue ? valueId : void 0);
  const valueHtml = showValue ? tag2("div", { class: "slider-value", id: valueId }, escapeHtml2(String(value))) : "";
  const labels = isFalseLike(component.get("showLabels") ?? component.get("showSliderLabels")) ? "" : tag2("div", { class: "slider-labels" }, tag2("span", {}, String(min2)) + tag2("span", {}, String(Math.round((min2 + max2) / 2))) + tag2("span", {}, String(max2)));
  const labelText = component.get("label") ?? component.get("sliderLabel");
  const labelHtml = labelText === void 0 || labelText === null || labelText === "" ? "" : tag2("label", { class: "f-label", for: inputId }, escapeHtml2(String(labelText)));
  const single = labelHtml + valueHtml + tag2("div", { class: "slider-wrap" }, input) + labels;
  if (!isShowcaseVariant(component)) return tag2("div", attrsWithClass(attrs, "xa-ext-slider-host xa-ext-slider-host--single"), single);
  const volumeValue = Math.min(max2, Math.max(min2, value + 3));
  const opacityValue = Math.min(max2, Math.max(min2, value + 18));
  const volumeId = `${key}~vol`;
  const opacityId = `${key}~op`;
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-slider-host xa-ext-slider-host--showcase"),
    valueHtml + tag2("div", { class: "slider-wrap" }, input) + labels + tag2("div", { style: "margin-top:16px" }, tag2("label", { class: "f-label", for: volumeId }, "Volume") + tag2("div", { class: "slider-wrap" }, renderSliderInput(component, min2, max2, volumeValue, volumeId))) + tag2("div", { style: "margin-top:14px" }, tag2("label", { class: "f-label", for: opacityId }, "Opacity") + tag2("div", { class: "slider-wrap" }, renderSliderInput(component, min2, max2, opacityValue, opacityId)))
  );
}
function renderSliderInput(component, min2, max2, value, id2, valueTarget) {
  return voidTag("input", {
    class: "f-range",
    id: id2,
    type: "range",
    min: attr(min2),
    max: attr(max2),
    step: attr(component.get("step") ?? 1),
    value: attr(value),
    style: `--fill:${sliderFill(min2, max2, value)}%`,
    disabled: isFalseLike(component.get("enabled")) ? "" : void 0,
    "data-xcon-range": "",
    "data-xcon-range-value-target": valueTarget
  });
}
function renderSwitch(component, attrs) {
  const checked = isTruthy(component.get("checked") ?? component.get("value"));
  const key = domIdFromAttrs(attrs);
  const input = renderSwitchInput(component, checked, key);
  const size = switchSizeClass(component.get("size"));
  const title = textValue(component.get("title") ?? component.get("switchTitle") ?? component.get("label") ?? component.get("text"));
  const subtitle = textValue(component.get("subtitle") ?? component.get("switchSubtitle"));
  const info = title || subtitle ? tag2("div", { class: "switch-info" }, (title ? tag2("p", {}, escapeHtml2(title)) : "") + (subtitle ? tag2("small", {}, escapeHtml2(subtitle)) : "")) : "";
  const row = tag2("div", { class: `switch-row${info ? "" : " switch-row--control-only"}` }, info + tag2("label", { class: `switch ${size}` }, input + tag2("span", { class: "switch__track" }, "")));
  if (!isShowcaseVariant(component)) return tag2("div", attrsWithClass(attrs, "xa-ext-switch-host xa-ext-switch-host--single"), row);
  const rows = [
    ["Dark Mode", "Use dark color scheme", true],
    ["Notifications", "Receive push notifications", false],
    ["Auto-save", "Save changes automatically", true],
    ["Analytics", "Share anonymous usage data", false]
  ];
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-switch-host xa-ext-switch-host--showcase"),
    rows.map(
      ([t, s, c2], index2) => tag2(
        "div",
        { class: "switch-row" },
        tag2("div", { class: "switch-info" }, tag2("p", {}, t) + tag2("small", {}, s)) + tag2("label", { class: `switch ${size}` }, renderSwitchInput(component, c2, `${key}~sw${index2 + 1}`, `${t} ${s}`) + tag2("span", { class: "switch__track" }, ""))
      )
    ).join("")
  );
}
function renderSwitchInput(component, checked, id2, label) {
  return voidTag("input", {
    type: "checkbox",
    id: id2,
    role: "switch",
    checked: checked ? "" : void 0,
    disabled: isFalseLike(component.get("enabled")) ? "" : void 0,
    "aria-checked": checked ? "true" : "false",
    "aria-label": attr(label ?? switchAriaLabel(component, checked)),
    "data-xcon-switch": ""
  });
}
function switchAriaLabel(component, checked) {
  const labels = component.get("labels");
  const on = isXconObject2(labels) ? labels.get("on") : void 0;
  const off = isXconObject2(labels) ? labels.get("off") : void 0;
  return String((checked ? on ?? component.get("onText") : off ?? component.get("offText")) ?? (checked ? "ON" : "OFF"));
}
function renderColorPicker(component, attrs) {
  const id2 = domIdFromAttrs(attrs);
  const suffix = pickerIdSuffix(attrs, "colorPicker");
  const value = normalizeHexColor(component.get("value"), isShowcaseVariant(component) ? "#7C6AF7" : "#000000");
  const swatches = ["#7C6AF7", "#34D399", "#F87171", "#FBBF24", "#60A5FA", "#F472B6", "#A78BFA", "#2DD4BF"];
  const swatchHtml = swatches.map((hex3, index2) => tag2("div", { class: `color-swatch${index2 === 0 ? " selected" : ""}`, style: `background:${hex3}`, "data-hex": hex3 }, "")).join("");
  if (isShowcaseVariant(component)) {
    return tag2(
      "div",
      { ...attrsWithClass(attrs, "xa-ext-color-picker-host xa-ext-color-picker-host--showcase"), "data-xcon-color-picker": "" },
      tag2(
        "div",
        { class: "color-picker-wrap" },
        tag2("div", { class: "color-preview", id: `colorPreview_${suffix}`, style: "background:#7C6AF7", "data-xcon-color-preview": "" }, "") + voidTag("input", {
          type: "range",
          class: "color-spectrum",
          id: `colorHue_${suffix}`,
          min: "0",
          max: "360",
          value: "258",
          style: "background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
          "data-xcon-color-hue": ""
        }) + tag2(
          "div",
          { class: "color-hex-row" },
          tag2("div", { class: "color-hex-dot", id: `colorHexDot_${suffix}`, style: "background:#7C6AF7", "data-xcon-color-dot": "" }, "") + voidTag("input", { type: "text", id: `colorHexInput_${suffix}`, value: "#7C6AF7", "data-xcon-color-hex": "" })
        ) + tag2("div", { class: "color-swatches", id: `colorSwatches_${suffix}` }, swatchHtml)
      )
    );
  }
  const showPreview = !isFalseLike(component.get("showPreview"));
  const showHex = !isFalseLike(component.get("showHex"));
  const key = String(attrs["data-key"] ?? id2);
  const preview = showPreview ? tag2("div", { class: "color-preview", id: `${key}~preview`, style: `background:${value}`, "data-xcon-color-preview": "" }, "") : "";
  const dot = showPreview ? tag2("div", { class: "color-hex-dot", style: `background:${value}`, "data-xcon-color-dot": "" }, "") : "";
  const hex2 = showHex ? voidTag("input", { type: "text", class: "f-input", id: `${key}~hex`, value, "data-xcon-color-hex": "" }) : "";
  return tag2(
    "div",
    { ...attrsWithClass(attrs, "xa-ext-color-picker-host xa-ext-color-picker-host--single"), "data-xcon-color-picker": "" },
    tag2(
      "div",
      { class: "color-picker-wrap" },
      preview + tag2(
        "div",
        { class: "color-hex-row" },
        dot + voidTag("input", { type: "color", id: key, value, "data-xcon-color-input": "", style: "width:48px;height:36px;padding:0;border:1px solid var(--border2);border-radius:8px;cursor:pointer;background:var(--surface2);" }) + hex2
      )
    )
  );
}
function renderDatePicker(component, attrs) {
  if (isShowcaseVariant(component)) {
    const suffix = pickerIdSuffix(attrs, "datePicker");
    return tag2(
      "div",
      { ...attrsWithClass(attrs, "xa-ext-date-picker-host xa-ext-date-picker-host--showcase"), "data-xcon-date-picker": "", "data-xcon-picker-suffix": suffix },
      tag2(
        "div",
        { class: "date-picker", id: `datePicker_${suffix}` },
        tag2(
          "div",
          { class: "date-picker__header" },
          pickerNavButton("prev", `dpPrev_${suffix}`) + tag2("span", { class: "date-picker__month", id: `dpMonthLabel_${suffix}` }, "") + pickerNavButton("next", `dpNext_${suffix}`)
        ) + tag2("table", { class: "date-picker__grid" }, datePickerTableBody(`dpBody_${suffix}`))
      )
    );
  }
  const showIcon = !isFalseLike(component.get("showIcon"));
  const key = String(attrs["data-key"] ?? "datePicker");
  const input = voidTag("input", {
    type: "date",
    id: key,
    value: attr(component.get("value") ?? ""),
    min: attr(component.get("min")),
    max: attr(component.get("max")),
    required: isTruthy(component.get("required")) ? "" : void 0,
    style: "width:100%;height:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;padding-right:40px;"
  }) + (showIcon ? tag2("span", { style: "position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:#666;" }, "\u{1F4C5}") : "");
  return tag2("div", attrsWithClass(attrs, "xa-ext-date-picker-host xa-ext-date-picker-host--single"), tag2("div", { style: "position:relative;" }, input));
}
function renderTimePicker(component, attrs) {
  if (isShowcaseVariant(component)) {
    const suffix = pickerIdSuffix(attrs, "timePicker");
    return tag2(
      "div",
      { ...attrsWithClass(attrs, "xa-ext-time-picker-host xa-ext-time-picker-host--showcase"), "data-xcon-time-picker": "", "data-xcon-picker-suffix": suffix },
      tag2(
        "div",
        { class: "time-picker" },
        tag2(
          "div",
          { class: "time-picker__display" },
          tag2("span", { class: "time-picker__time" }, `${tag2("span", { id: `tpHour_${suffix}` }, "09")}:${tag2("span", { id: `tpMin_${suffix}` }, "30")}`) + tag2("span", { class: "time-picker__ampm", id: `tpAmpm_${suffix}` }, "AM")
        ) + tag2(
          "div",
          { class: "time-picker__cols" },
          timePickerColumn("Hour", [], "09", `tpHourList_${suffix}`) + timePickerColumn("Min", [], "30", `tpMinList_${suffix}`) + timePickerColumn("AM/PM", ["AM", "PM"], "AM", `tpAmpmList_${suffix}`, false)
        )
      )
    );
  }
  const showIcon = !isFalseLike(component.get("showIcon"));
  const key = String(attrs["data-key"] ?? "timePicker");
  const input = voidTag("input", {
    type: "time",
    id: key,
    value: attr(component.get("value") ?? ""),
    min: attr(component.get("min")),
    max: attr(component.get("max")),
    step: attr(component.get("step")),
    required: isTruthy(component.get("required")) ? "" : void 0,
    style: "width:100%;height:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;padding-right:40px;"
  }) + (showIcon ? tag2("span", { style: "position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:#666;" }, "\u{1F550}") : "");
  return tag2("div", attrsWithClass(attrs, "xa-ext-time-picker-host xa-ext-time-picker-host--single"), tag2("div", { style: "position:relative;" }, input));
}
function normalizeHexColor(value, fallback) {
  const text = String(value ?? "").trim();
  return /^#[0-9A-Fa-f]{6}$/.test(text) ? text : fallback;
}
function pickerIdSuffix(attrs, fallback) {
  return String(attrs["data-key"] ?? attrs.id ?? fallback).replace(/[^a-zA-Z0-9_-]/g, "_");
}
function showcaseIdSuffix(attrs, fallback) {
  return String(attrs["data-key"] ?? attrs.id ?? fallback).replace(/[^a-zA-Z0-9_-]/g, "_");
}
function pickerNavButton(direction, id2) {
  const points = direction === "prev" ? "15 18 9 12 15 6" : "9 18 15 12 9 6";
  return tag2(
    "button",
    { type: "button", class: "date-picker__nav", id: id2, "aria-label": direction === "prev" ? "Previous month" : "Next month" },
    `<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="${points}"/></svg>`
  );
}
function datePickerTableBody(bodyId) {
  const headings = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => tag2("th", {}, day)).join("");
  if (bodyId) return tag2("thead", {}, tag2("tr", {}, headings)) + tag2("tbody", { id: bodyId }, "");
  const days = [
    ["other-month", "26"],
    ["other-month", "27"],
    ["other-month", "28"],
    ["other-month", "29"],
    ["", "1"],
    ["", "2"],
    ["", "3"],
    ["", "4"],
    ["today", "5"],
    ["", "6"],
    ["selected", "7"],
    ["in-range", "8"],
    ["", "9"],
    ["", "10"],
    ["", "11"],
    ["", "12"],
    ["", "13"],
    ["", "14"],
    ["", "15"],
    ["", "16"],
    ["", "17"],
    ["", "18"],
    ["", "19"],
    ["", "20"],
    ["", "21"],
    ["", "22"],
    ["", "23"],
    ["", "24"]
  ];
  const rows = Array.from(
    { length: 4 },
    (_unused, row) => tag2(
      "tr",
      {},
      days.slice(row * 7, row * 7 + 7).map(([cls, label]) => tag2("td", {}, tag2("button", { type: "button", class: `date-day${cls ? ` ${cls}` : ""}` }, label))).join("")
    )
  ).join("");
  return tag2("thead", {}, tag2("tr", {}, headings)) + tag2("tbody", {}, rows);
}
function timePickerColumn(label, values, selected, id2, buttons = true) {
  return tag2(
    "div",
    { class: "time-picker__col" },
    tag2("div", { class: "time-picker__col-label" }, escapeHtml2(label)) + tag2(
      "div",
      { class: "time-picker__scroll", id: id2 },
      values.map(
        (value) => buttons ? tag2("button", { type: "button", class: `time-picker__item${value === selected ? " selected" : ""}`, "data-v": value }, escapeHtml2(value)) : tag2("div", { class: `time-picker__item${value === selected ? " selected" : ""}`, "data-v": value }, escapeHtml2(value))
      ).join("")
    )
  );
}
function renderProgressBar(component, attrs) {
  const value = Number(component.get("value") ?? 0);
  const max2 = Number(component.get("max") ?? 100);
  const pct = Math.max(0, Math.min(100, Math.round(value / (max2 || 100) * 100)));
  const animated = isTruthy(component.get("animated"));
  const trackColor = cssColor(component.get("backgroundColor"));
  const trackStyle = trackColor && trackColor.toLowerCase() !== "#e9ecef" ? `background:${trackColor}` : void 0;
  const fillColor = cssColor(component.get("color"));
  const fillStyle = fillColor && fillColor.toLowerCase() !== "#007bff" ? `;background:${fillColor}` : "";
  const row = (label, percent, variant2, showLabel = !isFalseLike(component.get("showText")), customFill = true, customTrackStyle) => tag2(
    "div",
    { class: "progress-item" },
    (showLabel ? tag2("div", { class: "progress-label" }, tag2("span", {}, escapeHtml2(label)) + tag2("span", {}, `${percent}%`)) : "") + tag2(
      "div",
      { class: `progress-track${animated ? " xa-ext-progress-stripes" : ""}`, style: customTrackStyle },
      tag2("div", { class: `progress-fill progress-fill--${variant2}`, style: `width:${percent}%${customFill ? fillStyle : ""}` }, "")
    )
  );
  if (isShowcaseVariant(component)) {
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-progress-host xa-ext-progress-host--showcase"),
      row("Design", 87, "a", true, false) + row("Development", 64, "b", true, false) + row("Testing", 42, "c", true, false) + row("Deploy", 18, "d", true, false)
    );
  }
  const variant = progressVariant(component.get("variant") ?? component.get("progressFillVariant"));
  return tag2("div", attrsWithClass(attrs, "xa-ext-progress-host xa-ext-progress-host--single"), row(String(component.get("label") ?? component.get("progressLabel") ?? "Progress"), pct, variant, !isFalseLike(component.get("showText")), true, trackStyle));
}
function renderSpinner(component, attrs) {
  const kind = spinnerKind(component.get("variant") ?? component.get("spinnerType"));
  const rgb2 = spinnerRgb(component.get("color"));
  const graphic = spinnerGraphic(kind, component.get("size"));
  if (isShowcaseVariant(component)) {
    return tag2(
      "div",
      attrsWithClass(attrsWithAppendedStyle(attrs, `--xa-spin-rgb:${rgb2}`), "xa-ext-spinner-host xa-ext-spinner-host--showcase"),
      tag2(
        "div",
        { class: "spinners-row" },
        tag2("div", { class: "spinner-item" }, tag2("div", { class: "sp-ring sp-ring--sm" }, "") + tag2("span", { class: "spinner-label" }, "sm")) + tag2("div", { class: "spinner-item" }, tag2("div", { class: "sp-ring sp-ring--md" }, "") + tag2("span", { class: "spinner-label" }, "md")) + tag2("div", { class: "spinner-item" }, tag2("div", { class: "sp-ring sp-ring--lg" }, "") + tag2("span", { class: "spinner-label" }, "lg")) + tag2("div", { class: "spinner-item" }, spinnerGraphic("dots", "medium") + tag2("span", { class: "spinner-label" }, "dots")) + tag2("div", { class: "spinner-item" }, spinnerGraphic("pulse", "medium") + tag2("span", { class: "spinner-label" }, "pulse")) + tag2("div", { class: "spinner-item" }, spinnerGraphic("bars", "medium") + tag2("span", { class: "spinner-label" }, "bars"))
      )
    );
  }
  return tag2(
    "div",
    {
      ...attrsWithClass(attrsWithAppendedStyle(attrs, `--xa-spin-rgb:${rgb2};display:flex;align-items:center;justify-content:center`), "xa-ext-spinner-host"),
      "data-xa-spin-kind": kind
    },
    graphic + tag2("span", { class: "sr-only" }, "Loading")
  );
}
function renderRating(component, attrs) {
  const value = Math.max(0, Number(component.get("value") ?? component.get("rating") ?? 0) || 0);
  const max2 = Math.max(1, Number(component.get("max") ?? 5) || 5);
  const icons = ratingIcons(component);
  if (isShowcaseVariant(component)) {
    const suffix = showcaseIdSuffix(attrs, "rating");
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-rating-host xa-ext-rating-host--showcase"),
      tag2(
        "div",
        { class: "rating-wrap" },
        renderRatingRow({
          label: "Stars",
          inputClass: "stars-input",
          filled: "\u2605",
          empty: "\u2605",
          value: 0,
          max: 5,
          score: "\u2014",
          group: "stars",
          id: `starsInput_${suffix}`,
          scoreId: `starsScore_${suffix}`,
          interactive: true
        }) + renderRatingRow({
          label: "Hearts",
          inputClass: "hearts-input",
          filled: "\u2665",
          empty: "\u2665",
          value: 0,
          max: 5,
          score: "\u2014",
          group: "hearts",
          id: `heartsInput_${suffix}`,
          scoreId: `heartsScore_${suffix}`,
          interactive: true
        }) + tag2(
          "div",
          { class: "rating-row", style: "flex-direction:column;align-items:flex-start;gap:6px" },
          tag2("span", { class: "f-label" }, "Read-only \xB7 4.3") + tag2("div", { style: "display:flex;gap:3px" }, tag2("span", { style: "color:var(--yellow)" }, "\u2605\u2605\u2605\u2605") + tag2("span", { style: "color:var(--border2)" }, "\u2605") + tag2("span", { style: "font-size:12px;color:var(--ink-3);margin-left:6px" }, "(1,284 reviews)"))
        )
      )
    );
  }
  const readonly = isTruthy(component.get("readonly"));
  const showValue = isTruthy(component.get("showValue"));
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-rating-host xa-ext-rating-host--single"),
    tag2(
      "div",
      { class: "rating-wrap" },
      renderSingleRatingRow({
        value,
        max: max2,
        filled: icons.filled,
        empty: icons.empty,
        size: component.get("size"),
        showValue,
        interactive: !readonly
      })
    )
  );
}
function ratingIcons(component) {
  const icons = component.get("icons");
  if (isXconObject2(icons)) {
    return {
      filled: String(icons.get("filled") ?? component.get("icon") ?? "\u2B50"),
      empty: String(icons.get("empty") ?? component.get("emptyIcon") ?? "\u2606")
    };
  }
  return {
    filled: String(component.get("icon") ?? "\u2B50"),
    empty: String(component.get("emptyIcon") ?? "\u2606")
  };
}
function renderRatingRow(options) {
  const labels = Array.from({ length: options.max }, (_unused, index2) => {
    const active = index2 < options.value;
    return tag2(
      "label",
      {
        class: active ? "active" : void 0,
        "data-v": String(index2 + 1),
        "data-xcon-rating-star": options.interactive ? "" : void 0,
        role: options.interactive ? "button" : void 0,
        tabindex: options.interactive ? "0" : void 0
      },
      escapeHtml2(active ? options.filled : options.empty)
    );
  }).join("");
  const score = options.score ? tag2("span", { class: "rating-score", id: options.scoreId, "data-xcon-rating-score": options.interactive ? "" : void 0 }, escapeHtml2(options.score)) : "";
  return tag2(
    "div",
    { class: "rating-row" },
    tag2("span", { class: "rating-row__label" }, escapeHtml2(options.label)) + tag2("div", { class: options.inputClass, id: options.id, "data-xcon-rating-group": options.interactive ? options.group : void 0, "data-xcon-rating-value": String(options.value) }, labels) + score
  );
}
function ratingIconSize(value) {
  const size = String(value ?? "medium").trim().toLowerCase();
  if (size === "small" || size === "sm") return "16px";
  if (size === "large" || size === "lg") return "32px";
  return "24px";
}
function renderSingleRatingRow(options) {
  const iconSize = ratingIconSize(options.size);
  const labels = Array.from({ length: options.max }, (_unused, index2) => {
    const active = index2 < options.value;
    return tag2(
      "span",
      {
        class: "rating-star",
        "data-rating": String(index2 + 1),
        "data-v": String(index2 + 1),
        "data-xcon-rating-star": options.interactive ? "" : void 0,
        role: options.interactive ? "button" : void 0,
        tabindex: options.interactive ? "0" : void 0,
        style: `font-size:${iconSize};cursor:${options.interactive ? "pointer" : "default"};color:${active ? "#ffc107" : "#e9ecef"};transition:color .2s ease;`
      },
      escapeHtml2(active ? options.filled : options.empty)
    );
  }).join("");
  const ratingAttrs = {
    class: "rating-stars",
    "data-value": String(options.value),
    "data-xcon-rating-group": options.interactive ? "single" : void 0,
    "data-xcon-rating-value": options.interactive ? String(options.value) : void 0,
    style: "display:flex;align-items:center;gap:2px;"
  };
  const score = options.showValue ? tag2("span", { class: "rating-score", "data-xcon-rating-score": options.interactive ? "" : void 0 }, `${options.value}/${options.max}`) : "";
  return tag2(
    "div",
    { class: "rating-row" },
    tag2("span", { class: "rating-row__label" }, "Rating") + tag2("div", ratingAttrs, labels) + score
  );
}
function renderSearchBar(component, attrs) {
  const suffix = isShowcaseVariant(component) ? showcaseIdSuffix(attrs, "searchBar") : domIdFromAttrs(attrs);
  if (isShowcaseVariant(component)) {
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-search-bar-host xa-ext-search-bar-host--showcase"),
      renderSearchOuter({
        id: suffix,
        placeholder: "Search components\u2026",
        value: "",
        results: searchShowcaseRecentHtml(),
        showShortcut: true
      })
    );
  }
  return renderSingleSearchBar(component, attrs);
}
function renderSingleSearchBar(component, attrs) {
  const key = String(attrs["data-key"] ?? "root");
  const showSearchButton = !isFalseLike(component.get("showSearchButton"));
  const showClearButton = !isFalseLike(component.get("showClearButton"));
  const placeholder = String(component.get("placeholder") ?? "\uAC80\uC0C9\uC5B4\uB97C \uC785\uB825\uD558\uC138\uC694");
  const value = String(component.get("value") ?? "");
  const searchIcon = String(component.get("searchIcon") ?? "\u{1F50D}");
  const clearIcon = String(component.get("clearIcon") ?? "\xD7");
  const debounceDelay = Math.max(0, numberLike(component.get("debounceDelay")) ?? 300);
  const searchIconHtml = inlineIconOrText(searchIcon);
  const clearIconHtml = inlineIconOrText(clearIcon);
  const rightPadding = showSearchButton && showClearButton ? "80px" : showSearchButton || showClearButton ? "40px" : "12px";
  const input = voidTag("input", {
    type: "text",
    id: `${key}_input`,
    placeholder,
    value: value || void 0,
    "data-xcon-search-single-input": "",
    "data-xcon-search-debounce-delay": String(debounceDelay),
    style: `width:100%;height:100%;border:1px solid #ccc;border-radius:4px;padding:8px 12px;padding-right:${rightPadding};box-sizing:border-box;font-size:14px;`
  });
  const searchButton = showSearchButton ? tag2(
    "button",
    {
      type: "button",
      class: "search-button",
      "data-xcon-search-single-submit": "",
      style: `position:absolute;right:${showClearButton ? "40px" : "8px"};top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:#666;`
    },
    searchIconHtml
  ) : "";
  const clearButton = showClearButton ? tag2(
    "button",
    {
      type: "button",
      class: "clear-button",
      "data-xcon-search-single-clear": "",
      style: `position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;color:#999;display:${value ? "block" : "none"};`
    },
    clearIconHtml
  ) : "";
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-search-bar-host xa-ext-search-bar-host--single"),
    tag2("div", { class: "search-container", style: "position:relative;width:100%;height:100%;", "data-xcon-search-single": "" }, input + searchButton + clearButton)
  );
}
function inlineIconOrText(value) {
  return iconSvg(value, "none") || escapeHtml2(value);
}
function renderSearchOuter(options) {
  const inputId = `searchField_${options.id}`;
  const resultsId = `searchResults_${options.id}`;
  return tag2(
    "div",
    { class: "search-outer", id: `searchOuter_${options.id}`, "data-xcon-search": "" },
    tag2(
      "div",
      { class: "search-input-wrap" },
      tag2("span", { class: "search-icon" }, iconSvg("search", "none")) + voidTag("input", {
        class: "search-field",
        id: inputId,
        type: "search",
        autocomplete: "off",
        placeholder: options.placeholder,
        value: options.value,
        disabled: options.disabled ? "" : void 0,
        "data-xcon-search-field": resultsId
      }) + tag2("button", { type: "button", class: "search-clear", id: `searchClear_${options.id}`, "data-xcon-search-clear": inputId, "aria-label": "Clear" }, modalCloseIcon()) + (options.showShortcut ? tag2("span", { class: "search-kbd" }, "\u2318K") : "")
    ) + tag2("div", { class: "search-results", id: resultsId }, options.results)
  );
}
function searchShowcaseRecentHtml() {
  const recent = [
    ["\u2318", "Command menu", "Shortcut"],
    ["\u25E7", "Button", "Component"],
    ["Aa", "Typography", "Token"],
    ["\u25A3", "Card", "Component"]
  ];
  return tag2("div", { class: "search-recent-label" }, "Recent") + recent.map(([icon, label, type2]) => tag2("div", { class: "search-result-item" }, tag2("span", { class: "icon" }, escapeHtml2(icon)) + tag2("span", { class: "label" }, escapeHtml2(label)) + tag2("span", { class: "type" }, escapeHtml2(type2)))).join("");
}
function renderTreeView(component, attrs) {
  const nodes = isShowcaseVariant(component) ? showcaseTreeNodes() : normalizeTreeNodes(component.get("data") ?? component.get("items") ?? component.get("nodes"), !isFalseLike(component.get("showIcons")));
  const expanded = isShowcaseVariant(component) ? true : treeExpandedSet(component.get("expandedNodes"));
  const key = String(attrs["data-key"] ?? "treeView");
  const tree = tag2("div", { class: "tree", id: `${key}~treeMount`, "data-xcon-tree-view": "" }, renderTreeNodes(nodes, expanded, ""));
  if (isShowcaseVariant(component)) {
    return tag2("div", attrsWithClass(attrs, "xa-ext-treeview-host xa-ext-treeview-host--showcase"), tree);
  }
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-treeview-host xa-ext-treeview-host--single"),
    tag2("div", { class: "tree-container", style: "border:1px solid var(--border, #e9ecef);border-radius:4px;background-color:var(--surface, white);overflow-y:auto;max-height:280px;" }, tree)
  );
}
function showcaseTreeNodes() {
  return [
    {
      label: "src",
      icon: "\u{1F4C1}",
      children: [
        { label: "components", icon: "\u{1F4C1}", children: [{ label: "Button.tsx", icon: "\u{1F4C4}" }, { label: "Input.tsx", icon: "\u{1F4C4}" }, { label: "Modal.tsx", icon: "\u{1F4C4}" }] },
        { label: "pages", icon: "\u{1F4C1}", children: [{ label: "index.tsx", icon: "\u{1F4C4}" }, { label: "about.tsx", icon: "\u{1F4C4}" }] },
        { label: "utils", icon: "\u{1F4C1}", children: [{ label: "helpers.ts", icon: "\u{1F4C4}" }] }
      ]
    },
    { label: "public", icon: "\u{1F4C1}", children: [{ label: "favicon.ico", icon: "\u{1F5BC}\uFE0F" }] },
    { label: "package.json", icon: "\u{1F4C4}" },
    { label: "tsconfig.json", icon: "\u{1F4C4}" }
  ];
}
function normalizeTreeNodes(value, showIcons) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!isXconObject2(item)) {
      if (item && typeof item === "object" && !Array.isArray(item)) return normalizeTreeNodes([fromJSONObject2(item)], showIcons)[0] ?? null;
      return item === void 0 || item === null ? null : { label: String(item), icon: showIcons ? "\u{1F4C4}" : void 0 };
    }
    const rawChildren = item.get("children") ?? item.get("items");
    const children2 = normalizeTreeNodes(rawChildren, showIcons);
    const label = String(item.get("label") ?? item.get("name") ?? item.get("text") ?? "Node");
    const id2 = textValue(item.get("id") ?? item.get("key") ?? item.get("value"));
    const icon = showIcons ? String(item.get("icon") ?? (children2.length ? "\u{1F4C1}" : "\u{1F4C4}")) : void 0;
    return { id: id2, label, icon, children: children2.length ? children2 : void 0 };
  }).filter((node) => Boolean(node));
}
function treeExpandedSet(value) {
  if (!Array.isArray(value)) return /* @__PURE__ */ new Set();
  return new Set(value.map((item) => String(item)));
}
function renderTreeNodes(nodes, expanded, pathPrefix) {
  return nodes.map((node, index2) => {
    const path = pathPrefix ? `${pathPrefix}.${index2}` : String(index2);
    const hasChildren = Boolean(node.children?.length);
    const startOpen = hasChildren && (expanded === true || expanded.has(path) || (node.id ? expanded.has(node.id) : false));
    const rowClass = `tree-row${hasChildren ? ` has-children${startOpen ? " expanded" : ""}` : ""}`;
    const row = tag2(
      "div",
      { class: rowClass, "data-xcon-tree-row": "", "data-xcon-tree-path": path, "data-xcon-tree-id": node.id },
      '<svg class="tree-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' + tag2("span", { class: "tree-icon", "aria-hidden": "true" }, escapeHtml2(node.icon ?? "")) + tag2("span", { class: "tree-label" }, escapeHtml2(node.label))
    ) + (hasChildren ? tag2("div", { class: `tree-children${startOpen ? "" : " collapsed"}` }, renderTreeNodes(node.children ?? [], expanded, path)) : "");
    return tag2("div", { class: "tree-node" }, row);
  }).join("");
}
function renderGallery(component, attrs, context, depth, keyPath) {
  const images = isShowcaseVariant(component) ? showcaseGalleryImages() : normalizeGalleryImages(component.get("images") ?? component.get("items"));
  if (!isShowcaseVariant(component)) return renderSingleGallery(component, attrs, images, context);
  const suffix = showcaseIdSuffix(attrs, "gallery");
  const gridStyle2 = void 0;
  const grid = tag2(
    "div",
    { class: "gallery-grid", id: `galleryGrid_${suffix}`, "data-xcon-gallery-grid": "", style: gridStyle2 },
    images.map((image) => galleryItem(image, context)).join("")
  );
  const body = grid + tag2(
    "div",
    { class: "lightbox", id: `lightbox_${suffix}`, "data-xcon-gallery-lightbox": "" },
    voidTag("img", { id: `lightboxImg_${suffix}`, "data-xcon-gallery-lightbox-img": "", src: "", alt: "" }) + tag2(
      "button",
      { type: "button", class: "lightbox-close", id: `lightboxClose_${suffix}`, "aria-label": "Close", "data-xcon-gallery-close": "" },
      '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    )
  );
  return tag2(
    "div",
    { ...attrsWithClass(attrs, `xa-ext-gallery-host xa-ext-gallery-host--${isShowcaseVariant(component) ? "showcase" : "single"}`), "data-xcon-gallery": "" },
    body
  );
}
function renderSingleGallery(component, attrs, images, context) {
  const key = String(attrs["data-key"] ?? "gallery");
  const columns = Number(component.get("columns") ?? 3);
  const cols = Number.isFinite(columns) && columns > 0 ? columns : 3;
  const gap = cssSize(component.get("gap")) ?? "8px";
  const showCaption = !isFalseLike(component.get("showCaption"));
  const grid = tag2(
    "div",
    { class: "gallery-grid", "data-xcon-gallery-grid": "", style: `display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap};width:100%;height:100%;` },
    images.map((image, index2) => {
      const src = sanitizeUrl(image.src, context.options);
      const caption = image.caption ?? `\uC774\uBBF8\uC9C0 ${index2 + 1}`;
      return tag2(
        "div",
        {
          class: "gallery-item",
          style: "position:relative;cursor:pointer;border-radius:4px;overflow:hidden;background:#f8f9fa;",
          "data-xcon-gallery-single-item": String(index2)
        },
        (src ? voidTag("img", { src, alt: caption, style: "width:100%;height:200px;object-fit:cover;display:block;" }) : "") + (showCaption ? tag2(
          "div",
          { class: "gallery-caption", style: "position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent, rgba(0,0,0,0.7));color:white;padding:16px 12px 8px;font-size:14px;" },
          escapeHtml2(caption)
        ) : "")
      );
    }).join("")
  );
  const modal = tag2(
    "div",
    {
      id: `${key}_gallery_modal`,
      class: "gallery-modal",
      "data-xcon-gallery-single-modal": "",
      style: "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:none;z-index:1000;align-items:center;justify-content:center;"
    },
    tag2(
      "div",
      { class: "gallery-modal-content", style: "position:relative;max-width:90vw;max-height:90vh;" },
      voidTag("img", { id: `${key}_modal_image`, "data-xcon-gallery-single-image": "", style: "max-width:100%;max-height:100%;object-fit:contain;" }) + tag2("button", { type: "button", "data-xcon-gallery-single-close": "", style: "position:absolute;top:-40px;right:0;background:none;border:none;color:white;font-size:30px;cursor:pointer;" }, "\xD7") + tag2("button", { type: "button", "data-xcon-gallery-single-prev": "", style: "position:absolute;left:-60px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:white;font-size:24px;padding:12px;border-radius:50%;cursor:pointer;" }, "\u2039") + tag2("button", { type: "button", "data-xcon-gallery-single-next": "", style: "position:absolute;right:-60px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:white;font-size:24px;padding:12px;border-radius:50%;cursor:pointer;" }, "\u203A")
    )
  );
  return tag2(
    "div",
    { ...attrsWithClass(attrs, "xa-ext-gallery-host xa-ext-gallery-host--single"), "data-xcon-gallery": "", "data-xcon-gallery-single": "" },
    grid + modal
  );
}
function showcaseGalleryImages() {
  return [
    { src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=70" },
    { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70" },
    { src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=70" },
    { src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=70" },
    { src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70" }
  ];
}
function normalizeGalleryImages(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index2) => {
    if (isXconObject2(item)) {
      return {
        src: String(item.get("src") ?? item.get("image") ?? item.get("url") ?? ""),
        caption: textValue(item.get("caption") ?? item.get("alt") ?? item.get("label")) ?? `\uC774\uBBF8\uC9C0 ${index2 + 1}`
      };
    }
    return { src: String(item ?? ""), caption: `\uC774\uBBF8\uC9C0 ${index2 + 1}` };
  }).filter((image) => image.src);
}
function galleryItem(image, context) {
  const src = sanitizeUrl(image.src, context.options);
  const img = src ? voidTag("img", { src, alt: attr(image.caption ?? ""), loading: "lazy" }) : "";
  const caption = image.caption ? tag2("div", { class: "gallery-caption" }, escapeHtml2(image.caption)) : "";
  return tag2(
    "div",
    { class: "gallery-item" },
    img + caption + tag2(
      "div",
      { class: "gallery-item__overlay" },
      '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'
    )
  );
}
function renderQrCode(component, attrs) {
  const text = String(component.get("text") ?? component.get("value") ?? "https://example.com");
  const size = Math.max(64, Math.min(512, Number(component.get("size") ?? (isShowcaseVariant(component) ? 180 : 200)) || (isShowcaseVariant(component) ? 180 : 200)));
  const showText = !isFalseLike(component.get("showText"));
  const foreground = cssColor(component.get("foregroundColor") ?? component.get("color")) ?? "#000000";
  const background = cssColor(component.get("backgroundColor")) ?? "#ffffff";
  const ecc = String(component.get("errorCorrectionLevel") ?? component.get("ecc") ?? "M").toUpperCase();
  if (isShowcaseVariant(component)) {
    const suffix = showcaseIdSuffix(attrs, "qrCode");
    return tag2(
      "div",
      { ...attrsWithClass(attrs, "xa-ext-qr-code-host xa-ext-qr-code-host--showcase"), "data-xcon-qr-code": "" },
      tag2(
        "div",
        { class: "qr-wrap" },
        tag2("canvas", { class: "qr-canvas", id: `qrCanvas_${suffix}`, width: "180", height: "180", "data-xcon-qr-canvas": "", "data-xcon-qr-text": "https://xconviewer.dev" }, "") + tag2(
          "div",
          { class: "qr-input-row" },
          voidTag("input", { class: "f-input", id: `qrInput_${suffix}`, value: "https://xconviewer.dev", style: "font-size:12px", "data-xcon-qr-input": "" }) + tag2("button", { type: "button", class: "qr-gen-btn", id: `qrBtn_${suffix}`, "data-xcon-qr-generate": "" }, "Generate")
        )
      )
    );
  }
  return tag2(
    "div",
    {
      ...attrsWithClass(attrs, "xa-ext-qr-code-host xa-ext-qr-code-host--single"),
      "data-xcon-qr-code": "",
      "data-qr-opts": JSON.stringify({ text, size, ecc, fg: foreground, bg: background })
    },
    tag2(
      "div",
      { class: "qr-wrap qr-code-container" },
      tag2("canvas", {
        class: "qr-canvas",
        width: String(size),
        height: String(size),
        "data-xcon-qr-canvas": "",
        "data-xcon-qr-text": attr(text),
        "data-xcon-qr-foreground": foreground,
        "data-xcon-qr-background": background
      }, "") + (showText ? tag2("div", { class: "qr-text", style: "font-size:12px;color:#666;word-break:break-all;" }, escapeHtml2(text)) : "")
    )
  );
}
function renderBarcode(component, attrs) {
  const text = String(component.get("text") ?? component.get("value") ?? "1234567890");
  const displayText = barcodeDisplayText(text);
  const format = String(component.get("format") ?? "CODE128").toUpperCase();
  const barWidth = Math.max(1, Math.min(8, Number(component.get("width") ?? component.get("barWidth") ?? 2) || 2));
  const height = Math.max(40, Math.min(240, Number(component.get("height") ?? (isShowcaseVariant(component) ? 80 : 100)) || (isShowcaseVariant(component) ? 80 : 100)));
  const fontSize = Math.max(8, Math.min(32, Number(fontValue(component, "size") ?? component.get("fontSize") ?? 14) || 14));
  if (isShowcaseVariant(component)) {
    const suffix = showcaseIdSuffix(attrs, "barcode");
    return tag2(
      "div",
      { ...attrsWithClass(attrs, "xa-ext-barcode-host xa-ext-barcode-host--showcase"), "data-xcon-barcode": "" },
      tag2(
        "div",
        { class: "barcode-wrap" },
        tag2("canvas", { class: "barcode-canvas", id: `barcodeCanvas_${suffix}`, width: "280", height: "80", "data-xcon-barcode-canvas": "", "data-xcon-barcode-value": "880123456789" }, "") + tag2("p", { class: "barcode-text", id: `barcodeText_${suffix}`, "data-xcon-barcode-text": "" }, "8 8 0 1 2 3 4 5 6 7 8 9") + tag2(
          "div",
          { class: "qr-input-row" },
          voidTag("input", { class: "f-input", id: `barcodeInput_${suffix}`, value: "880123456789", maxlength: "13", style: "font-size:12px;font-family:'Syne Mono',monospace", "data-xcon-barcode-input": "" }) + tag2("button", { type: "button", class: "qr-gen-btn", id: `barcodeBtn_${suffix}`, "data-xcon-barcode-draw": "" }, "Draw")
        )
      )
    );
  }
  return tag2(
    "div",
    { ...attrsWithClass(attrs, "xa-ext-barcode-host xa-ext-barcode-host--single"), "data-xcon-barcode": "" },
    tag2(
      "div",
      { class: "barcode-wrap barcode-container" },
      tag2("canvas", {
        class: "barcode-canvas",
        width: "280",
        height: String(height),
        "data-xcon-barcode-canvas": "",
        "data-xcon-barcode-value": attr(text),
        "data-xcon-barcode-format": format,
        "data-xcon-barcode-bar-width": String(barWidth)
      }, "") + (isFalseLike(component.get("displayValue")) ? "" : tag2("p", { class: "barcode-text", "data-xcon-barcode-text": "", style: `font-size:${fontSize}px;` }, escapeHtml2(displayText)))
    )
  );
}
function barcodeDisplayText(value) {
  return value.replace(/\D/g, "").substring(0, 13).padStart(13, "0").split("").join(" ");
}
function renderTemplate(component, attrs, context, depth, keyPath) {
  const template = component.get("template") ?? component.get("content");
  if (isXconObject2(template)) return tag2("div", attrs, renderComponent(template, context, depth, { parentFlow: true }, `${keyPath}~template`));
  return tag2("div", attrs, escapeHtml2(String(template ?? "")));
}
function renderChatBubble(component, attrs, context) {
  const layoutType = String(component.get("layoutType") ?? component.get("_layout") ?? "").toLowerCase();
  const side = layoutType.includes("me") || isTruthy(component.get("mine")) || isTruthy(component.get("isMine")) ? "me" : "you";
  const name = String(component.get("name") ?? component.get("author") ?? component.get("sender") ?? "");
  const text = String(component.get("text") ?? component.get("message") ?? component.get("content") ?? "");
  const timestamp = String(component.get("timestamp") ?? component.get("time") ?? "");
  const image = component.get("image") ?? component.get("avatar") ?? component.get("src");
  return tag2("div", attrsWithClass(attrs, `xlist-chat-row xlist-chat-row--${side}`), renderChatRowContent({ name, text, timestamp, image, context }));
}
function renderMyCounter(component, attrs) {
  const value = component.get("value") ?? component.get("minValue") ?? component.get("min") ?? 0;
  const min2 = component.get("minValue") ?? component.get("min") ?? 0;
  const max2 = component.get("maxValue") ?? component.get("max") ?? 100;
  const step = component.get("step") ?? 1;
  const background = cssColor(component.get("backgroundColor") ?? component.get("bgColor")) ?? "var(--surface)";
  const color2 = cssColor(component.get("color")) ?? "var(--ink)";
  return tag2(
    "div",
    {
      ...attrsWithStyle(attrsWithClass(attrs, "xa-custom-counter"), `display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:10px 14px;border:1px solid var(--border2);border-radius:8px;background:${background};color:${color2};box-sizing:border-box`),
      "data-xcon-counter-min": attr(min2),
      "data-xcon-counter-max": attr(max2),
      "data-xcon-counter-step": attr(step)
    },
    tag2("button", { type: "button", class: "xa-custom-counter__btn", disabled: "" }, "-") + tag2("output", { class: "xa-custom-counter__value" }, escapeHtml2(String(value))) + tag2("button", { type: "button", class: "xa-custom-counter__btn", disabled: "" }, "+")
  );
}
function renderMyProgressBar(component, attrs) {
  const value = Number(component.get("value") ?? 0);
  const max2 = Number(component.get("max") ?? component.get("maxValue") ?? 100);
  const label = component.get("label") ?? component.get("title") ?? "Progress";
  const pct = max2 > 0 ? Math.max(0, Math.min(100, Math.round(value / max2 * 100))) : 0;
  const showPercentage = !isFalseLike(component.get("showPercentage"));
  const progressColor = cssColor(component.get("progressColor") ?? component.get("color")) ?? "var(--accent)";
  const className = `xa-custom-progress${isTruthy(component.get("animated")) ? " xa-custom-progress--animated" : ""}`;
  return tag2(
    "div",
    {
      ...attrsWithStyle(attrsWithClass(attrs, className), `--xcon-progress-color:${progressColor};display:flex;flex-direction:column;gap:8px;width:100%;box-sizing:border-box`),
      "data-xcon-progress-value": attr(value),
      "data-xcon-progress-max": attr(max2)
    },
    tag2(
      "div",
      { class: "xa-custom-progress__head" },
      renderOptional("span", label, "xa-custom-progress__label") + (showPercentage ? tag2("span", { class: "xa-custom-progress__percent" }, `${pct}%`) : "")
    ) + tag2("div", { class: "xa-custom-progress__track", style: "height:8px;border-radius:999px;background:var(--bg2);overflow:hidden" }, tag2("span", { class: "xa-custom-progress__fill", style: `display:block;width:${pct}%;height:100%;background:var(--xcon-progress-color);border-radius:inherit` }, "")) + tag2("progress", { value: attr(value), max: attr(max2), style: "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)" }, escapeHtml2(`${value}`))
  );
}
function renderMyCard(component, attrs, context) {
  const image = sanitizeUrl(component.get("imageUrl") ?? component.get("image") ?? component.get("src"), context.options);
  const showShadow = isTruthy(component.get("showShadow"));
  const clickable = isTruthy(component.get("clickable"));
  const classes = ["xa-custom-card", showShadow ? "xa-custom-card--shadow" : "", clickable ? "xa-custom-card--clickable" : ""].filter(Boolean).join(" ");
  return tag2(
    "article",
    {
      ...attrsWithStyle(attrsWithClass(attrs, classes), `${showShadow ? "box-shadow:var(--shadow-md);" : ""}border:1px solid var(--border);border-radius:10px;background:var(--surface);overflow:hidden;box-sizing:border-box`),
      role: clickable ? "button" : void 0,
      tabindex: clickable ? "0" : void 0
    },
    (image ? voidTag("img", { class: "xa-custom-card__image", src: image, alt: attr(component.get("title") ?? ""), style: "display:block;width:100%;height:160px;object-fit:cover" }) : "") + tag2(
      "div",
      { class: "xa-custom-card__body", style: "display:flex;flex-direction:column;gap:6px;padding:14px 16px" },
      renderOptional("h3", component.get("title"), "xa-custom-card__title") + renderOptional("p", component.get("subtitle"), "xa-custom-card__subtitle") + renderOptional("div", component.get("text") ?? component.get("content"), "xa-custom-card__content")
    )
  );
}
function renderMyToggleSwitch(component, attrs) {
  const checked = isTruthy(component.get("checked") ?? component.get("value"));
  const disabled = isTruthy(component.get("disabled")) || isFalseLike(component.get("enabled"));
  const input = voidTag("input", {
    type: "checkbox",
    role: "switch",
    class: "xa-custom-toggle-switch__input",
    checked: checked ? "" : void 0,
    disabled: disabled ? "" : void 0
  });
  return tag2(
    "label",
    {
      ...attrsWithClass(attrs, `xa-custom-toggle-switch${disabled ? " xa-custom-toggle-switch--disabled" : ""}`),
      "data-xcon-toggle-disabled": String(disabled)
    },
    input + tag2("span", { class: "xa-custom-toggle-switch__track" }, tag2("span", { class: "xa-custom-toggle-switch__thumb" }, "")) + tag2("span", { class: "xa-custom-toggle-switch__label" }, escapeHtml2(String(component.get("label") ?? component.get("text") ?? "")))
  );
}
function renderMyIconRail(component, attrs) {
  const items = component.get("items");
  const selectedId = String(component.get("selectedId") ?? "").trim();
  const railBg = cssColor(component.get("railBg") ?? component.get("backgroundColor")) ?? "var(--surface2)";
  const selectedBg = cssColor(component.get("selectedBg")) ?? "var(--ink)";
  const unselectedColor = cssColor(component.get("unselectedColor")) ?? "var(--ink-2)";
  const iconSize = cssSize(component.get("iconSize")) ?? "20px";
  const labelFontSize = cssSize(component.get("labelFontSize")) ?? "10px";
  const gap = cssSize(component.get("itemGap")) ?? "6px";
  const railWidth = cssSize(component.get("railWidth")) ?? "112px";
  const maxHeight = cssSize(component.get("maxHeight"));
  const body = Array.isArray(items) ? items.map((item) => {
    const railItem = myIconRailItem(item);
    const selected = railItem.id !== "" && railItem.id === selectedId;
    return tag2(
      "div",
      {
        class: `xa-custom-icon-rail__item${selected ? " xa-custom-icon-rail__item--selected" : ""}`,
        "data-xcon-icon-rail-id": railItem.id || void 0,
        "aria-current": selected ? "true" : void 0,
        style: `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:64px;border-radius:12px;color:${selected ? "#fff" : unselectedColor};background:${selected ? selectedBg : "transparent"};font-size:${labelFontSize}`
      },
      tag2("span", { class: "xa-custom-icon-rail__icon", style: `font-size:${iconSize};line-height:1` }, escapeHtml2(railItem.icon)) + tag2("span", { class: "xa-custom-icon-rail__label" }, escapeHtml2(railItem.label))
    );
  }).join("") : "";
  return tag2(
    "nav",
    {
      ...attrsWithStyle(attrsWithClass(attrs, "xa-custom-icon-rail"), `display:flex;flex-direction:column;gap:${gap};width:${railWidth};max-width:100%;${maxHeight ? `max-height:${maxHeight};overflow:auto;` : ""}padding:8px;background:${railBg};border-radius:18px;box-sizing:border-box`),
      "data-xcon-selected-id": selectedId || void 0
    },
    body
  );
}
function renderMyThemeAccentPanel(component, attrs) {
  const theme = String(component.get("theme") ?? "light").toLowerCase() === "dark" ? "dark" : "light";
  const accent = String(component.get("accent") ?? component.get("accentColor") ?? "#C4622D");
  const presets = ["#C4622D", "#7C6AF7", "#2D7D4F", "#2B5FA0", "#C03A2B", "#B07D12", "#0D9488", "#DB2777"];
  return tag2(
    "section",
    attrsWithClass(attrs, "xa-theme-accent-panel"),
    tag2(
      "div",
      { class: "theme-toolbar" },
      tag2("div", { class: "theme-toolbar__label" }, "Theme") + tag2(
        "div",
        { class: "theme-switch", role: "group", "aria-label": "\uC0C9 \uD14C\uB9C8 \uC120\uD0DD" },
        tag2("button", { type: "button", class: `theme-switch__btn${theme === "light" ? " active" : ""}`, "data-theme": "light" }, "Light") + tag2("button", { type: "button", class: `theme-switch__btn${theme === "dark" ? " active" : ""}`, "data-theme": "dark" }, "Dark")
      )
    ) + tag2(
      "div",
      { class: "theme-accent-block" },
      tag2("div", { class: "theme-toolbar__label" }, "Accent") + tag2(
        "div",
        { class: "theme-accent-row" },
        voidTag("input", { type: "color", class: "theme-accent-swatch", value: accent, "aria-label": "\uC561\uC13C\uD2B8 \uC0C9" }) + voidTag("input", { type: "text", class: "theme-accent-hex", maxlength: "7", spellcheck: "false", placeholder: "#RRGGBB", autocomplete: "off", value: accent }) + tag2("button", { type: "button", class: "theme-accent-reset" }, "\uAE30\uBCF8\uAC12")
      ) + tag2(
        "div",
        { class: "theme-accent-presets", role: "group", "aria-label": "\uC561\uC13C\uD2B8 \uD504\uB9AC\uC14B" },
        presets.map((hex2) => tag2("button", { type: "button", class: "theme-preset-dot", "data-hex": hex2, style: `background:${hex2}`, title: hex2, "aria-label": hex2 }, "")).join("")
      )
    )
  );
}
function myIconRailItem(item) {
  if (isXconObject2(item)) {
    const id2 = String(item.get("id") ?? item.get("value") ?? item.get("name") ?? item.get("label") ?? "").trim();
    const label = String(item.get("name") ?? item.get("label") ?? item.get("text") ?? id2).trim();
    const icon = String(item.get("icon") ?? "").trim();
    return { id: id2, label, icon };
  }
  if (item && typeof item === "object") {
    const record = item;
    const id2 = String(record.id ?? record.value ?? record.name ?? record.label ?? "").trim();
    const label = String(record.name ?? record.label ?? record.text ?? id2).trim();
    const icon = String(record.icon ?? "").trim();
    return { id: id2, label, icon };
  }
  const text = String(item ?? "").trim();
  return { id: text, label: text, icon: "" };
}
function renderAdvancedChart(component, attrs) {
  const key = componentDomKey(attrs);
  const chartType = String(component.get("chartType") ?? component.get("variant") ?? "bar");
  const data = toPlainValue(component.get("chartData") ?? component.get("data") ?? {});
  const options = toPlainValue(component.get("chartOptions") ?? {});
  const responsive = booleanOption3(component.get("responsive"), true);
  const animation = booleanOption3(component.get("animation"), true);
  const rootAttrs = advancedAttrs(attrs, "xa-chart-container", key, "position:relative;background:white;border:1px solid #ddd;border-radius:4px;padding:10px;box-sizing:border-box;overflow:hidden");
  const canvas = tag2(
    "canvas",
    {
      id: `chart-${key}`,
      style: "width:100%;height:100%;",
      "data-xcon-chart-type": chartType,
      "data-xcon-chart-data": jsonAttr(data),
      "data-xcon-chart-options": jsonAttr(options),
      "data-xcon-chart-responsive": String(responsive),
      "data-xcon-chart-animation": String(animation)
    },
    ""
  );
  const loading = advancedLoading(`chart-loading-${key}`, "chart-loading", "\uCC28\uD2B8 \uB85C\uB529 \uC911...");
  return tag2("div", rootAttrs, canvas + renderStaticChartPreview(component, data, chartType) + loading);
}
function renderAdvancedCodeEditor(component, attrs) {
  const key = componentDomKey(attrs);
  const rootAttrs = advancedAttrs(attrs, "xa-code-editor-container", key, `position:relative;border:1px solid #ddd;border-radius:4px;overflow:hidden;box-sizing:border-box;${advancedMinHeight(component)}`);
  const textarea = tag2(
    "textarea",
    {
      id: `editor-${key}`,
      placeholder: attr(component.get("placeholder") ?? "\uCF54\uB4DC\uB97C \uC785\uB825\uD558\uC138\uC694..."),
      readonly: isTruthy(component.get("readOnly")) ? "" : void 0,
      spellcheck: "false",
      "data-xcon-code-mode": attr(component.get("mode") ?? "javascript"),
      "data-xcon-code-theme": attr(component.get("theme") ?? "default"),
      "data-xcon-code-line-numbers": String(booleanOption3(component.get("lineNumbers"), true)),
      style: "width:100%;height:100%;border:none;outline:none;resize:none;font-family:'Courier New',monospace;font-size:14px;padding:10px;box-sizing:border-box;"
    },
    escapeHtml2(String(component.get("value") ?? ""))
  );
  return tag2("div", rootAttrs, textarea + advancedLoading(`editor-loading-${key}`, "editor-loading", "\uC5D0\uB514\uD130 \uB85C\uB529 \uC911...", true));
}
function renderAdvancedRichEditor(component, attrs) {
  const key = componentDomKey(attrs);
  const rootAttrs = advancedAttrs(attrs, "xa-rich-editor-container", key, "position:relative;border:1px solid #ddd;border-radius:4px;background:white;box-sizing:border-box;overflow:hidden");
  const toolbar = isFalseLike(component.get("toolbar")) ? "" : tag2(
    "div",
    { class: "xa-rich-editor-toolbar", "aria-hidden": "true" },
    ["B", "I", "U", "H1", "\u2022", "1.", "\u2197"].map((label) => tag2("span", {}, escapeHtml2(label))).join("")
  );
  const content = component.get("value") ?? component.get("html") ?? component.get("content") ?? "";
  const placeholder = String(component.get("placeholder") ?? "\uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694...");
  const contentHtml = content === "" || content === void 0 || content === null ? tag2("div", { class: "xa-rich-editor-placeholder" }, escapeHtml2(placeholder)) : contextlessRichText(content);
  const body = tag2(
    "div",
    {
      id: `rich-editor-${key}`,
      class: "xa-rich-editor-surface",
      style: "height:100%;",
      "data-xcon-rich-theme": attr(component.get("theme") ?? "snow"),
      "data-xcon-rich-placeholder": placeholder,
      "data-xcon-rich-readonly": String(isTruthy(component.get("readOnly"))),
      "data-xcon-rich-modules": jsonAttr(toPlainValue(component.get("modules") ?? {}))
    },
    contentHtml
  );
  return tag2("div", rootAttrs, toolbar + body + advancedLoading(`rich-editor-loading-${key}`, "rich-editor-loading", "\uB9AC\uCE58 \uC5D0\uB514\uD130 \uB85C\uB529 \uC911..."));
}
function renderAdvancedDataViz(component, attrs) {
  const key = componentDomKey(attrs);
  const data = toPlainValue(component.get("data") ?? []);
  const vizType = String(component.get("vizType") ?? component.get("variant") ?? "bar");
  const config = toPlainValue(component.get("config") ?? {});
  const interactive = booleanOption3(component.get("interactive"), true);
  const rootAttrs = advancedAttrs(attrs, "xa-dataviz-container", key, "position:relative;border:1px solid #ddd;border-radius:4px;background:white;box-sizing:border-box;overflow:hidden");
  const preview = tag2(
    "div",
    {
      id: `dataviz-${key}`,
      style: "width:100%;height:100%;",
      "data-xcon-dataviz-type": vizType,
      "data-xcon-dataviz-data": jsonAttr(data),
      "data-xcon-dataviz-config": jsonAttr(config),
      "data-xcon-dataviz-interactive": String(interactive)
    },
    renderStaticDataViz(data, vizType, config)
  );
  return tag2("div", rootAttrs, preview + advancedLoading(`dataviz-loading-${key}`, "dataviz-loading", "\uB370\uC774\uD130 \uC2DC\uAC01\uD654 \uB85C\uB529 \uC911..."));
}
function renderAdvancedSpanGrid(component, attrs) {
  const key = componentDomKey(attrs);
  const data = spanGridData(component);
  const config = spanGridConfig(component, data);
  const merges = normalizeSpanGridMerges(config.merges);
  if (merges.length > 0) config.merges = merges.map(spanGridMergeSnapshot);
  const rootAttrs = {
    ...advancedAttrs(attrs, "xa-spangrid-container", key, "position:relative;overflow:hidden"),
    "data-xcon-spangrid": "",
    "data-xcon-spangrid-data": jsonAttr(data),
    "data-xcon-spangrid-options": jsonAttr(config)
  };
  const surface = tag2(
    "div",
    {
      id: `spangrid-${key}`,
      class: "xa-spangrid-surface",
      "data-xcon-spangrid-surface": "",
      "data-xcon-spangrid-scroll": "",
      role: "grid",
      "aria-readonly": "true",
      "aria-label": attr(component.get("ariaLabel") ?? component.get("label") ?? component.get("title") ?? "SpanGrid")
    },
    renderStaticSpanGrid(data, config)
  );
  return tag2("div", rootAttrs, surface + advancedLoading(`spangrid-loading-${key}`, "spangrid-loading", "SpanGrid loading...", true));
}
function renderAdvancedFlipbook(component, attrs, context) {
  const key = componentDomKey(attrs);
  const pages = Math.max(1, Number(component.get("pages") ?? 1) || 1);
  const pageWidth = Math.max(1, Number(component.get("pageWidth") ?? 600) || 600);
  const pageHeight = Math.max(1, Number(component.get("pageHeight") ?? 900) || 900);
  const showControls = !isFalseLike(component.get("showControls"));
  const showMiniatures = !isFalseLike(component.get("showMiniatures"));
  const rootAttrs = {
    ...advancedAttrs(attrs, "xa-flipbook-container", key, "position:relative;width:100%;height:100%;min-height:500px;display:flex;align-items:center;justify-content:center;background:#f8f9fa;overflow:hidden"),
    "data-xcon-flipbook-page-width": String(pageWidth),
    "data-xcon-flipbook-page-height": String(pageHeight)
  };
  const flipbookId = `flipbook-${key}`;
  const viewerId = `viewer-${key}`;
  const miniaturesId = `miniatures-${key}`;
  const pageStyle = `width:${pageWidth}px;height:${pageHeight}px;`;
  const pagesHtml = renderFlipbookPages(component, pages, context, pageStyle);
  const arrows = showControls ? tag2("a", { ignore: "1", class: "ui-arrow-control ui-arrow-next-page", "data-xcon-flipbook-next": "" }, "") + tag2("a", { ignore: "1", class: "ui-arrow-control ui-arrow-previous-page", "data-xcon-flipbook-prev": "" }, "") : "";
  const controls = showControls ? renderFlipbookControls(component, key, pages) : "";
  const miniatures = showMiniatures ? renderFlipbookMiniatures(component, key, miniaturesId, pages, context) : "";
  return tag2(
    "div",
    rootAttrs,
    tag2("div", { class: "catalog-app" }, tag2("div", { id: viewerId, class: "flipbook-viewer" }, tag2("div", { id: flipbookId, class: "ui-flipbook" }, pagesHtml + arrows)) + controls + miniatures)
  );
}
function renderAdvancedNetworkDiagram(component, attrs) {
  const key = componentDomKey(attrs);
  return renderNetworkStatic({ key, component, attrs: advancedAttrs(attrs, "", key, "") });
}
function renderAdvancedMap(component, attrs, context) {
  const key = componentDomKey(attrs);
  const mapBody = tag2(
    "div",
    { id: `map-${key}`, class: "xa-map", style: "width:100%;height:100%;border-radius:8px;" },
    renderStaticMap(component, context)
  );
  return tag2("div", advancedAttrs(attrs, "", key, ""), tag2("div", { class: "xa-map-container", style: "width:100%;height:100%;" }, mapBody + mapCalendarLoading(`map-loading-${key}`, "xa-map-loading", "\uC9C0\uB3C4 \uB85C\uB529 \uC911...")));
}
function renderAdvancedCalendar(component, attrs) {
  const key = componentDomKey(attrs);
  const calendarBody = tag2("div", { id: `calendar-${key}`, class: "xa-calendar", style: "width:100%;height:100%;" }, renderStaticCalendar(component));
  return tag2("div", advancedAttrs(attrs, "", key, ""), tag2("div", { class: "xa-calendar-container", style: "width:100%;height:100%;" }, calendarBody + mapCalendarLoading(`calendar-loading-${key}`, "xa-calendar-loading", "\uCE98\uB9B0\uB354 \uB85C\uB529 \uC911...")));
}
function advancedRootStyle(attrs, style) {
  if (!style) return style;
  const baseStyle = attrs.style ?? "";
  const protectedProps = /* @__PURE__ */ new Set();
  if (/\bposition\s*:/i.test(baseStyle)) protectedProps.add("position");
  if (/\bwidth\s*:/i.test(baseStyle)) protectedProps.add("width");
  if (/\bheight\s*:/i.test(baseStyle)) {
    protectedProps.add("height");
    protectedProps.add("min-height");
  }
  if (protectedProps.size === 0) return style;
  return style.split(";").map((part) => part.trim()).filter((part) => {
    if (!part) return false;
    const prop = part.split(":", 1)[0]?.trim().toLowerCase();
    return !protectedProps.has(prop);
  }).join(";");
}
function advancedAttrs(attrs, className, key, style) {
  const withClass = className ? attrsWithClass(attrs, className) : attrs;
  return { ...attrsWithAppendedStyle(withClass, advancedRootStyle(attrs, style)), "data-component-key": key };
}
function componentDomKey(attrs) {
  const raw = attrs["data-key"] ?? "root";
  const leaf = raw.split("~").pop() || raw;
  return leaf.replace(/[^a-zA-Z0-9_-]/g, "-");
}
function advancedMinHeight(component) {
  const pos = rectParts(component.get("pos"));
  return pos ? `min-height:${numberPx(pos[3])}` : "";
}
function advancedLoading(id2, className, text, elevated = false) {
  return tag2(
    "div",
    {
      id: id2,
      class: className,
      style: `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#666;font-size:14px;${elevated ? "z-index:1000;" : ""}display:none;`
    },
    text
  );
}
function mapCalendarLoading(id2, className, text) {
  return tag2(
    "div",
    { id: id2, class: className },
    tag2("div", { class: "spinner" }, "") + tag2("p", {}, text)
  );
}
function toPlainValue(value) {
  if (isXconObject2(value)) {
    const result = {};
    value.forEach((child, key) => {
      result[key] = toPlainValue(child);
    });
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => toPlainValue(item));
  return value;
}
function jsonAttr(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "null";
  }
}
function hasJsonData(value) {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) return plain.length > 0;
  if (plain && typeof plain === "object") return Object.keys(plain).length > 0;
  return plain !== void 0 && plain !== null && plain !== "";
}
function spanGridData(component) {
  const direct = toPlainValue(component.get("data") ?? component.get("cells"));
  if (Array.isArray(direct)) return normalizeSpanGridRows(direct);
  const snapshot = toPlainValue(component.get("snapshot") ?? component.get("grid"));
  const snapshotRows = spanGridSnapshotRows(snapshot);
  if (snapshotRows) return snapshotRows;
  const tabledata = toPlainValue(component.get("tabledata"));
  if (Array.isArray(tabledata)) return normalizeSpanGridRows(tabledata);
  const dataTemplate = toPlainValue(component.get("dataTemplate"));
  if (dataTemplate && typeof dataTemplate === "object" && !Array.isArray(dataTemplate)) {
    const template = dataTemplate.template;
    if (template && typeof template === "object" && !Array.isArray(template)) {
      const rows = template.tabledata;
      if (Array.isArray(rows)) return normalizeSpanGridRows(rows);
    }
  }
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    const rows = snapshot.data ?? snapshot.rows;
    if (Array.isArray(rows)) return normalizeSpanGridRows(rows);
  }
  return [];
}
function spanGridConfig(component, data) {
  const options = toPlainValue(component.get("config") ?? component.get("options"));
  const base = options && typeof options === "object" && !Array.isArray(options) ? options : {};
  const snapshot = toPlainValue(component.get("snapshot") ?? component.get("grid"));
  const snapshotRecord = objectRecord(snapshot);
  const pos = rectParts(component.get("pos"));
  const config = {
    readonly: true,
    ...base,
    data
  };
  if (pos) {
    config.width = pos[2];
    config.height = pos[3];
  }
  copySpanGridConfigValue(config, "columns", toPlainValue(component.get("columns") ?? component.get("cols") ?? snapshotRecord?.columns ?? snapshotRecord?.cols));
  copySpanGridConfigValue(config, "rows", toPlainValue(component.get("rows") ?? snapshotRecord?.rows));
  copySpanGridConfigValue(config, "snapshot", snapshot);
  copySpanGridConfigValue(config, "merges", toPlainValue(component.get("merges") ?? component.get("mergeCells") ?? component.get("spans") ?? snapshotRecord?.merges));
  copySpanGridConfigValue(config, "select", toPlainValue(component.get("select")));
  copySpanGridConfigValue(config, "fixed", toPlainValue(component.get("fixed") ?? snapshotRecord?.fixed));
  copySpanGridConfigValue(config, "fixedRows", component.get("fixedRows") ?? component.get("fixedRowCount"));
  copySpanGridConfigValue(config, "fixedColumns", component.get("fixedColumns") ?? component.get("fixedColumnCount"));
  copySpanGridConfigValue(config, "gridBorder", toPlainValue(component.get("gridBorder") ?? snapshotRecord?.gridBorder));
  copySpanGridConfigValue(config, "backgroundColor", component.get("backgroundColor") ?? component.get("bgColor") ?? component.get("bg") ?? snapshotRecord?.backgroundColor ?? snapshotRecord?.bgColor ?? snapshotRecord?.bg);
  copySpanGridConfigValue(config, "backColor", component.get("backColor") ?? snapshotRecord?.backColor);
  copySpanGridConfigValue(config, "zoom", component.get("zoom"));
  copySpanGridConfigValue(config, "scrollMode", component.get("scrollMode"));
  copySpanGridConfigValue(config, "reserveScrollbarInViewport", component.get("reserveScrollbarInViewport"));
  config.readonly = true;
  config.readOnly = true;
  return config;
}
function copySpanGridConfigValue(target, key, value) {
  if (value !== void 0 && value !== null && value !== "") target[key] = value;
}
function normalizeSpanGridRows(input) {
  if (input.length === 0) return [];
  const first = input[0];
  if (Array.isArray(first)) return input.map((row) => Array.isArray(row) ? row : [row]);
  const snapshotRows = spanGridSnapshotRows({ rows: input });
  if (snapshotRows) return snapshotRows;
  if (first && typeof first === "object") {
    const headers = Object.keys(first);
    return [
      headers,
      ...input.map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return headers.map(() => "");
        const record = row;
        return headers.map((header) => record[header]);
      })
    ];
  }
  return input.map((value) => [value]);
}
function spanGridSnapshotRows(snapshot) {
  const record = objectRecord(snapshot);
  const rows = record?.rows;
  if (!Array.isArray(rows)) return void 0;
  if (!rows.some((row) => objectRecord(row)?.cells && Array.isArray(objectRecord(row)?.cells))) return void 0;
  return rows.map((row) => {
    const rowRecord = objectRecord(row);
    const cells = rowRecord?.cells;
    return Array.isArray(cells) ? cells : [];
  });
}
function renderStaticSpanGrid(data, config = {}) {
  const rows = normalizeSpanGridRows(data).slice(0, 80);
  if (rows.length === 0) return tag2("div", { class: "xa-spangrid-empty" }, "No grid data");
  const gridBackground = config.backColor ?? config.backgroundColor ?? config.bgColor ?? config.bg;
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const normalized = rows.map((row) => Array.from({ length: columnCount }, (_, index2) => row[index2] ?? ""));
  const columnWidths = spanGridColumnPixelWidths(config, columnCount);
  const rowHeights = spanGridRowPixelHeights(config, rows.length);
  const columnOffsets = spanGridOffsets(columnWidths);
  const rowOffsets = spanGridOffsets(rowHeights);
  const tableWidth = spanGridTotalPixels(columnWidths);
  const tableHeight = spanGridTotalPixels(rowHeights);
  const fixed = normalizeSpanGridFixed(config, rows.length, columnCount);
  const merges = normalizeSpanGridMerges(config.merges).filter((merge) => {
    return merge.startRow < rows.length && merge.startCol < columnCount;
  });
  const mergeByStart = /* @__PURE__ */ new Map();
  const covered = /* @__PURE__ */ new Set();
  const occupied = /* @__PURE__ */ new Set();
  merges.forEach((rawMerge) => {
    const merge = {
      startRow: rawMerge.startRow,
      startCol: rawMerge.startCol,
      endRow: Math.min(rawMerge.endRow, rows.length - 1),
      endCol: Math.min(rawMerge.endCol, columnCount - 1)
    };
    if (merge.endRow <= merge.startRow && merge.endCol <= merge.startCol) return;
    const cells = [];
    for (let row = merge.startRow; row <= merge.endRow; row += 1) {
      for (let col = merge.startCol; col <= merge.endCol; col += 1) {
        cells.push(`${row}:${col}`);
      }
    }
    if (cells.some((cell) => occupied.has(cell))) return;
    cells.forEach((cell) => occupied.add(cell));
    mergeByStart.set(`${merge.startRow}:${merge.startCol}`, merge);
    cells.forEach((cell) => {
      if (cell !== `${merge.startRow}:${merge.startCol}`) covered.add(cell);
    });
  });
  const colgroup = renderStaticSpanGridColgroup(config, columnCount);
  const renderCell = (cell, rowIndex, colIndex, tagName) => {
    if (covered.has(`${rowIndex}:${colIndex}`)) return "";
    const merge = mergeByStart.get(`${rowIndex}:${colIndex}`);
    const attrs = tagName === "th" ? { scope: "col" } : {};
    const classes = [];
    const styles = [];
    const cellRecord = objectRecord(cell);
    const gridBorderColor = spanGridBorderColor(config);
    const inFixedRow = fixed.rows > 0 && rowIndex < fixed.rows;
    const inFixedColumn = fixed.columns > 0 && colIndex < fixed.columns;
    if (merge) {
      const rowSpan = merge.endRow - merge.startRow + 1;
      const colSpan = merge.endCol - merge.startCol + 1;
      if (rowSpan > 1) attrs.rowspan = String(rowSpan);
      if (colSpan > 1) attrs.colspan = String(colSpan);
    }
    if (inFixedRow || inFixedColumn) styles.push("position:sticky");
    if (inFixedRow) {
      classes.push("xa-spangrid-cell--fixed-row");
      styles.push(`top:${rowOffsets[rowIndex] ?? 0}px`);
    }
    if (inFixedColumn) {
      classes.push("xa-spangrid-cell--fixed-col");
      styles.push(`left:${columnOffsets[colIndex] ?? 0}px`);
    }
    if (inFixedRow && inFixedColumn) classes.push("xa-spangrid-cell--fixed-corner");
    if (classes.length > 0) attrs.class = classes.join(" ");
    if (styles.length > 0) {
      styles.push(`z-index:${inFixedRow && inFixedColumn ? 4 : inFixedRow ? 3 : 2}`);
    }
    if (rowHeights[rowIndex]) styles.push(`height:${rowHeights[rowIndex]}px`);
    if (gridBorderColor) styles.push(`border-color:${gridBorderColor}`);
    appendSpanGridCellStyle(styles, cellRecord, gridBackground);
    if (styles.length > 0) attrs.style = styles.join(";") + ";";
    return tag2(tagName, attrs, escapeHtml2(spanGridCellText(cell)));
  };
  const header = normalized[0] ?? [];
  const bodyRows = normalized.length > 1 ? normalized.slice(1) : normalized;
  const headerHtml = tag2("thead", {}, tag2("tr", {}, header.map((cell, index2) => renderCell(cell, 0, index2, "th")).join("")));
  const bodyHtml = tag2(
    "tbody",
    {},
    bodyRows.map((row, bodyIndex) => {
      const rowIndex = bodyIndex + 1;
      return tag2("tr", {}, row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex, "td")).join(""));
    }).join("")
  );
  const tableStyles = [];
  if (tableWidth > 0) tableStyles.push(`min-width:${tableWidth}px`);
  if (tableHeight > 0) tableStyles.push(`height:${tableHeight}px`);
  return tag2("table", { class: "xa-spangrid-table", style: tableStyles.length > 0 ? tableStyles.join(";") + ";" : void 0 }, colgroup + headerHtml + bodyHtml);
}
function normalizeSpanGridMerges(input) {
  if (!Array.isArray(input)) return [];
  const merges = [];
  input.forEach((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const record = raw;
    const start2 = objectRecord(record.start);
    const end = objectRecord(record.end);
    const startRow = toGridIndex(start2?.row ?? record.row ?? record.r ?? record.startRow ?? record.row1);
    const startCol = toGridIndex(start2?.col ?? start2?.column ?? record.col ?? record.c ?? record.startCol ?? record.col1);
    let endRow = toGridIndex(end?.row ?? record.endRow ?? record.row2);
    let endCol = toGridIndex(end?.col ?? end?.column ?? record.endCol ?? record.col2);
    const rowSpan = toGridIndex(record.rowspan ?? record.rowSpan ?? record.rs);
    const colSpan = toGridIndex(record.colspan ?? record.colSpan ?? record.cs);
    if (!Number.isInteger(endRow) && Number.isInteger(startRow) && Number.isInteger(rowSpan) && rowSpan > 0) {
      endRow = startRow + rowSpan - 1;
    }
    if (!Number.isInteger(endCol) && Number.isInteger(startCol) && Number.isInteger(colSpan) && colSpan > 0) {
      endCol = startCol + colSpan - 1;
    }
    if (![startRow, startCol, endRow, endCol].every(Number.isInteger)) return;
    const normalizedStartRow = Math.max(0, Math.min(startRow, endRow));
    const normalizedEndRow = Math.max(0, Math.max(startRow, endRow));
    const normalizedStartCol = Math.max(0, Math.min(startCol, endCol));
    const normalizedEndCol = Math.max(0, Math.max(startCol, endCol));
    merges.push({
      startRow: normalizedStartRow,
      startCol: normalizedStartCol,
      endRow: normalizedEndRow,
      endCol: normalizedEndCol
    });
  });
  return merges;
}
function spanGridMergeSnapshot(merge) {
  return {
    start: { row: merge.startRow, col: merge.startCol },
    end: { row: merge.endRow, col: merge.endCol }
  };
}
function objectRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function toGridIndex(value) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isInteger(number) && number >= 0 ? number : Number.NaN;
}
function renderStaticSpanGridColgroup(config, columnCount) {
  const source = Array.isArray(config.columns) ? config.columns : Array.isArray(config.cols) ? config.cols : void 0;
  if (!source) return "";
  const columns = source.slice(0, columnCount).map((column) => {
    const width = spanGridColumnWidth(column);
    return width ? voidTag("col", { style: `width:${width}` }) : voidTag("col", {});
  });
  if (columns.length === 0) return "";
  return tag2("colgroup", {}, columns.join(""));
}
function spanGridColumnPixelWidths(config, columnCount) {
  const source = Array.isArray(config.columns) ? config.columns : Array.isArray(config.cols) ? config.cols : [];
  return Array.from({ length: columnCount }, (_, index2) => {
    const column = source[index2];
    return positivePixelValue(objectRecord(column)?.width ?? objectRecord(column)?.w ?? objectRecord(column)?.size ?? column, 120);
  });
}
function spanGridRowPixelHeights(config, rowCount) {
  const source = Array.isArray(config.rows) ? config.rows : [];
  return Array.from({ length: rowCount }, (_, index2) => {
    const row = source[index2];
    return positivePixelValue(objectRecord(row)?.height ?? objectRecord(row)?.h ?? objectRecord(row)?.size ?? row, index2 === 0 ? 32 : 40);
  });
}
function spanGridOffsets(values) {
  const offsets = [];
  let cursor = 0;
  values.forEach((value, index2) => {
    offsets[index2] = cursor;
    cursor += Math.max(0, value);
  });
  return offsets;
}
function spanGridTotalPixels(values) {
  return values.reduce((sum, value) => sum + Math.max(0, value), 0);
}
function appendSpanGridCellStyle(styles, cell, fallbackBackground) {
  if (!cell) return;
  const background = safeCssValue2(cssColor(cell.backColor ?? cell.backgroundColor ?? cell.bg ?? fallbackBackground));
  const foreground = safeCssValue2(cssColor(cell.foreColor ?? cell.color ?? cell.fg));
  const font = safeCssValue2(cell.font);
  const alignment = spanGridTextAlignment(cell.textAlign ?? cell.align ?? cell.alignment);
  if (background) styles.push(`background-color:${background}`);
  if (foreground) styles.push(`color:${foreground}`);
  if (font) styles.push(`font:${font}`);
  if (alignment.textAlign) styles.push(`text-align:${alignment.textAlign}`);
  if (alignment.verticalAlign) styles.push(`vertical-align:${alignment.verticalAlign}`);
}
function spanGridBorderColor(config) {
  const border = objectRecord(config.gridBorder);
  return safeCssValue2(cssColor(border?.leftColor ?? border?.topColor ?? border?.rightColor ?? border?.bottomColor ?? border?.color ?? config.borderColor));
}
function spanGridTextAlignment(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return {};
  let textAlign;
  let verticalAlign2;
  if (text.includes("left") || text === "start") textAlign = "left";
  else if (text.includes("right") || text === "end") textAlign = "right";
  else if (text.includes("center") || text.includes("centre")) textAlign = "center";
  if (text.includes("top")) verticalAlign2 = "top";
  else if (text.includes("bottom")) verticalAlign2 = "bottom";
  else if (text.includes("middle") || text.includes("center") || text.includes("centre")) verticalAlign2 = "middle";
  return { textAlign, verticalAlign: verticalAlign2 };
}
function normalizeSpanGridFixed(config, rowCount, columnCount) {
  const fixed = objectRecord(config.fixed);
  const rowIndex = fixed ? gridCountValue(fixed.rowIndex ?? fixed.row ?? fixed.r) : Number.NaN;
  const columnIndex = fixed ? gridCountValue(fixed.columnIndex ?? fixed.colIndex ?? fixed.column ?? fixed.col ?? fixed.c) : Number.NaN;
  const rows = gridCountValue(config.fixedRows ?? config.fixedRowCount ?? fixed?.rows ?? fixed?.rowCount ?? fixed?.topRows);
  const columns = gridCountValue(config.fixedColumns ?? config.fixedColumnCount ?? fixed?.columns ?? fixed?.columnCount ?? fixed?.cols ?? fixed?.colCount ?? fixed?.leftColumns);
  return {
    rows: clampGridCount(Number.isInteger(rows) ? rows : Number.isInteger(rowIndex) ? rowIndex + 1 : 0, rowCount),
    columns: clampGridCount(Number.isInteger(columns) ? columns : Number.isInteger(columnIndex) ? columnIndex + 1 : 0, columnCount)
  };
}
function positivePixelValue(value, fallback) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : fallback;
  const text = String(value ?? "").trim();
  const match = /^(\d+(?:\.\d+)?)(?:px)?$/i.exec(text);
  if (!match) return fallback;
  const number = Number(match[1]);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
function gridCountValue(value) {
  if (value === void 0 || value === null || value === "") return Number.NaN;
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isInteger(number) && number >= 0 ? number : Number.NaN;
}
function clampGridCount(value, max2) {
  return Math.max(0, Math.min(value, Math.max(0, max2)));
}
function spanGridColumnWidth(column) {
  if (typeof column === "number" || typeof column === "string") return cssSize(column);
  if (!column || typeof column !== "object" || Array.isArray(column)) return void 0;
  const record = column;
  return cssSize(record.width ?? record.w ?? record.size);
}
function spanGridCellText(value) {
  if (value === void 0 || value === null) return "";
  const record = objectRecord(value);
  if (record) {
    const text = record.text ?? record.value ?? record.label ?? record.name;
    if (text !== void 0 && text !== null) return String(text);
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
function contextlessRichText(value) {
  if (value === void 0 || value === null || value === "") return "";
  return linesToBreaks(String(value));
}
function chartRows(data) {
  const plain = toPlainValue(data);
  if (Array.isArray(plain)) {
    return plain.map((item, index2) => chartRowFromSimpleValue(item, index2)).filter((row) => Boolean(row));
  }
  if (!plain || typeof plain !== "object") return [];
  const obj = plain;
  const labels = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  const datasets = Array.isArray(obj.datasets) ? obj.datasets : [];
  const first = datasets[0] && typeof datasets[0] === "object" ? datasets[0] : void 0;
  const values = Array.isArray(first?.data) ? first.data.map(Number) : [];
  return values.map((value, index2) => ({
    label: labels[index2] ?? String(index2 + 1),
    value: Number.isFinite(value) ? value : 0,
    color: chartPreviewColor(first?.backgroundColor ?? first?.borderColor, index2)
  }));
}
function chartRowFromSimpleValue(item, index2) {
  const plain = toPlainValue(item);
  if (plain && typeof plain === "object" && !Array.isArray(plain)) {
    const record = plain;
    return {
      label: String(record.label ?? record.name ?? record.title ?? index2 + 1),
      value: finiteNumber(record.value ?? record.y ?? record.count ?? record.amount ?? record.data, 0),
      color: cssColor(record.color ?? record.backgroundColor ?? record.borderColor)
    };
  }
  if (plain === void 0 || plain === null || plain === "") return void 0;
  return {
    label: String(index2 + 1),
    value: finiteNumber(plain, 0)
  };
}
var chartPreviewPalette = [
  "var(--xcon-chart-accent, var(--accent, #2563eb))",
  "var(--xcon-chart-blue, var(--blue, #0ea5e9))",
  "var(--xcon-chart-green, var(--green, #22c55e))",
  "var(--xcon-chart-yellow, var(--yellow, #f59e0b))",
  "var(--xcon-chart-red, var(--red, #ef4444))",
  "#8B5CF6",
  "#0EA5E9",
  "#F97316"
];
function chartPreviewColor(value, index2) {
  if (Array.isArray(value)) return cssColor(value[index2] ?? value[0]) ?? chartPreviewPalette[index2 % chartPreviewPalette.length];
  return cssColor(value) ?? chartPreviewPalette[index2 % chartPreviewPalette.length];
}
function chartSeriesRows(data) {
  const plain = toPlainValue(data);
  if (!plain || typeof plain !== "object" || Array.isArray(plain)) return [];
  const obj = plain;
  const labels = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  const datasets = Array.isArray(obj.datasets) ? obj.datasets : [];
  return datasets.map((dataset, datasetIndex) => {
    const record = toPlainValue(dataset);
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    const source = record;
    const values = Array.isArray(source.data) ? source.data.map(Number) : [];
    const rows = values.map((value, index2) => ({
      label: labels[index2] ?? String(index2 + 1),
      value: Number.isFinite(value) ? value : 0
    }));
    if (rows.length === 0) return null;
    return {
      label: String(source.label ?? `Series ${datasetIndex + 1}`),
      rows,
      color: chartPreviewColor(source.borderColor ?? source.backgroundColor, datasetIndex)
    };
  }).filter((series) => Boolean(series));
}
function chartPointRows(data) {
  const plain = toPlainValue(data);
  if (!plain || typeof plain !== "object" || Array.isArray(plain)) return [];
  const obj = plain;
  const labels = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  const datasets = Array.isArray(obj.datasets) ? obj.datasets : [];
  const first = datasets[0] && typeof datasets[0] === "object" ? datasets[0] : void 0;
  const values = Array.isArray(first?.data) ? first.data : [];
  return values.map((value, index2) => {
    const point = toPlainValue(value);
    if (point && typeof point === "object" && !Array.isArray(point)) {
      const record = point;
      return {
        label: labels[index2] ?? String(record.label ?? record.name ?? index2 + 1),
        x: finiteNumber(record.x, index2 + 1),
        y: finiteNumber(record.y ?? record.value, 0),
        r: Math.max(3, Math.min(22, finiteNumber(record.r ?? record.radius ?? record.size, 7)))
      };
    }
    const numeric = finiteNumber(value, 0);
    return {
      label: labels[index2] ?? String(index2 + 1),
      x: index2 + 1,
      y: numeric,
      r: Math.max(4, Math.min(18, Math.sqrt(Math.abs(numeric) || 1) + 3))
    };
  }).filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y) && Number.isFinite(row.r));
}
function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function chartTypeKey(chartType) {
  return String(chartType ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}
function renderStaticChartPreview(component, data, chartType) {
  const rows = chartRows(data);
  const type2 = chartTypeKey(chartType);
  if (type2 === "scatter" || type2 === "bubble") {
    const points = chartPointRows(data);
    if (points.length === 0) return rows.length === 0 ? "" : renderPointPreview(rows.map((row, index2) => ({ label: row.label, x: index2 + 1, y: row.value, r: 7 })), "xa-chart-preview", type2 === "bubble");
    return renderPointPreview(points, "xa-chart-preview", type2 === "bubble");
  }
  if (rows.length === 0) return "";
  if (type2 === "pie") return renderPiePreview(rows, "xa-chart-preview");
  if (type2 === "doughnut") return renderDoughnutPreview(rows, "xa-chart-preview");
  if (type2 === "line") {
    const series = chartSeriesRows(data);
    return series.length > 0 ? renderLineSeriesPreview(series, "xa-chart-preview") : renderLinePreview(rows, "xa-chart-preview");
  }
  if (type2 === "radar") return renderRadarPreview(rows, "xa-chart-preview");
  if (type2 === "polararea") return renderPolarAreaPreview(rows, "xa-chart-preview");
  return renderBarPreview(rows, "xa-chart-preview");
}
function renderStaticDataViz(data, vizType, config = {}) {
  const type2 = chartTypeKey(vizType);
  if (type2 === "treemap") return renderTreemapPreview(dataVizRows(data), "xa-dataviz-preview");
  if (type2 === "sunburst") return renderSunburstPreview(dataVizRows(data), "xa-dataviz-preview");
  if (type2 === "forcegraph" || type2 === "force") return renderForceGraphPreview(data, "xa-dataviz-preview");
  if (type2 === "scatter" || type2 === "bubble") {
    const points = chartPointRows(data);
    if (points.length > 0) return renderPointPreview(points, "xa-dataviz-preview", type2 === "bubble");
  }
  const rows = chartRows(data);
  if (rows.length === 0) return tag2("div", { class: "xa-dataviz-empty" }, "No data");
  if (type2 === "pie") return renderPiePreview(rows, "xa-dataviz-preview");
  if (type2 === "doughnut") return renderDoughnutPreview(rows, "xa-dataviz-preview");
  if (type2 === "line") {
    const series = chartSeriesRows(data);
    return series.length > 0 ? renderLineSeriesPreview(series, "xa-dataviz-preview") : renderLinePreview(rows, "xa-dataviz-preview");
  }
  if (type2 === "radar") return renderRadarPreview(rows, "xa-dataviz-preview");
  if (type2 === "polararea") return renderPolarAreaPreview(rows, "xa-dataviz-preview");
  const preferred = objectRecord(config)?.type ?? objectRecord(config)?.fallbackType;
  if (preferred && chartTypeKey(String(preferred)) === "line") return renderLinePreview(rows, "xa-dataviz-preview");
  return renderBarPreview(rows, "xa-dataviz-preview");
}
function dataVizRows(data) {
  const rows = [];
  const visit = (value, index2) => {
    const plain = toPlainValue(value);
    if (Array.isArray(plain)) {
      plain.forEach((item, childIndex) => visit(item, childIndex));
      return;
    }
    const record = objectRecord(plain);
    if (!record) {
      const numeric = finiteNumber(plain, Number.NaN);
      if (Number.isFinite(numeric)) rows.push({ label: String(index2 + 1), value: numeric });
      return;
    }
    const children2 = Array.isArray(record.children) ? record.children : Array.isArray(record.items) ? record.items : Array.isArray(record.nodes) ? record.nodes : void 0;
    if (children2 && children2.length > 0) {
      children2.forEach((item, childIndex) => visit(item, childIndex));
      return;
    }
    const valueNumber = finiteNumber(record.value ?? record.count ?? record.size ?? record.amount ?? record.weight, 1);
    rows.push({
      label: String(record.label ?? record.name ?? record.title ?? record.id ?? index2 + 1),
      value: Math.max(0, valueNumber),
      color: cssColor(record.color ?? record.backgroundColor ?? record.fill)
    });
  };
  visit(data, 0);
  return rows.filter((row) => row.label && Number.isFinite(row.value)).slice(0, 24);
}
function renderTreemapPreview(rows, className) {
  const visibleRows = rows.filter((row) => row.value > 0).slice(0, 10);
  if (visibleRows.length === 0) return tag2("div", { class: "xa-dataviz-empty" }, "No data");
  const total = Math.max(1, visibleRows.reduce((sum, row) => sum + row.value, 0));
  let x2 = 14;
  let y2 = 16;
  let rowHeight = 70;
  const rects = visibleRows.map((row, index2) => {
    const width = Math.max(48, Math.round(row.value / total * 470));
    if (x2 + width > 506) {
      x2 = 14;
      y2 += 82;
      rowHeight = 60;
    }
    const safeWidth = Math.min(width, 506 - x2);
    const rect = tag2("rect", {
      x: String(x2),
      y: String(y2),
      width: String(safeWidth),
      height: String(rowHeight),
      rx: "8",
      fill: row.color ?? chartPreviewPalette[index2 % chartPreviewPalette.length],
      opacity: "0.9"
    }, "") + tag2("text", { x: String(x2 + 12), y: String(y2 + 26), "font-size": "12", "font-weight": "700", fill: "#ffffff" }, escapeHtml2(row.label)) + tag2("text", { x: String(x2 + 12), y: String(y2 + 46), "font-size": "11", fill: "#ffffff", opacity: "0.85" }, escapeHtml2(trimNumber(row.value)));
    x2 += safeWidth + 8;
    return rect;
  }).join("");
  return tag2("svg", { class: `${className} ${className}--treemap`, viewBox: "0 0 520 190", preserveAspectRatio: "none", "aria-hidden": "true" }, rects);
}
function renderSunburstPreview(rows, className) {
  const visibleRows = rows.filter((row) => row.value > 0).slice(0, 10);
  if (visibleRows.length === 0) return tag2("div", { class: "xa-dataviz-empty" }, "No data");
  const total = Math.max(1, visibleRows.reduce((sum, row) => sum + row.value, 0));
  let current3 = -90;
  const slices = visibleRows.map((row, index2) => {
    const span = row.value / total * 360;
    const path = polarAreaPath(260, 95, 72, current3, current3 + span);
    const labelAngle = current3 + span / 2;
    const labelPoint = polarPoint(260, 95, 94, labelAngle);
    current3 += span;
    return tag2("path", {
      d: path,
      fill: row.color ?? chartPreviewPalette[index2 % chartPreviewPalette.length],
      stroke: "#ffffff",
      "stroke-width": "2"
    }, "") + tag2("text", { x: trimNumber(labelPoint.x), y: trimNumber(labelPoint.y), "font-size": "10", "text-anchor": "middle", fill: "#334155" }, escapeHtml2(row.label.slice(0, 10)));
  }).join("");
  const center = tag2("circle", { cx: "260", cy: "95", r: "34", fill: "#ffffff", stroke: "#e2e8f0" }, "") + tag2("text", { x: "260", y: "99", "font-size": "12", "font-weight": "700", "text-anchor": "middle", fill: "#0f172a" }, "Total");
  return tag2("svg", { class: `${className} ${className}--sunburst`, viewBox: "0 0 520 190", preserveAspectRatio: "none", "aria-hidden": "true" }, slices + center);
}
function renderForceGraphPreview(data, className) {
  const plain = toPlainValue(data);
  const record = objectRecord(plain);
  const rawNodes = Array.isArray(record?.nodes) ? record.nodes : dataVizRows(data).map((row) => ({ id: row.label, label: row.label, value: row.value, color: row.color }));
  const nodes = rawNodes.slice(0, 12).map((node, index2) => {
    const nodeRecord = objectRecord(toPlainValue(node)) ?? {};
    return {
      id: String(nodeRecord.id ?? nodeRecord.key ?? nodeRecord.name ?? nodeRecord.label ?? index2 + 1),
      label: String(nodeRecord.label ?? nodeRecord.name ?? nodeRecord.id ?? index2 + 1),
      color: cssColor(nodeRecord.color ?? nodeRecord.backgroundColor) ?? chartPreviewPalette[index2 % chartPreviewPalette.length]
    };
  });
  if (nodes.length === 0) return tag2("div", { class: "xa-dataviz-empty" }, "No data");
  const positions = /* @__PURE__ */ new Map();
  nodes.forEach((node, index2) => {
    const angle = Math.PI * 2 * index2 / Math.max(1, nodes.length);
    positions.set(node.id, { x: 260 + Math.cos(angle) * 170, y: 95 + Math.sin(angle) * 60 });
  });
  const rawLinks = Array.isArray(record?.links) ? record.links : Array.isArray(record?.edges) ? record.edges : [];
  const links = rawLinks.map((link) => {
    const linkRecord = objectRecord(toPlainValue(link)) ?? {};
    const source = String(linkRecord.source ?? linkRecord.from ?? "");
    const target = String(linkRecord.target ?? linkRecord.to ?? "");
    const a2 = positions.get(source);
    const b = positions.get(target);
    if (!a2 || !b) return "";
    return tag2("line", { x1: trimNumber(a2.x), y1: trimNumber(a2.y), x2: trimNumber(b.x), y2: trimNumber(b.y), stroke: "#94a3b8", "stroke-width": "2", opacity: "0.7" }, "");
  }).join("");
  const nodeHtml = nodes.map((node) => {
    const point = positions.get(node.id) ?? { x: 260, y: 95 };
    return tag2("circle", { cx: trimNumber(point.x), cy: trimNumber(point.y), r: "14", fill: node.color, stroke: "#ffffff", "stroke-width": "2" }, "") + tag2("text", { x: trimNumber(point.x), y: trimNumber(point.y + 30), "font-size": "10", "text-anchor": "middle", fill: "#334155" }, escapeHtml2(node.label.slice(0, 14)));
  }).join("");
  return tag2("svg", { class: `${className} ${className}--force-graph`, viewBox: "0 0 520 190", preserveAspectRatio: "none", "aria-hidden": "true" }, links + nodeHtml);
}
function renderBarPreview(rows, className) {
  const visibleRows = rows.slice(0, 12);
  const max2 = Math.max(1, ...visibleRows.map((row) => row.value));
  const min2 = Math.min(0, ...visibleRows.map((row) => row.value));
  const range = Math.max(1, max2 - min2);
  const baseline = 150 - (0 - min2) / range * 120;
  const bars = visibleRows.map((row, index2) => {
    const valueY = 150 - (row.value - min2) / range * 120;
    const height = Math.max(4, Math.round(Math.abs(baseline - valueY)));
    const x2 = 24 + index2 * 38;
    const y2 = Math.min(baseline, valueY);
    return tag2("rect", { x: String(x2), y: trimNumber(y2), width: "24", height: String(height), rx: "4", fill: row.color ?? chartPreviewPalette[index2 % chartPreviewPalette.length] }, "") + tag2("text", { x: String(x2 + 12), y: "168", "text-anchor": "middle", "font-size": "10", fill: "#666" }, escapeHtml2(row.label));
  }).join("");
  return tag2("svg", { class: className, viewBox: "0 0 520 190", preserveAspectRatio: "none", "aria-hidden": "true" }, tag2("line", { x1: "16", y1: trimNumber(baseline), x2: "500", y2: trimNumber(baseline), stroke: "#ddd" }, "") + bars);
}
function renderLinePreview(rows, className, color2 = chartPreviewPalette[0]) {
  return renderLineSeriesPreview([{ label: "Series 1", rows, color: color2 }], className);
}
function renderLineSeriesPreview(series, className) {
  const visibleSeries = series.filter((item) => item.rows.length > 0).slice(0, 6);
  const allRows = visibleSeries.flatMap((item) => item.rows);
  if (allRows.length === 0) return "";
  const max2 = Math.max(1, ...allRows.map((row) => row.value));
  const min2 = Math.min(0, ...allRows.map((row) => row.value));
  const range = Math.max(1, max2 - min2);
  const lines = visibleSeries.map((item) => {
    const rows = item.rows.slice(0, 12);
    const step = rows.length > 1 ? 460 / (rows.length - 1) : 0;
    const points = rows.map((row, index2) => `${30 + index2 * step},${150 - (row.value - min2) / range * 120}`).join(" ");
    const circles = points.split(" ").filter(Boolean).map((point) => {
      const [cx, cy] = point.split(",");
      return tag2("circle", { cx, cy, r: "4", fill: item.color }, "");
    }).join("");
    return tag2("polyline", { points, fill: "none", stroke: item.color, "stroke-width": "4", "stroke-linecap": "round", "stroke-linejoin": "round" }, "") + circles;
  }).join("");
  const labels = (visibleSeries[0]?.rows ?? []).slice(0, 12).map((row, index2) => {
    const step = (visibleSeries[0]?.rows.length ?? 0) > 1 ? 460 / ((visibleSeries[0]?.rows.length ?? 1) - 1) : 0;
    return tag2("text", { x: trimNumber(30 + index2 * step), y: "172", "text-anchor": "middle", "font-size": "10", fill: "#666" }, escapeHtml2(row.label));
  }).join("");
  return tag2("svg", { class: className, viewBox: "0 0 520 190", preserveAspectRatio: "none", "aria-hidden": "true" }, tag2("line", { x1: "16", y1: "150", x2: "500", y2: "150", stroke: "#ddd" }, "") + lines + labels);
}
function renderPiePreview(rows, className) {
  const total = Math.max(1, rows.reduce((sum, row) => sum + Math.max(0, row.value), 0));
  const values = rows.slice(0, 8);
  const colors = chartPreviewPalette;
  let angle = -Math.PI / 2;
  const slices = values.map((row, index2) => {
    const length = Math.max(0, row.value) / total * Math.PI * 2;
    const start2 = angle;
    const end = angle + length;
    angle = end;
    return tag2("path", {
      d: polarAreaPath(95, 95, 66, start2, end),
      fill: colors[index2 % colors.length],
      stroke: "#fff",
      "stroke-width": "2"
    }, "");
  }).join("");
  return tag2("svg", { class: `${className} ${className}--pie`, viewBox: "0 0 190 190", "aria-hidden": "true" }, tag2("circle", { cx: "95", cy: "95", r: "68", fill: "#f8fafc" }, "") + slices);
}
function renderDoughnutPreview(rows, className) {
  const total = Math.max(1, rows.reduce((sum, row) => sum + Math.max(0, row.value), 0));
  let offset = 25;
  const slices = rows.slice(0, 8).map((row, index2) => {
    const length = Math.max(0, row.value) / total * 100;
    const color2 = chartPreviewPalette[index2 % chartPreviewPalette.length];
    const slice = tag2("circle", { cx: "95", cy: "95", r: "58", fill: "none", stroke: color2, "stroke-width": "46", "stroke-dasharray": `${length} ${100 - length}`, "stroke-dashoffset": String(offset) }, "");
    offset -= length;
    return slice;
  }).join("");
  return tag2("svg", { class: `${className} ${className}--doughnut`, viewBox: "0 0 190 190", "aria-hidden": "true" }, tag2("circle", { cx: "95", cy: "95", r: "58", fill: "none", stroke: "#eee", "stroke-width": "46" }, "") + slices + tag2("circle", { cx: "95", cy: "95", r: "28", fill: "#fff" }, ""));
}
function renderRadarPreview(rows, className) {
  const values = rows.slice(0, 8);
  const max2 = Math.max(1, ...values.map((row) => Math.abs(row.value)));
  const center = 95;
  const radius = 66;
  const grid = [0.33, 0.66, 1].map(
    (scale) => tag2("polygon", { points: radarPoints(values.length, radius * scale, center), fill: "none", stroke: "#e5e7eb", "stroke-width": "1" }, "")
  ).join("");
  const axes = values.map((_, index2) => {
    const point = radarPoint(index2, values.length, radius, center);
    return tag2("line", { x1: String(center), y1: String(center), x2: trimNumber(point.x), y2: trimNumber(point.y), stroke: "#e5e7eb", "stroke-width": "1" }, "");
  }).join("");
  const dataPoints = values.map((row, index2) => {
    const point = radarPoint(index2, values.length, radius * Math.max(0, row.value) / max2, center);
    return `${trimNumber(point.x)},${trimNumber(point.y)}`;
  }).join(" ");
  const markers = dataPoints.split(" ").filter(Boolean).map((point) => {
    const [cx, cy] = point.split(",");
    return tag2("circle", { cx, cy, r: "3.5", fill: chartPreviewPalette[0] }, "");
  }).join("");
  const labels = values.map((row, index2) => {
    const point = radarPoint(index2, values.length, radius + 13, center);
    return tag2("text", { x: trimNumber(point.x), y: trimNumber(point.y + 3), "text-anchor": "middle", "font-size": "9", fill: "#64748b" }, escapeHtml2(row.label));
  }).join("");
  return tag2(
    "svg",
    { class: `${className} ${className}--radar`, viewBox: "0 0 190 190", "aria-hidden": "true" },
    grid + axes + tag2("polygon", { points: dataPoints, fill: "rgba(37,99,235,0.18)", stroke: chartPreviewPalette[0], "stroke-width": "3", "stroke-linejoin": "round" }, "") + markers + labels
  );
}
function radarPoints(count, radius, center) {
  return Array.from({ length: Math.max(3, count) }, (_, index2) => {
    const point = radarPoint(index2, Math.max(3, count), radius, center);
    return `${trimNumber(point.x)},${trimNumber(point.y)}`;
  }).join(" ");
}
function radarPoint(index2, count, radius, center) {
  const angle = -Math.PI / 2 + Math.PI * 2 * index2 / Math.max(3, count);
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius
  };
}
function renderPolarAreaPreview(rows, className) {
  const values = rows.slice(0, 8);
  const max2 = Math.max(1, ...values.map((row) => Math.max(0, row.value)));
  const center = 95;
  const startOffset = -Math.PI / 2;
  const step = Math.PI * 2 / Math.max(1, values.length);
  const colors = chartPreviewPalette;
  const slices = values.map((row, index2) => {
    const radius = 26 + Math.max(0, row.value) / max2 * 56;
    const start2 = startOffset + index2 * step + 0.02;
    const end = startOffset + (index2 + 1) * step - 0.02;
    return tag2("path", { d: polarAreaPath(center, center, radius, start2, end), fill: colors[index2 % colors.length], opacity: "0.9", stroke: "#fff", "stroke-width": "2" }, "");
  }).join("");
  return tag2("svg", { class: `${className} ${className}--polar-area`, viewBox: "0 0 190 190", "aria-hidden": "true" }, tag2("circle", { cx: String(center), cy: String(center), r: "82", fill: "#f8fafc" }, "") + slices + tag2("circle", { cx: String(center), cy: String(center), r: "4", fill: "#fff" }, ""));
}
function polarAreaPath(cx, cy, radius, startAngle, endAngle) {
  const start2 = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? "1" : "0";
  return `M ${trimNumber(cx)} ${trimNumber(cy)} L ${trimNumber(start2.x)} ${trimNumber(start2.y)} A ${trimNumber(radius)} ${trimNumber(radius)} 0 ${largeArc} 1 ${trimNumber(end.x)} ${trimNumber(end.y)} Z`;
}
function polarPoint(cx, cy, radius, angle) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius
  };
}
function renderPointPreview(points, className, bubble) {
  const visible = points.slice(0, 24);
  const xs = visible.map((point) => point.x);
  const ys = visible.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(1, ...ys);
  const dx = Math.max(1, maxX - minX);
  const dy = Math.max(1, maxY - minY);
  const colors = chartPreviewPalette;
  const circles = visible.map((point, index2) => {
    const cx = 36 + (point.x - minX) / dx * 440;
    const cy = 150 - (point.y - minY) / dy * 120;
    const radius = bubble ? point.r : 4.5;
    return tag2("circle", {
      cx: trimNumber(cx),
      cy: trimNumber(cy),
      r: trimNumber(radius),
      fill: colors[index2 % colors.length],
      opacity: bubble ? "0.72" : "0.9",
      stroke: "#fff",
      "stroke-width": bubble ? "2" : "1"
    }, "") + tag2("title", {}, escapeHtml2(`${point.label}: ${point.x}, ${point.y}`));
  }).join("");
  return tag2(
    "svg",
    { class: `${className} ${className}--${bubble ? "bubble" : "scatter"}`, viewBox: "0 0 520 190", preserveAspectRatio: "none", "aria-hidden": "true" },
    tag2("line", { x1: "24", y1: "150", x2: "500", y2: "150", stroke: "#ddd" }, "") + tag2("line", { x1: "32", y1: "22", x2: "32", y2: "154", stroke: "#ddd" }, "") + circles
  );
}
function renderFlipbookPages(component, pages, context, pageStyle = "") {
  const pageData = component.get("pageData");
  if (Array.isArray(pageData) && pageData.length > 0) {
    return pageData.map((pageInfo, index2) => tag2("div", { class: "page", "data-page": String(index2 + 1), style: pageStyle || void 0 }, renderFlipbookPageContent(pageInfo, context))).join("");
  }
  const folder = String(component.get("pageFolder") ?? "content/magazine").replace(/\/+$/g, "");
  return Array.from({ length: pages }, (_, index2) => {
    const page = index2 + 1;
    const src = sanitizeUrl(`${folder}/${page}.jpg`, context.options);
    const image = src ? voidTag("img", { src, alt: `Page ${page}` }) : tag2("div", { class: "flipbook-page-placeholder" }, `Page ${page}`);
    return tag2("div", { class: "page", "data-page": String(page), style: pageStyle || void 0 }, image);
  }).join("");
}
function renderFlipbookPageContent(pageInfo, context) {
  const plain = toPlainValue(pageInfo);
  if (!plain || typeof plain !== "object" || Array.isArray(plain)) return escapeHtml2(String(plain ?? ""));
  const page = plain;
  const type2 = String(page.type ?? "image");
  if (type2 === "html") return context.options.allowHtml ? sanitizeHtml(String(page.content ?? "")) : escapeHtml2(String(page.content ?? ""));
  if (type2 === "text") {
    return tag2("div", { style: "padding:20px;height:100%;overflow-y:auto;font-family:Arial,sans-serif;" }, renderOptional("h2", page.title) + renderOptional("p", page.content));
  }
  if (type2 === "mixed") {
    const src2 = sanitizeUrl(page.image, context.options);
    return tag2(
      "div",
      { style: "padding:20px;height:100%;display:flex;flex-direction:column;" },
      (src2 ? voidTag("img", { src: src2, alt: attr(page.title ?? ""), style: "width:100%;height:60%;object-fit:cover;margin-bottom:10px;" }) : "") + tag2("div", { style: "flex:1;overflow-y:auto;" }, renderOptional("h3", page.title) + renderOptional("p", page.content))
    );
  }
  const src = sanitizeUrl(page.src, context.options);
  return src ? voidTag("img", { src, alt: attr(page.alt ?? ""), style: "width:100%;height:100%;object-fit:cover;" }) : tag2("div", { class: "flipbook-page-placeholder" }, "Page content");
}
function renderFlipbookControls(component, key, pages) {
  const showMiniatures = !isFalseLike(component.get("showMiniatures"));
  const showZoom = !isFalseLike(component.get("showZoom"));
  const showFullscreen = !isFalseLike(component.get("showFullscreen"));
  return tag2(
    "div",
    { id: `controls-${key}`, class: "flipbook-controls" },
    tag2("button", { type: "button", class: "flipbook-control-btn", "data-xcon-flipbook-prev": "" }, "\u2039") + tag2("div", { class: "flipbook-page-info" }, tag2("span", { id: `current-page-${key}` }, "1") + " / " + tag2("span", { id: `total-pages-${key}` }, String(pages))) + tag2("button", { type: "button", class: "flipbook-control-btn", "data-xcon-flipbook-next": "" }, "\u203A") + (showMiniatures ? tag2("button", { type: "button", class: "flipbook-control-btn", "data-xcon-flipbook-miniatures": "" }, "\u229E") : "") + (showZoom ? tag2("button", { type: "button", class: "flipbook-control-btn", "data-xcon-flipbook-zoom": "" }, "\u2295") : "") + (showFullscreen ? tag2("button", { type: "button", class: "flipbook-control-btn", "data-xcon-flipbook-fullscreen": "" }, "\u26F6") : "")
  );
}
function renderFlipbookMiniatures(component, key, miniatureId, pages, context) {
  const pageData = component.get("pageData");
  const folder = String(component.get("pageFolder") ?? "content/magazine").replace(/\/+$/g, "");
  const items = Array.from({ length: pages }, (_, index2) => {
    const plain = Array.isArray(pageData) ? toPlainValue(pageData[index2]) : null;
    const thumb = plain && typeof plain === "object" && !Array.isArray(plain) ? plain.thumbnail : void 0;
    const src = sanitizeUrl(thumb ?? `${folder}/${index2 + 1}.jpg`, context.options);
    return tag2("button", { type: "button", class: "flipbook-miniature", "data-xcon-flipbook-page": String(index2 + 1) }, src ? voidTag("img", { src, alt: `Page ${index2 + 1}` }) : escapeHtml2(String(index2 + 1)));
  }).join("");
  return tag2("div", { id: miniatureId, class: "flipbook-miniatures", "data-xcon-flipbook-miniatures-list": key }, items);
}
function renderStaticMap(component, context) {
  const lat = Number(component.get("latitude") ?? 37.5665) || 37.5665;
  const lng = Number(component.get("longitude") ?? 126.978) || 126.978;
  const zoom = Number(component.get("zoom") ?? 10) || 10;
  const tileLayer = String(component.get("tileLayer") ?? "OpenStreetMap");
  const provider = String(component.get("provider") ?? component.get("mapProvider") ?? "").trim().toLowerCase();
  const liveLeaflet = provider === "leaflet" && context.options.allowExternalResources;
  const markers = parseArrayValue(component.get("markers")).slice(0, 20);
  const heatmap = parseArrayValue(component.get("heatmap")).slice(0, 200);
  const polylines = parseArrayValue(component.get("polylines")).slice(0, 50);
  const polygons = parseArrayValue(component.get("polygons")).slice(0, 50);
  const markerIcons = toPlainValue(component.get("markerIcons") ?? {});
  const rawSnapshot = component.get("snapshotUrl") ?? component.get("staticImage") ?? component.get("mapImage") ?? component.get("image") ?? component.get("src");
  const snapshotUrl = sanitizeUrl(stripCssUrl(String(rawSnapshot ?? "")), context.options);
  const snapshotAlt = String(component.get("snapshotAlt") ?? component.get("alt") ?? `Map centered at ${lat}, ${lng}`);
  const snapshotFit = mapSnapshotFit(component.get("snapshotFit") ?? component.get("objectFit"));
  const snapshotPosition = safeCssValue2(component.get("objectPosition") ?? component.get("snapshotPosition")) ?? "center";
  const attributionText = component.get("attribution") ?? (liveLeaflet ? openStreetMapAttribution : void 0);
  const layerHtml = snapshotUrl ? voidTag("img", {
    class: "xa-map-snapshot",
    src: snapshotUrl,
    alt: snapshotAlt,
    loading: "lazy",
    decoding: "async",
    style: `object-fit:${snapshotFit};object-position:${snapshotPosition};`
  }) + (attributionText ? tag2("span", { class: "xa-map-attribution" }, escapeHtml2(String(attributionText))) : "") : [
    tag2("span", { class: "xa-map-layer xa-map-water xa-map-water--river", "aria-hidden": "true" }, ""),
    tag2("span", { class: "xa-map-layer xa-map-park xa-map-park--north", "aria-hidden": "true" }, ""),
    tag2("span", { class: "xa-map-layer xa-map-park xa-map-park--south", "aria-hidden": "true" }, ""),
    tag2("span", { class: "xa-map-layer xa-map-road xa-map-road--main", "aria-hidden": "true" }, ""),
    tag2("span", { class: "xa-map-layer xa-map-road xa-map-road--cross", "aria-hidden": "true" }, ""),
    tag2("span", { class: "xa-map-layer xa-map-road xa-map-road--vertical", "aria-hidden": "true" }, ""),
    tag2("span", { class: "xa-map-layer xa-map-road xa-map-road--ring", "aria-hidden": "true" }, ""),
    tag2("span", { class: "xa-map-layer xa-map-label xa-map-label--north" }, "Park"),
    tag2("span", { class: "xa-map-layer xa-map-label xa-map-label--center" }, escapeHtml2(tileLayer)),
    tag2("span", { class: "xa-map-layer xa-map-label xa-map-label--south" }, "District"),
    tag2("span", { class: "xa-map-attribution" }, "static map preview")
  ].join("");
  const markerHtml = markers.length ? markers.map((marker, index2) => {
    const plain = toPlainValue(marker);
    const obj = plain && typeof plain === "object" && !Array.isArray(plain) ? plain : {};
    const label = String(obj.title ?? obj.label ?? obj.popup ?? index2 + 1);
    const markerLat = Number(obj.lat ?? obj.latitude);
    const markerLng = Number(obj.lng ?? obj.longitude);
    const left = Number.isFinite(markerLng) ? Math.max(8, Math.min(92, 50 + (markerLng - lng) * 900)) : 20 + index2 % 5 * 15;
    const top = Number.isFinite(markerLat) ? Math.max(8, Math.min(92, 50 - (markerLat - lat) * 900)) : 25 + Math.floor(index2 / 5) * 14;
    return tag2("span", { class: "xa-map-marker", title: label, style: `left:${left}%;top:${top}%;` }, escapeHtml2(label.slice(0, 2)));
  }).join("") : tag2("span", { class: "xa-map-marker", style: "left:50%;top:50%;" }, "\u25CF");
  return tag2(
    "div",
    {
      class: `xa-map-static${snapshotUrl ? " xa-map-static--snapshot" : ""}${liveLeaflet ? " xa-map-static--leaflet" : ""}`,
      "data-latitude": String(lat),
      "data-longitude": String(lng),
      "data-zoom": String(zoom),
      "data-tile-layer": tileLayer,
      "data-xcon-leaflet-map": liveLeaflet ? "" : void 0,
      "data-xcon-map-provider": liveLeaflet ? "leaflet" : void 0,
      "data-xcon-map-tile-url": liveLeaflet ? leafletTileUrl(component, context) : void 0,
      "data-xcon-map-attribution": liveLeaflet ? String(attributionText ?? openStreetMapAttribution) : void 0,
      "data-xcon-map-markers": liveLeaflet ? jsonAttr(markers.map(mapMarkerData)) : void 0,
      "data-xcon-map-heatmap": liveLeaflet && heatmap.length ? jsonAttr(heatmap) : void 0,
      "data-xcon-map-polylines": liveLeaflet && polylines.length ? jsonAttr(polylines) : void 0,
      "data-xcon-map-polygons": liveLeaflet && polygons.length ? jsonAttr(polygons) : void 0,
      "data-xcon-map-clustering": liveLeaflet ? String(booleanOption3(component.get("clustering"), false)) : void 0,
      "data-xcon-map-marker-icons": liveLeaflet && hasJsonData(markerIcons) ? jsonAttr(markerIcons) : void 0,
      "data-xcon-map-show-controls": liveLeaflet ? String(booleanOption3(component.get("showControls"), true)) : void 0,
      "data-xcon-map-enable-zoom": liveLeaflet ? String(booleanOption3(component.get("enableZoom"), true)) : void 0,
      "data-xcon-map-enable-pan": liveLeaflet ? String(booleanOption3(component.get("enablePan"), true)) : void 0
    },
    layerHtml + markerHtml
  );
}
function mapSnapshotFit(value) {
  const fit = String(value ?? "cover").trim().toLowerCase();
  return ["cover", "contain", "fill", "none", "scale-down"].includes(fit) ? fit : "cover";
}
function leafletTileUrl(component, context) {
  const explicit = sanitizeUrl(String(component.get("tileUrl") ?? component.get("tileTemplate") ?? ""), context.options);
  if (explicit) return explicit;
  const layer = String(component.get("tileLayer") ?? "").trim().toLowerCase();
  if (layer.includes("carto")) return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  return openStreetMapTileUrl;
}
function mapMarkerData(marker, index2) {
  const plain = toPlainValue(marker);
  const obj = plain && typeof plain === "object" && !Array.isArray(plain) ? plain : {};
  const lat = Number(obj.lat ?? obj.latitude);
  const lng = Number(obj.lng ?? obj.longitude);
  return {
    lat: Number.isFinite(lat) ? lat : void 0,
    lng: Number.isFinite(lng) ? lng : void 0,
    label: String(obj.label ?? obj.title ?? obj.popup ?? index2 + 1)
  };
}
function renderStaticCalendar(component) {
  const locale = String(component.get("locale") ?? "ko");
  const today = /* @__PURE__ */ new Date();
  const title = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}`;
  const headings = (locale.startsWith("ko") ? ["\uC77C", "\uC6D4", "\uD654", "\uC218", "\uBAA9", "\uAE08", "\uD1A0"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((day) => tag2("th", {}, day)).join("");
  const first = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const eventsByDay = calendarEventsByDay(component, today.getFullYear(), today.getMonth());
  const cells = Array.from({ length: 42 }, (_, index2) => {
    const day = index2 - first + 1;
    const label = day > 0 && day <= last ? String(day) : "";
    const events = label ? eventsByDay.get(day) ?? [] : [];
    const eventHtml = events.slice(0, 3).map((event) => tag2("div", { class: "fc-event" }, escapeHtml2(event))).join("");
    return tag2("td", { class: label === String(today.getDate()) ? "fc-today" : void 0 }, label ? tag2("button", { type: "button", class: "fc-daygrid-day-number" }, label) + eventHtml : "");
  });
  const rows = Array.from({ length: 6 }, (_, row) => tag2("tr", {}, cells.slice(row * 7, row * 7 + 7).join(""))).join("");
  return tag2("div", { class: "xa-calendar-static" }, tag2("div", { class: "fc-header-toolbar" }, tag2("button", { type: "button", class: "fc-button-primary" }, "\u2039") + tag2("strong", {}, title) + tag2("button", { type: "button", class: "fc-button-primary" }, "\u203A")) + tag2("table", { class: "fc-scrollgrid" }, tag2("thead", {}, tag2("tr", {}, headings)) + tag2("tbody", {}, rows)));
}
function calendarEventsByDay(component, year, month) {
  const events = parseArrayValue(component.get("events"));
  const byDay = /* @__PURE__ */ new Map();
  events.forEach((event, index2) => {
    const plain = toPlainValue(event);
    if (!plain || typeof plain !== "object" || Array.isArray(plain)) return;
    const obj = plain;
    const day = calendarEventDay(obj.start ?? obj.date, year, month);
    if (!day) return;
    const list = byDay.get(day) ?? [];
    list.push(String(obj.title ?? obj.name ?? `Event ${index2 + 1}`));
    byDay.set(day, list);
  });
  return byDay;
}
function calendarEventDay(value, year, month) {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) return null;
  if (value instanceof Date) {
    return value.getFullYear() === year && value.getMonth() === month ? value.getDate() : null;
  }
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const eventYear = Number(match[1]);
    const eventMonth = Number(match[2]) - 1;
    const eventDay = Number(match[3]);
    return eventYear === year && eventMonth === month ? eventDay : null;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== year || parsed.getMonth() !== month ? null : parsed.getDate();
}
function parseArrayValue(value) {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) return plain;
  if (typeof plain === "string") {
    try {
      const parsed = JSON.parse(plain);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
function renderImage(component, attrs, context, state = { parentFlow: false }) {
  const slideshow = imageSlideshow(component, context);
  const src = sanitizeUrl(component.get("src") ?? component.get("image"), context.options) ?? slideshow.images[0];
  if (!src) return tag2("div", attrsWithStyle(attrs, "overflow:hidden"), escapeHtml2(String(component.get("alt") ?? "")));
  const fallback = imageFallbackSrc(component.get("fallback") ?? component.get("fallbackImage"), context);
  const image = voidTag("img", {
    src,
    alt: attr(component.get("alt") ?? ""),
    loading: attr(state.eagerMedia ? "eager" : component.get("loading") ?? "lazy"),
    draggable: state.eagerMedia ? "false" : void 0,
    "data-xcon-image-fallback": fallback ?? void 0,
    "data-xcon-image-slideshow": slideshow.enabled ? "true" : void 0,
    "data-xcon-image-slideshow-images": slideshow.enabled ? JSON.stringify(slideshow.images) : void 0,
    "data-xcon-image-slideshow-duration": slideshow.enabled ? String(slideshow.duration) : void 0,
    "data-xcon-image-slideshow-mode": slideshow.enabled ? slideshow.mode : void 0,
    style: imageStyle(component)
  });
  return tag2("div", attrsWithStyle({ ...attrs, style: stripImageRootChrome(attrs.style) }, imageRootChromeStyle()), image + imageOverlay(component));
}
function imageFallbackSrc(value, context) {
  const raw = isXconObject2(value) ? value.get("src") ?? value.get("image") : value;
  return sanitizeUrl(raw, context.options);
}
function imageSlideshow(component, context) {
  const slideshow = component.get("slideshow");
  const source = isXconObject2(slideshow) ? slideshow : null;
  const enabled = source ? booleanOption3(source.get("enabled"), false) : isTruthy(component.get("animation") ?? component.get("imageAnimation"));
  const rawImages = source ? source.get("images") : component.get("images");
  const images = Array.isArray(rawImages) ? rawImages.map((item) => sanitizeUrl(isXconObject2(item) ? item.get("src") ?? item.get("image") : item, context.options)).filter((item) => Boolean(item)) : [];
  const duration = imageSlideshowDuration(source?.get("duration") ?? component.get("duration") ?? component.get("animationDuration"));
  const mode = String(source?.get("mode") ?? component.get("animationMode") ?? "loop").trim().toLowerCase() || "loop";
  return { enabled: enabled && images.length > 1, images, duration, mode };
}
function imageSlideshowDuration(value) {
  if (value === void 0 || value === null || value === "") return 3e3;
  const text = String(value).trim().toLowerCase();
  const numeric = Number(text.endsWith("ms") ? text.slice(0, -2) : text.endsWith("s") ? Number(text.slice(0, -1)) * 1e3 : value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 3e3;
  return numeric < 100 ? numeric * 1e3 : numeric;
}
function stripImageRootChrome(style) {
  if (!style) return void 0;
  const blocked = /* @__PURE__ */ new Set(["object-fit", "object-position"]);
  const declarations = style.split(";").map((declaration) => declaration.trim()).filter((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator <= 0) return false;
    return !blocked.has(declaration.slice(0, separator).trim().toLowerCase());
  });
  return declarations.join(";") || void 0;
}
function imageStyle(component) {
  const declarations = ["width:100%", "height:100%", "display:block", `object-fit:${imageObjectFit(component)}`, "border-radius:0"];
  appendCss(declarations, "object-position", component.get("objectPosition") ?? imageObjectPosition(component.get("imageAlign")));
  declarations.push("transition:transform .45s ease");
  return declarations.join(";");
}
function imageOverlay(component) {
  const tagText = component.get("overlayTag");
  const title = component.get("overlayTitle");
  const sub = component.get("overlaySub");
  const cta = component.get("overlayCta");
  const tagHtml = tagText ? tag2("span", { class: "xa-al-img-overlay-tag", style: imageOverlayTagStyle() }, escapeHtml2(String(tagText))) : "";
  const overlayBody = title || sub || cta ? tag2(
    "div",
    { class: "xa-al-img-overlay", style: imageOverlayStyle() },
    (title ? tag2("div", { class: "xa-al-img-overlay-title", style: imageOverlayTitleStyle() }, linesToBreaks(String(title))) : "") + (sub ? tag2("div", { class: "xa-al-img-overlay-sub", style: imageOverlaySubStyle() }, linesToBreaks(String(sub))) : "") + (cta ? tag2("span", { class: "xa-al-img-overlay-cta", style: imageOverlayCtaStyle() }, escapeHtml2(String(cta))) : "")
  ) : "";
  return tagHtml + overlayBody;
}
function imageRootChromeStyle() {
  return "position:relative;overflow:hidden;box-sizing:border-box;background:var(--surface2)";
}
function imageOverlayTagStyle() {
  return "position:absolute;left:14px;top:14px;z-index:3;background:var(--accent);color:#fff;font-size:10px;font-weight:800;line-height:1;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:4px";
}
function imageOverlayStyle() {
  return "position:absolute;inset:0;background:linear-gradient(to top, rgba(28,23,16,.88) 0%, rgba(28,23,16,0) 58%);display:flex;flex-direction:column;justify-content:flex-end;padding:18px 20px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.28);z-index:2;pointer-events:none";
}
function imageOverlayTitleStyle() {
  return 'font-family:"Playfair Display",Georgia,serif;font-size:18px;font-weight:700;line-height:1.2;color:#fff';
}
function imageOverlaySubStyle() {
  return "font-size:12px;line-height:1.35;margin-top:4px;color:rgba(255,255,255,.72);white-space:pre-line";
}
function imageOverlayCtaStyle() {
  return "display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#fff";
}
function imageObjectFit(component) {
  const value = String(component.get("objectFit") ?? component.get("fit") ?? "contain").trim().toLowerCase();
  const map = {
    auto: "contain",
    none: "none",
    center: "none",
    stretch: "fill",
    fit: "contain",
    fill: "cover",
    zoom: "cover",
    tile: "none"
  };
  return map[value] ?? value;
}
function imageObjectPosition(value) {
  const align = String(value ?? "center");
  const map = {
    topleft: "top left",
    topcenter: "top center",
    topright: "top right",
    middleleft: "center left",
    middlecenter: "center center",
    middleright: "center right",
    bottomleft: "bottom left",
    bottomcenter: "bottom center",
    bottomright: "bottom right",
    center: "center center"
  };
  return map[align] ?? align;
}
function renderBanner(component, attrs, context, depth, keyPath) {
  const slides = bannerSlides(component);
  const autoplay = bannerAutoplay(component);
  const orientation = bannerOrientation(component);
  const chrome = bannerChrome(component);
  const bannerAttrs = attrsWithStyle(
    {
      ...attrsWithClass(attrs, chrome === "landing" ? "xa-al-banner--landing" : ""),
      "data-xcon-carousel": "true",
      "data-orientation": orientation,
      "data-auto-scroll": String(autoplay.enabled),
      "data-duration": String(autoplay.interval),
      "data-loop": String(autoplay.loop),
      "data-rolling": String(autoplay.rolling),
      "data-banner-chrome": chrome,
      "data-slide-count": String(slides.length)
    },
    bannerStyle(component)
  );
  return tag2("section", bannerAttrs, renderSlides(component, context, depth, keyPath, slides, autoplay) + renderBannerIndicator(component, slides.length));
}
function renderExtCarousel(component, attrs, context) {
  const items = extCarouselItemsFrom(component, context);
  const showDots = booleanOption3(component.get("showDots"), true);
  const showArrows = booleanOption3(component.get("showArrows"), true);
  const autoplay = carouselAutoplay(component);
  const carouselAttrs = {
    ...attrsWithClass(attrs, "xa-ext-carousel-host"),
    "data-xcon-ext-carousel": "true",
    "data-carousel-autoplay": String(autoplay.enabled),
    "data-carousel-interval": String(autoplay.interval)
  };
  const slides = items.length ? items.map((item, index2) => renderExtCarouselItem(item, index2)).join("") : tag2(
    "div",
    { class: "carousel-item carousel-empty", style: "display:block;text-align:center;padding:24px;color:#888;" },
    "\uC2AC\uB77C\uC774\uB4DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. " + tag2("code", { style: "font-size:12px;" }, "items") + " \uBC30\uC5F4\uC744 \uC124\uC815\uD558\uC138\uC694."
  );
  const arrows = showArrows && items.length > 0 ? tag2("button", { type: "button", class: "carousel-prev", "aria-label": "\uC774\uC804", "data-xcon-carousel-prev": "" }, "\u2039") + tag2("button", { type: "button", class: "carousel-next", "aria-label": "\uB2E4\uC74C", "data-xcon-carousel-next": "" }, "\u203A") : "";
  const dots = showDots && items.length > 0 ? tag2(
    "div",
    { class: "carousel-dots" },
    items.map(
      (_, index2) => tag2(
        "button",
        {
          type: "button",
          class: `carousel-dot${index2 === 0 ? " active" : ""}`,
          "data-xcon-carousel-dot": String(index2),
          "aria-label": `Slide ${index2 + 1}`,
          "aria-current": index2 === 0 ? "true" : "false"
        },
        ""
      )
    ).join("")
  ) : "";
  return tag2("div", carouselAttrs, tag2("div", { class: "carousel-container" }, tag2("div", { class: "carousel-content" }, slides) + arrows + dots));
}
function carouselAutoplay(component) {
  const autoplay = component.get("autoplay");
  if (isXconObject2(autoplay)) {
    return {
      enabled: booleanOption3(autoplay.get("enabled"), false),
      interval: Number(autoplay.get("interval") ?? component.get("interval") ?? component.get("duration") ?? 3e3) || 3e3
    };
  }
  return {
    enabled: isTruthy(autoplay ?? component.get("autoPlay")),
    interval: Number(component.get("interval") ?? component.get("duration") ?? 3e3) || 3e3
  };
}
function renderExtCarouselItem(item, index2) {
  const image = item.image ? voidTag("img", { class: "carousel-img", src: item.image, alt: item.alt }) : "";
  const title = item.title ? tag2("h3", { class: "carousel-title" }, escapeHtml2(item.title)) : "";
  const description = item.description ? tag2("p", { class: "carousel-desc" }, escapeHtml2(item.description)) : "";
  return tag2(
    "div",
    {
      class: "carousel-item",
      "data-carousel-item-index": String(index2),
      style: index2 === 0 ? "display:block" : "display:none"
    },
    image + title + description
  );
}
function extCarouselItemsFrom(component, context) {
  const raw = component.get("items") ?? component.get("slides") ?? component.get("views");
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") {
      const image2 = sanitizeUrl(item, context.options);
      return { image: image2, title: "", description: "", alt: "" };
    }
    if (!isXconObject2(item)) return null;
    const image = carouselMediaUrl(item, context);
    const title = carouselText(item, ["title", "label", "name", "text"]);
    const description = carouselText(item, ["description", "subtitle", "caption", "body"]);
    const alt = carouselText(item, ["alt", "ariaLabel"]) || title;
    return { image, title, description, alt };
  }).filter((item) => item !== null);
}
function carouselMediaUrl(item, context) {
  const direct = item.get("image") ?? item.get("src") ?? item.get("url") ?? item.get("uri") ?? item.get("path") ?? item.get("poster");
  const nested = isXconObject2(direct) ? direct.get("image") ?? direct.get("src") ?? direct.get("url") ?? direct.get("uri") ?? direct.get("path") : direct;
  return sanitizeUrl(nested, context.options);
}
function carouselText(item, fields) {
  for (const field of fields) {
    const value = item.get(field);
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return "";
}
function booleanOption3(value, fallback) {
  if (value === void 0 || value === null) return fallback;
  return !isFalseLike(value);
}
function bannerStyle(component) {
  const declarations = [];
  const height = cssSize(component.get("bannerHeight") ?? component.get("height"));
  if (height) declarations.push(`height:${height}`, `min-height:${height}`);
  const radius = borderRadius(component);
  if (radius) declarations.push(`border-radius:${radius}`);
  return declarations.join(";");
}
function bannerSlides(component) {
  const slides = component.get("slides") ?? component.get("items") ?? component.get("views");
  return Array.isArray(slides) ? slides : [];
}
function bannerOrientation(component) {
  const value = String(component.get("direction") ?? component.get("orientation") ?? "horizontal");
  return value === "vertical" ? "vertical" : "horizontal";
}
function bannerChrome(component) {
  const variant = component.get("variant") ?? component.get("bannerVariant") ?? component.get("bannerChrome");
  const value = typeof variant === "string" ? variant.trim().toLowerCase() : "";
  if (value === "hero" || value === "landing") return "landing";
  if (value) return value;
  return "default";
}
function bannerAutoplay(component) {
  const autoplay = component.get("autoplay");
  if (isXconObject2(autoplay)) {
    return {
      enabled: isTruthy(autoplay.get("enabled")),
      interval: Number(autoplay.get("interval") ?? autoplay.get("duration") ?? component.get("duration") ?? 3e3) || 3e3,
      loop: autoplay.get("loop") === void 0 ? true : isTruthy(autoplay.get("loop")),
      rolling: isTruthy(autoplay.get("rolling") ?? component.get("rolling"))
    };
  }
  return {
    enabled: isTruthy(component.get("autoScroll") ?? autoplay),
    interval: Number(component.get("duration") ?? 3e3) || 3e3,
    loop: component.get("loop") === void 0 ? true : isTruthy(component.get("loop")),
    rolling: isTruthy(component.get("rolling"))
  };
}
function bannerIndicatorConfig(component) {
  const indicator = component.get("indicator");
  if (isXconObject2(indicator)) {
    return {
      show: indicator.get("show") === void 0 ? true : isTruthy(indicator.get("show")),
      color: cssColor(indicator.get("color") ?? component.get("indicatorColor") ?? "255,255,255,255") ?? "#fff"
    };
  }
  return {
    show: indicator === void 0 ? true : !isFalseLike(indicator),
    color: cssColor(component.get("indicatorColor") ?? "255,255,255,255") ?? "#fff"
  };
}
function renderVideo(component, attrs, context) {
  const mode = String(component.get("videoViewMode") ?? component.get("mode") ?? "").trim().toLowerCase();
  if (mode === "showcase") return renderVideoShowcase(attrs, context);
  const src = sanitizeUrl(component.get("src") ?? component.get("url"), context.options) ?? void 0;
  return tag2(
    "div",
    attrs,
    tag2(
      "video",
      {
        style: "width:100%;height:100%;border-radius:4px",
        src,
        controls: component.get("controls") === void 0 || !isFalseLike(component.get("controls")) ? "" : void 0,
        autoplay: isTruthy(component.get("autoplay")) ? "" : void 0,
        loop: isTruthy(component.get("loop")) ? "" : void 0,
        muted: isTruthy(component.get("muted")) ? "" : void 0
      },
      "\uBE0C\uB77C\uC6B0\uC800\uAC00 \uBE44\uB514\uC624\uB97C \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
    )
  );
}
function renderVideoShowcase(attrs, context) {
  const key = String(attrs["data-key"] ?? "videoView").replace(/[^a-zA-Z0-9_-]/g, "_");
  const poster = videoImage("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", context, "");
  const thumbs = [
    ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60", "42:18", true],
    ["https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=60", "28:05", false],
    ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&q=60", "15:40", false],
    ["https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&q=60", "1:02:33", false],
    ["https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=200&q=60", "08:22", false],
    ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=60", "33:17", false]
  ];
  const thumbStrip = thumbs.map(
    ([src, duration, active]) => tag2(
      "div",
      { class: `vt-item${active ? " active" : ""}` },
      `${videoImage(src, context, "")}${tag2("span", { class: "vt-dur" }, duration)}`
    )
  ).join("");
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const skipIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-8.84"/></svg>';
  const volumeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  const fullscreenIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const player = tag2(
    "div",
    { class: "video-player", id: `xa_vv_player_${key}` },
    tag2(
      "div",
      { class: "video-player__poster", id: `xa_vv_poster_${key}`, "data-xa-vv-poster": key },
      `${poster}${tag2(
        "div",
        { class: "video-player__poster-inner" },
        tag2("div", { class: "video-player__play-btn" }, playIcon) + tag2("div", { class: "video-player__title" }, "Mountain Timelapse \xB7 4K") + tag2("div", { class: "video-player__sub" }, "42:18 \xB7 Nature Collection \xB7 2026")
      )}`
    ) + tag2(
      "div",
      { class: "video-controls" },
      tag2(
        "div",
        { class: "video-progress", id: `xa_vv_prog_${key}` },
        tag2("div", { class: "video-progress__fill", id: `xa_vv_fill_${key}`, style: "width:35%" }, "") + tag2("div", { class: "video-progress__thumb", id: `xa_vv_thumb_${key}`, style: "right:calc(65% - 6px)" }, "")
      ) + tag2(
        "div",
        { class: "video-ctrl-row" },
        tag2("button", { type: "button", class: "vc-btn vc-fill", id: `xa_vv_vcplay_${key}`, "aria-label": "Play" }, playIcon) + tag2("button", { type: "button", class: "vc-btn vc-fill", "aria-label": "Back 10 seconds" }, skipIcon) + tag2("span", { class: "vc-time", id: `xa_vv_time_${key}` }, "0:00 / 42:18") + tag2("span", { class: "vc-spacer" }, "") + tag2(
          "div",
          { class: "vc-vol" },
          tag2("button", { type: "button", class: "vc-btn", "aria-label": "Volume" }, volumeIcon) + tag2("div", { class: "vc-vol-slider" }, tag2("div", { class: "vc-vol-fill" }, ""))
        ) + tag2("button", { type: "button", class: "vc-btn", "aria-label": "Fullscreen" }, fullscreenIcon)
      )
    )
  );
  return tag2(
    "div",
    {
      ...attrsWithClass(videoShowcaseAttrs(attrs), "xa-al-vv-root"),
      "data-xa-vv-key": key
    },
    tag2("div", { class: "vv-showcase" }, player + tag2("div", { class: "sub-label" }, "Playlist") + tag2("div", { class: "video-thumb-strip" }, thumbStrip))
  );
}
function videoImage(src, context, altText) {
  const safe = sanitizeUrl(src, context.options);
  return safe ? voidTag("img", { src: safe, alt: altText }) : "";
}
function videoShowcaseAttrs(attrs) {
  const style = stripStyleDeclarations(attrs.style, /* @__PURE__ */ new Set(["height", "min-height"]));
  return attrsWithStyle({ ...attrs, style }, "height:auto;min-height:0;width:100%;max-width:100%;position:relative;box-sizing:border-box");
}
function renderSlides(component, context, depth, keyPath, slides = bannerSlides(component), autoplay = bannerAutoplay(component)) {
  const renderSlide = (slide, index2, cloned = false) => tag2(
    "div",
    { class: "banner-slide", "data-key": `${keyPath}~slides${cloned ? "clone" : index2}~slide`, "data-xcon-clone": cloned ? "true" : void 0 },
    isXconObject2(slide) ? renderComponent(slide, context, depth, { parentFlow: true, fillParent: true, eagerMedia: true }, `${keyPath}~slides${cloned ? "clone" : index2}`) : renderComponent(
      fromJSONObject2({ type: "image", src: slide }),
      context,
      depth,
      { parentFlow: true, fillParent: true, eagerMedia: true },
      `${keyPath}~slides${cloned ? "clone" : index2}`
    )
  );
  const rendered = slides.map((slide, index2) => renderSlide(slide, index2));
  if (autoplay.rolling && autoplay.loop && slides.length > 1) rendered.push(renderSlide(slides[0], 0, true));
  const body = rendered.length > 0 ? rendered.join("") : renderChildren(component, context, depth, { parentFlow: true }, keyPath);
  return tag2("div", { class: "banner-container" }, body);
}
function renderBannerIndicator(component, count) {
  const config = bannerIndicatorConfig(component);
  if (!config.show || count <= 0) return "";
  const dots = Array.from(
    { length: count },
    (_, index2) => tag2(
      "button",
      {
        type: "button",
        class: "banner-indicator",
        "data-xcon-banner-dot": String(index2),
        "aria-label": `Slide ${index2 + 1}`,
        "aria-current": index2 === 0 ? "true" : "false",
        style: `background:${config.color};opacity:${index2 === 0 ? "1" : "0.5"}`
      },
      ""
    )
  ).join("");
  return tag2("div", { class: "banner-indicators" }, dots);
}
function renderList(component, context, depth, keyPath) {
  const items = component.get("items");
  if (Array.isArray(items)) {
    const renderedItems = items.map(
      (item, index2) => isXconObject2(item) ? renderComponent(item, context, depth, { parentFlow: true }, `${keyPath}~items${index2}`) : tag2("div", { "data-key": `${keyPath}~items${index2}` }, escapeHtml2(String(item ?? "")))
    );
    return renderListWithHeader(renderedItems, component, renderedItems.length);
  }
  const rows = listRows(component);
  if (rows.length > 0) {
    const renderedItems = rows.map((row, index2) => {
      const layout = listLayoutForRow(component, row);
      return layout ? renderTemplatedListItem(component, layout, row, context, depth, `${keyPath}~items${index2}`, index2, index2 === rows.length - 1) : renderDefaultListItem(component, row, `${keyPath}~items${index2}`, index2, index2 === rows.length - 1);
    });
    return renderListWithHeader(renderedItems, component, rows.length);
  }
  return renderChildren(component, context, depth, { parentFlow: true }, keyPath);
}
function listRootAttrs(component, attrs) {
  const al = component.get("al");
  const variant = String(component.get("xListVariant") ?? component.get("variant") ?? "").trim().toLowerCase();
  const minHeight = isXconObject2(al) ? al.get("minHeight") : void 0;
  const maxHeight = isXconObject2(al) ? al.get("maxHeight") : void 0;
  if (variant !== "showcase" && !minHeight && !maxHeight) return attrs;
  const style = stripStyleDeclarations(attrs.style, /* @__PURE__ */ new Set(["height", "min-height"]));
  const declarations = ["height:auto", "min-height:0"];
  appendCss(declarations, "min-height", cssSize(minHeight));
  appendCss(declarations, "max-height", cssSize(maxHeight));
  declarations.push("align-self:stretch", "width:100%", "max-width:100%", "min-width:0", "box-sizing:border-box");
  return attrsWithAppendedStyle({ ...attrs, style }, declarations.join(";"));
}
function renderListWithHeader(items, component, itemCount) {
  const hasHeader = showsListHeader(component);
  return (hasHeader ? renderListHeader(component, itemCount) : "") + renderListItems(items, component, hasHeader);
}
function renderListHeader(component, itemCount) {
  const title = String(component.get("title") ?? "");
  return tag2(
    "div",
    { class: "xlist-header", style: "background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:12px 16px;font-size:16px;font-weight:bold;display:flex;justify-content:space-between;align-items:center" },
    tag2("span", {}, escapeHtml2(title)) + tag2(
      "span",
      { style: "background:rgba(255,255,255,0.2);padding:4px 8px;border-radius:12px;font-size:12px" },
      `${itemCount}\uAC1C`
    )
  );
}
function showsListHeader(component) {
  const value = component.get("hidenavbar") ?? component.get("hideNavbar");
  return value === false || value === "false" || value === 0 || value === "0";
}
function renderListItems(items, component, hasHeader = false) {
  return tag2(
    "div",
    { class: "xlist-content", style: listContentStyle(component, hasHeader) },
    tag2("div", { class: "xlist-items-container", style: listItemsContainerStyle(component) }, items.join(""))
  );
}
function renderTemplatedListItem(component, cellTemplate, row, context, depth, keyPath, index2 = 0, last = true) {
  const size = listItemSize(component, cellTemplate);
  const itemStyle = listItemStyle(component, size, index2, last);
  const layoutType = String(cellTemplate.get("layoutType") ?? "").trim();
  const body = layoutType === "youChat" || layoutType === "meChat" ? renderListChatItem(cellTemplate, row, layoutType, context) : cellTemplate.entries().filter(([key, value]) => key !== "itemSize" && key !== "rowHeight" && key !== "rowWidth" && key !== "layoutType" && isXconObject2(value)).map(([key, value]) => renderComponent(substituteTemplateValue(value, row), context, depth, { parentFlow: false }, `${keyPath}~${key}`)).join("");
  const separator = renderListSeparator(component, index2, last, layoutType);
  return tag2("div", { class: "xlist-item", style: itemStyle, "data-key": keyPath }, body + separator);
}
function listContentStyle(component, hasHeader = false) {
  const direction = listDirection(component);
  const scrollAxis = direction === "row" ? "overflow-x:auto;overflow-y:hidden" : "overflow-y:auto;overflow-x:hidden";
  const height = hasHeader ? "calc(100% - 50px)" : "100%";
  return joinStyles(`position:relative;width:100%;height:${height}`, scrollAxis) ?? "";
}
function listItemsContainerStyle(component) {
  const direction = listDirection(component);
  const offset = listOffset(component);
  const offsetStyle = offset ? `;margin-left:${offset.x};margin-top:${offset.y}` : "";
  if (direction === "row") {
    return `display:flex;flex-direction:row;align-items:stretch;height:100%;width:max-content${offsetStyle}`;
  }
  return `display:flex;flex-direction:column;width:100%${offsetStyle}`;
}
function listItemStyle(component, size, index2, last) {
  const direction = listDirection(component);
  const separator = listSeparatorConfig(component, direction);
  const separatorSize = separator?.size;
  const declarations = ["position:relative", "overflow:hidden", "border:none", "border-radius:6px", "background:transparent", "transition:all .2s", "box-sizing:border-box", "cursor:pointer"];
  if (direction === "row") {
    if (size.width) declarations.push(`min-width:${size.width}`, `width:${size.width}`);
    declarations.push(size.height ? `height:${size.height}` : "height:100%");
    declarations.push("flex-shrink:0");
    if (!last && separatorSize) declarations.push(`margin-right:${separatorSize}`);
  } else {
    declarations.push("width:100%");
    if (size.height) declarations.push(`min-height:${size.height}`);
    if (!last && separatorSize) declarations.push(`margin-bottom:${separatorSize}`);
  }
  if (index2 < 0) return declarations.join(";");
  return declarations.join(";");
}
function listOffset(component) {
  const offset = component.get("offset");
  let x2;
  let y2;
  if (Array.isArray(offset)) {
    [x2, y2] = offset;
  } else if (isXconObject2(offset)) {
    x2 = offset.get("x");
    y2 = offset.get("y");
  } else if (offset && typeof offset === "object") {
    x2 = offset.x;
    y2 = offset.y;
  }
  x2 ??= component.get("offsetX");
  y2 ??= component.get("offsetY");
  const hasOffset = x2 !== void 0 || y2 !== void 0;
  if (!hasOffset) return null;
  return { x: cssSize(x2 ?? 0) ?? "0px", y: cssSize(y2 ?? 0) ?? "0px" };
}
function renderDefaultListItem(component, row, keyPath, index2, last) {
  const itemStyle = listItemStyle(component, listItemSize(component, new XconObject3()), index2, last);
  const fields = isXconObject2(row) ? row.entries().filter(([key]) => !key.startsWith("_")).map(([key, value]) => tag2("div", {}, `${escapeHtml2(key)}: ${escapeHtml2(String(value ?? ""))}`)).join("") : tag2("div", {}, escapeHtml2(String(row ?? "")));
  return tag2(
    "div",
    { class: "xlist-item", style: itemStyle, "data-key": keyPath },
    tag2("div", { style: "padding:12px" }, fields) + renderListSeparator(component, index2, last, "")
  );
}
function renderListSeparator(component, _index, last, layoutType) {
  if (last || layoutType === "youChat" || layoutType === "meChat") return "";
  const direction = listDirection(component);
  const separator = listSeparatorConfig(component, direction);
  if (!separator) return "";
  const half = Math.floor(Number.parseFloat(separator.size) / 2) || 0;
  const style = direction === "row" ? `position:absolute;right:-${half}px;top:8px;bottom:8px;width:${separator.size};background:${separator.color};pointer-events:none` : `position:absolute;bottom:-${half}px;left:8px;right:8px;height:${separator.size};background:${separator.color};pointer-events:none`;
  return tag2("div", { class: `xlist-separator xlist-separator--${direction}`, style }, "");
}
function listSeparatorConfig(component, direction) {
  const separator = component.get("separator");
  const style = String(isXconObject2(separator) ? separator.get("style") ?? "line" : component.get("separatorStyle") ?? "line").trim().toLowerCase();
  if (style === "none" || style === "hidden") return null;
  const rawSize = isXconObject2(separator) ? separator.get("size") ?? 1 : direction === "row" ? component.get("separatorWidth") ?? 1 : component.get("separatorHeight") ?? 1;
  const numeric = Number(rawSize);
  if (Number.isFinite(numeric) && numeric <= 0) return null;
  const size = cssSize(rawSize) ?? "1px";
  const color2 = cssColor(isXconObject2(separator) ? separator.get("color") : component.get("separatorColor")) ?? "rgb(200 200 200 / 1)";
  return { size, color: color2 };
}
function renderListChatItem(layout, row, layoutType, context) {
  const side = layoutType === "meChat" ? "me" : "you";
  const name = listBoundText(layout.get("name"), row, "name");
  const text = listBoundText(layout.get("text") ?? "{{item.text}}", row, "text");
  const image = listBoundText(layout.get("image"), row, "image");
  const timestamp = listBoundText(layout.get("timestamp"), row, "timestamp");
  return tag2("div", { class: `xlist-chat-row xlist-chat-row--${side}` }, renderChatRowContent({ name, text, timestamp, image, context }));
}
function renderChatRowContent(options) {
  const image = sanitizeUrl(options.image, options.context.options);
  const avatarHtml = image ? voidTag("img", { class: "xlist-chat-avatar", src: image, alt: options.name }) : "";
  const nameHtml = options.name ? tag2("div", { class: "xlist-chat-name" }, escapeHtml2(options.name)) : "";
  const timeHtml = options.timestamp ? tag2("div", { class: "xlist-chat-time" }, escapeHtml2(options.timestamp)) : "";
  return avatarHtml + tag2("div", { class: "xlist-chat-stack" }, nameHtml + tag2("div", { class: "xlist-chat-bubble" }, escapeHtml2(options.text)) + timeHtml);
}
function listBoundText(template, row, fallbackKey) {
  if (template !== void 0 && template !== null && template !== "") return String(substituteTemplateValue(template, row));
  const value = rowField(row, fallbackKey);
  return value === void 0 || value === null ? "" : String(value);
}
function rowField(row, key) {
  if (isXconObject2(row)) return row.get(key);
  if (row && typeof row === "object" && !Array.isArray(row)) return row[key];
  return void 0;
}
function listDirection(component) {
  const raw = String(component.get("direction") ?? component.get("orientation") ?? "vertical").trim().toLowerCase();
  if (raw === "horizontal" || raw === "row") return "row";
  return "column";
}
function listRows(component) {
  const direct = component.get("tabledata");
  if (Array.isArray(direct)) return direct;
  const dataTemplate = component.get("dataTemplate");
  if (!isXconObject2(dataTemplate)) return [];
  const template = dataTemplate.get("template");
  if (isXconObject2(template)) {
    const rows = template.get("tabledata");
    if (Array.isArray(rows)) return rows;
  }
  return [];
}
function listCellTemplate(component) {
  const templates = component.get("templates");
  if (isXconObject2(templates)) {
    const cell = templates.get("cell");
    if (isXconObject2(cell)) return cell;
  }
  const cellTemplate = component.get("cellTemplate");
  if (isXconObject2(cellTemplate)) return cellTemplate;
  const cellLayout = component.get("cellLayout");
  if (isXconObject2(cellLayout)) return cellLayout;
  return null;
}
function listLayoutForRow(component, row) {
  const layoutName = rowField(row, "_layout");
  if (typeof layoutName === "string" && layoutName.trim()) {
    const layout = component.get(layoutName.trim());
    if (isXconObject2(layout)) return layout;
  }
  return listCellTemplate(component);
}
function listItemSize(component, cellTemplate) {
  const size = component.get("itemSize");
  const fallback = cellTemplate.get("itemSize");
  const source = isXconObject2(size) ? size : isXconObject2(fallback) ? fallback : null;
  const width = source ? cssSize(source.get("width")) : cssSize(cellTemplate.get("rowWidth") ?? component.get("rowWidth"));
  const height = source ? cssSize(source.get("height")) : cssSize(cellTemplate.get("rowHeight") ?? component.get("rowHeight"));
  if (!source && !width && !height) return {};
  return {
    width,
    height
  };
}
function substituteTemplateValue(value, row) {
  if (typeof value === "string") {
    return value.replaceAll(/\{\{\s*item\.([A-Za-z0-9_.-]+)\s*\}\}/g, (_match, path) => String(templateValue(row, path) ?? ""));
  }
  if (Array.isArray(value)) return value.map((item) => substituteTemplateValue(item, row));
  if (isXconObject2(value)) {
    const next = new XconObject3();
    value.forEach((child, key) => next.add(key, substituteTemplateValue(child, row)));
    return next;
  }
  return value;
}
function templateValue(row, path) {
  const parts = path.split(".").filter(Boolean);
  let current3 = row;
  for (const part of parts) {
    if (!isXconObject2(current3)) return void 0;
    current3 = current3.get(part);
  }
  return current3;
}
function renderBadge(component, attrs) {
  if (isShowcaseVariant(component)) {
    const badges = [
      ["bdg bdg-purple", "Purple"],
      ["bdg bdg-green", "Active"],
      ["bdg bdg-red", "Error"],
      ["bdg bdg-yellow", "Warning"],
      ["bdg bdg-blue", "Info"],
      ["bdg bdg-outline", "Default"]
    ];
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-badge-host xa-ext-badge-host--showcase"),
      tag2("div", { class: "badges-row", style: "margin-bottom:12px" }, badges.map(([className2, label2]) => tag2("span", { class: className2 }, label2)).join("")) + tag2(
        "div",
        { class: "badges-row", style: "margin-bottom:16px" },
        tag2("span", { class: "bdg bdg-green bdg--dot" }, "Online") + tag2("span", { class: "bdg bdg-yellow bdg--dot" }, "Away") + tag2("span", { class: "bdg bdg-red bdg--dot" }, "Busy") + tag2("span", { class: "bdg bdg-outline bdg--dot" }, "Offline")
      ) + tag2(
        "div",
        { class: "badges-row" },
        renderNotificationBadge("Notifications", iconSvg("bell", "none"), "3") + renderNotificationBadge("Messages", iconSvg("chat", "none"), "12") + renderNotificationBadge("Mail", iconSvg("mail", "none"), "99+")
      )
    );
  }
  const variant = String(component.get("variant") ?? "filled").trim().toLowerCase();
  const size = String(component.get("size") ?? "medium").trim().toLowerCase();
  const extraSize = size === "small" ? "font-size:10px;padding:2px 8px" : size === "large" ? "font-size:13px;padding:5px 12px" : "";
  const rawColor = component.get("color") ?? "#dc3545";
  const rawBackground = component.get("backgroundColor") ?? "#dc3545";
  const color2 = cssColor(rawColor);
  const background = cssColor(rawBackground);
  const hasCustomBackground = background !== void 0 && String(rawBackground).trim().toLowerCase() !== "#dc3545";
  const hasCustomColor = color2 !== void 0 && String(rawColor).trim().toLowerCase() !== "#dc3545";
  const className = variant === "outline" || !hasCustomBackground && hasCustomColor ? "bdg bdg-outline" : variant === "dot" ? "bdg bdg-green bdg--dot" : hasCustomBackground ? "bdg" : "bdg bdg-red";
  const style = [extraSize, hasCustomBackground && variant !== "outline" ? `background:${background};color:#fff;border:1px solid transparent` : "", (variant === "outline" || !hasCustomBackground && hasCustomColor) && color2 ? `color:${color2};border-color:${color2}` : ""].filter(Boolean).join(";");
  const label = variant === "dot" ? "" : escapeHtml2(String(component.get("text") ?? component.get("label") ?? ""));
  return tag2("div", attrsWithClass(attrs, "xa-ext-badge-host xa-ext-badge-host--single"), tag2("span", { class: className, style: style || void 0 }, label));
}
function renderNotificationBadge(label, icon, count) {
  return tag2("div", { class: "notif-badge-wrap" }, tag2("button", { type: "button", class: "notif-icon-btn", "aria-label": label }, icon) + tag2("span", { class: "notif-count" }, escapeHtml2(count)));
}
function renderAlert(component, attrs) {
  if (isShowcaseVariant(component)) {
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-alert-host xa-ext-alert-host--showcase"),
      renderAlertBlock("info", "\u2139\uFE0F", "Information", "Your session will expire in 30 minutes. Save your work.", true) + renderAlertBlock("success", "\u2705", "Success", "Changes saved successfully to the cloud.", true) + renderAlertBlock("warning", "\u26A0\uFE0F", "Warning", "Disk usage at 82%. Consider cleaning up old files.", true) + renderAlertBlock("error", "\u{1F6A8}", "Error", "Failed to connect to server. Check your network.", true)
    );
  }
  const variant = String(component.get("severity") ?? component.get("alertType") ?? component.get("variant") ?? "info").trim().toLowerCase();
  const safeVariant = ["info", "success", "warning", "error"].includes(variant) ? variant : "info";
  const icons = { info: "\u2139\uFE0F", success: "\u2705", warning: "\u26A0\uFE0F", error: "\u{1F6A8}" };
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-alert-host xa-ext-alert-host--single"),
    renderAlertSingleBlock(
      safeVariant,
      isFalseLike(component.get("showIcon")) ? "" : icons[safeVariant],
      String(component.get("title") ?? ""),
      String(component.get("message") ?? component.get("content") ?? component.get("text") ?? ""),
      isTruthy(component.get("dismissible"))
    )
  );
}
function renderAlertBlock(variant, icon, title, message, dismissible) {
  return tag2(
    "div",
    { class: `alert alert--${variant}` },
    (icon ? tag2("span", { class: "alert__icon" }, escapeHtml2(icon)) : "") + tag2("div", { class: "alert__body" }, (title ? tag2("div", { class: "alert__title" }, escapeHtml2(title)) : "") + tag2("div", { class: "alert__text" }, escapeHtml2(message))) + (dismissible ? tag2("button", { type: "button", class: "alert__close", "aria-label": "Close", "data-xcon-alert-close": "" }, modalCloseIcon()) : "")
  );
}
function renderAlertSingleBlock(variant, icon, title, message, dismissible) {
  return tag2(
    "div",
    { class: `alert alert--${variant}`, style: "position:relative;" },
    (icon ? tag2("span", { class: "alert__icon" }, escapeHtml2(icon)) : "") + tag2("div", { class: "alert__body" }, (title ? tag2("div", { class: "alert__title" }, escapeHtml2(title)) : "") + tag2("div", { class: "alert__text" }, escapeHtml2(message))) + (dismissible ? tag2("button", { type: "button", class: "alert__close", "aria-label": "Close", "data-xcon-alert-close": "" }, "\xD7") : "")
  );
}
function renderIcon(component, attrs) {
  if (isShowcaseVariant(component)) {
    const names = ["home", "search", "bell", "settings", "user", "mail", "star", "heart", "download", "plus", "trash", "edit"];
    const grid = names.map((name2) => tag2("div", { class: "icon-item", title: titleCase(name2) }, iconSvg(name2, "none"))).join("");
    const ladder = [12, 16, 20, 28, 36].map((size) => iconSvg("home", "none").replace('width="18"', `width="${size}"`).replace('height="18"', `height="${size}"`)).join("");
    return tag2("div", attrsWithClass(attrs, "xa-ext-icon-host xa-ext-icon-host--showcase"), tag2("div", { class: "icon-grid" }, grid) + tag2("div", { class: "icon-sizes" }, ladder));
  }
  const name = String(component.get("name") ?? iconName(component.get("icon")) ?? "\u2753");
  const iconSize = Math.max(1, Number(component.get("size") ?? 24) || 24);
  const color2 = cssColor(component.get("color") ?? "0,0,0,255") ?? "rgb(0 0 0 / 1)";
  const rotation = Number(component.get("rotation") ?? 0) || 0;
  const library = String(component.get("library") ?? "emoji").trim().toLowerCase();
  const strokeWidth = Math.max(0.5, Math.min(8, Number(component.get("weight") ?? component.get("strokeWidth") ?? 2) || 2));
  const vectorHtml = library === "emoji" ? "" : iconSvg(name, "none", { size: iconSize, strokeWidth, className: null });
  const iconHtml = vectorHtml || tag2("span", { style: `font-size:${iconSize}px;line-height:1` }, escapeHtml2(name));
  const transform2 = rotation ? `transform:rotate(${rotation}deg)` : "";
  const containerStyle = [`color:${color2}`, "display:inline-flex", "align-items:center", "justify-content:center", `width:${iconSize}px`, `height:${iconSize}px`, transform2].filter(Boolean).join(";");
  return tag2(
    "div",
    attrsWithAppendedStyle(attrsWithClass(attrs, "xa-ext-icon-host xa-ext-icon-host--single"), "display:flex;align-items:center;justify-content:center"),
    tag2("div", { class: "icon-item" }, tag2("div", { class: "icon-container", style: containerStyle }, iconHtml))
  );
}
function renderDivider(component, attrs) {
  if (isShowcaseVariant(component)) {
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-divider-host xa-ext-divider-host--showcase"),
      tag2("p", { style: "font-size:13px;color:var(--ink-2)" }, "Default") + tag2("div", { class: "divider" }, "") + tag2("p", { style: "font-size:13px;color:var(--ink-2)" }, "Thick") + tag2("div", { class: "divider--thick" }, "") + tag2("p", { style: "font-size:13px;color:var(--ink-2)" }, "Dashed") + tag2("div", { class: "divider--dashed" }, "") + tag2("p", { style: "font-size:13px;color:var(--ink-2)" }, "Gradient") + tag2("div", { class: "divider--gradient" }, "") + tag2("p", { style: "font-size:13px;color:var(--ink-2)" }, "With label") + tag2("div", { class: "divider--label" }, tag2("span", {}, "OR")) + tag2("p", { style: "font-size:13px;color:var(--ink-2)" }, "Content below")
    );
  }
  const orientation = String(component.get("orientation") ?? component.get("direction") ?? "horizontal").trim().toLowerCase();
  const variant = String(component.get("variant") ?? "solid").trim().toLowerCase();
  const lineStyle = ["solid", "dashed", "dotted", "double"].includes(variant) ? variant : "solid";
  const color2 = cssColor(component.get("color")) ?? "#e9ecef";
  const thickness = cssSize(component.get("thickness") ?? "1px") ?? "1px";
  const text = String(component.get("text") ?? "");
  if (text && orientation !== "vertical") {
    const position = String(component.get("textPosition") ?? "center").trim().toLowerCase();
    const justify = position === "left" ? "flex-start" : position === "right" ? "flex-end" : "center";
    const line = tag2("div", { style: `flex:1;height:${thickness};border-top:${thickness} ${lineStyle} ${color2}` }, "");
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-divider-host xa-ext-divider-host--single"),
      tag2("div", { style: `display:flex;align-items:center;justify-content:${justify}` }, line + tag2("span", { style: "padding:0 12px;font-size:14px;color:var(--ink-2)" }, escapeHtml2(text)) + line)
    );
  }
  const containerStyle = orientation === "vertical" ? "display:flex;justify-content:center;height:100%" : "display:flex;align-items:center";
  const dividerStyle = orientation === "vertical" ? `width:${thickness};height:100%;border-left:${thickness} ${lineStyle} ${color2}` : `width:100%;height:${thickness};border-top:${thickness} ${lineStyle} ${color2}`;
  return tag2("div", attrsWithClass(attrs, "xa-ext-divider-host xa-ext-divider-host--single"), tag2("div", { style: containerStyle }, tag2("div", { style: dividerStyle }, "")));
}
function renderTooltip(component, attrs, children2) {
  const text = String(component.get("text") ?? component.get("tooltip") ?? "tooltip");
  if (isShowcaseVariant(component)) {
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-tooltip-host xa-ext-tooltip-host--showcase"),
      tag2("p", { style: "font-size:12px;color:var(--ink-3);margin-bottom:16px" }, "Hover over each button:") + tag2(
        "div",
        { class: "tooltip-demo" },
        renderTooltipDemo("tip-top", "Top", "Tooltip on top \u2191") + renderTooltipDemo("tip-bottom", "Bottom", "Tooltip below \u2193") + renderTooltipDemo("tip-right", "Right \u2192", "Tooltip on right")
      )
    );
  }
  const position = safeTooltipPosition(component.get("position"));
  const trigger = String(component.get("trigger") ?? "hover").trim().toLowerCase() === "click" ? "click" : "hover";
  const theme = String(component.get("theme") ?? "dark").trim().toLowerCase() === "light" ? "light" : "dark";
  const rawDelay = Number(component.get("delay") ?? 0);
  const delay = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 0;
  const tooltipId = `${domIdFromAttrs(attrs)}_tooltip`;
  const arrow = isFalseLike(component.get("arrow")) ? "" : tag2("div", { class: "tooltip-arrow" }, "");
  const label = children2 || escapeHtml2(String(component.get("label") ?? component.get("content") ?? text));
  return tag2(
    "div",
    attrsWithClass(
      {
        ...attrs,
        "data-xcon-tooltip": "",
        "data-xcon-tooltip-trigger": trigger,
        "data-xcon-tooltip-delay": delay > 0 ? String(delay) : void 0
      },
      "xa-ext-tooltip-host xa-ext-tooltip-host--single"
    ),
    tag2("div", { class: "tooltip-trigger", "aria-describedby": tooltipId, tabindex: "0" }, label) + tag2("div", { id: tooltipId, class: `tooltip tooltip-${theme} tooltip-${position}`, role: "tooltip" }, escapeHtml2(text) + arrow)
  );
}
function renderTooltipDemo(positionClass, label, text) {
  return tag2("div", { class: `tooltip-wrap ${positionClass}` }, tag2("div", { class: "tooltip-target" }, escapeHtml2(label)) + tag2("div", { class: "tooltip-bubble" }, escapeHtml2(text)));
}
function safeTooltipPosition(value) {
  const position = String(value ?? "top").trim().toLowerCase();
  return ["top", "bottom", "left", "right"].includes(position) ? position : "top";
}
function renderModal(component, attrs, children2) {
  const suffix = domIdFromAttrs(attrs);
  if (isShowcaseVariant(component)) {
    const showcaseSuffix = showcaseIdSuffix(attrs, "modal");
    const backdropId = `modalBackdrop_${showcaseSuffix}`;
    return tag2(
      "div",
      attrsWithClass({ ...attrs, "data-xcon-modal": "" }, "xa-ext-modal-host xa-ext-modal-host--showcase"),
      tag2("p", { style: "font-size:12px;color:var(--ink-2);margin-bottom:16px" }, "Layered dialog with backdrop blur, animation, and focus management.") + tag2("button", { type: "button", class: "modal-trigger-btn", id: `openModal_${showcaseSuffix}`, "data-xcon-modal-open": backdropId }, "Open Modal") + tag2(
        "div",
        { class: "modal-backdrop", id: backdropId, "data-xcon-modal-target": "", "data-xcon-modal-close-on-backdrop": "true" },
        tag2(
          "div",
          { class: "modal-box" },
          tag2("div", { class: "modal-header" }, tag2("h3", {}, "Confirm Action") + tag2("button", { type: "button", class: "modal-close", id: `closeModal_${showcaseSuffix}`, "data-xcon-modal-close": backdropId, "aria-label": "Close" }, modalCloseIcon())) + tag2("div", { class: "modal-body" }, tag2("p", {}, "Are you sure you want to permanently delete this project? This action cannot be undone and all associated data will be lost.")) + tag2("div", { class: "modal-footer" }, tag2("button", { type: "button", class: "btn-sm btn-ghost", id: `cancelModal_${showcaseSuffix}`, "data-xcon-modal-close": backdropId }, "Cancel") + tag2("button", { type: "button", class: "btn-sm btn-primary" }, "Delete Project"))
        )
      )
    );
  }
  const title = String(component.get("title") ?? "title");
  const body = children2 || escapeHtml2(String(component.get("text") ?? component.get("content") ?? component.get("message") ?? "message"));
  const modalId = `${suffix}_modal`;
  const size = String(component.get("size") ?? "medium").trim().toLowerCase();
  const width = size === "small" ? "300px" : size === "large" ? "800px" : size === "fullscreen" ? "95vw" : "500px";
  const animation = String(component.get("animation") ?? "fade").trim().toLowerCase();
  const safeAnimation = ["fade", "slide", "zoom"].includes(animation) ? animation : "fade";
  const closeButton = isFalseLike(component.get("showCloseButton")) ? "" : tag2("button", { type: "button", class: "modal-close", "data-xcon-modal-close": modalId, "aria-label": "Close" }, modalCloseIcon());
  return tag2(
    "div",
    attrsWithClass({ ...attrs, "data-xcon-modal": "" }, "xa-ext-modal-host xa-ext-modal-host--single"),
    tag2("button", { type: "button", class: "modal-trigger-btn", "data-xcon-modal-open": modalId }, "modal") + tag2(
      "div",
      {
        id: modalId,
        class: "modal-overlay",
        "data-xcon-modal-target": "",
        "data-xcon-modal-close-on-backdrop": isFalseLike(component.get("backdropClose") ?? component.get("closeOnBackdrop")) ? "false" : "true"
      },
      tag2(
        "div",
        { class: `modal-content modal-${safeAnimation}`, style: `width:${width}`, role: "dialog", "aria-modal": "true", "aria-labelledby": `${modalId}_title` },
        tag2("div", { class: "modal-header" }, tag2("h3", { id: `${modalId}_title` }, escapeHtml2(title)) + closeButton) + tag2("div", { class: "modal-body" }, body) + tag2("div", { class: "modal-footer" }, tag2("button", { type: "button", class: "btn-sm btn-ghost", "data-xcon-modal-close": modalId }, "cloase"))
      )
    )
  );
}
function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
function modalCloseIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
}
function renderCard(component, attrs, context, children2) {
  if (isShowcaseVariant(component)) {
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-card-host xa-ext-card-host--showcase"),
      renderUiCard({
        title: "Generative Interfaces",
        text: "Exploring the intersection of AI and design \u2014 how machine-generated content reshapes product experiences.",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80",
        context,
        footer: tag2("span", { class: "bdg bdg-purple" }, "Design") + tag2("button", { type: "button", class: "btn-sm btn-primary" }, "Read More")
      })
    );
  }
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-card-host xa-ext-card-host--single"),
    renderSingleCard(component, context, children2)
  );
}
function cardFlag(value, defaultValue) {
  if (value === void 0 || value === null || value === "") return defaultValue;
  if (isXconObject2(value)) return !isFalseLike(value.get("visible"));
  return !isFalseLike(value);
}
function renderSingleCard(component, context, children2) {
  const src = sanitizeUrl(component.get("image") ?? component.get("src"), context.options);
  const title = String(component.get("title") ?? "");
  const subtitle = String(component.get("subtitle") ?? "");
  const content = String(component.get("text") ?? component.get("content") ?? "");
  const hasShadow = cardFlag(component.get("shadow"), true);
  const hasBorder = cardFlag(component.get("border"), true);
  const cardStyle = [
    "background-color:white",
    "border-radius:8px",
    "overflow:hidden",
    "width:100%",
    "height:100%",
    "display:flex",
    "flex-direction:column",
    hasShadow ? "box-shadow:0 2px 4px rgba(0,0,0,.1)" : "",
    hasBorder ? "border:1px solid #ddd" : ""
  ].filter(Boolean).join(";");
  const image = src ? tag2("div", { class: "card-image", style: "width:100%;height:200px;overflow:hidden;" }, `<img src="${escapeAttr2(src)}" alt="" style="width:100%;height:100%;object-fit:cover;">`) : "";
  const titleHtml = title ? tag2("h3", { class: "card-title", style: "margin:0 0 8px 0;font-size:18px;font-weight:bold;" }, escapeHtml2(title)) : "";
  const subtitleHtml = subtitle ? tag2("p", { class: "card-subtitle", style: "margin:0 0 12px 0;font-size:14px;color:#666;" }, escapeHtml2(subtitle)) : "";
  const contentHtml = content ? tag2("div", { class: "card-content", style: "font-size:14px;line-height:1.5;" }, escapeHtml2(content)) : "";
  const placeholder = !title && !subtitle && !content && !src && !children2 ? tag2("div", { style: "color:#ccc;text-align:center;font-style:italic;" }, "") : "";
  const body = tag2("div", { class: "card-body", style: `padding:${cssSize(component.get("padding")) ?? "16px"};flex:1;display:flex;flex-direction:column;justify-content:center;` }, titleHtml + subtitleHtml + contentHtml + children2 + placeholder);
  return tag2("div", { class: "card", style: cardStyle }, image + body);
}
function renderUiCard(options) {
  const src = sanitizeUrl(options.image, options.context.options);
  const title = options.title ? tag2("h3", { class: "ui-card__title" }, escapeHtml2(options.title)) : "";
  const subtitle = options.subtitle ? tag2("p", { class: "ui-card__text" }, escapeHtml2(options.subtitle)) : "";
  const bodyText = options.text ? tag2("p", { class: "ui-card__text" }, escapeHtml2(options.text)) : "";
  const footer = options.footer ? tag2("div", { class: "ui-card__footer" }, options.footer) : "";
  return tag2("div", { class: "ui-card" }, (src ? voidTag("img", { class: "ui-card__img", src, alt: options.title || "Card image" }) : "") + tag2("div", { class: "ui-card__body" }, title + subtitle + bodyText + (options.children ?? "") + footer));
}
function avatarSize(value) {
  const size = String(value ?? "medium").trim().toLowerCase();
  if (size === "small" || size === "sm") return "sm";
  if (size === "large" || size === "lg") return "lg";
  if (size === "extraLarge" || size === "xl") return "xl";
  return "md";
}
function renderAvatar(component, attrs, context) {
  const src = sanitizeUrl(component.get("src"), context.options);
  if (isShowcaseVariant(component)) {
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-avatar-host xa-ext-avatar-host--showcase"),
      tag2(
        "div",
        { class: "avatars-row", style: "margin-bottom:16px" },
        renderAvatarImage("xl", "https://i.pravatar.cc/72?img=47", "User", "online") + renderAvatarImage("lg", "https://i.pravatar.cc/56?img=12", "User", "away") + renderAvatarImage("md", "https://i.pravatar.cc/40?img=32", "User", "offline") + renderAvatarInitials("md", "DK", "background:linear-gradient(135deg,#7C6AF7,#A594FF)") + renderAvatarInitials("sm", "JL", "background:linear-gradient(135deg,#34D399,#6EE7B7)")
      ) + tag2(
        "div",
        { class: "av-group" },
        renderAvatarImage("md", "https://i.pravatar.cc/40?img=1", "") + renderAvatarImage("md", "https://i.pravatar.cc/40?img=2", "") + renderAvatarImage("md", "https://i.pravatar.cc/40?img=3", "") + renderAvatarImage("md", "https://i.pravatar.cc/40?img=4", "") + renderAvatarInitials("md", "+8", "background:var(--surface2);border:2px solid var(--surface);font-size:11px;color:var(--ink-2)")
      )
    );
  }
  const size = avatarSize(component.get("size"));
  const shape = String(component.get("shape") ?? "circle").trim().toLowerCase();
  const radius = shape === "square" ? "0" : shape === "rounded" ? "8px" : "50%";
  const initialStyle = [`background:${cssColor(component.get("backgroundColor")) ?? "#6c757d"}`, `color:${cssColor(component.get("color") ?? component.get("textColor")) ?? "white"}`, `border-radius:${radius}`].join(";");
  const image = src ? renderAvatarImage(size, src, String(component.get("alt") ?? component.get("initials") ?? ""), void 0, `border-radius:${radius}`) : renderAvatarInitials(size, String(component.get("initials") ?? component.get("text") ?? "\u{1F464}"), initialStyle);
  return tag2("div", attrsWithClass(attrs, "xa-ext-avatar-host xa-ext-avatar-host--single"), image);
}
function renderAvatarImage(size, src, alt, status, style) {
  const statusHtml = status ? tag2("span", { class: `av__status av__status--${status}` }, "") : "";
  return tag2("div", { class: "av" }, voidTag("img", { class: `av__img av__img--${size}`, src, alt, style }) + statusHtml);
}
function renderAvatarInitials(size, text, style) {
  return tag2("div", { class: "av" }, tag2("div", { class: `av__initials av__initials--${size}`, style }, escapeHtml2(text)));
}
function renderTabs(component, attrs, context, depth) {
  const suffix = isShowcaseVariant(component) ? showcaseIdSuffix(attrs, "tabs") : domIdFromAttrs(attrs);
  if (isShowcaseVariant(component)) {
    const firstTabs = [
      { title: "Overview", content: "Project overview with key metrics and milestones. Track progress across all workstreams and identify blockers early." },
      { title: "Analytics", content: "Deep-dive analytics with custom reports, conversion funnels, and retention cohorts. Export to CSV at any time." },
      { title: "Settings", content: "Configure integrations, manage team permissions, set notification rules, and customize your workspace theme." }
    ];
    const pillTabs = [
      { title: "All", content: "Showing all 42 items." },
      { title: "Active", content: "Showing 28 active items." },
      { title: "Archived", content: "Showing 14 archived items." }
    ];
    return tag2(
      "div",
      attrsWithClass(attrs, "xa-ext-tabs-host xa-ext-tabs-host--showcase"),
      renderTabsBlock(firstTabs, 0, `tabsNav_${suffix}`, "tabs-nav", context, depth, [`t1_${suffix}`, `t2_${suffix}`, `t3_${suffix}`]) + tag2("div", { style: "margin-top:20px" }, renderTabsBlock(pillTabs, 0, `pillTabsNav_${suffix}`, "tabs-nav tabs-nav--pill", context, depth, [`p1_${suffix}`, `p2_${suffix}`, `p3_${suffix}`]))
    );
  }
  const items = normalizeTabItems(component.get("items") ?? component.get("tabs"));
  if (!items.length) return tag2("div", attrsWithClass(attrs, "xa-ext-tabs-host xa-ext-tabs-host--single"), "");
  return renderSingleTabs(component, attrs, items, context, depth);
}
function renderSingleTabs(component, attrs, items, context, depth) {
  const activeId = String(component.get("activeId") ?? "").trim();
  const activeIndexById = activeId ? items.findIndex((item) => item.id === activeId) : -1;
  const activeIndex = activeIndexById >= 0 ? activeIndexById : Math.max(0, Math.min(items.length - 1, Number(component.get("activeIndex") ?? component.get("activeTab") ?? 0) || 0));
  const variant = normalizeTabsVariant(component.get("variant"));
  const layout = normalizeTabsLayout(component.get("headerLayout") ?? component.get("tabsLayout"));
  const position = normalizeTabsPosition(component.get("position") ?? component.get("tabPosition") ?? component.get("tabsPosition"));
  const key = String(attrs["data-key"] ?? "root");
  const isVertical = position === "left" || position === "right";
  const containerDir = position === "top" ? "column" : position === "bottom" ? "column-reverse" : position === "left" ? "row" : "row-reverse";
  const headerFlexDir = isVertical ? "column" : "row";
  const headerStyle = tabsHeaderStyle(variant, layout, position, headerFlexDir, isVertical);
  const headers = items.map((item, index2) => {
    const active = index2 === activeIndex;
    return tag2(
      "div",
      {
        class: `tab-header tab-header-${variant} tab-header-layout-${layout}${active ? " active" : ""}`,
        "data-tab": `${key}~content~${index2}`,
        "data-xcon-tabs-single-tab": "",
        "aria-selected": active ? "true" : "false",
        style: tabHeaderStyle(variant, layout, position, isVertical, active)
      },
      escapeHtml2(item.title)
    );
  }).join("");
  const panes = items.map((item, index2) => {
    const active = index2 === activeIndex;
    const content = isXconObject2(item.content) ? tag2("div", { class: "tab-content-inner", style: "position:relative;width:100%;height:100%;min-height:0;" }, renderComponent(item.content, context, depth, { parentFlow: true })) : escapeHtml2(String(item.content ?? ""));
    const style = isXconObject2(item.content) ? tabsPaneStyle(position, active, true) : tabsPaneStyle(position, active, false);
    return tag2("div", { class: "tab-content", id: `${key}~content~${index2}`, style }, content);
  }).join("");
  return tag2(
    "div",
    {
      ...attrsWithClass(attrs, "xa-ext-tabs-host xa-ext-tabs-host--single"),
      "data-tabs-variant": variant,
      "data-tabs-position": position
    },
    tag2(
      "div",
      { class: `tabs-container tabs-position-${position}`, style: `display:flex;flex-direction:${containerDir};width:100%;height:100%;overflow:hidden;` },
      tag2("div", { class: `tabs-header tabs-header-${variant} tabs-header-layout-${layout}`, style: headerStyle }, headers) + tag2("div", { class: "tabs-content", style: "flex:1;min-width:0;min-height:0;position:relative;overflow:hidden;" }, panes)
    )
  );
}
function normalizeTabsVariant(value) {
  const variant = String(value ?? "default").trim().toLowerCase();
  return variant === "pills" || variant === "underline" ? variant : "default";
}
function normalizeTabsLayout(value) {
  const layout = String(value ?? "auto").trim().toLowerCase();
  return layout === "full" || layout === "center" || layout === "end" ? layout : "auto";
}
function normalizeTabsPosition(value) {
  const position = String(value ?? "top").trim().toLowerCase();
  return position === "bottom" || position === "left" || position === "right" ? position : "top";
}
function tabsHeaderStyle(variant, layout, position, headerFlexDir, isVertical) {
  const borderColor = variant === "underline" ? "#e5e7eb" : "#ddd";
  const border = position === "bottom" ? `border-top:1px solid ${borderColor}` : position === "left" ? `border-right:1px solid ${borderColor}` : position === "right" ? `border-left:1px solid ${borderColor}` : `border-bottom:1px solid ${borderColor}`;
  const parts = ["display:flex", `flex-direction:${headerFlexDir}`, "flex-shrink:0"];
  if (variant !== "pills") parts.push(border);
  if (variant === "pills") parts.push("gap:4px");
  parts.push(isVertical ? "width:auto;min-width:100px" : "width:100%");
  if (layout === "center") parts.push("justify-content:center");
  if (layout === "end") parts.push("justify-content:flex-end");
  return `${parts.join(";")};`;
}
function tabHeaderStyle(variant, layout, position, isVertical, active) {
  const display = layout === "full" ? isVertical ? "flex:1;min-height:0;text-align:center" : "flex:1;min-width:0;text-align:center" : isVertical ? "display:block" : "display:inline-block";
  const margin = position === "bottom" ? "margin-top:-1px" : position === "left" ? "margin-right:-1px" : position === "right" ? "margin-left:-1px" : "margin-bottom:-1px";
  if (variant === "pills") {
    return `padding:8px 16px;cursor:pointer;${display};border:none;border-radius:20px;background-color:${active ? "#007bff" : "#e9ecef"};color:${active ? "white" : "#495057"};`;
  }
  if (variant === "underline") {
    const side = position === "bottom" ? "top" : position === "left" ? "right" : position === "right" ? "left" : "bottom";
    return `padding:8px 16px;cursor:pointer;${display};border:none;border-${side}:2px solid ${active ? "#007bff" : "transparent"};background-color:transparent;color:${active ? "#007bff" : "#6b7280"};${margin};border-radius:0;`;
  }
  const radius = position === "bottom" ? "0 0 4px 4px" : position === "left" ? "4px 0 0 4px" : position === "right" ? "0 4px 4px 0" : "4px 4px 0 0";
  return `padding:8px 16px;cursor:pointer;${display};border:1px solid #ddd;${margin};background-color:${active ? "#007bff" : "#f8f9fa"};color:${active ? "white" : "#333"};border-radius:${radius};`;
}
function tabsPaneStyle(position, active, layered) {
  const borderNone = position === "bottom" ? "border-bottom:none" : position === "left" ? "border-left:none" : position === "right" ? "border-right:none" : "border-top:none";
  if (!layered) return `display:${active ? "block" : "none"};padding:16px;border:1px solid #ddd;${borderNone};background-color:white`;
  return `display:${active ? "block" : "none"};position:absolute;top:0;left:0;right:0;bottom:0;padding:16px;border:1px solid #ddd;${borderNone};background-color:white;overflow:auto;box-sizing:border-box`;
}
function normalizeTabItems(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index2) => {
    const tab = isXconObject2(item) ? item : item && typeof item === "object" && !Array.isArray(item) ? fromJSONObject2(item) : fromJSONObject2({ title: item, content: item });
    const id2 = String(tab.get("id") ?? index2);
    return {
      id: id2,
      title: String(tab.get("title") ?? tab.get("label") ?? tab.get("id") ?? `Tab ${index2 + 1}`),
      content: tab.get("content") ?? ""
    };
  });
}
function renderTabsBlock(items, activeIndex, navId, navClass, context, depth, panelIds) {
  const tabId = (index2) => panelIds?.[index2] ?? `${navId}_tab_${index2}`;
  const buttons = items.map((item, index2) => tag2("button", { type: "button", class: `tab-btn${index2 === activeIndex ? " active" : ""}`, "data-tab": tabId(index2), "data-xcon-tabs-button": "", "aria-selected": index2 === activeIndex ? "true" : "false" }, escapeHtml2(item.title))).join("");
  const panels = items.map((item, index2) => {
    const body = isXconObject2(item.content) ? renderComponent(item.content, context, depth, { parentFlow: true }) : escapeHtml2(String(item.content ?? ""));
    return tag2("div", { class: `tab-content${index2 === activeIndex ? " active" : ""}`, id: tabId(index2) }, tag2("div", { class: "tab-panel-inner" }, body));
  }).join("");
  return tag2("div", { class: "tabs-wrap", "data-xcon-tabs": "" }, tag2("div", { class: navClass, id: navId, "data-xcon-tabs-nav": "" }, buttons) + panels);
}
function renderAccordion(component, attrs, context, depth) {
  const showcase = isShowcaseVariant(component);
  const items = showcase ? [
    fromJSONObject2({ title: "What is a design system?", content: "A design system is a collection of reusable components, guided by clear standards, that can be assembled to build any number of applications." }),
    fromJSONObject2({ title: "How to handle component states?", content: "Components can exist in multiple states: default, hover, focus, active, disabled, loading, and error. Each state should be visually distinct." }),
    fromJSONObject2({ title: "Accessibility best practices", content: "Ensure sufficient color contrast, provide keyboard navigation, use semantic HTML elements, and include ARIA labels where needed." })
  ] : component.get("items");
  if (!Array.isArray(items)) return tag2("div", attrs, "");
  const open = component.get("defaultOpen");
  const openSet = new Set(Array.isArray(open) ? open.map(String) : []);
  if (!showcase) return renderSingleAccordion(component, attrs, items, openSet, context, depth);
  const suffix = showcaseIdSuffix(attrs, "accordion");
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-accordion-host xa-ext-accordion-host--showcase"),
    items.map((item, index2) => {
      const section = isXconObject2(item) ? item : fromJSONObject2({ title: item, content: item });
      const id2 = String(section.get("id") ?? index2);
      const content = section.get("content");
      const expanded = openSet.has(id2) || openSet.has(String(index2)) || index2 === 0;
      const body = isXconObject2(content) ? renderComponent(content, context, depth, { parentFlow: true }) : escapeHtml2(String(content ?? ""));
      return tag2(
        "div",
        { class: `accordion-item${expanded ? " open" : ""}`, id: `acc${index2 + 1}_${suffix}` },
        tag2(
          "button",
          { type: "button", class: `accordion-trigger has-children${expanded ? " expanded" : ""}`, "data-xcon-accordion-toggle": "", "aria-expanded": expanded ? "true" : "false" },
          escapeHtml2(String(section.get("title") ?? id2)) + '<svg class="accordion-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>'
        ) + tag2("div", { class: "accordion-body" }, tag2("div", { class: "accordion-body-inner" }, body))
      );
    }).join("")
  );
}
function renderSingleAccordion(component, attrs, items, openSet, context, depth) {
  const key = String(attrs["data-key"] ?? "root");
  const multiple = isTruthy(component.get("multiple"));
  const itemHtml = items.map((item, index2) => {
    const section = isXconObject2(item) ? item : fromJSONObject2({ title: item, content: item });
    const id2 = String(section.get("id") ?? index2);
    const content = section.get("content");
    const expanded = openSet.has(id2) || openSet.has(String(index2));
    const body = isXconObject2(content) ? renderComponent(content, context, depth, { parentFlow: true }) : escapeHtml2(String(content ?? ""));
    const itemStyle = `border:1px solid #e9ecef;border-bottom:${index2 === items.length - 1 ? "1px solid #e9ecef" : "none"};`;
    const headerStyle = "padding:12px 16px;background-color:#f8f9fa;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9ecef;";
    const arrowStyle = `transition:transform .3s ease;transform:${expanded ? "rotate(90deg)" : "rotate(0deg)"};`;
    const contentStyle = `display:${expanded ? "block" : "none"};padding:16px;background-color:white;`;
    return tag2(
      "div",
      { class: "accordion-item", style: itemStyle },
      tag2(
        "div",
        {
          class: "accordion-header",
          "data-xcon-accordion-toggle": "",
          "data-xcon-accordion-index": String(index2),
          "data-xcon-accordion-multiple": multiple ? "true" : "false",
          "aria-expanded": expanded ? "true" : "false",
          style: headerStyle
        },
        tag2("span", { style: "font-weight:500;" }, escapeHtml2(String(section.get("title") ?? `Item ${index2 + 1}`))) + tag2("span", { class: "accordion-arrow", style: arrowStyle }, "\u25B6")
      ) + tag2("div", { class: "accordion-content", id: `${key}~content~${index2}`, style: contentStyle }, body)
    );
  }).join("");
  return tag2(
    "div",
    attrsWithClass(attrs, "xa-ext-accordion-host xa-ext-accordion-host--single"),
    tag2("div", { class: "accordion-container", style: "border-radius:4px;overflow:hidden;" }, itemHtml)
  );
}
function buildStyle(component, state, options = {}) {
  const declarations = [];
  const pos = rectParts(component.get("pos"));
  const autoLayout = usesFlowLayout(component);
  const al = component.get("al");
  const flowSizing = state.parentFlow || Boolean(options.isRoot) && autoLayout;
  if (state.fillParent) {
    declarations.push("width:100%", "height:100%", "min-height:0", "max-width:100%");
  } else if (pos) {
    if (flowSizing) {
      if (hasExplicitAutoLayoutWidth(component)) {
      } else if (isDefaultDraftFlowWidth(pos[2])) {
        declarations.push("width:auto", "max-width:100%", "min-width:0");
      } else {
        appendCss(declarations, "width", cssSize(pos[2]));
      }
      if (autoLayout && isPanelFixedHeight(component)) {
        appendCss(declarations, "height", cssSize(pos[3]));
        appendCss(declarations, "min-height", cssSize(pos[3]));
      } else if (!autoLayout || !isXconObject2(al) || !isTruthy(al.get("autoHeight"))) {
        appendCss(declarations, "min-height", cssSize(pos[3]));
      }
    } else {
      declarations.push("position:absolute", `left:${numberPx(pos[0])}`, `top:${numberPx(pos[1])}`, `width:${numberPx(pos[2])}`, `height:${numberPx(pos[3])}`);
    }
  }
  if ((options.includeAutoLayout ?? true) && autoLayout) appendAutoLayout(declarations, component);
  if (isVerticalScroll(component)) appendCss(declarations, "overflow", "auto");
  const type2 = component.getString("type", "");
  if (type2 === "progressBar") {
    appendCss(declarations, "background-color", cssColor(component.get("bgColor")));
  } else if (type2 === "spinner") {
    appendCss(declarations, "background-color", cssColor(component.get("backgroundColor") ?? component.get("bgColor")));
  } else {
    appendCss(declarations, "background-color", cssColor(component.get("backgroundColor") ?? component.get("bgColor")));
    appendCss(declarations, "color", cssColor(component.get("color")));
  }
  appendSpacing(declarations, "margin", component.get("margin"));
  appendSpacing(declarations, "padding", component.get("padding"));
  if (!component.contains("padding")) appendSpacing(declarations, "padding", component.get("labelPadding"));
  const font = component.get("font");
  if (isXconObject2(font)) {
    appendCss(declarations, "font-family", font.get("family"));
    appendCss(declarations, "font-size", cssSize(font.get("size")));
    appendCss(declarations, "font-weight", font.get("weight") ?? (isTruthy(font.get("bold")) ? "bold" : void 0));
    appendCss(declarations, "font-style", font.get("style") ?? (isTruthy(font.get("italic")) ? "italic" : void 0));
    appendCss(declarations, "line-height", font.get("lineHeight"));
  }
  appendCss(declarations, "font-weight", isTruthy(component.get("bold")) ? "bold" : void 0);
  appendCss(declarations, "font-style", isTruthy(component.get("italic")) ? "italic" : void 0);
  appendCss(declarations, "line-height", component.get("lineHeight"));
  appendCss(declarations, "text-decoration", textDecoration(component));
  const border = component.get("border");
  const borderWidthValue = isXconObject2(border) ? border.get("width") ?? component.get("borderWidth") : component.get("borderWidth");
  if (isXconObject2(border) && !isFalseLike(border.get("visible"))) {
    if (String(borderWidthValue) === "-1") appendIndividualBorders(declarations, component, border);
    else {
      appendCss(declarations, "border-width", cssSize(borderWidthValue ?? 1));
      appendCss(declarations, "border-style", border.get("style") ?? component.get("borderStyle") ?? "solid");
      appendCss(declarations, "border-color", cssColor(border.get("color") ?? component.get("borderColor")) ?? "var(--border2)");
    }
  } else if (border === true) {
    if (String(borderWidthValue) === "-1") appendIndividualBorders(declarations, component);
    else declarations.push("border:1px solid #E5E7EB");
  }
  appendExplicitIndividualBorders(declarations, component, isXconObject2(border) ? border : void 0);
  const shadow = component.get("shadow");
  if (isXconObject2(shadow) && !isFalseLike(shadow.get("visible"))) {
    declarations.push(`box-shadow:${shadowCss(shadow)}`);
  } else if (shadow === true) {
    declarations.push(`box-shadow:${legacyShadowCss(component)}`);
  }
  appendCss(declarations, "border-radius", cssSize(component.get("borderRadius") ?? component.get("round")) ?? (isXconObject2(border) ? cssSize(border.get("radius")) : void 0));
  appendCss(declarations, "text-align", component.get("textAlign"));
  appendCss(declarations, "vertical-align", component.get("textVerticalAlign"));
  appendCss(declarations, "white-space", component.get("whiteSpace"));
  appendCss(declarations, "overflow", component.get("overflow"));
  appendCss(declarations, "object-fit", component.get("objectFit"));
  appendCss(declarations, "object-position", component.get("objectPosition"));
  return declarations.join(";");
}
function appendAutoLayout(declarations, component) {
  const al = component.get("al");
  if (!isXconObject2(al)) return;
  declarations.push("display:flex");
  appendCss(declarations, "flex-direction", normalizeDirection(al.get("direction") ?? component.get("direction") ?? "column"));
  appendCss(declarations, "gap", cssSize(al.get("gap") ?? component.get("gap")));
  appendSpacing(declarations, "padding", al.get("padding") ?? component.get("padding"));
  appendCss(declarations, "align-items", al.get("alignItems") ?? component.get("alignItems") ?? component.get("align"));
  appendCss(declarations, "justify-content", al.get("justifyContent") ?? component.get("justifyContent") ?? component.get("justify"));
  appendCss(declarations, "flex-wrap", al.get("wrap") ?? component.get("wrap"));
  appendCss(declarations, "flex", al.get("flex") ?? component.get("flex"));
  appendCss(declarations, "align-self", al.get("alignSelf") ?? component.get("alAlignSelf"));
  appendCss(declarations, "width", al.get("width") ?? component.get("alWidth"));
  appendCss(declarations, "min-width", al.get("minWidth"));
  appendCss(declarations, "max-width", al.get("maxWidth") ?? component.get("maxWidth"));
  appendCss(declarations, "min-height", al.get("minHeight"));
  appendCss(declarations, "max-height", al.get("maxHeight") ?? component.get("maxHeight"));
  appendCss(declarations, "overflow", al.get("overflow") ?? component.get("overflow"));
}
function componentOrder(components) {
  const order = components.get("componentsOrder");
  if (typeof order !== "string") return [];
  return order.split(",").map((key) => key.trim()).filter(Boolean);
}
function usesFlowLayout(component) {
  return isXconObject2(component.get("al"));
}
function isDefaultDraftFlowWidth(value) {
  const width = Number(value);
  return width === 560 || width === 520;
}
function hasExplicitAutoLayoutWidth(component) {
  const al = component.get("al");
  return isXconObject2(al) && al.get("width") !== void 0 && al.get("width") !== null && String(al.get("width")).trim() !== "";
}
function isSequentialContainer(type2) {
  return type2 === "stack" || type2 === "flexBox" || type2 === "grid" || type2 === "list" || type2 === "tabs" || type2 === "accordion";
}
function isVerticalScroll(component) {
  const scroll = component.get("scroll");
  return scroll === true || scroll === "vertical" || scroll === "both";
}
function rectParts(value) {
  if (Array.isArray(value) && value.length === 4) {
    const parts2 = value.map(Number);
    return parts2.every(Number.isFinite) ? parts2 : null;
  }
  if (typeof value !== "string") return null;
  const parts = value.split(",").map((part) => Number(part.trim()));
  return parts.length === 4 && parts.every(Number.isFinite) ? parts : null;
}
function pointParts(value) {
  if (Array.isArray(value) && value.length >= 2) {
    const parts2 = value.slice(0, 2).map(Number);
    return parts2.every(Number.isFinite) ? parts2 : null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.replace(/^\s*\[|\]\s*$/g, "");
  const parts = normalized.split(",").map((part) => Number(part.trim())).slice(0, 2);
  return parts.length === 2 && parts.every(Number.isFinite) ? parts : null;
}
function lineStrokeWidth(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0.5, Math.min(parsed, 32));
}
function lineMarker(value) {
  const marker = String(value ?? "").trim().toLowerCase();
  return marker === "arrow" ? "arrow" : null;
}
function lineCap(value) {
  const cap = String(value ?? "round").trim().toLowerCase();
  return cap === "butt" || cap === "square" || cap === "round" ? cap : "round";
}
function lineDashArray(value, strokeWidth) {
  const style = String(value ?? "").trim().toLowerCase();
  if (!style || style === "solid" || style === "none") return void 0;
  if (style === "dashed" || style === "dash") return `${trimNumber(strokeWidth * 3)} ${trimNumber(strokeWidth * 3)}`;
  if (style === "dotted" || style === "dot") return `${trimNumber(strokeWidth)} ${trimNumber(strokeWidth * 2)}`;
  return safeCssValue2(value);
}
function normalizeDirection(value) {
  const direction = String(value ?? "column");
  if (direction === "vertical") return "column";
  if (direction === "horizontal") return "row";
  return direction;
}
function isTruthy(value) {
  return value === true || value === "true" || value === 1 || value === "1" || value === "checked";
}
function isFalseLike(value) {
  return value === false || value === "false" || value === 0 || value === "0" || value === "none" || value === "hidden";
}
function cssEscapeIdentifier(id2) {
  return id2.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}
function stackDirection(component) {
  return normalizeDirection(component.get("direction") ?? "column");
}
function flexStyle(component) {
  return [
    `flex-direction:${normalizeDirection(component.get("direction") ?? "row")}`,
    `justify-content:${attr(component.get("justify") ?? "flex-start")}`,
    `align-items:${attr(component.get("align") ?? "stretch")}`,
    `flex-wrap:${attr(component.get("wrap") ?? "nowrap")}`,
    `gap:${cssSize(component.get("gap")) ?? "8px"}`
  ].join(";");
}
function gridStyle(component) {
  const columns = component.get("columns") ?? 3;
  const template = typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : String(columns);
  return `grid-template-columns:${template};gap:${cssSize(component.get("gap")) ?? "16px"}`;
}
function appendCss(declarations, property, value) {
  if (value === void 0 || value === null || value === "") return;
  declarations.push(`${property}:${String(value)}`);
}
function appendSpacing(declarations, property, value) {
  if (value === void 0 || value === null || value === "") return;
  if (typeof value === "number" || typeof value === "string") {
    declarations.push(`${property}:${cssSize(value)}`);
    return;
  }
  if (Array.isArray(value)) {
    declarations.push(`${property}:${value.map((item) => cssSize(item)).join(" ")}`);
  }
}
function cssSize(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value === "number") return `${value}px`;
  const text = String(value).trim();
  return /^-?\d+(?:\.\d+)?$/.test(text) ? `${text}px` : text;
}
function numberPx(value) {
  return `${Number(value) || 0}px`;
}
function cssColor(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  const themed = expandThemeTokenAliases(trimmed);
  if (themed !== trimmed) return themed;
  const rgba2 = trimmed.split(",").map((part) => Number(part.trim()));
  if (rgba2.length === 3 && rgba2.every((part) => Number.isFinite(part))) {
    return `rgb(${rgba2[0]} ${rgba2[1]} ${rgba2[2]})`;
  }
  if (rgba2.length === 4 && rgba2.every((part) => Number.isFinite(part))) {
    const alpha = rgba2[3] > 1 ? Math.max(0, Math.min(1, rgba2[3] / 255)) : Math.max(0, Math.min(1, rgba2[3]));
    return `rgb(${rgba2[0]} ${rgba2[1]} ${rgba2[2]} / ${alpha})`;
  }
  return trimmed;
}
function expandThemeTokenAliases(value) {
  return value.replace(themeTokenAliasPattern, (_match, prefix, token) => `${prefix}var(--${token})`);
}
function fontValue(component, key) {
  const font = component.get("font");
  if (isXconObject2(font)) {
    const nested = font.get(key);
    if (nested !== void 0 && nested !== null && nested !== "") return nested;
  } else if (key === "family" && typeof font === "string" && font.trim()) {
    return font;
  }
  const directKeys = {
    family: ["fontFamily"],
    size: ["fontSize"],
    weight: ["fontWeight"],
    style: ["fontStyle"],
    bold: ["bold"],
    italic: ["italic"],
    lineHeight: ["lineHeight"]
  };
  for (const directKey of directKeys[key] ?? []) {
    const value = component.get(directKey);
    if (value !== void 0 && value !== null && value !== "") return value;
  }
  return void 0;
}
function textDecoration(component) {
  const decorations = [];
  const font = component.get("font");
  if (isTruthy(component.get("underline")) || isXconObject2(font) && isTruthy(font.get("underline"))) decorations.push("underline");
  if (isTruthy(component.get("strikethrough")) || isXconObject2(font) && isTruthy(font.get("strikethrough"))) decorations.push("line-through");
  return decorations.length ? decorations.join(" ") : void 0;
}
function borderRadius(component) {
  const direct = component.get("borderRadius") ?? component.get("round") ?? component.get("radius");
  if (direct !== void 0 && direct !== null && direct !== "") return cssSize(direct);
  const border = component.get("border");
  if (isXconObject2(border)) return cssSize(border.get("radius"));
  return void 0;
}
function borderCss(component) {
  const border = component.get("border");
  if (isXconObject2(border)) {
    if (isFalseLike(border.get("visible"))) return "none";
    const width = cssSize(border.get("width") ?? component.get("borderWidth") ?? 1) ?? "1px";
    const style = attr(border.get("style") ?? component.get("borderStyle") ?? "solid") ?? "solid";
    const color2 = cssColor(border.get("color") ?? component.get("borderColor")) ?? "var(--border2)";
    return `${width} ${style} ${color2}`;
  }
  if (border === true || border === "true" || border === 1 || border === "1") {
    return `${cssSize(component.get("borderWidth") ?? 1) ?? "1px"} ${attr(component.get("borderStyle") ?? "solid")} ${cssColor(component.get("borderColor")) ?? "var(--border2)"}`;
  }
  return "none";
}
var BORDER_SIDE_DEFINITIONS = [
  ["border-left", "borderLeft"],
  ["border-top", "borderTop"],
  ["border-right", "borderRight"],
  ["border-bottom", "borderBottom"]
];
function borderSideDeclaration(component, sideKey, border, fallbackWidth) {
  const style = attr(border?.get("style") ?? component.get("borderStyle") ?? "solid") ?? "solid";
  const raw = component.get(sideKey);
  if (isXconObject2(raw)) {
    if (isFalseLike(raw.get("visible"))) return "none";
    const width = cssSize(raw.get("width") ?? fallbackWidth ?? 1) ?? "1px";
    const sideStyle = attr(raw.get("style") ?? style) ?? style;
    const sideColor = cssColor(raw.get("color") ?? border?.get("color") ?? component.get("borderColor")) ?? "var(--border2)";
    return `${width} ${sideStyle} ${sideColor}`;
  }
  const widthSource = raw ?? fallbackWidth;
  if (widthSource === void 0 || widthSource === null || widthSource === "") return void 0;
  if (isFalseLike(widthSource)) return "none";
  const color2 = cssColor(border?.get("color") ?? component.get("borderColor")) ?? "var(--border2)";
  return `${cssSize(widthSource) ?? "1px"} ${style} ${color2}`;
}
function appendIndividualBorders(declarations, component, border) {
  BORDER_SIDE_DEFINITIONS.forEach(([cssName, sideKey]) => {
    appendCss(declarations, cssName, borderSideDeclaration(component, sideKey, border, 1));
  });
}
function appendExplicitIndividualBorders(declarations, component, border) {
  BORDER_SIDE_DEFINITIONS.forEach(([cssName, sideKey]) => {
    if (component.contains(sideKey)) {
      appendCss(declarations, cssName, borderSideDeclaration(component, sideKey, border));
    }
  });
}
function shadowCss(shadow) {
  const x2 = Number(shadow.get("x") ?? 0);
  const y2 = Number(shadow.get("y") ?? 2);
  const blur = Number(shadow.get("blur") ?? 8);
  const spread = Number(shadow.get("spread") ?? 0);
  const color2 = cssColorWithOpacity(shadow.get("color"), shadow.get("opacity")) ?? "rgb(0 0 0 / 0.12)";
  return `${x2}px ${y2}px ${blur}px ${spread}px ${color2}`;
}
function legacyShadowCss(component) {
  const y2 = Number(component.get("shadowBlur") ?? 2);
  const blur = Number(component.get("shadowRadius") ?? 8);
  const color2 = cssColorWithOpacity(component.get("shadowColor"), component.get("shadowOpacity")) ?? "rgba(0,0,0,.12)";
  return `0 ${y2}px ${blur}px ${color2}`;
}
function cssColorWithOpacity(colorValue, opacityValue) {
  const opacity = opacityValue === void 0 || opacityValue === null || opacityValue === "" ? void 0 : Number(opacityValue);
  const color2 = cssColor(colorValue ?? "0,0,0,255");
  if (opacity === void 0 || !Number.isFinite(opacity)) return color2;
  if (typeof colorValue === "string") {
    const rgba2 = colorValue.trim().split(",").map((part) => Number(part.trim()));
    if ((rgba2.length === 3 || rgba2.length === 4) && rgba2.every((part) => Number.isFinite(part))) {
      return `rgb(${rgba2[0]} ${rgba2[1]} ${rgba2[2]} / ${Math.max(0, Math.min(1, opacity))})`;
    }
  }
  if (colorValue === void 0 || colorValue === null || colorValue === "") {
    return `rgb(0 0 0 / ${Math.max(0, Math.min(1, opacity))})`;
  }
  return color2;
}
function verticalAlign(component) {
  const value = String(component.get("textVerticalAlign") ?? component.get("verticalAlign") ?? component.get("textVAlign") ?? component.get("valign") ?? "middle").toLowerCase();
  if (value === "top") return "flex-start";
  if (value === "bottom") return "flex-end";
  return "center";
}
function justifyFromTextAlign(value, fallback = "center") {
  const textAlign = String(value ?? fallback).toLowerCase();
  if (textAlign === "left" || textAlign === "start") return "flex-start";
  if (textAlign === "right" || textAlign === "end") return "flex-end";
  if (textAlign === "justify") return "space-between";
  return "center";
}
function linesToBreaks(value) {
  return value.split("\n").map((line) => escapeHtml2(line)).join("<br>");
}
function joinStyles(...styles) {
  const joined = styles.filter(Boolean).join(";").replaceAll(/;+/g, ";").replace(/^;|;$/g, "");
  return joined || void 0;
}
function tag2(name, attrs, body) {
  return `<${name}${renderAttrs2(attrs)}>${body}</${name}>`;
}
function voidTag(name, attrs) {
  return `<${name}${renderAttrs2(attrs)}>`;
}
function renderAttrs2(attrs) {
  return Object.entries(attrs).filter(([, value]) => value !== void 0 && value !== null).map(([name, value]) => value === "" && name !== "value" ? ` ${name}` : ` ${name}="${escapeAttr2(String(value))}"`).join("");
}
function attr(value) {
  if (value === void 0 || value === null) return void 0;
  return String(value);
}
function classToken(value) {
  if (typeof value !== "string") return void 0;
  const token = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return token || void 0;
}
function escapeHtml2(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function escapeAttr2(value) {
  return escapeHtml2(value).replaceAll("`", "&#96;");
}
function sanitizeHtml(value) {
  return value.replaceAll(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, "").replaceAll(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>`]+)/gi, "").replaceAll(/\s(?:href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s"'<>`]+)/gi, "").replaceAll(/javascript:/gi, "");
}
export {
  parseBySyntax,
  render,
  viewerCss
};
