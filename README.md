# Workspace Indicator OSD

A GNOME Shell extension for GNOME 50+ that shows a custom on-screen display (OSD) whenever you switch workspaces. Each workspace can have its own name and/or icon, and the indicator automatically hides after a configurable duration.

## Features

- Replaces the plain dots of the native GNOME workspace switcher OSD
- Displays a custom name and/or icon for the workspace you switch to
- Four display modes: default dots, icons only, text only, or icons and text
- Configurable per-workspace names and icons/emojis
- Dynamic workspace count with add/remove buttons in preferences
- Configurable display duration
- Does not touch the top panel
- Ready for localization (i18n)

## Structure

```text
.
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

## Installation

### Manual installation

1. Copy this repository folder to your GNOME Shell extensions directory:

   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/workspace-indicator@cloweling.github.io
   cp -r * ~/.local/share/gnome-shell/extensions/workspace-indicator@cloweling.github.io/
   ```

2. Compile the GSettings schema:

   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/workspace-indicator@cloweling.github.io/schemas
   ```

3. Restart GNOME Shell:

   - X11: press `Alt+F2`, type `r`, and press Enter
   - Wayland: log out and log back in

4. Enable the extension:

   ```bash
   gnome-extensions enable workspace-indicator@cloweling.github.io
   ```

### GNOME Extensions app

You can also install the extension by copying the project into:

```text
~/.local/share/gnome-shell/extensions/workspace-indicator@cloweling.github.io
```

Then enable it from the Extensions app.

## Configuration

Open the extension preferences to configure:

- Display mode (default dots / icons only / text only / both)
- Number of configurable workspaces (add/remove buttons)
- Workspace names
- Workspace icons/emojis
- Display duration

## Settings schema

Schema ID: `org.gnome.shell.extensions.workspace-indicator`

Keys:

- `workspace-names` (`as`)
- `workspace-icons` (`as`)
- `display-mode` (`s`) — `dots`, `icon`, `text`, or `both`
- `workspace-count` (`i`)
- `osd-duration-ms` (`i`)

## Notes

- Designed for GNOME Shell 50 and newer.
- `locale/` is intentionally empty for translations.
