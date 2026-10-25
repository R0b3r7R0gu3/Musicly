(() => {
  const L = MusiclyLib;
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");

  // ---------- Stato ----------
  const load = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };

  const state = {
    view: "library",          // "library" | "favorites" | "pl:<id>"
    query: "",
    queue: [],                // brani della lista da cui è partita la riproduzione
    index: -1,
    shuffle: false,
    repeat: false,
    favorites: load("musicly.favorites", []),
    playlists: load("musicly.playlists", [])   // [{id, name, trackIds: []}]
  };

  const currentTracks = () =>
    L.tracksForView({
      view: state.view,
      tracks: TRACKS,
      favorites: state.favorites,
      playlists: state.playlists,
      query: state.query
    });

  const inPlaylist = () => state.view.startsWith("pl:");

  function viewTitle() {
    if (state.view === "library") return "Libreria";
    if (state.view === "favorites") return "Preferiti";
    const pl = state.playlists.find((p) => p.id === state.view.slice(3));
    return pl ? pl.name : "Playlist";
  }

  // ---------- Rendering ----------
  function render() {
    $("view-title").textContent = viewTitle();
    document.querySelectorAll(".nav-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === state.view)
    );
    renderPlaylists();
    renderTracks();
  }

  function renderPlaylists() {
    const ul = $("playlist-list");
    ul.innerHTML = "";
    state.playlists.forEach((pl) => {
      const li = document.createElement("li");
      li.className = state.view === "pl:" + pl.id ? "active" : "";
      const name = document.createElement("span");
      name.textContent = pl.name;
      const del = document.createElement("button");
      del.className = "del";
      del.textContent = "✕";
      del.title = "Elimina playlist";
      del.onclick = (e) => {
        e.stopPropagation();
        if (!confirm(`Eliminare "${pl.name}"?`)) return;
        state.playlists = L.deletePlaylist(state.playlists, pl.id);
        save("musicly.playlists", state.playlists);
        if (state.view === "pl:" + pl.id) state.view = "library";
        render();
      };
      li.append(name, del);
      li.onclick = () => { state.view = "pl:" + pl.id; render(); };
      ul.appendChild(li);
    });
  }

  function renderTracks() {
    const ul = $("track-list");
    const tracks = currentTracks();
    ul.innerHTML = "";
    if (!tracks.length) {
      const p = document.createElement("li");
      p.className = "empty";
      p.textContent = "Nessun brano qui.";
      ul.appendChild(p);
      return;
    }
    const playingId = state.queue[state.index]?.id;
    tracks.forEach((t, i) => {
      const li = document.createElement("li");
      li.className = "track" + (t.id === playingId ? " playing" : "");

      const cover = document.createElement("div");
      cover.className = "t-cover";
      cover.style.background = t.cover;

      const info = document.createElement("div");
      const title = document.createElement("div");
      title.className = "t-title";
      title.textContent = t.title;
      const meta = document.createElement("div");
      meta.className = "t-meta";
      meta.textContent = `${t.artist} · ${t.album}`;
      info.append(title, meta);

      const fav = document.createElement("button");
      const isFav = state.favorites.includes(t.id);
      fav.textContent = isFav ? "♥" : "♡";
      fav.className = isFav ? "on" : "";
      fav.title = "Preferito";
      fav.onclick = (e) => { e.stopPropagation(); toggleFavorite(t.id); };

      const add = document.createElement("button");
      add.textContent = inPlaylist() ? "−" : "＋";
      add.title = inPlaylist() ? "Rimuovi dalla playlist" : "Aggiungi a playlist";
      add.onclick = (e) => {
        e.stopPropagation();
        inPlaylist() ? removeFromPlaylist(t.id) : addToPlaylist(t.id);
      };

      li.append(cover, info, fav, add);
      li.onclick = () => playFrom(tracks, i);
      ul.appendChild(li);
    });
  }

  // ---------- Preferiti e playlist ----------
  function toggleFavorite(id) {
    state.favorites = L.toggleId(state.favorites, id);
    save("musicly.favorites", state.favorites);
    renderTracks();
  }

  function createPlaylist() {
    const name = prompt("Nome della nuova playlist:");
    const next = L.createPlaylist(state.playlists, name, Date.now());
    if (next === state.playlists) return;
    state.playlists = next;
    save("musicly.playlists", state.playlists);
    render();
  }

  function addToPlaylist(trackId) {
    if (!state.playlists.length) {
      alert("Crea prima una playlist con il pulsante ＋ nella barra laterale.");
      return;
    }
    const list = state.playlists.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    const n = parseInt(prompt(`Aggiungi a quale playlist?\n${list}`), 10);
    const pl = state.playlists[n - 1];
    if (!pl) return;
    state.playlists = L.addTrackToPlaylist(state.playlists, pl.id, trackId);
    save("musicly.playlists", state.playlists);
  }

  function removeFromPlaylist(trackId) {
    state.playlists = L.removeTrackFromPlaylist(state.playlists, state.view.slice(3), trackId);
    save("musicly.playlists", state.playlists);
    renderTracks();
  }

  // ---------- Player ----------
  function playFrom(tracks, i) {
    state.queue = tracks;
    state.index = i;
    loadCurrent(true);
  }

  function loadCurrent(autoplay) {
    const t = state.queue[state.index];
    if (!t) return;
    audio.src = t.src;
    $("now-title").textContent = t.title;
    $("now-artist").textContent = t.artist;
    $("cover").style.background = t.cover;
    document.title = `${t.title} · Musicly`;
    updateMediaSession(t);
    if (autoplay) audio.play().catch(() => {});
    renderTracks();
  }

  function togglePlay() {
    if (state.index === -1) {
      const tracks = currentTracks();
      if (tracks.length) playFrom(tracks, 0);
      return;
    }
    audio.paused ? audio.play() : audio.pause();
  }

  function next(auto = false) {
    const i = L.nextIndex({
      index: state.index,
      length: state.queue.length,
      shuffle: state.shuffle,
      repeat: state.repeat,
      auto
    });
    if (i === -1) return;                     // fine coda
    if (i === state.index && auto) { audio.currentTime = 0; audio.play(); return; }
    state.index = i;
    loadCurrent(true);
  }

  function prev() {
    if (!state.queue.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    state.index = L.prevIndex({ index: state.index, length: state.queue.length });
    loadCurrent(true);
  }

  // ---------- Controlli di sistema (schermata di blocco, tasti multimediali) ----------
  function updateMediaSession(t) {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title,
      artist: t.artist,
      album: t.album,
      artwork: [{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }]
    });
  }

  if ("mediaSession" in navigator) {
    const handlers = {
      play: () => audio.play(),
      pause: () => audio.pause(),
      previoustrack: prev,
      nexttrack: () => next(false)
    };
    for (const [action, fn] of Object.entries(handlers)) {
      try { navigator.mediaSession.setActionHandler(action, fn); } catch {}
    }
  }

  // ---------- Eventi ----------
  $("play").onclick = togglePlay;
  $("next").onclick = () => next(false);
  $("prev").onclick = prev;
  $("shuffle").onclick = (e) => {
    state.shuffle = !state.shuffle;
    e.currentTarget.classList.toggle("on", state.shuffle);
  };
  $("repeat").onclick = (e) => {
    state.repeat = !state.repeat;
    e.currentTarget.classList.toggle("on", state.repeat);
  };
  $("new-playlist").onclick = createPlaylist;

  $("search").oninput = (e) => { state.query = e.target.value; renderTracks(); };
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.onclick = () => { state.view = b.dataset.view; render(); };
  });

  audio.addEventListener("play", () => ($("play").textContent = "⏸"));
  audio.addEventListener("pause", () => ($("play").textContent = "▶"));
  audio.addEventListener("ended", () => next(true));
  audio.addEventListener("loadedmetadata", () => ($("duration").textContent = L.formatTime(audio.duration)));
  audio.addEventListener("timeupdate", () => {
    $("current").textContent = L.formatTime(audio.currentTime);
    if (audio.duration) $("seek").value = (audio.currentTime / audio.duration) * 100;
  });
  audio.addEventListener("error", () => {
    if (audio.src) $("now-artist").textContent = "Impossibile riprodurre (sei offline?)";
  });

  $("seek").oninput = (e) => {
    if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
  };
  $("volume").oninput = (e) => { audio.volume = e.target.value; };
  audio.volume = parseFloat($("volume").value);

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" && e.target.type !== "range") return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    if (e.code === "ArrowRight" && e.shiftKey) next(false);
    if (e.code === "ArrowLeft" && e.shiftKey) prev();
  });

  // ---------- Installazione (PWA) ----------
  let installPrompt = null;
  const installBtn = $("install");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.onclick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installBtn.hidden = true;
  };

  window.addEventListener("appinstalled", () => { installBtn.hidden = true; });

  // ---------- Offline ----------
  const updateOnline = () => document.body.classList.toggle("offline", !navigator.onLine);
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  render();
})();
