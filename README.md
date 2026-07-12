# RefreshFlow

RefreshFlow is a completely original, free, open-source Chrome Extension (Manifest V3) that provides auto-refresh, page monitoring, and page automation functionality.

Designed to be the best-in-class auto-refresh tool, RefreshFlow offers a premium user interface, self-correcting timers, offline reconciliation, custom CSS/XPath clicks, DOM diff-based monitoring, and granular control over target tabs.

## Features

- **Auto Refresh**: Target current tabs, selected tabs, pinned tabs, inactive tabs, or whole windows.
- **Precision Timers**: Fixed intervals, random interval ranges, or cron-like scheduling. Supports sub-minute precision.
- **Page Monitoring**: Monitor specific elements (CSS/XPath), text content, regex patterns, or keywords. Get notified of changes via desktop notifications, sound alerts, or badge counts.
- **Page Automation**: Automate click sequences, scrolls, and form fills.
- **Profiles & Backups**: Save and switch configurations easily. Backup settings as JSON.
- **Privacy First**: No tracking, no ads, no analytics, no external servers. 100% runs and stores data locally.

## Getting Started

### Installation (Developer Mode)

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`.
   - Enable "Developer mode" in the top-right corner.
   - Click "Load unpacked".
   - Select the `dist/` folder in the project root.

## Development

- `npm run dev` - Run Vite dev server (for UI pages HMR).
- `npm run build` - Compile the extension, background worker, and content scripts into `dist/`.
- `npm test` - Run the unit and integration tests.
- `npm run lint` - Run ESLint checks.
- `npm run format` - Format the codebase with Prettier.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
