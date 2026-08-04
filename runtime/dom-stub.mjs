// Studio45 DOM-Stub: führt die <script>-Blöcke eines generierten Spiels in einer
// Fake-Browser-Umgebung aus und meldet Ladezeit-Crashes (Exit 1) — die g3-Lehre
// aus dem Piloten als Produktfeature. Aufruf: node dom-stub.mjs <html-datei> [frames]
import fs from "node:fs";

const htmlFile = process.argv[2];
const FRAMES = Number(process.argv[3] ?? 30);
const html = fs.readFileSync(htmlFile, "utf8");

const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((m) => m[1])
  .filter((s) => s.trim());

if (scripts.length === 0) {
  console.error("VERIFY: keine Inline-Scripts gefunden");
  process.exit(1);
}

// ---- generischer Element-Stub ----------------------------------------------
function makeCtx2d() {
  const grad = { addColorStop: () => {} };
  return new Proxy(
    {},
    {
      get(t, prop) {
        if (prop === "createLinearGradient" || prop === "createRadialGradient" || prop === "createPattern")
          return () => grad;
        if (prop === "measureText") return () => ({ width: 10 });
        if (prop === "getImageData") return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
        if (prop === "canvas") return makeElement("canvas");
        if (typeof prop === "string" && /^[a-z]/i.test(prop)) return () => undefined;
        return undefined;
      },
      set: () => true,
    }
  );
}

const listeners = { raf: [], load: [], domready: [] };
let elementCount = 0;

function makeElement(tag = "div") {
  if (elementCount++ > 50000) throw new Error("VERIFY: Element-Explosion (Endlosschleife?)");
  const children = [];
  const el = {
    tagName: String(tag).toUpperCase(),
    style: new Proxy({}, { get: () => "", set: () => true }),
    dataset: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    children,
    childNodes: children,
    innerHTML: "",
    textContent: "",
    value: "",
    width: 800,
    height: 600,
    clientWidth: 800,
    clientHeight: 600,
    offsetWidth: 800,
    offsetHeight: 600,
    getContext: () => makeCtx2d(),
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0 }),
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: (c) => (children.push(c), c),
    removeChild: (c) => c,
    remove: () => {},
    insertBefore: (c) => c,
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    focus: () => {},
    blur: () => {},
    click: () => {},
    play: () => Promise.resolve(),
    pause: () => {},
    requestFullscreen: () => Promise.resolve(),
    closest: () => null,
    querySelector: () => makeElement(),
    querySelectorAll: () => [],
    contains: () => false,
    cloneNode: () => makeElement(tag),
    parentNode: null,
    parentElement: null,
    firstChild: null,
    nextSibling: null,
  };
  return el;
}

const body = makeElement("body");
const documentStub = {
  body,
  head: makeElement("head"),
  documentElement: makeElement("html"),
  title: "",
  readyState: "complete",
  createElement: (t) => makeElement(t),
  createElementNS: (_ns, t) => makeElement(t),
  createTextNode: (t) => ({ textContent: t }),
  createDocumentFragment: () => makeElement("fragment"),
  getElementById: () => makeElement(),
  querySelector: () => makeElement(),
  querySelectorAll: () => [],
  getElementsByClassName: () => [],
  getElementsByTagName: () => [],
  addEventListener: (type, fn) => {
    if (type === "DOMContentLoaded") listeners.domready.push(fn);
  },
  removeEventListener: () => {},
  hasFocus: () => true,
  exitFullscreen: () => Promise.resolve(),
  fullscreenElement: null,
  hidden: false,
  fonts: { ready: Promise.resolve(), load: () => Promise.resolve() },
};

