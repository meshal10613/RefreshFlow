/**
 * Programmatic manifest generator for RefreshFlow.
 * Supports dev vs prod mode environments.
 */
export function getManifest(version: string, description: string, isDev: boolean) {
  return {
    manifest_version: 3,
    name: isDev ? "RefreshFlow (Development)" : "RefreshFlow — Auto Refresh & Page Monitor",
    version,
    description,
    icons: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "64": "icons/icon-64.png",
      "96": "icons/icon-96.png",
      "128": "icons/icon-128.png",
      "256": "icons/icon-256.png",
      "512": "icons/icon-512.png"
    },
    action: {
      default_popup: "src/popup/popup.html",
      default_icon: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      }
    },
    options_ui: {
      page: "src/options/options.html",
      open_in_tab: true
    },
    background: {
      service_worker: "background.js",
      type: "module"
    },
    permissions: [
      "storage",
      "alarms",
      "tabs",
      "notifications",
      "contextMenus",
      "scripting",
      "offscreen",
      "idle"
    ],
    optional_permissions: [],
    optional_host_permissions: [
      "http://*/*",
      "https://*/*"
    ],
    commands: {
      "_execute_action": {
        "suggested_key": {
          "default": "Ctrl+Shift+Y",
          "mac": "Command+Shift+Y"
        },
        "description": "Open RefreshFlow Popup"
      },
      "toggle-refresh-current": {
        "suggested_key": {
          "default": "Alt+Shift+R",
          "mac": "Alt+Shift+R"
        },
        "description": "Toggle auto-refresh on the active tab"
      }
    },
    content_security_policy: isDev ? {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
    } : {
      extension_pages: "script-src 'self'; object-src 'self';"
    }
  };
}
