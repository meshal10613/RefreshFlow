# RefreshFlow

RefreshFlow is a premium, open-source Google Chrome Extension (Manifest V3) that provides auto-refresh, page monitoring, and page automation functionality.

Designed to be the best-in-class auto-refresh tool, RefreshFlow offers a modern user interface, self-correcting timers, offline reconciliation, custom CSS/XPath clicks, DOM diff-based monitoring, and granular control over target tabs.

---

## Features

- **Auto Refresh**: Target active tabs, selected tabs, pinned tabs, inactive tabs, or entire windows.
- **Precision Timers**: Fixed intervals, random interval ranges, or cron-like scheduling. Supports sub-minute precision.
- **Page Monitoring**: Monitor specific elements (CSS/XPath), text content, regex patterns, or keywords. Get notified of changes via desktop notifications, sound alerts, or badge counts.
- **Page Automation**: Automate click sequences, scrolls, and form fills.
- **Profiles & Backups**: Save and switch configurations easily. Backup settings as JSON.
- **Draggable Snapping Timer Overlay**:
  - A square floating countdown overlay injected on the page itself.
  - Features direct controls (Play/Pause, Reset, and Stop) to control the refresh process from the webpage.
  - Snap-to-corner dragging: drag it anywhere, and it snaps smoothly to the nearest viewport corner (Top-Left, Top-Right, Bottom-Left, Bottom-Right) and persists its position.
  - Full Light/Dark/System theme matching matching the extension's appearance.
- **User Interaction Refresh Behaviors**:
  - Restricts page refreshes from disrupting your work.
  - Automatically pauses, stops, or restarts the countdown when page interactions (clicks, keyboard inputs, scrolling) are detected.
  - Built-in 2-second cooldown throttling to protect CPU and battery life.
- **Privacy First**: No tracking, no ads, no analytics, no external servers. 100% runs and stores data locally.

---

## Getting Started

### Installation (Developer Mode)

1. Clone or download this repository.
2. Install dependencies via `pnpm`:
   ```bash
   pnpm install
   ```
3. Build the extension:
   ```bash
   pnpm build
   ```
4. Load the extension in Google Chrome:
   - Navigate to `chrome://extensions/`.
   - Enable "Developer mode" in the top-right corner.
   - Click "Load unpacked".
   - Select the `dist/` folder in the project root.

---

## Development

- `pnpm dev` - Run Vite dev server (for UI pages HMR).
- `pnpm build` - Compile the extension, background worker, and content scripts into `dist/`.
- `pnpm test` - Run the unit and integration tests.
- `pnpm run lint` - Run ESLint checks.
- `pnpm run format` - Format the codebase with Prettier.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
