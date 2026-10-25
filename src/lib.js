// Logica pura di Musicly: nessun accesso al DOM, quindi testabile con Node.
// Nel browser è disponibile come `MusiclyLib`, in Node con require().
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MusiclyLib = factory();
})(typeof self !== "undefined" ? self : this, function () {
  /** Secondi -> "m:ss". Valori non validi diventano "0:00". */
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  /** Filtra per titolo, artista o album (senza distinzione tra maiuscole). */
  function filterTracks(tracks, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) =>
      [t.title, t.artist, t.album].some((v) => String(v).toLowerCase().includes(q))
    );
  }

  /** Aggiunge l'id se manca, lo toglie se c'è. Non modifica l'array originale. */
  function toggleId(list, id) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  /**
   * Indice del brano successivo, oppure -1 se la coda è finita.
   * - auto: true quando il brano è finito da solo
   * - repeat (solo con auto): ripete lo stesso brano
   * - shuffle: sceglie a caso, evitando di ripetere il brano corrente se possibile
   * - rand: funzione che restituisce un numero in [0, 1), per i test
   */
  function nextIndex({ index, length, shuffle = false, repeat = false, auto = false, rand = Math.random }) {
    if (length <= 0) return -1;
    if (auto && repeat) return index;
    if (shuffle) {
      if (length === 1) return 0;
      let i = Math.floor(rand() * length);
      if (i >= length) i = length - 1;
      if (i === index) i = (i + 1) % length;
      return i;
    }
    if (index < length - 1) return index + 1;
    return auto ? -1 : 0;
  }

  /** Indice del brano precedente, con giro completo. */
  function prevIndex({ index, length }) {
    if (length <= 0) return -1;
    return (index - 1 + length) % length;
  }

  // ----- Playlist (funzioni pure: restituiscono sempre un nuovo array) -----

  function createPlaylist(playlists, name, id) {
    const clean = String(name || "").trim();
    if (!clean) return playlists;
    return [...playlists, { id: String(id), name: clean, trackIds: [] }];
  }

  function deletePlaylist(playlists, id) {
    return playlists.filter((p) => p.id !== id);
  }

  function addTrackToPlaylist(playlists, playlistId, trackId) {
    return playlists.map((p) =>
      p.id === playlistId && !p.trackIds.includes(trackId)
        ? { ...p, trackIds: [...p.trackIds, trackId] }
        : p
    );
  }

  function removeTrackFromPlaylist(playlists, playlistId, trackId) {
    return playlists.map((p) =>
      p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p
    );
  }

  /**
   * Brani da mostrare per una vista: "library", "favorites" oppure "pl:<id>".
   * Il filtro di ricerca si applica sopra la vista.
   */
  function tracksForView({ view, tracks, favorites, playlists, query = "" }) {
    let list = tracks;
    if (view === "favorites") {
      list = tracks.filter((t) => favorites.includes(t.id));
    } else if (typeof view === "string" && view.startsWith("pl:")) {
      const pl = playlists.find((p) => p.id === view.slice(3));
      list = pl ? pl.trackIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) : [];
    }
    return filterTracks(list, query);
  }

  return {
    formatTime,
    filterTracks,
    toggleId,
    nextIndex,
    prevIndex,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    tracksForView
  };
});
