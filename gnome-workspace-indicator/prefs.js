import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const DEFAULT_ROWS = 8;

const WorkspaceIndicatorPrefsPage = GObject.registerClass(
class WorkspaceIndicatorPrefsPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Workspace Indicator OSD'),
            icon_name: 'preferences-desktop-workspaces-symbolic',
        });

        this._settings = settings;

        this._buildGeneralGroup();
        this._buildWorkspaceGroup();
    }

    _buildGeneralGroup() {
        const group = new Adw.PreferencesGroup({
            title: _('Display Settings'),
            description: _('Configure where and for how long the OSD appears.'),
        });

        const positionRow = new Adw.ComboRow({
            title: _('OSD Position'),
            subtitle: _('Screen placement of the workspace indicator.'),
            model: Gtk.StringList.new([
                _('Top Center'),
                _('Center'),
                _('Bottom Center'),
            ]),
        });

        const positions = ['top-center', 'center', 'bottom-center'];
        const currentPosition = this._settings.get_string('position');
        const currentIndex = Math.max(0, positions.indexOf(currentPosition));
        positionRow.set_selected(currentIndex);
        positionRow.connect('notify::selected', row => {
            this._settings.set_string('position', positions[row.selected]);
        });

        const durationRow = new Adw.SpinRow({
            title: _('OSD Duration (ms)'),
            subtitle: _('How long the indicator remains visible.'),
            adjustment: new Gtk.Adjustment({
                lower: 100,
                upper: 10000,
                step_increment: 100,
                page_increment: 500,
                value: this._settings.get_int('osd-duration-ms'),
            }),
        });
        durationRow.connect('notify::value', row => {
            this._settings.set_int('osd-duration-ms', Math.round(row.value));
        });

        group.add(positionRow);
        group.add(durationRow);
        this.add(group);
    }

    _buildWorkspaceGroup() {
        const group = new Adw.PreferencesGroup({
            title: _('Workspace Labels'),
            description: _('Set custom icon and name for each workspace index.'),
        });

        const names = this._settings.get_strv('workspace-names');
        const icons = this._settings.get_strv('workspace-icons');
        const rowCount = Math.max(DEFAULT_ROWS, names.length, icons.length);

        for (let i = 0; i < rowCount; i++) {
            const row = new Adw.ActionRow({
                title: `${_('Workspace')} ${i + 1}`,
            });

            const iconEntry = new Gtk.Entry({
                placeholder_text: _('Icon / Emoji'),
                width_chars: 8,
                text: icons[i] ?? '',
                valign: Gtk.Align.CENTER,
            });

            const nameEntry = new Gtk.Entry({
                placeholder_text: _('Workspace name'),
                hexpand: true,
                text: names[i] ?? '',
                valign: Gtk.Align.CENTER,
            });

            iconEntry.connect('changed', entry => {
                const next = this._settings.get_strv('workspace-icons');
                this._setIndex(next, i, entry.text);
                this._settings.set_strv('workspace-icons', next);
            });

            nameEntry.connect('changed', entry => {
                const next = this._settings.get_strv('workspace-names');
                this._setIndex(next, i, entry.text);
                this._settings.set_strv('workspace-names', next);
            });

            row.add_suffix(iconEntry);
            row.add_suffix(nameEntry);
            row.activatable_widget = nameEntry;
            group.add(row);
        }

        this.add(group);
    }

    _setIndex(values, index, value) {
        while (values.length <= index)
            values.push('');

        values[index] = value;
    }
});

export default class WorkspaceIndicatorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.add(new WorkspaceIndicatorPrefsPage(settings));
        window.set_default_size(760, 640);
    }
}
