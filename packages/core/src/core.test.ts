import { describe, expect, test } from 'vitest';

import {
  XconObject,
  convert,
  detectXmlSyntax,
  deserialize,
  fromJSON,
  fromJSONObject,
  fromSketch,
  fromSketchLenient,
  fromTagless,
  fromXml,
  getAllPaths,
  getByPath,
  normalize,
  printDict,
  toJSON,
  toJSONObject,
  serializeBySyntax,
  toTagless,
  toSketch,
  toXml,
  validate,
} from './index.js';

describe('XCON Object Model', () => {
  test('preserves insertion order while supporting keyed lookup and updates', () => {
    const obj = new XconObject({ type: 'form', title: 'Home' });

    obj.insert(1, 'id', 'home');
    obj.set('title', 'Dashboard');
    obj.add('visible', true);

    expect(obj.get('title')).toBe('Dashboard');
    expect(obj.contains('id')).toBe(true);
    expect(obj.indexOf('visible')).toBe(3);
    expect([...obj].map(([name]) => name)).toEqual(['type', 'id', 'title', 'visible']);

    const clone = obj.deepClone();
    clone.set('title', 'Clone');

    expect(obj.get('title')).toBe('Dashboard');
    expect(clone.get('title')).toBe('Clone');
  });
});

describe('XCON/JSON parser and serializer', () => {
  test('keeps JSON-native value types and converts nested dictionaries to XconObject', () => {
    const doc = fromJSON(
      JSON.stringify({
        type: 'form',
        visible: true,
        count: 2,
        nullable: null,
        pos: [0, 0, 402, 800],
        components: {
          title: {
            type: 'label',
            text: 'Hello',
          },
        },
      }),
    );

    expect(doc.get('visible')).toBe(true);
    expect(doc.get('count')).toBe(2);
    expect(doc.get('nullable')).toBeNull();
    expect(doc.get('components')).toBeInstanceOf(XconObject);
    expect(toJSONObject(doc)).toEqual({
      type: 'form',
      visible: true,
      count: 2,
      nullable: null,
      pos: [0, 0, 402, 800],
      components: {
        title: {
          type: 'label',
          text: 'Hello',
        },
      },
    });
  });

  test('normalizes undefined object properties to null for a JSON-safe model', () => {
    const doc = fromJSONObject({
      type: 'form',
      title: undefined,
    });

    expect(doc.get('title')).toBeNull();
    expect(toJSON(doc)).toContain('"title":null');
  });

  test('normalizes known object properties supplied as JSON strings', () => {
    const doc = fromJSON(JSON.stringify({
      type: 'form',
      al: '{"gap":"12px","padding":"0","autoHeight":"true"}',
      image: 'https://example.com/cover.jpg',
      components: {
        hero: {
          type: 'banner',
          autoplay: '{"enabled":"true","interval":"4000","loop":"true"}',
        },
      },
    }));

    expect(toJSONObject(doc)).toEqual({
      type: 'form',
      al: { gap: '12px', padding: 0, autoHeight: 'true' },
      image: 'https://example.com/cover.jpg',
      components: {
        hero: {
          type: 'banner',
          autoplay: { enabled: true, interval: '4000', loop: true },
        },
      },
    });
  });
});

