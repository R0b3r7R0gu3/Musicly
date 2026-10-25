(() => {
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
    queue: [],                // brani della vista corrente
    index: -1,
    shuffle: false,
    repeat: false,
    favorites: load("musicly.favorites", []),
    playlists: load("musicly.playlists", [])   // [{id, name, trackIds: []}]
  };

  const byId = (id) => TRACKS.find((t) => t.id === id);
  const fmt = (s) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  // ---------- Viste ----------
  function currentTracks() {
    let list = TRACKS;
    if (state.view === "favorites") {
      list = TRACKS.filter((t) => state.favorites.includes(t.id));
    } else if (state.view.startsWith("pl:")) {
      const pl = state.playlists.find((p) => p.id === state.view.slice(3));
      list = pl ? pl.trackIds.map(byId).filter(Boolean) : [];
    }
    const q = state.query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.title, t.artist, t.album].some((v) => v.toLowerCase().includes(q))
      );
    }
    return list;
  }

  function viewTitle() {
    if (state.view === "library") return "Libreria";
    if (state.view === "favorites") return "Preferiti";
    const pl = state.playlists.find((p) => p.id === state.view.slice(3));
    return pl ? pl.name : "Playlist";
  }

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
        state.playlists = state.playlists.filter((p) => p.id !== pl.id);
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
    tracks.forEach((t) => {
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
      add.textContent = state.view.startsWith("pl:") ? "−" : "＋";
      add.title = state.view.startsWith("pl:") ? "Rimuovi dalla playlist" : "Aggiungi a playlist";
      add.onclick = (e) => {
        e.stopPropagation();
        state.view.startsWith("pl:") ? removeFromPlaylist(t.id) : addToPlaylist(t.id);
      };

      li.append(cover, info, fav, add);
      li.onclick = () => playFrom(tracks, tracks.indexOf(t));
      ul.appendChild(li);
    });
  }

  // ---------- Preferiti e playlist ----------
  function toggleFavorite(id) {
    const i = state.favorites.indexOf(id);
    i === -1 ? state.favorites.push(id) : state.favorites.splice(i, 1);
    save("musicly.favorites", state.favorites);
    renderTracks();
  }

  function createPlaylist() {
    const name = prompt("Nome della nuova playlist:");
    if (!name || !name.trim()) return;
    state.playlists.push({ id: String(Date.now()), name: name.trim(), trackIds: [] });
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
    if (!pl.trackIds.includes(trackId)) pl.trackIds.push(trackId);
    save("musicly.playlists", state.playlists);
  }

  function removeFromPlaylist(trackId) {
    const pl = state.playlists.find((p) => p.id === state.view.slice(3));
    if (!pl) return;
    pl.trackIds = pl.trackIds.filter((id) => id !== trackId);
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
    if (!state.queue.length) return;
    if (auto && state.repeat) { audio.currentTime = 0; audio.play(); return; }
    if (state.shuffle) {
      state.index = Math.floor(Math.random() * state.queue.length);
    } else if (state.index < state.queue.length - 1) {
      state.index++;
    } else if (auto) {
      return;                       // fine coda
    } else {
      state.index = 0;
    }
    loadCurrent(true);
  }

  function prev() {
    if (!state.queue.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    state.index = (state.index - 1 + state.queue.length) % state.queue.length;
    loadCurrent(true);
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
  audio.addEventListener("loadedmetadata", () => ($("duration").textContent = fmt(audio.duration)));
  audio.addEventListener("timeupdate", () => {
    $("current").textContent = fmt(audio.currentTime);
    if (audio.duration) $("seek").value = (audio.currentTime / audio.duration) * 100;
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

  render();
})();
