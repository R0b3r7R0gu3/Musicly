# 🎵 Musicly

Un'app di streaming musicale in stile Spotify, costruita con HTML, CSS e JavaScript puro. Nessuna dipendenza, nessun build: apri `src/index.html` e parti.

## Funzionalità

- Player con play/pausa, brano precedente/successivo
- Barra di avanzamento con seek e controllo del volume
- Shuffle e repeat
- Libreria con ricerca in tempo reale
- Playlist personali (crea, aggiungi e rimuovi brani), salvate nel `localStorage`
- Brani preferiti (cuore)
- Layout responsive con tema scuro

## Avvio rapido

```bash
git clone https://github.com/<tuo-utente>/musicly.git
cd musicly
npm start
```

Poi apri http://localhost:3000. In alternativa, apri direttamente `src/index.html` nel browser.

## Struttura

```
musicly/
├── src/
│   ├── index.html      # Struttura della pagina
│   ├── style.css       # Stile (tema scuro)
│   ├── app.js          # Logica del player e delle playlist
│   └── tracks.js       # Catalogo brani di esempio
├── docs/
│   └── ROADMAP.md      # Idee e sviluppi futuri
├── package.json
├── LICENSE
└── README.md
```

## Aggiungere i tuoi brani

Modifica `src/tracks.js` e aggiungi un oggetto all'array:

```js
{
  id: 7,
  title: "Titolo",
  artist: "Artista",
  album: "Album",
  src: "https://esempio.com/brano.mp3",
  cover: "#1db954"
}
```

`src` può essere un URL o un file locale. Usa solo musica di cui possiedi i diritti o con licenza libera.

## Roadmap

Vedi [docs/ROADMAP.md](docs/ROADMAP.md).

## Licenza

MIT, vedi [LICENSE](LICENSE).
