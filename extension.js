import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const DEFAULT_NAMES = [
    _('Workspace 1'),
    _('Workspace 2'),
    _('Workspace 3'),
    _('Workspace 4'),
];

const DEFAULT_ICONS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

const POSITION_TOP_CENTER = 'top-center';
const POSITION_CENTER = 'center';
const POSITION_BOTTOM_CENTER = 'bottom-center';

const WorkspaceIndicatorOSD = GObject.registerClass(
class WorkspaceIndicatorOSD extends St.BoxLayout {
    _init() {
        super._init({
            style_class: 'workspace-indicator-osd',
            vertical: false,
            reactive: false,
            can_focus: false,
            visible: false,
            opacity: 0,
        });

        this.set_style(`
            padding: 14px 18px;
            border-radius: 14px;
            background-color: rgba(20, 20, 20, 0.78);
            color: #ffffff;
            spacing: 10px;
        `);

        this._iconLabel = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._iconLabel.set_style('font-size: 24px;');

        this._nameLabel = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._nameLabel.set_style('font-size: 16px; font-weight: 700;');

        this.add_child(this._iconLabel);
        this.add_child(this._nameLabel);
    }

    setContent(icon, name) {
        this._iconLabel.text = icon ?? '';
        this._nameLabel.text = name ?? '';

        this._iconLabel.visible = this._iconLabel.text.trim().length > 0;
        this._nameLabel.visible = this._nameLabel.text.trim().length > 0;
    }
});

export default class WorkspaceIndicatorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._osd = new WorkspaceIndicatorOSD();

        Main.layoutManager.addChrome(this._osd);

        this._workspaceSignalId = global.workspace_manager.connect(
            'workspace-switched',
            this._onWorkspaceSwitched.bind(this)
        );

        this._timeoutId = 0;
        this._animationDurationMs = 120;

        this._settingsChangedIds = [
            this._settings.connect('changed::position', () => this._repositionOsd()),
            this._settings.connect('changed::osd-duration-ms', () => {}),
            this._settings.connect('changed::workspace-names', () => {}),
            this._settings.connect('changed::workspace-icons', () => {}),
        ];

        this._repositionOsd();
    }

    disable() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        if (this._workspaceSignalId) {
            global.workspace_manager.disconnect(this._workspaceSignalId);
            this._workspaceSignalId = 0;
        }

        if (this._settingsChangedIds) {
            for (const id of this._settingsChangedIds)
                this._settings.disconnect(id);
            this._settingsChangedIds = null;
        }

        if (this._osd) {
            this._osd.remove_all_transitions();
            this._osd.destroy();
            this._osd = null;
        }

        this._settings = null;
    }

    _onWorkspaceSwitched() {
        const activeIndex = global.workspace_manager.get_active_workspace_index();
        const workspaceInfo = this._getWorkspaceInfo(activeIndex);

        this._showOsd(workspaceInfo.icon, workspaceInfo.name);
    }

    _getWorkspaceInfo(index) {
        const names = this._settings.get_strv('workspace-names');
        const icons = this._settings.get_strv('workspace-icons');

        const fallbackName = index < DEFAULT_NAMES.length
            ? DEFAULT_NAMES[index]
            : `${_('Workspace')} ${index + 1}`;

        const fallbackIcon = index < DEFAULT_ICONS.length
            ? DEFAULT_ICONS[index]
            : '';

        const configuredName = names[index] ?? '';
        const configuredIcon = icons[index] ?? '';

        return {
            name: configuredName.trim().length > 0 ? configuredName : fallbackName,
            icon: configuredIcon.trim().length > 0 ? configuredIcon : fallbackIcon,
        };
    }

    _showOsd(icon, name) {
        if (!this._osd)
            return;

        this._osd.remove_all_transitions();

        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        this._osd.setContent(icon, name);
        this._repositionOsd();

        this._osd.opacity = 0;
        this._osd.visible = true;
        this._osd.ease({
            opacity: 255,
            duration: this._animationDurationMs,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });

        const duration = Math.max(100, this._settings.get_int('osd-duration-ms'));
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, duration, () => {
            this._timeoutId = 0;

            if (!this._osd)
                return GLib.SOURCE_REMOVE;

            this._osd.remove_all_transitions();
            this._osd.ease({
                opacity: 0,
                duration: this._animationDurationMs,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    if (this._osd)
                        this._osd.visible = false;
                },
            });

            return GLib.SOURCE_REMOVE;
        });
    }

    _repositionOsd() {
        if (!this._osd)
            return;

        const position = this._settings.get_string('position');
        const monitor = Main.layoutManager.primaryMonitor;

        if (!monitor)
            return;

        this._osd.get_parent()?.set_child_above_sibling(this._osd, null);

        this._osd.set_position(0, 0);
        this._osd.set_size(-1, -1);

        this._osd.x = Math.round(monitor.x + (monitor.width - this._osd.width) / 2);

        if (position === POSITION_CENTER) {
            this._osd.y = Math.round(monitor.y + (monitor.height - this._osd.height) / 2);
        } else if (position === POSITION_BOTTOM_CENTER) {
            this._osd.y = Math.round(monitor.y + monitor.height - this._osd.height - 80);
        } else {
            this._osd.y = Math.round(monitor.y + 80);
        }
    }
}
