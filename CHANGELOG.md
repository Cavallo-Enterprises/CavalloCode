# Changelog

## [1.0.5] - 2026-09-28

### Fixed
- Clear Terminal now resets the xterm screen and scrollback buffer.
- Kill Terminal disconnects the active serial session and updates connection state.
- Theme selection now updates the workbench palette and Monaco editor.
- PlatformIO missing-executable errors explain how to install/configure the CLI.

### Added
- File → New Window opens an additional CavalloCode window.
- Hardware settings accept an optional PlatformIO executable path.
- VS Code-style keyboard shortcut reference and bindings for the palette, settings, Explorer, Extensions, Debug, Serial Monitor, build, upload, save, and panel visibility.
- Working editor menu actions for undo, redo, clipboard, find/replace, and selection.
- Built-in Cavallo Ocean and Cavallo Forest theme extensions.
- Built-in extension commands for pin references and a firmware release checklist.
- Help → Extension Development Guide and `docs/EXTENSION_DEVELOPMENT.md`.

### Notes
- PlatformIO remains an external prerequisite for ESP32 and Arduino builds; configure the CLI path in Settings → Hardware or make it available on `PATH`.
- Physical serial I/O and firmware upload require a connected board and installed vendor toolchains.
