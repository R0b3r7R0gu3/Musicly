// Verifica che l'app sia davvero installabile e che i file siano coerenti tra loro.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SRC = path.join(__dirname, "..", "src");
const read = (f) => fs.readFileSync(path.join(SRC, f), "utf8");
const exists = (f) => fs.existsSync(path.join(SRC, f));
const manifest = JSON.parse(read("manifest.webmanifest"));
const html = read("index.html");

function pngSize(file) {
  const buf = fs.readFileSync(path.join(SRC, file));
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file} non è un PNG`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// ---------- Manifest ----------
test("manifest: campi richiesti per l'installazione", () => {
  assert.ok(manifest.name && manifest.short_name);
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.start_url);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
});

test("manifest: percorsi relativi (funziona anche su GitHub Pages in sottocartella)", () => {
  for (const key of ["start_url", "scope", "id"]) {
    assert.ok(!manifest[key].startsWith("/"), `${key} non deve essere assoluto`);
  }
  for (const icon of manifest.icons) assert.ok(!icon.src.startsWith("/"));
});

test("manifest: icone esistenti, con le dimensioni dichiarate", () => {
  for (const icon of manifest.icons) {
    assert.ok(exists(icon.src), `manca ${icon.src}`);
    const [w, h] = icon.sizes.split("x").map(Number);
    assert.deepEqual(pngSize(icon.src), { w, h }, `dimensioni errate: ${icon.src}`);
  }
});

test("manifest: c'è almeno un'icona 192, una 512 e una maskable", () => {
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192"));
  assert.ok(sizes.includes("512x512"));
  assert.ok(manifest.icons.some((i) => i.purpose === "maskable"));
});

// ---------- index.html ----------
test("index.html: collega manifest, icona iOS e theme-color", () => {
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /rel="apple-touch-icon" href="icons\/apple-touch-icon\.png"/);
  assert.match(html, /<meta name="theme-color"/);
  assert.match(html, /<meta name="viewport"/);
  assert.ok(exists("icons/apple-touch-icon.png"));
  assert.deepEqual(pngSize("icons/apple-touch-icon.png"), { w: 180, h: 180 });
});

test("index.html: tutti gli script e i fogli di stile referenziati esistono", () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|webmanifest|png))"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 6);
  for (const r of refs) assert.ok(exists(r), `file mancante: ${r}`);
});

test("index.html: lib.js e tracks.js sono caricati prima di app.js", () => {
  const order = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("lib.js") < order.indexOf("app.js"));
  assert.ok(order.indexOf("tracks.js") < order.indexOf("app.js"));
});

test("index.html: ogni id usato da app.js esiste nella pagina", () => {
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const used = [...read("app.js").matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]);
  for (const id of used) assert.ok(ids.has(id), `id mancante in index.html: ${id}`);
});

test("app.js: registra il service worker e gestisce l'installazione", () => {
  const js = read("app.js");
  assert.match(js, /serviceWorker\.register\("sw\.js"\)/);
  assert.match(js, /beforeinstallprompt/);
});

// ---------- Catalogo brani ----------
test("tracks.js: brani ben formati, con id unici", () => {
  const TRACKS = vm.runInNewContext(read("tracks.js") + "; TRACKS");
  assert.ok(TRACKS.length > 0);
  const ids = new Set();
  for (const t of TRACKS) {
    for (const k of ["id", "title", "artist", "album", "src", "cover"]) {
      assert.ok(t[k] !== undefined && t[k] !== "", `campo ${k} mancante nel brano ${t.id}`);
    }
    assert.ok(!ids.has(t.id), `id duplicato: ${t.id}`);
    ids.add(t.id);
  }
});

// ---------- Service worker ----------
function loadSW({ cacheNames = [] } = {}) {
  const listeners = {};
  const store = new Map(cacheNames.map((n) => [n, new Map()]));
  const calls = { addAll: [], deleted: [], skipWaiting: 0, claim: 0 };

  const caches = {
    open: async (name) => {
      if (!store.has(name)) store.set(name, new Map());
      const c = store.get(name);
      return {
        addAll: async (files) => { calls.addAll.push(...files); files.forEach((f) => c.set(f, "x")); },
        put: async (req, res) => c.set(req.url, res)
      };
    },
    keys: async () => [...store.keys()],
    delete: async (name) => { calls.deleted.push(name); return store.delete(name); },
    match: async () => undefined
  };

  const self = {
    location: { origin: "https://musicly.test" },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: () => { calls.skipWaiting++; return Promise.resolve(); },
    clients: { claim: () => { calls.claim++; return Promise.resolve(); } }
  };

  vm.runInNewContext(read("sw.js"), { self, caches, URL, fetch: async () => ({ ok: true, clone() { return this; } }) });
  return { listeners, calls, store };
}

test("sw.js: ogni file del precache esiste davvero", () => {
  const { listeners, calls } = loadSW();
  let p;
  listeners.install({ waitUntil: (x) => (p = x) });
  return p.then(() => {
    assert.ok(calls.addAll.length >= 8);
    for (const f of calls.addAll) {
      assert.ok(f === "./" || exists(f), `il precache contiene un file inesistente: ${f}`);
    }
    assert.ok(calls.addAll.includes("app.js"));
    assert.ok(calls.addAll.includes("lib.js"));
    assert.ok(calls.addAll.includes("index.html"));
    assert.equal(calls.skipWaiting, 1);
  });
});

test("sw.js: l'attivazione elimina le vecchie cache e prende il controllo", async () => {
  const { listeners, calls } = loadSW({ cacheNames: ["musicly-v0", "musicly-v1", "altro"] });
  let p;
  listeners.activate({ waitUntil: (x) => (p = x) });
  await p;
  assert.deepEqual(calls.deleted.sort(), ["altro", "musicly-v0"]);
  assert.equal(calls.claim, 1);
});

test("sw.js: ignora audio e richieste di altre origini, e le non-GET", () => {
  const { listeners } = loadSW();
  const handled = (url, method = "GET") => {
    let called = false;
    listeners.fetch({ request: { url, method }, respondWith: () => (called = true) });
    return called;
  };
  assert.equal(handled("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"), false);
  assert.equal(handled("https://musicly.test/api", "POST"), false);
  assert.equal(handled("https://musicly.test/app.js"), true);
});
