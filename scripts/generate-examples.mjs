import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const examplesDir = join(rootDir, 'examples');

const examples = [
  {
    path: 'hello',
    title: 'Hello',
    description: 'Smallest renderable XCON document.',
    document: {
      type: 'form',
      pos: [0, 0, 320, 180],
      backgroundColor: '#FFFFFF',
      components: {
        hello: {
          type: 'label',
          pos: [24, 64, 272, 40],
          text: 'Hello XCON',
          font: { size: 24, weight: 800 },
          color: '#111827',
          textAlign: 'center'
        }
      }
    }
  },
  {
    path: 'button',
    title: 'Button',
    description: 'Single primary button with state styles.',
    document: {
      type: 'form',
      pos: [0, 0, 320, 180],
      backgroundColor: '#F8FAFC',
      components: {
        start: {
          type: 'button',
          pos: [40, 68, 240, 48],
          label: 'Start',
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          border: { radius: 10 },
          font: { weight: 700 },
          states: {
            hover: { backgroundColor: '#1D4ED8' },
            disabled: { backgroundColor: '#9CA3AF' }
          }
        }
      }
    }
  },
  {
    path: 'form',
    title: 'Contact Form',
    description: 'Public form controls without executable app logic.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 640],
      backgroundColor: '#F8FAFC',
      components: {
        title: { type: 'label', pos: [24, 28, 354, 34], text: 'Contact', font: { size: 24, weight: 800 } },
        name: { type: 'textField', pos: [24, 92, 354, 44], placeholder: 'Name', bind: 'contact.name', border: { width: 1, color: '#D1D5DB', radius: 8 } },
        email: { type: 'textField', pos: [24, 152, 354, 44], placeholder: 'Email', inputType: 'email', bind: 'contact.email', border: { width: 1, color: '#D1D5DB', radius: 8 } },
        message: { type: 'textarea', pos: [24, 212, 354, 132], placeholder: 'Message', rows: null, showCharCount: true },
        consent: { type: 'checkbox', pos: [24, 360, 320, 32], label: 'I agree to be contacted.', value: 'unchecked' },
        submit: { type: 'button', pos: [24, 416, 354, 48], label: 'Send', backgroundColor: '#0F766E', color: '#FFFFFF', border: { radius: 10 } }
      }
    }
  },
  {
    path: 'card-list',
    title: 'Card List',
    description: 'List with card-like repeated items.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 700],
      backgroundColor: '#F8FAFC',
      components: {
        list: {
          type: 'list',
          pos: [16, 24, 370, 620],
          direction: 'vertical',
          itemSize: { height: 120, width: 370 },
          separator: { style: 'none', size: 0 },
          items: [
            { type: 'card', title: 'Design Review', subtitle: 'Today 10:00', text: 'Confirm public API naming and examples.', padding: 16 },
            { type: 'card', title: 'Security Pass', subtitle: 'Today 14:00', text: 'Review viewer-only restrictions.', padding: 16 },
            { type: 'card', title: 'Docs Update', subtitle: 'Tomorrow', text: 'Publish component reference.', padding: 16 }
          ]
        }
      }
    }
  },
  {
    path: 'layout-stack',
    title: 'Stack Layout',
    description: 'Column stack with public gap and item components.',
    document: {
      type: 'stack',
      pos: [0, 0, 402, 360],
      direction: 'column',
      gap: 12,
      padding: [24, 16],
      items: [
        { type: 'label', text: 'Stack Layout', font: { size: 22, weight: 800 } },
        { type: 'badge', text: 'PUBLIC API', backgroundColor: '#DBEAFE', color: '#1D4ED8' },
        { type: 'button', label: 'Continue', backgroundColor: '#111827', color: '#FFFFFF', border: { radius: 8 } }
      ]
    }
  },
  {
    path: 'nested',
    title: 'Nested Components',
    description: 'Nested panel, labels, progress, and buttons.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 520],
      backgroundColor: '#F8FAFC',
      components: {
        panel: {
          type: 'panel',
          pos: [20, 40, 362, 300],
          backgroundColor: '#FFFFFF',
          border: { width: 1, color: '#E5E7EB', radius: 16 },
          padding: 20,
          components: {
            title: { type: 'label', pos: [20, 20, 300, 28], text: 'Project Health', font: { size: 20, weight: 800 } },
            status: { type: 'progressBar', pos: [20, 72, 300, 24], label: 'Progress', value: 68, max: 100, color: '#22C55E' },
            alert: { type: 'alert', pos: [20, 120, 300, 68], severity: 'warning', message: 'Two tasks need review.', showIcon: true },
            action: { type: 'button', pos: [20, 216, 160, 44], label: 'Open', backgroundColor: '#2563EB', color: '#FFFFFF' }
          }
        }
      }
    }
  },
  {
    path: 'style',
    title: 'Style Groups',
    description: 'Font, border, shadow, and shape style groups.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 420],
      backgroundColor: '#F8FAFC',
      components: {
        card: {
          type: 'shape',
          pos: [24, 48, 354, 220],
          text: 'Styled Shape',
          font: { family: 'Inter, Arial, sans-serif', size: 28, weight: 800 },
          color: '#FFFFFF',
          textAlign: 'center',
          textVerticalAlign: 'middle',
          background: { gradient: 'linear-gradient(135deg, #0F172A, #2563EB)' },
          border: { radius: 18 },
          effects: { boxShadow: '0 16px 40px rgba(15,23,42,.22)' }
        }
      }
    }
  },
  {
    path: 'designer-metadata',
    title: 'Designer Metadata',
    description: 'Semantic XML can preserve designer namespaced attributes.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 360],
      metadata: { 'designer:note': 'Hero screen draft', 'designer:locked': true },
      components: {
        title: { type: 'label', id: 'title', text: 'Designer Metadata', font: { size: 22, weight: 800 } },
        cta: { type: 'button', id: 'cta', label: 'Preview', backgroundColor: '#2563EB', color: '#FFFFFF' }
      }
    }
  },
  {
    path: 'tagless-custom-marker',
    title: 'TAGLESS Custom Marker',
    description: 'Same XCON object serialized with a custom marker set.',
    taglessMarkers: { markers: 'ABCD', endMarkers: 'abcd' },
    document: {
      type: 'form',
      title: 'Custom Markers',
      components: {
        label: { type: 'label', text: 'TAGLESS can choose markers per document.' }
      }
    }
  },
  {
    path: 'syntax-comparison',
    title: 'Syntax Comparison',
    description: 'One screen represented as JSON, XML, and TAGLESS.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 300],
      components: {
        title: { type: 'label', pos: [24, 40, 354, 34], text: 'One screen. Three syntaxes.', font: { size: 22, weight: 800 } },
        body: { type: 'textView', pos: [24, 92, 354, 96], text: 'JSON, XML, and TAGLESS parse into the same XCON Object Model.' }
      }
    }
  },
  {
    path: 'invalid',
    title: 'Invalid Document',
    description: 'Invalid example expected to fail validation.',
    document: {
      type: 'form',
      pos: [0, 0, 402],
      onClick: 'runRuntimeAction',
      actions: {
        save: { type: 'httpRequest', url: '/api/save' }
      },
      database: {
        Product: { fields: { id: 'string' } }
      },
      components: {
        unsafe: { type: 'image', src: 'javascript:alert(1)' },
        list: { type: 'list', actionRef: 'loadRows', backend: { method: 'GET', path: '/api/products' } },
        cta: { type: 'button', label: 'Save', onClick_ref: 'save' }
      }
    }
  },
  {
    path: 'components/basic',
    title: 'Basic Components',
    description: 'label, button, badge, icon, divider, and avatar.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 520],
      components: {
        label: { type: 'label', pos: [24, 32, 280, 32], text: 'Basic Components', font: { size: 22, weight: 800 } },
        icon: { type: 'icon', pos: [24, 84, 32, 32], name: 'star', library: 'lucide', color: '#F59E0B' },
        badge: { type: 'badge', pos: [72, 88, 96, 24], text: 'READY', backgroundColor: '#DCFCE7', color: '#166534' },
        avatar: { type: 'avatar', pos: [24, 136, 56, 56], initials: 'XC', backgroundColor: '#0F172A', color: '#FFFFFF' },
        divider: { type: 'divider', pos: [24, 216, 354, 1], color: '#E5E7EB' },
        button: { type: 'button', pos: [24, 248, 180, 44], label: 'Action', backgroundColor: '#2563EB', color: '#FFFFFF' }
      }
    }
  },
  {
    path: 'components/input-controls',
    title: 'Input Controls',
    description: 'Form input components with public prop names.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 680],
      components: {
        text: { type: 'textField', pos: [24, 32, 354, 44], placeholder: 'Text field', suffix: { clear: true } },
        password: { type: 'passwordField', pos: [24, 92, 354, 44], placeholder: 'Password', showToggle: true },
        textarea: { type: 'textarea', pos: [24, 152, 354, 96], placeholder: 'Textarea', rows: null },
        select: { type: 'select', pos: [24, 268, 354, 44], value: 'pro', options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
        slider: { type: 'slider', pos: [24, 332, 300, 48], label: 'Volume', value: 70, min: 0, max: 100, ticks: true },
        switcher: { type: 'switch', pos: [24, 396, 260, 44], title: 'Notifications', checked: true, labels: { on: 'On', off: 'Off' } },
        color: { type: 'colorPicker', pos: [24, 460, 220, 40], value: '#2563EB', alpha: true },
        date: { type: 'datePicker', pos: [24, 520, 220, 40], value: '2026-05-12' },
        time: { type: 'timePicker', pos: [24, 580, 220, 40], value: '09:30' }
      }
    }
  },
  {
    path: 'components/media',
    title: 'Media Components',
    description: 'Image, video, banner, carousel, and gallery.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 900],
      components: {
        image: { type: 'image', pos: [24, 24, 354, 160], src: 'assets/photo.jpg', alt: 'Photo', objectFit: 'cover' },
        video: { type: 'videoView', pos: [24, 204, 354, 180], src: 'assets/demo.mp4', controls: true, poster: 'assets/poster.jpg' },
        banner: { type: 'banner', pos: [24, 404, 354, 140], slides: [{ type: 'image', src: 'assets/slide-1.jpg' }, { type: 'image', src: 'assets/slide-2.jpg' }], indicator: { show: true } },
        carousel: { type: 'carousel', pos: [24, 564, 354, 140], items: [{ type: 'card', title: 'First' }, { type: 'card', title: 'Second' }], showDots: true },
        gallery: { type: 'gallery', pos: [24, 724, 354, 140], columns: 3, images: [{ src: 'assets/a.jpg' }, { src: 'assets/b.jpg' }] }
      }
    }
  },
  {
    path: 'components/layout',
    title: 'Layout Components',
    description: 'Panel, list, tabs, accordion, grid, flexBox, stack, spacer, and card.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 960],
      components: {
        stack: { type: 'stack', pos: [24, 24, 354, 120], direction: 'column', gap: 8, items: [{ type: 'label', text: 'Stack item A' }, { type: 'spacer', size: 8 }, { type: 'label', text: 'Stack item B' }] },
        grid: { type: 'grid', pos: [24, 164, 354, 120], columns: 3, gap: 8, items: [{ type: 'badge', text: 'A' }, { type: 'badge', text: 'B' }, { type: 'badge', text: 'C' }] },
        flex: { type: 'flexBox', pos: [24, 304, 354, 80], direction: 'row', justify: 'space-between', items: [{ type: 'button', label: 'Back' }, { type: 'button', label: 'Next' }] },
        tabs: { type: 'tabs', pos: [24, 404, 354, 160], items: [{ id: 'one', label: 'One', content: { type: 'label', text: 'First tab' } }, { id: 'two', label: 'Two', content: { type: 'label', text: 'Second tab' } }], activeId: 'one' },
        accordion: { type: 'accordion', pos: [24, 584, 354, 160], items: [{ id: 'a', title: 'Section A', content: 'Alpha' }, { id: 'b', title: 'Section B', content: 'Beta' }], defaultOpen: ['a'] },
        list: { type: 'list', pos: [24, 764, 354, 160], itemSize: { height: 48, width: 354 }, items: [{ type: 'label', text: 'Row 1' }, { type: 'label', text: 'Row 2' }] }
      }
    }
  },
  {
    path: 'components/feedback-display',
    title: 'Feedback and Display',
    description: 'Alert, progress, spinner, tooltip, modal, and rating.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 620],
      components: {
        alert: { type: 'alert', pos: [24, 32, 354, 72], severity: 'success', title: 'Saved', message: 'The document was saved.' },
        progress: { type: 'progressBar', pos: [24, 124, 300, 24], label: 'Progress', value: 72, max: 100 },
        spinner: { type: 'spinner', pos: [340, 116, 32, 32], variant: 'border', color: '#2563EB' },
        rating: { type: 'rating', pos: [24, 176, 180, 32], value: 4, max: 5, icons: { filled: '★', empty: '☆' } },
        tooltip: { type: 'tooltip', pos: [24, 228, 160, 32], text: 'Helpful hint', position: 'top', trigger: 'hover' },
        modal: { type: 'modal', pos: [24, 288, 354, 180], title: 'Confirm', text: 'Continue with this action?', backdropClose: true }
      }
    }
  },
  {
    path: 'components/data-codes',
    title: 'Data and Code Components',
    description: 'Tree view, QR code, and barcode.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 620],
      components: {
        tree: { type: 'treeView', pos: [24, 24, 354, 180], data: [{ id: 'docs', label: 'docs', children: [{ id: 'spec', label: 'spec.md' }] }], expandedNodes: ['docs'] },
        qr: { type: 'qrCode', pos: [24, 228, 180, 210], text: 'https://xconviewer.dev', size: 160, errorCorrectionLevel: 'M' },
        barcode: { type: 'barcode', pos: [24, 456, 300, 120], text: '1234567890', format: 'CODE128', width: 2, height: 80, displayValue: true, font: { size: 14 } }
      }
    }
  },
  {
    path: 'workflows/login',
    title: 'Login Workflow',
    description: 'Typical login screen.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 700],
      backgroundColor: '#F8FAFC',
      components: {
        title: { type: 'label', pos: [32, 96, 338, 40], text: 'Sign in', font: { size: 30, weight: 800 }, textAlign: 'center' },
        email: { type: 'textField', pos: [32, 176, 338, 44], placeholder: 'Email', inputType: 'email', prefix: { icon: 'mail', library: 'lucide' } },
        password: { type: 'passwordField', pos: [32, 236, 338, 44], placeholder: 'Password', showToggle: true },
        remember: { type: 'checkbox', pos: [32, 300, 180, 32], label: 'Remember me', value: 'unchecked' },
        submit: { type: 'button', pos: [32, 356, 338, 48], label: 'Sign in', backgroundColor: '#2563EB', color: '#FFFFFF', border: { radius: 10 } }
      }
    }
  },
  {
    path: 'workflows/checkout',
    title: 'Checkout Workflow',
    description: 'Checkout summary with form controls and totals.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 820],
      components: {
        title: { type: 'label', pos: [24, 28, 354, 34], text: 'Checkout', font: { size: 24, weight: 800 } },
        address: { type: 'textarea', pos: [24, 88, 354, 96], placeholder: 'Shipping address', rows: null },
        shipping: { type: 'radioButton', pos: [24, 204, 260, 32], label: 'Standard shipping', group: 'shipping', value: 'standard', checked: true },
        express: { type: 'radioButton', pos: [24, 244, 260, 32], label: 'Express shipping', group: 'shipping', value: 'express' },
        total: { type: 'card', pos: [24, 304, 354, 140], title: 'Total', subtitle: '$128.00', text: 'Includes taxes and shipping.', padding: 16 },
        pay: { type: 'button', pos: [24, 476, 354, 48], label: 'Pay now', backgroundColor: '#16A34A', color: '#FFFFFF' }
      }
    }
  },
  {
    path: 'workflows/dashboard',
    title: 'Operations Dashboard',
    description: 'KPI dashboard with cards, progress, and alerts.',
    document: {
      type: 'form',
      pos: [0, 0, 800, 600],
      backgroundColor: '#F8FAFC',
      components: {
        heading: { type: 'label', pos: [32, 24, 400, 36], text: 'Operations', font: { size: 28, weight: 800 } },
        grid: { type: 'grid', pos: [32, 84, 736, 220], columns: 3, gap: 16, items: [{ type: 'card', title: 'Orders', subtitle: '1,248', text: '+12% today' }, { type: 'card', title: 'Revenue', subtitle: '$84k', text: '+8% today' }, { type: 'card', title: 'SLA', subtitle: '98%', text: 'Healthy' }] },
        progress: { type: 'progressBar', pos: [32, 332, 420, 24], label: 'Monthly target', value: 82, max: 100 },
        alert: { type: 'alert', pos: [32, 388, 520, 72], severity: 'warning', title: 'Inventory', message: 'Three SKUs need restocking.' }
      }
    }
  },
  {
    path: 'workflows/profile',
    title: 'Profile Workflow',
    description: 'Profile settings with avatar, fields, and toggles.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 720],
      components: {
        avatar: { type: 'avatar', pos: [24, 32, 72, 72], initials: 'HK', backgroundColor: '#0F172A', color: '#FFFFFF' },
        name: { type: 'textField', pos: [24, 132, 354, 44], placeholder: 'Display name', value: 'Hong Kim' },
        language: { type: 'select', pos: [24, 192, 354, 44], value: 'ko', options: [{ value: 'ko', label: 'Korean' }, { value: 'en', label: 'English' }] },
        marketing: { type: 'switch', pos: [24, 260, 300, 44], title: 'Marketing emails', checked: false },
        save: { type: 'button', pos: [24, 336, 354, 48], label: 'Save profile', backgroundColor: '#2563EB', color: '#FFFFFF' }
      }
    }
  },
  {
    path: 'workflows/support-ticket',
    title: 'Support Ticket Workflow',
    description: 'Ticket submission with severity and details.',
    document: {
      type: 'form',
      pos: [0, 0, 402, 560],
      components: {
        title: { type: 'label', pos: [24, 32, 354, 34], text: 'Support ticket', font: { size: 24, weight: 800 } },
        severity: { type: 'select', pos: [24, 92, 354, 44], placeholder: 'Severity', options: [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }] },
        subject: { type: 'textField', pos: [24, 152, 354, 44], placeholder: 'Subject' },
        details: { type: 'textarea', pos: [24, 212, 354, 140], placeholder: 'Describe the issue', rows: null },
        submit: { type: 'button', pos: [24, 384, 354, 48], label: 'Create ticket', backgroundColor: '#DC2626', color: '#FFFFFF' }
      }
    }
  }
];

