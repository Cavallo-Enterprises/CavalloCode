<img width="2000" height="2000" alt="cavallocode" src="https://github.com/user-attachments/assets/d5faa12c-50b2-4307-83ed-e5012f54263f" />



# CavalloCode

CavalloCode is an open-source, modular integrated development environment for hardware, electronics, and embedded systems.

The project is designed around a VS Code-inspired architecture, with a desktop application, shared packages, and extensions separated into a PNPM workspace. The goal is to provide a general-purpose development environment that can be extended for different hardware platforms, toolchains, languages, and device workflows.

## Status

CavalloCode is currently under active development.

The architecture and core application are being developed before expanding platform-specific tooling and hardware integrations. APIs, package boundaries, extension interfaces, and internal implementation details may change during development.

## Overview & Key Features

CavalloCode brings VS Code-grade architecture and ergonomics to Embedded Systems and Hardware Engineering:

- **Process-Isolated Microkernel**: Electron Main Process, context-isolated React Renderer, and an out-of-process Node.js Extension Host communicating over JSON-RPC.
- **Embedded Monaco Editor**: Full syntax highlighting and code editing for C++, C, Python, and MicroPython, bundled 100% locally with zero CDN dependencies and fault-tolerant ErrorBoundary recovery.
- **Hardware WebGL Serial Terminal**: High-throughput hardware monitor built on `xterm.js` and `xterm-addon-webgl` with dynamic baud rate selection (9600 to 1,152,000 baud), auto-scroll, timestamps, and port enumeration.
- **Modern VS Code UI Shell**: Collapsible file tree explorer, application menubar, hardware status bar (active board, serial port, baud rate), and interactive resizable editor/terminal splits.
- **Modular Extension System**: Built-in architecture packs for ESP32, Arduino AVR, and Raspberry Pi Pico (RP2040).
- **Production-Ready Windows Packaging**: One-click NSIS desktop installer and portable `.exe` generation via `electron-builder`.

---

## Workspace Architecture

CavalloCode is structured as a high-performance monorepo using PNPM workspaces:

```text
CavalloCode/
├── apps/
│   └── desktop/                 # Electron main, preload bridge, and Vite React renderer
│       ├── resources/           # Application icons and branding assets
│       ├── src/main/            # Main Process lifecycle, window management, IPC routing
│       ├── src/preload/         # Secure contextBridge IPC exposure (serial & extensions)
│       └── src/renderer/        # React IDE UI (Layout, Editor, Terminal)
│
├── packages/
│   ├── core-ui/                 # Monaco Editor, IDE Layout, File Explorer, Status Bar
│   ├── terminal/                # xterm.js WebGL serial monitor component
│   ├── plugin-api/              # Extension interfaces (CavalloPlugin, CavalloBoardDefinition)
│   ├── extension-host/          # Isolated Node worker process for plugin execution
│   └── hardware-bridge/         # Stubs & bridges for node-serialport, PlatformIO, esptool
│
├── extensions/
│   ├── builtin-esp32/           # ESP32 board definitions & toolchain integration
│   ├── builtin-arduino/         # Arduino Uno (AVR) board definitions
│   └── builtin-raspberrypi/     # Raspberry Pi Pico (RP2040) board definitions
│
├── package.json                 # Monorepo root scripts & configurations
├── pnpm-workspace.yaml          # PNPM workspace definitions, build approvals, and overrides
└── README.md                    # Project documentation
```

---

