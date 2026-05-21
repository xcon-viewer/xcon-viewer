import {
  fromJSONObject,
  isXconObject,
  serializeBySyntax,
  type XconObject,
  type XconSyntax,
} from '@xcon-viewer/core';

export interface XconViewerProps {
  src?: string;
  content?: string;
  document?: XconObject | Record<string, unknown>;
  syntax?: XconSyntax;
  allowExternalResources?: boolean;
  className?: string;
  style?: Record<string, string | number>;
  key?: string | number | null;
}

export interface ReactElementLike {
  $$typeof: symbol;
  type: 'xcon-viewer';
  key: string | null;
  ref: null;
  props: Record<string, unknown>;
}

export type ReactCreateElement = (
  type: string,
  props?: Record<string, unknown>,
  ...children: unknown[]
) => unknown;

export const XconViewerElementName = 'xcon-viewer';

export function toXconViewerAttributes(props: XconViewerProps): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  if (props.src) attributes.src = props.src;
  const content = props.content ?? serializeDocument(props.document, props.syntax ?? 'json');
  if (content) attributes.content = content;
  if (props.allowExternalResources) attributes['allow-external-resources'] = true;
  if (props.className) attributes.className = props.className;
  if (props.style) attributes.style = props.style;
  return attributes;
}

export function XconViewer(props: XconViewerProps): ReactElementLike {
  return {
    $$typeof: Symbol.for('react.element'),
    type: XconViewerElementName,
    key: props.key == null ? null : String(props.key),
    ref: null,
    props: toXconViewerAttributes(props),
  };
}

export function createXconViewer(createElement: ReactCreateElement): (props: XconViewerProps) => unknown {
  return (props) => createElement(XconViewerElementName, toXconViewerAttributes(props));
}

export async function defineXconViewer(): Promise<void> {
  if (typeof HTMLElement === 'undefined' || typeof customElements === 'undefined') return;
  await import('@xcon-viewer/viewer/web-component');
}

function serializeDocument(document: XconViewerProps['document'], syntax: XconSyntax): string | undefined {
  if (!document) return undefined;
  const object = isXconObject(document) ? document : fromJSONObject(document);
  return serializeBySyntax(object, syntax, true);
}