const typeTags = {
  form: 'Form',
  list: 'List',
  label: 'Label',
  textField: 'TextField',
  textView: 'TextView',
  button: 'Button',
  panel: 'Panel',
  checkbox: 'Checkbox',
  radioButton: 'RadioButton',
  image: 'Image',
  videoView: 'VideoView',
  banner: 'Banner',
  shape: 'Shape',
  passwordField: 'PasswordField',
  textarea: 'Textarea',
  select: 'Select',
  slider: 'Slider',
  switch: 'Switch',
  colorPicker: 'ColorPicker',
  datePicker: 'DatePicker',
  timePicker: 'TimePicker',
  rating: 'Rating',
  progressBar: 'ProgressBar',
  spinner: 'Spinner',
  badge: 'Badge',
  avatar: 'Avatar',
  icon: 'Icon',
  divider: 'Divider',
  alert: 'Alert',
  tooltip: 'Tooltip',
  modal: 'Modal',
  tabs: 'Tabs',
  accordion: 'Accordion',
  grid: 'Grid',
  flexBox: 'FlexBox',
  stack: 'Stack',
  spacer: 'Spacer',
  card: 'Card',
  searchBar: 'SearchBar',
  treeView: 'TreeView',
  carousel: 'Carousel',
  gallery: 'Gallery',
  qrCode: 'QrCode',
  barcode: 'Barcode'
};

