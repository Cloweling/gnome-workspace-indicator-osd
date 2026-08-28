import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {
    MonitorWorkspaceSwitcherPopup,
    WorkspaceSwitcherPopup,
} from 'resource:///org/gnome/shell/ui/workspaceSwitcherPopup.js';
import {WorkspaceThumbnail} from 'resource:///org/gnome/shell/ui/workspaceThumbnail.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const MODE_DOTS = 'dots';
const MODE_ICON = 'icon';
const MODE_TEXT = 'text';
const MODE_BOTH = 'both';

export default class WorkspaceIndicatorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._originalRedisplay = MonitorWorkspaceSwitcherPopup.prototype.redisplay;
        this._originalDisplay = WorkspaceSwitcherPopup.prototype.display;
        this._originalPreviewInit = WorkspaceThumbnail.prototype._init;
        this._previews = new Set();
        this._signals = [];

        const extension = this;

        MonitorWorkspaceSwitcherPopup.prototype.redisplay = function (activeWorkspaceIndex) {
            extension._originalRedisplay.call(this, activeWorkspaceIndex);
            extension._decorate(this);
        };

        WorkspaceSwitcherPopup.prototype.display = function (activeWorkspaceIndex) {
            extension._originalDisplay.call(this, activeWorkspaceIndex);
            extension._applyDuration(this);
        };

        WorkspaceThumbnail.prototype._init = function (...args) {
            extension._originalPreviewInit.apply(this, args);
            extension._trackPreview(this);
        };

        this._settingsChangedId = this._settings.connect('changed', () => {
            this._refreshOverviewPreviews();
        });

        this._scanExistingPreviews();
    }

    _scanExistingPreviews() {
        const box = Main.overview?._overview?.controls?._thumbnailsBox;
        for (const thumbnail of box?._thumbnails ?? [])
            this._trackPreview(thumbnail);
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

        if (this._originalPreviewInit) {
            WorkspaceThumbnail.prototype._init = this._originalPreviewInit;
            this._originalPreviewInit = null;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = 0;
        }

        for (const {object, id} of this._signals) {
            try {
                object.disconnect(id);
            } catch {
                // Actor already destroyed; its signals are gone with it.
            }
        }
        this._signals = [];

        for (const preview of this._previews) {
            const label = preview._workspaceIndicatorLabel;
            if (label) {
                label.destroy();
                preview._workspaceIndicatorLabel = null;
            }
        }
        this._previews.clear();

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

    _buildContent(info, mode, textColor, truncate = false) {
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
                text: truncate ? this._truncateLabel(info.icon) : info.icon,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: `font-size: ${this._fontSize('icon-font-size')}px; font-family: ${this._fontFamily()}; color: ${textColor}; text-align: center;`,
            }));
        }

        if (showText && info.name.length > 0) {
            box.add_child(new St.Label({
                text: truncate ? this._truncateLabel(info.name) : info.name,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: `font-size: ${this._fontSize('text-font-size')}px; font-family: ${this._fontFamily()}; font-weight: 700; color: ${textColor}; text-align: center;`,
            }));
        }

        if (box.get_n_children() === 0)
            return null;

        return box;
    }

    _truncateLabel(text) {
        return [...text].length > 3 ? [...text].slice(0, 3).join('') : text;
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

    _trackPreview(preview) {
        if (!this._settings || !preview || this._previews.has(preview))
            return;

        this._previews.add(preview);

        const destroyId = preview.connect('destroy', () => {
            this._previews.delete(preview);
            this._signals = this._signals.filter(s => s.object !== preview);
        });
        this._signals.push({object: preview, id: destroyId});

        this._decorateOverviewPreview(preview);
    }

    _refreshOverviewPreviews() {
        if (!this._settings)
            return;

        for (const preview of this._previews)
            this._decorateOverviewPreview(preview);
    }

    _decorateOverviewPreview(preview) {
        if (!this._settings)
            return;

        const existing = preview._workspaceIndicatorLabel;
        const mode = this._settings.get_string('display-mode');
        const enabled = this._settings.get_boolean('show-in-overview');

        if (!enabled || mode === MODE_DOTS) {
            if (existing)
                existing.hide();
            return;
        }

        const workspace = preview.metaWorkspace;
        if (!workspace)
            return;

        const index = workspace.index();
        const info = this._getWorkspaceInfo(index);
        const textColor = this._color('overview-text-color');
        const backgroundColor = this._color('overview-background-color');

        let label = existing;
        if (!label) {
            label = new St.Bin({
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true,
                reactive: false,
            });
            label.set_position(0, 0);

            // _viewport's own size is the full monitor work-area resolution
            // (it is shrunk visually via scale_x/scale_y, not via allocation),
            // so we bind to the thumbnail actor's own final rendered box
            // instead, which already reflects the small on-screen size.
            label.add_constraint(new Clutter.BindConstraint({
                source: preview,
                coordinate: Clutter.BindCoordinate.SIZE,
            }));

            preview._workspaceIndicatorLabel = label;
            preview.add_child(label);
        }

        label.show();
        label.set_style(`background-color: ${backgroundColor};`);
        label.set_child(null);

        const content = this._buildContent(info, mode, textColor, true);
        if (!content) {
            return;
        }

        content.set_style('spacing: 8px;');

        label.set_child(content);
        preview.set_child_above_sibling(label, null);
    }
}
