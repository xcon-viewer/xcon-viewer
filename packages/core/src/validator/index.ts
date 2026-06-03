import { isXconObject, normalize, XconObject } from '../model/index.js';

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationOptions {
  trustedRendererPolicy?: boolean;
}

const publicComponentTypes = new Set([
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
]);

const viewerOnlyProps = new Set([
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
  'onShowEffect',
  'onHideEffect',
]);

export function validate(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const root = isXconObject(input) ? input : input instanceof Object ? new XconObject(input as Record<string, unknown>) : null;

  if (!root) {
    errors.push(issue('', 'XCON document must be an object.'));
    return { valid: false, errors, warnings };
  }

  validateComponent(root, '', errors, warnings, options);
  return { valid: errors.length === 0, errors, warnings };
}

function validateComponent(
  component: XconObject,
  path: string,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  options: ValidationOptions,
): void {
  const type = component.get('type');
  if (typeof type !== 'string' || !type) {
    errors.push(issue(pathOf(path, 'type'), 'Component requires a string type.'));
  } else if (!publicComponentTypes.has(type)) {
    errors.push(issue(pathOf(path, 'type'), `Unknown public component type "${type}".`));
  }

  component.forEach((value, key) => {
    const currentPath = pathOf(path, key);
    if (isViewerOnlyProp(key)) {
      errors.push(issue(currentPath, `Viewer-only or executable property "${key}" is not allowed.`));
    }
    if ((key === 'src' || key === 'backgroundImage') && typeof value === 'string' && isUnsafeUrl(value)) {
      errors.push(issue(currentPath, `Unsafe URL is not allowed: ${value}`));
    }
    if ((key === 'html' || key === 'renderHtml') && value === true && !options.trustedRendererPolicy) {
      warnings.push(issue(currentPath, 'Raw HTML rendering requires an explicit trusted renderer policy.', 'warning'));
    }
  });

  validateRect(component.get('pos'), pathOf(path, 'pos'), errors);
  validateSize(component.get('contentSize'), pathOf(path, 'contentSize'), errors);
  validateChildren(component.get('components'), pathOf(path, 'components'), errors, warnings, options);
  validateNestedComponents(component.get('items'), pathOf(path, 'items'), errors, warnings, options);
  validateNestedComponents(component.get('slides'), pathOf(path, 'slides'), errors, warnings, options);
  validateNestedComponents(component.get('content'), pathOf(path, 'content'), errors, warnings, options);
  validateNestedComponents(component.get('templates'), pathOf(path, 'templates'), errors, warnings, options);
}

function validateChildren(
  children: unknown,
  path: string,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  options: ValidationOptions,
): void {
  if (children === undefined || children === null) return;
  if (!isXconObject(children)) {
    errors.push(issue(path, 'components must be an object dictionary.'));
    return;
  }
  children.forEach((child, key) => {
    if (key === 'componentsOrder') return;
    if (isXconObject(child)) validateComponent(child, pathOf(path, key), errors, warnings, options);
    else errors.push(issue(pathOf(path, key), 'Component child must be an object.'));
  });
}

function validateNestedComponents(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  options: ValidationOptions,
): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNestedComponents(item, `${path}._items(${index})`, errors, warnings, options));
    return;
  }
  if (!isXconObject(value)) return;
  if (typeof value.get('type') === 'string') {
    validateComponent(value, path, errors, warnings, options);
    return;
  }
  value.forEach((child, key) => {
    validateNestedComponents(child, pathOf(path, key), errors, warnings, options);
  });
}

function validateRect(value: unknown, path: string, errors: ValidationIssue[]): void {
  if (value === undefined || value === null) return;
  if (isRectArray(value) || isRectString(value)) return;
  errors.push(issue(path, 'pos must be [x, y, width, height] numbers or a comma-separated "x,y,width,height" string.'));
}

function isRectArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

function isRectString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parts = value.split(',').map((part) => Number(part.trim()));
  return parts.length === 4 && parts.every(Number.isFinite);
}

function validateSize(value: unknown, path: string, errors: ValidationIssue[]): void {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value) || value.length !== 2 || value.some((item) => typeof item !== 'number')) {
    errors.push(issue(path, 'contentSize must be [width, height] numbers.'));
  }
}

function isViewerOnlyProp(key: string): boolean {
  return viewerOnlyProps.has(key) || /^on[A-Z]/.test(key) || /_ref$/i.test(key) || /ActionRef$/i.test(key);
}

function isUnsafeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html') || /<script\b/i.test(value);
}

function issue(path: string, message: string, severity: 'error' | 'warning' = 'error'): ValidationIssue {
  return { path, message, severity };
}

function pathOf(base: string, key: string): string {
  return base ? `${base}.${key}` : key;
}

export function printValidationResult(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) return 'XCON document is valid.';
  const lines = [
    ...result.errors.map((error) => `error ${error.path}: ${error.message}`),
    ...result.warnings.map((warning) => `warning ${warning.path}: ${warning.message}`),
  ];
  return lines.join('\n');
}

export function normalizedForValidation(input: unknown): unknown {
  return normalize(input);
}
