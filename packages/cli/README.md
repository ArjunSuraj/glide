# Glide

Visual editor for web dev servers — select, edit text, move, reorder, duplicate elements, and apply changes directly to source. Works with **React**, **Vue**, and **Angular**.

Glide opens a proxy in front of your dev server and injects an overlay into the page. Every visual change maps to a deterministic source-code transform.

## Installation

### Option 1: Run directly with npx (no install needed)

```bash
cd your-project
npx glide-editor@latest init
```

### Option 2: Install as a dev dependency

```bash
cd your-project
npm install -D glide-editor
```

Or with other package managers:

```bash
pnpm add -D glide-editor
yarn add -D glide-editor
```

## Getting Started

### Step 1: Start your dev server

Start your project's dev server as you normally would:

```bash
# React (Vite)
npm run dev          # usually http://localhost:5173

# React (CRA)
npm start            # usually http://localhost:3000

# Next.js
npm run dev          # usually http://localhost:3000

# Vue (Vite)
npm run dev          # usually http://localhost:5173

# Angular
ng serve             # usually http://localhost:4200
```

### Step 2: Start Glide

In a **separate terminal**, from your project root:

```bash
npx glide start
```

Glide will:
1. Auto-detect your framework and dev server port
2. Start a WebSocket server for live communication
3. Start a proxy server (e.g., `http://localhost:3456`)
4. Open the proxy URL in your browser

You can also specify the port manually:

```bash
npx glide start 5173
```

### Step 3: Edit visually

Open the proxy URL that Glide prints (e.g., `http://localhost:3456`). You'll see your app with the Glide overlay.

## Supported Frameworks

| Framework | Build Tool | Status |
|-----------|-----------|--------|
| React | Next.js, Vite, CRA | Full support |
| Vue | Nuxt, Vite | Full support |
| Angular | Angular CLI | Full support |

## Features

- **Select & Inspect** — click any element to see its component, file path, and properties
- **Property Sidebar** — Tailwind-aware editing for layout (flex/grid), spacing, size, typography, colors
- **Layout Tools** — visual icon controls for flex-direction, justify-content, align-items, wrap, gap, and grid
- **Text Editing** — double-click to edit text inline, changes write to source on Confirm
- **Move** — drag elements to adjust spacing (Tailwind classes or inline transforms)
- **Reorder** — Alt+drag to rearrange sibling elements in source order
- **Duplicate** — Ctrl/Cmd+D to duplicate the selected element
- **Similar Highlights** — automatically highlights elements with matching classes in amber
- **Responsive Editing** — breakpoint picker (sm/md/lg/xl/2xl) for responsive class variants
- **Undo/Redo** — full undo stack with Ctrl+Z / Ctrl+Shift+Z
- **Interact Mode** — press `I` to use the app normally without overlay interference
- **Minimize/Restore** — close button minimizes to a small icon; click to restore

## How It Works

1. **`glide init`** detects your framework and dev server setup
2. **`glide start`** launches a proxy that injects the Glide overlay into your page
3. You make visual changes (edit text, adjust properties, move elements)
4. Click **Confirm** to apply — changes are converted to AST-level source transforms
5. Source files are written deterministically — your dev server's HMR picks up the changes
6. The page updates live without a full reload

## CLI Reference

```
glide init              Set up Glide in your project
glide start [port]      Start the visual editor proxy

Options:
  --no-open             Don't open browser automatically
  --host <host>         Dev server host (default: "localhost")
  --verbose             Enable debug logging
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Select tool | `S` |
| Text tool | `T` |
| Interact mode | `I` |
| Undo | `Ctrl+Z` / `Cmd+Z` |
| Redo | `Ctrl+Shift+Z` / `Cmd+Shift+Z` |
| Similar Highlights | `Ctrl+Shift+H` / `Cmd+Shift+H` |
| Duplicate | `Ctrl+D` / `Cmd+D` |
| Reorder (drag) | `Alt+Drag` |
| Pan canvas | `Space+Drag` |
| Zoom | `Ctrl+Scroll` / `Cmd+Scroll` |
| Shortcuts overlay | `?` |
| Deselect | `Esc` |

## Requirements

- Node.js 18+
- A running development server (Vite, Next.js, CRA, Angular CLI, etc.)
- React, Vue, or Angular project

## Troubleshooting

**Glide can't detect my dev server**
- Make sure your dev server is running before starting Glide
- Try specifying the port manually: `npx glide start 3000`

**Changes don't apply on Confirm**
- Check that the file path shown in the sidebar matches your source file
- Enable verbose logging: `npx glide start --verbose`

**Page looks wrong after Confirm**
- This can happen with Tailwind v4 + HMR. A page reload fixes it.
- Glide removes inline style overrides after commit so HMR classes take effect

**Overlay not appearing**
- Make sure you're visiting the Glide proxy URL (e.g., `localhost:3456`), not the direct dev server URL
- Check the terminal for connection errors

## License

MIT
