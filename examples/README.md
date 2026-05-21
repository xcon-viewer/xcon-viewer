# XCON Examples

These examples are generated from public XCON/JSON source objects. Each generated example provides JSON, semantic XML, and TAGLESS forms for the same screen. The `sketch` example shows the compact XCON/SKETCH authoring syntax.

## Example Index

| Path | Title | Description |
|---|---|---|
| [hello](./hello/README.md) | Hello | Smallest renderable XCON document. |
| [button](./button/README.md) | Button | Single primary button with state styles. |
| [form](./form/README.md) | Contact Form | Public form controls without executable app logic. |
| [card-list](./card-list/README.md) | Card List | List with card-like repeated items. |
| [layout-stack](./layout-stack/README.md) | Stack Layout | Column stack with public gap and item components. |
| [nested](./nested/README.md) | Nested Components | Nested panel, labels, progress, and buttons. |
| [style](./style/README.md) | Style Groups | Font, border, shadow, and shape style groups. |
| [designer-metadata](./designer-metadata/README.md) | Designer Metadata | Semantic XML can preserve designer namespaced attributes. |
| [tagless-custom-marker](./tagless-custom-marker/README.md) | TAGLESS Custom Marker | Same XCON object serialized with a custom marker set. |
| [syntax-comparison](./syntax-comparison/README.md) | Syntax Comparison | One screen represented as JSON, XML, and TAGLESS. |
| [invalid](./invalid/README.md) | Invalid Document | Invalid example expected to fail validation. |
| [components/basic](./components/basic/README.md) | Basic Components | label, button, badge, icon, divider, and avatar. |
| [components/input-controls](./components/input-controls/README.md) | Input Controls | Form input components with public prop names. |
| [components/media](./components/media/README.md) | Media Components | Image, video, banner, carousel, and gallery. |
| [components/layout](./components/layout/README.md) | Layout Components | Panel, list, tabs, accordion, grid, flexBox, stack, spacer, and card. |
| [components/feedback-display](./components/feedback-display/README.md) | Feedback and Display | Alert, progress, spinner, tooltip, modal, and rating. |
| [components/data-codes](./components/data-codes/README.md) | Data and Code Components | Tree view, QR code, and barcode. |
| [workflows/login](./workflows/login/README.md) | Login Workflow | Typical login screen. |
| [workflows/checkout](./workflows/checkout/README.md) | Checkout Workflow | Checkout summary with form controls and totals. |
| [workflows/dashboard](./workflows/dashboard/README.md) | Operations Dashboard | KPI dashboard with cards, progress, and alerts. |
| [workflows/profile](./workflows/profile/README.md) | Profile Workflow | Profile settings with avatar, fields, and toggles. |
| [workflows/support-ticket](./workflows/support-ticket/README.md) | Support Ticket Workflow | Ticket submission with severity and details. |
| [sketch](./sketch/README.md) | XCON/SKETCH | Compact authoring syntax for Markdown and LLM-generated examples. |
| [showcase](./showcase/README.md) | Public Showcase Fixtures | Public component and screen fixtures copied from the viewer compatibility suite. |

## Groups

- Root examples: smallest examples and syntax comparisons.
- `components/*`: component-oriented catalogs grouped by UI type.
- `workflows/*`: business workflow examples for common product screens.

Regenerate with:

```bash
node scripts/generate-examples.mjs
```
