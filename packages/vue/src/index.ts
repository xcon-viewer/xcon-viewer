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
}

export type VueH = (type: string, props?: Record<string, unknown>, children?: unknown) => unknown;

export const XconViewerElementName = 'xcon-viewer';

export function toXconViewerAttrs(props: XconViewerProps): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  if (props.src) attrs.src = props.src;
  const content = props.content ?? serializeDocument(props.document, props.syntax ?? 'json');
  if (content) attrs.content = content;
  if (props.allowExternalResources) attrs['allow-external-resources'] = '';
  return attrs;
}

export function createXconViewerComponent(h: VueH): Record<string, unknown> {
  return {
    name: 'XconViewer',
    props: {
      src: String,
      content: String,
      document: Object,
      syntax: String,
      allowExternalResources: Boolean,
    },
    setup(props: XconViewerProps, context: { attrs?: Record<string, unknown>; slots?: { default?: () => unknown } }) {
      return () =>
        h(
          XconViewerElementName,
          { ...toXconViewerAttrs(props), ...(context.attrs ?? {}) },
          context.slots?.default?.(),
        );
    },
  };
}

export const XconViewer = createXconViewerComponent((type, props, children) => ({ type, props, children }));

export async function defineXconViewer(): Promise<void> {
  if (typeof HTMLElement === 'undefined' || typeof customElements === 'undefined') return;
  await import('@xcon-viewer/viewer/web-component');
}

function serializeDocument(document: XconViewerProps['document'], syntax: XconSyntax): string | undefined {
  if (!document) return undefined;
  const object = isXconObject(document) ? document : fromJSONObject(document);
  return serializeBySyntax(object, syntax, true);
}