await mkdir(examplesDir, { recursive: true });

for (const example of examples) {
  const dir = join(examplesDir, example.path);
  const base = example.path.split('/').at(-1);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${base}.xcon.json`), `${JSON.stringify(example.document, null, 2)}\n`, 'utf8');
  await writeFile(join(dir, `${base}.xcon.xml`), `${toSemanticXml(example.document)}\n`, 'utf8');
  await writeFile(
    join(dir, `${base}.xcon`),
    `${toTagless(example.document, { ...example.taglessMarkers, pretty: true })}\n`,
    'utf8'
  );
  await writeFile(
    join(dir, 'README.md'),
    `# ${example.title}\n\n${example.description}\n\n- JSON: [${base}.xcon.json](${playgroundLink(example.path, `${base}.xcon.json`)})\n- XML: [${base}.xcon.xml](${playgroundLink(example.path, `${base}.xcon.xml`)})\n- TAGLESS: [${base}.xcon](${playgroundLink(example.path, `${base}.xcon`)})\n`,
    'utf8'
  );
}

await mkdir(join(examplesDir, 'sketch'), { recursive: true });
await writeFile(
  join(examplesDir, 'sketch', 'README.md'),
  `# XCON/SKETCH\n\nCompact authoring syntax for Markdown and LLM-generated examples.\n\n- SKETCH: [hello.xcon.sketch](${playgroundLink('sketch', 'hello.xcon.sketch')})\n`,
  'utf8'
);