describe('XCON/SKETCH parser', () => {
  test('parses screen declarations and flat components', () => {
    const doc = fromSketch(`
screen "Checkout" 390x844
  backgroundColor #ffffff
  label "Title" at 24,80 color #111827
  button "Save" at 24,120 size 120x44 enabled true
`);

    expect(toJSONObject(doc)).toEqual({
      type: 'form',
      name: 'Checkout',
      pos: [0, 0, 390, 844],
      backgroundColor: '#ffffff',
      components: {
        componentsOrder: 'label1,button1',
        label1: {
          type: 'label',
          name: 'label1',
          text: 'Title',
          pos: [24, 80],
          color: '#111827',
        },
        button1: {
          type: 'button',
          name: 'button1',
          label: 'Save',
          pos: [24, 120],
          size: [120, 44],
          enabled: true,
        },
      },
    });
  });

  test('converts SKETCH input through the converter API', () => {
    const json = convert(
      'screen "Home" 390x844\n  button "Save" at 24,120 size 120x44',
      'sketch',
      'json',
    );

    expect(toJSONObject(fromJSON(json))).toMatchObject({
      type: 'form',
      name: 'Home',
      components: {
        button1: {
          type: 'button',
          label: 'Save',
          pos: [24, 120],
          size: [120, 44],
        },
      },
    });
  });

  test('parses nested components and compact property commands', () => {
    const doc = fromSketch(`
      screen 402x800 bg #ffffff

      card: panel at 24 164 354 180
        bg #f8fafc
        radius 16
        shadow 0 8 16 .12
        gap 12
        padding 16 24
        layout column

        body: label "Short UI documents for humans and LLMs." at 20 24 314 48
          font 14 500
          color #475569
          align center
    `);

    expect(toJSONObject(doc)).toEqual({
      type: 'form',
      pos: [0, 0, 402, 800],
      backgroundColor: '#ffffff',
      components: {
        componentsOrder: 'card',
        card: {
          type: 'panel',
          name: 'card',
          pos: [24, 164, 354, 180],
          backgroundColor: '#f8fafc',
          border: { radius: 16 },
          shadow: { x: 0, y: 8, blur: 16, opacity: 0.12 },
          al: { gap: 12, padding: [16, 24], direction: 'column' },
          components: {
            componentsOrder: 'body',
            body: {
              type: 'label',
              name: 'body',
              text: 'Short UI documents for humans and LLMs.',
              pos: [20, 24, 314, 48],
              font: { size: 14, weight: 500 },
              color: '#475569',
              textAlign: 'center',
            },
          },
        },
      },
    });
  });

  test('preserves button layout while keeping container layout shorthand', () => {
    const doc = fromSketch(`
      screen 402x812 bg #ffffff

      tabs: panel at 0 748 402 64
        layout row
        tabHome: button "홈" at 0 0 72 52
          layout "column"
          al
            flex "1 1 0"
          icon
            name "home"
    `);

    expect(toJSONObject(doc)).toMatchObject({
      components: {
        tabs: {
          type: 'panel',
          al: { direction: 'row' },
          components: {
            tabHome: {
              type: 'button',
              layout: 'column',
              al: { flex: '1 1 0' },
              icon: { name: 'home' },
            },
          },
        },
      },
    });
  });

  test('round-trips button layout through SKETCH serialization', () => {
    const source = fromJSON(JSON.stringify({
      type: 'form',
      pos: [0, 0, 402, 812],
      components: {
        componentsOrder: 'tabHome',
        tabHome: {
          type: 'button',
          label: '홈',
          pos: [0, 0, 72, 52],
          layout: 'column',
          icon: { name: 'home' },
        },
      },
    }));

    const sketch = serializeBySyntax(source, 'sketch');
    const roundTrip = toJSONObject(fromSketch(sketch));

    expect(sketch).toContain('layout "column"');
    expect(roundTrip).toMatchObject({
      components: {
        tabHome: {
          type: 'button',
          layout: 'column',
          icon: { name: 'home' },
        },
      },
    });
  });

  test('promotes text alignment aliases from font blocks to component properties', () => {
    const doc = fromSketch(`
      screen 480x600

      label1: label "안녕하세요" at 10 10 400 80
        bg #00ffff
        color #ffffff
        font
          size 24
          weight "bold"
          align center
          valign bottom
    `);

    expect(toJSONObject(doc)).toMatchObject({
      components: {
        label1: {
          type: 'label',
          text: '안녕하세요',
          pos: [10, 10, 400, 80],
          backgroundColor: '#00ffff',
          color: '#ffffff',
          font: {
            size: 24,
            weight: 'bold',
          },
          textAlign: 'center',
          textVerticalAlign: 'bottom',
        },
      },
    });
  });

  test('parses array and object property blocks', () => {
    const doc = fromSketch(`
      screen 402x800 bg #ffffff

      hero: banner at 24 120 354 220
        images
          - https://images.unsplash.com/photo-a?w=800&q=80
          - https://images.unsplash.com/photo-b?w=800&q=80
        overlay
          title "anywhere"
          subtitle "수백만 숙소가 당신을 기다립니다."
          badge "LIVE"
    `);

    expect(toJSONObject(doc)).toMatchObject({
      components: {
        hero: {
          images: [
            'https://images.unsplash.com/photo-a?w=800&q=80',
            'https://images.unsplash.com/photo-b?w=800&q=80',
          ],
          overlay: {
            title: 'anywhere',
            subtitle: '수백만 숙소가 당신을 기다립니다.',
            badge: 'LIVE',
          },
        },
      },
    });
  });

  test('keeps inline JSON arrays and objects intact when they contain quoted text and spaces', () => {
    const doc = fromSketch(`
      screen 402x800

      hero: banner at 0 0 354 220
        slides [{"type":"image","src":"https://example.com/a.jpg","overlaySub":"수백만 숙소가\\n당신을 기다립니다."},{"type":"image","src":"https://example.com/b.jpg","overlayTitle":"Second slide"}]

      stays: list at 0 240 354 228
        dataTemplate {"type":"template","template":{"tabledata":[{"title":"감성 스튜디오","line":"서울 마포구  89,000/박","image":"https://example.com/stay.jpg"}]}}
        templates {"cell":{"cover":{"type":"image","src":"{{item.image}}","pos":[0,0,168,168]},"title":{"type":"label","text":"{{item.title}}","pos":[10,178,148,20]}}}
    `);

    expect(toJSONObject(doc)).toMatchObject({
      components: {
        hero: {
          slides: [
            {
              type: 'image',
              src: 'https://example.com/a.jpg',
              overlaySub: '수백만 숙소가\n당신을 기다립니다.',
            },
            {
              type: 'image',
              src: 'https://example.com/b.jpg',
              overlayTitle: 'Second slide',
            },
          ],
        },
        stays: {
          dataTemplate: {
            type: 'template',
            template: {
              tabledata: [
                {
                  title: '감성 스튜디오',
                  line: '서울 마포구  89,000/박',
                  image: 'https://example.com/stay.jpg',
                },
              ],
            },
          },
          templates: {
            cell: {
              cover: {
                type: 'image',
                src: '{{item.image}}',
                pos: [0, 0, 168, 168],
              },
            },
          },
        },
      },
    });
  });

  test('keeps multiline JSON arrays and objects intact for large sketch properties', () => {
    const doc = fromSketch(`
      screen "Travel Home" 402x812 bg @surface

      hero: banner at 20 150 362 220
        bannerHeight "220px"
        slides [
          {
            "type": "image",
            "src": "stay-hero.jpg",
            "objectFit": "fill",
            "overlayTag": "NEW",
            "overlayTitle": "Hidden stays",
            "overlaySub": "조용한 숙소를 찾아보세요.",
            "overlayCta": "둘러보기"
          },
          {
            "type": "image",
            "src": "stay-cabin.jpg",
            "objectFit": "fill",
            "overlayTag": "TRIP",
            "overlayTitle": "Mountain week",
            "overlaySub": "이번 주말 산장 여행",
            "overlayCta": "계획하기"
          }
        ]

      recentList: list at 20 492 362 172
        dataTemplate {
          "type": "template",
          "template": {
            "tabledata": [
              { "title": "감성 스튜디오", "line": "서울  89,000/박", "image": "stay-studio.jpg" },
              { "title": "산장 뷰 하우스", "line": "강원  210,000/박", "image": "stay-cabin.jpg" }
            ]
          }
        }
    `);

    expect(toJSONObject(doc)).toMatchObject({
      components: {
        hero: {
          slides: [
            {
              type: 'image',
              src: 'stay-hero.jpg',
              overlayTitle: 'Hidden stays',
            },
            {
              type: 'image',
              src: 'stay-cabin.jpg',
              overlayTitle: 'Mountain week',
            },
          ],
        },
        recentList: {
          dataTemplate: {
            type: 'template',
            template: {
              tabledata: [
                { title: '감성 스튜디오', image: 'stay-studio.jpg' },
                { title: '산장 뷰 하우스', image: 'stay-cabin.jpg' },
              ],
            },
          },
        },
      },
    });
  });

  test('rejects tabs and reports line numbers', () => {
    expect(() => fromSketch('screen 360x220\n\tbad: label "Bad" at 0 0 10 10')).toThrow(
      /line 2: Tabs are not supported/,
    );
  });

  test('lenient SKETCH parsing drops only invalid local blocks and keeps renderable content', () => {
    const result = fromSketchLenient(`
      screen "Flow" 480x260 bg #ffffff
      title: label "Renderable title" at 20 20 260 32

      badPanel: panel
        color #2563eb
        width 3
        label "Broken local block"

      cta: button "Still visible" at 20 80 160 44
        bg #2563eb
    `);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      line: 5,
    });
    expect(result.errors[0].message).toContain('Expected component layout');
    expect(toJSONObject(result.document)).toMatchObject({
      type: 'form',
      name: 'Flow',
      components: {
        componentsOrder: 'title,cta',
        title: {
          type: 'label',
          text: 'Renderable title',
        },
        cta: {
          type: 'button',
          label: 'Still visible',
        },
      },
    });
  });

  test('parses document line primitives from SKETCH at and from/to forms', () => {
    const doc = fromSketch(`
      screen "Lines" 480x260 bg #ffffff
      rule: line at 40 80 360 0
        color #cbd5e1
        width 2
        style "dashed"
      flow: line from 60 140 to 360 190
        color #2563eb
        width 3
        end "arrow"
        label "Message"
    `);

    expect(toJSONObject(doc)).toMatchObject({
      type: 'form',
      components: {
        componentsOrder: 'rule,flow',
        rule: {
          type: 'line',
          pos: [40, 80, 360, 0],
          color: '#cbd5e1',
          width: 2,
          style: 'dashed',
        },
        flow: {
          type: 'line',
          pos: [60, 140, 300, 50],
          from: [0, 0],
          to: [300, 50],
          color: '#2563eb',
          width: 3,
          end: 'arrow',
          label: 'Message',
        },
      },
    });
  });

  test('round-trips document line primitives through SKETCH serialization', () => {
    const sketch = toSketch(fromJSONObject({
      type: 'form',
      name: 'Lines',
      pos: [0, 0, 480, 260],
      components: {
        componentsOrder: 'rule,flow',
        rule: {
          type: 'line',
          pos: [40, 80, 360, 0],
          color: '#cbd5e1',
          width: 2,
        },
        flow: {
          type: 'line',
          pos: [60, 140, 300, 50],
          from: [0, 0],
          to: [300, 50],
          color: '#2563eb',
          end: 'arrow',
        },
      },
    }));

    expect(sketch).toContain('rule: line at 40 80 360 0');
    expect(sketch).toContain('flow: line from 60 140 to 360 190');
    expect(toJSONObject(fromSketch(sketch))).toMatchObject({
      components: {
        rule: { type: 'line', pos: [40, 80, 360, 0] },
        flow: { type: 'line', pos: [60, 140, 300, 50], from: [0, 0], to: [300, 50] },
      },
    });
  });

  test('parses anchor-based connector and arrow primitives from SKETCH', () => {
    const doc = fromSketch(`
      screen "Flow" 480x260 bg #ffffff
      user: panel at 40 98 120 64
      agent: panel at 320 98 120 64
      message: arrow from user right to agent left
        color #2563eb
        width 3
        label "Message"
      reply: connector from agent.bottom to user.bottom
        color #64748b
    `);

    expect(toJSONObject(doc)).toMatchObject({
      type: 'form',
      components: {
        componentsOrder: 'user,agent,message,reply',
        message: {
          type: 'connector',
          from: { target: 'user', anchor: 'right' },
          to: { target: 'agent', anchor: 'left' },
          color: '#2563eb',
          width: 3,
          end: 'arrow',
          label: 'Message',
        },
        reply: {
          type: 'connector',
          from: { target: 'agent', anchor: 'bottom' },
          to: { target: 'user', anchor: 'bottom' },
          color: '#64748b',
        },
      },
    });
  });

  test('round-trips anchor-based connectors through SKETCH serialization', () => {
    const sketch = toSketch(fromJSONObject({
      type: 'form',
      name: 'Flow',
      pos: [0, 0, 480, 260],
      components: {
        componentsOrder: 'user,agent,message',
        user: { type: 'panel', pos: [40, 98, 120, 64] },
        agent: { type: 'panel', pos: [320, 98, 120, 64] },
        message: {
          type: 'connector',
          from: { target: 'user', anchor: 'right' },
          to: { target: 'agent', anchor: 'left' },
          color: '#2563eb',
          end: 'arrow',
        },
      },
    }));

    expect(sketch).toContain('message: connector from user.right to agent.left');
    expect(toJSONObject(fromSketch(sketch))).toMatchObject({
      components: {
        message: {
          type: 'connector',
          from: { target: 'user', anchor: 'right' },
          to: { target: 'agent', anchor: 'left' },
          end: 'arrow',
        },
      },
    });
  });

  test('ignores slash comments outside strings', () => {
    const doc = fromSketch(`
      // comment
      screen 360x220 bg #fff
      title: label "https://example.com//not-comment" at 0 0 360 40 // trailing comment
    `);

    expect(toJSONObject(doc)).toMatchObject({
      components: {
        title: {
          text: 'https://example.com//not-comment',
        },
      },
    });
  });
});