class AudioCtxStub {
  constructor() {
    this.currentTime = 0;
    this.destination = {};
    this.state = "running";
    this.sampleRate = 44100;
  }
  createOscillator() {
    return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, type: "sine", onended: null, disconnect: () => {} };
  }
  createGain() {
    return { connect: () => {}, disconnect: () => {}, gain: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, cancelScheduledValues: () => {} } };
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(1024) };
  }
  createBufferSource() {
    return { connect: () => {}, start: () => {}, stop: () => {}, buffer: null, loop: false, playbackRate: { value: 1 }, onended: null };
  }
  createBiquadFilter() {
    return { connect: () => {}, frequency: { value: 0, setValueAtTime: () => {} }, Q: { value: 0 }, type: "lowpass" };
  }
  createAnalyser() {
    return { connect: () => {}, fftSize: 2048, getByteFrequencyData: () => {} };
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

const storageStub = () => {
  const s = new Map();
  return {
    getItem: (k) => (s.has(String(k)) ? s.get(String(k)) : null),
    setItem: (k, v) => s.set(String(k), String(v)),
    removeItem: (k) => s.delete(String(k)),
    clear: () => s.clear(),
    key: (i) => [...s.keys()][i] ?? null,
    get length() { return s.size; },
  };
};

const timeouts = [];
const windowStub = {
  document: documentStub,
  innerWidth: 800,
  innerHeight: 600,
  devicePixelRatio: 1,
  location: { href: "about:blank", search: "", hash: "", protocol: "https:", reload: () => {} },
  navigator: { userAgent: "Studio45Verify", language: "de-DE", maxTouchPoints: 5, vibrate: () => true },
  history: { pushState: () => {}, replaceState: () => {} },
  screen: { width: 800, height: 600 },
  localStorage: storageStub(),
  sessionStorage: storageStub(),
  performance: { now: () => Date.now() },
  requestAnimationFrame: (fn) => (listeners.raf.push(fn), listeners.raf.length),
  cancelAnimationFrame: () => {},
  setTimeout: (fn, ms) => (timeouts.push(fn), timeouts.length),
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  addEventListener: (type, fn) => {
    if (type === "load") listeners.load.push(fn);
  },
  removeEventListener: () => {},
  dispatchEvent: () => true,
  getComputedStyle: () => new Proxy({}, { get: () => "" }),
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
  AudioContext: AudioCtxStub,
  webkitAudioContext: AudioCtxStub,
  Audio: function () { return makeElement("audio"); },
  Image: function () { return makeElement("img"); },
  alert: () => {},
  confirm: () => true,
  prompt: () => "",
  fetch: () => { throw new Error("VERIFY: fetch ist im Spiel verboten"); },
  XMLHttpRequest: function () { throw new Error("VERIFY: XMLHttpRequest ist im Spiel verboten"); },
  WebSocket: function () { throw new Error("VERIFY: WebSocket ist im Spiel verboten"); },
  open: () => null,
  focus: () => {},
  scrollTo: () => {},
  frameElement: null,
};
windowStub.window = windowStub;
windowStub.self = windowStub;
windowStub.top = windowStub;
windowStub.parent = windowStub;

// ---- Ausführung -------------------------------------------------------------
const shadowNames = [
  "window", "document", "navigator", "location", "localStorage", "sessionStorage",
  "requestAnimationFrame", "cancelAnimationFrame", "AudioContext", "webkitAudioContext",
  "Audio", "Image", "alert", "confirm", "prompt", "fetch", "XMLHttpRequest", "WebSocket",
  "innerWidth", "innerHeight", "devicePixelRatio", "performance", "screen",
  "getComputedStyle", "matchMedia", "addEventListener", "removeEventListener",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "history", "top", "parent", "self",
];
const shadowValues = shadowNames.map((n) => windowStub[n] ?? windowStub);

try {
  for (const src of scripts) {
    const fn = new Function(...shadowNames, `"use strict";\n${src}`);
    fn.call(windowStub, ...shadowValues);
  }
  // Load-Events + erste Timeouts feuern
  for (const fn of [...listeners.domready, ...listeners.load]) fn({ type: "load" });
  for (const fn of timeouts.splice(0)) fn();
  // N Frames Renderloop
  for (let frame = 0; frame < FRAMES; frame++) {
    const cbs = listeners.raf.splice(0);
    for (const cb of cbs) cb(frame * 16.7);
    if (listeners.raf.length === 0 && cbs.length === 0) break;
  }
  console.log(`VERIFY: OK (${scripts.length} Scripts, ${FRAMES} Frames)`);
  process.exit(0);
} catch (err) {
  console.error(`VERIFY: ${err && err.message ? err.message : err}`);
  process.exit(1);
}
