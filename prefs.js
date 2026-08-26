import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const DISPLAY_MODES = ['dots', 'icon', 'text', 'both'];
const MIN_WORKSPACES = 1;
const MAX_WORKSPACES = 36;

const WorkspaceIndicatorPrefsPage = GObject.registerClass(
class WorkspaceIndicatorPrefsPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Workspace Indicator OSD'),
            icon_name: 'preferences-desktop-workspaces-symbolic',
        });

        this._settings = settings;
        this._rows = [];

        this._buildGeneralGroup();
        this._buildAppearanceGroup();
        this._buildWorkspaceGroup();
        this._rebuildWorkspaceRows();
    }

    _buildGeneralGroup() {
        const group = new Adw.PreferencesGroup({
            title: _('Display Settings'),
            description: _('Configure what the workspace switcher OSD shows.'),
        });

        const modeRow = new Adw.ComboRow({
            title: _('Display Mode'),
            subtitle: _('Use the default dots, or show icons and names.'),
            model: Gtk.StringList.new([
                _('Default dots'),
                _('Icons only'),
                _('Text only'),
                _('Icons and text'),
            ]),
        });

        const currentMode = this._settings.get_string('display-mode');
        modeRow.set_selected(Math.max(0, DISPLAY_MODES.indexOf(currentMode)));
        modeRow.connect('notify::selected', row => {
            this._settings.set_string('display-mode', DISPLAY_MODES[row.selected]);
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

        group.add(modeRow);
        group.add(durationRow);
        this.add(group);
    }

    _buildAppearanceGroup() {
        const containerGroup = new Adw.PreferencesGroup({
            title: _('OSD Container'),
            description: _('The box that wraps every workspace indicator. Transparent by default.'),
        });

        containerGroup.add(this._createColorRow(
            _('Background Color'),
            _('Set the alpha channel to zero for a fully transparent OSD.'),
            'container-background-color'
        ));
        containerGroup.add(this._createPixelRow(
            _('Corner Radius (px)'),
            _('Rounds the corners of the OSD container.'),
            'container-border-radius'
        ));

        this.add(containerGroup);

        const indicatorGroup = new Adw.PreferencesGroup({
            title: _('Workspace Indicators'),
            description: _('Colors of each workspace entry. Backgrounds are transparent by default.'),
        });

        indicatorGroup.add(this._createColorRow(
            _('Active Text Color'),
            _('Icon and name color of the current workspace.'),
            'active-text-color'
        ));
        indicatorGroup.add(this._createColorRow(
            _('Active Background Color'),
            _('Background behind the current workspace.'),
            'active-background-color'
        ));
        indicatorGroup.add(this._createColorRow(
            _('Inactive Text Color'),
            _('Icon and name color of the other workspaces.'),
            'inactive-text-color'
        ));
        indicatorGroup.add(this._createColorRow(
            _('Inactive Background Color'),
            _('Background behind the other workspaces.'),
            'inactive-background-color'
        ));
        indicatorGroup.add(this._createPixelRow(
            _('Spacing (px)'),
            _('Horizontal gap between each workspace.'),
            'indicator-spacing',
            96
        ));
        indicatorGroup.add(this._createPixelRow(
            _('Corner Radius (px)'),
            _('Rounds the corners of each workspace indicator.'),
            'indicator-border-radius'
        ));

        this.add(indicatorGroup);
    }

    _createColorRow(title, subtitle, key) {
        const row = new Adw.ActionRow({title, subtitle});

        const rgba = new Gdk.RGBA();
        if (!rgba.parse(this._settings.get_string(key)))
            rgba.parse('rgba(0,0,0,0)');

        const button = new Gtk.ColorDialogButton({
            dialog: new Gtk.ColorDialog({with_alpha: true}),
            rgba,
            valign: Gtk.Align.CENTER,
        });

        button.connect('notify::rgba', widget => {
            this._settings.set_string(key, widget.get_rgba().to_string());
        });

        row.add_suffix(button);
        row.activatable_widget = button;

        return row;
    }

    _createPixelRow(title, subtitle, key, upper = 64) {
        const row = new Adw.SpinRow({
            title,
            subtitle,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper,
                step_increment: 1,
                page_increment: 4,
                value: this._settings.get_int(key),
            }),
        });

        row.connect('notify::value', widget => {
            this._settings.set_int(key, Math.round(widget.value));
        });

        return row;
    }

    _buildWorkspaceGroup() {
        this._workspaceGroup = new Adw.PreferencesGroup({
            title: _('Workspace Labels'),
            description: _('Set a custom icon and name for each workspace.'),
        });

        const controls = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            valign: Gtk.Align.CENTER,
        });

        const removeButton = new Gtk.Button({
            icon_name: 'list-remove-symbolic',
            tooltip_text: _('Remove last workspace'),
            css_classes: ['flat'],
        });
        removeButton.connect('clicked', () => this._changeCount(-1));

        const addButton = new Gtk.Button({
            icon_name: 'list-add-symbolic',
            tooltip_text: _('Add workspace'),
            css_classes: ['flat'],
        });
        addButton.connect('clicked', () => this._changeCount(1));

        controls.append(removeButton);
        controls.append(addButton);
        this._workspaceGroup.set_header_suffix(controls);

        this.add(this._workspaceGroup);
    }

    _changeCount(delta) {
        const current = this._getCount();
        const next = Math.min(MAX_WORKSPACES, Math.max(MIN_WORKSPACES, current + delta));

        if (next === current)
            return;

        this._settings.set_int('workspace-count', next);
        this._rebuildWorkspaceRows();
    }

    _getCount() {
        const stored = this._settings.get_int('workspace-count');
        return Math.min(MAX_WORKSPACES, Math.max(MIN_WORKSPACES, stored));
    }

    _rebuildWorkspaceRows() {
        for (const row of this._rows)
            this._workspaceGroup.remove(row);

        this._rows = [];

        const names = this._settings.get_strv('workspace-names');
        const icons = this._settings.get_strv('workspace-icons');
        const count = this._getCount();

        for (let i = 0; i < count; i++)
            this._rows.push(this._createRow(i, names, icons));

        for (const row of this._rows)
            this._workspaceGroup.add(row);
    }

    _createRow(index, names, icons) {
        const row = new Adw.ActionRow({
            title: `${_('Workspace')} ${index + 1}`,
        });

        const iconEntry = new Gtk.Entry({
            placeholder_text: _('Icon'),
            width_chars: 6,
            max_width_chars: 6,
            text: names.length > 0 || icons.length > 0 ? icons[index] ?? '' : '',
            valign: Gtk.Align.CENTER,
        });

        const nameEntry = new Gtk.Entry({
            placeholder_text: _('Name'),
            hexpand: true,
            text: names[index] ?? '',
            valign: Gtk.Align.CENTER,
        });

        iconEntry.connect('changed', entry => {
            const next = this._settings.get_strv('workspace-icons');
            this._setIndex(next, index, entry.text);
            this._settings.set_strv('workspace-icons', next);
        });

        nameEntry.connect('changed', entry => {
            const next = this._settings.get_strv('workspace-names');
            this._setIndex(next, index, entry.text);
            this._settings.set_strv('workspace-names', next);
        });

        row.add_suffix(iconEntry);
        row.add_suffix(nameEntry);
        row.activatable_widget = nameEntry;

        return row;
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
        window.set_default_size(760, 700);
    }
}
