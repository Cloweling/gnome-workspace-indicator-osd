import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {
    MonitorWorkspaceSwitcherPopup,
    WorkspaceSwitcherPopup,
} from 'resource:///org/gnome/shell/ui/workspaceSwitcherPopup.js';

const MODE_DOTS = 'dots';
const MODE_ICON = 'icon';
const MODE_TEXT = 'text';
const MODE_BOTH = 'both';

export default class WorkspaceIndicatorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._originalRedisplay = MonitorWorkspaceSwitcherPopup.prototype.redisplay;
        this._originalDisplay = WorkspaceSwitcherPopup.prototype.display;

        const extension = this;

        MonitorWorkspaceSwitcherPopup.prototype.redisplay = function (activeWorkspaceIndex) {
            extension._originalRedisplay.call(this, activeWorkspaceIndex);
            extension._decorate(this);
        };

        WorkspaceSwitcherPopup.prototype.display = function (activeWorkspaceIndex) {
            extension._originalDisplay.call(this, activeWorkspaceIndex);
            extension._applyDuration(this);
        };
    }

    disable() {
        if (this._originalRedisplay) {
            MonitorWorkspaceSwitcherPopup.prototype.redisplay = this._originalRedisplay;
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

        popup._timeoutId = GLib.timeout_add_once(
            GLib.PRIORITY_DEFAULT,
            duration,
            popup._onTimeout.bind(popup)
        );
    }

    _decorate(monitorPopup) {
        if (!this._settings)
            return;

        const list = monitorPopup._list;
        if (!list)
            return;

        const mode = this._settings.get_string('display-mode');

        list.set_style(this._containerStyle());

        if (mode === MODE_DOTS)
            return;

        const indicatorRadius = Math.max(0, this._settings.get_int('indicator-border-radius'));

        list.get_children().forEach((indicator, index) => {
            if (typeof indicator.set_child !== 'function')
                return;

            const active = indicator.has_style_pseudo_class('active');
            const textColor = this._color(active ? 'active-text-color' : 'inactive-text-color');
            const backgroundColor = this._color(active ? 'active-background-color' : 'inactive-background-color');

            const content = this._buildContent(this._getWorkspaceInfo(index), mode, textColor);
            if (!content)
                return;

            indicator.set_child(content);
            indicator.set_style([
                'min-width: 0',
                'min-height: 0',
                'width: auto',
                'height: auto',
                'padding: 6px 12px',
                'margin: 0',
                'border-width: 0',
                `border-radius: ${indicatorRadius}px`,
                `background-color: ${backgroundColor}`,
                `color: ${textColor}`,
            ].join('; ') + ';');
        });
    }

    _containerStyle() {
        const radius = Math.max(0, this._settings.get_int('container-border-radius'));
        const background = this._color('container-background-color');
        const spacing = Math.max(0, this._settings.get_int('indicator-spacing'));

        return [
            'border-width: 0',
            `spacing: ${spacing}px`,
            `border-radius: ${radius}px`,
            `background-color: ${background}`,
        ].join('; ') + ';';
    }

    _color(key) {
        const value = this._settings.get_string(key).trim();
        return value.length > 0 ? value : 'transparent';
    }

    _fontSize(key) {
        return Math.max(1, this._settings.get_int(key));
    }

    _fontFamily() {
        const family = this._settings.get_string('font-family').replace(/["';]/g, '').trim();
        return family.length > 0 ? `"${family}", monospace` : 'monospace';
    }

    _buildContent(info, mode, textColor) {
        const box = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'spacing: 8px;',
        });

        const showIcon = mode === MODE_ICON || mode === MODE_BOTH;
        const showText = mode === MODE_TEXT || mode === MODE_BOTH;

        if (showIcon && info.icon.length > 0) {
            box.add_child(new St.Label({
                text: info.icon,
                y_align: Clutter.ActorAlign.CENTER,
                style: `font-size: ${this._fontSize('icon-font-size')}px; font-family: ${this._fontFamily()}; color: ${textColor};`,
            }));
        }

        if (showText && info.name.length > 0) {
            box.add_child(new St.Label({
                text: info.name,
                y_align: Clutter.ActorAlign.CENTER,
                style: `font-size: ${this._fontSize('text-font-size')}px; font-family: ${this._fontFamily()}; font-weight: 700; color: ${textColor};`,
            }));
        }

        if (box.get_n_children() === 0)
            return null;

        return box;
    }

    _getWorkspaceInfo(index) {
        const names = this._settings.get_strv('workspace-names');
        const icons = this._settings.get_strv('workspace-icons');

        const configuredName = names[index] ?? '';
        const configuredIcon = icons[index] ?? '';

        return {
            name: configuredName.length > 0 ? configuredName : `${_('Workspace')} ${index + 1}`,
            icon: configuredIcon.length > 0 ? configuredIcon : `${index + 1}`,
        };
    }
}