describe('XCON/XML parser', () => {
  test('writes semantic XML object attributes as readable key-value lists and parses them back', () => {
    const doc = fromJSONObject({
      type: 'form',
      pos: [0, 0, 402, 520],
      border: {
        visible: true,
        width: 1,
        style: 'solid',
        color: 'var(--border)',
        radius: 28,
      },
      components: {
        main: {
          type: 'panel',
          name: 'main',
          border: {
            visible: false,
            radius: 10,
          },
        },
      },
    });

    const xml = toXml(doc, { format: 'semantic', pretty: true });

    expect(xml).toContain('pos="0,0,402,520"');
    expect(xml).not.toContain('pos="[0,0,402,520]"');
    expect(xml).toContain('border="visible:true; width:1; style:solid; color:var(--border); radius:28"');
    expect(xml).toContain('border="visible:false; radius:10"');
    expect(normalize(fromXml(xml))).toEqual(normalize(doc));
  });

  test('parses semantic XML comma-separated position attributes as number arrays', () => {
    const doc = fromXml('<Form pos="0,0,402,520"><Label name="title" pos="24,32,354,34" text="Hello" /></Form>');

    expect(toJSONObject(doc)).toEqual({
      type: 'form',
      pos: [0, 0, 402, 520],
      components: {
        title: {
          type: 'label',
          pos: [24, 32, 354, 34],
          text: 'Hello',
        },
      },
    });
  });

  test('parses semantic XML key-value object attributes without JSON syntax', () => {
    const doc = fromXml('<Form border="visible:true; width:1; style:solid; color:var(--border); radius:28" />');

    expect(toJSONObject(doc)).toEqual({
      type: 'form',
      border: {
        visible: true,
        width: 1,
        style: 'solid',
        color: 'var(--border)',
        radius: 28,
      },
    });
  });

  test('parses machine XML with typed tags and CDATA', () => {
    const doc = fromXml(`
      <xcon>
        <x>
          <n>type</n><o>form</o>
          <n>visible</n><bool>true</bool>
          <n>count</n><int>7</int>
          <n>ratio</n><double>1.5</double>
          <n>text</n><o><![CDATA[Hello <XCON>]]></o>
          <n>items</n>
          <c>
            <o>one</o>
            <int>2</int>
          </c>
        </x>
      </xcon>
    `);

    expect(toJSONObject(doc)).toEqual({
      type: 'form',
      visible: true,
      count: 7,
      ratio: 1.5,
      text: 'Hello <XCON>',
      items: ['one', 2],
    });
  });

  test('parses semantic authoring XML and preserves namespaced metadata', () => {
    const doc = fromXml(`
      <Form width="402" height="800" designer:note="Hero screen" designer:locked="true">
        <Label id="title" text="Welcome" fontSize="24" />
        <Button id="start" label="Start" />
      </Form>
    `);

    expect(toJSONObject(doc)).toEqual({
      type: 'form',
      width: 402,
      height: 800,
      metadata: {
        'designer:note': 'Hero screen',
        'designer:locked': true,
      },
      components: {
        title: {
          type: 'label',
          id: 'title',
          text: 'Welcome',
          fontSize: 24,
        },
        start: {
          type: 'button',
          id: 'start',
          label: 'Start',
        },
      },
    });
  });

  test('detects machine and semantic XML formats', () => {
    expect(detectXmlSyntax('<xcon><x><n>type</n><o>form</o></x></xcon>')).toBe('machine');
    expect(detectXmlSyntax('<Form><Label name="title" text="Hello" /></Form>')).toBe('semantic');
  });

  test('round-trips public semantic XML child names as component dictionary keys', () => {
    const original = fromJSONObject({
      type: 'form',
      components: {
        hello: {
          type: 'label',
          text: 'Hello XCON',
          font: { size: 24, weight: 800 },
        },
      },
    });

    const xml = toXml(original, { format: 'semantic', pretty: true });
    const parsed = fromXml(xml);

    expect(xml).toContain('<Label name="hello"');
    expect(normalize(parsed)).toEqual(normalize(original));
  });

  test('round-trips semantic XML item arrays without converting them to components', () => {
    const original = fromJSONObject({
      type: 'stack',
      items: [
        { type: 'label', text: 'A' },
        { type: 'badge', text: 'B' },
      ],
    });

    const xml = toXml(original, { format: 'semantic', pretty: true });
    const parsed = fromXml(xml);

    expect(xml).toContain('<Items>');
    expect(normalize(parsed)).toEqual(normalize(original));
  });

  test('round-trips semantic XML structural names without losing component name props or numeric text', () => {
    const original = fromJSONObject({
      type: 'form',
      components: {
        icon: { type: 'icon', name: 'star' },
        code: { type: 'barcode', text: '1234567890' },
      },
    });

    const xml = toXml(original, { format: 'semantic', pretty: true });
    const parsed = fromXml(xml);

    expect(xml).toContain('name="icon"');
    expect(xml).toContain('xcon-prop-name="star"');
    expect(normalize(parsed)).toEqual(normalize(original));
  });

  test('infers semantic XML property types from public specs and keeps unknown attrs as strings', () => {
    const doc = fromXml(`
      <List
        itemSize='{"height":48,"width":300}'
        separator='{"style":"none","size":0}'
        padding="16"
        customCount="7">
        <Items>
          <Card title="A" padding="12" />
        </Items>
      </List>
    `);

    expect(toJSONObject(doc)).toEqual({
      type: 'list',
      itemSize: { height: 48, width: 300 },
      separator: { style: 'none', size: 0 },
      padding: 16,
      customCount: '7',
      items: [
        {
          type: 'card',
          title: 'A',
          padding: 12,
        },
      ],
    });
  });

  test('infers public extension component property types from semantic XML', () => {
    expect(toJSONObject(fromXml(`
      <SearchBar showSearchButton="true" showClearButton="false" debounceDelay="450" />
    `))).toEqual({
      type: 'searchBar',
      showSearchButton: true,
      showClearButton: false,
      debounceDelay: 450,
    });

    expect(toJSONObject(fromXml(`
      <Gallery columns="3" showCaption="true" allowZoom="false" showThumbnails="true" />
    `))).toEqual({
      type: 'gallery',
      columns: 3,
      showCaption: true,
      allowZoom: false,
      showThumbnails: true,
    });

    expect(toJSONObject(fromXml(`
      <TreeView showIcons="true" selectable="false" expandedNodes='["docs"]' />
    `))).toEqual({
      type: 'treeView',
      showIcons: true,
      selectable: false,
      expandedNodes: ['docs'],
    });
  });

  test('infers public utility component property types from semantic XML', () => {
    expect(toJSONObject(fromXml(`
      <Icon name="home" library="lucide" size="32" strokeWidth="3" rotation="45" />
    `))).toEqual({
      type: 'icon',
      name: 'home',
      library: 'lucide',
      size: 32,
      strokeWidth: 3,
      rotation: 45,
    });

    expect(toJSONObject(fromXml(`
      <Tooltip text="자세한 설명" position="bottom" trigger="click" delay="120" arrow="false" />
    `))).toEqual({
      type: 'tooltip',
      text: '자세한 설명',
      position: 'bottom',
      trigger: 'click',
      delay: 120,
      arrow: false,
    });

    expect(toJSONObject(fromXml(`
      <Modal title="삭제 확인" showCloseButton="false" backdropClose="true" closeOnBackdrop="false" animation="zoom" />
    `))).toEqual({
      type: 'modal',
      title: '삭제 확인',
      showCloseButton: false,
      backdropClose: true,
      closeOnBackdrop: false,
      animation: 'zoom',
    });
  });
});