await writeFile(join(examplesDir, 'README.md'), renderExamplesReadme(), 'utf8');

function renderExamplesReadme() {
  const rows = examples
    .map((example) => `| [${example.path}](./${example.path}/README.md) | ${example.title} | ${example.description} |`)
    .join('\n');
  const sketchRow = '| [sketch](./sketch/README.md) | XCON/SKETCH | Compact authoring syntax for Markdown and LLM-generated examples. |';
  const showcaseRow = '| [showcase](./showcase/README.md) | Public Showcase Fixtures | Public component and screen fixtures copied from the viewer compatibility suite. |';
  return `# XCON Examples\n\nThese examples are generated from public XCON/JSON source objects. Each generated example provides JSON, semantic XML, and TAGLESS forms for the same screen. The \`sketch\` example shows the compact XCON/SKETCH authoring syntax.\n\n## Example Index\n\n| Path | Title | Description |\n|---|---|---|\n${rows}\n${sketchRow}\n${showcaseRow}\n\n## Groups\n\n- Root examples: smallest examples and syntax comparisons.\n- \`components/*\`: component-oriented catalogs grouped by UI type.\n- \`workflows/*\`: business workflow examples for common product screens.\n\nRegenerate with:\n\n\`\`\`bash\nnode scripts/generate-examples.mjs\n\`\`\`\n`;
}