## Quickstart & Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v20.x or higher)
- [pnpm](https://pnpm.io/) (`pnpm@12.x` recommended)

### 1. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/Cavallo-Enterprises/CavalloCode.git
cd CavalloCode
pnpm install
```

### 2. Run in Development Mode
Start the Vite development server and launch the Electron application:
```bash
pnpm run dev
```

### 3. Build for Production
Compile main, preload, and renderer packages:
```bash
pnpm run build
```

### 4. Package Windows Installer (.exe)
Package a production NSIS installer (`CavalloCode-1.0.0-setup.exe`) and portable standalone application:
```bash
pnpm --filter desktop run build:win
```
The resulting installation artifacts are output to `apps/desktop/dist/`:
- `CavalloCode-1.0.0-setup.exe` — Windows NSIS Installer (~112 MB)
- `win-unpacked/CavalloCode.exe` — Standalone portable executable (~210 MB)


### Extension layer

The `extensions` directory contains functionality that can be developed independently from the core application.

The extension architecture is intended to allow CavalloCode to support additional:

* Hardware platforms
* Toolchains
* Programming languages
* Build systems
* Debuggers
* Device interfaces
* Developer tools

This approach keeps platform-specific functionality separate from the core IDE.

## Technical Stack

| Component              | Technology                        |
| ---------------------- | --------------------------------- |
| Desktop runtime        | Electron                          |
| Language               | JavaScript / TypeScript ecosystem |
| Module system          | ES Modules                        |
| Package manager        | PNPM                              |
| Workspace              | PNPM workspaces                   |
| Architecture           | Modular monorepo                  |
| Hardware communication | Serial tooling                    |
| Build tooling          | Electron / esbuild ecosystem      |
| License                | MIT                               |

The root project currently targets PNPM `12.3.4` and uses ES modules. Electron, esbuild, SerialPort bindings, and Electron packaging dependencies are configured as trusted build dependencies.

## Design Principles

### Modularity

CavalloCode is designed so that the core application does not need to contain every hardware-specific implementation.

Hardware support and developer tooling can be implemented as independent modules.

### Extensibility

The extension architecture allows functionality to be added without modifying the core application for every new platform.

An extension can provide platform-specific services while interacting with common CavalloCode APIs.

### Hardware abstraction

Hardware support should be implemented through abstractions rather than tightly coupling the IDE to a single microcontroller or vendor.

This allows the same application architecture to support different boards, interfaces, and toolchains.

### Local development

CavalloCode is intended to operate as a local development environment.

Hardware development workflows should be able to communicate with local devices and toolchains directly from the desktop application.

### Developer tooling

CavalloCode treats hardware development as a software engineering workflow.

The long-term architecture is intended to bring project management, source editing, building, device communication, diagnostics, and debugging into a single development environment.

## Hardware Support

CavalloCode is designed for embedded and electronics development.

The project currently identifies platforms such as Arduino and ESP32 as target hardware ecosystems.

The architecture is intended to support hardware workflows including:

* Microcontroller development
* Embedded firmware
* Arduino-based projects
* ESP32-based projects
* Serial communication
* Device discovery
* Firmware compilation
* Firmware upload
* Serial monitoring
* Hardware diagnostics
* Embedded debugging

Platform-specific functionality can be implemented independently through extensions and toolchain integrations.

## Toolchain Architecture

A hardware development environment needs more than a text editor.

A typical CavalloCode hardware workflow can be represented as:

```text
Project
   |
   v
Source Code
   |
   v
Language / Platform Extension
   |
   v
Toolchain
   |
   +---- Compiler
   |
   +---- Linker
   |
   +---- Build System
   |
   +---- Programmer / Uploader
   |
   v
Hardware Device
   |
   v
Serial / Debug Interface
```

The purpose of this architecture is to keep the IDE independent from individual compiler implementations and hardware vendors.

A platform integration should be able to provide the appropriate tools without requiring the core application to understand every platform-specific detail.

## Project Model

CavalloCode is intended to treat a hardware project as more than a collection of source files.

A project can contain:

```text
Project
├── Source
├── Configuration
├── Dependencies
├── Toolchain configuration
├── Hardware target
├── Build configuration
├── Upload configuration
└── Debug configuration
```

This provides a foundation for reproducible hardware development and makes it possible for extensions to provide platform-specific project functionality.

## Development

### Requirements

* Node.js
* PNPM `12.3.4`
* Git

The repository specifies PNPM `12.3.4` as its package manager version.

### Clone

```bash
git clone https://github.com/Cavallo-Enterprises/CavalloCode.git
cd CavalloCode
```

### Install dependencies

```bash
pnpm install
```

### Start development

```bash
pnpm dev
```

The root development script delegates to the desktop workspace.

### Build

```bash
pnpm build
```

The root build script delegates the build process to the desktop workspace.

### Package management

Install a dependency:

```bash
pnpm add <package>
```

Install a development dependency:

```bash
pnpm add -D <package>
```

Run a command for a specific workspace:

```bash
pnpm --filter <workspace> <command>
```

## Repository Structure

### `apps/desktop`

The primary CavalloCode desktop application.

This layer is responsible for the desktop runtime and integration of the core IDE components.

### `packages`

Reusable modules shared across the application and extensions.

This layer is intended to contain functionality that should not be tied directly to the Electron application.

### `extensions`

Optional and platform-specific functionality.

Extensions are intended to provide additional capabilities without increasing the coupling of the core application.

## Development Model

CavalloCode follows a separation between core functionality and platform-specific functionality.

```text
                    CavalloCode
                        |
             +----------+----------+
             |                     |
        Core Platform          Extensions
             |                     |
     +-------+-------+       +-----+-----+
     |       |       |       |     |     |
  Editor  Project  APIs   Arduino ESP32 Other
             |
          Tooling
```

This model allows the core IDE to remain independent from individual hardware ecosystems while extensions provide the integrations required for specific platforms.

## Roadmap

The roadmap is focused on establishing the underlying IDE architecture before expanding the hardware ecosystem.

### Core IDE

* [x] Workspace management (PNPM monorepo structure)
* [x] Project management (Layout & Sidebar file tree)
* [x] Editor integration (Local Monaco Editor with C++, Python, C grammars)
* [x] Configuration system
* [x] Command system
* [x] Integrated terminal (High-performance WebGL xterm.js)
* [x] Diagnostics & Error Boundaries
* [x] Logging infrastructure & IPC console forwarding

### Extension System

* [x] Extension API (`packages/plugin-api` interfaces)
* [x] Extension lifecycle management (Microkernel isolated process model)
* [x] Extension activation model
* [x] Built-in extensions (ESP32, Arduino, Raspberry Pi Pico)
* [ ] Extension discovery marketplace
* [ ] Extension development tooling

### Hardware

* [x] Hardware device management
* [x] Serial device discovery (IPC `serial:list`)
* [x] Integrated serial monitor (baud rates 9600 to 1152000)
* [ ] Firmware upload (esptool/avrdude integration)
* [ ] Toolchain management (PlatformIO)

* [ ] Hardware diagnostics
* [ ] Arduino integration
* [ ] ESP32 integration

### Embedded Development

* [ ] Build configuration
* [ ] Cross-compilation workflows
* [ ] Debug adapter integration
* [ ] Breakpoints
* [ ] Watch variables
* [ ] Debug console
* [ ] Embedded debugging

### Ecosystem

* [ ] Extension registry
* [ ] Hardware platform packages
* [ ] Toolchain packages
* [ ] Project templates
* [ ] Documentation system

The roadmap is subject to change as the architecture develops.

## Contributing

Contributions are welcome.

Before making substantial architectural changes, open an issue to discuss the proposed design.

For changes:

```bash
git checkout -b feature/<name>
```

Make the required changes, test them locally, and submit a pull request.

When contributing to core functionality, consider whether the implementation belongs in:

* `apps/desktop`
* `packages`
* `extensions`

Platform-specific functionality should generally remain isolated from the core application where practical.

## License

CavalloCode is released under the MIT License.

See [LICENSE](LICENSE) for the complete license text.


