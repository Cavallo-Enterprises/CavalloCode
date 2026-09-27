# CavalloCode Extension Development

This guide describes the extension contract currently supported by CavalloCode.

## Project layout

Create a folder under `extensions/` with a package manifest and a TypeScript entry point:

```text
extensions/my-board/
  package.json
  src/index.ts
```

Use `plugin-api` for the extension interfaces. The desktop extension host loads built-in extensions in the trusted Electron main process.

## Minimal extension

```ts
import type { CavalloPlugin } from 'plugin-api';

const extension: CavalloPlugin = {
  activate(context) {
    console.info(`My extension loaded from ${context.extensionPath}`);
    // Keep handles to timers/listeners and add disposable objects to
    // context.subscriptions so CavalloCode can release them on shutdown.
  },
  deactivate() {
    // Stop extension-owned work here.
  }
};

export default extension;
```

## Registering a board

Add `registerBoard()` to contribute board metadata:

```ts
registerBoard() {
  return [{
    id: 'example-esp32',
    name: 'Example ESP32 Board',
    vendor: 'Example',
    architecture: 'esp32',
    defaultBaudRate: 115200
  }];
}
```

Supported architectures are `esp32`, `avr`, `rp2040`, `arm`, and `riscv`. For a custom upload workflow, implement `uploadHandler(port, file)` and resolve to `true` only after a successful upload.

## Registering a built-in

1. Add the extension package under `extensions/` and export its plugin as the default export from `src/index.ts`.
2. Ensure the package is included in the pnpm workspace and typechecks with the repository.
3. Import it in `apps/desktop/src/main/index.ts` and register it with `ExtensionHostManager` during app startup.
4. Verify activation, board metadata, upload behavior, and disposal; do not log secrets or leave child processes running.

Built-in extensions execute with desktop-process privileges. Review dependencies and every filesystem, process, and network operation before registering an extension.

## Theme and command contributions

An extension can contribute a theme identifier and label with `registerThemes()`. CavalloCode's Ocean and Forest themes are built-in examples; theme colors are defined in `packages/core-ui/src/theme.css` and Monaco token colors in `packages/core-ui/src/Editor.tsx`.

An extension can also contribute a small user-invoked command:

```ts
registerCommands() {
  return [{
    id: 'my-extension.summary',
    title: 'Show my hardware summary',
    description: 'Displays a short reference in Settings → Extensions.',
    execute: () => 'Put useful, non-sensitive extension output here.'
  }];
}
```

Commands are explicitly invoked from **Settings → Extensions**. Keep them bounded and return plain text; never execute arbitrary renderer-provided shell commands.
