import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {WorkspaceSwitcherPopup} from 'resource:///org/gnome/shell/ui/workspaceSwitcherPopup.js';

const DEFAULT_ICONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const MODE_ICON = 'icon';
const MODE_TEXT = 'text';
const MODE_BOTH = 'both';

export default class WorkspaceIndicatorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._originalRedisplay = WorkspaceSwitcherPopup.prototype._redisplay;
        this._originalDisplay = WorkspaceSwitcherPopup.prototype.display;

        const extension = this;

        WorkspaceSwitcherPopup.prototype._redisplay = function () {
            extension._originalRedisplay.call(this);
            extension._decorate(this);
        };

        WorkspaceSwitcherPopup.prototype.display = function (activeWorkspaceIndex) {
            extension._originalDisplay.call(this, activeWorkspaceIndex);
            extension._applyDuration(this);
        };
    }

    disable() {
        if (this._originalRedisplay) {
            WorkspaceSwitcherPopup.prototype._redisplay = this._originalRedisplay;
            this._originalRedisplay = null;
        }

        if (this._originalDisplay) {
            WorkspaceSwitcherPopup.prototype.display = this._originalDisplay;
            this._originalDisplay = null;
        }

        this._settings = null;
    }

    _applyDuration(popup) {
        if (!this._settings)
            return;

        const duration = Math.max(100, this._settings.get_int('osd-duration-ms'));

        if (popup._timeoutId) {
            GLib.source_remove(popup._timeoutId);
            popup._timeoutId = 0;
        }

        if (typeof popup._onTimeout !== 'function')
            return;

        popup._timeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            duration,
            popup._onTimeout.bind(popup)
        );
    }

    _decorate(popup) {
        if (!this._settings)
            return;

        const list = popup._list;
        if (!list)
            return;

        const mode = this._settings.get_string('display-mode');
        const indicators = list.get_children();

        indicators.forEach((indicator, index) => {
            if (typeof indicator.set_child !== 'function')
                return;

            const info = this._getWorkspaceInfo(index);
            const content = this._buildContent(info, mode);

            if (!content)
                return;

            indicator.set_child(content);
            indicator.set_style(`
                min-width: 0;
                min-height: 0;
                width: auto;
                height: auto;
                padding: 6px 12px;
                border-radius: 10px;
            `);
        });
    }

    _buildContent(info, mode) {
        const box = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'spacing: 8px;',
        });

        const showIcon = mode === MODE_ICON || mode === MODE_BOTH;
        const showText = mode === MODE_TEXT || mode === MODE_BOTH;

        if (showIcon && info.icon.length > 0) {
            const iconLabel = new St.Label({
                text: info.icon,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 18px;',
            });
            box.add_child(iconLabel);
        }

        if (showText && info.name.length > 0) {
            const nameLabel = new St.Label({
                text: info.name,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 14px; font-weight: 700;',
            });
            box.add_child(nameLabel);
        }

        if (box.get_n_children() === 0)
            return null;

        return box;
    }

    _getWorkspaceInfo(index) {
        const names = this._settings.get_strv('workspace-names');
        const icons = this._settings.get_strv('workspace-icons');

        const configuredName = (names[index] ?? '').trim();
        const configuredIcon = (icons[index] ?? '').trim();

        const fallbackIcon = index < DEFAULT_ICONS.length ? DEFAULT_ICONS[index] : `${index + 1}`;
        const fallbackName = `${_('Workspace')} ${index + 1}`;

        return {
            name: configuredName.length > 0 ? configuredName : fallbackName,
            icon: configuredIcon.length > 0 ? configuredIcon : fallbackIcon,
        };
    }
}
