const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/lib.js");

const TRACKS = [
  { id: 1, title: "Alba", artist: "Luna", album: "Giorno" },
  { id: 2, title: "Tramonto", artist: "Sole", album: "Sera" },
  { id: 3, title: "Notte", artist: "Luna", album: "Sera" }
];

test("formatTime: formato m:ss", () => {
  assert.equal(L.formatTime(0), "0:00");
  assert.equal(L.formatTime(5), "0:05");
  assert.equal(L.formatTime(65.9), "1:05");
  assert.equal(L.formatTime(600), "10:00");
});

test("formatTime: valori non validi diventano 0:00", () => {
  assert.equal(L.formatTime(NaN), "0:00");
  assert.equal(L.formatTime(Infinity), "0:00");
  assert.equal(L.formatTime(-3), "0:00");
  assert.equal(L.formatTime(undefined), "0:00");
});

test("filterTracks: cerca in titolo, artista e album senza distinguere maiuscole", () => {
  assert.deepEqual(L.filterTracks(TRACKS, "alba").map((t) => t.id), [1]);
  assert.deepEqual(L.filterTracks(TRACKS, "LUNA").map((t) => t.id), [1, 3]);
  assert.deepEqual(L.filterTracks(TRACKS, "sera").map((t) => t.id), [2, 3]);
});

test("filterTracks: query vuota o spazi restituisce tutto, nessun risultato dà lista vuota", () => {
  assert.equal(L.filterTracks(TRACKS, "").length, 3);
  assert.equal(L.filterTracks(TRACKS, "   ").length, 3);
  assert.equal(L.filterTracks(TRACKS, undefined).length, 3);
  assert.deepEqual(L.filterTracks(TRACKS, "xyz"), []);
});

test("toggleId: aggiunge e rimuove senza modificare l'originale", () => {
  const a = [1, 2];
  const b = L.toggleId(a, 3);
  assert.deepEqual(b, [1, 2, 3]);
  assert.deepEqual(a, [1, 2]);
  assert.deepEqual(L.toggleId(b, 2), [1, 3]);
});

test("nextIndex: avanza in ordine", () => {
  assert.equal(L.nextIndex({ index: 0, length: 3 }), 1);
  assert.equal(L.nextIndex({ index: 1, length: 3 }), 2);
});

test("nextIndex: a fine coda, manuale ricomincia e automatico si ferma", () => {
  assert.equal(L.nextIndex({ index: 2, length: 3, auto: false }), 0);
  assert.equal(L.nextIndex({ index: 2, length: 3, auto: true }), -1);
});

test("nextIndex: repeat ripete lo stesso brano solo a fine brano automatico", () => {
  assert.equal(L.nextIndex({ index: 1, length: 3, repeat: true, auto: true }), 1);
  assert.equal(L.nextIndex({ index: 1, length: 3, repeat: true, auto: false }), 2);
});

test("nextIndex: shuffle usa rand e non ripete il brano corrente", () => {
  assert.equal(L.nextIndex({ index: 0, length: 4, shuffle: true, rand: () => 0.5 }), 2);
  assert.equal(L.nextIndex({ index: 2, length: 4, shuffle: true, rand: () => 0.5 }), 3);
  assert.equal(L.nextIndex({ index: 3, length: 4, shuffle: true, rand: () => 0.999 }), 0);
  assert.equal(L.nextIndex({ index: 0, length: 1, shuffle: true }), 0);
});

test("nextIndex: shuffle resta sempre nei limiti", () => {
  for (let i = 0; i < 500; i++) {
    const n = L.nextIndex({ index: 1, length: 5, shuffle: true });
    assert.ok(n >= 0 && n < 5 && n !== 1);
  }
});

test("nextIndex e prevIndex: coda vuota", () => {
  assert.equal(L.nextIndex({ index: -1, length: 0 }), -1);
  assert.equal(L.prevIndex({ index: -1, length: 0 }), -1);
});

test("prevIndex: torna indietro con giro completo", () => {
  assert.equal(L.prevIndex({ index: 2, length: 3 }), 1);
  assert.equal(L.prevIndex({ index: 0, length: 3 }), 2);
});

test("createPlaylist: crea con id e nome ripulito, ignora nomi vuoti", () => {
  const a = L.createPlaylist([], "  Studio  ", 42);
  assert.deepEqual(a, [{ id: "42", name: "Studio", trackIds: [] }]);
  assert.equal(L.createPlaylist(a, "   ", 43), a);
  assert.equal(L.createPlaylist(a, null, 43), a);
});

test("deletePlaylist: rimuove solo quella indicata", () => {
  const pls = [{ id: "1", name: "A", trackIds: [] }, { id: "2", name: "B", trackIds: [] }];
  assert.deepEqual(L.deletePlaylist(pls, "1").map((p) => p.id), ["2"]);
  assert.equal(L.deletePlaylist(pls, "zzz").length, 2);
});

test("addTrackToPlaylist: aggiunge senza duplicati e senza mutare", () => {
  const pls = [{ id: "1", name: "A", trackIds: [1] }, { id: "2", name: "B", trackIds: [] }];
  const a = L.addTrackToPlaylist(pls, "1", 2);
  assert.deepEqual(a[0].trackIds, [1, 2]);
  assert.deepEqual(pls[0].trackIds, [1]);
  assert.deepEqual(L.addTrackToPlaylist(a, "1", 2)[0].trackIds, [1, 2]);
  assert.deepEqual(a[1].trackIds, []);
});

test("removeTrackFromPlaylist: toglie il brano dalla playlist giusta", () => {
  const pls = [{ id: "1", name: "A", trackIds: [1, 2] }, { id: "2", name: "B", trackIds: [1] }];
  const r = L.removeTrackFromPlaylist(pls, "1", 1);
  assert.deepEqual(r[0].trackIds, [2]);
  assert.deepEqual(r[1].trackIds, [1]);
});

test("tracksForView: libreria, preferiti, playlist e ricerca", () => {
  const playlists = [{ id: "9", name: "Mix", trackIds: [3, 1, 99] }];
  const base = { tracks: TRACKS, favorites: [2, 3], playlists };

  assert.equal(L.tracksForView({ ...base, view: "library" }).length, 3);
  assert.deepEqual(L.tracksForView({ ...base, view: "favorites" }).map((t) => t.id), [2, 3]);
  // playlist: rispetta l'ordine e ignora id inesistenti
  assert.deepEqual(L.tracksForView({ ...base, view: "pl:9" }).map((t) => t.id), [3, 1]);
  // playlist inesistente
  assert.deepEqual(L.tracksForView({ ...base, view: "pl:nope" }), []);
  // ricerca applicata sopra la vista
  assert.deepEqual(L.tracksForView({ ...base, view: "favorites", query: "luna" }).map((t) => t.id), [3]);
});
