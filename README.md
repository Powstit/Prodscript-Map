# ProdScript · System Map

Interactive flow diagram for the ProdScript app. Every node, every edge, every Iron Gate, in one clickable graph.

Live: **https://map.prodscript.online**

## Why

Before writing new code or wiring new features, you look at the map. You find the node you plan to touch. You see:

- What renders / depends on / reads from / writes to that node
- Every Iron Gate that protects it
- The regression checklist for edits at that node
- Whether the node is on the show-night golden journey

Prose docs cannot answer "if I change the cues table, which 7 surfaces regress" in one glance. This map can. That is how ProdScript prevents regression from day one.

## How it stays honest

- The data lives in the main app repo at [`Powstit/Prodscript/docs/system-map.json`](https://github.com/Powstit/Prodscript/blob/main/docs/system-map.json).
- The renderer here fetches that JSON on every load. No sync issues.
- Any commit to the main repo that touches surface code should update the JSON in the same commit. Enforced by a pre-commit hook in the main repo.

## Stack

Pure static HTML. Cytoscape.js loaded via CDN. Dagre layout. No build step. Deploys to Vercel as a static site.

## Local dev

```
cd prodscript-map
python3 -m http.server 8080
open http://localhost:8080
```

## Deploy

```
vercel --prod
```

## Edit the data

Two ways:

1. **Live in the app**: drag nodes around in the browser, click EXPORT LAYOUT, download the updated JSON, PR it into the main repo.
2. **Direct edit**: open `docs/system-map.json` in the main repo, edit, commit. The map picks it up on the next load.