function playgroundLink(examplePath, filename) {
  return `/play?src=${encodeURIComponent(`/examples/${examplePath}/${filename}`)}`;
}

function toSemanticXml(value, indent = '', componentName = null) {
  const type = value.type || 'panel';
  const tag = typeTags[type] || `${String(type).charAt(0).toUpperCase()}${String(type).slice(1)}`;
  const attrs = [];
  const children = [];

  if (componentName) attrs.push(`name="${escapeXml(componentName)}"`);

  for (const [key, item] of Object.entries(value)) {
    if (key === 'type') continue;
    if (componentName && key === 'name') {
      attrs.push(`xcon-prop-name="${escapeXml(isScalar(item) ? String(item) : JSON.stringify(item))}"`);
      continue;
    }
    if (key === 'components' && isObject(item)) {
      if (typeof item.componentsOrder === 'string') attrs.push(`componentsOrder="${escapeXml(item.componentsOrder)}"`);
      children.push(
        ...Object.entries(item)
          .filter(([childKey, child]) => childKey !== 'componentsOrder' && isObject(child))
          .map(([childKey, child]) => toSemanticXml(child, `${indent}  `, childKey))
      );
      continue;
    }
    if ((key === 'items' || key === 'slides') && Array.isArray(item)) {
      children.push(toSemanticArrayXml(key, item, `${indent}  `));
      continue;
    }
    if (key === 'metadata' && isObject(item)) {
      for (const [metaKey, metaValue] of Object.entries(item)) attrs.push(`${metaKey}="${escapeXml(String(metaValue))}"`);
      continue;
    }
    attrs.push(`${key}="${escapeXml(isScalar(item) ? String(item) : JSON.stringify(item))}"`);
  }

  const open = `${indent}<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}`;
  if (children.length === 0) return `${open} />`;
  return `${open}>\n${children.join('\n')}\n${indent}</${tag}>`;
}

