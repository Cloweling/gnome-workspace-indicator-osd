# Workspace Indicator OSD

A GNOME Shell extension for GNOME 50+ that shows a custom on-screen display (OSD) whenever you switch workspaces. Each workspace can have its own name and/or icon, and the indicator automatically hides after a configurable duration.

## Features

- Detects workspace changes via the `workspace-switched` signal
- Shows a custom overlay OSD on screen
- Displays the current workspace name and icon
- Auto-hides after 1.5 seconds by default
- Configurable per-workspace names and icons/emojis
- Configurable OSD position
- Configurable display duration
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

- Workspace names
- Workspace icons/emojis
- OSD position
- Display duration

## Settings schema

Schema ID: `org.gnome.shell.extensions.workspace-indicator`

Keys:

- `workspace-names` (`as`)
- `workspace-icons` (`as`)
- `position` (`s`)
- `osd-duration-ms` (`i`)

## Notes

- Designed for GNOME Shell 50 and newer.
- `locale/` is intentionally empty for translations.
