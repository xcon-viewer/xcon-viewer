import {
  XconObject,
  deserialize,
  detectXconSyntax,
  fromJSONObject,
  fromSketchLenient,
  isXconObject,
  type SketchRecoveryError,
  type XconValue,
} from '@xcon-viewer/core';
import { renderNetworkStatic } from './network/static';

export interface RenderOptions {
  allowExternalResources?: boolean;
  allowHtml?: boolean;
  maxDepth?: number;
  maxNodes?: number;
}

interface RenderContext {
  options: Required<RenderOptions>;
  nodes: number;
  componentBounds: Map<string, Rect>;
}

interface RenderState {
  parentFlow: boolean;
  fillParent?: boolean;
  eagerMedia?: boolean;
  layerStack?: boolean;
}

interface BuildStyleOptions {
  includeAutoLayout?: boolean;
  isRoot?: boolean;
}

type Rect = [number, number, number, number];

export interface ResolvedRenderInput {
  root: XconObject;
  diagnostics: SketchRecoveryError[];
}

const defaultOptions: Required<RenderOptions> = {
  allowExternalResources: false,
  allowHtml: false,
  maxDepth: 64,
  maxNodes: 10000,
};

const leafletCssUrl = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const leafletJsUrl = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
const openStreetMapTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const openStreetMapAttribution = '(C) OpenStreetMap contributors';

interface BannerRuntimeState {
  index: number;
  timer: number | undefined;
  bound: boolean;
  width: number;
  startX: number;
  startY: number;
  dragging: boolean;
}

interface ExtCarouselRuntimeState {
  index: number;
  timer: number | undefined;
  bound: boolean;
  startX: number;
  startY: number;
  dragging: boolean;
}

interface ShapeImageAnimationRuntimeState {
  index: number;
  timer: number | undefined;
  bound: boolean;
  forward: boolean;
  iterationCount: number;
}

const bannerStates = new WeakMap<HTMLElement, BannerRuntimeState>();
const extCarouselStates = new WeakMap<HTMLElement, ExtCarouselRuntimeState>();
const shapeImageAnimationStates = new WeakMap<HTMLElement, ShapeImageAnimationRuntimeState>();
const bannerTransition = 'transform .42s cubic-bezier(.22,1,.36,1)';
let customSelectDocumentBound = false;
let leafletRuntimePromise: Promise<unknown> | undefined;

const allowedCssProperties = new Set([
  'align-items',
  'align-self',
  'background',
  'background-color',
  'border',
  'border-color',
  'border-radius',
  'border-style',
  'border-width',
  'box-sizing',
  'box-shadow',
  'color',
  'display',
  'flex',
  'flex-direction',
  'flex-wrap',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'gap',
  'grid-template-columns',
  'height',
  'justify-content',
  'letter-spacing',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'object-fit',
  'object-position',
  'opacity',
  'overflow',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration',
  'vertical-align',
  'white-space',
  'width',
]);

const activeCssPattern = /expression\s*\(|javascript:|vbscript:|url\s*\(|behavior\s*:/i;
const themeTokenAliasPattern = /(^|[\s,(])@([A-Za-z_][\w-]*)(?=$|[\s,),])/g;

export const viewerCss = `
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
.xa-al-tv-static .tv-list{padding-left:0;list-style:none;display:flex;flex-direction:column;gap:6px}.xa-al-tv-static .tv-list li{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--ink-2)}.xa-al-tv-static .tv-list li::before{content:"→";color:var(--accent);flex-shrink:0;font-weight:700}
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
.xa-al-rb-plan{position:relative;border:1.5px solid var(--border2);border-radius:10px;padding:16px 14px;cursor:pointer;transition:border-color .2s,box-shadow .2s;box-sizing:border-box;min-width:0;display:block}.xa-al-rb-plan-input{position:absolute;opacity:0}.xa-al-rb-plan:has(input:checked){border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),var(--shadow-sm)}.xa-al-rb-plan__badge{display:none;position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:20px}.xa-al-rb-plan:has(input:checked) .xa-al-rb-plan__badge{display:block}.xa-al-rb-plan__name{font-size:12px;font-weight:700;color:var(--ink);margin-bottom:4px}.xa-al-rb-plan__price{font-family:"Playfair Display",serif;font-size:22px;font-weight:700;color:var(--ink);line-height:1}.xa-al-rb-plan__per{font-size:10px;color:var(--ink-3);font-family:var(--font-body);font-weight:600}.xa-al-rb-plan__features{margin-top:10px;display:flex;flex-direction:column;gap:4px}.xa-al-rb-plan__feat{font-size:11px;color:var(--ink-2);display:flex;align-items:center;gap:5px}.xa-al-rb-plan__feat::before{content:"✓";color:var(--green);font-weight:700;font-size:10px}
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
.picker-input-wrap{position:relative;width:100%;min-width:0}.picker-input-wrap input{width:100%;height:40px;padding:8px 40px 8px 10px;border:1px solid var(--border2);border-radius:6px;box-sizing:border-box;background:var(--surface);color:var(--ink);font:inherit}.picker-input-icon{position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ink-3);font-size:0}.picker-input-icon::before{font-size:15px}.picker-input-wrap--date .picker-input-icon::before{content:"📅"}.picker-input-wrap--time .picker-input-icon::before{content:"🕐"}
.time-picker{width:100%;min-width:0}.time-picker__display{text-align:center;padding:14px;background:var(--surface2);border-radius:8px;margin-bottom:16px}.time-picker__time{font-family:"Syne Mono","JetBrains Mono",ui-monospace,monospace;font-size:36px;font-weight:600;color:var(--ink);letter-spacing:2px}.time-picker__ampm{font-size:13px;color:var(--ink-3);margin-left:6px}.time-picker__cols{display:flex;gap:16px}.time-picker__col{flex:1}.time-picker__col-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink-3);text-align:center;margin-bottom:8px}.time-picker__scroll{max-height:140px;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;border-radius:6px;background:var(--surface2)}.time-picker__scroll::-webkit-scrollbar{display:none}.time-picker__item{padding:8px;text-align:center;font-size:13px;cursor:pointer;color:var(--ink-3);scroll-snap-align:start;transition:background .15s,color .15s}.time-picker__item:hover{color:var(--ink)}.time-picker__item.selected{color:var(--accent-2);font-weight:600;background:rgba(var(--accent-rgb),.1)}
.tree{width:100%}.tree-container{border:1px solid var(--border);border-radius:4px;background:var(--surface);overflow-y:auto;max-height:280px}.tree-node{user-select:none}.tree-row{display:flex;align-items:center;gap:6px;padding:5px 0 5px 4px;border-radius:5px;cursor:pointer;color:var(--ink-2);font-size:13px;transition:background .15s,color .15s}.tree-row:hover{background:var(--tap-hover);color:var(--ink)}.tree-row.selected{background:rgba(var(--accent-rgb),.1);color:var(--accent-2)}.tree-chevron{width:14px;height:14px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s;visibility:hidden}.tree-row.has-children .tree-chevron{visibility:visible}.tree-row.has-children.expanded .tree-chevron{transform:rotate(90deg)}.tree-icon{font-size:13px;flex-shrink:0}.tree-label{flex:1;font-size:12px}.tree-children{margin-left:16px;border-left:1px solid var(--border);padding-left:8px;overflow:hidden}.tree-children.collapsed{display:none}
.xa-ext-gallery-host{width:100%;min-width:0}.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:auto;gap:6px}.gallery-item{position:relative;border-radius:6px;overflow:hidden;cursor:pointer;background:var(--surface2)}.gallery-item:nth-child(1){grid-row:span 2}.gallery-item:nth-child(4){grid-column:span 2}.gallery-item img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s;min-height:80px}.gallery-item:hover img{transform:scale(1.06)}.gallery-caption{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;padding:16px 12px 8px;font-size:14px}.gallery-item__overlay{position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;transition:background .3s}.gallery-item:hover .gallery-item__overlay{background:rgba(0,0,0,.35)}.gallery-item__overlay svg{opacity:0;stroke:#fff;fill:none;width:24px;height:24px;stroke-width:2;transition:opacity .3s}.gallery-item:hover .gallery-item__overlay svg{opacity:1}.lightbox{position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:20000;display:none;align-items:center;justify-content:center}.lightbox.open{display:flex}.lightbox img{max-width:90vw;max-height:90vh;border-radius:8px;object-fit:contain}.lightbox-close{position:absolute;top:16px;right:16px;width:36px;height:36px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:50%;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:background .2s}.lightbox-close:hover{background:rgba(255,255,255,.2)}.lightbox-close svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}
.qr-wrap,.barcode-wrap{display:flex;flex-direction:column;align-items:center;gap:14px}.qr-canvas{border-radius:8px;border:1px solid var(--border);background:#fff}.qr-input-row{display:flex;gap:8px;width:100%}.qr-input-row .f-input{flex:1}.qr-gen-btn{padding:0 16px;background:var(--accent);color:#fff;border:none;border-radius:var(--r-sm);font-family:var(--font-body);font-weight:600;font-size:12px;cursor:pointer;white-space:nowrap;transition:background .2s}.qr-gen-btn:hover{background:var(--accent-2)}.qr-text{font-size:12px;color:var(--ink-3);word-break:break-all;text-align:center}.barcode-canvas{border-radius:6px;background:#fff;padding:12px;border:1px solid var(--border)}.barcode-text{font-family:"Syne Mono",monospace;font-size:13px;color:var(--ink-2);letter-spacing:3px}
.xa-ext-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.xa-ext-gallery img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:var(--r-sm);display:block}.xa-ext-tree{border:1px solid var(--border2);border-radius:var(--r-sm);background:var(--surface);padding:10px 12px;color:var(--ink-2);font-size:13px;line-height:1.8}.xa-ext-tree ul{list-style:none;margin:0;padding-left:16px}.xa-ext-tree li::before{content:"›";color:var(--accent);font-weight:800;margin-right:6px}
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
.xa-flipbook-container .catalog-app{width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center}.xa-flipbook-container .flipbook-viewer{position:relative;display:flex;align-items:center;justify-content:center;min-width:600px;min-height:400px}.xa-flipbook-container .ui-flipbook{position:relative;margin:0 auto;box-shadow:0 4px 20px rgba(0,0,0,.3);border-radius:8px;overflow:visible}.xa-flipbook-container .ui-flipbook .page{background:white;border:1px solid #ddd;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;width:220px;height:320px}.xa-flipbook-container .ui-flipbook .page img{max-width:100%;max-height:100%;object-fit:contain}.page-content{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}.flipbook-page-placeholder{padding:20px;text-align:center;color:#666}.flipbook-controls{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);padding:10px;border-radius:5px;display:flex;gap:10px;z-index:1000}.flipbook-control-btn{background:#333;color:white;border:none;padding:8px 12px;border-radius:3px;cursor:pointer;font-size:14px}.flipbook-control-btn:hover{background:#555}.flipbook-page-info{color:white;display:flex;align-items:center;font-size:14px;margin:0 10px}.flipbook-miniatures{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);padding:10px;border-radius:5px;display:none;max-width:80%;overflow-x:auto}.flipbook-miniature{display:inline-block;width:60px;height:80px;margin:0 5px;cursor:pointer;border:2px solid transparent;border-radius:3px;overflow:hidden;background:transparent;padding:0}.flipbook-miniature:hover{border-color:#fff}.flipbook-miniature.active{border-color:#007bff}.flipbook-miniature img{width:100%;height:100%;object-fit:cover}.ui-arrow-control{position:absolute;top:50%;transform:translateY(-50%);width:50px;height:50px;background:rgba(0,0,0,.6);color:white;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:1001;border-radius:25px;font-size:24px;font-weight:bold;transition:all .3s ease;border:2px solid rgba(255,255,255,.3)}.ui-arrow-control:hover{background:rgba(0,0,0,.8);border-color:rgba(255,255,255,.6);transform:translateY(-50%) scale(1.1)}.ui-arrow-next-page{right:10px}.ui-arrow-previous-page{left:10px}.ui-arrow-next-page::before{content:"›"}.ui-arrow-previous-page::before{content:"‹"}
.xa-network-diagram-container{position:relative;background:linear-gradient(135deg,#f7fafc 0%,#e2e8f0 100%);border:none;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.1),0 8px 16px rgba(0,0,0,.06);backdrop-filter:blur(10px)}.network-svg{cursor:grab;transition:all .3s ease}.network-svg:active{cursor:grabbing}.network-node{cursor:pointer;stroke:#fff;stroke-width:3px;filter:drop-shadow(0 6px 12px rgba(0,0,0,.15));transition:stroke .2s ease,stroke-width .2s ease,filter .2s ease}.network-node:hover{stroke:var(--xcon-network-accent,#f093fb);stroke-width:4px;filter:drop-shadow(0 12px 24px rgba(0,0,0,.2))}.network-node.root-node{stroke:#fff;stroke-width:5px;filter:drop-shadow(0 8px 16px rgba(102,126,234,.4))}.network-node.expanded{stroke:var(--xcon-network-accent,#f093fb);stroke-width:4px;filter:drop-shadow(0 6px 12px rgba(240,147,251,.3))}.network-link{fill:none;stroke:var(--xcon-network-link,#cbd5e0);stroke-width:3px;stroke-opacity:.7;transition:all .3s ease}.network-link:hover{stroke:var(--xcon-network-primary,#667eea);stroke-width:4px;stroke-opacity:.9}.network-link.ref-link{stroke:var(--xcon-network-ref-link,#a0aec0);stroke-opacity:.5;stroke-width:2px;stroke-dasharray:8,4;animation:dash 2s linear infinite}@keyframes dash{to{stroke-dashoffset:-12}}.network-link.marker-only{stroke:var(--xcon-network-accent,#f093fb);stroke-opacity:.7;stroke-width:3px}.network-label{fill:var(--xcon-network-text,#2d3748);font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;font-weight:600;text-anchor:middle;pointer-events:none;user-select:none;text-shadow:0 2px 4px rgba(255,255,255,.8);transition:all .3s ease}.network-label:hover{fill:var(--xcon-network-primary,#667eea);font-weight:700}.network-label.root-label{font-weight:800;font-size:14px;fill:var(--xcon-network-primary,#667eea);text-shadow:0 3px 6px rgba(0,0,0,.15)}.network-tooltip{position:absolute;background:linear-gradient(135deg,rgba(102,126,234,.95) 0%,rgba(118,75,162,.95) 100%);color:white;padding:16px 20px;border-radius:12px;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-weight:500;pointer-events:none;opacity:0;transition:all .4s cubic-bezier(.4,0,.2,1);z-index:1000;box-shadow:0 12px 24px rgba(0,0,0,.2);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.3);text-align:center}.network-tooltip.show{opacity:1;transform:translateY(-4px)}.network-tooltip::before{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:8px solid transparent;border-top-color:rgba(102,126,234,.95)}.network-arrow{fill:var(--xcon-network-link,#cbd5e0);transition:all .3s ease}.network-arrow.ref-arrow{fill:var(--xcon-network-ref-link,#a0aec0)}.network-group{cursor:pointer;transition:all .3s ease}.network-border{fill:none;stroke:var(--xcon-network-ref-link,#a0aec0);stroke-width:2px;stroke-opacity:.4;stroke-dasharray:5,5;transition:all .3s ease}.network-border:hover{stroke:var(--xcon-network-primary,#667eea);stroke-opacity:.8;stroke-width:3px}.network-image{pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.1))}.loading-spinner{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:18px;color:var(--xcon-network-text,#2d3748);font-weight:500;animation:pulse 2s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.xa-map-container{position:relative;background:#eef3ed;border:1px solid #d5dee7;border-radius:10px;overflow:hidden}.xa-map-static{position:relative;width:100%;height:100%;min-height:180px;overflow:hidden;background:#e8efe5}.xa-map-static::before{content:"";position:absolute;inset:0;background-image:linear-gradient(0deg,rgba(132,153,166,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(132,153,166,.18) 1px,transparent 1px),linear-gradient(45deg,rgba(255,255,255,.42) 16%,transparent 16.5%,transparent 83%,rgba(255,255,255,.42) 83.5%);background-size:64px 64px,64px 64px,96px 96px;opacity:.9}.xa-map-static::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 24% 28%,rgba(255,255,255,.46),transparent 28%),radial-gradient(circle at 74% 72%,rgba(255,255,255,.36),transparent 24%);pointer-events:none}.xa-map-static--snapshot::before,.xa-map-static--snapshot::after,.xa-map-static--leaflet::before,.xa-map-static--leaflet::after{display:none}.xa-map-snapshot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block;z-index:1;background:#dfe7dc}.xa-map-layer{position:absolute;display:block;pointer-events:none}.xa-map-water{left:-10%;top:58%;width:120%;height:70px;border-radius:999px;background:linear-gradient(90deg,rgba(126,190,217,.62),rgba(167,213,231,.8),rgba(126,190,217,.58));transform:rotate(-7deg);box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);opacity:.9}.xa-map-park{background:rgba(129,190,112,.34);border:1px solid rgba(86,145,91,.16);border-radius:18px}.xa-map-park--north{left:5%;top:9%;width:28%;height:30%;transform:rotate(-12deg)}.xa-map-park--south{right:8%;bottom:8%;width:30%;height:28%;transform:rotate(8deg)}.xa-map-road{background:rgba(255,255,255,.95);border-radius:999px;box-shadow:0 0 0 1px rgba(151,163,176,.26),0 2px 7px rgba(79,92,111,.1)}.xa-map-road--main{left:-8%;top:47%;width:116%;height:18px;transform:rotate(-13deg)}.xa-map-road--cross{left:20%;top:-8%;width:16px;height:116%;transform:rotate(19deg)}.xa-map-road--vertical{left:63%;top:-10%;width:14px;height:120%;transform:rotate(-4deg)}.xa-map-road--ring{left:55%;top:18%;width:126px;height:88px;border:10px solid rgba(255,255,255,.92);border-radius:999px;background:transparent;box-shadow:0 0 0 1px rgba(151,163,176,.26),0 3px 8px rgba(79,92,111,.1)}.xa-map-label{z-index:5;color:#5f6f5d;background:rgba(255,255,255,.72);border:1px solid rgba(137,154,135,.25);border-radius:999px;padding:3px 7px;font-size:10px;font-weight:700;letter-spacing:.01em;box-shadow:0 2px 6px rgba(74,87,71,.12)}.xa-map-label--north{left:8%;top:12%}.xa-map-label--center{left:42%;top:35%}.xa-map-label--south{right:9%;bottom:14%}.xa-map-attribution{position:absolute;right:8px;bottom:6px;z-index:10;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,.76);color:#6b7280;font-size:9px;box-shadow:0 1px 4px rgba(0,0,0,.1)}.xa-map-marker{position:absolute;z-index:9;transform:translate(-50%,-100%);min-width:24px;height:24px;border-radius:999px;background:#667eea;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,.24);border:2px solid rgba(255,255,255,.8)}.xcon-leaflet-marker{width:28px!important;height:28px!important;margin-left:-14px!important;margin-top:-28px!important;background:#2563eb;border:2px solid #fff;border-radius:999px;box-shadow:0 8px 18px rgba(15,23,42,.34);color:#fff;display:flex!important;align-items:center;justify-content:center;font:800 11px/1 system-ui,sans-serif}.xcon-leaflet-marker::after{content:"";position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);border:7px solid transparent;border-top-color:#2563eb}.xcon-leaflet-marker--rain,.xcon-leaflet-marker--wind{background:#0ea5e9}.xcon-leaflet-marker--rain::after,.xcon-leaflet-marker--wind::after{border-top-color:#0ea5e9}.xcon-leaflet-marker--cloud,.xcon-leaflet-marker--cool{background:#64748b}.xcon-leaflet-marker--cloud::after,.xcon-leaflet-marker--cool::after{border-top-color:#64748b}.xcon-leaflet-marker--sun{background:#f97316}.xcon-leaflet-marker--sun::after{border-top-color:#f97316}.xa-map .leaflet-control-container{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif}.xa-map .leaflet-popup-content-wrapper{border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15)}.xa-map .leaflet-popup-content{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.4}
.xa-calendar-container{position:relative;background:#fff;border:1px solid #dee2e6;border-radius:8px;overflow:hidden;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif}.xa-calendar-static{height:100%;display:flex;flex-direction:column;padding:12px;box-sizing:border-box}.fc-header-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.fc-button-primary{background:#667eea;border:1px solid #667eea;color:#fff;border-radius:4px;padding:5px 10px}.xa-calendar .fc-button-primary:hover{background:#5a67d8;border-color:#5a67d8}.fc-scrollgrid{width:100%;border-collapse:collapse;table-layout:fixed;flex:1}.fc-scrollgrid th{background:#f8f9fa;color:#495057;font-size:12px;border:1px solid #dee2e6;padding:6px}.fc-scrollgrid td{height:34px;border:1px solid #dee2e6;vertical-align:top;padding:2px}.fc-daygrid-day-number{background:none;border:0;color:#495057;font-size:12px;padding:2px 4px}.fc-today{background:rgba(102,126,234,.1)!important}.xa-calendar .fc-theme-standard .fc-scrollgrid{border:1px solid #dee2e6}.xa-calendar .fc-theme-standard .fc-col-header-cell{background:#f8f9fa;border-color:#dee2e6}.xa-calendar .fc-theme-standard .fc-daygrid-day{border-color:#dee2e6}.xa-calendar .fc-button-primary{background:#667eea;border-color:#667eea}.xa-calendar .fc-event{border-radius:4px;border:none;padding:2px 4px}.xa-calendar .fc-event-title{font-weight:500}.xa-calendar .fc-today{background:rgba(102,126,234,.1)!important}
.xa-map-loading,.xa-calendar-loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,.9);padding:20px;border-radius:8px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.1);display:none}.xa-map-loading .spinner,.xa-calendar-loading .spinner{width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #667eea;border-radius:50%;animation:xa-advanced-spin 1s linear infinite;margin:0 auto 10px}@keyframes xa-advanced-spin{to{transform:rotate(360deg)}}
`.trim();

export const viewerScript = `
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
        button.textContent = collapsed ? 'Read more ↓' : 'Show less ↑';
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
    const text = xconLeafletSafeHtml(String(label || '').slice(0, 2) || '•');
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

export function render(input: unknown, target: HTMLElement, options: RenderOptions = {}): void {
  target.replaceChildren();
  const resolved = resolveRenderInput(input);
  const host = target.ownerDocument.createElement('div');
  host.className = 'xcon-viewer-host';
  host.setAttribute('data-xcon-viewer-host', '');
  host.setAttribute('style', xconHostFrameStyle(resolved.root));
  host.innerHTML = renderResolvedToHtml(resolved, options);
  target.appendChild(host);
  hydrateXconViewer(target);
}

function xconHostFrameStyle(root: XconObject): string {
  const pos = rectParts(root.get('pos'));
  const declarations = [
    'position:relative',
    'display:inline-block',
    'box-sizing:border-box',
    'max-width:100%',
    'overflow:visible',
    'vertical-align:top',
    'isolation:isolate',
  ];
  if (pos) {
    const width = Math.max(0, pos[0]) + pos[2];
    const height = Math.max(0, pos[1]) + pos[3];
    declarations.push(`width:${numberPx(width)}`, `height:${numberPx(height)}`);
  } else {
    declarations.push('width:100%', 'min-height:100%');
  }
  return declarations.join(';');
}

export function renderToHtml(input: unknown, options: RenderOptions = {}): string {
  return renderResolvedToHtml(resolveRenderInput(input), options);
}

function renderResolvedToHtml(resolved: ResolvedRenderInput, options: RenderOptions = {}): string {
  const root = resolved.root;
  const context: RenderContext = {
    options: { ...defaultOptions, ...options },
    nodes: 0,
    componentBounds: collectComponentBounds(root),
  };
  return renderComponent(root, context, 0, { parentFlow: false }, 'root') + renderXconDiagnostics(resolved.diagnostics);
}

export function renderDocument(input: unknown, options: RenderOptions = {}): string {
  const resolved = resolveRenderInput(input);
  const root = resolved.root;
  const framedHtml = tag(
    'div',
    {
      class: 'xcon-viewer-host',
      'data-xcon-viewer-host': '',
      style: xconHostFrameStyle(root),
    },
    renderResolvedToHtml(resolved, options),
  );
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>XCON Render</title><style id="xcon-viewer-style">${viewerCss}</style></head><body style="margin:0;padding:0;background:transparent;">${framedHtml}<script id="xcon-viewer-runtime">${viewerScript}</script></body></html>`;
}

export function hydrateXconViewer(root: ParentNode = document): void {
  const banners = Array.from(root.querySelectorAll<HTMLElement>('[data-xcon-carousel="true"]'));
  for (const banner of banners) hydrateBanner(banner);
  hydrateTextFields(root);
  hydrateTextViews(root);
  hydrateLayoutShowcases(root);
  hydrateCustomSelects(root);
  hydrateRanges(root);
  hydrateSwitches(root);
  hydrateDisclosureControls(root);
  hydratePickerControls(root);
  hydrateGalleryControls(root);
  hydrateTreeViews(root);
  hydrateQrCodes(root);
  hydrateBarcodes(root);
  hydrateImageFallbacks(root);
  hydrateImageSlideshows(root);
  hydrateTooltipControls(root);
  hydrateModalControls(root);
  hydrateRatingControls(root);
  hydrateExtCarousels(root);
  hydrateShapeImageAnimations(root);
  hydrateFlipbooks(root);
  hydrateSpanGrids(root);
  hydrateLeafletMaps(root);
}

function hydrateTextFields(root: ParentNode = document): void {
  root.querySelectorAll<HTMLButtonElement>('[data-xcon-tf-toggle="visibility"]').forEach((button) => {
    if (button.dataset.xconTfBound === 'true') return;
    button.dataset.xconTfBound = 'true';
    button.addEventListener('click', () => {
      const wrap = button.closest('.xa-al-tf-addon-wrap,.xa-al-tf-block-wrap,.xa-al-tf-float-group,.pw-wrap');
      const input = wrap?.querySelector<HTMLInputElement>('input.xa-al-tf,input.f-input');
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-xcon-tf-clear]').forEach((button) => {
    if (button.dataset.xconTfClearBound === 'true') return;
    button.dataset.xconTfClearBound = 'true';
    button.addEventListener('click', () => {
      const wrap = button.closest('.xa-al-tf-addon-wrap,.xa-al-tf-block-wrap,.xa-al-tf-float-group');
      const input = wrap?.querySelector<HTMLInputElement>('input.xa-al-tf');
      if (!input || input.disabled || input.readOnly) return;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    });
  });

  root.querySelectorAll<HTMLElement>('[data-xcon-pw-strength]').forEach((strength) => {
    if (strength.dataset.xconPwBound === 'true') return;
    strength.dataset.xconPwBound = 'true';
    const host = strength.closest<HTMLElement>('.xa-ext-password-host');
    const input = host?.querySelector<HTMLInputElement>('input.f-input');
    const hint = host?.querySelector<HTMLElement>('[data-xcon-pw-hint]');
    const bars = Array.from(strength.querySelectorAll<HTMLElement>('.pw-strength__bar'));
    const sync = (): void => {
      const current = passwordStrength(input?.value ?? '');
      const levels = ['', 'weak', 'medium', 'strong', 'strong'];
      bars.forEach((bar, index) => {
        bar.className = 'pw-strength__bar';
        const level = levels[current.score];
        if (index < current.score && level) bar.classList.add(level);
      });
      if (hint) hint.textContent = current.hint;
    };
    input?.addEventListener('input', sync);
    sync();
  });

  root.querySelectorAll<HTMLTextAreaElement>('textarea.f-textarea[data-xcon-ta]').forEach((textarea) => {
    if (textarea.dataset.xconTaBound === 'true') return;
    textarea.dataset.xconTaBound = 'true';
    const host = textarea.closest<HTMLElement>('.xa-ext-textarea-host');
    const count = host?.querySelector<HTMLElement>('[data-xcon-ta-count]');
    const sync = (): void => {
      if (count) count.textContent = String((textarea.value || '').length);
    };
    textarea.addEventListener('input', sync);
    sync();
  });

  root.querySelectorAll<HTMLInputElement>('input.xa-al-tf-float').forEach((input) => {
    const sync = (): void => {
      input.classList.toggle('xa-al-tf-float--has-val', input.value.length > 0);
    };
    sync();
    if (input.dataset.xconFloatBound === 'true') return;
    input.dataset.xconFloatBound = 'true';
    input.addEventListener('input', sync);
  });

  const groups = new Map<string, HTMLInputElement[]>();
  root.querySelectorAll<HTMLInputElement>('input.xa-al-tf--otp[data-xa-otp-index]').forEach((input) => {
    const group = input.dataset.xaOtpGroup || 'default';
    const items = groups.get(group) ?? [];
    items.push(input);
    groups.set(group, items);
  });
  groups.forEach((inputs) => {
    inputs.sort((a, b) => Number(a.dataset.xaOtpIndex ?? 0) - Number(b.dataset.xaOtpIndex ?? 0));
    inputs.forEach((input, index) => {
      if (input.dataset.xconOtpBound === 'true') return;
      input.dataset.xconOtpBound = 'true';
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (input.value && inputs[index + 1]) inputs[index + 1].focus();
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value && inputs[index - 1]) inputs[index - 1].focus();
      });
    });
  });
}

function hydrateTextViews(root: ParentNode = document): void {
  root.querySelectorAll<HTMLButtonElement>('[data-xa-trunc-toggle]').forEach((button) => {
    if (button.dataset.xconTvBound === 'true') return;
    button.dataset.xconTvBound = 'true';
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-xa-trunc-toggle');
      const target = id ? root.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null;
      if (!target) return;
      const collapsed = target.classList.toggle('collapsed');
      button.textContent = collapsed ? 'Read more ↓' : 'Show less ↑';
    });
  });
}

function hydrateLayoutShowcases(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-grid-showcase]').forEach((demo) => {
    if (demo.dataset.xconGridBound === 'true') return;
    demo.dataset.xconGridBound = 'true';
    const canvas = demo.querySelector<HTMLElement>('.grid-canvas');
    demo.querySelectorAll<HTMLButtonElement>('.grid-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        demo.querySelectorAll('.grid-pill').forEach((item) => item.classList.remove('active'));
        pill.classList.add('active');
        const cols = pill.getAttribute('data-cols');
        if (canvas) canvas.style.gridTemplateColumns = cols === 'auto' ? 'repeat(auto-fill,minmax(80px,1fr))' : `repeat(${cols},1fr)`;
      });
    });
  });

  root.querySelectorAll<HTMLElement>('[data-xcon-flex-showcase]').forEach((demo) => {
    if (demo.dataset.xconFlexBound === 'true') return;
    demo.dataset.xconFlexBound = 'true';
    const canvas = demo.querySelector<HTMLElement>('[data-xcon-flex-canvas]');
    const justify = demo.querySelector<HTMLSelectElement>('[data-xcon-flex-justify]');
    const align = demo.querySelector<HTMLSelectElement>('[data-xcon-flex-align]');
    const sync = (): void => {
      if (!canvas) return;
      if (justify) canvas.style.justifyContent = justify.value;
      if (align) canvas.style.alignItems = align.value;
    };
    justify?.addEventListener('change', sync);
    align?.addEventListener('change', sync);
    sync();
  });
}

function ensureCustomSelectDocumentClose(): void {
  if (customSelectDocumentBound) return;
  customSelectDocumentBound = true;
  document.addEventListener('click', (event) => {
    document.querySelectorAll<HTMLElement>('.custom-select.open').forEach((select) => {
      if (event.target instanceof Node && !select.contains(event.target)) select.classList.remove('open');
    });
  });
}

function hydrateCustomSelects(root: ParentNode = document): void {
  ensureCustomSelectDocumentClose();
  root.querySelectorAll<HTMLElement>('[data-xcon-custom-select="true"]').forEach((select) => {
    if (select.dataset.xconCustomSelectBound === 'true') return;
    select.dataset.xconCustomSelectBound = 'true';
    const trigger = select.querySelector<HTMLElement>('[data-xcon-custom-select-trigger]');
    const value = select.querySelector<HTMLElement>('[data-xcon-custom-select-value]');
    const toggle = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();
      document.querySelectorAll<HTMLElement>('.custom-select.open').forEach((open) => {
        if (open !== select) open.classList.remove('open');
      });
      select.classList.toggle('open');
    };
    trigger?.addEventListener('click', toggle);
    trigger?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') toggle(event);
      if (event.key === 'Escape') select.classList.remove('open');
    });
    select.querySelectorAll<HTMLElement>('[data-xcon-custom-select-option]').forEach((option) => {
      option.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        select.querySelectorAll<HTMLElement>('[data-xcon-custom-select-option]').forEach((item) => item.classList.remove('selected'));
        option.classList.add('selected');
        if (value) value.textContent = option.textContent || '';
        select.classList.remove('open');
      });
    });
  });
}

function rangeFillPercent(input: HTMLInputElement): string {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || min);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return '0.0';
  const clamped = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  return (((clamped - min) / (max - min)) * 100).toFixed(1);
}

function syncRange(input: HTMLInputElement): void {
  input.style.setProperty('--fill', `${rangeFillPercent(input)}%`);
  const targetId = input.getAttribute('data-xcon-range-value-target');
  const target = targetId ? document.getElementById(targetId) : null;
  if (target) target.textContent = input.value;
}

function hydrateRanges(root: ParentNode = document): void {
  root.querySelectorAll<HTMLInputElement>('input.f-range[data-xcon-range]').forEach((input) => {
    if (input.dataset.xconRangeBound !== 'true') {
      input.dataset.xconRangeBound = 'true';
      input.addEventListener('input', () => syncRange(input));
    }
    syncRange(input);
  });
}

function hydrateSwitches(root: ParentNode = document): void {
  root.querySelectorAll<HTMLInputElement>('input[data-xcon-switch]').forEach((input) => {
    const syncSwitch = (): void => {
      input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
    };
    if (input.dataset.xconSwitchBound !== 'true') {
      input.dataset.xconSwitchBound = 'true';
      input.addEventListener('change', syncSwitch);
    }
    syncSwitch();
  });
}

function hydrateDisclosureControls(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-tabs-nav]').forEach((nav) => {
    if (nav.dataset.xconTabsBound === 'true') return;
    nav.dataset.xconTabsBound = 'true';
    const scope = nav.closest<HTMLElement>('.tabs-wrap') ?? nav.parentElement;
    nav.querySelectorAll<HTMLElement>('[data-xcon-tabs-button]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-tab');
        nav.querySelectorAll<HTMLElement>('[data-xcon-tabs-button]').forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        scope?.querySelectorAll<HTMLElement>('.tab-content').forEach((panel) => panel.classList.toggle('active', panel.id === id));
      });
    });
  });

  root.querySelectorAll<HTMLElement>('.tabs-header').forEach((header) => {
    if (header.dataset.xconTabsSingleBound === 'true') return;
    const buttons = Array.from(header.querySelectorAll<HTMLElement>('[data-xcon-tabs-single-tab]'));
    if (!buttons.length) return;
    header.dataset.xconTabsSingleBound = 'true';
    const scope = header.closest<HTMLElement>('.tabs-container');
    const panels = scope ? Array.from(scope.querySelectorAll<HTMLElement>('.tabs-content .tab-content')) : [];
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

  root.querySelectorAll<HTMLElement>('[data-xcon-accordion-toggle]').forEach((button) => {
    if (button.dataset.xconAccordionBound === 'true') return;
    button.dataset.xconAccordionBound = 'true';
    button.addEventListener('click', () => {
      const item = button.closest<HTMLElement>('.accordion-item');
      if (!item) return;
      const content = item.querySelector<HTMLElement>('.accordion-content');
      const arrow = item.querySelector<HTMLElement>('.accordion-arrow');
      if (content) {
        const container = item.closest<HTMLElement>('.xa-ext-accordion-host');
        const multiple = button.getAttribute('data-xcon-accordion-multiple') === 'true';
        const open = content.style.display !== 'block';
        if (!multiple && container) {
          container.querySelectorAll<HTMLElement>('.accordion-content').forEach((panel) => {
            panel.style.display = 'none';
          });
          container.querySelectorAll<HTMLElement>('.accordion-arrow').forEach((icon) => {
            icon.style.transform = 'rotate(0deg)';
          });
          container.querySelectorAll<HTMLElement>('[data-xcon-accordion-toggle]').forEach((toggle) => {
            toggle.setAttribute('aria-expanded', 'false');
          });
        }
        content.style.display = open ? 'block' : 'none';
        if (arrow) arrow.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        return;
      }
      const body = item.querySelector<HTMLElement>('.accordion-body');
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      button.classList.toggle('expanded', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (body) body.style.maxHeight = open ? `${body.scrollHeight}px` : '0';
    });
  });

  root.querySelectorAll<HTMLElement>('[data-xcon-alert-close]').forEach((button) => {
    if (button.dataset.xconAlertBound === 'true') return;
    button.dataset.xconAlertBound = 'true';
    button.addEventListener('click', () => button.closest<HTMLElement>('.alert')?.remove());
  });

  root.querySelectorAll<HTMLElement>('[data-xcon-search-single]').forEach((search) => {
    if (search.dataset.xconSearchSingleBound === 'true') return;
    search.dataset.xconSearchSingleBound = 'true';
    const input = search.querySelector<HTMLInputElement>('[data-xcon-search-single-input]');
    const clear = search.querySelector<HTMLButtonElement>('[data-xcon-search-single-clear]');
    const submit = search.querySelector<HTMLButtonElement>('[data-xcon-search-single-submit]');
    const rawDelay = Number(input?.getAttribute('data-xcon-search-debounce-delay') ?? 0);
    const debounceDelay = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 0;
    let debounceTimer = 0;
    const sync = (): void => {
      if (clear && input) clear.style.display = input.value ? '' : 'none';
    };
    const emitInput = (): void => {
      if (!input) return;
      search.dispatchEvent(new CustomEvent('xcon-search-input', { bubbles: true, detail: { value: input.value } }));
    };
    const scheduleInput = (): void => {
      sync();
      if (debounceTimer) window.clearTimeout(debounceTimer);
      if (debounceDelay > 0) {
        debounceTimer = window.setTimeout(emitInput, debounceDelay);
      } else {
        emitInput();
      }
    };
    input?.addEventListener('input', scheduleInput);
    input?.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') submit?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    clear?.addEventListener('click', () => {
      if (!input) return;
      input.value = '';
      scheduleInput();
      input.focus();
    });
    sync();
  });

  root.querySelectorAll<HTMLElement>('[data-xcon-search]').forEach((search) => {
    if (search.dataset.xconSearchBound === 'true') return;
    search.dataset.xconSearchBound = 'true';
    const input = search.querySelector<HTMLInputElement>('[data-xcon-search-field]');
    const clear = search.querySelector<HTMLButtonElement>('[data-xcon-search-clear]');
    const results = input ? document.getElementById(input.getAttribute('data-xcon-search-field') ?? '') : null;
    const sync = (): void => {
      clear?.classList.toggle('show', Boolean(input?.value));
      results?.classList.toggle('show', document.activeElement === input || Boolean(input?.value));
    };
    input?.addEventListener('input', sync);
    input?.addEventListener('focus', sync);
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') results?.classList.remove('show');
    });
    clear?.addEventListener('click', () => {
      if (!input) return;
      input.value = '';
      input.focus();
      sync();
    });
    results?.querySelectorAll<HTMLElement>('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const label = item.querySelector<HTMLElement>('.label');
        if (input && label) input.value = label.textContent ?? '';
        results.classList.remove('show');
        sync();
      });
    });
    sync();
  });
}

function syncSingleTabsVisualState(header: HTMLElement, button: HTMLElement, active: boolean): void {
  const container = header.closest<HTMLElement>('.tabs-container');
  const host = container?.closest<HTMLElement>('.xa-ext-tabs-host');
  const variant =
    host?.getAttribute('data-tabs-variant') ??
    (header.classList.contains('tabs-header-underline') ? 'underline' : header.classList.contains('tabs-header-pills') ? 'pills' : 'default');
  const position =
    host?.getAttribute('data-tabs-position') ??
    (container?.classList.contains('tabs-position-bottom')
      ? 'bottom'
      : container?.classList.contains('tabs-position-left')
        ? 'left'
        : container?.classList.contains('tabs-position-right')
          ? 'right'
          : 'top');
  const radiusByPos: Record<string, string> = {
    top: '4px 4px 0 0',
    bottom: '0 0 4px 4px',
    left: '4px 0 0 4px',
    right: '0 4px 4px 0',
  };
  const underlineSide: keyof CSSStyleDeclaration =
    position === 'bottom' ? 'borderTop' : position === 'left' ? 'borderRight' : position === 'right' ? 'borderLeft' : 'borderBottom';

  button.style.borderTop = 'none';
  button.style.borderRight = 'none';
  button.style.borderBottom = 'none';
  button.style.borderLeft = 'none';

  if (variant === 'underline') {
    button.style.backgroundColor = 'transparent';
    button.style.color = active ? '#007bff' : '#6b7280';
    button.style.border = 'none';
    button.style[underlineSide] = `2px solid ${active ? '#007bff' : 'transparent'}`;
    button.style.borderRadius = '0';
    return;
  }

  if (variant === 'pills') {
    button.style.backgroundColor = active ? '#007bff' : '#e9ecef';
    button.style.color = active ? 'white' : '#495057';
    button.style.border = 'none';
    button.style.borderRadius = '20px';
    return;
  }

  button.style.backgroundColor = active ? '#007bff' : '#f8f9fa';
  button.style.color = active ? 'white' : '#333';
  button.style.border = '1px solid #ddd';
  button.style.borderRadius = radiusByPos[position] ?? radiusByPos.top;
}

function hydratePickerControls(root: ParentNode = document): void {
  const pickerSuffix = (picker: HTMLElement, fallback: string): string =>
    String(picker.getAttribute('data-xcon-picker-suffix') ?? picker.getAttribute('data-key') ?? picker.id ?? fallback).replace(/[^a-zA-Z0-9_-]/g, '_');

  root.querySelectorAll<HTMLElement>('[data-xcon-date-picker]').forEach((picker) => {
    if (picker.dataset.xconDateBound === 'true') return;
    picker.dataset.xconDateBound = 'true';
    const suffix = pickerSuffix(picker, 'datePicker');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let cur = new Date();
    let selected: Date | null = null;
    const monthLabel = picker.querySelector<HTMLElement>(`#dpMonthLabel_${suffix}`);
    const body = picker.querySelector<HTMLElement>(`#dpBody_${suffix}`);
    const prevBtn = picker.querySelector<HTMLElement>(`#dpPrev_${suffix}`);
    const nextBtn = picker.querySelector<HTMLElement>(`#dpNext_${suffix}`);
    if (!monthLabel || !body || !prevBtn || !nextBtn) return;
    const render = (): void => {
      monthLabel.textContent = `${months[cur.getMonth()]} ${cur.getFullYear()}`;
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

  root.querySelectorAll<HTMLElement>('[data-xcon-time-picker]').forEach((picker) => {
    if (picker.dataset.xconTimeBound === 'true') return;
    picker.dataset.xconTimeBound = 'true';
    const suffix = pickerSuffix(picker, 'timePicker');
    const hourList = picker.querySelector<HTMLElement>(`#tpHourList_${suffix}`);
    const minList = picker.querySelector<HTMLElement>(`#tpMinList_${suffix}`);
    const tpHour = picker.querySelector<HTMLElement>(`#tpHour_${suffix}`);
    const tpMin = picker.querySelector<HTMLElement>(`#tpMin_${suffix}`);
    const tpAmpm = picker.querySelector<HTMLElement>(`#tpAmpm_${suffix}`);
    const tpAmpmList = picker.querySelector<HTMLElement>(`#tpAmpmList_${suffix}`);
    if (!hourList || !minList || !tpHour || !tpMin || !tpAmpm || !tpAmpmList) return;
    let selH = 9;
    let selM = 30;
    let selAP = 'AM';
    for (let i = 1; i <= 12; i += 1) {
      const el = document.createElement('div');
      el.className = `time-picker__item${i === selH ? ' selected' : ''}`;
      el.textContent = String(i).padStart(2, '0');
      el.setAttribute('data-v', String(i));
      el.addEventListener('click', () => {
        selH = i;
        hourList.querySelectorAll<HTMLElement>('.time-picker__item').forEach((item) => item.classList.remove('selected'));
        el.classList.add('selected');
        tpHour.textContent = String(i).padStart(2, '0');
      });
      hourList.appendChild(el);
    }
    for (let i = 0; i < 60; i += 5) {
      const el = document.createElement('div');
      el.className = `time-picker__item${i === selM ? ' selected' : ''}`;
      el.textContent = String(i).padStart(2, '0');
      el.setAttribute('data-v', String(i));
      el.addEventListener('click', () => {
        selM = i;
        minList.querySelectorAll<HTMLElement>('.time-picker__item').forEach((item) => item.classList.remove('selected'));
        el.classList.add('selected');
        tpMin.textContent = String(i).padStart(2, '0');
      });
      minList.appendChild(el);
    }
    tpAmpmList.querySelectorAll<HTMLElement>('.time-picker__item').forEach((el) => {
      el.addEventListener('click', () => {
        selAP = el.getAttribute('data-v') ?? 'AM';
        tpAmpmList.querySelectorAll<HTMLElement>('.time-picker__item').forEach((item) => item.classList.remove('selected'));
        el.classList.add('selected');
        tpAmpm.textContent = selAP;
      });
    });
  });

  root.querySelectorAll<HTMLElement>('[data-xcon-color-picker]').forEach((picker) => {
    if (picker.dataset.xconColorBound === 'true') return;
    picker.dataset.xconColorBound = 'true';
    const preview = picker.querySelector<HTMLElement>('[data-xcon-color-preview]');
    const dot = picker.querySelector<HTMLElement>('[data-xcon-color-dot]');
    const hexInput = picker.querySelector<HTMLInputElement>('[data-xcon-color-hex]');
    const colorInput = picker.querySelector<HTMLInputElement>('[data-xcon-color-input]');
    const applyHex = (hex: string): void => {
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
      if (preview) preview.style.background = hex;
      if (dot) dot.style.background = hex;
      if (hexInput) hexInput.value = hex;
      if (colorInput) colorInput.value = hex;
    };
    picker.querySelectorAll<HTMLElement>('.color-swatch[data-hex]').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        picker.querySelectorAll<HTMLElement>('.color-swatch').forEach((item) => item.classList.remove('selected'));
        swatch.classList.add('selected');
        applyHex(swatch.getAttribute('data-hex') ?? '');
      });
    });
    hexInput?.addEventListener('input', () => applyHex(hexInput.value || ''));
    colorInput?.addEventListener('input', () => applyHex(colorInput.value || ''));
    const hue = picker.querySelector<HTMLInputElement>('[data-xcon-color-hue]');
    hue?.addEventListener('input', () => applyHex(hslToHex(Number(hue.value || 0), 70, 60)));
  });

}

function hydrateGalleryControls(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-gallery]').forEach((gallery) => {
    if (gallery.dataset.xconGalleryBound === 'true') return;
    gallery.dataset.xconGalleryBound = 'true';
    const singleModal = gallery.querySelector<HTMLElement>('[data-xcon-gallery-single-modal]');
    if (singleModal) {
      const modalImg = singleModal.querySelector<HTMLImageElement>('[data-xcon-gallery-single-image]');
      const items = Array.from(gallery.querySelectorAll<HTMLElement>('[data-xcon-gallery-single-item]'));
      let index = 0;
      const show = (nextIndex: number): void => {
        if (!items.length || !modalImg) return;
        index = ((nextIndex % items.length) + items.length) % items.length;
        const img = items[index]?.querySelector<HTMLImageElement>('img');
        if (!img) return;
        modalImg.src = img.currentSrc || img.src || '';
        modalImg.alt = img.alt || '';
        singleModal.style.display = 'flex';
      };
      const hideSingle = (): void => {
        singleModal.style.display = 'none';
      };
      items.forEach((item, itemIndex) => item.addEventListener('click', () => show(itemIndex)));
      singleModal.querySelector<HTMLButtonElement>('[data-xcon-gallery-single-close]')?.addEventListener('click', hideSingle);
      singleModal.querySelector<HTMLButtonElement>('[data-xcon-gallery-single-prev]')?.addEventListener('click', (event) => {
        event.stopPropagation();
        show(index - 1);
      });
      singleModal.querySelector<HTMLButtonElement>('[data-xcon-gallery-single-next]')?.addEventListener('click', (event) => {
        event.stopPropagation();
        show(index + 1);
      });
      singleModal.addEventListener('click', (event) => {
        if (event.target === singleModal) hideSingle();
      });
      return;
    }
    const lightbox = gallery.querySelector<HTMLElement>('[data-xcon-gallery-lightbox]');
    const lightboxImg = gallery.querySelector<HTMLImageElement>('[data-xcon-gallery-lightbox-img]');
    const close = gallery.querySelector<HTMLButtonElement>('[data-xcon-gallery-close]');
    gallery.querySelectorAll<HTMLElement>('.gallery-item').forEach((item) => {
      item.addEventListener('click', () => {
        const img = item.querySelector<HTMLImageElement>('img');
        if (!img || !lightbox || !lightboxImg) return;
        lightboxImg.src = (img.currentSrc || img.src || '').replace('w=400', 'w=1200');
        lightboxImg.alt = img.alt || '';
        lightbox.classList.add('open');
      });
    });
    const hide = (): void => {
      lightbox?.classList.remove('open');
    };
    close?.addEventListener('click', hide);
    lightbox?.addEventListener('click', (event) => {
      if (event.target === lightbox) hide();
    });
  });
}

function hydrateTreeViews(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-tree-view]').forEach((tree) => {
    if (tree.dataset.xconTreeBound === 'true') return;
    tree.dataset.xconTreeBound = 'true';
    tree.querySelectorAll<HTMLElement>('[data-xcon-tree-row]').forEach((row) => {
      row.addEventListener('click', () => {
        const children = row.parentElement?.querySelector<HTMLElement>(':scope > .tree-children');
        if (children) {
          const open = row.classList.contains('expanded');
          row.classList.toggle('expanded', !open);
          children.classList.toggle('collapsed', open);
        }
        tree.querySelectorAll<HTMLElement>('.tree-row').forEach((item) => item.classList.remove('selected'));
        row.classList.add('selected');
      });
    });
  });
}

function hydrateQrCodes(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-qr-code]').forEach((host) => {
    if (host.dataset.xconQrBound === 'true') return;
    host.dataset.xconQrBound = 'true';
    const canvas = host.querySelector<HTMLCanvasElement>('[data-xcon-qr-canvas]');
    const input = host.querySelector<HTMLInputElement>('[data-xcon-qr-input]');
    const button = host.querySelector<HTMLButtonElement>('[data-xcon-qr-generate]');
    const run = (): void => drawPseudoQr(canvas, input?.value ?? canvas?.getAttribute('data-xcon-qr-text') ?? '');
    button?.addEventListener('click', run);
    input?.addEventListener('change', run);
    run();
  });
}

function hydrateBarcodes(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-barcode]').forEach((host) => {
    if (host.dataset.xconBarcodeBound === 'true') return;
    host.dataset.xconBarcodeBound = 'true';
    const canvas = host.querySelector<HTMLCanvasElement>('[data-xcon-barcode-canvas]');
    const textEl = host.querySelector<HTMLElement>('[data-xcon-barcode-text]');
    const input = host.querySelector<HTMLInputElement>('[data-xcon-barcode-input]');
    const button = host.querySelector<HTMLButtonElement>('[data-xcon-barcode-draw]');
    const run = (): void => drawPseudoBarcode(canvas, textEl, input?.value ?? canvas?.getAttribute('data-xcon-barcode-value') ?? '');
    button?.addEventListener('click', run);
    input?.addEventListener('change', run);
    run();
  });
}

function hydrateTooltipControls(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-tooltip]').forEach((host) => {
    if (host.dataset.xconTooltipBound === 'true') return;
    host.dataset.xconTooltipBound = 'true';
    const trigger = host.querySelector<HTMLElement>('.tooltip-trigger');
    const tooltip = host.querySelector<HTMLElement>('.tooltip');
    if (!trigger || !tooltip) return;
    const rawDelay = Number(host.getAttribute('data-xcon-tooltip-delay') ?? 0);
    const delay = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 0;
    let showTimer = 0;
    const show = (): void => {
      tooltip.classList.add('open');
    };
    const showDelayed = (): void => {
      window.clearTimeout(showTimer);
      if (delay > 0) showTimer = window.setTimeout(show, delay);
      else show();
    };
    const hide = (): void => {
      window.clearTimeout(showTimer);
      tooltip.classList.remove('open');
    };
    const toggle = (event: Event): void => {
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

function hydrateModalControls(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-modal]').forEach((host) => {
    if (host.dataset.xconModalBound === 'true') return;
    host.dataset.xconModalBound = 'true';
    const modalById = (id: string | null): HTMLElement | null => {
      if (!id) return null;
      return host.querySelector<HTMLElement>(`#${cssEscapeIdentifier(id)}`);
    };
    const open = (id: string | null): void => {
      modalById(id)?.classList.add('open');
    };
    const close = (id: string | null): void => {
      modalById(id)?.classList.remove('open');
    };
    host.querySelectorAll<HTMLElement>('[data-xcon-modal-open]').forEach((button) => {
      button.addEventListener('click', () => open(button.getAttribute('data-xcon-modal-open')));
    });
    host.querySelectorAll<HTMLElement>('[data-xcon-modal-close]').forEach((button) => {
      button.addEventListener('click', () => close(button.getAttribute('data-xcon-modal-close')));
    });
    host.querySelectorAll<HTMLElement>('[data-xcon-modal-target]').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal && modal.getAttribute('data-xcon-modal-close-on-backdrop') !== 'false') modal.classList.remove('open');
      });
    });
  });
}

function hydrateRatingControls(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-rating-group]').forEach((group) => {
    if (group.dataset.xconRatingBound === 'true') return;
    group.dataset.xconRatingBound = 'true';
    const labels = Array.from(group.querySelectorAll<HTMLElement>('[data-xcon-rating-star]'));
    const row = group.closest<HTMLElement>('.rating-row');
    const score = row?.querySelector<HTMLElement>('[data-xcon-rating-score]') ?? null;
    let current = Number(group.getAttribute('data-xcon-rating-value') || 0);
    const paint = (value: number): void => {
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
          score.textContent = group.classList.contains('rating-stars') ? `${current}/${labels.length}` : `${current}.0`;
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

function drawPseudoQr(canvas: HTMLCanvasElement | null, text: string): void {
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return;
  const size = canvas.width || 180;
  const foreground = canvas.getAttribute('data-xcon-qr-foreground') || '#000';
  const background = canvas.getAttribute('data-xcon-qr-background') || '#fff';
  const cell = Math.max(3, Math.floor(size / 30));
  const margin = 2;
  const cols = Math.floor((size - margin * 2) / cell);
  const value = text || 'https://xconviewer.dev';
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);
  let seed = value.split('').reduce((total, char) => total * 31 + char.charCodeAt(0), 0) >>> 0;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const finder = (x: number, y: number): void => {
    context.fillStyle = foreground;
    context.fillRect(x, y, cell * 7, cell * 7);
    context.fillStyle = background;
    context.fillRect(x + cell, y + cell, cell * 5, cell * 5);
    context.fillStyle = foreground;
    context.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3);
  };
  const offset = margin * cell;
  finder(offset, offset);
  finder(size - offset - cell * 7, offset);
  finder(offset, size - offset - cell * 7);
  for (let row = 0; row < cols; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if ((row < 8 && col < 8) || (row < 8 && col >= cols - 8) || (row >= cols - 8 && col < 8)) continue;
      if (rand() > 0.5) {
        context.fillStyle = foreground;
        context.fillRect(margin * cell + col * cell, margin * cell + row * cell, cell - 1, cell - 1);
      }
    }
  }
}

function drawPseudoBarcode(canvas: HTMLCanvasElement | null, textEl: HTMLElement | null, value: string): void {
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return;
  const width = canvas.width || 280;
  const height = canvas.height || 80;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  const code = String(value || '').replace(/\D/g, '').substring(0, 13).padStart(13, '0');
  if (textEl) textEl.textContent = code.split('').join(' ');
  const enc: Record<number, string> = {
    0: '0001101',
    1: '0011001',
    2: '0010011',
    3: '0111101',
    4: '0100011',
    5: '0110001',
    6: '0101111',
    7: '0111011',
    8: '0110111',
    9: '0001011',
  };
  const rEnc: Record<number, string> = {
    0: '1110010',
    1: '1100110',
    2: '1101100',
    3: '1000010',
    4: '1011100',
    5: '1001110',
    6: '1010000',
    7: '1000100',
    8: '1001000',
    9: '1110100',
  };
  let bits = '101';
  for (let i = 1; i <= 6; i += 1) bits += enc[Number(code[i])];
  bits += '01010';
  for (let i = 7; i <= 12; i += 1) bits += rEnc[Number(code[i])];
  bits += '101';
  const requestedBarWidth = Number(canvas.getAttribute('data-xcon-barcode-bar-width') || 0);
  const barWidth = requestedBarWidth > 0 ? Math.min(requestedBarWidth, (width - 20) / bits.length) : (width - 20) / bits.length;
  context.fillStyle = '#000';
  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] === '1') context.fillRect(10 + index * barWidth, 4, barWidth + 0.5, height - 12);
  }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): string => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function shapeImageAnimationStateFor(shape: HTMLElement): ShapeImageAnimationRuntimeState {
  let state = shapeImageAnimationStates.get(shape);
  if (!state) {
    state = { index: 0, timer: undefined, bound: false, forward: true, iterationCount: 0 };
    shapeImageAnimationStates.set(shape, state);
  }
  return state;
}

function shapeImageAnimationImages(shape: HTMLElement): string[] {
  try {
    const parsed = JSON.parse(shape.dataset.xconShapeImages ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && Boolean(item)) : [];
  } catch {
    return [];
  }
}

function shapeCssUrl(url: string): string {
  return `url("${url.replace(/["\\]/g, '\\$&')}")`;
}

function setShapeAnimationImage(shape: HTMLElement, url: string | undefined): void {
  if (url) shape.style.backgroundImage = shapeCssUrl(url);
}

function maxShapeImageAnimationIterations(shape: HTMLElement): number {
  const mode = shape.dataset.xconShapeMode || 'infinite';
  if (mode === 'infinite') return Infinity;
  return Number.parseInt(mode, 10) || 1;
}

function advanceShapeImageAnimation(state: ShapeImageAnimationRuntimeState, images: string[], direction: string): void {
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

function scheduleShapeImageAnimation(shape: HTMLElement): void {
  const state = shapeImageAnimationStateFor(shape);
  const images = shapeImageAnimationImages(shape);
  if (images.length <= 1) return;
  if (state.iterationCount >= maxShapeImageAnimationIterations(shape)) return;
  const duration = Math.max(100, Number(shape.dataset.xconShapeDuration || 3000));
  state.timer = window.setTimeout(() => {
    advanceShapeImageAnimation(state, images, shape.dataset.xconShapeDirection || 'normal');
    setShapeAnimationImage(shape, images[state.index]);
    scheduleShapeImageAnimation(shape);
  }, duration);
}

function hydrateShapeImageAnimations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-shape-image-animation="true"]').forEach((shape) => {
    const images = shapeImageAnimationImages(shape);
    if (images.length <= 1) return;
    const state = shapeImageAnimationStateFor(shape);
    if (state.timer !== undefined) window.clearTimeout(state.timer);
    state.timer = undefined;
    state.bound = true;
    state.index = 0;
    state.forward = true;
    state.iterationCount = 0;
    setShapeAnimationImage(shape, images[0]);
    scheduleShapeImageAnimation(shape);
  });
}

function hydrateFlipbooks(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.xa-flipbook-container').forEach((host) => {
    if (host.dataset.xconFlipbookBound === 'true') return;
    host.dataset.xconFlipbookBound = 'true';
    const pages = Array.from(host.querySelectorAll<HTMLElement>('.ui-flipbook .page'));
    if (pages.length === 0) return;
    const current = host.querySelector<HTMLElement>('[id^="current-page-"]');
    const miniatures = Array.from(host.querySelectorAll<HTMLElement>('[data-xcon-flipbook-page]'));
    const miniatureList = host.querySelector<HTMLElement>('[data-xcon-flipbook-miniatures-list]');
    const viewer = host.querySelector<HTMLElement>('.flipbook-viewer');
    let index = 0;
    let zoomed = false;
    const show = (next: number): void => {
      index = Math.max(0, Math.min(pages.length - 1, next));
      pages.forEach((page, pageIndex) => {
        page.style.display = pageIndex === index ? 'flex' : 'none';
      });
      if (current) current.textContent = String(index + 1);
      miniatures.forEach((button, pageIndex) => button.classList.toggle('active', pageIndex === index));
    };
    host.querySelectorAll<HTMLElement>('[data-xcon-flipbook-next]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        show(index + 1 >= pages.length ? 0 : index + 1);
      });
    });
    host.querySelectorAll<HTMLElement>('[data-xcon-flipbook-prev]').forEach((button) => {
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
    host.querySelectorAll<HTMLElement>('[data-xcon-flipbook-miniatures]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (miniatureList) miniatureList.style.display = miniatureList.style.display === 'none' ? 'block' : 'none';
      });
    });
    host.querySelectorAll<HTMLElement>('[data-xcon-flipbook-zoom]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        zoomed = !zoomed;
        if (viewer) viewer.style.transform = zoomed ? 'scale(1.5)' : '';
      });
    });
    host.querySelectorAll<HTMLElement>('[data-xcon-flipbook-fullscreen]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen();
        else if (host.requestFullscreen) void host.requestFullscreen();
      });
    });
    show(0);
  });
}

function hydrateSpanGrids(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-spangrid]').forEach((host) => {
    if (host.dataset.xconSpangridBound === 'true') return;
    host.dataset.xconSpangridBound = 'true';
    host.classList.add('xa-spangrid-container--hydrated');
  });
}

function loadLeafletRuntime(): Promise<unknown> {
  const current = (window as Window & { L?: unknown }).L as { map?: unknown } | undefined;
  if (current && typeof current.map === 'function') return Promise.resolve(current);
  if (leafletRuntimePromise) return leafletRuntimePromise;
  leafletRuntimePromise = new Promise((resolve, reject) => {
    void ensureLeafletStyles(document);
    const existing = document.querySelector<HTMLScriptElement>('script[data-xcon-leaflet-js]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as Window & { L?: unknown }).L));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = leafletJsUrl;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-xcon-leaflet-js', 'true');
    script.addEventListener('load', () => resolve((window as Window & { L?: unknown }).L));
    script.addEventListener('error', reject);
    document.head.appendChild(script);
  });
  return leafletRuntimePromise;
}

function ensureLeafletStyles(rootNode: Document | ShadowRoot): Promise<void> {
  const target: DocumentFragment | HTMLElement = rootNode instanceof ShadowRoot ? rootNode : document.head;
  if (target.querySelector('link[data-xcon-leaflet-css]')) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = leafletCssUrl;
    link.setAttribute('data-xcon-leaflet-css', 'true');
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', () => resolve());
    target.appendChild(link);
  });
}

function parseLeafletMarkers(host: HTMLElement): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(host.getAttribute('data-xcon-map-markers') || '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
  } catch {
    return [];
  }
}

function parseLeafletJsonAttr<T>(host: HTMLElement, name: string, fallback: T): T {
  try {
    const raw = host.getAttribute(name);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return parsed === undefined || parsed === null ? fallback : parsed as T;
  } catch {
    return fallback;
  }
}

function leafletPoint(value: unknown): [number, number] | undefined {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) {
    const lat = Number(plain[0]);
    const lng = Number(plain[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : undefined;
  }
  const record = objectRecord(plain);
  if (!record) return undefined;
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lng ?? record.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : undefined;
}

function leafletLayerPoints(value: unknown): Array<[number, number]> {
  const record = objectRecord(toPlainValue(value));
  const source = record ? record.points ?? record.path ?? record.coordinates ?? record.latlngs ?? record.latLngs : value;
  if (!Array.isArray(source)) return [];
  return source.map(leafletPoint).filter((point): point is [number, number] => Boolean(point));
}

function leafletLayerStyle(layer: unknown, fallbackColor: string): Record<string, unknown> {
  const record = objectRecord(toPlainValue(layer)) ?? {};
  const color = String(record.color ?? record.stroke ?? record.strokeColor ?? fallbackColor);
  return {
    color,
    weight: finiteNumber(record.weight ?? record.strokeWidth, 3),
    opacity: finiteNumber(record.opacity, 0.85),
    fillColor: String(record.fillColor ?? record.fill ?? color),
    fillOpacity: finiteNumber(record.fillOpacity, 0.18),
  };
}

function leafletHeatPoint(value: unknown): [number, number, number] | undefined {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) {
    const lat = Number(plain[0]);
    const lng = Number(plain[1]);
    const intensity = finiteNumber(plain[2], 1);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng, intensity] : undefined;
  }
  const record = objectRecord(plain);
  if (!record) return undefined;
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lng ?? record.longitude);
  const intensity = finiteNumber(record.value ?? record.intensity ?? record.weight, 1);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng, intensity] : undefined;
}

function applyLeafletMapLayers(leaflet: unknown, map: unknown, host: HTMLElement): void {
  const L = leaflet as {
    polyline?: (points: Array<[number, number]>, options: Record<string, unknown>) => { addTo: (target: unknown) => unknown };
    polygon?: (points: Array<[number, number]>, options: Record<string, unknown>) => { addTo: (target: unknown) => unknown };
    heatLayer?: (points: Array<[number, number, number]>, options: Record<string, unknown>) => { addTo: (target: unknown) => unknown };
  };
  parseLeafletJsonAttr<unknown[]>(host, 'data-xcon-map-polylines', []).forEach((layer) => {
    const points = leafletLayerPoints(layer);
    if (points.length < 2 || typeof L.polyline !== 'function') return;
    L.polyline(points, leafletLayerStyle(layer, '#2563eb')).addTo(map);
  });
  parseLeafletJsonAttr<unknown[]>(host, 'data-xcon-map-polygons', []).forEach((layer) => {
    const points = leafletLayerPoints(layer);
    if (points.length < 3 || typeof L.polygon !== 'function') return;
    L.polygon(points, leafletLayerStyle(layer, '#14b8a6')).addTo(map);
  });
  const heatmap = parseLeafletJsonAttr<unknown[]>(host, 'data-xcon-map-heatmap', []).map(leafletHeatPoint).filter((point): point is [number, number, number] => Boolean(point));
  if (heatmap.length && typeof L.heatLayer === 'function') {
    L.heatLayer(heatmap, { radius: 24, blur: 18 }).addTo(map);
  }
}

function leafletMarkerStatus(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function leafletMarkerIcon(
  leaflet: unknown,
  marker: Record<string, unknown>,
  label: string,
): unknown {
  const L = leaflet as {
    divIcon?: (options: Record<string, unknown>) => unknown;
  };
  if (!L || typeof L.divIcon !== 'function') return undefined;
  const status = leafletMarkerStatus(marker.status);
  return L.divIcon({
    className: `xcon-leaflet-marker${status ? ` xcon-leaflet-marker--${status}` : ''}`,
    html: escapeHtml(label.slice(0, 2) || '•'),
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -24],
  });
}

function hydrateLeafletMaps(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-leaflet-map]').forEach((host) => {
    if (host.dataset.xconLeafletBound === 'true' || host.dataset.xconLeafletBound === 'pending') return;
    host.dataset.xconLeafletBound = 'pending';
    void Promise.all([loadLeafletRuntime(), ensureLeafletStyles(host.getRootNode() as Document | ShadowRoot)])
      .then(([leaflet]) => {
        const L = leaflet as {
          map?: (element: HTMLElement, options: Record<string, unknown>) => {
            setView: (center: [number, number], zoom: number) => unknown;
            invalidateSize: () => void;
          };
          tileLayer?: (url: string, options: Record<string, unknown>) => { addTo: (map: unknown) => unknown };
          marker?: (center: [number, number], options?: Record<string, unknown>) => { addTo: (map: unknown) => { bindPopup?: (label: string) => unknown } };
        };
        if (!L || typeof L.map !== 'function' || typeof L.tileLayer !== 'function') throw new Error('Leaflet unavailable');
        const lat = Number(host.getAttribute('data-latitude') || 37.5665);
        const lng = Number(host.getAttribute('data-longitude') || 126.978);
        const zoom = Number(host.getAttribute('data-zoom') || 10);
        const showControls = host.getAttribute('data-xcon-map-show-controls') !== 'false';
        const enableZoom = host.getAttribute('data-xcon-map-enable-zoom') !== 'false';
        const enablePan = host.getAttribute('data-xcon-map-enable-pan') !== 'false';
        const tileUrl = host.getAttribute('data-xcon-map-tile-url') || openStreetMapTileUrl;
        const attribution = host.getAttribute('data-xcon-map-attribution') || openStreetMapAttribution;
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
        });
        map.setView([lat, lng], zoom);
        L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
        const hostWithMap = host as HTMLElement & { _xconLeafletMap?: unknown; _leaflet_map?: unknown };
        hostWithMap._xconLeafletMap = map;
        hostWithMap._leaflet_map = map;
        parseLeafletMarkers(host).forEach((marker, index) => {
          if (typeof L.marker !== 'function') return;
          const markerLat = Number(marker.lat ?? marker.latitude);
          const markerLng = Number(marker.lng ?? marker.longitude);
          if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) return;
          const label = String(marker.label ?? marker.title ?? marker.popup ?? index + 1);
          const icon = leafletMarkerIcon(leaflet, marker, label);
          const pin = L.marker([markerLat, markerLng], icon ? { icon } : undefined).addTo(map);
          if (label && typeof pin.bindPopup === 'function') pin.bindPopup(label);
        });
        applyLeafletMapLayers(leaflet, map, host);
        window.setTimeout(() => map.invalidateSize(), 50);
        host.dataset.xconLeafletBound = 'true';
      })
      .catch(() => {
        host.dataset.xconLeafletBound = 'failed';
      });
  });
}

function extCarouselStateFor(carousel: HTMLElement): ExtCarouselRuntimeState {
  let state = extCarouselStates.get(carousel);
  if (!state) {
    state = { index: 0, timer: undefined, bound: false, startX: 0, startY: 0, dragging: false };
    extCarouselStates.set(carousel, state);
  }
  return state;
}

function extCarouselItems(carousel: HTMLElement): HTMLElement[] {
  return Array.from(carousel.querySelectorAll<HTMLElement>('.carousel-content .carousel-item'));
}

function syncExtCarousel(carousel: HTMLElement): void {
  const state = extCarouselStateFor(carousel);
  const items = extCarouselItems(carousel);
  const count = items.length;
  if (!count) return;
  state.index = ((state.index % count) + count) % count;
  items.forEach((item, index) => {
    item.style.display = index === state.index ? 'block' : 'none';
  });
  carousel.querySelectorAll<HTMLElement>('.carousel-dot').forEach((dot, index) => {
    const active = index === state.index;
    dot.classList.toggle('active', active);
    dot.setAttribute('aria-current', active ? 'true' : 'false');
  });
}

function goToExtCarousel(carousel: HTMLElement, index: number): void {
  const items = extCarouselItems(carousel);
  if (!items.length) return;
  const state = extCarouselStateFor(carousel);
  state.index = ((index % items.length) + items.length) % items.length;
  syncExtCarousel(carousel);
}

function nextExtCarousel(carousel: HTMLElement): void {
  const state = extCarouselStateFor(carousel);
  goToExtCarousel(carousel, state.index + 1);
}

function previousExtCarousel(carousel: HTMLElement): void {
  const state = extCarouselStateFor(carousel);
  goToExtCarousel(carousel, state.index - 1);
}

function startExtCarouselAutoplay(carousel: HTMLElement): void {
  const state = extCarouselStateFor(carousel);
  if (state.timer !== undefined) window.clearInterval(state.timer);
  state.timer = undefined;
  if (carousel.dataset.carouselAutoplay !== 'true') return;
  const interval = Math.max(800, Number(carousel.dataset.carouselInterval || 3000));
  state.timer = window.setInterval(() => nextExtCarousel(carousel), interval);
}

function hydrateExtCarousels(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-ext-carousel="true"]').forEach((carousel) => {
    const state = extCarouselStateFor(carousel);
    if (!state.bound) {
      state.bound = true;
      const restart = (): void => startExtCarouselAutoplay(carousel);
      const prev = carousel.querySelector<HTMLButtonElement>('[data-xcon-carousel-prev]');
      const next = carousel.querySelector<HTMLButtonElement>('[data-xcon-carousel-next]');
      prev?.addEventListener('click', (event) => {
        event.preventDefault();
        previousExtCarousel(carousel);
        restart();
      });
      next?.addEventListener('click', (event) => {
        event.preventDefault();
        nextExtCarousel(carousel);
        restart();
      });
      carousel.querySelectorAll<HTMLButtonElement>('[data-xcon-carousel-dot]').forEach((dot) => {
        dot.addEventListener('click', (event) => {
          event.preventDefault();
          goToExtCarousel(carousel, Number(dot.getAttribute('data-xcon-carousel-dot') || 0));
          restart();
        });
      });
      carousel.addEventListener('pointerdown', (event) => {
        if (event.target instanceof Element && event.target.closest('button')) return;
        state.dragging = true;
        state.startX = event.clientX;
        state.startY = event.clientY;
        if (state.timer !== undefined) window.clearInterval(state.timer);
        state.timer = undefined;
        if (typeof carousel.setPointerCapture === 'function') carousel.setPointerCapture(event.pointerId);
      });
      const finishDrag = (event: PointerEvent, canceled: boolean): void => {
        if (!state.dragging) return;
        state.dragging = false;
        if (typeof carousel.releasePointerCapture === 'function') {
          try {
            carousel.releasePointerCapture(event.pointerId);
          } catch {
            // Pointer capture may already be gone after browser-level cancellation.
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
      carousel.addEventListener('pointerup', (event) => finishDrag(event, false));
      carousel.addEventListener('pointercancel', (event) => finishDrag(event, true));
      carousel.addEventListener('mouseleave', restart);
    }
    syncExtCarousel(carousel);
    startExtCarouselAutoplay(carousel);
  });
}

function hydrateImageFallbacks(root: ParentNode = document): void {
  root.querySelectorAll<HTMLImageElement>('[data-xcon-image-fallback]').forEach((image) => {
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

function hydrateImageSlideshows(root: ParentNode = document): void {
  root.querySelectorAll<HTMLImageElement>('[data-xcon-image-slideshow="true"]').forEach((image) => {
    if (image.dataset.xconImageSlideshowBound === 'true') return;
    image.dataset.xconImageSlideshowBound = 'true';
    let images: unknown = [];
    try {
      images = JSON.parse(image.getAttribute('data-xcon-image-slideshow-images') ?? '[]');
    } catch {
      images = [];
    }
    const slides = Array.isArray(images) ? images.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
    if (slides.length <= 1) return;
    const duration = Math.max(100, Number(image.getAttribute('data-xcon-image-slideshow-duration') ?? 3000) || 3000);
    const mode = String(image.getAttribute('data-xcon-image-slideshow-mode') ?? 'loop').toLowerCase();
    let index = Math.max(0, slides.indexOf(image.getAttribute('src') ?? slides[0]));
    const timer = window.setInterval(() => {
      if (mode === 'once' && index >= slides.length - 1) {
        window.clearInterval(timer);
        return;
      }
      index = (index + 1) % slides.length;
      image.setAttribute('src', slides[index]);
    }, duration);
  });
}

export function sanitizeUrl(value: unknown, options: Pick<RenderOptions, 'allowExternalResources'> = {}): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  const lowered = trimmed.toLowerCase();
  if (
    lowered.startsWith('javascript:') ||
    lowered.startsWith('vbscript:') ||
    lowered.startsWith('data:text/html') ||
    /[<>"']/.test(trimmed)
  ) {
    return null;
  }
  if (/^(https?:)?\/\//i.test(trimmed) && !options.allowExternalResources) return null;
  if (lowered.startsWith('data:') && !lowered.startsWith('data:image/')) return null;
  return trimmed;
}

export function sanitizeInlineStyle(style: unknown): string {
  if (typeof style !== 'string') return '';
  const declarations: string[] = [];

  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator <= 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (!allowedCssProperties.has(property)) continue;
    if (!value || activeCssPattern.test(value) || activeCssPattern.test(property)) continue;
    declarations.push(`${property}:${expandThemeTokenAliases(value)}`);
  }

  return declarations.join(';');
}

function bannerStateFor(banner: HTMLElement): BannerRuntimeState {
  let state = bannerStates.get(banner);
  if (!state) {
    state = { index: 0, timer: undefined, bound: false, width: 0, startX: 0, startY: 0, dragging: false };
    bannerStates.set(banner, state);
  }
  return state;
}

function syncBannerTrackLayout(banner: HTMLElement): number {
  const track = banner.querySelector<HTMLElement>('.banner-container');
  if (!track) return 0;
  const slides = Array.from(track.children) as HTMLElement[];
  const state = bannerStateFor(banner);
  const vertical = banner.dataset.orientation === 'vertical';
  const rawAxis = vertical ? banner.clientHeight || banner.offsetHeight : banner.clientWidth || banner.offsetWidth;
  let axis = Math.round(rawAxis || state.width || 0);
  if (axis > 0 && state.width > 0 && Math.abs(axis - state.width) <= 2) axis = state.width;
  if (!axis) return 0;
  state.width = axis;
  track.style.display = 'flex';
  track.style.flexDirection = vertical ? 'column' : 'row';
  track.style.width = vertical ? '100%' : `${axis * slides.length}px`;
  track.style.height = vertical ? `${axis * slides.length}px` : '100%';
  for (const slide of slides) {
    slide.style.flex = `0 0 ${axis}px`;
    slide.style.width = vertical ? '100%' : `${axis}px`;
    slide.style.minWidth = vertical ? '0' : `${axis}px`;
    slide.style.maxWidth = vertical ? '' : `${axis}px`;
    slide.style.height = vertical ? `${axis}px` : '100%';
    slide.style.minHeight = vertical ? `${axis}px` : '0';
    slide.style.maxHeight = vertical ? `${axis}px` : '';
    slide.style.boxSizing = 'border-box';
  }
  return axis;
}

function bannerLogicalCount(banner: HTMLElement): number {
  return Number(banner.dataset.slideCount || banner.querySelectorAll('.banner-indicator').length || 0);
}

function updateBannerDots(banner: HTMLElement): void {
  const state = bannerStateFor(banner);
  const count = bannerLogicalCount(banner);
  const current = count ? state.index % count : 0;
  banner.querySelectorAll<HTMLElement>('.banner-indicator').forEach((dot, index) => {
    const active = index === current;
    dot.style.opacity = active ? '1' : '0.5';
    dot.setAttribute('aria-current', active ? 'true' : 'false');
  });
}

function setBannerTrackOffset(banner: HTMLElement, offset: number): void {
  const track = banner.querySelector<HTMLElement>('.banner-container');
  if (!track) return;
  const rounded = Math.round(offset);
  track.style.transform = banner.dataset.orientation === 'vertical' ? `translate3d(0,${rounded}px,0)` : `translate3d(${rounded}px,0,0)`;
}

function goToBannerSlide(banner: HTMLElement, index: number, noTransition = false): void {
  const track = banner.querySelector<HTMLElement>('.banner-container');
  if (!track) return;
  const axis = syncBannerTrackLayout(banner);
  if (!axis) return;
  const state = bannerStateFor(banner);
  state.index = Math.max(0, index);
  track.style.transition = noTransition ? 'none' : bannerTransition;
  const offset = -Math.round(state.index * axis);
  setBannerTrackOffset(banner, offset);
  updateBannerDots(banner);

  const count = bannerLogicalCount(banner);
  if (banner.dataset.rolling === 'true' && banner.dataset.loop === 'true' && count > 1 && state.index === count) {
    window.setTimeout(() => {
      track.style.transition = 'none';
      state.index = 0;
      setBannerTrackOffset(banner, 0);
      updateBannerDots(banner);
      void track.offsetHeight;
      track.style.transition = bannerTransition;
    }, 430);
  }
}

function nextBannerSlide(banner: HTMLElement): void {
  const state = bannerStateFor(banner);
  const count = bannerLogicalCount(banner);
  if (!count) return;
  if (state.index < count - 1) goToBannerSlide(banner, state.index + 1);
  else if (banner.dataset.rolling === 'true' && banner.dataset.loop === 'true') goToBannerSlide(banner, count);
  else if (banner.dataset.loop === 'true') goToBannerSlide(banner, 0);
}

function startBannerAutoplay(banner: HTMLElement): void {
  const state = bannerStateFor(banner);
  if (state.timer !== undefined) window.clearInterval(state.timer);
  state.timer = undefined;
  if (banner.dataset.autoScroll !== 'true') return;
  const duration = Math.max(800, Number(banner.dataset.duration || 3000));
  state.timer = window.setInterval(() => nextBannerSlide(banner), duration);
}

function hydrateBanner(banner: HTMLElement): void {
  const state = bannerStateFor(banner);
  if (!state.bound) {
    state.bound = true;
    banner.querySelectorAll<HTMLElement>('.banner-indicator').forEach((dot) => {
      dot.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        goToBannerSlide(banner, Number(dot.getAttribute('data-xcon-banner-dot') || 0));
        startBannerAutoplay(banner);
      });
    });
    banner.addEventListener('pointerdown', (event) => {
      state.dragging = true;
      state.startX = event.clientX;
      state.startY = event.clientY;
      if (state.timer !== undefined) window.clearInterval(state.timer);
      state.timer = undefined;
      if (typeof banner.setPointerCapture === 'function') banner.setPointerCapture(event.pointerId);
      const track = banner.querySelector<HTMLElement>('.banner-container');
      if (track) track.style.transition = 'none';
    });
    banner.addEventListener('pointermove', (event) => {
      if (!state.dragging) return;
      const axis = syncBannerTrackLayout(banner);
      if (!axis) return;
      const track = banner.querySelector<HTMLElement>('.banner-container');
      if (!track) return;
      const vertical = banner.dataset.orientation === 'vertical';
      let delta = vertical ? event.clientY - state.startY : event.clientX - state.startX;
      const count = bannerLogicalCount(banner);
      if (
        banner.dataset.loop !== 'true' &&
        ((state.index === 0 && delta > 0) || (count > 0 && state.index >= count - 1 && delta < 0))
      ) {
        delta *= 0.35;
      }
      track.style.transition = 'none';
      setBannerTrackOffset(banner, -Math.round(state.index * axis) + delta);
    });
    const finishDrag = (event: PointerEvent, canceled: boolean): void => {
      if (!state.dragging) return;
      state.dragging = false;
      if (typeof banner.releasePointerCapture === 'function') {
        try {
          banner.releasePointerCapture(event.pointerId);
        } catch {
          // Pointer capture may already be gone after browser-level cancellation.
        }
      }
      const vertical = banner.dataset.orientation === 'vertical';
      const delta = canceled ? 0 : vertical ? event.clientY - state.startY : event.clientX - state.startX;
      if (!canceled && Math.abs(delta) > 40) {
        if (delta < 0) nextBannerSlide(banner);
        else goToBannerSlide(banner, Math.max(0, state.index - 1));
      } else {
        goToBannerSlide(banner, state.index);
      }
      startBannerAutoplay(banner);
    };
    banner.addEventListener('pointerup', (event) => finishDrag(event, false));
    banner.addEventListener('pointercancel', (event) => finishDrag(event, true));
    window.addEventListener('resize', () => goToBannerSlide(banner, state.index, true));
  }
  syncBannerTrackLayout(banner);
  goToBannerSlide(banner, 0, true);
  startBannerAutoplay(banner);
}

function renderComponent(
  component: XconObject,
  context: RenderContext,
  depth: number,
  state: RenderState = { parentFlow: false },
  keyPath = 'root',
): string {
  if (depth > context.options.maxDepth) throw new Error('XCON render depth limit exceeded.');
  context.nodes += 1;
  if (context.nodes > context.options.maxNodes) throw new Error('XCON render node limit exceeded.');

  const type = component.getString('type', 'panel');
  const layerStack = type === 'panel' && isPanelStackLayers(component);
  const childState: RenderState = {
    parentFlow: usesFlowLayout(component) || isSequentialContainer(type),
    eagerMedia: state.eagerMedia,
    layerStack,
  };
  const children = renderChildren(component, context, depth + 1, childState, keyPath);
  const style = buildStyle(component, state, {
    includeAutoLayout: type !== 'panel' && type !== 'form' && type !== 'list',
    isRoot: depth === 0 && keyPath === 'root',
  });
  const attrs = baseAttributes(type, style, component, keyPath);

  switch (type) {
    case 'form':
      return renderForm(component, attrs, children, context);
    case 'panel':
      return renderPanel(component, attrs, renderText(component, context) + children, context);
    case 'shape':
      return renderShape(component, attrs, context, children);
    case 'line':
      return renderLine(component, attrs);
    case 'connector':
      return renderConnector(component, attrs, context);
    case 'modal':
      return renderModal(component, attrs, children);
    case 'stack':
      if (isShowcaseVariant(component)) return renderStackShowcase(component, attrs);
      if (hasDataDrivenLayoutItems(component)) return renderStackItemsSingle(component, attrs);
      return tag(
        'div',
        attrsWithStyle(attrs, `display:flex;flex-direction:${stackDirection(component)}`),
        children + renderItems(component, context, depth + 1, { parentFlow: true, eagerMedia: state.eagerMedia }, keyPath),
      );
    case 'flexBox':
      if (isShowcaseVariant(component)) return renderFlexBoxShowcase(component, attrs);
      if (hasDataDrivenLayoutItems(component)) return renderFlexBoxItemsSingle(component, attrs);
      return tag(
        'div',
        attrsWithStyle(attrs, `display:flex;${flexStyle(component)}`),
        children + renderItems(component, context, depth + 1, { parentFlow: true, eagerMedia: state.eagerMedia }, keyPath),
      );
    case 'grid':
      if (isShowcaseVariant(component)) return renderGridShowcase(component, attrs);
      if (hasDataDrivenLayoutItems(component)) return renderGridItemsSingle(component, attrs);
      return tag(
        'div',
        attrsWithStyle(attrs, `display:grid;${gridStyle(component)}`),
        children || renderItems(component, context, depth + 1, { parentFlow: true, eagerMedia: state.eagerMedia }, keyPath),
      );
    case 'card':
      return renderCard(component, attrs, context, children);
    case 'label':
      return renderLabel(component, attrs, context);
    case 'text':
      return tag('div', attrs, renderText(component, context));
    case 'textView':
      return renderTextView(component, attrs, context);
    case 'button':
      return renderButton(component, attrs);
    case 'textField':
      return renderTextField(component, attrs, undefined, context);
    case 'passwordField':
      return renderPasswordField(component, attrs);
    case 'textarea':
      return renderTextarea(component, attrs);
    case 'select':
      return renderSelect(component, attrs);
    case 'slider':
      return renderSlider(component, attrs);
    case 'switch':
      return renderSwitch(component, attrs);
    case 'colorPicker':
      return renderColorPicker(component, attrs);
    case 'datePicker':
      return renderDatePicker(component, attrs);
    case 'timePicker':
      return renderTimePicker(component, attrs);
    case 'checkbox':
    case 'radioButton':
      return renderChoice(component, attrs, type, context);
    case 'image':
      return renderImage(component, attrs, context, state);
    case 'videoView':
      return renderVideo(component, attrs, context);
    case 'banner':
      return renderBanner(component, attrs, context, depth + 1, keyPath);
    case 'carousel':
      return renderExtCarousel(component, attrs, context);
    case 'list':
      return tag('div', listRootAttrs(component, attrs), renderList(component, context, depth + 1, keyPath));
    case 'progressBar':
      return renderProgressBar(component, attrs);
    case 'spinner':
      return renderSpinner(component, attrs);
    case 'badge':
      return renderBadge(component, attrs);
    case 'avatar':
      return renderAvatar(component, attrs, context);
    case 'icon':
      return renderIcon(component, attrs);
    case 'divider':
      return renderDivider(component, attrs);
    case 'alert':
      return renderAlert(component, attrs);
    case 'notice':
      return tag('aside', attrs, escapeHtml(String(component.get('content') ?? component.get('message') ?? component.get('text') ?? '')));
    case 'chatBubble':
      return renderChatBubble(component, attrs, context);
    case 'tooltip':
      return renderTooltip(component, attrs, children);
    case 'tabs':
      return renderTabs(component, attrs, context, depth + 1);
    case 'accordion':
      return renderAccordion(component, attrs, context, depth + 1);
    case 'rating':
      return renderRating(component, attrs);
    case 'spacer':
      if (isShowcaseVariant(component)) return renderSpacerShowcase(component, attrs);
      return renderSpacerSingle(component, attrs);
    case 'searchBar':
      return renderSearchBar(component, attrs);
    case 'treeView':
      return renderTreeView(component, attrs);
    case 'gallery':
      return renderGallery(component, attrs, context, depth + 1, keyPath);
    case 'qrCode':
      return renderQrCode(component, attrs);
    case 'barcode':
      return renderBarcode(component, attrs);
    case 'chart':
      return renderAdvancedChart(component, attrs);
    case 'codeEditor':
      return renderAdvancedCodeEditor(component, attrs);
    case 'richEditor':
      return renderAdvancedRichEditor(component, attrs);
    case 'dataViz':
      return renderAdvancedDataViz(component, attrs);
    case 'spanGrid':
      return renderAdvancedSpanGrid(component, attrs);
    case 'flipbook':
      return renderAdvancedFlipbook(component, attrs, context);
    case 'networkDiagram':
      return renderAdvancedNetworkDiagram(component, attrs);
    case 'map':
      return renderAdvancedMap(component, attrs, context);
    case 'calendar':
      return renderAdvancedCalendar(component, attrs);
    case 'template':
      return renderTemplate(component, attrs, context, depth + 1, keyPath);
    case 'myCounter':
      return renderMyCounter(component, attrs);
    case 'myProgressBar':
      return renderMyProgressBar(component, attrs);
    case 'myCard':
      return renderMyCard(component, attrs, context);
    case 'myToggleSwitch':
      return renderMyToggleSwitch(component, attrs);
    case 'myIconRail':
      return renderMyIconRail(component, attrs);
    case 'myThemeAccentPanel':
      return renderMyThemeAccentPanel(component, attrs);
    default:
      return tag('div', attrs, renderText(component, context) + children);
  }
}

export function resolveRenderInput(input: unknown): ResolvedRenderInput {
  if (isXconObject(input)) return { root: input, diagnostics: [] };
  if (typeof input === 'string') return resolveStringRenderInput(input);
  return { root: fromJSONObject(input), diagnostics: [] };
}

function resolveStringRenderInput(input: string): ResolvedRenderInput {
  const source = input.trim();
  const syntax = detectXconSyntax(source);
  if (syntax === 'sketch') {
    const parsed = fromSketchLenient(source);
    return { root: parsed.document, diagnostics: parsed.errors };
  }
  return { root: deserialize(source), diagnostics: [] };
}

function renderXconDiagnostics(errors: SketchRecoveryError[]): string {
  if (errors.length === 0) return '';
  const items = errors
    .map((error) => tag('li', {}, `${escapeHtml(error.message)}${error.source ? `: ${escapeHtml(error.source)}` : ''}`))
    .join('');
  return tag(
    'details',
    {
      class: 'xcon-viewer-diagnostics',
      'data-xcon-diagnostics': '',
      style: 'position:relative;z-index:1;margin:8px 0 0;padding:8px 10px;border:1px solid rgba(180,120,20,.24);border-radius:8px;background:rgba(255,247,237,.96);color:#7c2d12;font:12px/1.4 system-ui,sans-serif;box-sizing:border-box',
    },
    tag('summary', {}, `${errors.length} SKETCH parse warning${errors.length === 1 ? '' : 's'}`) + tag('ul', { style: 'margin:6px 0 0 18px;padding:0' }, items),
  );
}

function collectComponentBounds(component: XconObject): Map<string, Rect> {
  const bounds = new Map<string, Rect>();
  collectComponentBoundsInto(component, bounds, 'root', 'root', [0, 0]);
  return bounds;
}

function collectComponentBoundsInto(
  component: XconObject,
  bounds: Map<string, Rect>,
  keyPath: string,
  componentKey: string,
  origin: [number, number],
): void {
  const pos = rectParts(component.get('pos')) ?? [0, 0, 0, 0];
  const absolute: Rect = [origin[0] + pos[0], origin[1] + pos[1], pos[2], pos[3]];
  registerComponentBound(bounds, keyPath, absolute, true);
  registerComponentBound(bounds, componentKey, absolute);

  const id = component.get('id');
  if (typeof id === 'string' && id.trim()) registerComponentBound(bounds, id.trim(), absolute);
  const name = component.get('name');
  if (typeof name === 'string' && name.trim()) registerComponentBound(bounds, name.trim(), absolute);

  const components = component.get('components');
  if (!isXconObject(components)) return;
  components.forEach((child, key) => {
    if (key === 'componentsOrder' || !isXconObject(child)) return;
    collectComponentBoundsInto(child, bounds, `${keyPath}~${key}`, key, [absolute[0], absolute[1]]);
  });
}

function registerComponentBound(bounds: Map<string, Rect>, key: string, rect: Rect, overwrite = false): void {
  if (!key || (!overwrite && bounds.has(key))) return;
  bounds.set(key, rect);
}

function baseAttributes(type: string, style: string, component: XconObject, keyPath: string): Record<string, string | undefined> {
  const hidden = component.get('visible') === false || component.get('visible') === 'false';
  const id = component.get('id');
  const inlineStyle = sanitizeInlineStyle(component.get('style'));
  return {
    id: typeof id === 'string' ? id : undefined,
    class: componentClassName(type, component),
    'data-xcon-type': type,
    'data-component': dataComponentName(type, component),
    'data-key': keyPath,
    hidden: hidden ? '' : undefined,
    style: joinStyles(style, inlineStyle),
  };
}

function componentClassName(type: string, component: XconObject): string | undefined {
  const className = component.get('className') ?? component.get('class') ?? component.get('cssClass') ?? component.get('htmlClass');
  const classes: string[] = [];
  if (typeof className === 'string') classes.push(...className.split(/\s+/).filter(Boolean));

  if (type === 'form') classes.push('xa-al-form-root');
  if (type === 'form' && hidesFormScrollbar(component)) classes.push('xa-form-hidden-scrollbar');
  if (type === 'panel') classes.push('xa-al-panel-root');
  if (type === 'panel' && hidesPanelScrollbar(component)) classes.push('xa-panel-hidden-scrollbar');
  if (type === 'label') classes.push('xa-al-label');
  if (type === 'textView') classes.push('xa-al-tv-root');
  if (type === 'button') classes.push('xa-al-btn');
  if (type === 'textField' || type === 'passwordField') classes.push('xa-al-tf-root');
  if (type === 'image') classes.push('xa-al-img-overlay-wrap');
  if (type === 'list') classes.push('xa-al-xlist-root');
  if (type === 'banner') {
    classes.push('xa-al-banner');
    const variant = classToken(component.get('bannerVariant') ?? component.get('variant'));
    if (variant) classes.push(`xa-al-banner--${variant}`);
  }

  const al = component.get('al');
  if (isXconObject(al) && type !== 'panel') {
    const stackClass = al.get('stackClass');
    if (typeof stackClass === 'string') classes.push(...stackClass.split(/\s+/).filter(Boolean));
  }

  return [...new Set(classes)].join(' ') || undefined;
}

function dataComponentName(type: string, component: XconObject): string {
  if (type === 'form') return 'xForm';
  if (type === 'list' && (component.contains('dataTemplate') || component.contains('templates') || component.contains('xListVariant'))) {
    return 'xList';
  }
  return type;
}

function attrsWithStyle(attrs: Record<string, string | undefined>, style: string): Record<string, string | undefined> {
  return { ...attrs, style: joinStyles(style, attrs.style ?? '') };
}

function attrsWithAppendedStyle(attrs: Record<string, string | undefined>, style: string): Record<string, string | undefined> {
  return { ...attrs, style: joinStyles(attrs.style ?? '', style) };
}

function attrsWithClass(attrs: Record<string, string | undefined>, className: string): Record<string, string | undefined> {
  return { ...attrs, class: [attrs.class, className].filter(Boolean).join(' ') };
}

function inputAttributes(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  forcedType: string | undefined,
  context: RenderContext,
): Record<string, string | undefined> {
  return {
    ...attrs,
    type: forcedType ?? attr(component.get('inputType') ?? 'text'),
    value: attr(component.get('value') ?? ''),
    placeholder: attr(component.get('placeholder') ?? ''),
    readonly: component.get('readonly') === true ? '' : undefined,
    disabled: component.get('enabled') === false ? '' : undefined,
    maxlength: attr(component.get('maxLength')),
    autocomplete: 'off',
    src: sanitizeUrl(component.get('src'), context.options) ?? undefined,
  };
}

function renderChildren(component: XconObject, context: RenderContext, depth: number, state: RenderState, keyPath: string): string {
  const components = component.get('components');
  if (!isXconObject(components)) return '';
  const children: Array<{ key: string; child: XconObject }> = [];
  const seen = new Set<string>();
  for (const key of componentOrder(components)) {
    const child = components.get(key);
    if (isXconObject(child)) {
      children.push({ key, child });
      seen.add(key);
    }
  }
  components.forEach((child: XconValue, key) => {
    if (key === 'componentsOrder' || seen.has(key)) return;
    if (isXconObject(child)) children.push({ key, child });
  });
  return children
    .map(({ key, child }, index) => {
      const rendered = renderComponent(child, context, depth, state, `${keyPath}~${key}`);
      return state.layerStack ? renderPanelLayer(child, index, rendered) : rendered;
    })
    .join('');
}

function renderItems(component: XconObject, context: RenderContext, depth: number, state: RenderState, keyPath: string): string {
  const items = component.get('items');
  if (!Array.isArray(items)) return '';
  return items
    .map((item, index) =>
      isXconObject(item)
        ? renderComponent(item, context, depth, state, `${keyPath}~items${index}`)
        : tag('div', { 'data-key': `${keyPath}~items${index}` }, escapeHtml(String(item ?? ''))),
    )
    .join('');
}

function renderText(component: XconObject, context: RenderContext): string {
  const value = component.get('text') ?? component.get('label') ?? component.get('content') ?? '';
  if (context.options.allowHtml && isTruthy(component.get('renderHtml'))) {
    return sanitizeHtml(String(value));
  }
  return escapeHtml(String(value));
}

function renderShape(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  context: RenderContext,
  children: string,
): string {
  return tag('div', shapeAttrs(component, attrs, context), shapeContent(component, context) + children);
}

function renderConnector(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const from = resolveConnectorPoint(component.get('from'), context);
  const to = resolveConnectorPoint(component.get('to'), context);
  if (!from || !to) {
    return tag(
      'div',
      attrsWithClass(attrsWithAppendedStyle(attrs, 'pointer-events:none;background:transparent'), 'xa-line xa-connector xa-connector--missing'),
      renderText(component, context),
    );
  }

  const left = Math.min(from[0], to[0]);
  const top = Math.min(from[1], to[1]);
  const width = Math.abs(to[0] - from[0]);
  const height = Math.abs(to[1] - from[1]);
  const line = component.deepClone();
  line.set('pos', [left, top, width, height]);
  line.set('from', [from[0] - left, from[1] - top]);
  line.set('to', [to[0] - left, to[1] - top]);
  if (!line.contains('end') && !line.contains('markerEnd') && !line.contains('arrow')) {
    line.set('end', 'arrow');
  }
  return renderLine(
    line,
    attrsWithStyle(attrs, buildStyle(line, { parentFlow: false }, { includeAutoLayout: false })),
  );
}

function resolveConnectorPoint(value: unknown, context: RenderContext): [number, number] | null {
  const endpoint = connectorEndpoint(value);
  if (!endpoint) return null;
  const rect = context.componentBounds.get(endpoint.target) ?? context.componentBounds.get(`root~${endpoint.target}`);
  if (!rect) return null;
  return anchorPoint(rect, endpoint.anchor);
}

function connectorEndpoint(value: unknown): { target: string; anchor: string } | null {
  if (typeof value === 'string') {
    const parsed = parseConnectorEndpointString(value);
    return parsed ? { target: parsed.target, anchor: parsed.anchor } : null;
  }
  if (!isXconObject(value)) return null;
  const target = value.get('target');
  if (typeof target !== 'string' || !target.trim()) return null;
  const anchor = value.get('anchor');
  return { target: target.trim(), anchor: typeof anchor === 'string' && anchor.trim() ? anchor.trim() : 'center' };
}

function parseConnectorEndpointString(value: string): { target: string; anchor: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes('.')) return { target: trimmed, anchor: 'center' };
  const parts = trimmed.split('.');
  const anchor = parts.pop() || 'center';
  const target = parts.join('.');
  return target ? { target, anchor } : null;
}

function anchorPoint(rect: Rect, rawAnchor: string): [number, number] {
  const anchor = rawAnchor.trim().toLowerCase();
  const left = rect[0];
  const top = rect[1];
  const right = rect[0] + rect[2];
  const bottom = rect[1] + rect[3];
  const centerX = rect[0] + rect[2] / 2;
  const centerY = rect[1] + rect[3] / 2;
  if (anchor === 'left' || anchor === 'start') return [left, centerY];
  if (anchor === 'right' || anchor === 'end') return [right, centerY];
  if (anchor === 'top') return [centerX, top];
  if (anchor === 'bottom') return [centerX, bottom];
  return [centerX, centerY];
}

function renderLine(component: XconObject, attrs: Record<string, string | undefined>): string {
  const pos = rectParts(component.get('pos')) ?? [0, 0, 0, 0];
  const localWidth = Math.max(0, pos[2]);
  const localHeight = Math.max(0, pos[3]);
  const from = pointParts(component.get('from')) ?? [0, 0];
  const to = pointParts(component.get('to')) ?? [localWidth, localHeight];
  const strokeWidth = lineStrokeWidth(component.get('width') ?? component.get('strokeWidth') ?? component.get('weight'));
  const padding = Math.max(6, strokeWidth * 3);
  const minX = Math.min(from[0], to[0]) - padding;
  const minY = Math.min(from[1], to[1]) - padding;
  const svgWidth = Math.max(1, Math.abs(to[0] - from[0])) + padding * 2;
  const svgHeight = Math.max(1, Math.abs(to[1] - from[1])) + padding * 2;
  const x1 = from[0] - minX;
  const y1 = from[1] - minY;
  const x2 = to[0] - minX;
  const y2 = to[1] - minY;
  const stroke = cssColor(component.get('color') ?? component.get('stroke') ?? component.get('strokeColor')) ?? 'currentColor';
  const markerStart = lineMarker(component.get('start') ?? component.get('markerStart'));
  const markerEnd = lineMarker(component.get('end') ?? component.get('markerEnd') ?? component.get('arrow'));
  const idBase = domIdFromAttrs(attrs);
  const defs = renderLineMarkers(idBase, stroke, markerStart, markerEnd);
  const label = component.get('label') ?? component.get('text');
  const labelHtml = label === undefined || label === null || String(label) === ''
    ? ''
    : tag('text', {
        x: trimNumber((x1 + x2) / 2),
        y: trimNumber((y1 + y2) / 2 - Math.max(7, strokeWidth * 2)),
        fill: cssColor(component.get('labelColor') ?? component.get('textColor') ?? component.get('color')) ?? stroke,
        'font-size': attr(component.get('fontSize') ?? fontValue(component, 'size') ?? 12),
        'font-weight': attr(fontValue(component, 'weight') ?? 700),
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      }, escapeHtml(String(label)));

  const lineAttrs: Record<string, string | undefined> = {
    x1: trimNumber(x1),
    y1: trimNumber(y1),
    x2: trimNumber(x2),
    y2: trimNumber(y2),
    stroke,
    'stroke-width': trimNumber(strokeWidth),
    'stroke-linecap': lineCap(component.get('cap') ?? component.get('lineCap')),
    'stroke-dasharray': lineDashArray(component.get('style') ?? component.get('lineStyle') ?? component.get('dash'), strokeWidth),
    'marker-start': markerStart ? `url(#${idBase}_${markerStart}_start)` : undefined,
    'marker-end': markerEnd ? `url(#${idBase}_${markerEnd}_end)` : undefined,
  };

  return tag(
    'div',
    attrsWithClass(attrsWithAppendedStyle(attrs, 'overflow:visible;pointer-events:none;background:transparent'), 'xa-line'),
    tag('svg', {
      class: 'xa-line__svg',
      viewBox: `0 0 ${trimNumber(svgWidth)} ${trimNumber(svgHeight)}`,
      width: trimNumber(svgWidth),
      height: trimNumber(svgHeight),
      style: `position:absolute;left:${trimNumber(minX)}px;top:${trimNumber(minY)}px;overflow:visible`,
      'aria-hidden': 'true',
      focusable: 'false',
    }, defs + tag('line', lineAttrs, '') + labelHtml),
  );
}

function renderLineMarkers(idBase: string, stroke: string, markerStart: string | null, markerEnd: string | null): string {
  const markers: string[] = [];
  if (markerStart === 'arrow') markers.push(renderLineArrowMarker(`${idBase}_${markerStart}_start`, stroke, true));
  if (markerEnd === 'arrow') markers.push(renderLineArrowMarker(`${idBase}_${markerEnd}_end`, stroke, false));
  return markers.length ? tag('defs', {}, markers.join('')) : '';
}

function renderLineArrowMarker(id: string, color: string, reverse: boolean): string {
  return tag('marker', {
    id,
    viewBox: '0 0 10 10',
    refX: reverse ? '2' : '8',
    refY: '5',
    markerWidth: '6',
    markerHeight: '6',
    orient: reverse ? 'auto-start-reverse' : 'auto',
    markerUnits: 'strokeWidth',
  }, tag('path', {
    d: reverse ? 'M 8 0 L 0 5 L 8 10 z' : 'M 0 0 L 10 5 L 0 10 z',
    fill: color,
  }, ''));
}

function shapeAttrs(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): Record<string, string | undefined> {
  const shape = String(component.get('shape') ?? 'rectangle').trim() || 'rectangle';
  const animationUrls = shapeImageAnimationUrls(component, context);
  const imageAnimation = animationUrls.length > 1;
  const slideshow = shapeImageSlideshow(component);
  return {
    ...attrsWithAppendedStyle(attrs, shapeStyle(component, context)),
    'data-shape': shape,
    alt: attr(component.get('alt')),
    title: attr(component.get('title')),
    'aria-label': attr(component.get('ariaLabel') ?? component.get('aria-label')),
    role: attr(component.get('role')),
    'data-xcon-shape-image-animation': imageAnimation ? 'true' : undefined,
    'data-xcon-shape-images': imageAnimation ? JSON.stringify(animationUrls) : undefined,
    'data-xcon-shape-duration': imageAnimation ? String(shapeAnimationDurationMs(slideshow?.get('duration') ?? component.get('animationDuration'))) : undefined,
    'data-xcon-shape-mode': imageAnimation ? attr(slideshow?.get('mode') ?? component.get('animationMode') ?? 'infinite') : undefined,
    'data-xcon-shape-direction': imageAnimation ? attr(component.get('animationDirection') ?? 'normal') : undefined,
  };
}

function shapeContent(component: XconObject, context: RenderContext): string {
  const image = component.get('image');
  const imageMode = String((isXconObject(image) ? image.get('mode') : undefined) ?? component.get('imageMode') ?? 'background').toLowerCase();
  const imageSource = shapeImageSource(component);
  if (String(imageMode ?? '').toLowerCase() === 'content') {
    const src = sanitizeUrl(imageSource, context.options);
    if (src) {
      return voidTag('img', {
        src,
        alt: attr(component.get('alt') ?? component.get('title') ?? ''),
        loading: 'lazy',
        style: `display:block;width:100%;height:100%;object-fit:${safeCssValue(component.get('imageFit')) ?? 'cover'};${shapeImageFilter(component)}`,
      });
    }
  }

  const html = component.get('html');
  let content = '';
  if (html !== undefined && html !== null && String(html) !== '') content = context.options.allowHtml ? sanitizeHtml(String(html)) : escapeHtml(String(html));
  else content = renderText(component, context);

  if (imageMode === 'overlay') {
    const src = sanitizeUrl(imageSource, context.options);
    if (src) content += shapeOverlayImage(component, src);
  }
  return content;
}

function shapeImageSource(component: XconObject): string | undefined {
  const image = component.get('image');
  if (isXconObject(image)) return attr(image.get('src') ?? image.get('url'));
  return attr(component.get('src') ?? image);
}

function shapeImageAnimationUrls(component: XconObject, context: RenderContext): string[] {
  const slideshow = shapeImageSlideshow(component);
  if (slideshow) {
    if (!booleanOption(slideshow.get('enabled'), false)) return [];
    return shapeImageUrls(slideshow.get('images'), context);
  }
  if (!isTruthy(component.get('imageAnimation'))) return [];
  return shapeImageUrls(component.get('images'), context);
}

function shapeImageSlideshow(component: XconObject): XconObject | null {
  const image = component.get('image');
  const slideshow = (isXconObject(image) ? image.get('slideshow') : undefined) ?? component.get('slideshow');
  return isXconObject(slideshow) ? slideshow : null;
}

function shapeImageUrls(images: unknown, context: RenderContext): string[] {
  if (!Array.isArray(images)) return [];
  const urls: string[] = [];
  for (const item of images) {
    const source = isXconObject(item) ? item.get('src') ?? item.get('image') ?? item.get('url') : item;
    const url = sanitizeUrl(stripCssUrl(String(source ?? '')), context.options);
    if (url) urls.push(url);
  }
  return urls;
}

function shapeAnimationDurationMs(value: unknown): number {
  if (value === undefined || value === null || value === '') return 3000;
  if (typeof value === 'number') return Math.max(100, value);
  const text = String(value).trim().toLowerCase();
  if (text.endsWith('ms')) {
    const ms = Number.parseFloat(text);
    return Number.isFinite(ms) ? Math.max(100, ms) : 3000;
  }
  const seconds = Number.parseFloat(text);
  if (!Number.isFinite(seconds)) return 3000;
  return Math.max(100, text.endsWith('s') ? seconds * 1000 : seconds);
}

function shapeOverlayImage(component: XconObject, src: string): string {
  const declarations = [
    'position:absolute',
    'top:0',
    'left:0',
    'width:100%',
    'height:100%',
    `background-image:url(${src})`,
    `background-size:${safeCssValue(component.get('imageSize')) ?? safeCssValue(component.get('backgroundSize')) ?? 'cover'}`,
    `background-position:${safeCssValue(component.get('imagePosition')) ?? safeCssValue(component.get('backgroundPosition')) ?? 'center'}`,
    `background-repeat:${safeCssValue(component.get('imageRepeat')) ?? safeCssValue(component.get('backgroundRepeat')) ?? 'no-repeat'}`,
    `opacity:${safeCssValue(component.get('imageOpacity')) ?? '1'}`,
    `mix-blend-mode:${safeCssValue(component.get('imageBlendMode')) ?? 'normal'}`,
    shapeImageFilter(component),
    'pointer-events:none',
  ].filter(Boolean);
  return tag('div', { style: declarations.join(';') }, '');
}

function shapeImageFilter(component: XconObject): string {
  const explicit = safeCssValue(component.get('imageFilter'));
  if (explicit) return `filter:${explicit}`;
  const filters: string[] = [];
  const blur = safeCssValue(component.get('imageBlur'));
  const brightness = safeCssValue(component.get('imageBrightness'));
  const contrast = safeCssValue(component.get('imageContrast'));
  const saturate = safeCssValue(component.get('imageSaturate'));
  const hueRotate = safeCssValue(component.get('imageHueRotate'));
  if (blur && blur !== '0') filters.push(`blur(${blur})`);
  if (brightness && brightness !== '1') filters.push(`brightness(${brightness})`);
  if (contrast && contrast !== '1') filters.push(`contrast(${contrast})`);
  if (saturate && saturate !== '1') filters.push(`saturate(${saturate})`);
  if (hueRotate && hueRotate !== '0deg') filters.push(`hue-rotate(${hueRotate})`);
  return filters.length ? `filter:${filters.join(' ')}` : '';
}

function shapeStyle(component: XconObject, context: RenderContext): string {
  const declarations: string[] = [];
  const background = component.get('background');
  const backgroundGradient =
    (isXconObject(background) ? background.get('gradient') : undefined) ??
    component.get('backgroundGradient') ??
    shapeGradient(component, (isXconObject(background) ? background.get('gradientColors') : undefined) ?? component.get('gradientColors'));
  const backgroundColor = isXconObject(background) ? background.get('color') : undefined;

  appendCss(declarations, 'background', safeCssValue(backgroundGradient));
  appendCss(declarations, 'background-color', cssColor(backgroundColor));
  appendShapePatternStyle(declarations, component);
  appendShapeImageStyle(declarations, component, context);
  appendShapeTextStyle(declarations, component);
  appendShapeEffectStyle(declarations, component);
  appendShapeTransformStyle(declarations, component);
  appendShapeAnimationStyle(declarations, component);
  appendCss(declarations, 'clip-path', shapeClipPath(component));
  appendShapeMiscStyle(declarations, component);
  appendShapeIndividualRadii(declarations, component);

  return declarations.join(';');
}

function appendShapeImageStyle(declarations: string[], component: XconObject, context: RenderContext): void {
  const image = component.get('image');
  const imageObject = isXconObject(image) ? image : undefined;
  const imageMode = String(imageObject?.get('mode') ?? component.get('imageMode') ?? 'background').toLowerCase();
  const directBackground = component.get('backgroundImage');
  const animationUrls = shapeImageAnimationUrls(component, context);
  const shouldRenderBackground = imageMode === 'background' || directBackground !== undefined || animationUrls.length > 1;
  if (!shouldRenderBackground) return;

  const source = animationUrls[0] ?? imageObject?.get('src') ?? imageObject?.get('url') ?? directBackground ?? component.get('src') ?? (typeof image === 'string' ? image : undefined);
  const url = sanitizeUrl(stripCssUrl(String(source ?? '')), context.options);
  if (!url) return;

  declarations.push(`background-image:url(${url})`);
  appendCss(declarations, 'background-size', safeCssValue(imageObject?.get('size') ?? component.get('imageSize') ?? component.get('backgroundSize') ?? 'cover'));
  appendCss(declarations, 'background-position', safeCssValue(imageObject?.get('position') ?? component.get('imagePosition') ?? component.get('backgroundPosition') ?? 'center'));
  appendCss(declarations, 'background-repeat', safeCssValue(imageObject?.get('repeat') ?? component.get('imageRepeat') ?? component.get('backgroundRepeat') ?? 'no-repeat'));
  const imageOpacity = safeCssValue(component.get('imageOpacity'));
  if (imageOpacity && imageOpacity !== '1') {
    appendCss(declarations, 'background-color', `rgba(255,255,255,${1 - Number.parseFloat(imageOpacity)})`);
    appendCss(declarations, 'background-blend-mode', 'multiply');
  }
}

function appendShapePatternStyle(declarations: string[], component: XconObject): void {
  const pattern = shapePattern(component);
  if (pattern) declarations.push(`background-image:${pattern}`);
}

function shapePattern(component: XconObject): string | undefined {
  const pattern = String(component.get('backgroundPattern') ?? '').trim().toLowerCase();
  if (!pattern) return undefined;
  const size = safeCssValue(component.get('patternSize')) ?? '10px';
  const color = safeCssValue(component.get('patternColor')) ?? '#000000';
  if (pattern === 'dots') return `radial-gradient(circle at center, ${color} 1px, transparent 1px)`;
  if (pattern === 'stripes') return `repeating-linear-gradient(45deg, ${color} 0, ${color} 1px, transparent 1px, transparent ${size})`;
  if (pattern === 'grid') return `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
  if (pattern === 'checkerboard') return `conic-gradient(${color} 90deg, transparent 90deg 180deg, ${color} 180deg 270deg, transparent 270deg)`;
  return undefined;
}

function appendShapeTextStyle(declarations: string[], component: XconObject): void {
  appendCss(declarations, 'font-family', fontValue(component, 'family') ?? 'Arial, sans-serif');
  appendCss(declarations, 'font-size', cssSize(fontValue(component, 'size') ?? component.get('fontSize') ?? '14px'));
  appendCss(declarations, 'font-weight', fontValue(component, 'weight') ?? component.get('fontWeight') ?? 'normal');
  appendCss(declarations, 'font-style', fontValue(component, 'style') ?? component.get('fontStyle') ?? 'normal');
  appendCss(declarations, 'text-decoration', component.get('textDecoration') ?? textDecoration(component) ?? 'none');
  appendCss(declarations, 'line-height', component.get('lineHeight') ?? 'normal');
  appendCss(declarations, 'letter-spacing', safeCssValue(component.get('letterSpacing') ?? 'normal'));
  appendCss(declarations, 'word-spacing', safeCssValue(component.get('wordSpacing') ?? 'normal'));
  appendCss(declarations, 'text-align', component.get('textAlign') ?? 'left');
  if (shapeHasContent(component)) {
    const vAlign = String(component.get('verticalAlign') ?? component.get('textVerticalAlign') ?? 'middle').toLowerCase();
    if (vAlign !== 'top') {
      declarations.push('display:flex');
      appendCss(declarations, 'align-items', vAlign === 'bottom' ? 'flex-end' : 'center');
      if (component.get('textAlign') !== undefined && component.get('textAlign') !== 'left') appendCss(declarations, 'justify-content', justifyFromTextAlign(component.get('textAlign')));
    }
  }
  appendCss(declarations, 'text-shadow', safeCssValue(component.get('textShadow')));
  appendCss(declarations, '-webkit-text-stroke', safeCssValue(component.get('textStroke')));
  const outline = safeCssValue(component.get('textOutline'));
  if (outline) appendCss(declarations, 'text-shadow', `-1px -1px 0 ${outline}, 1px -1px 0 ${outline}, -1px 1px 0 ${outline}, 1px 1px 0 ${outline}`);
  appendCss(declarations, 'white-space', safeCssValue(component.get('whiteSpace')));
  appendCss(declarations, 'word-wrap', safeCssValue(component.get('wordWrap')));
  const overflow = String(component.get('textOverflow') ?? '').toLowerCase();
  if (overflow === 'ellipsis') {
    declarations.push('overflow:hidden', 'text-overflow:ellipsis');
    if (String(component.get('whiteSpace') ?? 'normal') === 'normal') declarations.push('white-space:nowrap');
  } else if (overflow === 'clip') {
    declarations.push('overflow:hidden');
  }
  const maxLines = safeCssValue(component.get('maxLines'));
  if (maxLines) declarations.push('display:-webkit-box', `-webkit-line-clamp:${maxLines}`, '-webkit-box-orient:vertical', 'overflow:hidden');
}

function appendShapeEffectStyle(declarations: string[], component: XconObject): void {
  const effects = component.get('effects');
  const boxShadow = safeCssValue((isXconObject(effects) ? effects.get('boxShadow') : undefined) ?? component.get('boxShadow'));
  const innerShadow = safeCssValue((isXconObject(effects) ? effects.get('innerShadow') : undefined) ?? component.get('innerShadow'));
  const shadows: string[] = [];
  if (boxShadow) shadows.push(boxShadow);
  if (innerShadow) shadows.push(innerShadow.trim().startsWith('inset') ? innerShadow : `inset ${innerShadow}`);
  if (shadows.length) declarations.push(`box-shadow:${shadows.join(', ')}`);
  const glow = safeCssValue(component.get('glow'));
  if (glow && !shadows.length) appendCss(declarations, 'box-shadow', `0 0 ${safeCssValue(component.get('glowIntensity')) ?? '10px'} ${cssColor(component.get('glowColor')) ?? '#ffffff'}`);

  appendCss(declarations, 'opacity', safeCssValue((isXconObject(effects) ? effects.get('opacity') : undefined) ?? component.get('opacity')));
  appendCss(declarations, 'mix-blend-mode', safeCssValue((isXconObject(effects) ? effects.get('mixBlendMode') : undefined) ?? component.get('mixBlendMode') ?? component.get('blendMode')));
  const filter = shapeFilter(component, isXconObject(effects) ? effects.get('filter') : undefined);
  if (filter) appendCss(declarations, 'filter', filter);
}

function shapeFilter(component: XconObject, effectFilter: unknown): string | undefined {
  const explicit = safeCssValue(effectFilter ?? component.get('filter'));
  if (explicit) return explicit;
  const filters: string[] = [];
  const entries: Array<[string, string, string]> = [
    ['blur', 'blur', '0'],
    ['brightness', 'brightness', '1'],
    ['contrast', 'contrast', '1'],
    ['saturate', 'saturate', '1'],
    ['hueRotate', 'hue-rotate', '0deg'],
    ['invert', 'invert', '0'],
    ['sepia', 'sepia', '0'],
    ['grayscale', 'grayscale', '0'],
  ];
  for (const [key, fn, defaultValue] of entries) {
    const value = safeCssValue(component.get(key));
    if (value && value !== defaultValue) filters.push(`${fn}(${value})`);
  }
  const dropShadow = safeCssValue(component.get('dropShadow'));
  if (dropShadow) filters.push(`drop-shadow(${dropShadow})`);
  return filters.length ? filters.join(' ') : undefined;
}

function appendShapeTransformStyle(declarations: string[], component: XconObject): void {
  const transform = safeCssValue(component.get('transform'));
  if (transform) {
    appendCss(declarations, 'transform', transform);
  } else {
    const transforms: string[] = [];
    const translateX = safeCssValue(component.get('translateX'));
    const translateY = safeCssValue(component.get('translateY'));
    if ((translateX && translateX !== '0') || (translateY && translateY !== '0')) transforms.push(`translate(${translateX ?? '0'}, ${translateY ?? '0'})`);
    const rotate = safeCssValue(component.get('rotate'));
    if (rotate && rotate !== '0deg') transforms.push(`rotate(${rotate})`);
    const scale = safeCssValue(component.get('scale'));
    if (scale && scale !== '1') transforms.push(`scale(${scale})`);
    const scaleX = safeCssValue(component.get('scaleX'));
    const scaleY = safeCssValue(component.get('scaleY'));
    if ((scaleX && scaleX !== '1') || (scaleY && scaleY !== '1')) transforms.push(`scale(${scaleX ?? '1'}, ${scaleY ?? '1'})`);
    const skew = safeCssValue(component.get('skew'));
    if (skew && skew !== '0deg') transforms.push(`skew(${skew})`);
    const skewX = safeCssValue(component.get('skewX'));
    if (skewX && skewX !== '0deg') transforms.push(`skewX(${skewX})`);
    const skewY = safeCssValue(component.get('skewY'));
    if (skewY && skewY !== '0deg') transforms.push(`skewY(${skewY})`);
    if (transforms.length) appendCss(declarations, 'transform', transforms.join(' '));
  }
  const origin = safeCssValue(component.get('transformOrigin'));
  if (origin && origin !== 'center') appendCss(declarations, 'transform-origin', origin);
}

function appendShapeAnimationStyle(declarations: string[], component: XconObject): void {
  const animation = safeCssValue(component.get('animation'));
  if (animation) {
    appendCss(declarations, 'animation', animation);
  } else if (component.get('animationName')) {
    const props = [
      safeCssValue(component.get('animationName')),
      safeCssValue(component.get('animationDuration')) ?? '3s',
      safeCssValue(component.get('animationTimingFunction')) ?? 'ease',
      safeCssValue(component.get('animationDelay')) ?? '0s',
      safeCssValue(component.get('animationIterationCount')) ?? '1',
      safeCssValue(component.get('animationDirection')) ?? 'normal',
      safeCssValue(component.get('animationFillMode')) ?? 'none',
    ].filter(Boolean);
    appendCss(declarations, 'animation', props.join(' '));
  }
  const transition = safeCssValue(component.get('transition'));
  if (transition) {
    appendCss(declarations, 'transition', transition);
  } else if (component.get('transitionProperty') !== undefined || component.get('transitionDuration') !== undefined) {
    const props = [
      safeCssValue(component.get('transitionProperty')) ?? 'all',
      safeCssValue(component.get('transitionDuration')) ?? '0.3s',
      safeCssValue(component.get('transitionTimingFunction')) ?? 'ease',
      safeCssValue(component.get('transitionDelay')) ?? '0s',
    ];
    appendCss(declarations, 'transition', props.join(' '));
  }
}

function appendShapeMiscStyle(declarations: string[], component: XconObject): void {
  const misc: Array<[string, unknown, string]> = [
    ['cursor', component.get('cursor'), 'default'],
    ['user-select', component.get('userSelect'), 'auto'],
    ['pointer-events', component.get('pointerEvents'), 'auto'],
    ['overflow', component.get('overflow'), 'visible'],
    ['z-index', component.get('zIndex'), 'auto'],
  ];
  for (const [property, value, defaultValue] of misc) {
    const safe = safeCssValue(value);
    if (safe && safe !== defaultValue) appendCss(declarations, property, safe);
  }
  appendCss(declarations, 'min-width', cssSize(component.get('minWidth')));
  appendCss(declarations, 'max-width', cssSize(component.get('maxWidth')));
  appendCss(declarations, 'min-height', cssSize(component.get('minHeight')));
  appendCss(declarations, 'max-height', cssSize(component.get('maxHeight')));
  if (isTruthy(component.get('debug')) || isTruthy(component.get('showBounds'))) declarations.push('outline:2px dashed #ff0000', 'outline-offset:-1px');
}

function appendShapeIndividualRadii(declarations: string[], component: XconObject): void {
  appendCss(declarations, 'border-top-left-radius', cssSize(component.get('borderTopLeftRadius')));
  appendCss(declarations, 'border-top-right-radius', cssSize(component.get('borderTopRightRadius')));
  appendCss(declarations, 'border-bottom-left-radius', cssSize(component.get('borderBottomLeftRadius')));
  appendCss(declarations, 'border-bottom-right-radius', cssSize(component.get('borderBottomRightRadius')));
}

function shapeClipPath(component: XconObject): string | undefined {
  const direct = safeCssValue(component.get('clipPath'));
  if (direct) return direct;

  const shape = String(component.get('shape') ?? 'rectangle').trim().toLowerCase();
  if (shape === 'circle') return `circle(${shapeRadius(component.get('circleRadius') ?? component.get('radius') ?? '50%')})`;
  if (shape === 'ellipse') return 'ellipse(50% 50%)';
  if (shape === 'triangle') return 'polygon(50% 0%, 0% 100%, 100% 100%)';
  if (shape === 'hexagon') return 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)';
  if (shape === 'star') return starClipPath(component);
  if (shape === 'polygon') return safeCssValue(component.get('shapePoints')) ?? polygonClipPath(component);
  if (shape === 'custom') return safeCssValue(component.get('shapePoints'));
  return undefined;
}

function starClipPath(component: XconObject): string {
  const points = Math.max(3, Number(component.get('starPoints') ?? component.get('points') ?? 5) || 5);
  const inner = Math.max(0.05, Math.min(0.95, Number(component.get('starInnerRadius') ?? component.get('innerRadius') ?? 0.5) || 0.5));
  const coords: string[] = [];
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? 50 : 50 * inner;
    const angle = -90 + (index * 180) / points;
    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
    coords.push(`${trimNumber(x)}% ${trimNumber(y)}%`);
  }
  return `polygon(${coords.join(', ')})`;
}

function polygonClipPath(component: XconObject): string {
  const sides = Math.max(3, Number(component.get('sides') ?? component.get('polygonSides') ?? 6) || 6);
  const coords: string[] = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = -90 + (index * 360) / sides;
    const x = 50 + 50 * Math.cos((angle * Math.PI) / 180);
    const y = 50 + 50 * Math.sin((angle * Math.PI) / 180);
    coords.push(`${trimNumber(x)}% ${trimNumber(y)}%`);
  }
  return `polygon(${coords.join(', ')})`;
}

function shapeHasContent(component: XconObject): boolean {
  return (
    component.get('text') !== undefined ||
    component.get('label') !== undefined ||
    component.get('content') !== undefined ||
    component.get('html') !== undefined
  );
}

function shapeRadius(value: unknown): string {
  if (typeof value === 'number') return `${value}px`;
  const text = String(value ?? '50%').trim();
  return text || '50%';
}

function gradientFromColors(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const colors = value.map((item) => cssColor(item)).filter(Boolean);
  return colors.length ? `linear-gradient(135deg, ${colors.join(', ')})` : undefined;
}

function shapeGradient(component: XconObject, value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const stops = Array.isArray(component.get('gradientStops')) ? component.get('gradientStops') : [];
  const colors = value
    .map((item, index) => {
      const color = cssColor(item);
      if (!color) return '';
      const stop = Array.isArray(stops) && stops[index] ? ` ${stops[index]}` : '';
      return `${color}${stop}`;
    })
    .filter(Boolean);
  if (colors.length < 2) return undefined;
  const type = String(component.get('gradientType') ?? 'linear').toLowerCase();
  const direction = safeCssValue(component.get('gradientDirection'));
  if (type === 'radial') return `radial-gradient(${direction ?? 'circle'}, ${colors.join(', ')})`;
  if (type === 'conic') return `conic-gradient(${direction ?? 'from 0deg'}, ${colors.join(', ')})`;
  return `linear-gradient(${direction ?? 'to right'}, ${colors.join(', ')})`;
}

function safeCssValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value).trim();
  if (!text || activeCssPattern.test(text)) return undefined;
  return expandThemeTokenAliases(text);
}

function stripCssUrl(value: string): string {
  const match = value.trim().match(/^url\((.*)\)$/i);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : value;
}

function trimNumber(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function renderForm(component: XconObject, attrs: Record<string, string | undefined>, children: string, context: RenderContext): string {
  const header = isFalseLike(component.get('hidenavbar'))
    ? tag(
        'div',
        { class: 'xa-al-form__header' },
        tag('span', {}, escapeHtml(String(component.get('title') ?? ''))) +
          (isFalseLike(component.get('closable')) ? '' : tag('button', { class: 'xa-al-close', type: 'button', 'aria-label': 'close' }, '&times;')),
      )
    : '';
  const content = tag(
    'div',
    { class: `xa-al-form__body${hidesFormScrollbar(component) ? ' xa-form-hidden-scrollbar' : ''}`, style: formBodyStyle(component) },
    tag('div', { class: 'xa-al-form__stack', style: formStackStyle(component) }, children),
  );
  return tag(
    'div',
    attrsWithStyle(attrsWithAppendedStyle(attrs, formExtraStyle(component, context)), 'position:relative;display:flex;flex-direction:column;width:100%;min-height:100%;overflow:hidden'),
    header + content,
  );
}

function formExtraStyle(component: XconObject, context: RenderContext): string {
  const declarations = [
    'border:1px solid var(--border, rgba(0,0,0,.08))',
    'border-radius:var(--r-lg, 16px)',
    'background:var(--surface, #fff)',
    'box-shadow:var(--shadow-sm, 0 2px 8px rgba(0,0,0,.08))',
    'overflow:hidden',
  ];
  appendCss(declarations, 'background-color', cssColor(component.get('backgroundColor') ?? component.get('bgColor')));
  const imageSource = component.get('bgImage') ?? component.get('backgroundImage');
  if (imageSource !== undefined && imageSource !== null && imageSource !== '') {
    const url = sanitizeUrl(stripCssUrl(String(imageSource)), context.options);
    if (url) {
      declarations.push(`background-image:url(${url})`);
      appendCss(declarations, 'background-size', safeCssValue(component.get('backgroundSize') ?? 'cover'));
      appendCss(declarations, 'background-position', safeCssValue(component.get('backgroundPosition') ?? 'center'));
      appendCss(declarations, 'background-repeat', safeCssValue(component.get('backgroundRepeat') ?? 'no-repeat'));
    }
  }
  return declarations.join(';');
}

function renderPanel(component: XconObject, attrs: Record<string, string | undefined>, body: string, context: RenderContext): string {
  const content = tag(
    'div',
    { class: 'xa-al-panel__body', style: panelBodyStyle(component) },
    tag('div', { class: panelStackClass(component), style: panelStackStyle(component) }, body),
  );
  return tag(
    'div',
    attrsWithStyle(attrsWithAppendedStyle(attrs, panelExtraStyle(component, context)), 'display:flex;flex-direction:column;min-width:0;overflow:hidden;box-sizing:border-box'),
    content,
  );
}

function panelExtraStyle(component: XconObject, context: RenderContext): string {
  const declarations: string[] = ['overflow:hidden'];
  const imageSource = component.get('bgImage') ?? component.get('backgroundImage');
  if (imageSource !== undefined && imageSource !== null && imageSource !== '') {
    const url = sanitizeUrl(stripCssUrl(String(imageSource)), context.options);
    if (url) {
      declarations.push(`background-image:url(${url})`);
      appendCss(declarations, 'background-size', safeCssValue(component.get('backgroundSize') ?? 'cover'));
      appendCss(declarations, 'background-position', safeCssValue(component.get('backgroundPosition') ?? 'center'));
      appendCss(declarations, 'background-repeat', safeCssValue(component.get('backgroundRepeat') ?? 'no-repeat'));
    }
  }
  return declarations.join(';');
}

function renderLabel(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  if (isGeneratedBlankLabel(component)) return '';

  const editorial = isTruthy(component.get('editorialBar'));
  const dotHtml = isTruthy(component.get('prefixDot'))
    ? tag('span', { class: 'xa-al-label__dot', 'aria-hidden': 'true' }, '')
    : '';
  const icon = iconName(component.get('icon'));
  const iconHtml = icon ? iconSvg(icon, 'none').replaceAll('xa-al-btn__icon', 'xa-al-label__icon') : '';
  const suffix = labelSuffixText(component);
  const suffixColor = labelSuffixColor(component);
  const suffixHtml =
    suffix !== undefined
      ? tag('span', { class: 'xa-al-label__suffix', style: suffixColor ? `color:${suffixColor}` : undefined }, escapeHtml(suffix))
      : '';
  const textHtml = tag(
    'span',
    { class: 'xa-al-label__text', style: labelTextStyle(component) },
    `${dotHtml}${iconHtml}${tag('span', { class: 'xa-al-label__value' }, renderText(component, context))}${suffixHtml}`,
  );
  const barColor = cssColor(component.get('editorialBarColor')) ?? 'var(--accent)';
  const mainHtml = editorial
    ? tag(
        'div',
        { class: 'xa-al-label__editorial-row', style: `align-items:${verticalAlign(component)}` },
        tag('span', { class: 'xa-al-label__editorial-bar', style: `background:${barColor}`, 'aria-hidden': 'true' }, '') + textHtml,
      )
    : textHtml;
  const hint = labelHintText(component);
  const hintHtml = hint !== undefined ? tag('span', { class: 'xa-al-label__hint' }, escapeHtml(hint)) : '';

  return tag(
    'div',
    attrsWithStyle(
      attrsWithClass(attrs, [editorial ? 'xa-al-label--editorial' : '', labelShimmerClass(component)].filter(Boolean).join(' ')),
      `display:flex!important;flex-direction:column;align-items:stretch;justify-content:${labelContainerJustify(component)};min-width:0`,
    ),
    mainHtml + hintHtml,
  );
}

function labelShimmerClass(component: XconObject): string {
  if (!isTruthy(component.get('shimmer'))) return '';
  const direction = String(component.get('shimmerDirection') ?? 'rtl').trim().toLowerCase();
  return `xa-al-sk-shimmer ${direction === 'ltr' ? 'xa-al-sk-shimmer--ltr' : 'xa-al-sk-shimmer--rtl'}`;
}

function labelSuffixText(component: XconObject): string | undefined {
  const direct = textValue(component.get('suffixText'));
  if (direct !== undefined) return direct;
  const suffix = component.get('suffix');
  if (isXconObject(suffix)) return textValue(suffix.get('text') ?? suffix.get('label') ?? suffix.get('value'));
  return textValue(suffix);
}

function labelSuffixColor(component: XconObject): string | undefined {
  const direct = cssColor(component.get('suffixTextColor') ?? component.get('suffixColor'));
  if (direct) return direct;
  const suffix = component.get('suffix');
  if (!isXconObject(suffix)) return undefined;
  return cssColor(suffix.get('color') ?? suffix.get('textColor'));
}

function labelHintText(component: XconObject): string | undefined {
  const direct = textValue(component.get('hintText'));
  if (direct !== undefined) return direct;
  const hint = component.get('hint');
  if (isXconObject(hint)) return textValue(hint.get('text') ?? hint.get('label') ?? hint.get('value'));
  return textValue(hint);
}

function textValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function isGeneratedBlankLabel(component: XconObject): boolean {
  const value = component.get('text') ?? component.get('label') ?? component.get('content') ?? '';
  const text = String(value);
  if (text.includes('\u00a0') || text.trim() !== '') return false;
  return !hasLabelVisibleSurface(component);
}

function hasLabelVisibleSurface(component: XconObject): boolean {
  return (
    component.contains('backgroundColor') ||
    component.contains('labelPadding') ||
    component.contains('padding') ||
    component.contains('borderRadius') ||
    component.contains('round') ||
    component.contains('style') ||
    component.contains('cssClass') ||
    component.contains('className') ||
    isTruthy(component.get('prefixDot')) ||
    isTruthy(component.get('editorialBar')) ||
    isTruthy(component.get('shimmer')) ||
    labelSuffixText(component) !== undefined ||
    labelHintText(component) !== undefined ||
    hasVisibleBorder(component)
  );
}

function hasVisibleBorder(component: XconObject): boolean {
  const border = component.get('border');
  if (isXconObject(border)) return !isFalseLike(border.get('visible'));
  return border === true || border === 'true' || border === 1 || border === '1';
}

function renderButton(component: XconObject, attrs: Record<string, string | undefined>): string {
  const label = component.get('label') ?? component.get('text') ?? '';
  const icon = iconName(component.get('icon'));
  const image = component.get('image');
  const iconOnly = String(label).trim() === '' && Boolean(icon || image);
  const stackColumn = isButtonStackColumn(component);
  const loading = isTruthy(component.get('loading') ?? component.get('busy'));
  const disabled = isButtonDisabled(component);
  const classes = [
    iconOnly ? 'xa-al-btn--icon-only' : '',
    stackColumn ? 'xa-al-btn--stack-col' : '',
    loading ? 'xa-al-btn--loading' : '',
    disabled ? 'xa-al-btn--disabled' : '',
    buttonAppearanceClass(component),
    buttonSegmentClass(component),
    buttonSplitClass(component),
    isButtonBlock(component) ? 'xa-al-btn--block' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const title = component.get('title');
  const iconHtml = icon ? iconSvg(icon, 'none') : '';
  const imageHtml = typeof image === 'string' && image ? voidTag('img', { class: 'xa-al-btn__img', src: image, alt: '' }) : '';
  const spinnerHtml = loading ? tag('span', { class: 'xa-al-btn__spinner', 'aria-hidden': 'true' }, '') : '';
  const labelHtml = iconOnly
    ? tag('span', { class: 'xa-al-btn__label xa-al-btn__label--empty', 'aria-hidden': 'true' }, '')
    : tag('span', { class: 'xa-al-btn__label' }, escapeHtml(String(label)));
  return tag(
    'button',
    {
      ...attrsWithStyle(attrsWithClass(attrs, classes), buttonStyle(component, { iconOnly, stackColumn })),
      type: 'button',
      disabled: disabled ? '' : undefined,
      title: attr(title),
      'aria-busy': loading ? 'true' : undefined,
      'aria-label': attr(String(label).trim() || title || icon || ''),
    },
    `${imageHtml}${iconHtml}${labelHtml}${spinnerHtml}`,
  );
}

function renderTextField(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  forcedType: string | undefined,
  _context: RenderContext,
): string {
  const prefixAffix = textFieldAffix(component, 'prefix');
  const suffixAffix = textFieldAffix(component, 'suffix');
  const prefixIconHtml = prefixAffix.icon ? textFieldIcon(prefixAffix.icon) : '';
  const suffixIconHtml = suffixAffix.icon ? textFieldIcon(suffixAffix.icon) : '';
  const leadingBlock = textValue(component.get('leadingBlock') ?? component.get('leadingText') ?? component.get('prefixBlock'));
  const trailingButton = textValue(component.get('trailingButton') ?? component.get('postButton') ?? component.get('suffixButton'));
  const floatLabel = textValue(component.get('floatLabel'));
  const disabled = isTextFieldDisabled(component);
  const readonly = isTruthy(component.get('readonly') ?? component.get('readOnly'));
  const inputId = domIdFromAttrs(attrs);
  const hasOtp = component.get('otpIndex') !== undefined && component.get('otpIndex') !== null && component.get('otpIndex') !== '';
  const hasPrefix = Boolean(prefixIconHtml || prefixAffix.text);
  const hasSuffix = Boolean(suffixIconHtml || suffixAffix.text);
  const inputClass = [
    'xa-al-tf',
    textFieldStateClass(component),
    hasOtp ? 'xa-al-tf--otp' : '',
    leadingBlock ? 'xa-al-tf--with-leading' : '',
    trailingButton ? 'xa-al-tf--has-post' : '',
    floatLabel ? 'xa-al-tf-float' : '',
    floatLabel && textFieldValue(component) ? 'xa-al-tf-float--has-val' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const input = voidTag('input', {
    class: inputClass,
    id: inputId,
    type: textFieldInputType(component, forcedType),
    value: attr(textFieldValue(component)),
    placeholder: attr(component.get('placeholder') ?? ''),
    readonly: readonly ? '' : undefined,
    disabled: disabled ? '' : undefined,
    required: isTruthy(component.get('required')) ? '' : undefined,
    minlength: attr(component.get('minLength')),
    maxlength: attr(component.get('maxLength')),
    pattern: attr(component.get('pattern')),
    inputmode: attr(component.get('inputMode')),
    name: attr(component.get('name')),
    autocomplete: 'off',
    'data-xcon-bind': attr(component.get('bind') ?? component.get('binding')),
    'data-xa-otp-index': hasOtp ? attr(component.get('otpIndex')) : undefined,
    'data-xa-otp-group': hasOtp ? attr(component.get('otpGroup') ?? 'al-otp') : undefined,
    style: textFieldInputStyle(component, {
      hasPrefix,
      hasPrefixText: Boolean(prefixAffix.text),
      hasSuffix,
      hasLeading: Boolean(leadingBlock),
      hasTrailing: Boolean(trailingButton),
      hasFloatLabel: Boolean(floatLabel),
      hasOtp,
    }),
  });

  const rootAttrs = nativeInputRootAttrs(component, attrs, disabled ? 'xa-al-tf-root--disabled' : '');

  if (floatLabel) {
    return tag(
      'div',
      rootAttrs,
      tag(
        'div',
        { class: 'xa-al-tf-float-group', style: textFieldFloatGroupStyle() },
        input + tag('label', { class: 'xa-al-tf-float-label', for: inputId, style: textFieldFloatLabelStyle() }, escapeHtml(floatLabel)),
      ),
    );
  }

  if (leadingBlock || trailingButton) {
    const leading = leadingBlock ? tag('span', { class: 'xa-al-tf-pre', style: textFieldPreStyle() }, escapeHtml(leadingBlock)) : '';
    const trailing = trailingButton
      ? tag('button', { type: 'button', class: 'xa-al-tf-post', style: textFieldPostStyle() }, escapeHtml(trailingButton))
      : '';
    return tag('div', rootAttrs, tag('div', { class: 'xa-al-tf-block-wrap', style: textFieldBlockWrapStyle() }, `${leading}${input}${trailing}`));
  }

  if (!hasPrefix && !hasSuffix) return tag('div', rootAttrs, input);

  const prefix = hasPrefix
    ? tag(
        'span',
        { class: `xa-al-tf-prefix${prefixIconHtml ? ' xa-al-tf-prefix-icon' : ''}`, style: textFieldPrefixStyle() },
        prefixIconHtml || escapeHtml(prefixAffix.text ?? ''),
      )
    : '';
  const suffix = hasSuffix
    ? renderTextFieldSuffix(suffixAffix.icon, suffixIconHtml, suffixAffix.text, suffixAffix.clear)
    : '';
  const wrapClass = [
    'xa-al-tf-addon-wrap',
    prefixIconHtml ? 'has-prefix' : '',
    prefixAffix.text ? 'has-prefix-text' : '',
    hasSuffix ? 'has-suffix' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return tag('div', rootAttrs, tag('div', { class: wrapClass, style: textFieldAddonWrapStyle() }, `${prefix}${input}${suffix}`));
}

function renderPasswordField(component: XconObject, attrs: Record<string, string | undefined>): string {
  const inputId = domIdFromAttrs(attrs);
  const label = textValue(component.get('label'));
  const value = textFieldValue(component);
  const disabled = isTextFieldDisabled(component);
  const readonly = isTruthy(component.get('readonly') ?? component.get('readOnly'));
  const showToggle = !isFalseLike(component.get('showToggle'));
  const showStrength = !isFalseLike(component.get('showStrength'));
  const strength = passwordStrength(value);
  const minLength = numberLike(component.get('minLength'));
  const maxLength = numberLike(component.get('maxLength'));
  const labelHtml = label ? tag('label', { class: 'f-label', for: inputId }, escapeHtml(label)) : '';
  const input = voidTag('input', {
    class: 'f-input',
    id: inputId,
    type: 'password',
    value: attr(value),
    placeholder: attr(component.get('placeholder') ?? '비밀번호를 입력하세요'),
    minlength: minLength !== undefined && minLength > 0 ? String(minLength) : undefined,
    maxlength: maxLength === undefined ? '100' : maxLength > 0 ? String(maxLength) : undefined,
    pattern: attr(component.get('pattern')),
    required: isTruthy(component.get('required')) ? '' : undefined,
    readonly: readonly ? '' : undefined,
    disabled: disabled ? '' : undefined,
    autocomplete: 'off',
    style: 'width:100%;box-sizing:border-box;',
  });
  const toggle = showToggle
    ? tag(
        'button',
        {
          type: 'button',
          class: 'pw-toggle',
          'aria-label': attr(component.get('toggleAriaLabel') ?? '비밀번호 표시'),
          'data-xcon-tf-toggle': 'visibility',
        },
        textFieldIcon('eye'),
      )
    : '';
  const strengthHtml = showStrength
    ? tag('div', { class: 'pw-strength', 'data-xcon-pw-strength': '' }, passwordStrengthBars(strength.score)) +
      tag('p', { class: 'f-hint', 'data-xcon-pw-hint': '' }, escapeHtml(strength.hint))
    : '';

  return tag('div', attrsWithClass(attrs, `xa-ext-password-host${disabled ? ' xa-al-tf-root--disabled' : ''}`), labelHtml + tag('div', { class: 'pw-wrap' }, input + toggle) + strengthHtml);
}

function renderTextarea(component: XconObject, attrs: Record<string, string | undefined>): string {
  const inputId = domIdFromAttrs(attrs);
  const label = textValue(component.get('label'));
  const value = String(component.get('value') ?? component.get('text') ?? '');
  const maxLength = numberLike(component.get('maxLength'));
  const rows = numberLike(component.get('rows'));
  const cols = numberLike(component.get('cols'));
  const showCharCount = maxLength !== undefined && maxLength > 0 && !isFalseLike(component.get('showCharCount'));
  const disabled = isTextFieldDisabled(component);
  const readonly = isTruthy(component.get('readonly') ?? component.get('readOnly'));
  const labelHtml = label ? tag('label', { class: 'f-label', for: inputId }, escapeHtml(label)) : '';
  const textarea = tag(
    'textarea',
    {
      class: 'f-textarea',
      id: inputId,
      placeholder: attr(component.get('placeholder') ?? '내용을 입력하세요'),
      rows: rows !== undefined && rows > 0 ? String(rows) : undefined,
      cols: cols !== undefined && cols > 0 ? String(cols) : undefined,
      maxlength: maxLength !== undefined && maxLength > 0 ? String(maxLength) : undefined,
      required: isTruthy(component.get('required')) ? '' : undefined,
      readonly: readonly ? '' : undefined,
      disabled: disabled ? '' : undefined,
      'data-xcon-ta': showCharCount ? '' : undefined,
      style: `width:100%;box-sizing:border-box;resize:${textareaResize(component.get('resize'))}`,
    },
    escapeHtml(value),
  );
  const footer = showCharCount
    ? tag('div', { class: 'textarea-footer' }, tag('span', { 'data-xcon-ta-count': '' }, String(value.length)) + `/${maxLength}`)
    : '';
  return tag('div', attrsWithClass(attrs, `xa-ext-textarea-host${disabled ? ' xa-al-tf-root--disabled' : ''}`), labelHtml + textarea + footer);
}

function domIdFromAttrs(attrs: Record<string, string | undefined>): string {
  return `xcon_${String(attrs['data-key'] ?? 'component').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function showcaseSuffixFromAttrs(attrs: Record<string, string | undefined>): string {
  return String(attrs['data-key'] ?? 'component').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function numberLike(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function textareaResize(value: unknown): string {
  const resize = String(value ?? 'vertical').trim().toLowerCase();
  return ['none', 'both', 'horizontal', 'vertical', 'block', 'inline'].includes(resize) ? resize : 'vertical';
}

function passwordStrength(value: string): { score: number; hint: string } {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  const labels = ['', 'Weak', 'Medium', 'Strong', 'Very Strong'];
  return { score, hint: value ? `Strength: ${labels[score]}` : '' };
}

function passwordStrengthBars(score: number): string {
  const levels = ['', 'weak', 'medium', 'strong', 'strong'];
  const level = levels[score] ?? '';
  return Array.from({ length: 4 }, (_, index) => tag('div', { class: `pw-strength__bar${index < score && level ? ` ${level}` : ''}` }, '')).join('');
}

function renderTextView(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const variant = String(component.get('textViewVariant') ?? component.get('variant') ?? '').trim().toLowerCase();
  const editable = isTruthy(component.get('editable'));
  const htmlReadonly = (isTruthy(component.get('renderHtml')) || isTruthy(component.get('html'))) && !editable;
  const staticModes = new Set(['article', 'code', 'truncate', 'list', 'metadata']);
  if (htmlReadonly && staticModes.has(variant)) return renderStaticTextView(component, attrs, context, variant);
  if (htmlReadonly) {
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-al-tv-root--html'),
      tag('div', { class: 'xa-al-tv-html-chrome' }, textViewHtml(component, context)),
    );
  }

  const disabled = isTextFieldDisabled(component);
  const textarea = tag(
    'textarea',
    {
      class: 'xa-al-tf xa-al-tf-multiline',
      placeholder: attr(component.get('placeholder') ?? ''),
      maxlength: attr(component.get('maxLength')),
      rows: attr(component.get('lineNumbers') ?? component.get('lineNum') ?? component.get('rows') ?? 4),
      readonly: editable ? undefined : '',
      disabled: disabled ? '' : undefined,
      style: textViewInputStyle(component),
    },
    escapeHtml(String(component.get('text') ?? component.get('value') ?? '')),
  );
  return tag('div', nativeInputRootAttrs(component, attrs, disabled ? 'xa-al-tf-root--disabled' : ''), textarea);
}

function renderStaticTextView(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  context: RenderContext,
  variant: string,
): string {
  const rootAttrs = attrsWithClass(textViewStaticAttrs(attrs), 'xa-al-tv-static');
  const inner = textViewHtml(component, context);
  if (variant !== 'truncate') return tag('div', rootAttrs, inner);
  const id = `xa_tv_trunc_${String(attrs['data-key'] ?? 'textView').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return tag(
    'div',
    rootAttrs,
    tag('div', { class: 'tv-truncate collapsed', id }, inner) +
      tag('button', { type: 'button', class: 'tv-read-more', 'data-xa-trunc-toggle': id }, 'Read more ↓'),
  );
}

function textViewHtml(component: XconObject, context: RenderContext): string {
  const raw = String(component.get('text') ?? component.get('value') ?? '');
  return context.options.allowHtml ? sanitizeHtml(raw) : escapeHtml(raw);
}

function textViewStaticAttrs(attrs: Record<string, string | undefined>): Record<string, string | undefined> {
  const style = stripStyleDeclarations(attrs.style, new Set(['height', 'min-height']));
  return attrsWithStyle({ ...attrs, style }, 'height:auto;min-height:0;max-width:100%;width:100%;box-sizing:border-box');
}

function textFieldAffix(component: XconObject, kind: 'prefix' | 'suffix'): { icon?: string; text?: string; clear?: boolean } {
  const objectValue = component.get(kind);
  const sideIcon = kind === 'prefix' ? component.get('leftIcon') : component.get('rightIcon');
  const directIcon = component.get(`${kind}Icon`) ?? sideIcon;
  const directText = component.get(`${kind}Text`);
  if (kind === 'suffix' && textFieldClearSuffix(component, objectValue, directIcon)) {
    return { icon: 'clear', clear: true };
  }
  const icon = iconName(directIcon) ?? iconName(objectValue) ?? iconName(sideIcon);
  let text = textValue(directText);
  if (text === undefined) {
    if (isXconObject(objectValue)) text = textValue(objectValue.get('text') ?? objectValue.get('label'));
    else if (isXconObject(sideIcon)) text = textValue(sideIcon.get('text') ?? sideIcon.get('label'));
    else if (typeof objectValue === 'string') text = objectValue;
  }
  return { icon, text };
}

function textFieldClearSuffix(component: XconObject, objectValue: XconValue | undefined, directIcon: XconValue | undefined): boolean {
  if (isTruthy(component.get('clearButton'))) return true;
  if (typeof objectValue === 'string' && objectValue.trim().toLowerCase() === 'clear') return true;
  if (typeof directIcon === 'string' && directIcon.trim().toLowerCase() === 'clear') return true;
  if (!isXconObject(objectValue)) return false;
  return isTruthy(objectValue.get('clear')) || String(objectValue.get('icon') ?? '').trim().toLowerCase() === 'clear';
}

function renderTextFieldSuffix(icon: string | undefined, iconHtml: string, text: string | undefined, clear = false): string {
  if (iconHtml) {
    const key = String(icon ?? '').toLowerCase();
    if (clear || key === 'clear' || key === 'x') {
      return tag(
        'button',
        {
          type: 'button',
          class: 'xa-al-tf-suffix xa-al-tf-suffix-btn xa-al-tf-suffix--clear',
          style: textFieldSuffixStyle('var(--ink-3)', true),
          'aria-label': 'Clear text',
          'data-xcon-tf-clear': '',
        },
        iconHtml,
      );
    }
    if (key === 'visibility' || key === 'eye') {
      return tag(
        'button',
        {
          type: 'button',
          class: 'xa-al-tf-suffix xa-al-tf-suffix-btn',
          style: textFieldSuffixStyle('var(--ink-3)', true),
          'aria-label': 'Toggle password',
          'data-xcon-tf-toggle': 'visibility',
        },
        iconHtml,
      );
    }
    return tag(
      'span',
      { class: `xa-al-tf-suffix${key === 'check' ? ' xa-al-tf-suffix--success' : ''}`, style: textFieldSuffixStyle(key === 'check' ? 'var(--green)' : 'var(--ink-3)', false) },
      iconHtml,
    );
  }
  if (text !== undefined) return tag('span', { class: 'xa-al-tf-suffix xa-al-tf-suffix-text', style: `${textFieldSuffixStyle('var(--ink-3)', false)};font-size:11px;font-weight:500` }, escapeHtml(text));
  return '';
}

function textFieldInputType(component: XconObject, forcedType: string | undefined): string {
  if (forcedType) return forcedType;
  const inputType = textValue(component.get('inputType'));
  if (inputType) return inputType;
  if (isTruthy(component.get('secureTextEntry'))) return 'password';
  const mode = String(component.get('mode') ?? '').toLowerCase();
  if (mode === 'password' || mode === 'email' || mode === 'number' || mode === 'search') return mode;
  return 'text';
}

function textFieldValue(component: XconObject): string {
  return (
    nonEmptyTextFieldValue(component.get('value')) ??
    nonEmptyTextFieldValue(component.get('text')) ??
    nonEmptyTextFieldValue(component.get('bind')) ??
    nonEmptyTextFieldValue(component.get('binding')) ??
    ''
  );
}

function nonEmptyTextFieldValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value);
  return text === '' ? undefined : text;
}

function textFieldStateClass(component: XconObject): string {
  const state = String(component.get('fieldState') ?? component.get('state') ?? '').trim().toLowerCase();
  if (state === 'success' || state === 'valid') return 'xa-al-tf--success';
  if (state === 'error' || state === 'invalid') return 'xa-al-tf--error';
  return '';
}

function isTextFieldDisabled(component: XconObject): boolean {
  return isFalseLike(component.get('enabled')) || isTruthy(component.get('disabled'));
}

function nativeInputRootAttrs(component: XconObject, attrs: Record<string, string | undefined>, extraClass = ''): Record<string, string | undefined> {
  const strippedStyle = stripNativeInputRootChrome(attrs.style);
  const stretchFlowWidth = shouldStretchNativeInputRoot(strippedStyle, component);
  const rootStyle = stretchFlowWidth ? stripDefaultNativeInputFlowWidth(strippedStyle) : strippedStyle;
  return attrsWithStyle(attrsWithClass({ ...attrs, style: rootStyle }, extraClass), nativeInputRootStyle(component, { stretchFlowWidth }));
}

function nativeInputRootStyle(component: XconObject, options: { stretchFlowWidth?: boolean } = {}): string {
  const declarations: string[] = [];
  if (options.stretchFlowWidth) {
    declarations.push('align-self:stretch', 'width:100%', 'max-width:100%', 'min-width:0', 'box-sizing:border-box');
  }
  const pos = rectParts(component.get('pos'));
  if (pos) {
    appendCss(declarations, 'height', cssSize(pos[3]));
    appendCss(declarations, 'min-height', cssSize(pos[3]));
  }

  appendCss(declarations, '--xa-tf-radius', borderRadius(component));
  appendTextFieldBorderVars(declarations, component);
  appendCss(declarations, '--xa-tf-bg', cssColor(component.get('backgroundColor') ?? component.get('bgColor')));
  return declarations.join(';');
}

function shouldStretchNativeInputRoot(style: string | undefined, component: XconObject): boolean {
  if (isTextFieldOtp(component)) return false;
  return Boolean(style && /(?:^|;)width\s*:\s*auto\s*(?:;|$)/i.test(style));
}

function stripDefaultNativeInputFlowWidth(style: string | undefined): string | undefined {
  if (!style) return undefined;
  const declarations = style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => !/^width\s*:\s*auto$/i.test(declaration));
  return declarations.join(';') || undefined;
}

function isTextFieldOtp(component: XconObject): boolean {
  const index = component.get('otpIndex');
  return index !== undefined && index !== null && String(index).trim() !== '';
}

function appendTextFieldBorderVars(declarations: string[], component: XconObject): void {
  const border = component.get('border');
  if (isXconObject(border)) {
    if (isFalseLike(border.get('visible'))) {
      declarations.push('--xa-tf-border-width:0px', '--xa-tf-border-color:transparent');
      return;
    }
    appendCss(declarations, '--xa-tf-border-width', cssSize(border.get('width') ?? component.get('borderWidth')));
    appendCss(declarations, '--xa-tf-border-style', border.get('style') ?? component.get('borderStyle'));
    appendCss(declarations, '--xa-tf-border-color', cssColor(border.get('color') ?? component.get('borderColor')));
    return;
  }
  if (isFalseLike(border)) {
    declarations.push('--xa-tf-border-width:0px', '--xa-tf-border-color:transparent');
    return;
  }
  appendCss(declarations, '--xa-tf-border-width', cssSize(component.get('borderWidth')));
  appendCss(declarations, '--xa-tf-border-style', component.get('borderStyle'));
  appendCss(declarations, '--xa-tf-border-color', cssColor(component.get('borderColor')));
}

function stripNativeInputRootChrome(style: string | undefined): string | undefined {
  if (!style) return undefined;
  const blocked = new Set([
    'background',
    'background-color',
    'border',
    'border-width',
    'border-style',
    'border-color',
    'border-radius',
    'box-shadow',
    'color',
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'line-height',
    'object-fit',
    'object-position',
    'text-align',
    'text-decoration',
    'vertical-align',
    'white-space',
  ]);
  const declarations = style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator <= 0) return false;
      return !blocked.has(declaration.slice(0, separator).trim().toLowerCase());
    });
  return declarations.join(';') || undefined;
}

function panelStackClass(component: XconObject): string {
  const classes = ['xa-al-panel__stack'];
  if (isPanelStackLayers(component)) classes.push('xa-al-panel__stack--layers');
  const al = component.get('al');
  if (isXconObject(al)) {
    const stackClass = al.get('stackClass');
    if (typeof stackClass === 'string') classes.push(...stackClass.split(/\s+/).filter(Boolean));
  }
  return [...new Set(classes)].join(' ');
}

function renderPanelLayer(child: XconObject, index: number, body: string): string {
  const pe = normalizeLayerPointerEvents(layerValue(child, 'layerPointerEvents') ?? child.get('alLayerPointerEvents'));
  const className = `xa-al-panel__layer${pe.capture ? ' xa-al-panel__layer--pe-capture' : ''}`;
  return tag('div', { class: className, style: panelLayerStyle(child, index, pe.pointerEvents) }, body);
}

function panelLayerStyle(child: XconObject, index: number, pointerEvents: string): string {
  const zRaw = layerValue(child, 'layerZ') ?? child.get('alLayerZ');
  const zNumber = Number.parseInt(String(zRaw ?? ''), 10);
  const zIndex = Number.isFinite(zNumber) ? zNumber : 10 + index * 10;
  const flexDirection = safeCssValue(layerValue(child, 'layerFlexDirection') ?? child.get('alLayerFlexDirection')) ?? 'row';
  const alignItems = safeCssValue(layerValue(child, 'layerAlignItems') ?? child.get('alLayerAlignItems')) ?? 'stretch';
  const justifyContent = safeCssValue(layerValue(child, 'layerJustifyContent') ?? child.get('alLayerJustifyContent')) ?? 'stretch';
  const padding = cssSize(layerValue(child, 'layerPadding') ?? child.get('alLayerPadding')) ?? '0';
  return [
    'grid-area:1/1/-1/-1',
    'align-self:stretch',
    'place-self:stretch',
    'width:100%',
    'height:100%',
    'min-width:0',
    'min-height:100%',
    'display:flex',
    `flex-direction:${flexDirection}`,
    `align-items:${alignItems}`,
    `justify-content:${justifyContent}`,
    `z-index:${zIndex}`,
    `padding:${padding}`,
    `pointer-events:${pointerEvents}`,
    'box-sizing:border-box',
  ].join(';');
}

function layerValue(component: XconObject, key: string): XconValue | undefined {
  const al = component.get('al');
  if (!isXconObject(al)) return undefined;
  return al.get(key);
}

function normalizeLayerPointerEvents(value: unknown): { pointerEvents: string; capture: boolean } {
  const text = String(value ?? '').trim().toLowerCase();
  if (['auto', 'all', 'fill', 'capture', 'block'].includes(text)) return { pointerEvents: 'auto', capture: true };
  return { pointerEvents: 'none', capture: false };
}

function isPanelStackLayers(component: XconObject): boolean {
  const al = component.get('al');
  const mode = String((isXconObject(al) ? al.get('stackMode') : undefined) ?? component.get('stackMode') ?? '').trim().toLowerCase();
  return mode === 'layers' || mode === 'layer' || mode === 'overlap';
}

function isPanelFixedHeight(component: XconObject): boolean {
  const al = component.get('al');
  return isXconObject(al) && (isTruthy(al.get('fixedHeight')) || al.get('autoHeight') === false || al.get('autoHeight') === 'false');
}

function isPanelAutoHeight(component: XconObject): boolean {
  const al = component.get('al');
  return isXconObject(al) && isTruthy(al.get('autoHeight')) && !isPanelFixedHeight(component);
}

function hidesPanelScrollbar(component: XconObject): boolean {
  const scroll = String(component.get('scroll') ?? 'none').trim().toLowerCase();
  if (scroll === 'none' || scroll === '') return false;
  return !isTruthy(component.get('scrollbarVisible'));
}

function hidesFormScrollbar(component: XconObject): boolean {
  const scroll = String(component.get('scroll') ?? 'none').trim().toLowerCase();
  return scroll !== 'none' && scroll !== '';
}

function formBodyStyle(component: XconObject): string {
  const declarations = [
    'display:flex',
    'flex-direction:column',
    'width:100%',
    'min-width:0',
    'box-sizing:border-box',
    'flex:1 1 auto',
    'min-height:0',
  ];
  const al = component.get('al');
  if (isXconObject(al)) appendCss(declarations, 'max-height', al.get('maxHeight') ?? component.get('maxHeight'));
  else appendCss(declarations, 'max-height', component.get('maxHeight'));
  const scroll = String(component.get('scroll') ?? 'none').trim().toLowerCase();
  if (scroll === 'vertical') declarations.push('overflow-y:auto', 'overflow-x:hidden');
  else if (scroll === 'horizontal') declarations.push('overflow-x:auto', 'overflow-y:hidden');
  else if (scroll === 'both' || scroll === 'auto') declarations.push('overflow:auto');
  else declarations.push('overflow:hidden');
  return declarations.join(';');
}

function formStackStyle(component: XconObject): string {
  const al = component.get('al');
  const direction = normalizeDirection(isXconObject(al) ? al.get('direction') ?? component.get('direction') ?? 'column' : component.get('direction') ?? 'column');
  const wrap = isXconObject(al) ? al.get('wrap') ?? component.get('wrap') ?? 'nowrap' : component.get('wrap') ?? 'nowrap';
  const declarations = [
    'display:flex',
    `flex-direction:${direction}`,
    `flex-wrap:${attr(wrap)}`,
    `align-items:${attr(isXconObject(al) ? al.get('alignItems') ?? component.get('alignItems') ?? 'stretch' : component.get('alignItems') ?? 'stretch')}`,
    `justify-content:${attr(isXconObject(al) ? al.get('justifyContent') ?? component.get('justifyContent') ?? 'flex-start' : component.get('justifyContent') ?? 'flex-start')}`,
    'width:100%',
    'min-width:0',
    'box-sizing:border-box',
    'flex:1 1 auto',
    'min-height:0',
  ];
  if (isXconObject(al)) {
    appendCss(declarations, 'gap', cssSize(al.get('gap') ?? component.get('gap')));
    appendSpacing(declarations, 'padding', al.get('padding') ?? component.get('padding'));
  } else {
    appendCss(declarations, 'gap', cssSize(component.get('gap')));
    appendSpacing(declarations, 'padding', component.get('padding'));
  }
  return declarations.join(';');
}

function panelBodyStyle(component: XconObject): string {
  const scroll = String(component.get('scroll') ?? 'none').trim().toLowerCase();
  const al = component.get('al');
  const declarations = [
    'display:flex',
    'flex-direction:column',
    'width:100%',
    'min-width:0',
    'box-sizing:border-box',
  ];
  if (scroll !== 'none' && scroll !== '') declarations.push('flex:1 1 auto', 'min-height:0');
  else if (isPanelAutoHeight(component)) declarations.push('flex:0 0 auto', 'min-height:auto');
  else declarations.push('flex:1 1 auto', 'min-height:0');
  const maxHeight = isXconObject(al) ? al.get('maxHeight') : component.get('maxHeight');
  appendCss(declarations, 'max-height', maxHeight);
  if (scroll === 'vertical') declarations.push('overflow-x:hidden', 'overflow-y:auto');
  else if (scroll === 'horizontal') declarations.push('overflow-x:auto', 'overflow-y:hidden');
  else if (scroll === 'both' || scroll === 'auto') declarations.push('overflow:auto');
  else declarations.push('overflow:hidden');
  return declarations.join(';');
}

function panelStackStyle(component: XconObject): string {
  const al = component.get('al');
  if (!isXconObject(al)) {
    return [
      'position:relative',
      'display:block',
      'width:100%',
      'height:100%',
      'min-height:100%',
      'box-sizing:border-box',
      'padding:0',
    ].join(';');
  }
  if (isPanelStackLayers(component)) {
    const declarations = [
      'display:grid',
      'grid-template-columns:1fr',
      'grid-template-rows:1fr',
      'align-items:stretch',
      'justify-items:stretch',
      'width:100%',
      'min-width:0',
      'box-sizing:border-box',
      `min-height:${cssSize(isXconObject(al) ? al.get('minHeight') ?? component.get('minHeight') ?? rectParts(component.get('pos'))?.[3] : component.get('minHeight')) ?? 'min(72vw, 420px)'}`,
    ];
    if (isPanelFixedHeight(component)) declarations.push('height:100%');
    declarations.push('flex:1 1 auto');
    appendSpacing(declarations, 'padding', isXconObject(al) ? al.get('padding') ?? component.get('padding') : component.get('padding'));
    return declarations.join(';');
  }
  const direction = normalizeDirection(isXconObject(al) ? al.get('direction') ?? component.get('direction') ?? 'column' : component.get('direction') ?? 'column');
  const wrap = isXconObject(al) ? al.get('wrap') ?? component.get('wrap') ?? 'nowrap' : component.get('wrap') ?? 'nowrap';
  const declarations = [
    'display:flex',
    `flex-direction:${direction}`,
    `flex-wrap:${attr(wrap)}`,
    `align-items:${attr(isXconObject(al) ? al.get('alignItems') ?? component.get('alignItems') ?? 'stretch' : component.get('alignItems') ?? 'stretch')}`,
    `justify-content:${attr(isXconObject(al) ? al.get('justifyContent') ?? component.get('justifyContent') ?? 'flex-start' : component.get('justifyContent') ?? 'flex-start')}`,
    'width:100%',
    'min-width:0',
    'box-sizing:border-box',
  ];
  const scroll = String(component.get('scroll') ?? 'none').trim().toLowerCase();
  if (scroll === 'vertical') declarations.push('flex:0 0 auto', 'min-height:min-content');
  else if (scroll === 'horizontal') declarations.push('flex:0 0 auto', 'min-height:0', 'min-width:min-content');
  else if (scroll === 'both' || scroll === 'auto') declarations.push('flex:0 0 auto', 'min-height:min-content', 'min-width:min-content');
  else if (isPanelAutoHeight(component)) declarations.push('flex:0 0 auto', 'min-height:min-content');
  else declarations.push('flex:1 1 auto', 'min-height:0');
  if (isXconObject(al)) {
    appendCss(declarations, 'gap', cssSize(al.get('gap') ?? component.get('gap')));
    appendSpacing(declarations, 'padding', al.get('padding') ?? component.get('padding'));
  } else {
    appendCss(declarations, 'gap', cssSize(component.get('gap')));
    appendSpacing(declarations, 'padding', component.get('padding'));
  }
  return declarations.join(';');
}

function labelTextStyle(component: XconObject): string {
  const declarations = [
    'display:flex',
    `align-items:${verticalAlign(component)}`,
    `justify-content:${labelJustifyFromTextAlign(component.get('textAlign'))}`,
    'flex-wrap:wrap',
    'gap:5px',
    'width:100%',
    'min-width:0',
    'padding:0',
    'margin:0',
  ];
  appendCss(declarations, 'line-height', component.get('lineHeight') ?? fontValue(component, 'lineHeight') ?? '1.4');
  return declarations.join(';');
}

function labelContainerJustify(component: XconObject): string {
  if (
    component.contains('textVerticalAlign') ||
    component.contains('verticalAlign') ||
    component.contains('textVAlign') ||
    component.contains('valign')
  ) {
    return verticalAlign(component);
  }
  return 'flex-start';
}

function labelJustifyFromTextAlign(value: unknown): string {
  return justifyFromTextAlign(value, 'left');
}

function buttonStyle(component: XconObject, options: { iconOnly?: boolean; stackColumn?: boolean } = {}): string {
  const link = buttonAppearance(component) === 'link';
  const fontSize = Number(fontValue(component, 'size') ?? 14) || 14;
  const pos = rectParts(component.get('pos'));
  const rawBackground = component.get('backgroundColor') ?? component.get('bgColor');
  const backgroundText = String(rawBackground ?? '').trim();
  const backgroundKey = backgroundText.toLowerCase().replace(/\s/g, '');
  const transparentBackground = link || !backgroundText || backgroundKey.includes('transparent');
  const lightSurfaceBackground =
    backgroundKey === '#fff' ||
    backgroundKey === '#ffffff' ||
    backgroundKey === 'white' ||
    /^rgba?\(\s*255\s*,\s*255\s*,\s*255\b/.test(backgroundKey) ||
    /var\(\s*--surface/.test(backgroundText);
  const ghostish = link || transparentBackground || lightSurfaceBackground;
  const radius = borderRadius(component) ?? 'var(--r-sm,6px)';
  const border = link ? 'none' : borderCss(component);
  const background = link ? 'transparent' : (cssColor(rawBackground) ?? '#ffffff');
  const color = cssColor(component.get('color')) ?? (link ? 'var(--accent,#C4622D)' : ghostish ? 'var(--ink-2,#6B5F4E)' : '#ffffff');
  const padding = buttonPadding(fontSize, component.get('buttonPadding') ?? component.get('padding'), link, Boolean(options.iconOnly), Boolean(options.stackColumn));
  const minHeight = buttonMinHeight(fontSize, pos?.[3], link, Boolean(options.iconOnly));
  const shadow = buttonBoxShadow(backgroundText, ghostish, link, buttonHasExplicitBorder(component));
  return [
    'display:inline-flex!important',
    `align-items:${options.stackColumn ? buttonStackAlignItems(component.get('textAlign')) : 'center'}`,
    `justify-content:${options.stackColumn ? 'center' : justifyFromTextAlign(component.get('textAlign'))}`,
    `flex-direction:${options.stackColumn ? 'column' : 'row'}`,
    `gap:${buttonLayoutGap(component, Boolean(options.stackColumn))}`,
    'margin:0',
    'box-sizing:border-box',
    `border:${border}`,
    `border-radius:${radius}`,
    `background:${background}`,
    `color:${color}`,
    `padding:${padding}`,
    `min-height:${minHeight}`,
    'line-height:1.2',
    'white-space:nowrap',
    `cursor:${isButtonDisabled(component) ? 'not-allowed' : 'pointer'}`,
    'user-select:none',
    `box-shadow:${shadow}`,
  ].join(';');
}

function isButtonBlock(component: XconObject): boolean {
  if (isTruthy(component.get('block') ?? component.get('fullWidth'))) return true;
  const al = component.get('al');
  return isXconObject(al) && String(al.get('width') ?? '').trim() === '100%';
}

function buttonLayoutGap(component: XconObject, stackColumn: boolean): string {
  const explicit = component.get('alButtonLayoutGap') ?? component.get('buttonLayoutGap');
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') return String(explicit).trim();
  return stackColumn ? '4px' : '8px';
}

function buttonStackAlignItems(value: unknown): string {
  const textAlign = String(value ?? 'center').trim().toLowerCase();
  if (textAlign === 'right' || textAlign === 'end') return 'flex-end';
  if (textAlign === 'left' || textAlign === 'start') return 'flex-start';
  return 'center';
}

function buttonPadding(fontSize: number, explicit: unknown, link: boolean, iconOnly: boolean, stackColumn: boolean): string {
  if (iconOnly) return '0';
  if (link) return '4px 8px';
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') return String(explicit).trim();
  if (stackColumn) return '8px 4px';
  if (fontSize <= 11) return '5px 12px';
  if (fontSize <= 12) return '6px 14px';
  if (fontSize <= 13) return '8px 16px';
  if (fontSize <= 14) return '10px 18px';
  return '12px 22px';
}

function buttonMinHeight(fontSize: number, posHeight: number | undefined, link: boolean, iconOnly: boolean): string {
  if (link || iconOnly) return 'auto';
  if (posHeight && posHeight > 0) return `${posHeight}px`;
  if (fontSize <= 11) return '30px';
  if (fontSize <= 12) return '34px';
  if (fontSize <= 13) return '38px';
  if (fontSize <= 14) return '40px';
  return '46px';
}

function buttonBoxShadow(rawBackground: string, ghostish: boolean, link: boolean, hasExplicitBorder = false): string {
  if (link) return 'none';
  if (ghostish && !hasExplicitBorder) return 'none';
  if (ghostish) return 'var(--shadow-sm, 0 1px 4px rgba(60,45,25,0.08)), 0 1px 2px rgba(60,45,25,0.05)';
  if (rawBackground.includes('--accent')) return '0 2px 10px rgba(var(--accent-rgb), 0.34), 0 1px 3px rgba(60,45,25,0.08)';
  if (rawBackground.includes('--green')) return '0 2px 10px rgba(45, 125, 79, 0.32), 0 1px 3px rgba(60,45,25,0.06)';
  if (rawBackground.includes('--red')) return '0 2px 10px rgba(192, 58, 43, 0.32), 0 1px 3px rgba(60,45,25,0.06)';
  if (rawBackground.includes('--blue')) return '0 2px 10px rgba(43, 95, 160, 0.28), 0 1px 3px rgba(60,45,25,0.06)';
  if (rawBackground.includes('28,23,16') || rawBackground.includes('55,65,81')) return '0 2px 10px rgba(28, 23, 16, 0.22), 0 1px 3px rgba(60,45,25,0.08)';
  return '0 2px 10px rgba(60,45,25,0.14), var(--shadow-sm, 0 1px 4px rgba(60,45,25,0.08))';
}

function buttonHasExplicitBorder(component: XconObject): boolean {
  const border = component.get('border');
  if (isXconObject(border)) return !isFalseLike(border.get('visible'));
  return border === true || border === 'true' || border === 1 || border === '1';
}

function isButtonDisabled(component: XconObject): boolean {
  return isFalseLike(component.get('enabled')) || isTruthy(component.get('disabled'));
}

function buttonAppearance(component: XconObject): string {
  return String(component.get('appearance') ?? component.get('buttonAppearance') ?? '').trim().toLowerCase();
}

function buttonAppearanceClass(component: XconObject): string {
  return buttonAppearance(component) === 'link' ? 'xa-al-btn--link' : '';
}

function buttonSegmentClass(component: XconObject): string {
  const value = String(component.get('segment') ?? component.get('alButtonSegment') ?? '').trim().toLowerCase();
  if (value === 'first' || value === 'start') return 'xa-al-btn--seg-first';
  if (value === 'middle' || value === 'mid' || value === 'center') return 'xa-al-btn--seg-mid';
  if (value === 'last' || value === 'end') return 'xa-al-btn--seg-last';
  return '';
}

function buttonSplitClass(component: XconObject): string {
  const value = String(component.get('split') ?? component.get('alButtonSplit') ?? '').trim().toLowerCase();
  if (value === 'main') return 'xa-al-btn--split-main';
  if (value === 'caret' || value === 'toggle' || value === 'menu') return 'xa-al-btn--split-caret';
  return '';
}

function textFieldInputStyle(
  component: XconObject,
  chrome: {
    hasPrefix: boolean;
    hasPrefixText: boolean;
    hasSuffix: boolean;
    hasLeading: boolean;
    hasTrailing: boolean;
    hasFloatLabel: boolean;
    hasOtp: boolean;
  } = {
    hasPrefix: false,
    hasPrefixText: false,
    hasSuffix: false,
    hasLeading: false,
    hasTrailing: false,
    hasFloatLabel: false,
    hasOtp: false,
  },
): string {
  const disabled = isTextFieldDisabled(component);
  const borderRadius = chrome.hasFloatLabel
    ? '0'
    : chrome.hasLeading && chrome.hasTrailing
      ? '0'
      : chrome.hasLeading
        ? '0 var(--xa-tf-radius,var(--r-sm)) var(--xa-tf-radius,var(--r-sm)) 0'
        : chrome.hasTrailing
          ? 'var(--xa-tf-radius,var(--r-sm)) 0 0 var(--xa-tf-radius,var(--r-sm))'
          : 'var(--xa-tf-radius,var(--r-sm))';
  const padding = chrome.hasOtp
    ? '10px 0'
    : chrome.hasFloatLabel
      ? '10px 2px 6px'
      : chrome.hasPrefix || chrome.hasSuffix
        ? `10px ${chrome.hasSuffix ? '38px' : '14px'} 10px ${chrome.hasPrefix ? (chrome.hasPrefixText ? '34px' : '38px') : '14px'}`
        : '10px 14px';
  const declarations = [
    'width:100%',
    'height:100%',
    'box-sizing:border-box',
    'margin:0',
    'outline:none',
    'min-height:0',
    chrome.hasFloatLabel
      ? 'border:none'
      : 'border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2))',
    chrome.hasFloatLabel ? 'border-bottom:1.5px solid var(--xa-tf-border-color,var(--border2))' : '',
    `border-radius:${borderRadius}`,
    `background:${disabled ? 'var(--bg2)' : chrome.hasFloatLabel ? 'transparent' : 'var(--xa-tf-bg,var(--surface))'}`,
    'color:var(--ink)',
    'font-family:var(--font-body)',
    'font-size:14px',
    `padding:${padding}`,
    'transition:border-color .2s,box-shadow .2s,background .2s',
    `box-shadow:${chrome.hasFloatLabel ? 'none' : 'var(--shadow-sm)'}`,
  ].filter(Boolean);
  appendCss(declarations, 'font-family', fontValue(component, 'family'));
  appendCss(declarations, 'font-size', cssSize(fontValue(component, 'size')));
  appendCss(declarations, 'font-weight', fontValue(component, 'weight') ?? (isTruthy(fontValue(component, 'bold')) ? 'bold' : undefined));
  appendCss(declarations, 'font-style', fontValue(component, 'style') ?? (isTruthy(fontValue(component, 'italic')) ? 'italic' : undefined));
  appendCss(declarations, 'text-decoration', textDecoration(component));
  appendCss(declarations, 'text-align', component.get('textAlign'));
  appendCss(declarations, 'color', cssColor(component.get('color')));
  return declarations.join(';');
}

function textFieldAddonWrapStyle(): string {
  return 'position:relative;width:100%;height:100%;display:flex;align-items:center';
}

function textFieldPrefixStyle(): string {
  return 'position:absolute;left:12px;top:50%;transform:translateY(-50%);z-index:1;color:var(--ink-3);pointer-events:none;font-size:14px;display:inline-flex;align-items:center;justify-content:center';
}

function textFieldSuffixStyle(color: string, interactive: boolean): string {
  return [
    'position:absolute',
    'right:12px',
    'top:50%',
    'transform:translateY(-50%)',
    'z-index:1',
    `color:${color}`,
    `pointer-events:${interactive ? 'auto' : 'none'}`,
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    interactive ? 'cursor:pointer' : '',
    interactive ? 'background:none' : '',
    interactive ? 'border:none' : '',
    interactive ? 'padding:0' : '',
  ]
    .filter(Boolean)
    .join(';');
}

function textFieldBlockWrapStyle(): string {
  return 'display:flex;width:100%;height:100%;align-items:stretch';
}

function textFieldPreStyle(): string {
  return 'display:flex;align-items:center;padding:0 12px;background:var(--bg2);border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2));border-right:none;border-radius:var(--xa-tf-radius,var(--r-sm)) 0 0 var(--xa-tf-radius,var(--r-sm));font-size:13px;color:var(--ink-2);white-space:nowrap;font-family:"JetBrains Mono",monospace';
}

function textFieldPostStyle(): string {
  return 'display:flex;align-items:center;padding:0 12px;background:var(--accent);border:var(--xa-tf-border-width,1.5px) solid var(--accent);border-left:none;border-radius:0 var(--xa-tf-radius,var(--r-sm)) var(--xa-tf-radius,var(--r-sm)) 0;font-size:12px;font-weight:600;color:#fff;cursor:pointer;white-space:nowrap;font-family:var(--font-body)';
}

function textFieldFloatGroupStyle(): string {
  return 'position:relative;padding-top:8px;width:100%;height:100%;box-sizing:border-box';
}

function textFieldFloatLabelStyle(): string {
  return 'position:absolute;top:18px;left:2px;font-size:14px;color:var(--ink-3);pointer-events:none;font-family:var(--font-body)';
}

function textViewInputStyle(component: XconObject): string {
  const disabled = isTextFieldDisabled(component);
  const declarations = [
    'width:100%',
    'height:100%',
    'min-height:80px',
    'box-sizing:border-box',
    'margin:0',
    'outline:none',
    'resize:vertical',
    `overflow:${textViewOverflow(component)}`,
    'border:var(--xa-tf-border-width,1.5px) var(--xa-tf-border-style,solid) var(--xa-tf-border-color,var(--border2))',
    'border-radius:var(--xa-tf-radius,var(--r-sm))',
    `background:${disabled ? 'var(--bg2)' : 'var(--xa-tf-bg,var(--surface))'}`,
    'color:var(--ink)',
    'font-family:var(--font-body)',
    'font-size:14px',
    'padding:10px 14px',
    'line-height:1.5',
    `vertical-align:${textViewVerticalAlign(component)}`,
    'white-space:pre-wrap',
    'word-wrap:break-word',
    'transition:border-color .2s,box-shadow .2s,background .2s',
    'box-shadow:var(--shadow-sm)',
  ];
  appendCss(declarations, 'font-family', fontValue(component, 'family'));
  appendCss(declarations, 'font-size', cssSize(fontValue(component, 'size')));
  appendCss(declarations, 'font-weight', fontValue(component, 'weight') ?? (isTruthy(fontValue(component, 'bold')) ? 'bold' : undefined));
  appendCss(declarations, 'font-style', fontValue(component, 'style') ?? (isTruthy(fontValue(component, 'italic')) ? 'italic' : undefined));
  appendCss(declarations, 'text-decoration', textDecoration(component));
  appendCss(declarations, 'text-align', component.get('textAlign'));
  appendCss(declarations, 'color', cssColor(component.get('color')));
  return declarations.join(';');
}

function textViewOverflow(component: XconObject): string {
  const scroll = String(component.get('scroll') ?? 'vertical').trim().toLowerCase();
  return scroll === 'vertical' || scroll === 'horizontal' || scroll === 'both' ? 'auto' : 'hidden';
}

function textViewVerticalAlign(component: XconObject): string {
  const value = String(component.get('textVerticalAlign') ?? component.get('textVAlign') ?? 'top').trim().toLowerCase();
  if (value === 'middle' || value === 'center') return 'middle';
  if (value === 'bottom' || value === 'end') return 'bottom';
  return 'top';
}

function textFieldIcon(name: string): string {
  const paths: Record<string, string> = {
    email: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    visibility: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    clear: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  };
  const body = paths[name.toLowerCase()];
  if (!body) return '';
  const extra = name.toLowerCase() === 'check' ? ' xa-al-tf-ico--success' : '';
  return `<svg class="xa-al-tf-ico${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function iconName(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (!isXconObject(value)) return undefined;
  const name = value.get('name') ?? value.get('icon') ?? value.get('value');
  return typeof name === 'string' && name.trim() ? name.trim() : undefined;
}

function isButtonStackColumn(component: XconObject): boolean {
  const value = String(component.get('layout') ?? component.get('alButtonLayout') ?? '').toLowerCase();
  return value === 'column' || value === 'col' || value === 'vertical';
}

function iconSvg(
  name: string,
  fallback: 'text' | 'none' = 'text',
  options: { size?: number | string; strokeWidth?: number | string; className?: string | null } = {},
): string {
  const key = name.toLowerCase();
  const paths: Record<string, string> = {
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
    'file-download': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 14 12 18 16 14"/><line x1="12" y1="18" x2="12" y2="10"/>',
    cloud_download: '<path d="M16 16l-4 4-4-4"/><line x1="12" y1="20" x2="12" y2="10"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
    'cloud-download': '<path d="M16 16l-4 4-4-4"/><line x1="12" y1="20" x2="12" y2="10"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
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
    'arrow-back': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    arrow_down: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    chevron_down: '<polyline points="6 9 12 15 18 9"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  };
  const body = paths[key];
  const size = options.size ?? 18;
  const strokeWidth = options.strokeWidth ?? 2;
  const className = Object.hasOwn(options, 'className') ? options.className : 'xa-al-btn__icon';
  if (!body) return fallback === 'none' ? '' : tag('span', { class: className || undefined, 'aria-hidden': 'true' }, escapeHtml(name));
  const classAttr = className ? ` class="${escapeAttr(className)}"` : '';
  return `<svg${classAttr} width="${escapeAttr(String(size))}" height="${escapeAttr(String(size))}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${escapeAttr(String(strokeWidth))}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function checkSvg(): string {
  return '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>';
}

function renderOptional(tagName: string, value: unknown, className?: string): string {
  if (value === undefined || value === null || value === '') return '';
  return tag(tagName, className ? { class: className } : {}, escapeHtml(String(value)));
}

function renderGridShowcase(component: XconObject, attrs: Record<string, string | undefined>): string {
  const id = `gridCanvas_${showcaseSuffixFromAttrs(attrs)}`;
  const controls = ['2', '3', '4', 'auto']
    .map((cols, index) => tag('button', { type: 'button', class: `grid-pill${index === 0 ? ' active' : ''}`, 'data-cols': cols }, cols === 'auto' ? 'Auto' : `${cols} cols`))
    .join('');
  const cells = Array.from({ length: 6 }, (_, index) => tag('div', { class: 'grid-cell' }, String(index + 1).padStart(2, '0'))).join('');
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-grid-host xa-ext-grid-host--showcase'),
    tag('div', { class: 'grid-demo', 'data-xcon-grid-showcase': '' }, tag('div', { class: 'grid-demo__controls' }, controls) + tag('div', { class: 'grid-canvas', id, style: 'grid-template-columns:repeat(2,1fr)' }, cells)),
  );
}

function renderFlexBoxShowcase(component: XconObject, attrs: Record<string, string | undefined>): string {
  const suffix = showcaseSuffixFromAttrs(attrs);
  const justifyId = `flexJustify_${suffix}`;
  const alignId = `flexAlign_${suffix}`;
  const canvasId = `flexCanvas_${suffix}`;
  const option = (value: string, selected?: boolean): string => tag('option', { value, selected: selected ? '' : undefined }, value);
  const controls =
    tag(
      'div',
      { class: 'flex-ctrl-group' },
      tag('label', { for: justifyId }, 'justify-content') +
        tag('select', { id: justifyId, 'data-xcon-flex-justify': '' }, option('flex-start') + option('center') + option('flex-end') + option('space-between') + option('space-around')),
    ) +
    tag(
      'div',
      { class: 'flex-ctrl-group' },
      tag('label', { for: alignId }, 'align-items') +
        tag('select', { id: alignId, 'data-xcon-flex-align': '' }, option('flex-start') + option('center', true) + option('flex-end') + option('stretch')),
    );
  const boxes = ['Box A', 'Box B longer', 'C', 'Box D', 'E'].map((label) => tag('div', { class: 'flex-box' }, escapeHtml(label))).join('');
  return tag(
    'div',
    attrsWithClass({ ...attrs, 'data-xcon-flex-showcase': '' }, 'xa-ext-flexbox-host xa-ext-flexbox-host--showcase'),
    tag('div', { class: 'flex-controls' }, controls) + tag('div', { class: 'flex-canvas', id: canvasId, 'data-xcon-flex-canvas': '' }, boxes),
  );
}

function renderStackShowcase(component: XconObject, attrs: Record<string, string | undefined>): string {
  const vertical = ['Item 1', 'Item 2', 'Item 3', 'Item 4'].map((label) => tag('div', { class: 'stack-item' }, label)).join('');
  const horizontal = ['A', 'B', 'C', 'D'].map((label) => tag('div', { class: 'stack-item' }, label)).join('');
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-stack-host xa-ext-stack-host--showcase'),
    tag(
      'div',
      { class: 'stack-demo' },
      tag('div', { style: 'flex:1' }, tag('div', { class: 'stack-label' }, 'Vertical Stack') + tag('div', { class: 'stack-v' }, vertical)) +
        tag('div', { style: 'flex:1' }, tag('div', { class: 'stack-label' }, 'Horizontal Stack') + tag('div', { class: 'stack-h' }, horizontal)),
    ),
  );
}

function renderSpacerShowcase(component: XconObject, attrs: Record<string, string | undefined>): string {
  const block = (label: string): string => tag('div', { class: 'spacer-box' }, label);
  const visual = (size: number): string => tag('div', { class: 'spacer-visual', style: `height:${size}px` }, tag('span', {}, `${size}px`));
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-spacer-host xa-ext-spacer-host--showcase'),
    tag('div', { class: 'spacer-item' }, block('Block A') + visual(8) + block('Block B') + visual(16) + block('Block C') + visual(32) + block('Block D')),
  );
}

function hasDataDrivenLayoutItems(component: XconObject): boolean {
  const items = component.get('items');
  return Array.isArray(items) && items.length > 0 && items.every((item) => !isXconObject(item) || !item.get('type'));
}

function layoutItemText(item: XconValue, index: number): string {
  if (!isXconObject(item)) return String(item ?? `Item ${index + 1}`);
  return String(item.get('content') ?? item.get('text') ?? item.get('label') ?? `Item ${index + 1}`);
}

function renderGridItemsSingle(component: XconObject, attrs: Record<string, string | undefined>): string {
  const items = component.get('items');
  const columns = Math.max(1, Number(component.get('columns') ?? 3) || 3);
  const gap = cssSize(component.get('gap')) ?? '16px';
  const responsiveStyle = isFalseLike(component.get('responsive'))
    ? ''
    : tag(
        'style',
        {},
        '@media (max-width: 768px) { .grid-container { grid-template-columns: repeat(2, 1fr) !important; } }' +
          '@media (max-width: 480px) { .grid-container { grid-template-columns: 1fr !important; } }',
      );
  const itemHtml = (Array.isArray(items) ? items : [])
    .map((item, index) => tag('div', { class: 'grid-item', style: 'padding:8px;border:1px solid #e9ecef;border-radius:4px;background-color:white;' }, escapeHtml(layoutItemText(item, index))))
    .join('');
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-grid-host xa-ext-grid-host--single'),
    tag('div', { class: 'grid-container', style: `display:grid;grid-template-columns:repeat(${columns},1fr);gap:${gap};` }, itemHtml) + responsiveStyle,
  );
}

function renderFlexBoxItemsSingle(component: XconObject, attrs: Record<string, string | undefined>): string {
  const items = component.get('items');
  const direction = normalizeDirection(component.get('direction') ?? 'row');
  const justify = String(component.get('justify') ?? 'flex-start');
  const align = String(component.get('align') ?? 'stretch');
  const wrap = String(component.get('wrap') ?? 'nowrap');
  const gap = cssSize(component.get('gap')) ?? '8px';
  const itemHtml = (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const flex = isXconObject(item) ? String(item.get('flex') ?? '0 1 auto') : '0 1 auto';
      const order = isXconObject(item) ? String(item.get('order') ?? 0) : '0';
      const alignSelf = isXconObject(item) ? String(item.get('alignSelf') ?? 'auto') : 'auto';
      const style = `flex:${flex};order:${order};align-self:${alignSelf};padding:8px;border:1px solid #e9ecef;border-radius:4px;background-color:white;`;
      return tag('div', { class: 'flex-item', style }, escapeHtml(layoutItemText(item, index)));
    })
    .join('');
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-flexbox-host xa-ext-flexbox-host--single'),
    tag('div', { class: 'flex-container', style: `display:flex;flex-direction:${direction};justify-content:${justify};align-items:${align};flex-wrap:${wrap};gap:${gap};` }, itemHtml),
  );
}

function renderStackItemsSingle(component: XconObject, attrs: Record<string, string | undefined>): string {
  const items = component.get('items');
  const direction = normalizeDirection(component.get('direction') ?? 'column');
  const alignRaw = String(component.get('align') ?? 'stretch');
  const align = alignRaw === 'start' ? 'flex-start' : alignRaw === 'end' ? 'flex-end' : alignRaw;
  const gap = cssSize(component.get('spacing') ?? component.get('gap')) ?? '8px';
  const itemHtml = (Array.isArray(items) ? items : [])
    .map((item, index) => tag('div', { class: 'stack-item', style: 'padding:8px;border:1px solid #e9ecef;border-radius:4px;background-color:white;' }, escapeHtml(layoutItemText(item, index))))
    .join('');
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-stack-host xa-ext-stack-host--single'),
    tag('div', { class: 'stack-container', style: `display:flex;flex-direction:${direction};align-items:${align};gap:${gap};` }, itemHtml),
  );
}

function renderSpacerSingle(component: XconObject, attrs: Record<string, string | undefined>): string {
  const size = cssSize(component.get('size') ?? component.get('height') ?? 16) ?? '16px';
  const direction = String(component.get('direction') ?? 'vertical');
  const style = direction === 'horizontal' || direction === 'row' ? `width:${size};height:100%;` : `height:${size};width:100%;`;
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-spacer-host xa-ext-spacer-host--single'),
    tag('div', { class: 'spacer', style }, ''),
  );
}

function renderSelect(component: XconObject, attrs: Record<string, string | undefined>): string {
  const showcase = isShowcaseVariant(component);
  const multiple = isTruthy(component.get('multiple'));
  const selected = selectSelectedValues(component.get('value'), multiple);
  const optionRows = selectRows(component.get('options'), { slugStrings: showcase });
  const placeholder = textValue(component.get('placeholder')) ?? '선택하세요';
  const selectId = domIdFromAttrs(attrs);
  const disabled = isFalseLike(component.get('enabled'));
  const required = isTruthy(component.get('required'));

  if (showcase) {
    const nativePlaceholder = textValue(component.get('nativePlaceholder')) ?? 'Choose framework…';
    const hasNative = selected.length > 0;
    const nativeBody =
      tag('option', { value: '', selected: hasNative ? undefined : '', disabled: '' }, escapeHtml(nativePlaceholder)) +
      optionRows
        .map((option) =>
          tag(
            'option',
            {
              value: attr(option.value),
              selected: selected.includes(option.value) ? '' : undefined,
              disabled: option.disabled ? '' : undefined,
            },
            escapeHtml(option.label),
          ),
        )
        .join('');
    const select = tag(
      'div',
      { class: 'f-select-wrap', style: 'margin-bottom:14px' },
      tag(
        'select',
        {
          class: 'f-select',
          id: `${selectId}_native`,
          required: required ? '' : undefined,
          disabled: disabled ? '' : undefined,
        },
        nativeBody,
      ) + tag('span', { class: 'f-select-arrow', 'aria-hidden': 'true' }, iconSvg('chevron_down', 'none')),
    );
    const customRows = selectRows(component.get('customOptions'), { slugStrings: true });
    const finalCustomRows = customRows.length > 0 ? customRows : defaultShowcaseCustomSelectRows();
    const customValue = String(component.get('customValue') ?? '');
    const customDisplay = finalCustomRows.find((row) => row.value === customValue)?.label ?? String(component.get('customPlaceholder') ?? component.get('placeholder') ?? 'Select a role…');
    const customRootId = `${selectId}_customRoot`;
    const customTriggerId = `${selectId}_csTrigger`;
    const customValueId = `${selectId}_csValue`;
    const customDropdownId = `${selectId}_csDropdown`;
    const custom = tag(
      'div',
      { class: 'custom-select', id: customRootId, 'data-xcon-custom-select': 'true' },
      tag(
        'div',
        { class: 'custom-select__trigger', id: customTriggerId, role: 'button', tabindex: '0', 'data-xcon-custom-select-trigger': '' },
        tag('span', { id: customValueId, 'data-xcon-custom-select-value': '' }, escapeHtml(customDisplay)) + iconSvg('chevron_down', 'none'),
      ) +
        tag(
          'div',
          { class: 'custom-select__dropdown', id: customDropdownId },
          finalCustomRows
            .map((row) =>
              tag(
                'div',
                {
                  class: `custom-select__opt${row.value === customValue ? ' selected' : ''}`,
                  'data-val': row.value,
                  'data-xcon-custom-select-option': '',
                },
                escapeHtml(row.label),
              ),
            )
            .join(''),
        ),
    );
    const nativeLabel = tag('label', { class: 'f-label', for: `${selectId}_native` }, escapeHtml(String(component.get('nativeLabel') ?? 'Native Select')));
    const customLabel = renderOptional('label', component.get('customLabel') ?? 'Custom Select', 'f-label');
    return tag('div', attrsWithClass(attrs, 'xa-ext-select-host xa-ext-select-host--showcase'), nativeLabel + select + customLabel + custom);
  }

  const body =
    (!multiple && placeholder && selected.length === 0 ? tag('option', { value: '', selected: '', disabled: '' }, escapeHtml(placeholder)) : '') +
    optionRows
      .map((option) =>
        tag(
          'option',
          {
            value: attr(option.value),
            selected: selected.includes(option.value) ? '' : undefined,
            disabled: option.disabled ? '' : undefined,
          },
          escapeHtml(option.label),
        ),
      )
      .join('');
  const sizeValue = numberLike(component.get('size'));
  const select = tag(
    'div',
    { class: 'f-select-wrap' },
    tag(
      'select',
      {
        class: 'f-select',
        id: selectId,
        multiple: multiple ? '' : undefined,
        size: sizeValue && sizeValue > 1 ? String(sizeValue) : undefined,
        required: required ? '' : undefined,
        disabled: disabled ? '' : undefined,
      },
      body,
    ) + tag('span', { class: 'f-select-arrow', 'aria-hidden': 'true' }, iconSvg('chevron_down', 'none')),
  );
  const labelText = component.contains('label') ? component.get('label') : component.contains('nativeLabel') ? component.get('nativeLabel') : 'Native Select';
  const label = labelText !== undefined && labelText !== null && labelText !== '' ? tag('label', { class: 'f-label', for: selectId }, escapeHtml(String(labelText))) : '';
  return tag('div', attrsWithClass(attrs, 'xa-ext-select-host xa-ext-select-host--single'), label + select);
}

function selectRows(value: unknown, options: { slugStrings?: boolean } = {}): Array<{ value: string; label: string; disabled: boolean }> {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    if (typeof item === 'string') {
      return {
        value: options.slugStrings ? selectSlugFromLabel(item, index) : item,
        label: item,
        disabled: false,
      };
    }
    const option = isXconObject(item) ? item : item && typeof item === 'object' && !Array.isArray(item) ? fromJSONObject(item) : fromJSONObject({ value: item, label: item });
    const fallbackLabel = option.get('text') ?? option.get('label') ?? option.get('value') ?? option.get('key') ?? `opt${index}`;
    const rawValue = option.get('value') ?? option.get('key') ?? option.get('label') ?? option.get('text') ?? `opt${index}`;
    return {
      value: String(option.get('value') ?? option.get('key') ?? (options.slugStrings ? selectSlugFromLabel(fallbackLabel, index) : rawValue)),
      label: String(option.get('label') ?? option.get('text') ?? fallbackLabel),
      disabled: isTruthy(option.get('disabled')),
    };
  });
}

function defaultShowcaseCustomSelectRows(): Array<{ value: string; label: string; disabled: boolean }> {
  return [
    { value: 'designer', label: '🎨 Designer', disabled: false },
    { value: 'dev', label: '💻 Developer', disabled: false },
    { value: 'pm', label: '📋 Product Manager', disabled: false },
    { value: 'data', label: '📊 Data Analyst', disabled: false },
    { value: 'devops', label: '⚙️ DevOps', disabled: false },
  ];
}

function selectSelectedValues(value: unknown, multiple: boolean): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  const text = String(value);
  return multiple ? text.split(',').map((item) => item.trim()).filter(Boolean) : [text];
}

function selectSlugFromLabel(label: unknown, index: number): string {
  const text = String(label ?? '').trim();
  const compact = text.toLowerCase().replace(/\s+/g, '');
  const mapped: Record<string, string> = {
    react: 'react',
    vue: 'vue',
    svelte: 'svelte',
    solidjs: 'solid',
    solid: 'solid',
    angular: 'angular',
  };
  if (mapped[compact]) return mapped[compact];
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 32);
  return slug || `opt${index}`;
}

function isShowcaseVariant(component: XconObject): boolean {
  const value = String(component.get('variant') ?? component.get('extVariant') ?? component.get('selectVariant') ?? '').trim().toLowerCase();
  return value === 'showcase';
}

function sliderFill(min: number, max: number, value: number): string {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return '0.0';
  const clamped = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  return (((clamped - min) / (max - min)) * 100).toFixed(1);
}

function switchSizeClass(value: unknown): string {
  const size = String(value ?? 'medium').trim().toLowerCase();
  if (size === 'small' || size === 'sm') return 'switch--sm';
  if (size === 'large' || size === 'lg') return 'switch--lg';
  return 'switch--md';
}

function progressVariant(value: unknown): string {
  const variant = String(value ?? 'a').trim().toLowerCase();
  if (variant === 'default' || variant === 'gradient' || variant === 'striped') return 'a';
  return ['a', 'b', 'c', 'd'].includes(variant) ? variant : 'a';
}

function spinnerKind(value: unknown): 'ring' | 'dots' | 'pulse' | 'bars' {
  const kind = String(value ?? 'ring').trim().toLowerCase();
  if (kind === 'dots') return 'dots';
  if (kind === 'pulse' || kind === 'grow') return 'pulse';
  if (kind === 'bars') return 'bars';
  return 'ring';
}

function spinnerRgb(value: unknown): string {
  const color = String(value ?? '').trim();
  const hex = color.startsWith('#') ? color.slice(1) : '';
  if (hex.length === 3 || hex.length === 6) {
    const full = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
    const numeric = Number.parseInt(full, 16);
    if (Number.isFinite(numeric)) return `${(numeric >> 16) & 255}, ${(numeric >> 8) & 255}, ${numeric & 255}`;
  }
  const rgba = color.split(',').map((part) => Number.parseInt(part.trim(), 10));
  if (rgba.length >= 3 && rgba.slice(0, 3).every(Number.isFinite)) return `${rgba[0]}, ${rgba[1]}, ${rgba[2]}`;
  return '0, 123, 255';
}

function spinnerGraphic(kind: 'ring' | 'dots' | 'pulse' | 'bars', size: unknown): string {
  const sizeClass = String(size ?? 'medium').trim().toLowerCase() === 'small' ? 'xa-ext-spin-scale--sm' : String(size ?? '').trim().toLowerCase() === 'large' ? 'xa-ext-spin-scale--lg' : 'xa-ext-spin-scale--md';
  if (kind === 'dots') return tag('div', { class: `sp-dots ${sizeClass}`, role: 'status', 'aria-hidden': 'true' }, '<span></span><span></span><span></span>');
  if (kind === 'pulse') return tag('div', { class: `sp-pulse ${sizeClass}`, role: 'status', 'aria-hidden': 'true' }, '');
  if (kind === 'bars') return tag('div', { class: `sp-bars ${sizeClass}`, role: 'status', 'aria-hidden': 'true' }, '<span></span><span></span><span></span><span></span>');
  const ringSize = String(size ?? 'medium').trim().toLowerCase() === 'small' ? 'sp-ring--sm' : String(size ?? '').trim().toLowerCase() === 'large' ? 'sp-ring--lg' : 'sp-ring--md';
  return tag('div', { class: `sp-ring ${ringSize}`, role: 'status', 'aria-hidden': 'true' }, '');
}

function renderChoice(component: XconObject, attrs: Record<string, string | undefined>, type: string, context: RenderContext): string {
  const isCheckbox = type === 'checkbox';
  if (isCheckbox) return renderCheckbox(component, attrs, context);
  return renderRadio(component, attrs);
}

function renderRadio(component: XconObject, attrs: Record<string, string | undefined>): string {
  const variant = String(component.get('variant') ?? component.get('radioVariant') ?? '').trim().toLowerCase();
  if (variant === 'segment') return renderRadioSegment(component, attrs);
  if (variant === 'plan') return renderRadioPlan(component, attrs);
  if (variant === 'rating') return renderRadioRating(component, attrs);
  return renderRadioList(component, attrs);
}

function renderRadioList(component: XconObject, attrs: Record<string, string | undefined>): string {
  const disabled = isFalseLike(component.get('enabled'));
  const input = radioInput(component, 'xa-al-rb-input', disabled);
  const label = radioLabelHtml(component);
  return tag(
    'label',
    attrsWithClass(radioVariantAttrs(attrs, 'list'), `xa-al-rb-item${disabled ? ' xa-al-rb-item--disabled' : ''}`),
    `${input}${tag('span', { class: 'xa-al-rb-circle', 'aria-hidden': 'true' }, '')}${label}`,
  );
}

function renderRadioSegment(component: XconObject, attrs: Record<string, string | undefined>): string {
  const disabled = isFalseLike(component.get('enabled'));
  const id = radioInputId(attrs);
  const input = radioInput(component, 'xa-al-rb-seg-inp', disabled, id);
  return tag(
    'div',
    attrsWithClass(radioVariantAttrs(attrs, 'segment'), `xa-al-rb-btn-item${disabled ? ' xa-al-rb-item--disabled' : ''}`),
    `${input}${tag('label', { class: 'xa-al-rb-btn-label', for: id }, escapeHtml(String(component.get('label') ?? component.get('text') ?? '')))}`,
  );
}

function renderRadioPlan(component: XconObject, attrs: Record<string, string | undefined>): string {
  const disabled = isFalseLike(component.get('enabled'));
  const pricePer = textValue(component.get('planPricePer')) ?? '';
  const features = radioPlanFeatures(component.get('planFeatures'))
    .map((feature) => tag('div', { class: 'xa-al-rb-plan__feat' }, escapeHtml(feature)))
    .join('');
  return tag(
    'label',
    attrsWithClass(radioVariantAttrs(attrs, 'plan'), `xa-al-rb-plan${disabled ? ' xa-al-rb-item--disabled' : ''}`),
    `${radioInput(component, 'xa-al-rb-plan-input', disabled)}${tag('div', { class: 'xa-al-rb-plan__badge' }, 'Popular')}${tag(
      'div',
      { class: 'xa-al-rb-plan__name' },
      escapeHtml(String(component.get('planName') ?? component.get('label') ?? component.get('text') ?? '')),
    )}${tag(
      'div',
      { class: 'xa-al-rb-plan__price' },
      `${escapeHtml(String(component.get('planPriceMain') ?? ''))}${tag('span', { class: 'xa-al-rb-plan__per' }, escapeHtml(pricePer))}`,
    )}${tag('div', { class: 'xa-al-rb-plan__features' }, features)}`,
  );
}

function renderRadioRating(component: XconObject, attrs: Record<string, string | undefined>): string {
  const rating = Math.max(0, Math.min(5, Number.parseInt(String(component.get('ratingValue') ?? 4), 10) || 4));
  const stars = Array.from({ length: 5 }, (_, index) =>
    tag('span', { class: `xa-al-rb-star${index + 1 <= rating ? ' on' : ''}`, 'data-v': String(index + 1), role: 'presentation' }, '★'),
  ).join('');
  return tag(
    'div',
    attrsWithClass(radioVariantAttrs(attrs, 'rating'), 'xa-al-rb-rating-wrap'),
    tag('div', { class: 'xa-al-rb-rating-row', 'data-xa-rating-value': String(rating) }, stars) +
      tag('p', { class: 'xa-al-rb-rating-cap' }, escapeHtml(`${rating.toFixed(1)} out of 5 stars`)),
  );
}

function radioInput(component: XconObject, className: string, disabled: boolean, id?: string): string {
  return voidTag('input', {
    type: 'radio',
    class: className,
    id,
    checked: radioChecked(component) ? '' : undefined,
    disabled: disabled ? '' : undefined,
    name: attr(component.get('group') ?? component.get('groupName') ?? 'radioGroup'),
    value: attr(radioInputValue(component)),
  });
}

function radioInputValue(component: XconObject): string {
  const value = component.get('value');
  if (value !== undefined && value !== null && String(value) !== '') return String(value);
  const fallback = String(component.get('label') ?? component.get('text') ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  return fallback || 'opt';
}

function radioChecked(component: XconObject): boolean {
  return isTruthy(component.get('checked')) || String(component.get('state') ?? '').toLowerCase() === 'checked';
}

function radioLabelHtml(component: XconObject): string {
  const parts = checkboxSplitTitleSub(String(component.get('label') ?? component.get('text') ?? ''));
  if (parts.sub) {
    return tag('div', { class: 'xa-al-cb-label' }, tag('p', {}, escapeHtml(parts.title)) + tag('small', {}, escapeHtml(parts.sub)));
  }
  return tag('div', { class: 'xa-al-cb-label xa-al-cb-label--plain' }, escapeHtml(parts.title));
}

function radioPlanFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  const text = String(value ?? '');
  if (!text) return [];
  return text
    .split(text.includes('|') ? '|' : /\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function radioInputId(attrs: Record<string, string | undefined>): string {
  return `xa_rb_${String(attrs['data-key'] ?? Math.random()).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function radioVariantAttrs(attrs: Record<string, string | undefined>, variant: 'list' | 'segment' | 'plan' | 'rating'): Record<string, string | undefined> {
  const blocked =
    variant === 'segment' || variant === 'plan'
      ? new Set(['position', 'left', 'top', 'width', 'height', 'min-height'])
      : new Set(['position', 'left', 'top', 'height', 'min-height']);
  const style = stripStyleDeclarations(attrs.style, blocked);
  const variantStyle =
    variant === 'segment' || variant === 'plan'
      ? 'height:auto;flex:1 1 0;min-width:0;width:auto;max-width:100%;align-self:stretch;box-sizing:border-box'
      : 'height:auto;width:100%;min-width:0;box-sizing:border-box';
  return attrsWithAppendedStyle({ ...attrs, style }, `position:relative;${variantStyle}`);
}

function stripStyleDeclarations(style: string | undefined, blocked: Set<string>): string | undefined {
  if (!style) return undefined;
  const declarations = style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator <= 0) return false;
      return !blocked.has(declaration.slice(0, separator).trim().toLowerCase());
    });
  return declarations.join(';') || undefined;
}

function renderCheckbox(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const variant = String(component.get('variant') ?? component.get('checkboxVariant') ?? '').trim().toLowerCase();
  if (variant === 'card') return renderCheckboxCard(component, attrs);
  if (variant === 'pill') return renderCheckboxPill(component, attrs);
  if (variant === 'terms') return renderCheckboxTerms(component, attrs, context);
  return renderCheckboxList(component, attrs, context);
}

function renderCheckboxList(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const disabled = isFalseLike(component.get('enabled'));
  const indeterminate = checkboxIndeterminate(component);
  const appearance = checkboxAppearance(component);
  const input = checkboxInput(component, 'xa-al-cb-input', disabled, indeterminate);
  const boxClasses = ['xa-al-cb-box', appearance ? `xa-al-cb-box--${appearance}` : '', indeterminate ? 'xa-al-cb-box--indeterminate' : '']
    .filter(Boolean)
    .join(' ');
  const label = checkboxLabelHtml(component, context);
  return tag(
    'label',
    attrsWithClass(checkboxVariantAttrs(attrs, 'list'), `xa-al-cb-item${disabled ? ' xa-al-cb-item--disabled' : ''}`),
    `${input}${tag('span', { class: boxClasses, 'aria-hidden': 'true' }, checkSvg())}${label}`,
  );
}

function renderCheckboxTerms(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const disabled = isFalseLike(component.get('enabled'));
  const html = checkboxRichLabel(component, context);
  return tag(
    'label',
    attrsWithClass(checkboxVariantAttrs(attrs, 'terms'), `xa-al-cb-item xa-al-cb-item--terms${disabled ? ' xa-al-cb-item--disabled' : ''}`),
    `${checkboxInput(component, 'xa-al-cb-input', disabled, false)}${tag('span', { class: 'xa-al-cb-box', 'aria-hidden': 'true' }, checkSvg())}${tag(
      'span',
      { class: 'xa-al-cb-terms-wrap' },
      html,
    )}`,
  );
}

function renderCheckboxCard(component: XconObject, attrs: Record<string, string | undefined>): string {
  const disabled = isFalseLike(component.get('enabled'));
  const parsed = checkboxCardParts(String(component.get('label') ?? component.get('text') ?? ''));
  const icon = parsed.icon ? tag('div', { class: 'xa-al-cb-card-icon' }, escapeHtml(parsed.icon)) : '';
  const sub = parsed.sub ? tag('div', { class: 'xa-al-cb-card-sub' }, escapeHtml(parsed.sub)) : '';
  return tag(
    'label',
    attrsWithClass(checkboxVariantAttrs(attrs, 'card'), `xa-al-cb-card${disabled ? ' xa-al-cb-item--disabled' : ''}`),
    `${checkboxInput(component, 'xa-al-cb-card-input', disabled, false)}${tag('span', { class: 'xa-al-cb-card-check', 'aria-hidden': 'true' }, checkSvg())}${icon}${tag(
      'div',
      { class: 'xa-al-cb-card-title' },
      escapeHtml(parsed.title),
    )}${sub}`,
  );
}

function renderCheckboxPill(component: XconObject, attrs: Record<string, string | undefined>): string {
  const disabled = isFalseLike(component.get('enabled'));
  return tag(
    'label',
    attrsWithClass(checkboxVariantAttrs(attrs, 'pill'), `xa-al-cb-pill${disabled ? ' xa-al-cb-item--disabled' : ''}`),
    `${checkboxInput(component, 'xa-al-cb-pill-input', disabled, false)}${tag(
      'span',
      { class: 'xa-al-cb-pill-lbl' },
      escapeHtml(String(component.get('label') ?? component.get('text') ?? '')),
    )}`,
  );
}

function checkboxVariantAttrs(attrs: Record<string, string | undefined>, variant: 'list' | 'card' | 'pill' | 'terms'): Record<string, string | undefined> {
  const blocked = new Set(['position', 'left', 'top']);
  if (variant === 'card' || variant === 'pill' || variant === 'terms') {
    blocked.add('height');
    blocked.add('min-height');
  }
  if (variant === 'pill') {
    blocked.add('width');
  }
  const style = stripStyleDeclarations(attrs.style, blocked);
  const base = 'position:relative;align-self:stretch;width:100%;max-width:100%;min-width:0;box-sizing:border-box;min-height:0';
  const variantStyle =
    variant === 'card'
      ? 'height:auto;min-height:min-content;overflow:visible;box-sizing:border-box'
      : variant === 'pill'
        ? 'height:auto;width:auto;max-width:100%;flex:0 0 auto;align-self:flex-start'
        : variant === 'terms'
          ? 'height:auto;align-items:flex-start'
          : '';
  return attrsWithAppendedStyle({ ...attrs, style }, [base, variantStyle].filter(Boolean).join(';'));
}

function checkboxInput(component: XconObject, className: string, disabled: boolean, indeterminate: boolean): string {
  return voidTag('input', {
    type: 'checkbox',
    class: className,
    checked: checkboxChecked(component) && !indeterminate ? '' : undefined,
    disabled: disabled ? '' : undefined,
    value: attr(component.get('value') ?? ''),
    'data-xa-indeterminate': indeterminate ? '1' : undefined,
  });
}

function checkboxChecked(component: XconObject): boolean {
  return isTruthy(component.get('checked') ?? component.get('value'));
}

function checkboxIndeterminate(component: XconObject): boolean {
  return isTruthy(component.get('indeterminate')) || String(component.get('state') ?? component.get('value') ?? '').toLowerCase() === 'indeterminate';
}

function checkboxAppearance(component: XconObject): string {
  const value = String(component.get('appearance') ?? component.get('checkboxAppearance') ?? '').trim().toLowerCase();
  return value === 'green' || value === 'blue' ? value : '';
}

function checkboxLabelHtml(component: XconObject, context: RenderContext): string {
  const rich = component.get('labelHtml');
  if (rich !== undefined && rich !== null && rich !== '') return tag('span', { class: 'xa-al-cb-terms-wrap' }, checkboxRichLabel(component, context));
  const parts = checkboxSplitTitleSub(String(component.get('label') ?? component.get('text') ?? ''));
  if (parts.sub) {
    return tag(
      'span',
      { class: 'xa-al-cb-label' },
      tag('p', {}, escapeHtml(parts.title)) + tag('small', {}, escapeHtml(parts.sub)),
    );
  }
  return tag('span', { class: 'xa-al-cb-label xa-al-cb-label--plain' }, escapeHtml(parts.title));
}

function checkboxRichLabel(component: XconObject, context: RenderContext): string {
  const raw = String(component.get('labelHtml') ?? component.get('label') ?? component.get('text') ?? '');
  return context.options.allowHtml ? sanitizeHtml(raw) : escapeHtml(raw);
}

function checkboxSplitTitleSub(text: string): { title: string; sub: string } {
  const index = text.indexOf(' · ');
  if (index < 0) return { title: text, sub: '' };
  return { title: text.slice(0, index), sub: text.slice(index + 3) };
}

function checkboxCardParts(text: string): { icon: string; title: string; sub: string } {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\p{Extended_Pictographic})\s+(.+)$/u);
  const body = match ? match[2] : trimmed;
  const parts = checkboxSplitTitleSub(body);
  return { icon: match ? match[1] : '', ...parts };
}

function renderSlider(component: XconObject, attrs: Record<string, string | undefined>): string {
  const min = Number(component.get('min') ?? component.get('minValue') ?? 0);
  const max = Number(component.get('max') ?? component.get('maxValue') ?? 100);
  const value = Number(component.get('value') ?? 50);
  const key = domIdFromAttrs(attrs);
  const showValue = !isFalseLike(component.get('showValue'));
  const inputId = `${key}~rng`;
  const valueId = `${key}~sv`;
  const input = renderSliderInput(component, min, max, value, inputId, showValue ? valueId : undefined);
  const valueHtml = showValue ? tag('div', { class: 'slider-value', id: valueId }, escapeHtml(String(value))) : '';
  const labels = isFalseLike(component.get('showLabels') ?? component.get('showSliderLabels'))
    ? ''
    : tag('div', { class: 'slider-labels' }, tag('span', {}, String(min)) + tag('span', {}, String(Math.round((min + max) / 2))) + tag('span', {}, String(max)));
  const labelText = component.get('label') ?? component.get('sliderLabel');
  const labelHtml = labelText === undefined || labelText === null || labelText === '' ? '' : tag('label', { class: 'f-label', for: inputId }, escapeHtml(String(labelText)));
  const single = labelHtml + valueHtml + tag('div', { class: 'slider-wrap' }, input) + labels;
  if (!isShowcaseVariant(component)) return tag('div', attrsWithClass(attrs, 'xa-ext-slider-host xa-ext-slider-host--single'), single);
  const volumeValue = Math.min(max, Math.max(min, value + 3));
  const opacityValue = Math.min(max, Math.max(min, value + 18));
  const volumeId = `${key}~vol`;
  const opacityId = `${key}~op`;
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-slider-host xa-ext-slider-host--showcase'),
    valueHtml +
      tag('div', { class: 'slider-wrap' }, input) +
      labels +
      tag('div', { style: 'margin-top:16px' }, tag('label', { class: 'f-label', for: volumeId }, 'Volume') + tag('div', { class: 'slider-wrap' }, renderSliderInput(component, min, max, volumeValue, volumeId))) +
      tag('div', { style: 'margin-top:14px' }, tag('label', { class: 'f-label', for: opacityId }, 'Opacity') + tag('div', { class: 'slider-wrap' }, renderSliderInput(component, min, max, opacityValue, opacityId))),
  );
}

function renderSliderInput(
  component: XconObject,
  min: number,
  max: number,
  value: number,
  id: string,
  valueTarget?: string,
): string {
  return voidTag('input', {
    class: 'f-range',
    id,
    type: 'range',
    min: attr(min),
    max: attr(max),
    step: attr(component.get('step') ?? 1),
    value: attr(value),
    style: `--fill:${sliderFill(min, max, value)}%`,
    disabled: isFalseLike(component.get('enabled')) ? '' : undefined,
    'data-xcon-range': '',
    'data-xcon-range-value-target': valueTarget,
  });
}

function renderSwitch(component: XconObject, attrs: Record<string, string | undefined>): string {
  const checked = isTruthy(component.get('checked') ?? component.get('value'));
  const key = domIdFromAttrs(attrs);
  const input = renderSwitchInput(component, checked, key);
  const size = switchSizeClass(component.get('size'));
  const title = textValue(component.get('title') ?? component.get('switchTitle') ?? component.get('label') ?? component.get('text'));
  const subtitle = textValue(component.get('subtitle') ?? component.get('switchSubtitle'));
  const info = title || subtitle ? tag('div', { class: 'switch-info' }, (title ? tag('p', {}, escapeHtml(title)) : '') + (subtitle ? tag('small', {}, escapeHtml(subtitle)) : '')) : '';
  const row = tag('div', { class: `switch-row${info ? '' : ' switch-row--control-only'}` }, info + tag('label', { class: `switch ${size}` }, input + tag('span', { class: 'switch__track' }, '')));
  if (!isShowcaseVariant(component)) return tag('div', attrsWithClass(attrs, 'xa-ext-switch-host xa-ext-switch-host--single'), row);
  const rows = [
    ['Dark Mode', 'Use dark color scheme', true],
    ['Notifications', 'Receive push notifications', false],
    ['Auto-save', 'Save changes automatically', true],
    ['Analytics', 'Share anonymous usage data', false],
  ] as const;
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-switch-host xa-ext-switch-host--showcase'),
    rows
      .map(([t, s, c], index) =>
        tag(
          'div',
          { class: 'switch-row' },
          tag('div', { class: 'switch-info' }, tag('p', {}, t) + tag('small', {}, s)) +
            tag('label', { class: `switch ${size}` }, renderSwitchInput(component, c, `${key}~sw${index + 1}`, `${t} ${s}`) + tag('span', { class: 'switch__track' }, '')),
        ),
      )
      .join(''),
  );
}

function renderSwitchInput(component: XconObject, checked: boolean, id?: string, label?: string): string {
  return voidTag('input', {
    type: 'checkbox',
    id,
    role: 'switch',
    checked: checked ? '' : undefined,
    disabled: isFalseLike(component.get('enabled')) ? '' : undefined,
    'aria-checked': checked ? 'true' : 'false',
    'aria-label': attr(label ?? switchAriaLabel(component, checked)),
    'data-xcon-switch': '',
  });
}

function switchAriaLabel(component: XconObject, checked: boolean): string {
  const labels = component.get('labels');
  const on = isXconObject(labels) ? labels.get('on') : undefined;
  const off = isXconObject(labels) ? labels.get('off') : undefined;
  return String((checked ? on ?? component.get('onText') : off ?? component.get('offText')) ?? (checked ? 'ON' : 'OFF'));
}

function renderColorPicker(component: XconObject, attrs: Record<string, string | undefined>): string {
  const id = domIdFromAttrs(attrs);
  const suffix = pickerIdSuffix(attrs, 'colorPicker');
  const value = normalizeHexColor(component.get('value'), isShowcaseVariant(component) ? '#7C6AF7' : '#000000');
  const swatches = ['#7C6AF7', '#34D399', '#F87171', '#FBBF24', '#60A5FA', '#F472B6', '#A78BFA', '#2DD4BF'];
  const swatchHtml = swatches
    .map((hex, index) => tag('div', { class: `color-swatch${index === 0 ? ' selected' : ''}`, style: `background:${hex}`, 'data-hex': hex }, ''))
    .join('');
  if (isShowcaseVariant(component)) {
    return tag(
      'div',
      { ...attrsWithClass(attrs, 'xa-ext-color-picker-host xa-ext-color-picker-host--showcase'), 'data-xcon-color-picker': '' },
      tag(
        'div',
        { class: 'color-picker-wrap' },
        tag('div', { class: 'color-preview', id: `colorPreview_${suffix}`, style: 'background:#7C6AF7', 'data-xcon-color-preview': '' }, '') +
          voidTag('input', {
            type: 'range',
            class: 'color-spectrum',
            id: `colorHue_${suffix}`,
            min: '0',
            max: '360',
            value: '258',
            style: 'background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
            'data-xcon-color-hue': '',
          }) +
          tag(
            'div',
            { class: 'color-hex-row' },
            tag('div', { class: 'color-hex-dot', id: `colorHexDot_${suffix}`, style: 'background:#7C6AF7', 'data-xcon-color-dot': '' }, '') +
              voidTag('input', { type: 'text', id: `colorHexInput_${suffix}`, value: '#7C6AF7', 'data-xcon-color-hex': '' }),
          ) +
          tag('div', { class: 'color-swatches', id: `colorSwatches_${suffix}` }, swatchHtml),
      ),
    );
  }
  const showPreview = !isFalseLike(component.get('showPreview'));
  const showHex = !isFalseLike(component.get('showHex'));
  const key = String(attrs['data-key'] ?? id);
  const preview = showPreview ? tag('div', { class: 'color-preview', id: `${key}~preview`, style: `background:${value}`, 'data-xcon-color-preview': '' }, '') : '';
  const dot = showPreview ? tag('div', { class: 'color-hex-dot', style: `background:${value}`, 'data-xcon-color-dot': '' }, '') : '';
  const hex = showHex ? voidTag('input', { type: 'text', class: 'f-input', id: `${key}~hex`, value, 'data-xcon-color-hex': '' }) : '';
  return tag(
    'div',
    { ...attrsWithClass(attrs, 'xa-ext-color-picker-host xa-ext-color-picker-host--single'), 'data-xcon-color-picker': '' },
    tag(
      'div',
      { class: 'color-picker-wrap' },
      preview +
        tag(
          'div',
          { class: 'color-hex-row' },
          dot +
            voidTag('input', { type: 'color', id: key, value, 'data-xcon-color-input': '', style: 'width:48px;height:36px;padding:0;border:1px solid var(--border2);border-radius:8px;cursor:pointer;background:var(--surface2);' }) +
            hex,
        ),
    ),
  );
}

function renderDatePicker(component: XconObject, attrs: Record<string, string | undefined>): string {
  if (isShowcaseVariant(component)) {
    const suffix = pickerIdSuffix(attrs, 'datePicker');
    return tag(
      'div',
      { ...attrsWithClass(attrs, 'xa-ext-date-picker-host xa-ext-date-picker-host--showcase'), 'data-xcon-date-picker': '', 'data-xcon-picker-suffix': suffix },
      tag(
        'div',
        { class: 'date-picker', id: `datePicker_${suffix}` },
        tag(
          'div',
          { class: 'date-picker__header' },
          pickerNavButton('prev', `dpPrev_${suffix}`) + tag('span', { class: 'date-picker__month', id: `dpMonthLabel_${suffix}` }, '') + pickerNavButton('next', `dpNext_${suffix}`),
        ) + tag('table', { class: 'date-picker__grid' }, datePickerTableBody(`dpBody_${suffix}`)),
      ),
    );
  }
  const showIcon = !isFalseLike(component.get('showIcon'));
  const key = String(attrs['data-key'] ?? 'datePicker');
  const input =
    voidTag('input', {
      type: 'date',
      id: key,
      value: attr(component.get('value') ?? ''),
      min: attr(component.get('min')),
      max: attr(component.get('max')),
      required: isTruthy(component.get('required')) ? '' : undefined,
      style: 'width:100%;height:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;padding-right:40px;',
    }) +
    (showIcon ? tag('span', { style: 'position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:#666;' }, '📅') : '');
  return tag('div', attrsWithClass(attrs, 'xa-ext-date-picker-host xa-ext-date-picker-host--single'), tag('div', { style: 'position:relative;' }, input));
}

function renderTimePicker(component: XconObject, attrs: Record<string, string | undefined>): string {
  if (isShowcaseVariant(component)) {
    const suffix = pickerIdSuffix(attrs, 'timePicker');
    return tag(
      'div',
      { ...attrsWithClass(attrs, 'xa-ext-time-picker-host xa-ext-time-picker-host--showcase'), 'data-xcon-time-picker': '', 'data-xcon-picker-suffix': suffix },
      tag(
        'div',
        { class: 'time-picker' },
        tag(
          'div',
          { class: 'time-picker__display' },
          tag('span', { class: 'time-picker__time' }, `${tag('span', { id: `tpHour_${suffix}` }, '09')}:${tag('span', { id: `tpMin_${suffix}` }, '30')}`) +
            tag('span', { class: 'time-picker__ampm', id: `tpAmpm_${suffix}` }, 'AM'),
        ) +
          tag(
            'div',
            { class: 'time-picker__cols' },
            timePickerColumn('Hour', [], '09', `tpHourList_${suffix}`) +
              timePickerColumn('Min', [], '30', `tpMinList_${suffix}`) +
              timePickerColumn('AM/PM', ['AM', 'PM'], 'AM', `tpAmpmList_${suffix}`, false),
          ),
      ),
    );
  }
  const showIcon = !isFalseLike(component.get('showIcon'));
  const key = String(attrs['data-key'] ?? 'timePicker');
  const input =
    voidTag('input', {
      type: 'time',
      id: key,
      value: attr(component.get('value') ?? ''),
      min: attr(component.get('min')),
      max: attr(component.get('max')),
      step: attr(component.get('step')),
      required: isTruthy(component.get('required')) ? '' : undefined,
      style: 'width:100%;height:100%;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;padding-right:40px;',
    }) +
    (showIcon ? tag('span', { style: 'position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:#666;' }, '🕐') : '');
  return tag('div', attrsWithClass(attrs, 'xa-ext-time-picker-host xa-ext-time-picker-host--single'), tag('div', { style: 'position:relative;' }, input));
}

function normalizeHexColor(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(text) ? text : fallback;
}

function pickerIdSuffix(attrs: Record<string, string | undefined>, fallback: string): string {
  return String(attrs['data-key'] ?? attrs.id ?? fallback).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function showcaseIdSuffix(attrs: Record<string, string | undefined>, fallback: string): string {
  return String(attrs['data-key'] ?? attrs.id ?? fallback).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function pickerNavButton(direction: 'prev' | 'next', id?: string): string {
  const points = direction === 'prev' ? '15 18 9 12 15 6' : '9 18 15 12 9 6';
  return tag(
    'button',
    { type: 'button', class: 'date-picker__nav', id, 'aria-label': direction === 'prev' ? 'Previous month' : 'Next month' },
    `<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="${points}"/></svg>`,
  );
}

function datePickerTableBody(bodyId?: string): string {
  const headings = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => tag('th', {}, day)).join('');
  if (bodyId) return tag('thead', {}, tag('tr', {}, headings)) + tag('tbody', { id: bodyId }, '');
  const days = [
    ['other-month', '26'],
    ['other-month', '27'],
    ['other-month', '28'],
    ['other-month', '29'],
    ['', '1'],
    ['', '2'],
    ['', '3'],
    ['', '4'],
    ['today', '5'],
    ['', '6'],
    ['selected', '7'],
    ['in-range', '8'],
    ['', '9'],
    ['', '10'],
    ['', '11'],
    ['', '12'],
    ['', '13'],
    ['', '14'],
    ['', '15'],
    ['', '16'],
    ['', '17'],
    ['', '18'],
    ['', '19'],
    ['', '20'],
    ['', '21'],
    ['', '22'],
    ['', '23'],
    ['', '24'],
  ];
  const rows = Array.from({ length: 4 }, (_unused, row) =>
    tag(
      'tr',
      {},
      days
        .slice(row * 7, row * 7 + 7)
        .map(([cls, label]) => tag('td', {}, tag('button', { type: 'button', class: `date-day${cls ? ` ${cls}` : ''}` }, label)))
        .join(''),
    ),
  ).join('');
  return tag('thead', {}, tag('tr', {}, headings)) + tag('tbody', {}, rows);
}

function timePickerColumn(label: string, values: string[], selected: string, id?: string, buttons = true): string {
  return tag(
    'div',
    { class: 'time-picker__col' },
    tag('div', { class: 'time-picker__col-label' }, escapeHtml(label)) +
      tag(
        'div',
        { class: 'time-picker__scroll', id },
        values
          .map((value) =>
            buttons
              ? tag('button', { type: 'button', class: `time-picker__item${value === selected ? ' selected' : ''}`, 'data-v': value }, escapeHtml(value))
              : tag('div', { class: `time-picker__item${value === selected ? ' selected' : ''}`, 'data-v': value }, escapeHtml(value)),
          )
          .join(''),
      ),
  );
}

function renderProgressBar(component: XconObject, attrs: Record<string, string | undefined>): string {
  const value = Number(component.get('value') ?? 0);
  const max = Number(component.get('max') ?? 100);
  const pct = Math.max(0, Math.min(100, Math.round((value / (max || 100)) * 100)));
  const animated = isTruthy(component.get('animated'));
  const trackColor = cssColor(component.get('backgroundColor'));
  const trackStyle = trackColor && trackColor.toLowerCase() !== '#e9ecef' ? `background:${trackColor}` : undefined;
  const fillColor = cssColor(component.get('color'));
  const fillStyle = fillColor && fillColor.toLowerCase() !== '#007bff' ? `;background:${fillColor}` : '';
  const row = (label: string, percent: number, variant: string, showLabel = !isFalseLike(component.get('showText')), customFill = true, customTrackStyle?: string) =>
    tag(
      'div',
      { class: 'progress-item' },
      (showLabel ? tag('div', { class: 'progress-label' }, tag('span', {}, escapeHtml(label)) + tag('span', {}, `${percent}%`)) : '') +
        tag(
          'div',
          { class: `progress-track${animated ? ' xa-ext-progress-stripes' : ''}`, style: customTrackStyle },
          tag('div', { class: `progress-fill progress-fill--${variant}`, style: `width:${percent}%${customFill ? fillStyle : ''}` }, ''),
        ),
    );
  if (isShowcaseVariant(component)) {
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-progress-host xa-ext-progress-host--showcase'),
      row('Design', 87, 'a', true, false) + row('Development', 64, 'b', true, false) + row('Testing', 42, 'c', true, false) + row('Deploy', 18, 'd', true, false),
    );
  }
  const variant = progressVariant(component.get('variant') ?? component.get('progressFillVariant'));
  return tag('div', attrsWithClass(attrs, 'xa-ext-progress-host xa-ext-progress-host--single'), row(String(component.get('label') ?? component.get('progressLabel') ?? 'Progress'), pct, variant, !isFalseLike(component.get('showText')), true, trackStyle));
}

function renderSpinner(component: XconObject, attrs: Record<string, string | undefined>): string {
  const kind = spinnerKind(component.get('variant') ?? component.get('spinnerType'));
  const rgb = spinnerRgb(component.get('color'));
  const graphic = spinnerGraphic(kind, component.get('size'));
  if (isShowcaseVariant(component)) {
    return tag(
      'div',
      attrsWithClass(attrsWithAppendedStyle(attrs, `--xa-spin-rgb:${rgb}`), 'xa-ext-spinner-host xa-ext-spinner-host--showcase'),
      tag(
        'div',
        { class: 'spinners-row' },
        tag('div', { class: 'spinner-item' }, tag('div', { class: 'sp-ring sp-ring--sm' }, '') + tag('span', { class: 'spinner-label' }, 'sm')) +
          tag('div', { class: 'spinner-item' }, tag('div', { class: 'sp-ring sp-ring--md' }, '') + tag('span', { class: 'spinner-label' }, 'md')) +
          tag('div', { class: 'spinner-item' }, tag('div', { class: 'sp-ring sp-ring--lg' }, '') + tag('span', { class: 'spinner-label' }, 'lg')) +
          tag('div', { class: 'spinner-item' }, spinnerGraphic('dots', 'medium') + tag('span', { class: 'spinner-label' }, 'dots')) +
          tag('div', { class: 'spinner-item' }, spinnerGraphic('pulse', 'medium') + tag('span', { class: 'spinner-label' }, 'pulse')) +
          tag('div', { class: 'spinner-item' }, spinnerGraphic('bars', 'medium') + tag('span', { class: 'spinner-label' }, 'bars')),
      ),
    );
  }
  return tag(
    'div',
    {
      ...attrsWithClass(attrsWithAppendedStyle(attrs, `--xa-spin-rgb:${rgb};display:flex;align-items:center;justify-content:center`), 'xa-ext-spinner-host'),
      'data-xa-spin-kind': kind,
    },
    graphic + tag('span', { class: 'sr-only' }, 'Loading'),
  );
}

function renderRating(component: XconObject, attrs: Record<string, string | undefined>): string {
  const value = Math.max(0, Number(component.get('value') ?? component.get('rating') ?? 0) || 0);
  const max = Math.max(1, Number(component.get('max') ?? 5) || 5);
  const icons = ratingIcons(component);
  if (isShowcaseVariant(component)) {
    const suffix = showcaseIdSuffix(attrs, 'rating');
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-rating-host xa-ext-rating-host--showcase'),
      tag(
        'div',
        { class: 'rating-wrap' },
        renderRatingRow({
          label: 'Stars',
          inputClass: 'stars-input',
          filled: '★',
          empty: '★',
          value: 0,
          max: 5,
          score: '—',
          group: 'stars',
          id: `starsInput_${suffix}`,
          scoreId: `starsScore_${suffix}`,
          interactive: true,
        }) +
          renderRatingRow({
            label: 'Hearts',
            inputClass: 'hearts-input',
            filled: '♥',
            empty: '♥',
            value: 0,
            max: 5,
            score: '—',
            group: 'hearts',
            id: `heartsInput_${suffix}`,
            scoreId: `heartsScore_${suffix}`,
            interactive: true,
          }) +
          tag(
            'div',
            { class: 'rating-row', style: 'flex-direction:column;align-items:flex-start;gap:6px' },
            tag('span', { class: 'f-label' }, 'Read-only · 4.3') +
              tag('div', { style: 'display:flex;gap:3px' }, tag('span', { style: 'color:var(--yellow)' }, '★★★★') + tag('span', { style: 'color:var(--border2)' }, '★') + tag('span', { style: 'font-size:12px;color:var(--ink-3);margin-left:6px' }, '(1,284 reviews)')),
          ),
      ),
    );
  }
  const readonly = isTruthy(component.get('readonly'));
  const showValue = isTruthy(component.get('showValue'));
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-rating-host xa-ext-rating-host--single'),
    tag(
      'div',
      { class: 'rating-wrap' },
      renderSingleRatingRow({
        value,
        max,
        filled: icons.filled,
        empty: icons.empty,
        size: component.get('size'),
        showValue,
        interactive: !readonly,
      }),
    ),
  );
}

function ratingIcons(component: XconObject): { filled: string; empty: string } {
  const icons = component.get('icons');
  if (isXconObject(icons)) {
    return {
      filled: String(icons.get('filled') ?? component.get('icon') ?? '⭐'),
      empty: String(icons.get('empty') ?? component.get('emptyIcon') ?? '☆'),
    };
  }
  return {
    filled: String(component.get('icon') ?? '⭐'),
    empty: String(component.get('emptyIcon') ?? '☆'),
  };
}

function renderRatingRow(options: { label: string; inputClass: string; filled: string; empty: string; value: number; max: number; score: string; group: string; id: string; scoreId?: string; interactive: boolean }): string {
  const labels = Array.from({ length: options.max }, (_unused, index) => {
    const active = index < options.value;
    return tag(
      'label',
      {
        class: active ? 'active' : undefined,
        'data-v': String(index + 1),
        'data-xcon-rating-star': options.interactive ? '' : undefined,
        role: options.interactive ? 'button' : undefined,
        tabindex: options.interactive ? '0' : undefined,
      },
      escapeHtml(active ? options.filled : options.empty),
    );
  }).join('');
  const score = options.score ? tag('span', { class: 'rating-score', id: options.scoreId, 'data-xcon-rating-score': options.interactive ? '' : undefined }, escapeHtml(options.score)) : '';
  return tag(
    'div',
    { class: 'rating-row' },
    tag('span', { class: 'rating-row__label' }, escapeHtml(options.label)) +
      tag('div', { class: options.inputClass, id: options.id, 'data-xcon-rating-group': options.interactive ? options.group : undefined, 'data-xcon-rating-value': String(options.value) }, labels) +
      score,
  );
}

function ratingIconSize(value: unknown): string {
  const size = String(value ?? 'medium').trim().toLowerCase();
  if (size === 'small' || size === 'sm') return '16px';
  if (size === 'large' || size === 'lg') return '32px';
  return '24px';
}

function renderSingleRatingRow(options: { value: number; max: number; filled: string; empty: string; size: unknown; showValue: boolean; interactive: boolean }): string {
  const iconSize = ratingIconSize(options.size);
  const labels = Array.from({ length: options.max }, (_unused, index) => {
    const active = index < options.value;
    return tag(
      'span',
      {
        class: 'rating-star',
        'data-rating': String(index + 1),
        'data-v': String(index + 1),
        'data-xcon-rating-star': options.interactive ? '' : undefined,
        role: options.interactive ? 'button' : undefined,
        tabindex: options.interactive ? '0' : undefined,
        style: `font-size:${iconSize};cursor:${options.interactive ? 'pointer' : 'default'};color:${active ? '#ffc107' : '#e9ecef'};transition:color .2s ease;`,
      },
      escapeHtml(active ? options.filled : options.empty),
    );
  }).join('');
  const ratingAttrs: Record<string, string | undefined> = {
    class: 'rating-stars',
    'data-value': String(options.value),
    'data-xcon-rating-group': options.interactive ? 'single' : undefined,
    'data-xcon-rating-value': options.interactive ? String(options.value) : undefined,
    style: 'display:flex;align-items:center;gap:2px;',
  };
  const score = options.showValue ? tag('span', { class: 'rating-score', 'data-xcon-rating-score': options.interactive ? '' : undefined }, `${options.value}/${options.max}`) : '';
  return tag(
    'div',
    { class: 'rating-row' },
    tag('span', { class: 'rating-row__label' }, 'Rating') + tag('div', ratingAttrs, labels) + score,
  );
}

function renderSearchBar(component: XconObject, attrs: Record<string, string | undefined>): string {
  const suffix = isShowcaseVariant(component) ? showcaseIdSuffix(attrs, 'searchBar') : domIdFromAttrs(attrs);
  if (isShowcaseVariant(component)) {
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-search-bar-host xa-ext-search-bar-host--showcase'),
      renderSearchOuter({
        id: suffix,
        placeholder: 'Search components…',
        value: '',
        results: searchShowcaseRecentHtml(),
        showShortcut: true,
      }),
    );
  }
  return renderSingleSearchBar(component, attrs);
}

function renderSingleSearchBar(component: XconObject, attrs: Record<string, string | undefined>): string {
  const key = String(attrs['data-key'] ?? 'root');
  const showSearchButton = !isFalseLike(component.get('showSearchButton'));
  const showClearButton = !isFalseLike(component.get('showClearButton'));
  const placeholder = String(component.get('placeholder') ?? '검색어를 입력하세요');
  const value = String(component.get('value') ?? '');
  const searchIcon = String(component.get('searchIcon') ?? '🔍');
  const clearIcon = String(component.get('clearIcon') ?? '×');
  const debounceDelay = Math.max(0, numberLike(component.get('debounceDelay')) ?? 300);
  const searchIconHtml = inlineIconOrText(searchIcon);
  const clearIconHtml = inlineIconOrText(clearIcon);
  const rightPadding = showSearchButton && showClearButton ? '80px' : showSearchButton || showClearButton ? '40px' : '12px';
  const input = voidTag('input', {
    type: 'text',
    id: `${key}_input`,
    placeholder,
    value: value || undefined,
    'data-xcon-search-single-input': '',
    'data-xcon-search-debounce-delay': String(debounceDelay),
    style: `width:100%;height:100%;border:1px solid #ccc;border-radius:4px;padding:8px 12px;padding-right:${rightPadding};box-sizing:border-box;font-size:14px;`,
  });
  const searchButton = showSearchButton
    ? tag(
        'button',
        {
          type: 'button',
          class: 'search-button',
          'data-xcon-search-single-submit': '',
          style: `position:absolute;right:${showClearButton ? '40px' : '8px'};top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:#666;`,
        },
        searchIconHtml,
      )
    : '';
  const clearButton = showClearButton
    ? tag(
        'button',
        {
          type: 'button',
          class: 'clear-button',
          'data-xcon-search-single-clear': '',
          style: `position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;color:#999;display:${value ? 'block' : 'none'};`,
        },
        clearIconHtml,
      )
    : '';
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-search-bar-host xa-ext-search-bar-host--single'),
    tag('div', { class: 'search-container', style: 'position:relative;width:100%;height:100%;', 'data-xcon-search-single': '' }, input + searchButton + clearButton),
  );
}

function inlineIconOrText(value: string): string {
  return iconSvg(value, 'none') || escapeHtml(value);
}

function renderSearchShell(placeholder: string, clear = '', attrs?: Record<string, string | undefined>, inputHtml?: string): string {
  return tag(
    'div',
    attrsWithClass(attrs ?? {}, 'xa-ext-search'),
    tag('span', { class: 'xa-ext-search__icon' }, iconSvg('search', 'none')) +
      (inputHtml ?? voidTag('input', { type: 'search', placeholder })) +
      (clear ? tag('span', { class: 'xa-ext-search__clear' }, escapeHtml(clear)) : ''),
  );
}

function renderSearchOuter(options: { id: string; placeholder: string; value: string; results: string; showShortcut: boolean; disabled?: boolean }): string {
  const inputId = `searchField_${options.id}`;
  const resultsId = `searchResults_${options.id}`;
  return tag(
    'div',
    { class: 'search-outer', id: `searchOuter_${options.id}`, 'data-xcon-search': '' },
    tag(
      'div',
      { class: 'search-input-wrap' },
      tag('span', { class: 'search-icon' }, iconSvg('search', 'none')) +
        voidTag('input', {
          class: 'search-field',
          id: inputId,
          type: 'search',
          autocomplete: 'off',
          placeholder: options.placeholder,
          value: options.value,
          disabled: options.disabled ? '' : undefined,
          'data-xcon-search-field': resultsId,
        }) +
        tag('button', { type: 'button', class: 'search-clear', id: `searchClear_${options.id}`, 'data-xcon-search-clear': inputId, 'aria-label': 'Clear' }, modalCloseIcon()) +
        (options.showShortcut ? tag('span', { class: 'search-kbd' }, '⌘K') : ''),
    ) +
      tag('div', { class: 'search-results', id: resultsId }, options.results),
  );
}

function searchShowcaseRecentHtml(): string {
  const recent = [
    ['⌘', 'Command menu', 'Shortcut'],
    ['◧', 'Button', 'Component'],
    ['Aa', 'Typography', 'Token'],
    ['▣', 'Card', 'Component'],
  ];
  return tag('div', { class: 'search-recent-label' }, 'Recent') + recent.map(([icon, label, type]) => tag('div', { class: 'search-result-item' }, tag('span', { class: 'icon' }, escapeHtml(icon)) + tag('span', { class: 'label' }, escapeHtml(label)) + tag('span', { class: 'type' }, escapeHtml(type)))).join('');
}

function renderTreeView(component: XconObject, attrs: Record<string, string | undefined>): string {
  const nodes = isShowcaseVariant(component) ? showcaseTreeNodes() : normalizeTreeNodes(component.get('data') ?? component.get('items') ?? component.get('nodes'), !isFalseLike(component.get('showIcons')));
  const expanded = isShowcaseVariant(component) ? true : treeExpandedSet(component.get('expandedNodes'));
  const key = String(attrs['data-key'] ?? 'treeView');
  const tree = tag('div', { class: 'tree', id: `${key}~treeMount`, 'data-xcon-tree-view': '' }, renderTreeNodes(nodes, expanded, ''));
  if (isShowcaseVariant(component)) {
    return tag('div', attrsWithClass(attrs, 'xa-ext-treeview-host xa-ext-treeview-host--showcase'), tree);
  }
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-treeview-host xa-ext-treeview-host--single'),
    tag('div', { class: 'tree-container', style: 'border:1px solid var(--border, #e9ecef);border-radius:4px;background-color:var(--surface, white);overflow-y:auto;max-height:280px;' }, tree),
  );
}

type TreeNodeView = { id?: string; label: string; icon?: string; children?: TreeNodeView[] };

function showcaseTreeNodes(): TreeNodeView[] {
  return [
    {
      label: 'src',
      icon: '📁',
      children: [
        { label: 'components', icon: '📁', children: [{ label: 'Button.tsx', icon: '📄' }, { label: 'Input.tsx', icon: '📄' }, { label: 'Modal.tsx', icon: '📄' }] },
        { label: 'pages', icon: '📁', children: [{ label: 'index.tsx', icon: '📄' }, { label: 'about.tsx', icon: '📄' }] },
        { label: 'utils', icon: '📁', children: [{ label: 'helpers.ts', icon: '📄' }] },
      ],
    },
    { label: 'public', icon: '📁', children: [{ label: 'favicon.ico', icon: '🖼️' }] },
    { label: 'package.json', icon: '📄' },
    { label: 'tsconfig.json', icon: '📄' },
  ];
}

function normalizeTreeNodes(value: unknown, showIcons: boolean): TreeNodeView[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): TreeNodeView | null => {
      if (!isXconObject(item)) {
        if (item && typeof item === 'object' && !Array.isArray(item)) return normalizeTreeNodes([fromJSONObject(item)], showIcons)[0] ?? null;
        return item === undefined || item === null ? null : { label: String(item), icon: showIcons ? '📄' : undefined };
      }
      const rawChildren = item.get('children') ?? item.get('items');
      const children = normalizeTreeNodes(rawChildren, showIcons);
      const label = String(item.get('label') ?? item.get('name') ?? item.get('text') ?? 'Node');
      const id = textValue(item.get('id') ?? item.get('key') ?? item.get('value'));
      const icon = showIcons ? String(item.get('icon') ?? (children.length ? '📁' : '📄')) : undefined;
      return { id, label, icon, children: children.length ? children : undefined };
    })
    .filter((node): node is TreeNodeView => Boolean(node));
}

function treeExpandedSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.map((item) => String(item)));
}

function renderTreeNodes(nodes: TreeNodeView[], expanded: true | Set<string>, pathPrefix: string): string {
  return nodes
    .map((node, index) => {
      const path = pathPrefix ? `${pathPrefix}.${index}` : String(index);
      const hasChildren = Boolean(node.children?.length);
      const startOpen = hasChildren && (expanded === true || expanded.has(path) || (node.id ? expanded.has(node.id) : false));
      const rowClass = `tree-row${hasChildren ? ` has-children${startOpen ? ' expanded' : ''}` : ''}`;
      const row =
        tag(
          'div',
          { class: rowClass, 'data-xcon-tree-row': '', 'data-xcon-tree-path': path, 'data-xcon-tree-id': node.id },
          '<svg class="tree-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
            tag('span', { class: 'tree-icon', 'aria-hidden': 'true' }, escapeHtml(node.icon ?? '')) +
            tag('span', { class: 'tree-label' }, escapeHtml(node.label)),
        ) +
        (hasChildren
          ? tag('div', { class: `tree-children${startOpen ? '' : ' collapsed'}` }, renderTreeNodes(node.children ?? [], expanded, path))
          : '');
      return tag('div', { class: 'tree-node' }, row);
    })
    .join('');
}

function renderGallery(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  context: RenderContext,
  depth: number,
  keyPath: string,
): string {
  const images = isShowcaseVariant(component) ? showcaseGalleryImages() : normalizeGalleryImages(component.get('images') ?? component.get('items'));
  if (!isShowcaseVariant(component)) return renderSingleGallery(component, attrs, images, context);
  const suffix = showcaseIdSuffix(attrs, 'gallery');
  const gridStyle = undefined;
  const grid = tag(
    'div',
    { class: 'gallery-grid', id: `galleryGrid_${suffix}`, 'data-xcon-gallery-grid': '', style: gridStyle },
    images.map((image) => galleryItem(image, context)).join(''),
  );
  const body =
    grid +
    tag(
      'div',
      { class: 'lightbox', id: `lightbox_${suffix}`, 'data-xcon-gallery-lightbox': '' },
      voidTag('img', { id: `lightboxImg_${suffix}`, 'data-xcon-gallery-lightbox-img': '', src: '', alt: '' }) +
        tag(
          'button',
          { type: 'button', class: 'lightbox-close', id: `lightboxClose_${suffix}`, 'aria-label': 'Close', 'data-xcon-gallery-close': '' },
          '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        ),
    );
  return tag(
    'div',
    { ...attrsWithClass(attrs, `xa-ext-gallery-host xa-ext-gallery-host--${isShowcaseVariant(component) ? 'showcase' : 'single'}`), 'data-xcon-gallery': '' },
    body,
  );
}

function renderSingleGallery(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  images: Array<{ src: string; caption?: string }>,
  context: RenderContext,
): string {
  const key = String(attrs['data-key'] ?? 'gallery');
  const columns = Number(component.get('columns') ?? 3);
  const cols = Number.isFinite(columns) && columns > 0 ? columns : 3;
  const gap = cssSize(component.get('gap')) ?? '8px';
  const showCaption = !isFalseLike(component.get('showCaption'));
  const grid = tag(
    'div',
    { class: 'gallery-grid', 'data-xcon-gallery-grid': '', style: `display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap};width:100%;height:100%;` },
    images
      .map((image, index) => {
        const src = sanitizeUrl(image.src, context.options);
        const caption = image.caption ?? `이미지 ${index + 1}`;
        return tag(
          'div',
          {
            class: 'gallery-item',
            style: 'position:relative;cursor:pointer;border-radius:4px;overflow:hidden;background:#f8f9fa;',
            'data-xcon-gallery-single-item': String(index),
          },
          (src ? voidTag('img', { src, alt: caption, style: 'width:100%;height:200px;object-fit:cover;display:block;' }) : '') +
            (showCaption
              ? tag(
                  'div',
                  { class: 'gallery-caption', style: 'position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent, rgba(0,0,0,0.7));color:white;padding:16px 12px 8px;font-size:14px;' },
                  escapeHtml(caption),
                )
              : ''),
        );
      })
      .join(''),
  );
  const modal = tag(
    'div',
    {
      id: `${key}_gallery_modal`,
      class: 'gallery-modal',
      'data-xcon-gallery-single-modal': '',
      style: 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:none;z-index:1000;align-items:center;justify-content:center;',
    },
    tag(
      'div',
      { class: 'gallery-modal-content', style: 'position:relative;max-width:90vw;max-height:90vh;' },
      voidTag('img', { id: `${key}_modal_image`, 'data-xcon-gallery-single-image': '', style: 'max-width:100%;max-height:100%;object-fit:contain;' }) +
        tag('button', { type: 'button', 'data-xcon-gallery-single-close': '', style: 'position:absolute;top:-40px;right:0;background:none;border:none;color:white;font-size:30px;cursor:pointer;' }, '×') +
        tag('button', { type: 'button', 'data-xcon-gallery-single-prev': '', style: 'position:absolute;left:-60px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:white;font-size:24px;padding:12px;border-radius:50%;cursor:pointer;' }, '‹') +
        tag('button', { type: 'button', 'data-xcon-gallery-single-next': '', style: 'position:absolute;right:-60px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:white;font-size:24px;padding:12px;border-radius:50%;cursor:pointer;' }, '›'),
    ),
  );
  return tag(
    'div',
    { ...attrsWithClass(attrs, 'xa-ext-gallery-host xa-ext-gallery-host--single'), 'data-xcon-gallery': '', 'data-xcon-gallery-single': '' },
    grid + modal,
  );
}

function showcaseGalleryImages(): Array<{ src: string; caption?: string }> {
  return [
    { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=70' },
    { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70' },
    { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=70' },
    { src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=70' },
    { src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70' },
  ];
}

function normalizeGalleryImages(value: unknown): Array<{ src: string; caption?: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (isXconObject(item)) {
        return {
          src: String(item.get('src') ?? item.get('image') ?? item.get('url') ?? ''),
          caption: textValue(item.get('caption') ?? item.get('alt') ?? item.get('label')) ?? `이미지 ${index + 1}`,
        };
      }
      return { src: String(item ?? ''), caption: `이미지 ${index + 1}` };
    })
    .filter((image) => image.src);
}

function galleryItem(image: { src: string; caption?: string }, context: RenderContext): string {
  const src = sanitizeUrl(image.src, context.options);
  const img = src ? voidTag('img', { src, alt: attr(image.caption ?? ''), loading: 'lazy' }) : '';
  const caption = image.caption ? tag('div', { class: 'gallery-caption' }, escapeHtml(image.caption)) : '';
  return tag(
    'div',
    { class: 'gallery-item' },
    img +
      caption +
      tag(
        'div',
        { class: 'gallery-item__overlay' },
        '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
      ),
  );
}

function renderQrCode(component: XconObject, attrs: Record<string, string | undefined>): string {
  const text = String(component.get('text') ?? component.get('value') ?? 'https://example.com');
  const size = Math.max(64, Math.min(512, Number(component.get('size') ?? (isShowcaseVariant(component) ? 180 : 200)) || (isShowcaseVariant(component) ? 180 : 200)));
  const showText = !isFalseLike(component.get('showText'));
  const foreground = cssColor(component.get('foregroundColor') ?? component.get('color')) ?? '#000000';
  const background = cssColor(component.get('backgroundColor')) ?? '#ffffff';
  const ecc = String(component.get('errorCorrectionLevel') ?? component.get('ecc') ?? 'M').toUpperCase();
  if (isShowcaseVariant(component)) {
    const suffix = showcaseIdSuffix(attrs, 'qrCode');
    return tag(
      'div',
      { ...attrsWithClass(attrs, 'xa-ext-qr-code-host xa-ext-qr-code-host--showcase'), 'data-xcon-qr-code': '' },
      tag(
        'div',
        { class: 'qr-wrap' },
        tag('canvas', { class: 'qr-canvas', id: `qrCanvas_${suffix}`, width: '180', height: '180', 'data-xcon-qr-canvas': '', 'data-xcon-qr-text': 'https://xconviewer.dev' }, '') +
          tag(
            'div',
            { class: 'qr-input-row' },
            voidTag('input', { class: 'f-input', id: `qrInput_${suffix}`, value: 'https://xconviewer.dev', style: 'font-size:12px', 'data-xcon-qr-input': '' }) +
              tag('button', { type: 'button', class: 'qr-gen-btn', id: `qrBtn_${suffix}`, 'data-xcon-qr-generate': '' }, 'Generate'),
          ),
      ),
    );
  }
  return tag(
    'div',
    {
      ...attrsWithClass(attrs, 'xa-ext-qr-code-host xa-ext-qr-code-host--single'),
      'data-xcon-qr-code': '',
      'data-qr-opts': JSON.stringify({ text, size, ecc, fg: foreground, bg: background }),
    },
    tag(
      'div',
      { class: 'qr-wrap qr-code-container' },
      tag('canvas', {
        class: 'qr-canvas',
        width: String(size),
        height: String(size),
        'data-xcon-qr-canvas': '',
        'data-xcon-qr-text': attr(text),
        'data-xcon-qr-foreground': foreground,
        'data-xcon-qr-background': background,
      }, '') + (showText ? tag('div', { class: 'qr-text', style: 'font-size:12px;color:#666;word-break:break-all;' }, escapeHtml(text)) : ''),
    ),
  );
}

function renderBarcode(component: XconObject, attrs: Record<string, string | undefined>): string {
  const text = String(component.get('text') ?? component.get('value') ?? '1234567890');
  const displayText = barcodeDisplayText(text);
  const format = String(component.get('format') ?? 'CODE128').toUpperCase();
  const barWidth = Math.max(1, Math.min(8, Number(component.get('width') ?? component.get('barWidth') ?? 2) || 2));
  const height = Math.max(40, Math.min(240, Number(component.get('height') ?? (isShowcaseVariant(component) ? 80 : 100)) || (isShowcaseVariant(component) ? 80 : 100)));
  const fontSize = Math.max(8, Math.min(32, Number(fontValue(component, 'size') ?? component.get('fontSize') ?? 14) || 14));
  if (isShowcaseVariant(component)) {
    const suffix = showcaseIdSuffix(attrs, 'barcode');
    return tag(
      'div',
      { ...attrsWithClass(attrs, 'xa-ext-barcode-host xa-ext-barcode-host--showcase'), 'data-xcon-barcode': '' },
      tag(
        'div',
        { class: 'barcode-wrap' },
        tag('canvas', { class: 'barcode-canvas', id: `barcodeCanvas_${suffix}`, width: '280', height: '80', 'data-xcon-barcode-canvas': '', 'data-xcon-barcode-value': '880123456789' }, '') +
          tag('p', { class: 'barcode-text', id: `barcodeText_${suffix}`, 'data-xcon-barcode-text': '' }, '8 8 0 1 2 3 4 5 6 7 8 9') +
          tag(
            'div',
            { class: 'qr-input-row' },
            voidTag('input', { class: 'f-input', id: `barcodeInput_${suffix}`, value: '880123456789', maxlength: '13', style: "font-size:12px;font-family:'Syne Mono',monospace", 'data-xcon-barcode-input': '' }) +
              tag('button', { type: 'button', class: 'qr-gen-btn', id: `barcodeBtn_${suffix}`, 'data-xcon-barcode-draw': '' }, 'Draw'),
          ),
      ),
    );
  }
  return tag(
    'div',
    { ...attrsWithClass(attrs, 'xa-ext-barcode-host xa-ext-barcode-host--single'), 'data-xcon-barcode': '' },
    tag(
      'div',
      { class: 'barcode-wrap barcode-container' },
      tag('canvas', {
        class: 'barcode-canvas',
        width: '280',
        height: String(height),
        'data-xcon-barcode-canvas': '',
        'data-xcon-barcode-value': attr(text),
        'data-xcon-barcode-format': format,
        'data-xcon-barcode-bar-width': String(barWidth),
      }, '') + (isFalseLike(component.get('displayValue')) ? '' : tag('p', { class: 'barcode-text', 'data-xcon-barcode-text': '', style: `font-size:${fontSize}px;` }, escapeHtml(displayText))),
    ),
  );
}

function barcodeDisplayText(value: string): string {
  return value.replace(/\D/g, '').substring(0, 13).padStart(13, '0').split('').join(' ');
}

function renderTemplate(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  context: RenderContext,
  depth: number,
  keyPath: string,
): string {
  const template = component.get('template') ?? component.get('content');
  if (isXconObject(template)) return tag('div', attrs, renderComponent(template, context, depth, { parentFlow: true }, `${keyPath}~template`));
  return tag('div', attrs, escapeHtml(String(template ?? '')));
}

function renderChatBubble(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const layoutType = String(component.get('layoutType') ?? component.get('_layout') ?? '').toLowerCase();
  const side = layoutType.includes('me') || isTruthy(component.get('mine')) || isTruthy(component.get('isMine')) ? 'me' : 'you';
  const name = String(component.get('name') ?? component.get('author') ?? component.get('sender') ?? '');
  const text = String(component.get('text') ?? component.get('message') ?? component.get('content') ?? '');
  const timestamp = String(component.get('timestamp') ?? component.get('time') ?? '');
  const image = component.get('image') ?? component.get('avatar') ?? component.get('src');
  return tag('div', attrsWithClass(attrs, `xlist-chat-row xlist-chat-row--${side}`), renderChatRowContent({ name, text, timestamp, image, context }));
}

function renderMyCounter(component: XconObject, attrs: Record<string, string | undefined>): string {
  const value = component.get('value') ?? component.get('minValue') ?? component.get('min') ?? 0;
  const min = component.get('minValue') ?? component.get('min') ?? 0;
  const max = component.get('maxValue') ?? component.get('max') ?? 100;
  const step = component.get('step') ?? 1;
  const background = cssColor(component.get('backgroundColor') ?? component.get('bgColor')) ?? 'var(--surface)';
  const color = cssColor(component.get('color')) ?? 'var(--ink)';
  return tag(
    'div',
    {
      ...attrsWithStyle(attrsWithClass(attrs, 'xa-custom-counter'), `display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:10px 14px;border:1px solid var(--border2);border-radius:8px;background:${background};color:${color};box-sizing:border-box`),
      'data-xcon-counter-min': attr(min),
      'data-xcon-counter-max': attr(max),
      'data-xcon-counter-step': attr(step),
    },
    tag('button', { type: 'button', class: 'xa-custom-counter__btn', disabled: '' }, '-') +
      tag('output', { class: 'xa-custom-counter__value' }, escapeHtml(String(value))) +
      tag('button', { type: 'button', class: 'xa-custom-counter__btn', disabled: '' }, '+'),
  );
}

function renderMyProgressBar(component: XconObject, attrs: Record<string, string | undefined>): string {
  const value = Number(component.get('value') ?? 0);
  const max = Number(component.get('max') ?? component.get('maxValue') ?? 100);
  const label = component.get('label') ?? component.get('title') ?? 'Progress';
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  const showPercentage = !isFalseLike(component.get('showPercentage'));
  const progressColor = cssColor(component.get('progressColor') ?? component.get('color')) ?? 'var(--accent)';
  const className = `xa-custom-progress${isTruthy(component.get('animated')) ? ' xa-custom-progress--animated' : ''}`;
  return tag(
    'div',
    {
      ...attrsWithStyle(attrsWithClass(attrs, className), `--xcon-progress-color:${progressColor};display:flex;flex-direction:column;gap:8px;width:100%;box-sizing:border-box`),
      'data-xcon-progress-value': attr(value),
      'data-xcon-progress-max': attr(max),
    },
    tag(
      'div',
      { class: 'xa-custom-progress__head' },
      renderOptional('span', label, 'xa-custom-progress__label') +
        (showPercentage ? tag('span', { class: 'xa-custom-progress__percent' }, `${pct}%`) : ''),
    ) +
      tag('div', { class: 'xa-custom-progress__track', style: 'height:8px;border-radius:999px;background:var(--bg2);overflow:hidden' }, tag('span', { class: 'xa-custom-progress__fill', style: `display:block;width:${pct}%;height:100%;background:var(--xcon-progress-color);border-radius:inherit` }, '')) +
      tag('progress', { value: attr(value), max: attr(max), style: 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)' }, escapeHtml(`${value}`)),
  );
}

function renderMyCard(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const image = sanitizeUrl(component.get('imageUrl') ?? component.get('image') ?? component.get('src'), context.options);
  const showShadow = isTruthy(component.get('showShadow'));
  const clickable = isTruthy(component.get('clickable'));
  const classes = ['xa-custom-card', showShadow ? 'xa-custom-card--shadow' : '', clickable ? 'xa-custom-card--clickable' : ''].filter(Boolean).join(' ');
  return tag(
    'article',
    {
      ...attrsWithStyle(attrsWithClass(attrs, classes), `${showShadow ? 'box-shadow:var(--shadow-md);' : ''}border:1px solid var(--border);border-radius:10px;background:var(--surface);overflow:hidden;box-sizing:border-box`),
      role: clickable ? 'button' : undefined,
      tabindex: clickable ? '0' : undefined,
    },
    (image ? voidTag('img', { class: 'xa-custom-card__image', src: image, alt: attr(component.get('title') ?? ''), style: 'display:block;width:100%;height:160px;object-fit:cover' }) : '') +
      tag('div', { class: 'xa-custom-card__body', style: 'display:flex;flex-direction:column;gap:6px;padding:14px 16px' },
        renderOptional('h3', component.get('title'), 'xa-custom-card__title') +
          renderOptional('p', component.get('subtitle'), 'xa-custom-card__subtitle') +
          renderOptional('div', component.get('text') ?? component.get('content'), 'xa-custom-card__content')),
  );
}

function renderMyToggleSwitch(component: XconObject, attrs: Record<string, string | undefined>): string {
  const checked = isTruthy(component.get('checked') ?? component.get('value'));
  const disabled = isTruthy(component.get('disabled')) || isFalseLike(component.get('enabled'));
  const input = voidTag('input', {
    type: 'checkbox',
    role: 'switch',
    class: 'xa-custom-toggle-switch__input',
    checked: checked ? '' : undefined,
    disabled: disabled ? '' : undefined,
  });
  return tag(
    'label',
    {
      ...attrsWithClass(attrs, `xa-custom-toggle-switch${disabled ? ' xa-custom-toggle-switch--disabled' : ''}`),
      'data-xcon-toggle-disabled': String(disabled),
    },
    input +
      tag('span', { class: 'xa-custom-toggle-switch__track' }, tag('span', { class: 'xa-custom-toggle-switch__thumb' }, '')) +
      tag('span', { class: 'xa-custom-toggle-switch__label' }, escapeHtml(String(component.get('label') ?? component.get('text') ?? ''))),
  );
}

function renderMyIconRail(component: XconObject, attrs: Record<string, string | undefined>): string {
  const items = component.get('items');
  const selectedId = String(component.get('selectedId') ?? '').trim();
  const railBg = cssColor(component.get('railBg') ?? component.get('backgroundColor')) ?? 'var(--surface2)';
  const selectedBg = cssColor(component.get('selectedBg')) ?? 'var(--ink)';
  const unselectedColor = cssColor(component.get('unselectedColor')) ?? 'var(--ink-2)';
  const iconSize = cssSize(component.get('iconSize')) ?? '20px';
  const labelFontSize = cssSize(component.get('labelFontSize')) ?? '10px';
  const gap = cssSize(component.get('itemGap')) ?? '6px';
  const railWidth = cssSize(component.get('railWidth')) ?? '112px';
  const maxHeight = cssSize(component.get('maxHeight'));
  const body = Array.isArray(items)
    ? items
        .map((item) => {
          const railItem = myIconRailItem(item);
          const selected = railItem.id !== '' && railItem.id === selectedId;
          return tag(
            'div',
            {
              class: `xa-custom-icon-rail__item${selected ? ' xa-custom-icon-rail__item--selected' : ''}`,
              'data-xcon-icon-rail-id': railItem.id || undefined,
              'aria-current': selected ? 'true' : undefined,
              style: `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:64px;border-radius:12px;color:${selected ? '#fff' : unselectedColor};background:${selected ? selectedBg : 'transparent'};font-size:${labelFontSize}`,
            },
            tag('span', { class: 'xa-custom-icon-rail__icon', style: `font-size:${iconSize};line-height:1` }, escapeHtml(railItem.icon)) +
              tag('span', { class: 'xa-custom-icon-rail__label' }, escapeHtml(railItem.label)),
          );
        })
        .join('')
    : '';
  return tag(
    'nav',
    {
      ...attrsWithStyle(attrsWithClass(attrs, 'xa-custom-icon-rail'), `display:flex;flex-direction:column;gap:${gap};width:${railWidth};max-width:100%;${maxHeight ? `max-height:${maxHeight};overflow:auto;` : ''}padding:8px;background:${railBg};border-radius:18px;box-sizing:border-box`),
      'data-xcon-selected-id': selectedId || undefined,
    },
    body,
  );
}

function renderMyThemeAccentPanel(component: XconObject, attrs: Record<string, string | undefined>): string {
  const theme = String(component.get('theme') ?? 'light').toLowerCase() === 'dark' ? 'dark' : 'light';
  const accent = String(component.get('accent') ?? component.get('accentColor') ?? '#C4622D');
  const presets = ['#C4622D', '#7C6AF7', '#2D7D4F', '#2B5FA0', '#C03A2B', '#B07D12', '#0D9488', '#DB2777'];
  return tag(
    'section',
    attrsWithClass(attrs, 'xa-theme-accent-panel'),
    tag(
      'div',
      { class: 'theme-toolbar' },
      tag('div', { class: 'theme-toolbar__label' }, 'Theme') +
        tag(
          'div',
          { class: 'theme-switch', role: 'group', 'aria-label': '색 테마 선택' },
          tag('button', { type: 'button', class: `theme-switch__btn${theme === 'light' ? ' active' : ''}`, 'data-theme': 'light' }, 'Light') +
            tag('button', { type: 'button', class: `theme-switch__btn${theme === 'dark' ? ' active' : ''}`, 'data-theme': 'dark' }, 'Dark'),
        ),
    ) +
      tag(
        'div',
        { class: 'theme-accent-block' },
        tag('div', { class: 'theme-toolbar__label' }, 'Accent') +
          tag(
            'div',
            { class: 'theme-accent-row' },
            voidTag('input', { type: 'color', class: 'theme-accent-swatch', value: accent, 'aria-label': '액센트 색' }) +
              voidTag('input', { type: 'text', class: 'theme-accent-hex', maxlength: '7', spellcheck: 'false', placeholder: '#RRGGBB', autocomplete: 'off', value: accent }) +
              tag('button', { type: 'button', class: 'theme-accent-reset' }, '기본값'),
          ) +
          tag(
            'div',
            { class: 'theme-accent-presets', role: 'group', 'aria-label': '액센트 프리셋' },
            presets.map((hex) => tag('button', { type: 'button', class: 'theme-preset-dot', 'data-hex': hex, style: `background:${hex}`, title: hex, 'aria-label': hex }, '')).join(''),
          ),
      ),
  );
}

function myIconRailItem(item: unknown): { id: string; label: string; icon: string } {
  if (isXconObject(item)) {
    const id = String(item.get('id') ?? item.get('value') ?? item.get('name') ?? item.get('label') ?? '').trim();
    const label = String(item.get('name') ?? item.get('label') ?? item.get('text') ?? id).trim();
    const icon = String(item.get('icon') ?? '').trim();
    return { id, label, icon };
  }
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>;
    const id = String(record.id ?? record.value ?? record.name ?? record.label ?? '').trim();
    const label = String(record.name ?? record.label ?? record.text ?? id).trim();
    const icon = String(record.icon ?? '').trim();
    return { id, label, icon };
  }
  const text = String(item ?? '').trim();
  return { id: text, label: text, icon: '' };
}

function renderAdvancedChart(component: XconObject, attrs: Record<string, string | undefined>): string {
  const key = componentDomKey(attrs);
  const chartType = String(component.get('chartType') ?? component.get('variant') ?? 'bar');
  const data = toPlainValue(component.get('chartData') ?? component.get('data') ?? {});
  const options = toPlainValue(component.get('chartOptions') ?? {});
  const responsive = booleanOption(component.get('responsive'), true);
  const animation = booleanOption(component.get('animation'), true);
  const rootAttrs = advancedAttrs(attrs, 'xa-chart-container', key, 'position:relative;background:white;border:1px solid #ddd;border-radius:4px;padding:10px;box-sizing:border-box;overflow:hidden');
  const canvas = tag(
    'canvas',
    {
      id: `chart-${key}`,
      style: 'width:100%;height:100%;',
      'data-xcon-chart-type': chartType,
      'data-xcon-chart-data': jsonAttr(data),
      'data-xcon-chart-options': jsonAttr(options),
      'data-xcon-chart-responsive': String(responsive),
      'data-xcon-chart-animation': String(animation),
    },
    '',
  );
  const loading = advancedLoading(`chart-loading-${key}`, 'chart-loading', '차트 로딩 중...');
  return tag('div', rootAttrs, canvas + renderStaticChartPreview(component, data, chartType) + loading);
}

function renderAdvancedCodeEditor(component: XconObject, attrs: Record<string, string | undefined>): string {
  const key = componentDomKey(attrs);
  const rootAttrs = advancedAttrs(attrs, 'xa-code-editor-container', key, `position:relative;border:1px solid #ddd;border-radius:4px;overflow:hidden;box-sizing:border-box;${advancedMinHeight(component)}`);
  const textarea = tag(
    'textarea',
    {
      id: `editor-${key}`,
      placeholder: attr(component.get('placeholder') ?? '코드를 입력하세요...'),
      readonly: isTruthy(component.get('readOnly')) ? '' : undefined,
      spellcheck: 'false',
      'data-xcon-code-mode': attr(component.get('mode') ?? 'javascript'),
      'data-xcon-code-theme': attr(component.get('theme') ?? 'default'),
      'data-xcon-code-line-numbers': String(booleanOption(component.get('lineNumbers'), true)),
      style: "width:100%;height:100%;border:none;outline:none;resize:none;font-family:'Courier New',monospace;font-size:14px;padding:10px;box-sizing:border-box;",
    },
    escapeHtml(String(component.get('value') ?? '')),
  );
  return tag('div', rootAttrs, textarea + advancedLoading(`editor-loading-${key}`, 'editor-loading', '에디터 로딩 중...', true));
}

function renderAdvancedRichEditor(component: XconObject, attrs: Record<string, string | undefined>): string {
  const key = componentDomKey(attrs);
  const rootAttrs = advancedAttrs(attrs, 'xa-rich-editor-container', key, 'position:relative;border:1px solid #ddd;border-radius:4px;background:white;box-sizing:border-box;overflow:hidden');
  const toolbar = isFalseLike(component.get('toolbar'))
    ? ''
    : tag(
        'div',
        { class: 'xa-rich-editor-toolbar', 'aria-hidden': 'true' },
        ['B', 'I', 'U', 'H1', '•', '1.', '↗'].map((label) => tag('span', {}, escapeHtml(label))).join(''),
      );
  const content = component.get('value') ?? component.get('html') ?? component.get('content') ?? '';
  const placeholder = String(component.get('placeholder') ?? '내용을 입력하세요...');
  const contentHtml = content === '' || content === undefined || content === null
    ? tag('div', { class: 'xa-rich-editor-placeholder' }, escapeHtml(placeholder))
    : contextlessRichText(content);
  const body = tag(
    'div',
    {
      id: `rich-editor-${key}`,
      class: 'xa-rich-editor-surface',
      style: 'height:100%;',
      'data-xcon-rich-theme': attr(component.get('theme') ?? 'snow'),
      'data-xcon-rich-placeholder': placeholder,
      'data-xcon-rich-readonly': String(isTruthy(component.get('readOnly'))),
      'data-xcon-rich-modules': jsonAttr(toPlainValue(component.get('modules') ?? {})),
    },
    contentHtml,
  );
  return tag('div', rootAttrs, toolbar + body + advancedLoading(`rich-editor-loading-${key}`, 'rich-editor-loading', '리치 에디터 로딩 중...'));
}

function renderAdvancedDataViz(component: XconObject, attrs: Record<string, string | undefined>): string {
  const key = componentDomKey(attrs);
  const data = toPlainValue(component.get('data') ?? []);
  const vizType = String(component.get('vizType') ?? component.get('variant') ?? 'bar');
  const config = toPlainValue(component.get('config') ?? {});
  const interactive = booleanOption(component.get('interactive'), true);
  const rootAttrs = advancedAttrs(attrs, 'xa-dataviz-container', key, 'position:relative;border:1px solid #ddd;border-radius:4px;background:white;box-sizing:border-box;overflow:hidden');
  const preview = tag(
    'div',
    {
      id: `dataviz-${key}`,
      style: 'width:100%;height:100%;',
      'data-xcon-dataviz-type': vizType,
      'data-xcon-dataviz-data': jsonAttr(data),
      'data-xcon-dataviz-config': jsonAttr(config),
      'data-xcon-dataviz-interactive': String(interactive),
    },
    renderStaticDataViz(data, vizType, config),
  );
  return tag('div', rootAttrs, preview + advancedLoading(`dataviz-loading-${key}`, 'dataviz-loading', '데이터 시각화 로딩 중...'));
}

function renderAdvancedSpanGrid(component: XconObject, attrs: Record<string, string | undefined>): string {
  const key = componentDomKey(attrs);
  const data = spanGridData(component);
  const config = spanGridConfig(component, data);
  const merges = normalizeSpanGridMerges(config.merges);
  if (merges.length > 0) config.merges = merges.map(spanGridMergeSnapshot);
  const rootAttrs = {
    ...advancedAttrs(attrs, 'xa-spangrid-container', key, 'position:relative;overflow:hidden'),
    'data-xcon-spangrid': '',
    'data-xcon-spangrid-data': jsonAttr(data),
    'data-xcon-spangrid-options': jsonAttr(config),
  };
  const surface = tag(
    'div',
    {
      id: `spangrid-${key}`,
      class: 'xa-spangrid-surface',
      'data-xcon-spangrid-surface': '',
      'data-xcon-spangrid-scroll': '',
      role: 'grid',
      'aria-readonly': 'true',
      'aria-label': attr(component.get('ariaLabel') ?? component.get('label') ?? component.get('title') ?? 'SpanGrid'),
    },
    renderStaticSpanGrid(data, config),
  );
  return tag('div', rootAttrs, surface + advancedLoading(`spangrid-loading-${key}`, 'spangrid-loading', 'SpanGrid loading...', true));
}

function renderAdvancedFlipbook(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const key = componentDomKey(attrs);
  const pages = Math.max(1, Number(component.get('pages') ?? 1) || 1);
  const pageWidth = Math.max(1, Number(component.get('pageWidth') ?? 600) || 600);
  const pageHeight = Math.max(1, Number(component.get('pageHeight') ?? 900) || 900);
  const showControls = !isFalseLike(component.get('showControls'));
  const showMiniatures = !isFalseLike(component.get('showMiniatures'));
  const rootAttrs = {
    ...advancedAttrs(attrs, 'xa-flipbook-container', key, 'position:relative;width:100%;height:100%;min-height:500px;display:flex;align-items:center;justify-content:center;background:#f8f9fa;overflow:hidden'),
    'data-xcon-flipbook-page-width': String(pageWidth),
    'data-xcon-flipbook-page-height': String(pageHeight),
  };
  const flipbookId = `flipbook-${key}`;
  const viewerId = `viewer-${key}`;
  const miniaturesId = `miniatures-${key}`;
  const pageStyle = `width:${pageWidth}px;height:${pageHeight}px;`;
  const pagesHtml = renderFlipbookPages(component, pages, context, pageStyle);
  const arrows = showControls ? tag('a', { ignore: '1', class: 'ui-arrow-control ui-arrow-next-page', 'data-xcon-flipbook-next': '' }, '') + tag('a', { ignore: '1', class: 'ui-arrow-control ui-arrow-previous-page', 'data-xcon-flipbook-prev': '' }, '') : '';
  const controls = showControls ? renderFlipbookControls(component, key, pages) : '';
  const miniatures = showMiniatures ? renderFlipbookMiniatures(component, key, miniaturesId, pages, context) : '';
  return tag(
    'div',
    rootAttrs,
    tag('div', { class: 'catalog-app' }, tag('div', { id: viewerId, class: 'flipbook-viewer' }, tag('div', { id: flipbookId, class: 'ui-flipbook' }, pagesHtml + arrows)) + controls + miniatures),
  );
}

function renderAdvancedNetworkDiagram(component: XconObject, attrs: Record<string, string | undefined>): string {
  const key = componentDomKey(attrs);
  return renderNetworkStatic({ key, component, attrs: advancedAttrs(attrs, '', key, '') });
}

function renderAdvancedMap(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const key = componentDomKey(attrs);
  const mapBody = tag(
    'div',
    { id: `map-${key}`, class: 'xa-map', style: 'width:100%;height:100%;border-radius:8px;' },
    renderStaticMap(component, context),
  );
  return tag('div', advancedAttrs(attrs, '', key, ''), tag('div', { class: 'xa-map-container', style: 'width:100%;height:100%;' }, mapBody + mapCalendarLoading(`map-loading-${key}`, 'xa-map-loading', '지도 로딩 중...')));
}

function renderAdvancedCalendar(component: XconObject, attrs: Record<string, string | undefined>): string {
  const key = componentDomKey(attrs);
  const calendarBody = tag('div', { id: `calendar-${key}`, class: 'xa-calendar', style: 'width:100%;height:100%;' }, renderStaticCalendar(component));
  return tag('div', advancedAttrs(attrs, '', key, ''), tag('div', { class: 'xa-calendar-container', style: 'width:100%;height:100%;' }, calendarBody + mapCalendarLoading(`calendar-loading-${key}`, 'xa-calendar-loading', '캘린더 로딩 중...')));
}

function advancedRootStyle(attrs: Record<string, string | undefined>, style: string): string {
  if (!style) return style;
  const baseStyle = attrs.style ?? '';
  const protectedProps = new Set<string>();
  if (/\bposition\s*:/i.test(baseStyle)) protectedProps.add('position');
  if (/\bwidth\s*:/i.test(baseStyle)) protectedProps.add('width');
  if (/\bheight\s*:/i.test(baseStyle)) {
    protectedProps.add('height');
    protectedProps.add('min-height');
  }
  if (protectedProps.size === 0) return style;
  return style
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const prop = part.split(':', 1)[0]?.trim().toLowerCase();
      return !protectedProps.has(prop);
    })
    .join(';');
}

function advancedAttrs(attrs: Record<string, string | undefined>, className: string, key: string, style: string): Record<string, string | undefined> {
  const withClass = className ? attrsWithClass(attrs, className) : attrs;
  return { ...attrsWithAppendedStyle(withClass, advancedRootStyle(attrs, style)), 'data-component-key': key };
}

function componentDomKey(attrs: Record<string, string | undefined>): string {
  const raw = attrs['data-key'] ?? 'root';
  const leaf = raw.split('~').pop() || raw;
  return leaf.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function advancedMinHeight(component: XconObject): string {
  const pos = rectParts(component.get('pos'));
  return pos ? `min-height:${numberPx(pos[3])}` : '';
}

function advancedLoading(id: string, className: string, text: string, elevated = false): string {
  return tag(
    'div',
    {
      id,
      class: className,
      style: `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#666;font-size:14px;${elevated ? 'z-index:1000;' : ''}display:none;`,
    },
    text,
  );
}

function mapCalendarLoading(id: string, className: string, text: string): string {
  return tag(
    'div',
    { id, class: className },
    tag('div', { class: 'spinner' }, '') + tag('p', {}, text),
  );
}

function toPlainValue(value: unknown): unknown {
  if (isXconObject(value)) {
    const result: Record<string, unknown> = {};
    value.forEach((child, key) => {
      result[key] = toPlainValue(child);
    });
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => toPlainValue(item));
  return value;
}

function jsonAttr(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return 'null';
  }
}

function hasJsonData(value: unknown): boolean {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) return plain.length > 0;
  if (plain && typeof plain === 'object') return Object.keys(plain as Record<string, unknown>).length > 0;
  return plain !== undefined && plain !== null && plain !== '';
}

function spanGridData(component: XconObject): unknown[][] {
  const direct = toPlainValue(component.get('data') ?? component.get('cells'));
  if (Array.isArray(direct)) return normalizeSpanGridRows(direct);

  const snapshot = toPlainValue(component.get('snapshot') ?? component.get('grid'));
  const snapshotRows = spanGridSnapshotRows(snapshot);
  if (snapshotRows) return snapshotRows;

  const tabledata = toPlainValue(component.get('tabledata'));
  if (Array.isArray(tabledata)) return normalizeSpanGridRows(tabledata);

  const dataTemplate = toPlainValue(component.get('dataTemplate'));
  if (dataTemplate && typeof dataTemplate === 'object' && !Array.isArray(dataTemplate)) {
    const template = (dataTemplate as Record<string, unknown>).template;
    if (template && typeof template === 'object' && !Array.isArray(template)) {
      const rows = (template as Record<string, unknown>).tabledata;
      if (Array.isArray(rows)) return normalizeSpanGridRows(rows);
    }
  }

  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    const rows = (snapshot as Record<string, unknown>).data ?? (snapshot as Record<string, unknown>).rows;
    if (Array.isArray(rows)) return normalizeSpanGridRows(rows);
  }

  return [];
}

function spanGridConfig(component: XconObject, data: unknown[][]): Record<string, unknown> {
  const options = toPlainValue(component.get('config') ?? component.get('options'));
  const base = options && typeof options === 'object' && !Array.isArray(options) ? options as Record<string, unknown> : {};
  const snapshot = toPlainValue(component.get('snapshot') ?? component.get('grid'));
  const snapshotRecord = objectRecord(snapshot);
  const pos = rectParts(component.get('pos'));
  const config: Record<string, unknown> = {
    readonly: true,
    ...base,
    data,
  };
  if (pos) {
    config.width = pos[2];
    config.height = pos[3];
  }
  copySpanGridConfigValue(config, 'columns', toPlainValue(component.get('columns') ?? component.get('cols') ?? snapshotRecord?.columns ?? snapshotRecord?.cols));
  copySpanGridConfigValue(config, 'rows', toPlainValue(component.get('rows') ?? snapshotRecord?.rows));
  copySpanGridConfigValue(config, 'snapshot', snapshot);
  copySpanGridConfigValue(config, 'merges', toPlainValue(component.get('merges') ?? component.get('mergeCells') ?? component.get('spans') ?? snapshotRecord?.merges));
  copySpanGridConfigValue(config, 'select', toPlainValue(component.get('select')));
  copySpanGridConfigValue(config, 'fixed', toPlainValue(component.get('fixed') ?? snapshotRecord?.fixed));
  copySpanGridConfigValue(config, 'fixedRows', component.get('fixedRows') ?? component.get('fixedRowCount'));
  copySpanGridConfigValue(config, 'fixedColumns', component.get('fixedColumns') ?? component.get('fixedColumnCount'));
  copySpanGridConfigValue(config, 'gridBorder', toPlainValue(component.get('gridBorder') ?? snapshotRecord?.gridBorder));
  copySpanGridConfigValue(config, 'backgroundColor', component.get('backgroundColor') ?? component.get('bgColor') ?? component.get('bg') ?? snapshotRecord?.backgroundColor ?? snapshotRecord?.bgColor ?? snapshotRecord?.bg);
  copySpanGridConfigValue(config, 'backColor', component.get('backColor') ?? snapshotRecord?.backColor);
  copySpanGridConfigValue(config, 'zoom', component.get('zoom'));
  copySpanGridConfigValue(config, 'scrollMode', component.get('scrollMode'));
  copySpanGridConfigValue(config, 'reserveScrollbarInViewport', component.get('reserveScrollbarInViewport'));
  config.readonly = true;
  config.readOnly = true;
  return config;
}

function copySpanGridConfigValue(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined && value !== null && value !== '') target[key] = value;
}

function normalizeSpanGridRows(input: unknown[]): unknown[][] {
  if (input.length === 0) return [];
  const first = input[0];
  if (Array.isArray(first)) return input.map((row) => Array.isArray(row) ? row : [row]);
  const snapshotRows = spanGridSnapshotRows({ rows: input });
  if (snapshotRows) return snapshotRows;
  if (first && typeof first === 'object') {
    const headers = Object.keys(first as Record<string, unknown>);
    return [
      headers,
      ...input.map((row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return headers.map(() => '');
        const record = row as Record<string, unknown>;
        return headers.map((header) => record[header]);
      }),
    ];
  }
  return input.map((value) => [value]);
}

function spanGridSnapshotRows(snapshot: unknown): unknown[][] | undefined {
  const record = objectRecord(snapshot);
  const rows = record?.rows;
  if (!Array.isArray(rows)) return undefined;
  if (!rows.some((row) => objectRecord(row)?.cells && Array.isArray(objectRecord(row)?.cells))) return undefined;
  return rows.map((row) => {
    const rowRecord = objectRecord(row);
    const cells = rowRecord?.cells;
    return Array.isArray(cells) ? cells : [];
  });
}

type StaticSpanGridMerge = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

function renderStaticSpanGrid(data: unknown[][], config: Record<string, unknown> = {}): string {
  const rows = normalizeSpanGridRows(data).slice(0, 80);
  if (rows.length === 0) return tag('div', { class: 'xa-spangrid-empty' }, 'No grid data');
  const gridBackground = config.backColor ?? config.backgroundColor ?? config.bgColor ?? config.bg;
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const normalized = rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ''));
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
  const mergeByStart = new Map<string, StaticSpanGridMerge>();
  const covered = new Set<string>();
  const occupied = new Set<string>();
  merges.forEach((rawMerge) => {
    const merge = {
      startRow: rawMerge.startRow,
      startCol: rawMerge.startCol,
      endRow: Math.min(rawMerge.endRow, rows.length - 1),
      endCol: Math.min(rawMerge.endCol, columnCount - 1),
    };
    if (merge.endRow <= merge.startRow && merge.endCol <= merge.startCol) return;
    const cells: string[] = [];
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
  const renderCell = (cell: unknown, rowIndex: number, colIndex: number, tagName: 'th' | 'td'): string => {
    if (covered.has(`${rowIndex}:${colIndex}`)) return '';
    const merge = mergeByStart.get(`${rowIndex}:${colIndex}`);
    const attrs: Record<string, string | undefined> = tagName === 'th' ? { scope: 'col' } : {};
    const classes: string[] = [];
    const styles: string[] = [];
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
    if (inFixedRow || inFixedColumn) styles.push('position:sticky');
    if (inFixedRow) {
      classes.push('xa-spangrid-cell--fixed-row');
      styles.push(`top:${rowOffsets[rowIndex] ?? 0}px`);
    }
    if (inFixedColumn) {
      classes.push('xa-spangrid-cell--fixed-col');
      styles.push(`left:${columnOffsets[colIndex] ?? 0}px`);
    }
    if (inFixedRow && inFixedColumn) classes.push('xa-spangrid-cell--fixed-corner');
    if (classes.length > 0) attrs.class = classes.join(' ');
    if (styles.length > 0) {
      styles.push(`z-index:${inFixedRow && inFixedColumn ? 4 : inFixedRow ? 3 : 2}`);
    }
    if (rowHeights[rowIndex]) styles.push(`height:${rowHeights[rowIndex]}px`);
    if (gridBorderColor) styles.push(`border-color:${gridBorderColor}`);
    appendSpanGridCellStyle(styles, cellRecord, gridBackground);
    if (styles.length > 0) attrs.style = styles.join(';') + ';';
    return tag(tagName, attrs, escapeHtml(spanGridCellText(cell)));
  };
  const header = normalized[0] ?? [];
  const bodyRows = normalized.length > 1 ? normalized.slice(1) : normalized;
  const headerHtml = tag('thead', {}, tag('tr', {}, header.map((cell, index) => renderCell(cell, 0, index, 'th')).join('')));
  const bodyHtml = tag(
    'tbody',
    {},
    bodyRows
      .map((row, bodyIndex) => {
        const rowIndex = bodyIndex + 1;
        return tag('tr', {}, row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex, 'td')).join(''));
      })
      .join(''),
  );
  const tableStyles: string[] = [];
  if (tableWidth > 0) tableStyles.push(`min-width:${tableWidth}px`);
  if (tableHeight > 0) tableStyles.push(`height:${tableHeight}px`);
  return tag('table', { class: 'xa-spangrid-table', style: tableStyles.length > 0 ? tableStyles.join(';') + ';' : undefined }, colgroup + headerHtml + bodyHtml);
}

function normalizeSpanGridMerges(input: unknown): StaticSpanGridMerge[] {
  if (!Array.isArray(input)) return [];
  const merges: StaticSpanGridMerge[] = [];
  input.forEach((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const record = raw as Record<string, unknown>;
    const start = objectRecord(record.start);
    const end = objectRecord(record.end);
    const startRow = toGridIndex(start?.row ?? record.row ?? record.r ?? record.startRow ?? record.row1);
    const startCol = toGridIndex(start?.col ?? start?.column ?? record.col ?? record.c ?? record.startCol ?? record.col1);
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
      endCol: normalizedEndCol,
    });
  });
  return merges;
}

function spanGridMergeSnapshot(merge: StaticSpanGridMerge): Record<string, Record<string, number>> {
  return {
    start: { row: merge.startRow, col: merge.startCol },
    end: { row: merge.endRow, col: merge.endCol },
  };
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function toGridIndex(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isInteger(number) && number >= 0 ? number : Number.NaN;
}

function renderStaticSpanGridColgroup(config: Record<string, unknown>, columnCount: number): string {
  const source = Array.isArray(config.columns) ? config.columns : Array.isArray(config.cols) ? config.cols : undefined;
  if (!source) return '';
  const columns = source.slice(0, columnCount).map((column) => {
    const width = spanGridColumnWidth(column);
    return width ? voidTag('col', { style: `width:${width}` }) : voidTag('col', {});
  });
  if (columns.length === 0) return '';
  return tag('colgroup', {}, columns.join(''));
}

function spanGridColumnPixelWidths(config: Record<string, unknown>, columnCount: number): number[] {
  const source = Array.isArray(config.columns) ? config.columns : Array.isArray(config.cols) ? config.cols : [];
  return Array.from({ length: columnCount }, (_, index) => {
    const column = source[index];
    return positivePixelValue(objectRecord(column)?.width ?? objectRecord(column)?.w ?? objectRecord(column)?.size ?? column, 120);
  });
}

function spanGridRowPixelHeights(config: Record<string, unknown>, rowCount: number): number[] {
  const source = Array.isArray(config.rows) ? config.rows : [];
  return Array.from({ length: rowCount }, (_, index) => {
    const row = source[index];
    return positivePixelValue(objectRecord(row)?.height ?? objectRecord(row)?.h ?? objectRecord(row)?.size ?? row, index === 0 ? 32 : 40);
  });
}

function spanGridOffsets(values: number[]): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  values.forEach((value, index) => {
    offsets[index] = cursor;
    cursor += Math.max(0, value);
  });
  return offsets;
}

function spanGridTotalPixels(values: number[]): number {
  return values.reduce((sum, value) => sum + Math.max(0, value), 0);
}

function appendSpanGridCellStyle(styles: string[], cell: Record<string, unknown> | undefined, fallbackBackground?: unknown): void {
  if (!cell) return;
  const background = safeCssValue(cssColor(cell.backColor ?? cell.backgroundColor ?? cell.bg ?? fallbackBackground));
  const foreground = safeCssValue(cssColor(cell.foreColor ?? cell.color ?? cell.fg));
  const font = safeCssValue(cell.font);
  const alignment = spanGridTextAlignment(cell.textAlign ?? cell.align ?? cell.alignment);
  if (background) styles.push(`background-color:${background}`);
  if (foreground) styles.push(`color:${foreground}`);
  if (font) styles.push(`font:${font}`);
  if (alignment.textAlign) styles.push(`text-align:${alignment.textAlign}`);
  if (alignment.verticalAlign) styles.push(`vertical-align:${alignment.verticalAlign}`);
}

function spanGridBorderColor(config: Record<string, unknown>): string | undefined {
  const border = objectRecord(config.gridBorder);
  return safeCssValue(cssColor(border?.leftColor ?? border?.topColor ?? border?.rightColor ?? border?.bottomColor ?? border?.color ?? config.borderColor));
}

function spanGridTextAlignment(value: unknown): { textAlign?: string; verticalAlign?: string } {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return {};
  let textAlign: string | undefined;
  let verticalAlign: string | undefined;
  if (text.includes('left') || text === 'start') textAlign = 'left';
  else if (text.includes('right') || text === 'end') textAlign = 'right';
  else if (text.includes('center') || text.includes('centre')) textAlign = 'center';
  if (text.includes('top')) verticalAlign = 'top';
  else if (text.includes('bottom')) verticalAlign = 'bottom';
  else if (text.includes('middle') || text.includes('center') || text.includes('centre')) verticalAlign = 'middle';
  return { textAlign, verticalAlign };
}

function normalizeSpanGridFixed(config: Record<string, unknown>, rowCount: number, columnCount: number): { rows: number; columns: number } {
  const fixed = objectRecord(config.fixed);
  const rowIndex = fixed ? gridCountValue(fixed.rowIndex ?? fixed.row ?? fixed.r) : Number.NaN;
  const columnIndex = fixed ? gridCountValue(fixed.columnIndex ?? fixed.colIndex ?? fixed.column ?? fixed.col ?? fixed.c) : Number.NaN;
  const rows = gridCountValue(config.fixedRows ?? config.fixedRowCount ?? fixed?.rows ?? fixed?.rowCount ?? fixed?.topRows);
  const columns = gridCountValue(config.fixedColumns ?? config.fixedColumnCount ?? fixed?.columns ?? fixed?.columnCount ?? fixed?.cols ?? fixed?.colCount ?? fixed?.leftColumns);
  return {
    rows: clampGridCount(Number.isInteger(rows) ? rows : Number.isInteger(rowIndex) ? rowIndex + 1 : 0, rowCount),
    columns: clampGridCount(Number.isInteger(columns) ? columns : Number.isInteger(columnIndex) ? columnIndex + 1 : 0, columnCount),
  };
}

function positivePixelValue(value: unknown, fallback: number): number {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : fallback;
  const text = String(value ?? '').trim();
  const match = /^(\d+(?:\.\d+)?)(?:px)?$/i.exec(text);
  if (!match) return fallback;
  const number = Number(match[1]);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function gridCountValue(value: unknown): number {
  if (value === undefined || value === null || value === '') return Number.NaN;
  const number = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isInteger(number) && number >= 0 ? number : Number.NaN;
}

function clampGridCount(value: number, max: number): number {
  return Math.max(0, Math.min(value, Math.max(0, max)));
}

function spanGridColumnWidth(column: unknown): string | undefined {
  if (typeof column === 'number' || typeof column === 'string') return cssSize(column);
  if (!column || typeof column !== 'object' || Array.isArray(column)) return undefined;
  const record = column as Record<string, unknown>;
  return cssSize(record.width ?? record.w ?? record.size);
}

function spanGridCellText(value: unknown): string {
  if (value === undefined || value === null) return '';
  const record = objectRecord(value);
  if (record) {
    const text = record.text ?? record.value ?? record.label ?? record.name;
    if (text !== undefined && text !== null) return String(text);
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function contextlessRichText(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  return linesToBreaks(String(value));
}

type ChartRow = { label: string; value: number; color?: string };

function chartRows(data: unknown): ChartRow[] {
  const plain = toPlainValue(data);
  if (Array.isArray(plain)) {
    return plain.map((item, index) => chartRowFromSimpleValue(item, index)).filter((row): row is ChartRow => Boolean(row));
  }
  if (!plain || typeof plain !== 'object') return [];
  const obj = plain as Record<string, unknown>;
  const labels = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  const datasets = Array.isArray(obj.datasets) ? obj.datasets : [];
  const first = datasets[0] && typeof datasets[0] === 'object' ? datasets[0] as Record<string, unknown> : undefined;
  const values = Array.isArray(first?.data) ? first.data.map(Number) : [];
  return values.map((value, index) => ({
    label: labels[index] ?? String(index + 1),
    value: Number.isFinite(value) ? value : 0,
    color: chartPreviewColor(first?.backgroundColor ?? first?.borderColor, index),
  }));
}

function chartRowFromSimpleValue(item: unknown, index: number): ChartRow | undefined {
  const plain = toPlainValue(item);
  if (plain && typeof plain === 'object' && !Array.isArray(plain)) {
    const record = plain as Record<string, unknown>;
    return {
      label: String(record.label ?? record.name ?? record.title ?? index + 1),
      value: finiteNumber(record.value ?? record.y ?? record.count ?? record.amount ?? record.data, 0),
      color: cssColor(record.color ?? record.backgroundColor ?? record.borderColor),
    };
  }
  if (plain === undefined || plain === null || plain === '') return undefined;
  return {
    label: String(index + 1),
    value: finiteNumber(plain, 0),
  };
}

const chartPreviewPalette = [
  'var(--xcon-chart-accent, var(--accent, #2563eb))',
  'var(--xcon-chart-blue, var(--blue, #0ea5e9))',
  'var(--xcon-chart-green, var(--green, #22c55e))',
  'var(--xcon-chart-yellow, var(--yellow, #f59e0b))',
  'var(--xcon-chart-red, var(--red, #ef4444))',
  '#8B5CF6',
  '#0EA5E9',
  '#F97316',
];

type ChartSeries = { label: string; rows: ChartRow[]; color: string };

function chartPreviewColor(value: unknown, index: number): string {
  if (Array.isArray(value)) return cssColor(value[index] ?? value[0]) ?? chartPreviewPalette[index % chartPreviewPalette.length];
  return cssColor(value) ?? chartPreviewPalette[index % chartPreviewPalette.length];
}

function chartSeriesRows(data: unknown): ChartSeries[] {
  const plain = toPlainValue(data);
  if (!plain || typeof plain !== 'object' || Array.isArray(plain)) return [];
  const obj = plain as Record<string, unknown>;
  const labels = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  const datasets = Array.isArray(obj.datasets) ? obj.datasets : [];
  return datasets.map((dataset, datasetIndex) => {
    const record = toPlainValue(dataset);
    if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
    const source = record as Record<string, unknown>;
    const values = Array.isArray(source.data) ? source.data.map(Number) : [];
    const rows = values.map((value, index) => ({
      label: labels[index] ?? String(index + 1),
      value: Number.isFinite(value) ? value : 0,
    }));
    if (rows.length === 0) return null;
    return {
      label: String(source.label ?? `Series ${datasetIndex + 1}`),
      rows,
      color: chartPreviewColor(source.borderColor ?? source.backgroundColor, datasetIndex),
    };
  }).filter((series): series is ChartSeries => Boolean(series));
}

type ChartPointRow = { label: string; x: number; y: number; r: number };

function chartPointRows(data: unknown): ChartPointRow[] {
  const plain = toPlainValue(data);
  if (!plain || typeof plain !== 'object' || Array.isArray(plain)) return [];
  const obj = plain as Record<string, unknown>;
  const labels = Array.isArray(obj.labels) ? obj.labels.map(String) : [];
  const datasets = Array.isArray(obj.datasets) ? obj.datasets : [];
  const first = datasets[0] && typeof datasets[0] === 'object' ? datasets[0] as Record<string, unknown> : undefined;
  const values = Array.isArray(first?.data) ? first.data : [];
  return values.map((value, index) => {
    const point = toPlainValue(value);
    if (point && typeof point === 'object' && !Array.isArray(point)) {
      const record = point as Record<string, unknown>;
      return {
        label: labels[index] ?? String(record.label ?? record.name ?? index + 1),
        x: finiteNumber(record.x, index + 1),
        y: finiteNumber(record.y ?? record.value, 0),
        r: Math.max(3, Math.min(22, finiteNumber(record.r ?? record.radius ?? record.size, 7))),
      };
    }
    const numeric = finiteNumber(value, 0);
    return {
      label: labels[index] ?? String(index + 1),
      x: index + 1,
      y: numeric,
      r: Math.max(4, Math.min(18, Math.sqrt(Math.abs(numeric) || 1) + 3)),
    };
  }).filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y) && Number.isFinite(row.r));
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function chartTypeKey(chartType: string): string {
  return String(chartType ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function renderStaticChartPreview(component: XconObject, data: unknown, chartType: string): string {
  const rows = chartRows(data);
  const type = chartTypeKey(chartType);
  if (type === 'scatter' || type === 'bubble') {
    const points = chartPointRows(data);
    if (points.length === 0) return rows.length === 0 ? '' : renderPointPreview(rows.map((row, index) => ({ label: row.label, x: index + 1, y: row.value, r: 7 })), 'xa-chart-preview', type === 'bubble');
    return renderPointPreview(points, 'xa-chart-preview', type === 'bubble');
  }
  if (rows.length === 0) return '';
  if (type === 'pie') return renderPiePreview(rows, 'xa-chart-preview');
  if (type === 'doughnut') return renderDoughnutPreview(rows, 'xa-chart-preview');
  if (type === 'line') {
    const series = chartSeriesRows(data);
    return series.length > 0 ? renderLineSeriesPreview(series, 'xa-chart-preview') : renderLinePreview(rows, 'xa-chart-preview');
  }
  if (type === 'radar') return renderRadarPreview(rows, 'xa-chart-preview');
  if (type === 'polararea') return renderPolarAreaPreview(rows, 'xa-chart-preview');
  return renderBarPreview(rows, 'xa-chart-preview');
}

function renderStaticDataViz(data: unknown, vizType: string, config: unknown = {}): string {
  const type = chartTypeKey(vizType);
  if (type === 'treemap') return renderTreemapPreview(dataVizRows(data), 'xa-dataviz-preview');
  if (type === 'sunburst') return renderSunburstPreview(dataVizRows(data), 'xa-dataviz-preview');
  if (type === 'forcegraph' || type === 'force') return renderForceGraphPreview(data, 'xa-dataviz-preview');
  if (type === 'scatter' || type === 'bubble') {
    const points = chartPointRows(data);
    if (points.length > 0) return renderPointPreview(points, 'xa-dataviz-preview', type === 'bubble');
  }
  const rows = chartRows(data);
  if (rows.length === 0) return tag('div', { class: 'xa-dataviz-empty' }, 'No data');
  if (type === 'pie') return renderPiePreview(rows, 'xa-dataviz-preview');
  if (type === 'doughnut') return renderDoughnutPreview(rows, 'xa-dataviz-preview');
  if (type === 'line') {
    const series = chartSeriesRows(data);
    return series.length > 0 ? renderLineSeriesPreview(series, 'xa-dataviz-preview') : renderLinePreview(rows, 'xa-dataviz-preview');
  }
  if (type === 'radar') return renderRadarPreview(rows, 'xa-dataviz-preview');
  if (type === 'polararea') return renderPolarAreaPreview(rows, 'xa-dataviz-preview');
  const preferred = objectRecord(config)?.type ?? objectRecord(config)?.fallbackType;
  if (preferred && chartTypeKey(String(preferred)) === 'line') return renderLinePreview(rows, 'xa-dataviz-preview');
  return renderBarPreview(rows, 'xa-dataviz-preview');
}

function dataVizRows(data: unknown): ChartRow[] {
  const rows: ChartRow[] = [];
  const visit = (value: unknown, index: number): void => {
    const plain = toPlainValue(value);
    if (Array.isArray(plain)) {
      plain.forEach((item, childIndex) => visit(item, childIndex));
      return;
    }
    const record = objectRecord(plain);
    if (!record) {
      const numeric = finiteNumber(plain, Number.NaN);
      if (Number.isFinite(numeric)) rows.push({ label: String(index + 1), value: numeric });
      return;
    }
    const children = Array.isArray(record.children)
      ? record.children
      : Array.isArray(record.items)
        ? record.items
        : Array.isArray(record.nodes)
          ? record.nodes
          : undefined;
    if (children && children.length > 0) {
      children.forEach((item, childIndex) => visit(item, childIndex));
      return;
    }
    const valueNumber = finiteNumber(record.value ?? record.count ?? record.size ?? record.amount ?? record.weight, 1);
    rows.push({
      label: String(record.label ?? record.name ?? record.title ?? record.id ?? index + 1),
      value: Math.max(0, valueNumber),
      color: cssColor(record.color ?? record.backgroundColor ?? record.fill),
    });
  };
  visit(data, 0);
  return rows.filter((row) => row.label && Number.isFinite(row.value)).slice(0, 24);
}

function renderTreemapPreview(rows: ChartRow[], className: string): string {
  const visibleRows = rows.filter((row) => row.value > 0).slice(0, 10);
  if (visibleRows.length === 0) return tag('div', { class: 'xa-dataviz-empty' }, 'No data');
  const total = Math.max(1, visibleRows.reduce((sum, row) => sum + row.value, 0));
  let x = 14;
  let y = 16;
  let rowHeight = 70;
  const rects = visibleRows.map((row, index) => {
    const width = Math.max(48, Math.round((row.value / total) * 470));
    if (x + width > 506) {
      x = 14;
      y += 82;
      rowHeight = 60;
    }
    const safeWidth = Math.min(width, 506 - x);
    const rect = tag('rect', {
      x: String(x),
      y: String(y),
      width: String(safeWidth),
      height: String(rowHeight),
      rx: '8',
      fill: row.color ?? chartPreviewPalette[index % chartPreviewPalette.length],
      opacity: '0.9',
    }, '') +
      tag('text', { x: String(x + 12), y: String(y + 26), 'font-size': '12', 'font-weight': '700', fill: '#ffffff' }, escapeHtml(row.label)) +
      tag('text', { x: String(x + 12), y: String(y + 46), 'font-size': '11', fill: '#ffffff', opacity: '0.85' }, escapeHtml(trimNumber(row.value)));
    x += safeWidth + 8;
    return rect;
  }).join('');
  return tag('svg', { class: `${className} ${className}--treemap`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, rects);
}

function renderSunburstPreview(rows: ChartRow[], className: string): string {
  const visibleRows = rows.filter((row) => row.value > 0).slice(0, 10);
  if (visibleRows.length === 0) return tag('div', { class: 'xa-dataviz-empty' }, 'No data');
  const total = Math.max(1, visibleRows.reduce((sum, row) => sum + row.value, 0));
  let current = -90;
  const slices = visibleRows.map((row, index) => {
    const span = (row.value / total) * 360;
    const path = polarAreaPath(260, 95, 72, current, current + span);
    const labelAngle = current + span / 2;
    const labelPoint = polarPoint(260, 95, 94, labelAngle);
    current += span;
    return tag('path', {
      d: path,
      fill: row.color ?? chartPreviewPalette[index % chartPreviewPalette.length],
      stroke: '#ffffff',
      'stroke-width': '2',
    }, '') +
      tag('text', { x: trimNumber(labelPoint.x), y: trimNumber(labelPoint.y), 'font-size': '10', 'text-anchor': 'middle', fill: '#334155' }, escapeHtml(row.label.slice(0, 10)));
  }).join('');
  const center = tag('circle', { cx: '260', cy: '95', r: '34', fill: '#ffffff', stroke: '#e2e8f0' }, '') +
    tag('text', { x: '260', y: '99', 'font-size': '12', 'font-weight': '700', 'text-anchor': 'middle', fill: '#0f172a' }, 'Total');
  return tag('svg', { class: `${className} ${className}--sunburst`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, slices + center);
}

function renderForceGraphPreview(data: unknown, className: string): string {
  const plain = toPlainValue(data);
  const record = objectRecord(plain);
  const rawNodes = Array.isArray(record?.nodes) ? record.nodes : dataVizRows(data).map((row) => ({ id: row.label, label: row.label, value: row.value, color: row.color }));
  const nodes = rawNodes.slice(0, 12).map((node, index) => {
    const nodeRecord = objectRecord(toPlainValue(node)) ?? {};
    return {
      id: String(nodeRecord.id ?? nodeRecord.key ?? nodeRecord.name ?? nodeRecord.label ?? index + 1),
      label: String(nodeRecord.label ?? nodeRecord.name ?? nodeRecord.id ?? index + 1),
      color: cssColor(nodeRecord.color ?? nodeRecord.backgroundColor) ?? chartPreviewPalette[index % chartPreviewPalette.length],
    };
  });
  if (nodes.length === 0) return tag('div', { class: 'xa-dataviz-empty' }, 'No data');
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length);
    positions.set(node.id, { x: 260 + Math.cos(angle) * 170, y: 95 + Math.sin(angle) * 60 });
  });
  const rawLinks = Array.isArray(record?.links) ? record.links : Array.isArray(record?.edges) ? record.edges : [];
  const links = rawLinks.map((link) => {
    const linkRecord = objectRecord(toPlainValue(link)) ?? {};
    const source = String(linkRecord.source ?? linkRecord.from ?? '');
    const target = String(linkRecord.target ?? linkRecord.to ?? '');
    const a = positions.get(source);
    const b = positions.get(target);
    if (!a || !b) return '';
    return tag('line', { x1: trimNumber(a.x), y1: trimNumber(a.y), x2: trimNumber(b.x), y2: trimNumber(b.y), stroke: '#94a3b8', 'stroke-width': '2', opacity: '0.7' }, '');
  }).join('');
  const nodeHtml = nodes.map((node) => {
    const point = positions.get(node.id) ?? { x: 260, y: 95 };
    return tag('circle', { cx: trimNumber(point.x), cy: trimNumber(point.y), r: '14', fill: node.color, stroke: '#ffffff', 'stroke-width': '2' }, '') +
      tag('text', { x: trimNumber(point.x), y: trimNumber(point.y + 30), 'font-size': '10', 'text-anchor': 'middle', fill: '#334155' }, escapeHtml(node.label.slice(0, 14)));
  }).join('');
  return tag('svg', { class: `${className} ${className}--force-graph`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, links + nodeHtml);
}

function renderBarPreview(rows: ChartRow[], className: string): string {
  const visibleRows = rows.slice(0, 12);
  const max = Math.max(1, ...visibleRows.map((row) => row.value));
  const min = Math.min(0, ...visibleRows.map((row) => row.value));
  const range = Math.max(1, max - min);
  const baseline = 150 - ((0 - min) / range) * 120;
  const bars = visibleRows.map((row, index) => {
    const valueY = 150 - ((row.value - min) / range) * 120;
    const height = Math.max(4, Math.round(Math.abs(baseline - valueY)));
    const x = 24 + index * 38;
    const y = Math.min(baseline, valueY);
    return tag('rect', { x: String(x), y: trimNumber(y), width: '24', height: String(height), rx: '4', fill: row.color ?? chartPreviewPalette[index % chartPreviewPalette.length] }, '') +
      tag('text', { x: String(x + 12), y: '168', 'text-anchor': 'middle', 'font-size': '10', fill: '#666' }, escapeHtml(row.label));
  }).join('');
  return tag('svg', { class: className, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, tag('line', { x1: '16', y1: trimNumber(baseline), x2: '500', y2: trimNumber(baseline), stroke: '#ddd' }, '') + bars);
}

function renderLinePreview(rows: ChartRow[], className: string, color = chartPreviewPalette[0]): string {
  return renderLineSeriesPreview([{ label: 'Series 1', rows, color }], className);
}

function renderLineSeriesPreview(series: ChartSeries[], className: string): string {
  const visibleSeries = series.filter((item) => item.rows.length > 0).slice(0, 6);
  const allRows = visibleSeries.flatMap((item) => item.rows);
  if (allRows.length === 0) return '';
  const max = Math.max(1, ...allRows.map((row) => row.value));
  const min = Math.min(0, ...allRows.map((row) => row.value));
  const range = Math.max(1, max - min);
  const lines = visibleSeries.map((item) => {
    const rows = item.rows.slice(0, 12);
    const step = rows.length > 1 ? 460 / (rows.length - 1) : 0;
    const points = rows.map((row, index) => `${30 + index * step},${150 - ((row.value - min) / range) * 120}`).join(' ');
    const circles = points.split(' ').filter(Boolean).map((point) => {
      const [cx, cy] = point.split(',');
      return tag('circle', { cx, cy, r: '4', fill: item.color }, '');
    }).join('');
    return tag('polyline', { points, fill: 'none', stroke: item.color, 'stroke-width': '4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, '') + circles;
  }).join('');
  const labels = (visibleSeries[0]?.rows ?? []).slice(0, 12).map((row, index) => {
    const step = (visibleSeries[0]?.rows.length ?? 0) > 1 ? 460 / ((visibleSeries[0]?.rows.length ?? 1) - 1) : 0;
    return tag('text', { x: trimNumber(30 + index * step), y: '172', 'text-anchor': 'middle', 'font-size': '10', fill: '#666' }, escapeHtml(row.label));
  }).join('');
  return tag('svg', { class: className, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, tag('line', { x1: '16', y1: '150', x2: '500', y2: '150', stroke: '#ddd' }, '') + lines + labels);
}

function renderPiePreview(rows: Array<{ label: string; value: number }>, className: string): string {
  const total = Math.max(1, rows.reduce((sum, row) => sum + Math.max(0, row.value), 0));
  const values = rows.slice(0, 8);
  const colors = chartPreviewPalette;
  let angle = -Math.PI / 2;
  const slices = values.map((row, index) => {
    const length = Math.max(0, row.value) / total * Math.PI * 2;
    const start = angle;
    const end = angle + length;
    angle = end;
    return tag('path', {
      d: polarAreaPath(95, 95, 66, start, end),
      fill: colors[index % colors.length],
      stroke: '#fff',
      'stroke-width': '2',
    }, '');
  }).join('');
  return tag('svg', { class: `${className} ${className}--pie`, viewBox: '0 0 190 190', 'aria-hidden': 'true' }, tag('circle', { cx: '95', cy: '95', r: '68', fill: '#f8fafc' }, '') + slices);
}

function renderDoughnutPreview(rows: Array<{ label: string; value: number }>, className: string): string {
  const total = Math.max(1, rows.reduce((sum, row) => sum + Math.max(0, row.value), 0));
  let offset = 25;
  const slices = rows.slice(0, 8).map((row, index) => {
    const length = Math.max(0, row.value) / total * 100;
    const color = chartPreviewPalette[index % chartPreviewPalette.length];
    const slice = tag('circle', { cx: '95', cy: '95', r: '58', fill: 'none', stroke: color, 'stroke-width': '46', 'stroke-dasharray': `${length} ${100 - length}`, 'stroke-dashoffset': String(offset) }, '');
    offset -= length;
    return slice;
  }).join('');
  return tag('svg', { class: `${className} ${className}--doughnut`, viewBox: '0 0 190 190', 'aria-hidden': 'true' }, tag('circle', { cx: '95', cy: '95', r: '58', fill: 'none', stroke: '#eee', 'stroke-width': '46' }, '') + slices + tag('circle', { cx: '95', cy: '95', r: '28', fill: '#fff' }, ''));
}

function renderRadarPreview(rows: Array<{ label: string; value: number }>, className: string): string {
  const values = rows.slice(0, 8);
  const max = Math.max(1, ...values.map((row) => Math.abs(row.value)));
  const center = 95;
  const radius = 66;
  const grid = [0.33, 0.66, 1].map((scale) =>
    tag('polygon', { points: radarPoints(values.length, radius * scale, center), fill: 'none', stroke: '#e5e7eb', 'stroke-width': '1' }, ''),
  ).join('');
  const axes = values.map((_, index) => {
    const point = radarPoint(index, values.length, radius, center);
    return tag('line', { x1: String(center), y1: String(center), x2: trimNumber(point.x), y2: trimNumber(point.y), stroke: '#e5e7eb', 'stroke-width': '1' }, '');
  }).join('');
  const dataPoints = values.map((row, index) => {
    const point = radarPoint(index, values.length, radius * Math.max(0, row.value) / max, center);
    return `${trimNumber(point.x)},${trimNumber(point.y)}`;
  }).join(' ');
  const markers = dataPoints.split(' ').filter(Boolean).map((point) => {
    const [cx, cy] = point.split(',');
    return tag('circle', { cx, cy, r: '3.5', fill: chartPreviewPalette[0] }, '');
  }).join('');
  const labels = values.map((row, index) => {
    const point = radarPoint(index, values.length, radius + 13, center);
    return tag('text', { x: trimNumber(point.x), y: trimNumber(point.y + 3), 'text-anchor': 'middle', 'font-size': '9', fill: '#64748b' }, escapeHtml(row.label));
  }).join('');
  return tag(
    'svg',
    { class: `${className} ${className}--radar`, viewBox: '0 0 190 190', 'aria-hidden': 'true' },
    grid + axes + tag('polygon', { points: dataPoints, fill: 'rgba(37,99,235,0.18)', stroke: chartPreviewPalette[0], 'stroke-width': '3', 'stroke-linejoin': 'round' }, '') + markers + labels,
  );
}

function radarPoints(count: number, radius: number, center: number): string {
  return Array.from({ length: Math.max(3, count) }, (_, index) => {
    const point = radarPoint(index, Math.max(3, count), radius, center);
    return `${trimNumber(point.x)},${trimNumber(point.y)}`;
  }).join(' ');
}

function radarPoint(index: number, count: number, radius: number, center: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(3, count);
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function renderPolarAreaPreview(rows: Array<{ label: string; value: number }>, className: string): string {
  const values = rows.slice(0, 8);
  const max = Math.max(1, ...values.map((row) => Math.max(0, row.value)));
  const center = 95;
  const startOffset = -Math.PI / 2;
  const step = (Math.PI * 2) / Math.max(1, values.length);
  const colors = chartPreviewPalette;
  const slices = values.map((row, index) => {
    const radius = 26 + (Math.max(0, row.value) / max) * 56;
    const start = startOffset + index * step + 0.02;
    const end = startOffset + (index + 1) * step - 0.02;
    return tag('path', { d: polarAreaPath(center, center, radius, start, end), fill: colors[index % colors.length], opacity: '0.9', stroke: '#fff', 'stroke-width': '2' }, '');
  }).join('');
  return tag('svg', { class: `${className} ${className}--polar-area`, viewBox: '0 0 190 190', 'aria-hidden': 'true' }, tag('circle', { cx: String(center), cy: String(center), r: '82', fill: '#f8fafc' }, '') + slices + tag('circle', { cx: String(center), cy: String(center), r: '4', fill: '#fff' }, ''));
}

function polarAreaPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? '1' : '0';
  return `M ${trimNumber(cx)} ${trimNumber(cy)} L ${trimNumber(start.x)} ${trimNumber(start.y)} A ${trimNumber(radius)} ${trimNumber(radius)} 0 ${largeArc} 1 ${trimNumber(end.x)} ${trimNumber(end.y)} Z`;
}

function polarPoint(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function renderPointPreview(points: ChartPointRow[], className: string, bubble: boolean): string {
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
  const circles = visible.map((point, index) => {
    const cx = 36 + ((point.x - minX) / dx) * 440;
    const cy = 150 - ((point.y - minY) / dy) * 120;
    const radius = bubble ? point.r : 4.5;
    return tag('circle', {
      cx: trimNumber(cx),
      cy: trimNumber(cy),
      r: trimNumber(radius),
      fill: colors[index % colors.length],
      opacity: bubble ? '0.72' : '0.9',
      stroke: '#fff',
      'stroke-width': bubble ? '2' : '1',
    }, '') + tag('title', {}, escapeHtml(`${point.label}: ${point.x}, ${point.y}`));
  }).join('');
  return tag(
    'svg',
    { class: `${className} ${className}--${bubble ? 'bubble' : 'scatter'}`, viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    tag('line', { x1: '24', y1: '150', x2: '500', y2: '150', stroke: '#ddd' }, '') +
      tag('line', { x1: '32', y1: '22', x2: '32', y2: '154', stroke: '#ddd' }, '') +
      circles,
  );
}

function renderFlipbookPages(component: XconObject, pages: number, context: RenderContext, pageStyle = ''): string {
  const pageData = component.get('pageData');
  if (Array.isArray(pageData) && pageData.length > 0) {
    return pageData.map((pageInfo, index) => tag('div', { class: 'page', 'data-page': String(index + 1), style: pageStyle || undefined }, renderFlipbookPageContent(pageInfo, context))).join('');
  }
  const folder = String(component.get('pageFolder') ?? 'content/magazine').replace(/\/+$/g, '');
  return Array.from({ length: pages }, (_, index) => {
    const page = index + 1;
    const src = sanitizeUrl(`${folder}/${page}.jpg`, context.options);
    const image = src ? voidTag('img', { src, alt: `Page ${page}` }) : tag('div', { class: 'flipbook-page-placeholder' }, `Page ${page}`);
    return tag('div', { class: 'page', 'data-page': String(page), style: pageStyle || undefined }, image);
  }).join('');
}

function renderFlipbookPageContent(pageInfo: unknown, context: RenderContext): string {
  const plain = toPlainValue(pageInfo);
  if (!plain || typeof plain !== 'object' || Array.isArray(plain)) return escapeHtml(String(plain ?? ''));
  const page = plain as Record<string, unknown>;
  const type = String(page.type ?? 'image');
  if (type === 'html') return context.options.allowHtml ? sanitizeHtml(String(page.content ?? '')) : escapeHtml(String(page.content ?? ''));
  if (type === 'text') {
    return tag('div', { style: 'padding:20px;height:100%;overflow-y:auto;font-family:Arial,sans-serif;' }, renderOptional('h2', page.title) + renderOptional('p', page.content));
  }
  if (type === 'mixed') {
    const src = sanitizeUrl(page.image, context.options);
    return tag(
      'div',
      { style: 'padding:20px;height:100%;display:flex;flex-direction:column;' },
      (src ? voidTag('img', { src, alt: attr(page.title ?? ''), style: 'width:100%;height:60%;object-fit:cover;margin-bottom:10px;' }) : '') +
        tag('div', { style: 'flex:1;overflow-y:auto;' }, renderOptional('h3', page.title) + renderOptional('p', page.content)),
    );
  }
  const src = sanitizeUrl(page.src, context.options);
  return src ? voidTag('img', { src, alt: attr(page.alt ?? ''), style: 'width:100%;height:100%;object-fit:cover;' }) : tag('div', { class: 'flipbook-page-placeholder' }, 'Page content');
}

function renderFlipbookControls(component: XconObject, key: string, pages: number): string {
  const showMiniatures = !isFalseLike(component.get('showMiniatures'));
  const showZoom = !isFalseLike(component.get('showZoom'));
  const showFullscreen = !isFalseLike(component.get('showFullscreen'));
  return tag(
    'div',
    { id: `controls-${key}`, class: 'flipbook-controls' },
    tag('button', { type: 'button', class: 'flipbook-control-btn', 'data-xcon-flipbook-prev': '' }, '‹') +
      tag('div', { class: 'flipbook-page-info' }, tag('span', { id: `current-page-${key}` }, '1') + ' / ' + tag('span', { id: `total-pages-${key}` }, String(pages))) +
      tag('button', { type: 'button', class: 'flipbook-control-btn', 'data-xcon-flipbook-next': '' }, '›') +
      (showMiniatures ? tag('button', { type: 'button', class: 'flipbook-control-btn', 'data-xcon-flipbook-miniatures': '' }, '⊞') : '') +
      (showZoom ? tag('button', { type: 'button', class: 'flipbook-control-btn', 'data-xcon-flipbook-zoom': '' }, '⊕') : '') +
      (showFullscreen ? tag('button', { type: 'button', class: 'flipbook-control-btn', 'data-xcon-flipbook-fullscreen': '' }, '⛶') : ''),
  );
}

function renderFlipbookMiniatures(component: XconObject, key: string, miniatureId: string, pages: number, context: RenderContext): string {
  const pageData = component.get('pageData');
  const folder = String(component.get('pageFolder') ?? 'content/magazine').replace(/\/+$/g, '');
  const items = Array.from({ length: pages }, (_, index) => {
    const plain = Array.isArray(pageData) ? toPlainValue(pageData[index]) : null;
    const thumb = plain && typeof plain === 'object' && !Array.isArray(plain) ? (plain as Record<string, unknown>).thumbnail : undefined;
    const src = sanitizeUrl(thumb ?? `${folder}/${index + 1}.jpg`, context.options);
    return tag('button', { type: 'button', class: 'flipbook-miniature', 'data-xcon-flipbook-page': String(index + 1) }, src ? voidTag('img', { src, alt: `Page ${index + 1}` }) : escapeHtml(String(index + 1)));
  }).join('');
  return tag('div', { id: miniatureId, class: 'flipbook-miniatures', 'data-xcon-flipbook-miniatures-list': key }, items);
}

function renderStaticMap(component: XconObject, context: RenderContext): string {
  const lat = Number(component.get('latitude') ?? 37.5665) || 37.5665;
  const lng = Number(component.get('longitude') ?? 126.978) || 126.978;
  const zoom = Number(component.get('zoom') ?? 10) || 10;
  const tileLayer = String(component.get('tileLayer') ?? 'OpenStreetMap');
  const provider = String(component.get('provider') ?? component.get('mapProvider') ?? '').trim().toLowerCase();
  const liveLeaflet = provider === 'leaflet' && context.options.allowExternalResources;
  const markers = parseArrayValue(component.get('markers')).slice(0, 20);
  const heatmap = parseArrayValue(component.get('heatmap')).slice(0, 200);
  const polylines = parseArrayValue(component.get('polylines')).slice(0, 50);
  const polygons = parseArrayValue(component.get('polygons')).slice(0, 50);
  const markerIcons = toPlainValue(component.get('markerIcons') ?? {});
  const rawSnapshot = component.get('snapshotUrl') ?? component.get('staticImage') ?? component.get('mapImage') ?? component.get('image') ?? component.get('src');
  const snapshotUrl = sanitizeUrl(stripCssUrl(String(rawSnapshot ?? '')), context.options);
  const snapshotAlt = String(component.get('snapshotAlt') ?? component.get('alt') ?? `Map centered at ${lat}, ${lng}`);
  const snapshotFit = mapSnapshotFit(component.get('snapshotFit') ?? component.get('objectFit'));
  const snapshotPosition = safeCssValue(component.get('objectPosition') ?? component.get('snapshotPosition')) ?? 'center';
  const attributionText = component.get('attribution') ?? (liveLeaflet ? openStreetMapAttribution : undefined);
  const layerHtml = snapshotUrl
    ? voidTag('img', {
        class: 'xa-map-snapshot',
        src: snapshotUrl,
        alt: snapshotAlt,
        loading: 'lazy',
        decoding: 'async',
        style: `object-fit:${snapshotFit};object-position:${snapshotPosition};`,
      }) + (attributionText ? tag('span', { class: 'xa-map-attribution' }, escapeHtml(String(attributionText))) : '')
    : [
        tag('span', { class: 'xa-map-layer xa-map-water xa-map-water--river', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-park xa-map-park--north', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-park xa-map-park--south', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-road xa-map-road--main', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-road xa-map-road--cross', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-road xa-map-road--vertical', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-road xa-map-road--ring', 'aria-hidden': 'true' }, ''),
        tag('span', { class: 'xa-map-layer xa-map-label xa-map-label--north' }, 'Park'),
        tag('span', { class: 'xa-map-layer xa-map-label xa-map-label--center' }, escapeHtml(tileLayer)),
        tag('span', { class: 'xa-map-layer xa-map-label xa-map-label--south' }, 'District'),
        tag('span', { class: 'xa-map-attribution' }, 'static map preview'),
      ].join('');
  const markerHtml = markers.length
    ? markers.map((marker, index) => {
        const plain = toPlainValue(marker);
        const obj = plain && typeof plain === 'object' && !Array.isArray(plain) ? plain as Record<string, unknown> : {};
        const label = String(obj.title ?? obj.label ?? obj.popup ?? index + 1);
        const markerLat = Number(obj.lat ?? obj.latitude);
        const markerLng = Number(obj.lng ?? obj.longitude);
        const left = Number.isFinite(markerLng) ? Math.max(8, Math.min(92, 50 + (markerLng - lng) * 900)) : 20 + (index % 5) * 15;
        const top = Number.isFinite(markerLat) ? Math.max(8, Math.min(92, 50 - (markerLat - lat) * 900)) : 25 + Math.floor(index / 5) * 14;
        return tag('span', { class: 'xa-map-marker', title: label, style: `left:${left}%;top:${top}%;` }, escapeHtml(label.slice(0, 2)));
      }).join('')
    : tag('span', { class: 'xa-map-marker', style: 'left:50%;top:50%;' }, '●');
  return tag(
    'div',
    {
      class: `xa-map-static${snapshotUrl ? ' xa-map-static--snapshot' : ''}${liveLeaflet ? ' xa-map-static--leaflet' : ''}`,
      'data-latitude': String(lat),
      'data-longitude': String(lng),
      'data-zoom': String(zoom),
      'data-tile-layer': tileLayer,
      'data-xcon-leaflet-map': liveLeaflet ? '' : undefined,
      'data-xcon-map-provider': liveLeaflet ? 'leaflet' : undefined,
      'data-xcon-map-tile-url': liveLeaflet ? leafletTileUrl(component, context) : undefined,
      'data-xcon-map-attribution': liveLeaflet ? String(attributionText ?? openStreetMapAttribution) : undefined,
      'data-xcon-map-markers': liveLeaflet ? jsonAttr(markers.map(mapMarkerData)) : undefined,
      'data-xcon-map-heatmap': liveLeaflet && heatmap.length ? jsonAttr(heatmap) : undefined,
      'data-xcon-map-polylines': liveLeaflet && polylines.length ? jsonAttr(polylines) : undefined,
      'data-xcon-map-polygons': liveLeaflet && polygons.length ? jsonAttr(polygons) : undefined,
      'data-xcon-map-clustering': liveLeaflet ? String(booleanOption(component.get('clustering'), false)) : undefined,
      'data-xcon-map-marker-icons': liveLeaflet && hasJsonData(markerIcons) ? jsonAttr(markerIcons) : undefined,
      'data-xcon-map-show-controls': liveLeaflet ? String(booleanOption(component.get('showControls'), true)) : undefined,
      'data-xcon-map-enable-zoom': liveLeaflet ? String(booleanOption(component.get('enableZoom'), true)) : undefined,
      'data-xcon-map-enable-pan': liveLeaflet ? String(booleanOption(component.get('enablePan'), true)) : undefined,
    },
    layerHtml + markerHtml,
  );
}

function mapSnapshotFit(value: unknown): string {
  const fit = String(value ?? 'cover').trim().toLowerCase();
  return ['cover', 'contain', 'fill', 'none', 'scale-down'].includes(fit) ? fit : 'cover';
}

function leafletTileUrl(component: XconObject, context: RenderContext): string {
  const explicit = sanitizeUrl(String(component.get('tileUrl') ?? component.get('tileTemplate') ?? ''), context.options);
  if (explicit) return explicit;
  const layer = String(component.get('tileLayer') ?? '').trim().toLowerCase();
  if (layer.includes('carto')) return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  return openStreetMapTileUrl;
}

function mapMarkerData(marker: unknown, index: number): Record<string, unknown> {
  const plain = toPlainValue(marker);
  const obj = plain && typeof plain === 'object' && !Array.isArray(plain) ? plain as Record<string, unknown> : {};
  const lat = Number(obj.lat ?? obj.latitude);
  const lng = Number(obj.lng ?? obj.longitude);
  return {
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    label: String(obj.label ?? obj.title ?? obj.popup ?? index + 1),
  };
}

function renderStaticCalendar(component: XconObject): string {
  const locale = String(component.get('locale') ?? 'ko');
  const today = new Date();
  const title = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}`;
  const headings = (locale.startsWith('ko') ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day) => tag('th', {}, day)).join('');
  const first = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const eventsByDay = calendarEventsByDay(component, today.getFullYear(), today.getMonth());
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - first + 1;
    const label = day > 0 && day <= last ? String(day) : '';
    const events = label ? eventsByDay.get(day) ?? [] : [];
    const eventHtml = events.slice(0, 3).map((event) => tag('div', { class: 'fc-event' }, escapeHtml(event))).join('');
    return tag('td', { class: label === String(today.getDate()) ? 'fc-today' : undefined }, label ? tag('button', { type: 'button', class: 'fc-daygrid-day-number' }, label) + eventHtml : '');
  });
  const rows = Array.from({ length: 6 }, (_, row) => tag('tr', {}, cells.slice(row * 7, row * 7 + 7).join(''))).join('');
  return tag('div', { class: 'xa-calendar-static' }, tag('div', { class: 'fc-header-toolbar' }, tag('button', { type: 'button', class: 'fc-button-primary' }, '‹') + tag('strong', {}, title) + tag('button', { type: 'button', class: 'fc-button-primary' }, '›')) + tag('table', { class: 'fc-scrollgrid' }, tag('thead', {}, tag('tr', {}, headings)) + tag('tbody', {}, rows)));
}

function calendarEventsByDay(component: XconObject, year: number, month: number): Map<number, string[]> {
  const events = parseArrayValue(component.get('events'));
  const byDay = new Map<number, string[]>();
  events.forEach((event, index) => {
    const plain = toPlainValue(event);
    if (!plain || typeof plain !== 'object' || Array.isArray(plain)) return;
    const obj = plain as Record<string, unknown>;
    const day = calendarEventDay(obj.start ?? obj.date, year, month);
    if (!day) return;
    const list = byDay.get(day) ?? [];
    list.push(String(obj.title ?? obj.name ?? `Event ${index + 1}`));
    byDay.set(day, list);
  });
  return byDay;
}

function calendarEventDay(value: unknown, year: number, month: number): number | null {
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return null;
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

function parseArrayValue(value: unknown): unknown[] {
  const plain = toPlainValue(value);
  if (Array.isArray(plain)) return plain;
  if (typeof plain === 'string') {
    try {
      const parsed = JSON.parse(plain);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function renderImage(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  context: RenderContext,
  state: RenderState = { parentFlow: false },
): string {
  const slideshow = imageSlideshow(component, context);
  const src = sanitizeUrl(component.get('src') ?? component.get('image'), context.options) ?? slideshow.images[0];
  if (!src) return tag('div', attrsWithStyle(attrs, 'overflow:hidden'), escapeHtml(String(component.get('alt') ?? '')));
  const fallback = imageFallbackSrc(component.get('fallback') ?? component.get('fallbackImage'), context);
  const image = voidTag('img', {
    src,
    alt: attr(component.get('alt') ?? ''),
    loading: attr(state.eagerMedia ? 'eager' : (component.get('loading') ?? 'lazy')),
    draggable: state.eagerMedia ? 'false' : undefined,
    'data-xcon-image-fallback': fallback ?? undefined,
    'data-xcon-image-slideshow': slideshow.enabled ? 'true' : undefined,
    'data-xcon-image-slideshow-images': slideshow.enabled ? JSON.stringify(slideshow.images) : undefined,
    'data-xcon-image-slideshow-duration': slideshow.enabled ? String(slideshow.duration) : undefined,
    'data-xcon-image-slideshow-mode': slideshow.enabled ? slideshow.mode : undefined,
    style: imageStyle(component),
  });
  return tag('div', attrsWithStyle({ ...attrs, style: stripImageRootChrome(attrs.style) }, imageRootChromeStyle()), image + imageOverlay(component));
}

function imageFallbackSrc(value: unknown, context: RenderContext): string | null {
  const raw = isXconObject(value) ? value.get('src') ?? value.get('image') : value;
  return sanitizeUrl(raw, context.options);
}

function imageSlideshow(component: XconObject, context: RenderContext): { enabled: boolean; images: string[]; duration: number; mode: string } {
  const slideshow = component.get('slideshow');
  const source = isXconObject(slideshow) ? slideshow : null;
  const enabled = source ? booleanOption(source.get('enabled'), false) : isTruthy(component.get('animation') ?? component.get('imageAnimation'));
  const rawImages = source ? source.get('images') : component.get('images');
  const images = Array.isArray(rawImages)
    ? rawImages
        .map((item) => sanitizeUrl(isXconObject(item) ? item.get('src') ?? item.get('image') : item, context.options))
        .filter((item): item is string => Boolean(item))
    : [];
  const duration = imageSlideshowDuration(source?.get('duration') ?? component.get('duration') ?? component.get('animationDuration'));
  const mode = String(source?.get('mode') ?? component.get('animationMode') ?? 'loop').trim().toLowerCase() || 'loop';
  return { enabled: enabled && images.length > 1, images, duration, mode };
}

function imageSlideshowDuration(value: unknown): number {
  if (value === undefined || value === null || value === '') return 3000;
  const text = String(value).trim().toLowerCase();
  const numeric = Number(text.endsWith('ms') ? text.slice(0, -2) : text.endsWith('s') ? Number(text.slice(0, -1)) * 1000 : value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 3000;
  return numeric < 100 ? numeric * 1000 : numeric;
}

function stripImageRootChrome(style: string | undefined): string | undefined {
  if (!style) return undefined;
  const blocked = new Set(['object-fit', 'object-position']);
  const declarations = style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator <= 0) return false;
      return !blocked.has(declaration.slice(0, separator).trim().toLowerCase());
    });
  return declarations.join(';') || undefined;
}

function imageStyle(component: XconObject): string {
  const declarations = ['width:100%', 'height:100%', 'display:block', `object-fit:${imageObjectFit(component)}`, 'border-radius:0'];
  appendCss(declarations, 'object-position', component.get('objectPosition') ?? imageObjectPosition(component.get('imageAlign')));
  declarations.push('transition:transform .45s ease');
  return declarations.join(';');
}

function imageOverlay(component: XconObject): string {
  const tagText = component.get('overlayTag');
  const title = component.get('overlayTitle');
  const sub = component.get('overlaySub');
  const cta = component.get('overlayCta');
  const tagHtml = tagText ? tag('span', { class: 'xa-al-img-overlay-tag', style: imageOverlayTagStyle() }, escapeHtml(String(tagText))) : '';
  const overlayBody =
    title || sub || cta
      ? tag(
          'div',
          { class: 'xa-al-img-overlay', style: imageOverlayStyle() },
          (title ? tag('div', { class: 'xa-al-img-overlay-title', style: imageOverlayTitleStyle() }, linesToBreaks(String(title))) : '') +
            (sub ? tag('div', { class: 'xa-al-img-overlay-sub', style: imageOverlaySubStyle() }, linesToBreaks(String(sub))) : '') +
            (cta ? tag('span', { class: 'xa-al-img-overlay-cta', style: imageOverlayCtaStyle() }, escapeHtml(String(cta))) : ''),
        )
      : '';
  return tagHtml + overlayBody;
}

function imageRootChromeStyle(): string {
  return 'position:relative;overflow:hidden;box-sizing:border-box;background:var(--surface2)';
}

function imageOverlayTagStyle(): string {
  return 'position:absolute;left:14px;top:14px;z-index:3;background:var(--accent);color:#fff;font-size:10px;font-weight:800;line-height:1;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:4px';
}

function imageOverlayStyle(): string {
  return 'position:absolute;inset:0;background:linear-gradient(to top, rgba(28,23,16,.88) 0%, rgba(28,23,16,0) 58%);display:flex;flex-direction:column;justify-content:flex-end;padding:18px 20px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.28);z-index:2;pointer-events:none';
}

function imageOverlayTitleStyle(): string {
  return 'font-family:"Playfair Display",Georgia,serif;font-size:18px;font-weight:700;line-height:1.2;color:#fff';
}

function imageOverlaySubStyle(): string {
  return 'font-size:12px;line-height:1.35;margin-top:4px;color:rgba(255,255,255,.72);white-space:pre-line';
}

function imageOverlayCtaStyle(): string {
  return 'display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#fff';
}

function imageObjectFit(component: XconObject): string {
  const value = String(component.get('objectFit') ?? component.get('fit') ?? 'contain').trim().toLowerCase();
  const map: Record<string, string> = {
    auto: 'contain',
    none: 'none',
    center: 'none',
    stretch: 'fill',
    fit: 'contain',
    fill: 'cover',
    zoom: 'cover',
    tile: 'none',
  };
  return map[value] ?? value;
}

function imageObjectPosition(value: unknown): string {
  const align = String(value ?? 'center');
  const map: Record<string, string> = {
    topleft: 'top left',
    topcenter: 'top center',
    topright: 'top right',
    middleleft: 'center left',
    middlecenter: 'center center',
    middleright: 'center right',
    bottomleft: 'bottom left',
    bottomcenter: 'bottom center',
    bottomright: 'bottom right',
    center: 'center center',
  };
  return map[align] ?? align;
}

function renderBanner(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  context: RenderContext,
  depth: number,
  keyPath: string,
): string {
  const slides = bannerSlides(component);
  const autoplay = bannerAutoplay(component);
  const orientation = bannerOrientation(component);
  const chrome = bannerChrome(component);
  const bannerAttrs = attrsWithStyle(
    {
      ...attrsWithClass(attrs, chrome === 'landing' ? 'xa-al-banner--landing' : ''),
      'data-xcon-carousel': 'true',
      'data-orientation': orientation,
      'data-auto-scroll': String(autoplay.enabled),
      'data-duration': String(autoplay.interval),
      'data-loop': String(autoplay.loop),
      'data-rolling': String(autoplay.rolling),
      'data-banner-chrome': chrome,
      'data-slide-count': String(slides.length),
    },
    bannerStyle(component),
  );
  return tag('section', bannerAttrs, renderSlides(component, context, depth, keyPath, slides, autoplay) + renderBannerIndicator(component, slides.length));
}

interface ExtCarouselItem {
  image: string | null;
  title: string;
  description: string;
  alt: string;
}

function renderExtCarousel(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const items = extCarouselItemsFrom(component, context);
  const showDots = booleanOption(component.get('showDots'), true);
  const showArrows = booleanOption(component.get('showArrows'), true);
  const autoplay = carouselAutoplay(component);
  const carouselAttrs = {
    ...attrsWithClass(attrs, 'xa-ext-carousel-host'),
    'data-xcon-ext-carousel': 'true',
    'data-carousel-autoplay': String(autoplay.enabled),
    'data-carousel-interval': String(autoplay.interval),
  };
  const slides = items.length
    ? items.map((item, index) => renderExtCarouselItem(item, index)).join('')
    : tag(
        'div',
        { class: 'carousel-item carousel-empty', style: 'display:block;text-align:center;padding:24px;color:#888;' },
        '슬라이드가 없습니다. ' + tag('code', { style: 'font-size:12px;' }, 'items') + ' 배열을 설정하세요.',
      );
  const arrows =
    showArrows && items.length > 0
      ? tag('button', { type: 'button', class: 'carousel-prev', 'aria-label': '이전', 'data-xcon-carousel-prev': '' }, '‹') +
        tag('button', { type: 'button', class: 'carousel-next', 'aria-label': '다음', 'data-xcon-carousel-next': '' }, '›')
      : '';
  const dots =
    showDots && items.length > 0
      ? tag(
          'div',
          { class: 'carousel-dots' },
          items
            .map((_, index) =>
              tag(
                'button',
                {
                  type: 'button',
                  class: `carousel-dot${index === 0 ? ' active' : ''}`,
                  'data-xcon-carousel-dot': String(index),
                  'aria-label': `Slide ${index + 1}`,
                  'aria-current': index === 0 ? 'true' : 'false',
                },
                '',
              ),
            )
            .join(''),
        )
      : '';
  return tag('div', carouselAttrs, tag('div', { class: 'carousel-container' }, tag('div', { class: 'carousel-content' }, slides) + arrows + dots));
}

function carouselAutoplay(component: XconObject): { enabled: boolean; interval: number } {
  const autoplay = component.get('autoplay');
  if (isXconObject(autoplay)) {
    return {
      enabled: booleanOption(autoplay.get('enabled'), false),
      interval: Number(autoplay.get('interval') ?? component.get('interval') ?? component.get('duration') ?? 3000) || 3000,
    };
  }
  return {
    enabled: isTruthy(autoplay ?? component.get('autoPlay')),
    interval: Number(component.get('interval') ?? component.get('duration') ?? 3000) || 3000,
  };
}

function renderExtCarouselItem(item: ExtCarouselItem, index: number): string {
  const image = item.image ? voidTag('img', { class: 'carousel-img', src: item.image, alt: item.alt }) : '';
  const title = item.title ? tag('h3', { class: 'carousel-title' }, escapeHtml(item.title)) : '';
  const description = item.description ? tag('p', { class: 'carousel-desc' }, escapeHtml(item.description)) : '';
  return tag(
    'div',
    {
      class: 'carousel-item',
      'data-carousel-item-index': String(index),
      style: index === 0 ? 'display:block' : 'display:none',
    },
    image + title + description,
  );
}

function extCarouselItemsFrom(component: XconObject, context: RenderContext): ExtCarouselItem[] {
  const raw = component.get('items') ?? component.get('slides') ?? component.get('views');
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): ExtCarouselItem | null => {
      if (typeof item === 'string') {
        const image = sanitizeUrl(item, context.options);
        return { image, title: '', description: '', alt: '' };
      }
      if (!isXconObject(item)) return null;
      const image = carouselMediaUrl(item, context);
      const title = carouselText(item, ['title', 'label', 'name', 'text']);
      const description = carouselText(item, ['description', 'subtitle', 'caption', 'body']);
      const alt = carouselText(item, ['alt', 'ariaLabel']) || title;
      return { image, title, description, alt };
    })
    .filter((item): item is ExtCarouselItem => item !== null);
}

function carouselMediaUrl(item: XconObject, context: RenderContext): string | null {
  const direct = item.get('image') ?? item.get('src') ?? item.get('url') ?? item.get('uri') ?? item.get('path') ?? item.get('poster');
  const nested = isXconObject(direct)
    ? direct.get('image') ?? direct.get('src') ?? direct.get('url') ?? direct.get('uri') ?? direct.get('path')
    : direct;
  return sanitizeUrl(nested, context.options);
}

function carouselText(item: XconObject, fields: string[]): string {
  for (const field of fields) {
    const value = item.get(field);
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  }
  return '';
}

function booleanOption(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  return !isFalseLike(value);
}

function bannerStyle(component: XconObject): string {
  const declarations: string[] = [];
  const height = cssSize(component.get('bannerHeight') ?? component.get('height'));
  if (height) declarations.push(`height:${height}`, `min-height:${height}`);
  const radius = borderRadius(component);
  if (radius) declarations.push(`border-radius:${radius}`);
  return declarations.join(';');
}

function bannerSlides(component: XconObject): XconValue[] {
  const slides = component.get('slides') ?? component.get('items') ?? component.get('views');
  return Array.isArray(slides) ? slides : [];
}

function bannerOrientation(component: XconObject): string {
  const value = String(component.get('direction') ?? component.get('orientation') ?? 'horizontal');
  return value === 'vertical' ? 'vertical' : 'horizontal';
}

function bannerChrome(component: XconObject): string {
  const variant = component.get('variant') ?? component.get('bannerVariant') ?? component.get('bannerChrome');
  const value = typeof variant === 'string' ? variant.trim().toLowerCase() : '';
  if (value === 'hero' || value === 'landing') return 'landing';
  if (value) return value;
  return 'default';
}

function bannerAutoplay(component: XconObject): { enabled: boolean; interval: number; loop: boolean; rolling: boolean } {
  const autoplay = component.get('autoplay');
  if (isXconObject(autoplay)) {
    return {
      enabled: isTruthy(autoplay.get('enabled')),
      interval: Number(autoplay.get('interval') ?? autoplay.get('duration') ?? component.get('duration') ?? 3000) || 3000,
      loop: autoplay.get('loop') === undefined ? true : isTruthy(autoplay.get('loop')),
      rolling: isTruthy(autoplay.get('rolling') ?? component.get('rolling')),
    };
  }
  return {
    enabled: isTruthy(component.get('autoScroll') ?? autoplay),
    interval: Number(component.get('duration') ?? 3000) || 3000,
    loop: component.get('loop') === undefined ? true : isTruthy(component.get('loop')),
    rolling: isTruthy(component.get('rolling')),
  };
}

function bannerIndicatorConfig(component: XconObject): { show: boolean; color: string } {
  const indicator = component.get('indicator');
  if (isXconObject(indicator)) {
    return {
      show: indicator.get('show') === undefined ? true : isTruthy(indicator.get('show')),
      color: cssColor(indicator.get('color') ?? component.get('indicatorColor') ?? '255,255,255,255') ?? '#fff',
    };
  }
  return {
    show: indicator === undefined ? true : !isFalseLike(indicator),
    color: cssColor(component.get('indicatorColor') ?? '255,255,255,255') ?? '#fff',
  };
}

function renderVideo(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const mode = String(component.get('videoViewMode') ?? component.get('mode') ?? '').trim().toLowerCase();
  if (mode === 'showcase') return renderVideoShowcase(attrs, context);

  const src = sanitizeUrl(component.get('src') ?? component.get('url'), context.options) ?? undefined;
  return tag(
    'div',
    attrs,
    tag(
      'video',
      {
        style: 'width:100%;height:100%;border-radius:4px',
        src,
        controls: component.get('controls') === undefined || !isFalseLike(component.get('controls')) ? '' : undefined,
        autoplay: isTruthy(component.get('autoplay')) ? '' : undefined,
        loop: isTruthy(component.get('loop')) ? '' : undefined,
        muted: isTruthy(component.get('muted')) ? '' : undefined,
      },
      '브라우저가 비디오를 지원하지 않습니다.',
    ),
  );
}

function renderVideoShowcase(attrs: Record<string, string | undefined>, context: RenderContext): string {
  const key = String(attrs['data-key'] ?? 'videoView').replace(/[^a-zA-Z0-9_-]/g, '_');
  const poster = videoImage('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', context, '');
  const thumbs = [
    ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60', '42:18', true],
    ['https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=60', '28:05', false],
    ['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&q=60', '15:40', false],
    ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&q=60', '1:02:33', false],
    ['https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=200&q=60', '08:22', false],
    ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=60', '33:17', false],
  ] as const;
  const thumbStrip = thumbs
    .map(([src, duration, active]) =>
      tag(
        'div',
        { class: `vt-item${active ? ' active' : ''}` },
        `${videoImage(src, context, '')}${tag('span', { class: 'vt-dur' }, duration)}`,
      ),
    )
    .join('');
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const skipIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-8.84"/></svg>';
  const volumeIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  const fullscreenIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const player = tag(
    'div',
    { class: 'video-player', id: `xa_vv_player_${key}` },
    tag(
      'div',
      { class: 'video-player__poster', id: `xa_vv_poster_${key}`, 'data-xa-vv-poster': key },
      `${poster}${tag(
        'div',
        { class: 'video-player__poster-inner' },
        tag('div', { class: 'video-player__play-btn' }, playIcon) +
          tag('div', { class: 'video-player__title' }, 'Mountain Timelapse · 4K') +
          tag('div', { class: 'video-player__sub' }, '42:18 · Nature Collection · 2026'),
      )}`,
    ) +
      tag(
        'div',
        { class: 'video-controls' },
        tag(
          'div',
          { class: 'video-progress', id: `xa_vv_prog_${key}` },
          tag('div', { class: 'video-progress__fill', id: `xa_vv_fill_${key}`, style: 'width:35%' }, '') +
            tag('div', { class: 'video-progress__thumb', id: `xa_vv_thumb_${key}`, style: 'right:calc(65% - 6px)' }, ''),
        ) +
          tag(
            'div',
            { class: 'video-ctrl-row' },
            tag('button', { type: 'button', class: 'vc-btn vc-fill', id: `xa_vv_vcplay_${key}`, 'aria-label': 'Play' }, playIcon) +
              tag('button', { type: 'button', class: 'vc-btn vc-fill', 'aria-label': 'Back 10 seconds' }, skipIcon) +
              tag('span', { class: 'vc-time', id: `xa_vv_time_${key}` }, '0:00 / 42:18') +
              tag('span', { class: 'vc-spacer' }, '') +
              tag(
                'div',
                { class: 'vc-vol' },
                tag('button', { type: 'button', class: 'vc-btn', 'aria-label': 'Volume' }, volumeIcon) +
                  tag('div', { class: 'vc-vol-slider' }, tag('div', { class: 'vc-vol-fill' }, '')),
              ) +
              tag('button', { type: 'button', class: 'vc-btn', 'aria-label': 'Fullscreen' }, fullscreenIcon),
          ),
      ),
  );
  return tag(
    'div',
    {
      ...attrsWithClass(videoShowcaseAttrs(attrs), 'xa-al-vv-root'),
      'data-xa-vv-key': key,
    },
    tag('div', { class: 'vv-showcase' }, player + tag('div', { class: 'sub-label' }, 'Playlist') + tag('div', { class: 'video-thumb-strip' }, thumbStrip)),
  );
}

function videoImage(src: string, context: RenderContext, altText: string): string {
  const safe = sanitizeUrl(src, context.options);
  return safe ? voidTag('img', { src: safe, alt: altText }) : '';
}

function videoShowcaseAttrs(attrs: Record<string, string | undefined>): Record<string, string | undefined> {
  const style = stripStyleDeclarations(attrs.style, new Set(['height', 'min-height']));
  return attrsWithStyle({ ...attrs, style }, 'height:auto;min-height:0;width:100%;max-width:100%;position:relative;box-sizing:border-box');
}

function renderSlides(
  component: XconObject,
  context: RenderContext,
  depth: number,
  keyPath: string,
  slides = bannerSlides(component),
  autoplay = bannerAutoplay(component),
): string {
  const renderSlide = (slide: XconValue, index: number, cloned = false): string =>
    tag(
      'div',
      { class: 'banner-slide', 'data-key': `${keyPath}~slides${cloned ? 'clone' : index}~slide`, 'data-xcon-clone': cloned ? 'true' : undefined },
      isXconObject(slide)
        ? renderComponent(slide, context, depth, { parentFlow: true, fillParent: true, eagerMedia: true }, `${keyPath}~slides${cloned ? 'clone' : index}`)
        : renderComponent(
            fromJSONObject({ type: 'image', src: slide }),
            context,
            depth,
            { parentFlow: true, fillParent: true, eagerMedia: true },
            `${keyPath}~slides${cloned ? 'clone' : index}`,
          ),
    );

  const rendered = slides.map((slide, index) => renderSlide(slide, index));
  if (autoplay.rolling && autoplay.loop && slides.length > 1) rendered.push(renderSlide(slides[0], 0, true));
  const body = rendered.length > 0 ? rendered.join('') : renderChildren(component, context, depth, { parentFlow: true }, keyPath);
  return tag('div', { class: 'banner-container' }, body);
}

function renderBannerIndicator(component: XconObject, count: number): string {
  const config = bannerIndicatorConfig(component);
  if (!config.show || count <= 0) return '';
  const dots = Array.from({ length: count }, (_, index) =>
    tag(
      'button',
      {
        type: 'button',
        class: 'banner-indicator',
        'data-xcon-banner-dot': String(index),
        'aria-label': `Slide ${index + 1}`,
        'aria-current': index === 0 ? 'true' : 'false',
        style: `background:${config.color};opacity:${index === 0 ? '1' : '0.5'}`,
      },
      '',
    ),
  ).join('');
  return tag('div', { class: 'banner-indicators' }, dots);
}

function renderList(component: XconObject, context: RenderContext, depth: number, keyPath: string): string {
  const items = component.get('items');
  if (Array.isArray(items)) {
    const renderedItems = items.map((item, index) =>
      isXconObject(item)
        ? renderComponent(item, context, depth, { parentFlow: true }, `${keyPath}~items${index}`)
        : tag('div', { 'data-key': `${keyPath}~items${index}` }, escapeHtml(String(item ?? ''))),
    );
    return renderListWithHeader(renderedItems, component, renderedItems.length);
  }

  const rows = listRows(component);
  if (rows.length > 0) {
    const renderedItems = rows.map((row, index) => {
      const layout = listLayoutForRow(component, row);
      return layout
        ? renderTemplatedListItem(component, layout, row, context, depth, `${keyPath}~items${index}`, index, index === rows.length - 1)
        : renderDefaultListItem(component, row, `${keyPath}~items${index}`, index, index === rows.length - 1);
    });
    return renderListWithHeader(renderedItems, component, rows.length);
  }

  return renderChildren(component, context, depth, { parentFlow: true }, keyPath);
}

function listRootAttrs(component: XconObject, attrs: Record<string, string | undefined>): Record<string, string | undefined> {
  const al = component.get('al');
  const variant = String(component.get('xListVariant') ?? component.get('variant') ?? '').trim().toLowerCase();
  const minHeight = isXconObject(al) ? al.get('minHeight') : undefined;
  const maxHeight = isXconObject(al) ? al.get('maxHeight') : undefined;
  if (variant !== 'showcase' && !minHeight && !maxHeight) return attrs;

  const style = stripStyleDeclarations(attrs.style, new Set(['height', 'min-height']));
  const declarations = ['height:auto', 'min-height:0'];
  appendCss(declarations, 'min-height', cssSize(minHeight));
  appendCss(declarations, 'max-height', cssSize(maxHeight));
  declarations.push('align-self:stretch', 'width:100%', 'max-width:100%', 'min-width:0', 'box-sizing:border-box');
  return attrsWithAppendedStyle({ ...attrs, style }, declarations.join(';'));
}

function renderListWithHeader(items: string[], component: XconObject, itemCount: number): string {
  const hasHeader = showsListHeader(component);
  return (hasHeader ? renderListHeader(component, itemCount) : '') + renderListItems(items, component, hasHeader);
}

function renderListHeader(component: XconObject, itemCount: number): string {
  const title = String(component.get('title') ?? '');
  return tag(
    'div',
    { class: 'xlist-header', style: 'background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:12px 16px;font-size:16px;font-weight:bold;display:flex;justify-content:space-between;align-items:center' },
    tag('span', {}, escapeHtml(title)) +
      tag(
        'span',
        { style: 'background:rgba(255,255,255,0.2);padding:4px 8px;border-radius:12px;font-size:12px' },
        `${itemCount}개`,
      ),
  );
}

function showsListHeader(component: XconObject): boolean {
  const value = component.get('hidenavbar') ?? component.get('hideNavbar');
  return value === false || value === 'false' || value === 0 || value === '0';
}

function renderListItems(items: string[], component: XconObject, hasHeader = false): string {
  return tag(
    'div',
    { class: 'xlist-content', style: listContentStyle(component, hasHeader) },
    tag('div', { class: 'xlist-items-container', style: listItemsContainerStyle(component) }, items.join('')),
  );
}

function renderTemplatedListItem(
  component: XconObject,
  cellTemplate: XconObject,
  row: XconValue,
  context: RenderContext,
  depth: number,
  keyPath: string,
  index = 0,
  last = true,
): string {
  const size = listItemSize(component, cellTemplate);
  const itemStyle = listItemStyle(component, size, index, last);
  const layoutType = String(cellTemplate.get('layoutType') ?? '').trim();
  const body = layoutType === 'youChat' || layoutType === 'meChat'
    ? renderListChatItem(cellTemplate, row, layoutType, context)
    : cellTemplate
        .entries()
        .filter(([key, value]) => key !== 'itemSize' && key !== 'rowHeight' && key !== 'rowWidth' && key !== 'layoutType' && isXconObject(value))
        .map(([key, value]) => renderComponent(substituteTemplateValue(value, row) as XconObject, context, depth, { parentFlow: false }, `${keyPath}~${key}`))
        .join('');
  const separator = renderListSeparator(component, index, last, layoutType);

  return tag('div', { class: 'xlist-item', style: itemStyle, 'data-key': keyPath }, body + separator);
}

function listContentStyle(component: XconObject, hasHeader = false): string {
  const direction = listDirection(component);
  const scrollAxis = direction === 'row' ? 'overflow-x:auto;overflow-y:hidden' : 'overflow-y:auto;overflow-x:hidden';
  const height = hasHeader ? 'calc(100% - 50px)' : '100%';
  return joinStyles(`position:relative;width:100%;height:${height}`, scrollAxis) ?? '';
}

function listItemsContainerStyle(component: XconObject): string {
  const direction = listDirection(component);
  const offset = listOffset(component);
  const offsetStyle = offset ? `;margin-left:${offset.x};margin-top:${offset.y}` : '';
  if (direction === 'row') {
    return `display:flex;flex-direction:row;align-items:stretch;height:100%;width:max-content${offsetStyle}`;
  }
  return `display:flex;flex-direction:column;width:100%${offsetStyle}`;
}

function listItemStyle(component: XconObject, size: { width?: string; height?: string }, index: number, last: boolean): string {
  const direction = listDirection(component);
  const separator = listSeparatorConfig(component, direction);
  const separatorSize = separator?.size;
  const declarations = ['position:relative', 'overflow:hidden', 'border:none', 'border-radius:6px', 'background:transparent', 'transition:all .2s', 'box-sizing:border-box', 'cursor:pointer'];
  if (direction === 'row') {
    if (size.width) declarations.push(`min-width:${size.width}`, `width:${size.width}`);
    declarations.push(size.height ? `height:${size.height}` : 'height:100%');
    declarations.push('flex-shrink:0');
    if (!last && separatorSize) declarations.push(`margin-right:${separatorSize}`);
  } else {
    declarations.push('width:100%');
    if (size.height) declarations.push(`min-height:${size.height}`);
    if (!last && separatorSize) declarations.push(`margin-bottom:${separatorSize}`);
  }
  if (index < 0) return declarations.join(';');
  return declarations.join(';');
}

function listOffset(component: XconObject): { x: string; y: string } | null {
  const offset = component.get('offset');
  let x: unknown;
  let y: unknown;
  if (Array.isArray(offset)) {
    [x, y] = offset;
  } else if (isXconObject(offset)) {
    x = offset.get('x');
    y = offset.get('y');
  } else if (offset && typeof offset === 'object') {
    x = (offset as Record<string, XconValue>).x;
    y = (offset as Record<string, XconValue>).y;
  }
  x ??= component.get('offsetX');
  y ??= component.get('offsetY');
  const hasOffset = x !== undefined || y !== undefined;
  if (!hasOffset) return null;
  return { x: cssSize(x ?? 0) ?? '0px', y: cssSize(y ?? 0) ?? '0px' };
}

function renderDefaultListItem(component: XconObject, row: XconValue, keyPath: string, index: number, last: boolean): string {
  const itemStyle = listItemStyle(component, listItemSize(component, new XconObject()), index, last);
  const fields = isXconObject(row)
    ? row
        .entries()
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, value]) => tag('div', {}, `${escapeHtml(key)}: ${escapeHtml(String(value ?? ''))}`))
        .join('')
    : tag('div', {}, escapeHtml(String(row ?? '')));
  return tag(
    'div',
    { class: 'xlist-item', style: itemStyle, 'data-key': keyPath },
    tag('div', { style: 'padding:12px' }, fields) + renderListSeparator(component, index, last, ''),
  );
}

function renderListSeparator(component: XconObject, _index: number, last: boolean, layoutType: string): string {
  if (last || layoutType === 'youChat' || layoutType === 'meChat') return '';
  const direction = listDirection(component);
  const separator = listSeparatorConfig(component, direction);
  if (!separator) return '';
  const half = Math.floor(Number.parseFloat(separator.size) / 2) || 0;
  const style =
    direction === 'row'
      ? `position:absolute;right:-${half}px;top:8px;bottom:8px;width:${separator.size};background:${separator.color};pointer-events:none`
      : `position:absolute;bottom:-${half}px;left:8px;right:8px;height:${separator.size};background:${separator.color};pointer-events:none`;
  return tag('div', { class: `xlist-separator xlist-separator--${direction}`, style }, '');
}

function listSeparatorConfig(component: XconObject, direction: 'row' | 'column'): { size: string; color: string } | null {
  const separator = component.get('separator');
  const style = String(isXconObject(separator) ? separator.get('style') ?? 'line' : component.get('separatorStyle') ?? 'line').trim().toLowerCase();
  if (style === 'none' || style === 'hidden') return null;
  const rawSize = isXconObject(separator)
    ? separator.get('size') ?? 1
    : direction === 'row'
      ? component.get('separatorWidth') ?? 1
      : component.get('separatorHeight') ?? 1;
  const numeric = Number(rawSize);
  if (Number.isFinite(numeric) && numeric <= 0) return null;
  const size = cssSize(rawSize) ?? '1px';
  const color = cssColor(isXconObject(separator) ? separator.get('color') : component.get('separatorColor')) ?? 'rgb(200 200 200 / 1)';
  return { size, color };
}

function renderListChatItem(layout: XconObject, row: XconValue, layoutType: string, context: RenderContext): string {
  const side = layoutType === 'meChat' ? 'me' : 'you';
  const name = listBoundText(layout.get('name'), row, 'name');
  const text = listBoundText(layout.get('text') ?? '{{item.text}}', row, 'text');
  const image = listBoundText(layout.get('image'), row, 'image');
  const timestamp = listBoundText(layout.get('timestamp'), row, 'timestamp');
  return tag('div', { class: `xlist-chat-row xlist-chat-row--${side}` }, renderChatRowContent({ name, text, timestamp, image, context }));
}

function renderChatRowContent(options: { name: string; text: string; timestamp: string; image?: unknown; context: RenderContext }): string {
  const image = sanitizeUrl(options.image, options.context.options);
  const avatarHtml = image ? voidTag('img', { class: 'xlist-chat-avatar', src: image, alt: options.name }) : '';
  const nameHtml = options.name ? tag('div', { class: 'xlist-chat-name' }, escapeHtml(options.name)) : '';
  const timeHtml = options.timestamp ? tag('div', { class: 'xlist-chat-time' }, escapeHtml(options.timestamp)) : '';
  return avatarHtml + tag('div', { class: 'xlist-chat-stack' }, nameHtml + tag('div', { class: 'xlist-chat-bubble' }, escapeHtml(options.text)) + timeHtml);
}

function renderListChatItemLegacy(layout: XconObject, row: XconValue, layoutType: string): string {
  const side = layoutType === 'meChat' ? 'me' : 'you';
  const name = listBoundText(layout.get('name'), row, 'name');
  const text = listBoundText(layout.get('text') ?? '{{item.text}}', row, 'text');
  const timestamp = listBoundText(layout.get('timestamp'), row, 'timestamp');
  const nameHtml = name ? tag('div', { class: 'xlist-chat-name' }, escapeHtml(name)) : '';
  const timeHtml = timestamp ? tag('div', { class: 'xlist-chat-time' }, escapeHtml(timestamp)) : '';
  return tag(
    'div',
    { class: `xlist-chat-row xlist-chat-row--${side}` },
    tag('div', { class: 'xlist-chat-stack' }, nameHtml + tag('div', { class: 'xlist-chat-bubble' }, escapeHtml(text)) + timeHtml),
  );
}

function listBoundText(template: XconValue | undefined, row: XconValue, fallbackKey: string): string {
  if (template !== undefined && template !== null && template !== '') return String(substituteTemplateValue(template, row));
  const value = rowField(row, fallbackKey);
  return value === undefined || value === null ? '' : String(value);
}

function rowField(row: XconValue, key: string): XconValue | undefined {
  if (isXconObject(row)) return row.get(key);
  if (row && typeof row === 'object' && !Array.isArray(row)) return (row as Record<string, XconValue>)[key];
  return undefined;
}

function listDirection(component: XconObject): 'row' | 'column' {
  const raw = String(component.get('direction') ?? component.get('orientation') ?? 'vertical').trim().toLowerCase();
  if (raw === 'horizontal' || raw === 'row') return 'row';
  return 'column';
}

function listRows(component: XconObject): XconValue[] {
  const direct = component.get('tabledata');
  if (Array.isArray(direct)) return direct;

  const dataTemplate = component.get('dataTemplate');
  if (!isXconObject(dataTemplate)) return [];
  const template = dataTemplate.get('template');
  if (isXconObject(template)) {
    const rows = template.get('tabledata');
    if (Array.isArray(rows)) return rows;
  }

  return [];
}

function listCellTemplate(component: XconObject): XconObject | null {
  const templates = component.get('templates');
  if (isXconObject(templates)) {
    const cell = templates.get('cell');
    if (isXconObject(cell)) return cell;
  }

  const cellTemplate = component.get('cellTemplate');
  if (isXconObject(cellTemplate)) return cellTemplate;

  const cellLayout = component.get('cellLayout');
  if (isXconObject(cellLayout)) return cellLayout;
  return null;
}

function listLayoutForRow(component: XconObject, row: XconValue): XconObject | null {
  const layoutName = rowField(row, '_layout');
  if (typeof layoutName === 'string' && layoutName.trim()) {
    const layout = component.get(layoutName.trim());
    if (isXconObject(layout)) return layout;
  }
  return listCellTemplate(component);
}

function listItemSize(component: XconObject, cellTemplate: XconObject): { width?: string; height?: string } {
  const size = component.get('itemSize');
  const fallback = cellTemplate.get('itemSize');
  const source = isXconObject(size) ? size : isXconObject(fallback) ? fallback : null;
  const width = source ? cssSize(source.get('width')) : cssSize(cellTemplate.get('rowWidth') ?? component.get('rowWidth'));
  const height = source ? cssSize(source.get('height')) : cssSize(cellTemplate.get('rowHeight') ?? component.get('rowHeight'));
  if (!source && !width && !height) return {};
  return {
    width,
    height,
  };
}

function substituteTemplateValue(value: XconValue, row: XconValue): XconValue {
  if (typeof value === 'string') {
    return value.replaceAll(/\{\{\s*item\.([A-Za-z0-9_.-]+)\s*\}\}/g, (_match, path: string) => String(templateValue(row, path) ?? ''));
  }
  if (Array.isArray(value)) return value.map((item) => substituteTemplateValue(item, row));
  if (isXconObject(value)) {
    const next = new XconObject();
    value.forEach((child, key) => next.add(key, substituteTemplateValue(child, row)));
    return next;
  }
  return value;
}

function templateValue(row: XconValue, path: string): XconValue | undefined {
  const parts = path.split('.').filter(Boolean);
  let current: XconValue | undefined = row;
  for (const part of parts) {
    if (!isXconObject(current)) return undefined;
    current = current.get(part);
  }
  return current;
}

function renderBadge(component: XconObject, attrs: Record<string, string | undefined>): string {
  if (isShowcaseVariant(component)) {
    const badges = [
      ['bdg bdg-purple', 'Purple'],
      ['bdg bdg-green', 'Active'],
      ['bdg bdg-red', 'Error'],
      ['bdg bdg-yellow', 'Warning'],
      ['bdg bdg-blue', 'Info'],
      ['bdg bdg-outline', 'Default'],
    ];
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-badge-host xa-ext-badge-host--showcase'),
      tag('div', { class: 'badges-row', style: 'margin-bottom:12px' }, badges.map(([className, label]) => tag('span', { class: className }, label)).join('')) +
        tag(
          'div',
          { class: 'badges-row', style: 'margin-bottom:16px' },
          tag('span', { class: 'bdg bdg-green bdg--dot' }, 'Online') + tag('span', { class: 'bdg bdg-yellow bdg--dot' }, 'Away') + tag('span', { class: 'bdg bdg-red bdg--dot' }, 'Busy') + tag('span', { class: 'bdg bdg-outline bdg--dot' }, 'Offline'),
        ) +
        tag(
          'div',
          { class: 'badges-row' },
          renderNotificationBadge('Notifications', iconSvg('bell', 'none'), '3') + renderNotificationBadge('Messages', iconSvg('chat', 'none'), '12') + renderNotificationBadge('Mail', iconSvg('mail', 'none'), '99+'),
        ),
    );
  }
  const variant = String(component.get('variant') ?? 'filled').trim().toLowerCase();
  const size = String(component.get('size') ?? 'medium').trim().toLowerCase();
  const extraSize = size === 'small' ? 'font-size:10px;padding:2px 8px' : size === 'large' ? 'font-size:13px;padding:5px 12px' : '';
  const rawColor = component.get('color') ?? '#dc3545';
  const rawBackground = component.get('backgroundColor') ?? '#dc3545';
  const color = cssColor(rawColor);
  const background = cssColor(rawBackground);
  const hasCustomBackground = background !== undefined && String(rawBackground).trim().toLowerCase() !== '#dc3545';
  const hasCustomColor = color !== undefined && String(rawColor).trim().toLowerCase() !== '#dc3545';
  const className = variant === 'outline' || (!hasCustomBackground && hasCustomColor) ? 'bdg bdg-outline' : variant === 'dot' ? 'bdg bdg-green bdg--dot' : hasCustomBackground ? 'bdg' : 'bdg bdg-red';
  const style = [extraSize, hasCustomBackground && variant !== 'outline' ? `background:${background};color:#fff;border:1px solid transparent` : '', (variant === 'outline' || (!hasCustomBackground && hasCustomColor)) && color ? `color:${color};border-color:${color}` : '']
    .filter(Boolean)
    .join(';');
  const label = variant === 'dot' ? '' : escapeHtml(String(component.get('text') ?? component.get('label') ?? ''));
  return tag('div', attrsWithClass(attrs, 'xa-ext-badge-host xa-ext-badge-host--single'), tag('span', { class: className, style: style || undefined }, label));
}

function renderNotificationBadge(label: string, icon: string, count: string): string {
  return tag('div', { class: 'notif-badge-wrap' }, tag('button', { type: 'button', class: 'notif-icon-btn', 'aria-label': label }, icon) + tag('span', { class: 'notif-count' }, escapeHtml(count)));
}

function renderAlert(component: XconObject, attrs: Record<string, string | undefined>): string {
  if (isShowcaseVariant(component)) {
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-alert-host xa-ext-alert-host--showcase'),
      renderAlertBlock('info', 'ℹ️', 'Information', 'Your session will expire in 30 minutes. Save your work.', true) +
        renderAlertBlock('success', '✅', 'Success', 'Changes saved successfully to the cloud.', true) +
        renderAlertBlock('warning', '⚠️', 'Warning', 'Disk usage at 82%. Consider cleaning up old files.', true) +
        renderAlertBlock('error', '🚨', 'Error', 'Failed to connect to server. Check your network.', true),
    );
  }
  const variant = String(component.get('severity') ?? component.get('alertType') ?? component.get('variant') ?? 'info').trim().toLowerCase();
  const safeVariant = ['info', 'success', 'warning', 'error'].includes(variant) ? variant : 'info';
  const icons: Record<string, string> = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '🚨' };
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-alert-host xa-ext-alert-host--single'),
    renderAlertSingleBlock(
      safeVariant,
      isFalseLike(component.get('showIcon')) ? '' : icons[safeVariant],
      String(component.get('title') ?? ''),
      String(component.get('message') ?? component.get('content') ?? component.get('text') ?? ''),
      isTruthy(component.get('dismissible')),
    ),
  );
}

function renderAlertBox(variant: string, title: string, message: string, attrs?: Record<string, string | undefined>): string {
  const safeVariant = ['info', 'success', 'warning', 'error'].includes(variant) ? variant : 'info';
  const icons: Record<string, string> = { info: 'ⓘ', success: '✓', warning: '!', error: '×' };
  return tag(
    'aside',
    attrsWithClass(attrs ?? {}, `xa-ext-alert xa-ext-alert--${safeVariant}`),
    tag('span', { class: 'xa-ext-alert__icon' }, icons[safeVariant]) +
      tag('div', {}, tag('div', { class: 'xa-ext-alert__title' }, escapeHtml(title)) + (message ? tag('div', { class: 'xa-ext-alert__message' }, escapeHtml(message)) : '')),
  );
}

function renderAlertBlock(variant: string, icon: string, title: string, message: string, dismissible: boolean): string {
  return tag(
    'div',
    { class: `alert alert--${variant}` },
    (icon ? tag('span', { class: 'alert__icon' }, escapeHtml(icon)) : '') +
      tag('div', { class: 'alert__body' }, (title ? tag('div', { class: 'alert__title' }, escapeHtml(title)) : '') + tag('div', { class: 'alert__text' }, escapeHtml(message))) +
      (dismissible ? tag('button', { type: 'button', class: 'alert__close', 'aria-label': 'Close', 'data-xcon-alert-close': '' }, modalCloseIcon()) : ''),
  );
}

function renderAlertSingleBlock(variant: string, icon: string, title: string, message: string, dismissible: boolean): string {
  return tag(
    'div',
    { class: `alert alert--${variant}`, style: 'position:relative;' },
    (icon ? tag('span', { class: 'alert__icon' }, escapeHtml(icon)) : '') +
      tag('div', { class: 'alert__body' }, (title ? tag('div', { class: 'alert__title' }, escapeHtml(title)) : '') + tag('div', { class: 'alert__text' }, escapeHtml(message))) +
      (dismissible ? tag('button', { type: 'button', class: 'alert__close', 'aria-label': 'Close', 'data-xcon-alert-close': '' }, '×') : ''),
  );
}

function renderIcon(component: XconObject, attrs: Record<string, string | undefined>): string {
  if (isShowcaseVariant(component)) {
    const names = ['home', 'search', 'bell', 'settings', 'user', 'mail', 'star', 'heart', 'download', 'plus', 'trash', 'edit'];
    const grid = names.map((name) => tag('div', { class: 'icon-item', title: titleCase(name) }, iconSvg(name, 'none'))).join('');
    const ladder = [12, 16, 20, 28, 36].map((size) => iconSvg('home', 'none').replace('width="18"', `width="${size}"`).replace('height="18"', `height="${size}"`)).join('');
    return tag('div', attrsWithClass(attrs, 'xa-ext-icon-host xa-ext-icon-host--showcase'), tag('div', { class: 'icon-grid' }, grid) + tag('div', { class: 'icon-sizes' }, ladder));
  }

  const name = String(component.get('name') ?? iconName(component.get('icon')) ?? '❓');
  const iconSize = Math.max(1, Number(component.get('size') ?? 24) || 24);
  const color = cssColor(component.get('color') ?? '0,0,0,255') ?? 'rgb(0 0 0 / 1)';
  const rotation = Number(component.get('rotation') ?? 0) || 0;
  const library = String(component.get('library') ?? 'emoji').trim().toLowerCase();
  const strokeWidth = Math.max(0.5, Math.min(8, Number(component.get('weight') ?? component.get('strokeWidth') ?? 2) || 2));
  const vectorHtml = library === 'emoji' ? '' : iconSvg(name, 'none', { size: iconSize, strokeWidth, className: null });
  const iconHtml = vectorHtml || tag('span', { style: `font-size:${iconSize}px;line-height:1` }, escapeHtml(name));
  const transform = rotation ? `transform:rotate(${rotation}deg)` : '';
  const containerStyle = [`color:${color}`, 'display:inline-flex', 'align-items:center', 'justify-content:center', `width:${iconSize}px`, `height:${iconSize}px`, transform].filter(Boolean).join(';');
  return tag(
    'div',
    attrsWithAppendedStyle(attrsWithClass(attrs, 'xa-ext-icon-host xa-ext-icon-host--single'), 'display:flex;align-items:center;justify-content:center'),
    tag('div', { class: 'icon-item' }, tag('div', { class: 'icon-container', style: containerStyle }, iconHtml)),
  );
}

function renderDivider(component: XconObject, attrs: Record<string, string | undefined>): string {
  if (isShowcaseVariant(component)) {
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-divider-host xa-ext-divider-host--showcase'),
      tag('p', { style: 'font-size:13px;color:var(--ink-2)' }, 'Default') +
        tag('div', { class: 'divider' }, '') +
        tag('p', { style: 'font-size:13px;color:var(--ink-2)' }, 'Thick') +
        tag('div', { class: 'divider--thick' }, '') +
        tag('p', { style: 'font-size:13px;color:var(--ink-2)' }, 'Dashed') +
        tag('div', { class: 'divider--dashed' }, '') +
        tag('p', { style: 'font-size:13px;color:var(--ink-2)' }, 'Gradient') +
        tag('div', { class: 'divider--gradient' }, '') +
        tag('p', { style: 'font-size:13px;color:var(--ink-2)' }, 'With label') +
        tag('div', { class: 'divider--label' }, tag('span', {}, 'OR')) +
        tag('p', { style: 'font-size:13px;color:var(--ink-2)' }, 'Content below'),
    );
  }
  const orientation = String(component.get('orientation') ?? component.get('direction') ?? 'horizontal').trim().toLowerCase();
  const variant = String(component.get('variant') ?? 'solid').trim().toLowerCase();
  const lineStyle = ['solid', 'dashed', 'dotted', 'double'].includes(variant) ? variant : 'solid';
  const color = cssColor(component.get('color')) ?? '#e9ecef';
  const thickness = cssSize(component.get('thickness') ?? '1px') ?? '1px';
  const text = String(component.get('text') ?? '');
  if (text && orientation !== 'vertical') {
    const position = String(component.get('textPosition') ?? 'center').trim().toLowerCase();
    const justify = position === 'left' ? 'flex-start' : position === 'right' ? 'flex-end' : 'center';
    const line = tag('div', { style: `flex:1;height:${thickness};border-top:${thickness} ${lineStyle} ${color}` }, '');
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-divider-host xa-ext-divider-host--single'),
      tag('div', { style: `display:flex;align-items:center;justify-content:${justify}` }, line + tag('span', { style: 'padding:0 12px;font-size:14px;color:var(--ink-2)' }, escapeHtml(text)) + line),
    );
  }
  const containerStyle = orientation === 'vertical' ? 'display:flex;justify-content:center;height:100%' : 'display:flex;align-items:center';
  const dividerStyle = orientation === 'vertical' ? `width:${thickness};height:100%;border-left:${thickness} ${lineStyle} ${color}` : `width:100%;height:${thickness};border-top:${thickness} ${lineStyle} ${color}`;
  return tag('div', attrsWithClass(attrs, 'xa-ext-divider-host xa-ext-divider-host--single'), tag('div', { style: containerStyle }, tag('div', { style: dividerStyle }, '')));
}

function renderTooltip(component: XconObject, attrs: Record<string, string | undefined>, children: string): string {
  const text = String(component.get('text') ?? component.get('tooltip') ?? 'tooltip');
  if (isShowcaseVariant(component)) {
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-tooltip-host xa-ext-tooltip-host--showcase'),
      tag('p', { style: 'font-size:12px;color:var(--ink-3);margin-bottom:16px' }, 'Hover over each button:') +
        tag(
          'div',
          { class: 'tooltip-demo' },
          renderTooltipDemo('tip-top', 'Top', 'Tooltip on top ↑') + renderTooltipDemo('tip-bottom', 'Bottom', 'Tooltip below ↓') + renderTooltipDemo('tip-right', 'Right →', 'Tooltip on right'),
        ),
    );
  }
  const position = safeTooltipPosition(component.get('position'));
  const trigger = String(component.get('trigger') ?? 'hover').trim().toLowerCase() === 'click' ? 'click' : 'hover';
  const theme = String(component.get('theme') ?? 'dark').trim().toLowerCase() === 'light' ? 'light' : 'dark';
  const rawDelay = Number(component.get('delay') ?? 0);
  const delay = Number.isFinite(rawDelay) ? Math.max(0, rawDelay) : 0;
  const tooltipId = `${domIdFromAttrs(attrs)}_tooltip`;
  const arrow = isFalseLike(component.get('arrow')) ? '' : tag('div', { class: 'tooltip-arrow' }, '');
  const label = children || escapeHtml(String(component.get('label') ?? component.get('content') ?? text));
  return tag(
    'div',
    attrsWithClass(
      {
        ...attrs,
        'data-xcon-tooltip': '',
        'data-xcon-tooltip-trigger': trigger,
        'data-xcon-tooltip-delay': delay > 0 ? String(delay) : undefined,
      },
      'xa-ext-tooltip-host xa-ext-tooltip-host--single',
    ),
    tag('div', { class: 'tooltip-trigger', 'aria-describedby': tooltipId, tabindex: '0' }, label) +
      tag('div', { id: tooltipId, class: `tooltip tooltip-${theme} tooltip-${position}`, role: 'tooltip' }, escapeHtml(text) + arrow),
  );
}

function renderTooltipDemo(positionClass: string, label: string, text: string): string {
  return tag('div', { class: `tooltip-wrap ${positionClass}` }, tag('div', { class: 'tooltip-target' }, escapeHtml(label)) + tag('div', { class: 'tooltip-bubble' }, escapeHtml(text)));
}

function safeTooltipPosition(value: unknown): string {
  const position = String(value ?? 'top').trim().toLowerCase();
  return ['top', 'bottom', 'left', 'right'].includes(position) ? position : 'top';
}

function renderModal(component: XconObject, attrs: Record<string, string | undefined>, children: string): string {
  const suffix = domIdFromAttrs(attrs);
  if (isShowcaseVariant(component)) {
    const showcaseSuffix = showcaseIdSuffix(attrs, 'modal');
    const backdropId = `modalBackdrop_${showcaseSuffix}`;
    return tag(
      'div',
      attrsWithClass({ ...attrs, 'data-xcon-modal': '' }, 'xa-ext-modal-host xa-ext-modal-host--showcase'),
      tag('p', { style: 'font-size:12px;color:var(--ink-2);margin-bottom:16px' }, 'Layered dialog with backdrop blur, animation, and focus management.') +
        tag('button', { type: 'button', class: 'modal-trigger-btn', id: `openModal_${showcaseSuffix}`, 'data-xcon-modal-open': backdropId }, 'Open Modal') +
        tag(
          'div',
          { class: 'modal-backdrop', id: backdropId, 'data-xcon-modal-target': '', 'data-xcon-modal-close-on-backdrop': 'true' },
          tag(
            'div',
            { class: 'modal-box' },
            tag('div', { class: 'modal-header' }, tag('h3', {}, 'Confirm Action') + tag('button', { type: 'button', class: 'modal-close', id: `closeModal_${showcaseSuffix}`, 'data-xcon-modal-close': backdropId, 'aria-label': 'Close' }, modalCloseIcon())) +
              tag('div', { class: 'modal-body' }, tag('p', {}, 'Are you sure you want to permanently delete this project? This action cannot be undone and all associated data will be lost.')) +
              tag('div', { class: 'modal-footer' }, tag('button', { type: 'button', class: 'btn-sm btn-ghost', id: `cancelModal_${showcaseSuffix}`, 'data-xcon-modal-close': backdropId }, 'Cancel') + tag('button', { type: 'button', class: 'btn-sm btn-primary' }, 'Delete Project')),
          ),
        ),
    );
  }

  const title = String(component.get('title') ?? 'title');
  const body = children || escapeHtml(String(component.get('text') ?? component.get('content') ?? component.get('message') ?? 'message'));
  const modalId = `${suffix}_modal`;
  const size = String(component.get('size') ?? 'medium').trim().toLowerCase();
  const width = size === 'small' ? '300px' : size === 'large' ? '800px' : size === 'fullscreen' ? '95vw' : '500px';
  const animation = String(component.get('animation') ?? 'fade').trim().toLowerCase();
  const safeAnimation = ['fade', 'slide', 'zoom'].includes(animation) ? animation : 'fade';
  const closeButton = isFalseLike(component.get('showCloseButton')) ? '' : tag('button', { type: 'button', class: 'modal-close', 'data-xcon-modal-close': modalId, 'aria-label': 'Close' }, modalCloseIcon());
  return tag(
    'div',
    attrsWithClass({ ...attrs, 'data-xcon-modal': '' }, 'xa-ext-modal-host xa-ext-modal-host--single'),
    tag('button', { type: 'button', class: 'modal-trigger-btn', 'data-xcon-modal-open': modalId }, 'modal') +
      tag(
        'div',
        {
          id: modalId,
          class: 'modal-overlay',
          'data-xcon-modal-target': '',
          'data-xcon-modal-close-on-backdrop': isFalseLike(component.get('backdropClose') ?? component.get('closeOnBackdrop')) ? 'false' : 'true',
        },
        tag(
          'div',
          { class: `modal-content modal-${safeAnimation}`, style: `width:${width}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `${modalId}_title` },
          tag('div', { class: 'modal-header' }, tag('h3', { id: `${modalId}_title` }, escapeHtml(title)) + closeButton) +
            tag('div', { class: 'modal-body' }, body) +
            tag('div', { class: 'modal-footer' }, tag('button', { type: 'button', class: 'btn-sm btn-ghost', 'data-xcon-modal-close': modalId }, 'cloase')),
        ),
      ),
  );
}

function titleCase(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function modalCloseIcon(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
}

function renderCard(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext, children: string): string {
  if (isShowcaseVariant(component)) {
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-card-host xa-ext-card-host--showcase'),
      renderUiCard({
        title: 'Generative Interfaces',
        text: 'Exploring the intersection of AI and design — how machine-generated content reshapes product experiences.',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80',
        context,
        footer: tag('span', { class: 'bdg bdg-purple' }, 'Design') + tag('button', { type: 'button', class: 'btn-sm btn-primary' }, 'Read More'),
      }),
    );
  }
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-card-host xa-ext-card-host--single'),
    renderSingleCard(component, context, children),
  );
}

function cardFlag(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (isXconObject(value)) return !isFalseLike(value.get('visible'));
  return !isFalseLike(value);
}

function renderSingleCard(component: XconObject, context: RenderContext, children: string): string {
  const src = sanitizeUrl(component.get('image') ?? component.get('src'), context.options);
  const title = String(component.get('title') ?? '');
  const subtitle = String(component.get('subtitle') ?? '');
  const content = String(component.get('text') ?? component.get('content') ?? '');
  const hasShadow = cardFlag(component.get('shadow'), true);
  const hasBorder = cardFlag(component.get('border'), true);
  const cardStyle = [
    'background-color:white',
    'border-radius:8px',
    'overflow:hidden',
    'width:100%',
    'height:100%',
    'display:flex',
    'flex-direction:column',
    hasShadow ? 'box-shadow:0 2px 4px rgba(0,0,0,.1)' : '',
    hasBorder ? 'border:1px solid #ddd' : '',
  ].filter(Boolean).join(';');
  const image = src
    ? tag('div', { class: 'card-image', style: 'width:100%;height:200px;overflow:hidden;' }, `<img src="${escapeAttr(src)}" alt="" style="width:100%;height:100%;object-fit:cover;">`)
    : '';
  const titleHtml = title ? tag('h3', { class: 'card-title', style: 'margin:0 0 8px 0;font-size:18px;font-weight:bold;' }, escapeHtml(title)) : '';
  const subtitleHtml = subtitle ? tag('p', { class: 'card-subtitle', style: 'margin:0 0 12px 0;font-size:14px;color:#666;' }, escapeHtml(subtitle)) : '';
  const contentHtml = content ? tag('div', { class: 'card-content', style: 'font-size:14px;line-height:1.5;' }, escapeHtml(content)) : '';
  const placeholder = !title && !subtitle && !content && !src && !children ? tag('div', { style: 'color:#ccc;text-align:center;font-style:italic;' }, '') : '';
  const body = tag('div', { class: 'card-body', style: `padding:${cssSize(component.get('padding')) ?? '16px'};flex:1;display:flex;flex-direction:column;justify-content:center;` }, titleHtml + subtitleHtml + contentHtml + children + placeholder);
  return tag('div', { class: 'card', style: cardStyle }, image + body);
}

function renderUiCard(options: { title: string; text: string; context: RenderContext; image?: unknown; subtitle?: string; footer?: string; children?: string }): string {
  const src = sanitizeUrl(options.image, options.context.options);
  const title = options.title ? tag('h3', { class: 'ui-card__title' }, escapeHtml(options.title)) : '';
  const subtitle = options.subtitle ? tag('p', { class: 'ui-card__text' }, escapeHtml(options.subtitle)) : '';
  const bodyText = options.text ? tag('p', { class: 'ui-card__text' }, escapeHtml(options.text)) : '';
  const footer = options.footer ? tag('div', { class: 'ui-card__footer' }, options.footer) : '';
  return tag('div', { class: 'ui-card' }, (src ? voidTag('img', { class: 'ui-card__img', src, alt: options.title || 'Card image' }) : '') + tag('div', { class: 'ui-card__body' }, title + subtitle + bodyText + (options.children ?? '') + footer));
}

function avatarSize(value: unknown): string {
  const size = String(value ?? 'medium').trim().toLowerCase();
  if (size === 'small' || size === 'sm') return 'sm';
  if (size === 'large' || size === 'lg') return 'lg';
  if (size === 'extraLarge' || size === 'xl') return 'xl';
  return 'md';
}

function renderAvatar(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext): string {
  const src = sanitizeUrl(component.get('src'), context.options);
  if (isShowcaseVariant(component)) {
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-avatar-host xa-ext-avatar-host--showcase'),
      tag(
        'div',
        { class: 'avatars-row', style: 'margin-bottom:16px' },
        renderAvatarImage('xl', 'https://i.pravatar.cc/72?img=47', 'User', 'online') +
          renderAvatarImage('lg', 'https://i.pravatar.cc/56?img=12', 'User', 'away') +
          renderAvatarImage('md', 'https://i.pravatar.cc/40?img=32', 'User', 'offline') +
          renderAvatarInitials('md', 'DK', 'background:linear-gradient(135deg,#7C6AF7,#A594FF)') +
          renderAvatarInitials('sm', 'JL', 'background:linear-gradient(135deg,#34D399,#6EE7B7)'),
      ) +
        tag(
          'div',
          { class: 'av-group' },
          renderAvatarImage('md', 'https://i.pravatar.cc/40?img=1', '') +
            renderAvatarImage('md', 'https://i.pravatar.cc/40?img=2', '') +
            renderAvatarImage('md', 'https://i.pravatar.cc/40?img=3', '') +
            renderAvatarImage('md', 'https://i.pravatar.cc/40?img=4', '') +
            renderAvatarInitials('md', '+8', 'background:var(--surface2);border:2px solid var(--surface);font-size:11px;color:var(--ink-2)'),
        ),
    );
  }
  const size = avatarSize(component.get('size'));
  const shape = String(component.get('shape') ?? 'circle').trim().toLowerCase();
  const radius = shape === 'square' ? '0' : shape === 'rounded' ? '8px' : '50%';
  const initialStyle = [`background:${cssColor(component.get('backgroundColor')) ?? '#6c757d'}`, `color:${cssColor(component.get('color') ?? component.get('textColor')) ?? 'white'}`, `border-radius:${radius}`].join(';');
  const image = src ? renderAvatarImage(size, src, String(component.get('alt') ?? component.get('initials') ?? ''), undefined, `border-radius:${radius}`) : renderAvatarInitials(size, String(component.get('initials') ?? component.get('text') ?? '👤'), initialStyle);
  return tag('div', attrsWithClass(attrs, 'xa-ext-avatar-host xa-ext-avatar-host--single'), image);
}

function renderAvatarImage(size: string, src: string, alt: string, status?: string, style?: string): string {
  const statusHtml = status ? tag('span', { class: `av__status av__status--${status}` }, '') : '';
  return tag('div', { class: 'av' }, voidTag('img', { class: `av__img av__img--${size}`, src, alt, style }) + statusHtml);
}

function renderAvatarInitials(size: string, text: string, style: string): string {
  return tag('div', { class: 'av' }, tag('div', { class: `av__initials av__initials--${size}`, style }, escapeHtml(text)));
}

function renderTabs(component: XconObject, attrs: Record<string, string | undefined>, context: RenderContext, depth: number): string {
  const suffix = isShowcaseVariant(component) ? showcaseIdSuffix(attrs, 'tabs') : domIdFromAttrs(attrs);
  if (isShowcaseVariant(component)) {
    const firstTabs = [
      { title: 'Overview', content: 'Project overview with key metrics and milestones. Track progress across all workstreams and identify blockers early.' },
      { title: 'Analytics', content: 'Deep-dive analytics with custom reports, conversion funnels, and retention cohorts. Export to CSV at any time.' },
      { title: 'Settings', content: 'Configure integrations, manage team permissions, set notification rules, and customize your workspace theme.' },
    ];
    const pillTabs = [
      { title: 'All', content: 'Showing all 42 items.' },
      { title: 'Active', content: 'Showing 28 active items.' },
      { title: 'Archived', content: 'Showing 14 archived items.' },
    ];
    return tag(
      'div',
      attrsWithClass(attrs, 'xa-ext-tabs-host xa-ext-tabs-host--showcase'),
      renderTabsBlock(firstTabs, 0, `tabsNav_${suffix}`, 'tabs-nav', context, depth, [`t1_${suffix}`, `t2_${suffix}`, `t3_${suffix}`]) +
        tag('div', { style: 'margin-top:20px' }, renderTabsBlock(pillTabs, 0, `pillTabsNav_${suffix}`, 'tabs-nav tabs-nav--pill', context, depth, [`p1_${suffix}`, `p2_${suffix}`, `p3_${suffix}`])),
    );
  }
  const items = normalizeTabItems(component.get('items') ?? component.get('tabs'));
  if (!items.length) return tag('div', attrsWithClass(attrs, 'xa-ext-tabs-host xa-ext-tabs-host--single'), '');
  return renderSingleTabs(component, attrs, items, context, depth);
}

function renderSingleTabs(component: XconObject, attrs: Record<string, string | undefined>, items: Array<{ id: string; title: string; content: XconValue }>, context: RenderContext, depth: number): string {
  const activeId = String(component.get('activeId') ?? '').trim();
  const activeIndexById = activeId ? items.findIndex((item) => item.id === activeId) : -1;
  const activeIndex = activeIndexById >= 0 ? activeIndexById : Math.max(0, Math.min(items.length - 1, Number(component.get('activeIndex') ?? component.get('activeTab') ?? 0) || 0));
  const variant = normalizeTabsVariant(component.get('variant'));
  const layout = normalizeTabsLayout(component.get('headerLayout') ?? component.get('tabsLayout'));
  const position = normalizeTabsPosition(component.get('position') ?? component.get('tabPosition') ?? component.get('tabsPosition'));
  const key = String(attrs['data-key'] ?? 'root');
  const isVertical = position === 'left' || position === 'right';
  const containerDir = position === 'top' ? 'column' : position === 'bottom' ? 'column-reverse' : position === 'left' ? 'row' : 'row-reverse';
  const headerFlexDir = isVertical ? 'column' : 'row';
  const headerStyle = tabsHeaderStyle(variant, layout, position, headerFlexDir, isVertical);
  const headers = items.map((item, index) => {
    const active = index === activeIndex;
    return tag(
      'div',
      {
        class: `tab-header tab-header-${variant} tab-header-layout-${layout}${active ? ' active' : ''}`,
        'data-tab': `${key}~content~${index}`,
        'data-xcon-tabs-single-tab': '',
        'aria-selected': active ? 'true' : 'false',
        style: tabHeaderStyle(variant, layout, position, isVertical, active),
      },
      escapeHtml(item.title),
    );
  }).join('');
  const panes = items.map((item, index) => {
    const active = index === activeIndex;
    const content = isXconObject(item.content)
      ? tag('div', { class: 'tab-content-inner', style: 'position:relative;width:100%;height:100%;min-height:0;' }, renderComponent(item.content, context, depth, { parentFlow: true }))
      : escapeHtml(String(item.content ?? ''));
    const style = isXconObject(item.content)
      ? tabsPaneStyle(position, active, true)
      : tabsPaneStyle(position, active, false);
    return tag('div', { class: 'tab-content', id: `${key}~content~${index}`, style }, content);
  }).join('');
  return tag(
    'div',
    {
      ...attrsWithClass(attrs, 'xa-ext-tabs-host xa-ext-tabs-host--single'),
      'data-tabs-variant': variant,
      'data-tabs-position': position,
    },
    tag(
      'div',
      { class: `tabs-container tabs-position-${position}`, style: `display:flex;flex-direction:${containerDir};width:100%;height:100%;overflow:hidden;` },
      tag('div', { class: `tabs-header tabs-header-${variant} tabs-header-layout-${layout}`, style: headerStyle }, headers) +
        tag('div', { class: 'tabs-content', style: 'flex:1;min-width:0;min-height:0;position:relative;overflow:hidden;' }, panes),
    ),
  );
}

function normalizeTabsVariant(value: unknown): string {
  const variant = String(value ?? 'default').trim().toLowerCase();
  return variant === 'pills' || variant === 'underline' ? variant : 'default';
}

function normalizeTabsLayout(value: unknown): string {
  const layout = String(value ?? 'auto').trim().toLowerCase();
  return layout === 'full' || layout === 'center' || layout === 'end' ? layout : 'auto';
}

function normalizeTabsPosition(value: unknown): string {
  const position = String(value ?? 'top').trim().toLowerCase();
  return position === 'bottom' || position === 'left' || position === 'right' ? position : 'top';
}

function tabsHeaderStyle(variant: string, layout: string, position: string, headerFlexDir: string, isVertical: boolean): string {
  const borderColor = variant === 'underline' ? '#e5e7eb' : '#ddd';
  const border = position === 'bottom' ? `border-top:1px solid ${borderColor}` : position === 'left' ? `border-right:1px solid ${borderColor}` : position === 'right' ? `border-left:1px solid ${borderColor}` : `border-bottom:1px solid ${borderColor}`;
  const parts = ['display:flex', `flex-direction:${headerFlexDir}`, 'flex-shrink:0'];
  if (variant !== 'pills') parts.push(border);
  if (variant === 'pills') parts.push('gap:4px');
  parts.push(isVertical ? 'width:auto;min-width:100px' : 'width:100%');
  if (layout === 'center') parts.push('justify-content:center');
  if (layout === 'end') parts.push('justify-content:flex-end');
  return `${parts.join(';')};`;
}

function tabHeaderStyle(variant: string, layout: string, position: string, isVertical: boolean, active: boolean): string {
  const display = layout === 'full'
    ? (isVertical ? 'flex:1;min-height:0;text-align:center' : 'flex:1;min-width:0;text-align:center')
    : (isVertical ? 'display:block' : 'display:inline-block');
  const margin = position === 'bottom' ? 'margin-top:-1px' : position === 'left' ? 'margin-right:-1px' : position === 'right' ? 'margin-left:-1px' : 'margin-bottom:-1px';
  if (variant === 'pills') {
    return `padding:8px 16px;cursor:pointer;${display};border:none;border-radius:20px;background-color:${active ? '#007bff' : '#e9ecef'};color:${active ? 'white' : '#495057'};`;
  }
  if (variant === 'underline') {
    const side = position === 'bottom' ? 'top' : position === 'left' ? 'right' : position === 'right' ? 'left' : 'bottom';
    return `padding:8px 16px;cursor:pointer;${display};border:none;border-${side}:2px solid ${active ? '#007bff' : 'transparent'};background-color:transparent;color:${active ? '#007bff' : '#6b7280'};${margin};border-radius:0;`;
  }
  const radius = position === 'bottom' ? '0 0 4px 4px' : position === 'left' ? '4px 0 0 4px' : position === 'right' ? '0 4px 4px 0' : '4px 4px 0 0';
  return `padding:8px 16px;cursor:pointer;${display};border:1px solid #ddd;${margin};background-color:${active ? '#007bff' : '#f8f9fa'};color:${active ? 'white' : '#333'};border-radius:${radius};`;
}

function tabsPaneStyle(position: string, active: boolean, layered: boolean): string {
  const borderNone = position === 'bottom' ? 'border-bottom:none' : position === 'left' ? 'border-left:none' : position === 'right' ? 'border-right:none' : 'border-top:none';
  if (!layered) return `display:${active ? 'block' : 'none'};padding:16px;border:1px solid #ddd;${borderNone};background-color:white`;
  return `display:${active ? 'block' : 'none'};position:absolute;top:0;left:0;right:0;bottom:0;padding:16px;border:1px solid #ddd;${borderNone};background-color:white;overflow:auto;box-sizing:border-box`;
}

function normalizeTabItems(value: unknown): Array<{ id: string; title: string; content: XconValue }> {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const tab = isXconObject(item) ? item : item && typeof item === 'object' && !Array.isArray(item) ? fromJSONObject(item) : fromJSONObject({ title: item, content: item });
    const id = String(tab.get('id') ?? index);
    return {
      id,
      title: String(tab.get('title') ?? tab.get('label') ?? tab.get('id') ?? `Tab ${index + 1}`),
      content: tab.get('content') ?? '',
    };
  });
}

function renderTabsBlock(items: Array<{ title: string; content: XconValue }>, activeIndex: number, navId: string, navClass: string, context: RenderContext, depth: number, panelIds?: string[]): string {
  const tabId = (index: number): string => panelIds?.[index] ?? `${navId}_tab_${index}`;
  const buttons = items
    .map((item, index) => tag('button', { type: 'button', class: `tab-btn${index === activeIndex ? ' active' : ''}`, 'data-tab': tabId(index), 'data-xcon-tabs-button': '', 'aria-selected': index === activeIndex ? 'true' : 'false' }, escapeHtml(item.title)))
    .join('');
  const panels = items
    .map((item, index) => {
      const body = isXconObject(item.content) ? renderComponent(item.content, context, depth, { parentFlow: true }) : escapeHtml(String(item.content ?? ''));
      return tag('div', { class: `tab-content${index === activeIndex ? ' active' : ''}`, id: tabId(index) }, tag('div', { class: 'tab-panel-inner' }, body));
    })
    .join('');
  return tag('div', { class: 'tabs-wrap', 'data-xcon-tabs': '' }, tag('div', { class: navClass, id: navId, 'data-xcon-tabs-nav': '' }, buttons) + panels);
}

function renderAccordion(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  context: RenderContext,
  depth: number,
): string {
  const showcase = isShowcaseVariant(component);
  const items = showcase
    ? [
        fromJSONObject({ title: 'What is a design system?', content: 'A design system is a collection of reusable components, guided by clear standards, that can be assembled to build any number of applications.' }),
        fromJSONObject({ title: 'How to handle component states?', content: 'Components can exist in multiple states: default, hover, focus, active, disabled, loading, and error. Each state should be visually distinct.' }),
        fromJSONObject({ title: 'Accessibility best practices', content: 'Ensure sufficient color contrast, provide keyboard navigation, use semantic HTML elements, and include ARIA labels where needed.' }),
      ]
    : component.get('items');
  if (!Array.isArray(items)) return tag('div', attrs, '');
  const open = component.get('defaultOpen');
  const openSet = new Set(Array.isArray(open) ? open.map(String) : []);
  if (!showcase) return renderSingleAccordion(component, attrs, items, openSet, context, depth);
  const suffix = showcaseIdSuffix(attrs, 'accordion');
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-accordion-host xa-ext-accordion-host--showcase'),
    items
      .map((item, index) => {
        const section = isXconObject(item) ? item : fromJSONObject({ title: item, content: item });
        const id = String(section.get('id') ?? index);
        const content = section.get('content');
        const expanded = openSet.has(id) || openSet.has(String(index)) || index === 0;
        const body = isXconObject(content) ? renderComponent(content, context, depth, { parentFlow: true }) : escapeHtml(String(content ?? ''));
        return tag(
          'div',
          { class: `accordion-item${expanded ? ' open' : ''}`, id: `acc${index + 1}_${suffix}` },
          tag(
            'button',
            { type: 'button', class: `accordion-trigger has-children${expanded ? ' expanded' : ''}`, 'data-xcon-accordion-toggle': '', 'aria-expanded': expanded ? 'true' : 'false' },
            escapeHtml(String(section.get('title') ?? id)) + '<svg class="accordion-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',
          ) +
            tag('div', { class: 'accordion-body' }, tag('div', { class: 'accordion-body-inner' }, body)),
        );
      })
      .join(''),
  );
}

function renderSingleAccordion(
  component: XconObject,
  attrs: Record<string, string | undefined>,
  items: XconValue[],
  openSet: Set<string>,
  context: RenderContext,
  depth: number,
): string {
  const key = String(attrs['data-key'] ?? 'root');
  const multiple = isTruthy(component.get('multiple'));
  const itemHtml = items
    .map((item, index) => {
      const section = isXconObject(item) ? item : fromJSONObject({ title: item, content: item });
      const id = String(section.get('id') ?? index);
      const content = section.get('content');
      const expanded = openSet.has(id) || openSet.has(String(index));
      const body = isXconObject(content) ? renderComponent(content, context, depth, { parentFlow: true }) : escapeHtml(String(content ?? ''));
      const itemStyle = `border:1px solid #e9ecef;border-bottom:${index === items.length - 1 ? '1px solid #e9ecef' : 'none'};`;
      const headerStyle = 'padding:12px 16px;background-color:#f8f9fa;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e9ecef;';
      const arrowStyle = `transition:transform .3s ease;transform:${expanded ? 'rotate(90deg)' : 'rotate(0deg)'};`;
      const contentStyle = `display:${expanded ? 'block' : 'none'};padding:16px;background-color:white;`;
      return tag(
        'div',
        { class: 'accordion-item', style: itemStyle },
        tag(
          'div',
          {
            class: 'accordion-header',
            'data-xcon-accordion-toggle': '',
            'data-xcon-accordion-index': String(index),
            'data-xcon-accordion-multiple': multiple ? 'true' : 'false',
            'aria-expanded': expanded ? 'true' : 'false',
            style: headerStyle,
          },
          tag('span', { style: 'font-weight:500;' }, escapeHtml(String(section.get('title') ?? `Item ${index + 1}`))) +
            tag('span', { class: 'accordion-arrow', style: arrowStyle }, '▶'),
        ) +
          tag('div', { class: 'accordion-content', id: `${key}~content~${index}`, style: contentStyle }, body),
      );
    })
    .join('');
  return tag(
    'div',
    attrsWithClass(attrs, 'xa-ext-accordion-host xa-ext-accordion-host--single'),
    tag('div', { class: 'accordion-container', style: 'border-radius:4px;overflow:hidden;' }, itemHtml),
  );
}

function buildStyle(component: XconObject, state: RenderState, options: BuildStyleOptions = {}): string {
  const declarations: string[] = [];
  const pos = rectParts(component.get('pos'));
  const autoLayout = usesFlowLayout(component);
  const al = component.get('al');
  const flowSizing = state.parentFlow || (Boolean(options.isRoot) && autoLayout);
  if (state.fillParent) {
    declarations.push('width:100%', 'height:100%', 'min-height:0', 'max-width:100%');
  } else if (pos) {
    if (flowSizing) {
      if (hasExplicitAutoLayoutWidth(component)) {
        // Auto-layout width is the public contract for flow children; do not
        // leak draft converter fallback dimensions ahead of it.
      } else if (isDefaultDraftFlowWidth(pos[2])) {
        declarations.push('width:auto', 'max-width:100%', 'min-width:0');
      } else {
        appendCss(declarations, 'width', cssSize(pos[2]));
      }
      if (autoLayout && isPanelFixedHeight(component)) {
        appendCss(declarations, 'height', cssSize(pos[3]));
        appendCss(declarations, 'min-height', cssSize(pos[3]));
      } else if (!autoLayout || !isXconObject(al) || !isTruthy(al.get('autoHeight'))) {
        appendCss(declarations, 'min-height', cssSize(pos[3]));
      }
    } else {
      declarations.push('position:absolute', `left:${numberPx(pos[0])}`, `top:${numberPx(pos[1])}`, `width:${numberPx(pos[2])}`, `height:${numberPx(pos[3])}`);
    }
  }
  if ((options.includeAutoLayout ?? true) && autoLayout) appendAutoLayout(declarations, component);
  if (isVerticalScroll(component)) appendCss(declarations, 'overflow', 'auto');
  const type = component.getString('type', '');
  if (type === 'progressBar') {
    appendCss(declarations, 'background-color', cssColor(component.get('bgColor')));
  } else if (type === 'spinner') {
    appendCss(declarations, 'background-color', cssColor(component.get('backgroundColor') ?? component.get('bgColor')));
  } else {
    appendCss(declarations, 'background-color', cssColor(component.get('backgroundColor') ?? component.get('bgColor')));
    appendCss(declarations, 'color', cssColor(component.get('color')));
  }
  appendSpacing(declarations, 'margin', component.get('margin'));
  appendSpacing(declarations, 'padding', component.get('padding'));
  if (!component.contains('padding')) appendSpacing(declarations, 'padding', component.get('labelPadding'));

  const font = component.get('font');
  if (isXconObject(font)) {
    appendCss(declarations, 'font-family', font.get('family'));
    appendCss(declarations, 'font-size', cssSize(font.get('size')));
    appendCss(declarations, 'font-weight', font.get('weight') ?? (isTruthy(font.get('bold')) ? 'bold' : undefined));
    appendCss(declarations, 'font-style', font.get('style') ?? (isTruthy(font.get('italic')) ? 'italic' : undefined));
    appendCss(declarations, 'line-height', font.get('lineHeight'));
  }
  appendCss(declarations, 'font-weight', isTruthy(component.get('bold')) ? 'bold' : undefined);
  appendCss(declarations, 'font-style', isTruthy(component.get('italic')) ? 'italic' : undefined);
  appendCss(declarations, 'line-height', component.get('lineHeight'));
  appendCss(declarations, 'text-decoration', textDecoration(component));

  const border = component.get('border');
  const borderWidthValue = isXconObject(border) ? border.get('width') ?? component.get('borderWidth') : component.get('borderWidth');
  if (isXconObject(border) && !isFalseLike(border.get('visible'))) {
    if (String(borderWidthValue) === '-1') appendIndividualBorders(declarations, component, border);
    else {
      appendCss(declarations, 'border-width', cssSize(borderWidthValue ?? 1));
      appendCss(declarations, 'border-style', border.get('style') ?? component.get('borderStyle') ?? 'solid');
      appendCss(declarations, 'border-color', cssColor(border.get('color') ?? component.get('borderColor')) ?? 'var(--border2)');
    }
  } else if (border === true) {
    if (String(borderWidthValue) === '-1') appendIndividualBorders(declarations, component);
    else declarations.push('border:1px solid #E5E7EB');
  }
  appendExplicitIndividualBorders(declarations, component, isXconObject(border) ? border : undefined);

  const shadow = component.get('shadow');
  if (isXconObject(shadow) && !isFalseLike(shadow.get('visible'))) {
    declarations.push(`box-shadow:${shadowCss(shadow)}`);
  } else if (shadow === true) {
    declarations.push(`box-shadow:${legacyShadowCss(component)}`);
  }

  appendCss(declarations, 'border-radius', cssSize(component.get('borderRadius') ?? component.get('round')) ?? (isXconObject(border) ? cssSize(border.get('radius')) : undefined));
  appendCss(declarations, 'text-align', component.get('textAlign'));
  appendCss(declarations, 'vertical-align', component.get('textVerticalAlign'));
  appendCss(declarations, 'white-space', component.get('whiteSpace'));
  appendCss(declarations, 'overflow', component.get('overflow'));
  appendCss(declarations, 'object-fit', component.get('objectFit'));
  appendCss(declarations, 'object-position', component.get('objectPosition'));
  return declarations.join(';');
}

function appendAutoLayout(declarations: string[], component: XconObject): void {
  const al = component.get('al');
  if (!isXconObject(al)) return;
  declarations.push('display:flex');
  appendCss(declarations, 'flex-direction', normalizeDirection(al.get('direction') ?? component.get('direction') ?? 'column'));
  appendCss(declarations, 'gap', cssSize(al.get('gap') ?? component.get('gap')));
  appendSpacing(declarations, 'padding', al.get('padding') ?? component.get('padding'));
  appendCss(declarations, 'align-items', al.get('alignItems') ?? component.get('alignItems') ?? component.get('align'));
  appendCss(declarations, 'justify-content', al.get('justifyContent') ?? component.get('justifyContent') ?? component.get('justify'));
  appendCss(declarations, 'flex-wrap', al.get('wrap') ?? component.get('wrap'));
  appendCss(declarations, 'flex', al.get('flex') ?? component.get('flex'));
  appendCss(declarations, 'align-self', al.get('alignSelf') ?? component.get('alAlignSelf'));
  appendCss(declarations, 'width', al.get('width') ?? component.get('alWidth'));
  appendCss(declarations, 'min-width', al.get('minWidth'));
  appendCss(declarations, 'max-width', al.get('maxWidth') ?? component.get('maxWidth'));
  appendCss(declarations, 'min-height', al.get('minHeight'));
  appendCss(declarations, 'max-height', al.get('maxHeight') ?? component.get('maxHeight'));
  appendCss(declarations, 'overflow', al.get('overflow') ?? component.get('overflow'));
}

function componentOrder(components: XconObject): string[] {
  const order = components.get('componentsOrder');
  if (typeof order !== 'string') return [];
  return order
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
}

function usesFlowLayout(component: XconObject): boolean {
  return isXconObject(component.get('al'));
}

function isDefaultDraftFlowWidth(value: unknown): boolean {
  const width = Number(value);
  return width === 560 || width === 520;
}

function hasExplicitAutoLayoutWidth(component: XconObject): boolean {
  const al = component.get('al');
  return isXconObject(al) && al.get('width') !== undefined && al.get('width') !== null && String(al.get('width')).trim() !== '';
}

function isSequentialContainer(type: string): boolean {
  return type === 'stack' || type === 'flexBox' || type === 'grid' || type === 'list' || type === 'tabs' || type === 'accordion';
}

function isVerticalScroll(component: XconObject): boolean {
  const scroll = component.get('scroll');
  return scroll === true || scroll === 'vertical' || scroll === 'both';
}

function rectParts(value: unknown): [number, number, number, number] | null {
  if (Array.isArray(value) && value.length === 4) {
    const parts = value.map(Number);
    return parts.every(Number.isFinite) ? (parts as [number, number, number, number]) : null;
  }
  if (typeof value !== 'string') return null;
  const parts = value.split(',').map((part) => Number(part.trim()));
  return parts.length === 4 && parts.every(Number.isFinite) ? (parts as [number, number, number, number]) : null;
}

function sizeParts(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length >= 2) {
    const parts = value.slice(0, 2).map(Number);
    return parts.every(Number.isFinite) ? (parts as [number, number]) : null;
  }
  if (typeof value !== 'string') return null;
  const parts = value.split(',').map((part) => Number(part.trim())).slice(0, 2);
  return parts.length === 2 && parts.every(Number.isFinite) ? (parts as [number, number]) : null;
}

function pointParts(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length >= 2) {
    const parts = value.slice(0, 2).map(Number);
    return parts.every(Number.isFinite) ? (parts as [number, number]) : null;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/^\s*\[|\]\s*$/g, '');
  const parts = normalized.split(',').map((part) => Number(part.trim())).slice(0, 2);
  return parts.length === 2 && parts.every(Number.isFinite) ? (parts as [number, number]) : null;
}

function lineStrokeWidth(value: unknown): number {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0.5, Math.min(parsed, 32));
}

function lineMarker(value: unknown): string | null {
  const marker = String(value ?? '').trim().toLowerCase();
  return marker === 'arrow' ? 'arrow' : null;
}

function lineCap(value: unknown): string {
  const cap = String(value ?? 'round').trim().toLowerCase();
  return cap === 'butt' || cap === 'square' || cap === 'round' ? cap : 'round';
}

function lineDashArray(value: unknown, strokeWidth: number): string | undefined {
  const style = String(value ?? '').trim().toLowerCase();
  if (!style || style === 'solid' || style === 'none') return undefined;
  if (style === 'dashed' || style === 'dash') return `${trimNumber(strokeWidth * 3)} ${trimNumber(strokeWidth * 3)}`;
  if (style === 'dotted' || style === 'dot') return `${trimNumber(strokeWidth)} ${trimNumber(strokeWidth * 2)}`;
  return safeCssValue(value);
}

function normalizeDirection(value: unknown): string {
  const direction = String(value ?? 'column');
  if (direction === 'vertical') return 'column';
  if (direction === 'horizontal') return 'row';
  return direction;
}

function isTruthy(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1' || value === 'checked';
}

function isFalseLike(value: unknown): boolean {
  return value === false || value === 'false' || value === 0 || value === '0' || value === 'none' || value === 'hidden';
}

function cssEscapeIdentifier(id: string): string {
  return id.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

function stackDirection(component: XconObject): string {
  return normalizeDirection(component.get('direction') ?? 'column');
}

function flexStyle(component: XconObject): string {
  return [
    `flex-direction:${normalizeDirection(component.get('direction') ?? 'row')}`,
    `justify-content:${attr(component.get('justify') ?? 'flex-start')}`,
    `align-items:${attr(component.get('align') ?? 'stretch')}`,
    `flex-wrap:${attr(component.get('wrap') ?? 'nowrap')}`,
    `gap:${cssSize(component.get('gap')) ?? '8px'}`,
  ].join(';');
}

function gridStyle(component: XconObject): string {
  const columns = component.get('columns') ?? 3;
  const template = typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : String(columns);
  return `grid-template-columns:${template};gap:${cssSize(component.get('gap')) ?? '16px'}`;
}

function appendCss(declarations: string[], property: string, value: unknown): void {
  if (value === undefined || value === null || value === '') return;
  declarations.push(`${property}:${String(value)}`);
}

function appendSpacing(declarations: string[], property: string, value: unknown): void {
  if (value === undefined || value === null || value === '') return;
  if (typeof value === 'number' || typeof value === 'string') {
    declarations.push(`${property}:${cssSize(value)}`);
    return;
  }
  if (Array.isArray(value)) {
    declarations.push(`${property}:${value.map((item) => cssSize(item)).join(' ')}`);
  }
}

function cssSize(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return `${value}px`;
  const text = String(value).trim();
  return /^-?\d+(?:\.\d+)?$/.test(text) ? `${text}px` : text;
}

function numberPx(value: unknown): string {
  return `${Number(value) || 0}px`;
}

function cssColor(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return String(value);
  const trimmed = value.trim();
  const themed = expandThemeTokenAliases(trimmed);
  if (themed !== trimmed) return themed;
  const rgba = trimmed.split(',').map((part) => Number(part.trim()));
  if (rgba.length === 3 && rgba.every((part) => Number.isFinite(part))) {
    return `rgb(${rgba[0]} ${rgba[1]} ${rgba[2]})`;
  }
  if (rgba.length === 4 && rgba.every((part) => Number.isFinite(part))) {
    const alpha = rgba[3] > 1 ? Math.max(0, Math.min(1, rgba[3] / 255)) : Math.max(0, Math.min(1, rgba[3]));
    return `rgb(${rgba[0]} ${rgba[1]} ${rgba[2]} / ${alpha})`;
  }
  return trimmed;
}

function expandThemeTokenAliases(value: string): string {
  return value.replace(themeTokenAliasPattern, (_match, prefix: string, token: string) => `${prefix}var(--${token})`);
}

function fontValue(component: XconObject, key: string): XconValue | undefined {
  const font = component.get('font');
  if (isXconObject(font)) {
    const nested = font.get(key);
    if (nested !== undefined && nested !== null && nested !== '') return nested;
  } else if (key === 'family' && typeof font === 'string' && font.trim()) {
    return font;
  }
  const directKeys: Record<string, string[]> = {
    family: ['fontFamily'],
    size: ['fontSize'],
    weight: ['fontWeight'],
    style: ['fontStyle'],
    bold: ['bold'],
    italic: ['italic'],
    lineHeight: ['lineHeight'],
  };
  for (const directKey of directKeys[key] ?? []) {
    const value = component.get(directKey);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function textDecoration(component: XconObject): string | undefined {
  const decorations: string[] = [];
  const font = component.get('font');
  if (isTruthy(component.get('underline')) || (isXconObject(font) && isTruthy(font.get('underline')))) decorations.push('underline');
  if (isTruthy(component.get('strikethrough')) || (isXconObject(font) && isTruthy(font.get('strikethrough')))) decorations.push('line-through');
  return decorations.length ? decorations.join(' ') : undefined;
}

function borderRadius(component: XconObject): string | undefined {
  const direct = component.get('borderRadius') ?? component.get('round') ?? component.get('radius');
  if (direct !== undefined && direct !== null && direct !== '') return cssSize(direct);
  const border = component.get('border');
  if (isXconObject(border)) return cssSize(border.get('radius'));
  return undefined;
}

function borderCss(component: XconObject): string {
  const border = component.get('border');
  if (isXconObject(border)) {
    if (isFalseLike(border.get('visible'))) return 'none';
    const width = cssSize(border.get('width') ?? component.get('borderWidth') ?? 1) ?? '1px';
    const style = attr(border.get('style') ?? component.get('borderStyle') ?? 'solid') ?? 'solid';
    const color = cssColor(border.get('color') ?? component.get('borderColor')) ?? 'var(--border2)';
    return `${width} ${style} ${color}`;
  }
  if (border === true || border === 'true' || border === 1 || border === '1') {
    return `${cssSize(component.get('borderWidth') ?? 1) ?? '1px'} ${attr(component.get('borderStyle') ?? 'solid')} ${cssColor(component.get('borderColor')) ?? 'var(--border2)'}`;
  }
  return 'none';
}

const BORDER_SIDE_DEFINITIONS = [
  ['border-left', 'borderLeft'],
  ['border-top', 'borderTop'],
  ['border-right', 'borderRight'],
  ['border-bottom', 'borderBottom'],
] as const;

function borderSideDeclaration(component: XconObject, sideKey: string, border?: XconObject, fallbackWidth?: unknown): string | undefined {
  const style = attr(border?.get('style') ?? component.get('borderStyle') ?? 'solid') ?? 'solid';
  const raw = component.get(sideKey);
  if (isXconObject(raw)) {
    if (isFalseLike(raw.get('visible'))) return 'none';
    const width = cssSize(raw.get('width') ?? fallbackWidth ?? 1) ?? '1px';
    const sideStyle = attr(raw.get('style') ?? style) ?? style;
    const sideColor = cssColor(raw.get('color') ?? border?.get('color') ?? component.get('borderColor')) ?? 'var(--border2)';
    return `${width} ${sideStyle} ${sideColor}`;
  }
  const widthSource = raw ?? fallbackWidth;
  if (widthSource === undefined || widthSource === null || widthSource === '') return undefined;
  if (isFalseLike(widthSource)) return 'none';
  const color = cssColor(border?.get('color') ?? component.get('borderColor')) ?? 'var(--border2)';
  return `${cssSize(widthSource) ?? '1px'} ${style} ${color}`;
}

function appendIndividualBorders(declarations: string[], component: XconObject, border?: XconObject): void {
  BORDER_SIDE_DEFINITIONS.forEach(([cssName, sideKey]) => {
    appendCss(declarations, cssName, borderSideDeclaration(component, sideKey, border, 1));
  });
}

function appendExplicitIndividualBorders(declarations: string[], component: XconObject, border?: XconObject): void {
  BORDER_SIDE_DEFINITIONS.forEach(([cssName, sideKey]) => {
    if (component.contains(sideKey)) {
      appendCss(declarations, cssName, borderSideDeclaration(component, sideKey, border));
    }
  });
}

function shadowCss(shadow: XconObject): string {
  const x = Number(shadow.get('x') ?? 0);
  const y = Number(shadow.get('y') ?? 2);
  const blur = Number(shadow.get('blur') ?? 8);
  const spread = Number(shadow.get('spread') ?? 0);
  const color = cssColorWithOpacity(shadow.get('color'), shadow.get('opacity')) ?? 'rgb(0 0 0 / 0.12)';
  return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

function legacyShadowCss(component: XconObject): string {
  const y = Number(component.get('shadowBlur') ?? 2);
  const blur = Number(component.get('shadowRadius') ?? 8);
  const color = cssColorWithOpacity(component.get('shadowColor'), component.get('shadowOpacity')) ?? 'rgba(0,0,0,.12)';
  return `0 ${y}px ${blur}px ${color}`;
}

function cssColorWithOpacity(colorValue: unknown, opacityValue: unknown): string | undefined {
  const opacity = opacityValue === undefined || opacityValue === null || opacityValue === '' ? undefined : Number(opacityValue);
  const color = cssColor(colorValue ?? '0,0,0,255');
  if (opacity === undefined || !Number.isFinite(opacity)) return color;
  if (typeof colorValue === 'string') {
    const rgba = colorValue
      .trim()
      .split(',')
      .map((part) => Number(part.trim()));
    if ((rgba.length === 3 || rgba.length === 4) && rgba.every((part) => Number.isFinite(part))) {
      return `rgb(${rgba[0]} ${rgba[1]} ${rgba[2]} / ${Math.max(0, Math.min(1, opacity))})`;
    }
  }
  if (colorValue === undefined || colorValue === null || colorValue === '') {
    return `rgb(0 0 0 / ${Math.max(0, Math.min(1, opacity))})`;
  }
  return color;
}

function verticalAlign(component: XconObject): string {
  const value = String(component.get('textVerticalAlign') ?? component.get('verticalAlign') ?? component.get('textVAlign') ?? component.get('valign') ?? 'middle').toLowerCase();
  if (value === 'top') return 'flex-start';
  if (value === 'bottom') return 'flex-end';
  return 'center';
}

function justifyFromTextAlign(value: unknown, fallback = 'center'): string {
  const textAlign = String(value ?? fallback).toLowerCase();
  if (textAlign === 'left' || textAlign === 'start') return 'flex-start';
  if (textAlign === 'right' || textAlign === 'end') return 'flex-end';
  if (textAlign === 'justify') return 'space-between';
  return 'center';
}

function linesToBreaks(value: string): string {
  return value
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br>');
}

function joinStyles(...styles: Array<string | undefined>): string | undefined {
  const joined = styles.filter(Boolean).join(';').replaceAll(/;+/g, ';').replace(/^;|;$/g, '');
  return joined || undefined;
}

function tag(name: string, attrs: Record<string, string | undefined>, body: string): string {
  return `<${name}${renderAttrs(attrs)}>${body}</${name}>`;
}

function voidTag(name: string, attrs: Record<string, string | undefined>): string {
  return `<${name}${renderAttrs(attrs)}>`;
}

function renderAttrs(attrs: Record<string, string | undefined>): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([name, value]) => (value === '' && name !== 'value' ? ` ${name}` : ` ${name}="${escapeAttr(String(value))}"`))
    .join('');
}

function attr(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function classToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const token = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return token || undefined;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function sanitizeHtml(value: string): string {
  return value
    .replaceAll(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replaceAll(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>`]+)/gi, '')
    .replaceAll(/\s(?:href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s"'<>`]+)/gi, '')
    .replaceAll(/javascript:/gi, '');
}