function toSemanticArrayXml(key, value, indent = '') {
  const tag = key === 'items' ? 'Items' : 'Slides';
  const children = value.map((item) => {
    if (isObject(item) && item.type) return toSemanticXml(item, `${indent}  `);
    return `${indent}  <Value json="${escapeXml(JSON.stringify(item ?? null))}" />`;
  });
  if (children.length === 0) return `${indent}<${tag} />`;
  return `${indent}<${tag}>\n${children.join('\n')}\n${indent}</${tag}>`;
}

function toTagless(value, options = {}) {
  const markers = Array.from(options.markers || '♤♡◇♧');
  const endMarkers = Array.from(options.endMarkers || '♠♥◆♣');
  if (options.pretty) return `${markers.join('')}\n${writeTaglessValue(value, markers, endMarkers, 0, true)}\n${endMarkers.join('')}`;
  return `${markers.join('')}${writeTaglessValue(value, markers, endMarkers, 0, false)}${endMarkers.join('')}`;
}

function writeTaglessValue(value, markers, endMarkers, depth, pretty) {
  const indent = pretty ? '  '.repeat(depth) : '';
  const childIndent = pretty ? '  '.repeat(depth + 1) : '';
  if (Array.isArray(value)) {
    if (!pretty) {
      return `${markers[1]}${value.map((item) => writeTaglessValue(item, markers, endMarkers, depth + 1, false)).join('')}${endMarkers[1]}`;
    }
    const body = value.map((item) => writeTaglessValue(item, markers, endMarkers, depth + 1, true)).join('\n');
    return `${indent}${markers[1]}${body ? `\n${body}\n${indent}` : ''}${endMarkers[1]}`;
  }
  if (isObject(value)) {
    if (!pretty) {
      return `${markers[0]}${Object.entries(value)
        .map(([key, item]) => `${markers[3]}${encodePayload(key, markers, endMarkers)}${endMarkers[3]}${writeTaglessValue(item, markers, endMarkers, depth + 1, false)}`)
        .join('')}${endMarkers[0]}`;
    }
    const body = Object.entries(value)
      .map(([key, item]) => {
        const keyPart = `${childIndent}${markers[3]}${encodePayload(key, markers, endMarkers, true)}${endMarkers[3]}`;
        const rendered = writeTaglessValue(item, markers, endMarkers, depth + 1, true);
        return isObject(item) || Array.isArray(item) ? `${keyPart}\n${rendered}` : `${keyPart}${rendered.trimStart()}`;
      })
      .join('\n');
    return `${indent}${markers[0]}${body ? `\n${body}\n${indent}` : ''}${endMarkers[0]}`;
  }
  return `${indent}${markers[2]}${encodePayload(formatTaglessPrimitive(value ?? null), markers, endMarkers, true)}${endMarkers[2]}`;
}

function encodePayload(value, markers, endMarkers, readable = false) {
  let encoded = readable ? value.replaceAll('%', '%25') : encodeURIComponent(value);
  for (const marker of new Set([...markers, ...endMarkers])) {
    encoded = encoded.replaceAll(marker, percentEncodeMarker(marker));
  }
  return encoded;
}

function percentEncodeMarker(marker) {
  const encoded = encodeURIComponent(marker);
  if (encoded !== marker) return encoded;
  const codePoint = marker.codePointAt(0);
  if (codePoint === undefined) return marker;
  return `%${codePoint.toString(16).toUpperCase().padStart(2, '0')}`;
}

function formatTaglessPrimitive(value) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isScalar(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