describe('XCON/TAGLESS parser and serializer', () => {
  test('round-trips nested structures with default markers', () => {
    const doc = fromJSONObject({
      type: 'form',
      visible: true,
      pos: [0, 0, 320, 180],
      components: {
        title: { type: 'label', text: 'Hello' },
      },
    });

    const tagless = toTagless(doc);
    const parsed = fromTagless(tagless);

    expect(normalize(parsed)).toEqual(normalize(doc));
  });

  test('supports custom marker sets and rejects invalid markers', () => {
    const doc = fromJSONObject({ type: 'form', title: 'Custom markers can choose delimiters' });
    const tagless = toTagless(doc, { markers: 'ABCD', endMarkers: 'abcd' });

    expect(tagless.startsWith('ABCD')).toBe(true);
    expect(normalize(fromTagless(tagless))).toEqual(normalize(doc));
    expect(() => toTagless(doc, { markers: 'AABC', endMarkers: 'abcd' })).toThrow(
      /unique/i,
    );
  });

  test('writes and reads formatted TAGLESS documents', () => {
    const doc = fromJSONObject({
      type: 'form',
      backgroundColor: '#F8FAFC',
      pos: [0, 0, 320, 180],
      components: {
        hello: { type: 'label', text: 'Hello XCON' },
        barcode: { type: 'barcode', text: '1234567890' },
      },
    });

    const tagless = toTagless(doc, { pretty: true });

    expect(tagless).toContain('\n');
    expect(tagless).toContain('♧type♣◇form◆');
    expect(tagless).toContain('♧backgroundColor♣◇#F8FAFC◆');
    expect(tagless).toContain('♧text♣◇1234567890◆');
    expect(normalize(fromTagless(tagless))).toEqual(normalize(doc));

    const compact = toTagless(doc);

    expect(compact).toContain('♧type♣◇form◆');
    expect(compact).toContain('♧backgroundColor♣◇#F8FAFC◆');
    expect(compact).toContain('♧text♣◇1234567890◆');
    expect(compact).not.toContain('%22form%22');
    expect(compact).not.toContain('"form"');
    expect(normalize(fromTagless(compact))).toEqual(normalize(doc));
  });

  test('infers TAGLESS primitive types from public property specs and keeps unknown props as strings', () => {
    const tagless = `
      ♤♡◇♧
      ♤
        ♧type♣◇form◆
        ♧pos♣
        ♡
          ◇0◆
          ◇0◆
          ◇320◆
          ◇180◆
        ♥
        ♧visible♣◇true◆
        ♧unknownCount♣◇12◆
        ♧unknownFlag♣◇false◆
        ♧components♣
        ♤
          ♧login♣
          ♤
            ♧type♣◇textField◆
            ♧value♣◇jane@example.com◆
            ♧readonly♣◇true◆
            ♧enabled♣◇false◆
            ♧maxLength♣◇64◆
            ♧otpIndex♣◇2◆
            ♧inputType♣◇email◆
            ♧fieldState♣◇success◆
          ♠
          ♧barcode♣
          ♤
            ♧type♣◇barcode◆
            ♧text♣◇1234567890◆
            ♧displayValue♣◇true◆
          ♠
          ♧progress♣
          ♤
            ♧type♣◇progressBar◆
            ♧value♣◇72◆
            ♧max♣◇100◆
            ♧indicator♣
            ♤
              ♧show♣◇true◆
            ♠
          ♠
          ♧choice♣
          ♤
            ♧type♣◇select◆
            ♧value♣◇72◆
          ♠
        ♠
      ♠
      ♠♥◆♣
    `;

    expect(toJSONObject(fromTagless(tagless))).toEqual({
      type: 'form',
      pos: [0, 0, 320, 180],
      visible: true,
      unknownCount: '12',
      unknownFlag: 'false',
      components: {
        login: {
          type: 'textField',
          value: 'jane@example.com',
          readonly: true,
          enabled: false,
          maxLength: 64,
          otpIndex: 2,
          inputType: 'email',
          fieldState: 'success',
        },
        barcode: {
          type: 'barcode',
          text: '1234567890',
          displayValue: true,
        },
        progress: {
          type: 'progressBar',
          value: 72,
          max: 100,
          indicator: {
            show: true,
          },
        },
        choice: {
          type: 'select',
          value: '72',
        },
      },
    });
  });
});

