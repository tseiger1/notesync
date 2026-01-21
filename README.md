# NoteSync Obsidian Plugin

NoteSync watches a configurable directory for handwritten notes, converts the supported files into PNG pages, sends them to an LLM (OpenAI or a local Ollama instance), and stores the resulting Markdown inside an output directory while mirroring the input folder structure.

## Features
- Recursively watches an input directory for new or updated `.pdf` (and future `.note`) files
- Converts PDFs into scaled PNG pages via `sharp` with a pluggable conversion layer
- Sends the PNG pages to OpenAI (`/v1/chat/completions`) or Ollama (`/api/generate`) to turn handwriting into Markdown
- Saves Markdown in the configured output directory, preserving sub-folders and adding a YAML header with provenance metadata
- Remembers previously processed files via a history cache so unchanged scans are skipped automatically
- Ribbon button + command palette entry for manual “Sync now” runs, plus continuous auto-processing toggle
- Status bar updates and desktop notices to show progress/failures

> ℹ️ `.note` files are currently stubbed – they are detected, logged, and skipped until a converter is implemented.

## Development
1. Install dependencies: `npm install`
2. Build once: `npm run build` (outputs `main.js` + sourcemap)
3. For watch mode while developing: `npm run dev`
4. Copy/symlink this folder into your vault’s `.obsidian/plugins` directory (or use Obsidian’s community plugin dev setup) and enable the plugin.

## Configuration
Use the plugin settings inside Obsidian to configure:
- **Input directory**: absolute path that will be monitored (sub-folders included)
- **Output directory**: Markdown destination; also stores `.notesync-cache` PNGs
- **LLM provider + model**: `OpenAI` or `Ollama`, along with API key / endpoint
- **Max image width**: scale-down limit before sending images to the LLM
- **Prompt helper**: optional instructions prepended to every transcription
- **Auto process**: toggle between continuous sync and manual-only mode

Use the ribbon button or the “Run NoteSync once” command any time you want to trigger a manual scan & conversion.
