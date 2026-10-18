/**
 * Tray styles. They live inside the tray's shadow root, so Facebook's CSS
 * can't reach in and ours can't leak out. Colors follow Facebook's own
 * light and dark palettes so the tray feels native.
 */
export const TRAY_CSS = `
:host {
  all: initial;
  --bg: #ffffff;
  --text: #050505;
  --muted: #65676b;
  --border: #ced0d4;
  --hover: #f0f2f5;
  --accent: #0866ff;
  --danger: #e41e3f;
  --track: #bcc0c4;
  --shadow: 0 12px 28px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1);
}
:host([data-theme="dark"]) {
  --bg: #242526;
  --text: #e4e6eb;
  --muted: #b0b3b8;
  --border: #3e4042;
  --hover: #3a3b3c;
  --accent: #2d88ff;
  --danger: #ff6b81;
  --track: #4e4f50;
  --shadow: 0 12px 28px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3);
}
* { box-sizing: border-box; }
.root {
  font: 14px/1.35 system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  color: var(--text);
}
button { font: inherit; color: inherit; }
button:focus-visible, input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
[hidden] { display: none !important; }

/* Collapsed: a slim tab on the right edge, vertically centered. */
.tab {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2147483647;
  width: 28px;
  height: 56px;
  padding: 0;
  display: grid;
  place-items: center;
  background: var(--bg);
  color: var(--muted);
  border: 1px solid var(--border);
  border-right: 0;
  border-radius: 8px 0 0 8px;
  box-shadow: var(--shadow);
  cursor: pointer;
}
.tab:hover { color: var(--text); background: var(--hover); }
.tab svg { width: 18px; height: 18px; }
.dot {
  position: absolute;
  top: 6px;
  left: 5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
  border: 1.5px solid var(--bg);
}

/* Open: a compact panel against the right edge. */
.panel {
  position: fixed;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2147483647;
  width: 300px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  padding: 12px 0 8px;
}
header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px 8px;
}
header svg { width: 20px; height: 20px; color: var(--accent); flex: none; }
h2 { margin: 0; font-size: 17px; font-weight: 700; flex: 1; }
.icon-button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: var(--muted);
}
.icon-button:hover { background: var(--hover); }
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
}
.row .text { flex: 1; min-width: 0; }
.name { font-weight: 600; }
.master { border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 4px; }
.section-label {
  margin: 8px 12px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
ul { list-style: none; margin: 0; padding: 0; }
.status { display: block; font-size: 12px; color: var(--muted); }
.status.not-found { color: var(--danger); font-weight: 600; }
.new {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  background: var(--accent);
  color: #fff;
}
.paused .areas { opacity: 0.55; }

/* Switch: a button with role="switch"; on = shown. */
.switch {
  flex: none;
  position: relative;
  width: 40px;
  height: 22px;
  border: 0;
  border-radius: 11px;
  background: var(--track);
  cursor: pointer;
  padding: 0;
}
.switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 120ms ease;
}
.switch[aria-checked="true"] { background: var(--accent); }
.switch[aria-checked="true"]::after { transform: translateX(18px); }
.switch:disabled { cursor: default; }
@media (prefers-reduced-motion: reduce) { .switch::after { transition: none; } }

.option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 4px;
  font-size: 13px;
  cursor: pointer;
}
footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 4px;
  padding: 8px 12px 0;
  border-top: 1px solid var(--border);
  font-size: 13px;
}
.link {
  border: 0;
  background: none;
  padding: 2px 0;
  color: var(--accent);
  cursor: pointer;
}
.link:hover { text-decoration: underline; }
.link.danger { color: var(--danger); }
.version { margin-left: auto; color: var(--muted); font-size: 12px; }
.confirm {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
}
`;
