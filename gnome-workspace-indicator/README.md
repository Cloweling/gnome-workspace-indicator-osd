# Workspace Indicator OSD (GNOME 50+)

GNOME Shell extension that shows a custom OSD when switching workspaces.

## Features

- Detects workspace changes via `workspace-switched`
- Displays a custom OSD overlay (top-center by default)
- Supports per-workspace **name + icon/emoji**
- Auto-hides after configurable duration (default: **1500ms**)
- Preferences panel for:
  - workspace names
  - workspace icons/emojis
  - OSD position
  - display duration
- i18n-ready structure with `locale/` placeholder

## Project Structure

```text
gnome-workspace-indicator/
├── metadata.json
├── extension.js
├── prefs.js
├── schemas/
│   └── org.gnome.shell.extensions.workspace-indicator.gschema.xml
├── ui/
│   └── prefs.ui
├── locale/
├── README.md
└── LICENSE
```

## Installation (manual)

1. Copy the `gnome-workspace-indicator` folder to:

   - `~/.local/share/gnome-shell/extensions/workspace-indicator@cloweling.github.io`

2. Compile schemas:

   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/workspace-indicator@cloweling.github.io/schemas
   ```

3. Restart GNOME Shell:

   - X11: `Alt+F2`, type `r`, press Enter
   - Wayland: log out and back in

4. Enable extension:

   ```bash
   gnome-extensions enable workspace-indicator@cloweling.github.io
   ```

## Settings keys

Schema: `org.gnome.shell.extensions.workspace-indicator`

- `workspace-names` (`as`)
- `workspace-icons` (`as`)
- `position` (`s`) → `top-center | center | bottom-center`
- `osd-duration-ms` (`i`)

## Notes

- Designed for GNOME Shell 50+.
- `ui/prefs.ui` is included as a placeholder for future GtkBuilder-based UI wiring.
