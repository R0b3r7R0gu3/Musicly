# 🎵 Musicly

[![CI](https://github.com/R0b3r7R0gu3/Musicly/actions/workflows/ci.yml/badge.svg)](https://github.com/R0b3r7R0gu3/Musicly/actions/workflows/ci.yml)

Un'app di streaming musicale in stile Spotify, **installabile** su telefono e computer (PWA). Costruita con HTML, CSS e JavaScript puro: nessuna dipendenza, nessun build.

## Funzionalità

- Player con play/pausa, brano precedente/successivo, seek e volume
- Shuffle e repeat
- Libreria con ricerca in tempo reale
- Playlist personali e brani preferiti, salvati nel browser
- Controlli da schermata di blocco e tasti multimediali (Media Session)
- Scorciatoie: `Spazio` play/pausa, `Shift + ←/→` brano precedente/successivo
- **Installabile** come app, con interfaccia disponibile anche offline
- Tema scuro e layout responsive

## Installarla come app

Serve servirla da `https` oppure da `localhost` (requisito dei browser per le PWA).

- **Chrome / Edge (computer e Android)**: clicca "⬇ Installa app" nella barra laterale, oppure l'icona di installazione nella barra degli indirizzi.
- **Safari (iPhone/iPad)**: tasto Condividi → "Aggiungi alla schermata Home".

Offline funziona l'interfaccia; i brani richiedono la connessione, perché non vengono salvati in cache.

### Pubblicarla online (GitHub Pages)

Il workflow `.github/workflows/pages.yml` pubblica la cartella `src/` a ogni push su `main`. Basta attivare Pages una volta: **Settings → Pages → Source: GitHub Actions**. L'app sarà su `https://<utente>.github.io/Musicly/`.

## Avvio in locale

```bash
git clone https://github.com/R0b3r7R0gu3/Musicly.git
cd Musicly
npm start
```

Poi apri http://localhost:3000. (Richiede Node 20 o superiore.)

## Test

```bash
npm test
```

Usa il test runner integrato di Node (nessuna dipendenza). Coprono:

- la logica del player e delle playlist (`src/lib.js`)
- la correttezza di manifest, icone e `index.html`
- il comportamento del service worker (precache, pulizia vecchie cache, audio escluso dalla cache)

## Struttura

```
musicly/
├── src/
│   ├── index.html             # Struttura della pagina
│   ├── style.css              # Stile (tema scuro)
│   ├── app.js                 # Interfaccia e collegamento con l'audio
│   ├── lib.js                 # Logica pura, testabile
│   ├── tracks.js              # Catalogo brani di esempio
│   ├── sw.js                  # Service worker (uso offline)
│   ├── manifest.webmanifest   # Dati per l'installazione
│   └── icons/                 # Icone dell'app
├── test/                      # Test automatici
├── scripts/make-icons.py      # Rigenera le icone (pip install pillow)
├── .github/workflows/         # CI e deploy su GitHub Pages
├── docs/ROADMAP.md
└── LICENSE
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

`src` può essere un URL o un file locale. Usa solo musica di cui possiedi i diritti o con licenza libera. Se cambi i file dell'app, incrementa `CACHE` in `src/sw.js` (es. `musicly-v2`) così gli utenti ricevono l'aggiornamento.

## Roadmap

Vedi [docs/ROADMAP.md](docs/ROADMAP.md).

## Licenza

MIT, vedi [LICENSE](LICENSE).