describe('converter, validator, and path utilities', () => {
  test('serializes existing XCON documents to SKETCH instead of loading a sample', () => {
    const doc = fromJSONObject({
      type: 'form',
      title: 'AirBnB - Main',
      pos: [0, 0, 402, 800],
      border: {
        visible: true,
        width: 1,
        style: 'solid',
        color: 'var(--border)',
        radius: 28,
      },
      components: {
        componentsOrder: 'main',
        main: {
          type: 'panel',
          name: 'main',
          pos: [0, 0, 560, 32],
          scroll: 'vertical',
          components: {
            componentsOrder: 'logo',
            logo: {
              type: 'shape',
              name: 'logo',
              pos: [0, 0, 200, 40],
              text: '<span class="xa-showcase-stay-logo">air<span>bnb</span></span>',
              renderHtml: true,
            },
          },
        },
      },
    });

    const sketch = serializeBySyntax(doc, 'sketch');
    const parsed = fromSketch(sketch);

    expect(sketch).toContain('screen 402x800');
    expect(sketch).toContain('title "AirBnB - Main"');
    expect(sketch).toContain('main: panel at 0 0 560 32');
    expect(sketch).toContain('logo: shape "<span class=\\"xa-showcase-stay-logo\\">air<span>bnb</span></span>" at 0 0 200 40');
    expect(normalize(parsed)).toEqual(normalize(doc));
  });

  test('does not warn about renderHtml when a trusted renderer policy is explicit', () => {
    const doc = fromJSONObject({
      type: 'form',
      components: {
        logo: {
          type: 'shape',
          text: '<b>Logo</b>',
          renderHtml: true,
        },
      },
    });

    expect(validate(doc).warnings.map((warning) => warning.path)).toContain('components.logo.renderHtml');
    expect(validate(doc, { trustedRendererPolicy: true }).warnings).toHaveLength(0);
  });

  test('converts SKETCH into JSON, XML, and TAGLESS through the normalized model', () => {
    const sketch = `
      screen 360x220 bg #f8fafc
      title: label "Hello Sketch" at 24 24 312 36
        font 24 800
        align center
    `;

    const json = convert(sketch, 'sketch', 'json');
    const xml = convert(sketch, 'sketch', 'xml');
    const tagless = convert(sketch, 'sketch', 'tagless');

    expect(toJSONObject(fromJSON(json))).toMatchObject({
      type: 'form',
      pos: [0, 0, 360, 220],
      components: {
        title: {
          type: 'label',
          text: 'Hello Sketch',
        },
      },
    });
    expect(xml).toContain('<Label name="title"');
    expect(tagless).toContain('♧text♣◇Hello Sketch◆');
    expect(toJSONObject(deserialize(sketch))).toMatchObject({
      components: {
        title: {
          text: 'Hello Sketch',
        },
      },
    });
  });

  test('converts JSON, XML, and TAGLESS through the same normalized model', () => {
    const json = JSON.stringify({
      type: 'form',
      components: {
        title: { type: 'label', text: 'Hello' },
      },
    });

    const xml = convert(json, 'json', 'xml');
    const tagless = convert(xml, 'xml', 'tagless');
    const jsonAgain = convert(tagless, 'tagless', 'json');

    expect(xml).toContain('<Label name="title"');
    expect(tagless).toContain('\n');
    expect(normalize(fromJSON(jsonAgain))).toEqual(normalize(fromJSON(json)));
    expect(normalize(deserialize(xml))).toEqual(normalize(fromJSON(json)));
    expect(normalize(deserialize(tagless))).toEqual(normalize(fromJSON(json)));
  });

  test('validates public component basics and reports precise paths', () => {
    const invalid = fromJSONObject({
      type: 'form',
      pos: [0, 0, 402],
      components: {
        unsafe: {
          type: 'button',
          onClick: 'runAppLogic',
        },
      },
    });

    const result = validate(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain('pos');
    expect(result.errors.map((error) => error.path)).toContain('components.unsafe.onClick');
  });

  test('rejects executable action references with precise paths', () => {
    const invalid = fromJSONObject({
      type: 'form',
      actions: {
        save: { type: 'httpRequest', url: '/api/save' },
      },
      database: {
        tables: {},
      },
      components: {
        list: {
          type: 'list',
          actionRef: 'loadRows',
          backend: {
            method: 'GET',
            path: '/api/products',
          },
        },
        cta: {
          type: 'button',
          onClick_ref: 'save',
        },
      },
    });

    const result = validate(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining([
        'actions',
        'database',
        'components.list.actionRef',
        'components.list.backend',
        'components.cta.onClick_ref',
      ]),
    );
  });

  test('validates component objects nested inside public array props', () => {
    const invalid = fromJSONObject({
      type: 'form',
      components: {
        grid: {
          type: 'grid',
          items: [
            { type: 'label', text: 'Safe' },
            { type: 'button', label: 'Unsafe', onClick_ref: 'save' },
          ],
        },
        banner: {
          type: 'banner',
          slides: [
            { type: 'image', src: 'javascript:alert(1)' },
          ],
        },
      },
    });

    const result = validate(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining([
        'components.grid.items._items(1).onClick_ref',
        'components.banner.slides._items(0).src',
      ]),
    );
  });

  test('accepts generated showcase ordering metadata and custom sample components', () => {
    const showcase = fromJSONObject({
      type: 'form',
      components: {
        componentsOrder: 'counter,progress',
        counter: {
          type: 'myCounter',
          pos: '0,0,120,44',
          value: 3,
        },
        progress: {
          type: 'myProgressBar',
          pos: '0,0,180,16',
          value: 64,
        },
      },
    });

    const result = validate(showcase);

    expect(result.valid).toBe(true);
  });

  test('accepts advanced viewer component types exposed by the public schema', () => {
    const doc = fromJSONObject({
      type: 'form',
      components: {
        chart: { type: 'chart', chartType: 'bar' },
        code: { type: 'codeEditor', mode: 'javascript' },
        rich: { type: 'richEditor', theme: 'snow' },
        viz: { type: 'dataViz', vizType: 'bar' },
        spanGrid: { type: 'spanGrid', data: [['Name', 'Status'], ['XCON', 'Ready']] },
        flipbook: { type: 'flipbook', pages: 2 },
        network: { type: 'networkDiagram', nodes: [] },
        map: { type: 'map', latitude: 37.5665, longitude: 126.978 },
        calendar: { type: 'calendar', events: [] },
      },
    });

    const result = validate(doc);

    expect(result.valid).toBe(true);
  });

  test('coerces networkDiagram professional viewer options', () => {
    const doc = fromSketch(`
      screen "Network" 640x420
        network: networkDiagram at 0 0 640 420
          theme "obsidian"
          showControls true
          showSearch true
          showFilters true
          showLegend true
          enableDrag true
          enableZoom true
          enablePan true
          enableHover true
          selectedColor "#f8fafc"
          neighborColor "#60a5fa"
          mutedOpacity 0.18
          clusterColors ["#60a5fa","#34d399"]
          panelBackground "#111827"
          nodes [{"id":"a","label":"A"}]
          edges [{"from":"a","to":"b"}]
    `);

    const network = getByPath(doc, 'components.network');
    expect(network).toBeInstanceOf(XconObject);
    if (!(network instanceof XconObject)) throw new Error('network not parsed');

    expect(network.get('theme')).toBe('obsidian');
    expect(network.get('showControls')).toBe(true);
    expect(network.get('showSearch')).toBe(true);
    expect(network.get('showFilters')).toBe(true);
    expect(network.get('showLegend')).toBe(true);
    expect(network.get('enableDrag')).toBe(true);
    expect(network.get('enableZoom')).toBe(true);
    expect(network.get('enablePan')).toBe(true);
    expect(network.get('enableHover')).toBe(true);
    expect(network.get('selectedColor')).toBe('#f8fafc');
    expect(network.get('neighborColor')).toBe('#60a5fa');
    expect(network.get('mutedOpacity')).toBe(0.18);
    expect(network.get('clusterColors')).toEqual(['#60a5fa', '#34d399']);
    expect(network.get('panelBackground')).toBe('#111827');
    expect(normalize(network.get('edges'))).toEqual([{ from: 'a', to: 'b' }]);

    expect(toJSONObject(fromXml(`
      <NetworkDiagram
        theme="obsidian"
        showControls="true"
        showSearch="true"
        showFilters="true"
        showLegend="true"
        enableDrag="true"
        enableZoom="true"
        enablePan="true"
        enableHover="true"
        selectedColor="#f8fafc"
        neighborColor="#60a5fa"
        mutedOpacity="0.18"
        clusterColors='["#60a5fa","#34d399"]'
        panelBackground="#111827"
        nodes='[{"id":"a","label":"A"}]'
        edges='[{"from":"a","to":"b"}]' />
    `))).toEqual({
      type: 'networkDiagram',
      theme: 'obsidian',
      showControls: true,
      showSearch: true,
      showFilters: true,
      showLegend: true,
      enableDrag: true,
      enableZoom: true,
      enablePan: true,
      enableHover: true,
      selectedColor: '#f8fafc',
      neighborColor: '#60a5fa',
      mutedOpacity: 0.18,
      clusterColors: ['#60a5fa', '#34d399'],
      panelBackground: '#111827',
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ from: 'a', to: 'b' }],
    });
  });

  test('rejects host-only and local-file components from the public schema', () => {
    const removedTypes = ['webView', 'frame', 'import', 'fileUpload', 'filePicker', 'imagePicker', 'signaturePad'];
    const doc = fromJSONObject({
      type: 'form',
      components: Object.fromEntries(removedTypes.map((type) => [type, { type }])),
    });

    const result = validate(doc);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.message)).toEqual(
      expect.arrayContaining(removedTypes.map((type) => `Unknown public component type "${type}".`)),
    );
  });

  test('reads nested values without exposing write-path runtime behavior', () => {
    const doc = fromJSONObject({
      type: 'form',
      components: {
        list: {
          type: 'list',
          items: [{ name: 'Alpha' }, { name: 'Beta' }],
        },
      },
    });

    expect(getByPath(doc, 'components.list.items._items(1).name')).toBe('Beta');
    expect(getAllPaths(doc)).toContain('components.list.items._items(0).name');
  });

  test('prints dictionaries for read-only debugging without mutating values', () => {
    const doc = fromJSONObject({
      type: 'form',
      title: 'Debug',
      components: {
        label: { type: 'label', text: 'Hello' },
      },
    });

    const printed = printDict(doc);

    expect(printed).toContain('type: form');
    expect(printed).toContain('components:');
    expect(printed).toContain('label:');
    expect(normalize(doc)).toEqual({
      type: 'form',
      title: 'Debug',
      components: {
        label: { type: 'label', text: 'Hello' },
      },
    });
  });
});
