# Glide

Glide is a visual editor for web dev servers. Select elements, edit text, adjust spacing, and apply changes directly to your source files — all from the browser.

Works with **React**, **Vue**, and **Angular**.

## Quick start

```bash
npx glide-editor@latest
```

Or install it in your project:

```bash
npm install -D glide-editor
```

Then set it up:

```bash
npx glide init
```

This detects your framework and dev server port, and adds a `"glide"` script to your `package.json`.

## Usage

1. Start your dev server as usual (`npm run dev`, `ng serve`, etc.)
2. In a second terminal, from the same project root:

```bash
npx glide
```

Or, if you ran `glide init`:

```bash
npm run glide
```

If auto-detection doesn't pick the right port, pass it explicitly:

```bash
npx glide 5173
```

Glide opens a local proxy in your browser with the editing overlay. Confirmed changes are written back to your source files.

## What you can do

- **Select** any element and see its component name, file path, and line number
- **Edit text** by double-clicking
- **Move elements** with spacing controls
- **Edit properties** (layout, spacing, typography, colors) via the sidebar
- **Stage multiple changes** and apply them with Confirm
- **Undo** changes individually or reset everything at once
- **Reorder** sibling elements (React)

## Supported frameworks

| Framework | Build tool | Status |
| --- | --- | --- |
| React | Vite, Next.js, CRA | Full support |
| Vue | Vite, Nuxt | Full support |
| Angular | Angular CLI | Full support |

## CLI reference

```text
glide [command] [options]

Commands:
  start [port]    Start the visual editor proxy (default)
  init            Set up Glide in the current project

Options (start):
  --no-open       Don't open browser automatically
  --host <host>   Dev server host (default: "localhost")
  --verbose       Enable debug logging
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + Z` | Undo canvas changes |
| `Ctrl/Cmd + Shift + L` | Toggle changelog |
| `Ctrl/Cmd + Click` | Follow links through the overlay |
| Double-click text | Edit text inline |

## Requirements

- Node.js 18+
- A running development server (not production builds)
- Run from your project root so Glide can detect the framework and resolve file paths

## Install as a dev dependency

```bash
npm install -D glide-editor
npx glide init
```

This adds a script to your `package.json`:

```json
{
  "scripts": {
    "glide": "glide 5173"
  }
}
```

Every developer on the team gets Glide after `npm install` — no global setup needed.

## Development

To work on Glide itself:

```bash
pnpm install
pnpm build
pnpm test -- --run
```

## Project structure

```text
packages/
  cli/      CLI, proxy server, and source transforms
  overlay/  Injected browser overlay
  shared/   Shared TypeScript types
```

## License

[MIT](./LICENSE)
