<img width="2000" height="2000" alt="cavallocode" src="https://github.com/user-attachments/assets/d5faa12c-50b2-4307-83ed-e5012f54263f" />



# CavalloCode

**Write firmware, build locally, and monitor your board from one desktop workbench.**

CavalloCode is an open-source IDE for embedded development. Edit code in a VS Code-inspired workspace, build ESP32 and Arduino projects with your local PlatformIO installation, and inspect serial output in the integrated monitor and plotter.

It is an early-stage project for makers and embedded developers who want their editor and serial tools together, with an extension-based foundation for adding hardware support.

**Get started:** [run CavalloCode from source](#quickstart--development) · [see current capabilities and roadmap](#roadmap)

> **Development status:** CavalloCode is actively evolving; platform support and extension APIs may change. Firmware builds require you to install PlatformIO Core separately—CavalloCode does not bundle the toolchain. See the [roadmap](#roadmap) for features that are still planned.

## Desktop setup and hardware toolchains

Serial Monitor, Serial Plotter, and Build Console run inside the desktop app. Firmware compilation still requires a local compiler: install [PlatformIO Core](https://docs.platformio.org/en/latest/core/installation/index.html) for ESP32/Arduino projects, or configure its CLI executable under **Settings → Hardware** if it is not on `PATH`. A missing CLI is reported as a build error; CavalloCode does not bundle PlatformIO itself. New Window is available under **File**. Keyboard shortcuts and built-in themes are listed under **Settings**.

The extension authoring guide is [docs/EXTENSION_DEVELOPMENT.md](docs/EXTENSION_DEVELOPMENT.md).

## What you can do

The desktop app brings the everyday edit-and-inspect loop for embedded projects into one place:

- **Edit in a familiar workspace**: Monaco-based editor, file explorer, command palette, keyboard shortcuts, and resizable editor and terminal panels.
- **Build with your own toolchain**: PlatformIO CLI integration for ESP32 and Arduino builds. Install PlatformIO Core separately and configure its executable in Hardware settings if it is not on `PATH`.
- **See live device output**: Connect to serial ports, choose a baud rate, and use the integrated monitor or numeric plotter.
- **Start with built-in board definitions**: ESP32, Arduino AVR, and Raspberry Pi Pico (RP2040) extensions are included.
- **Extend the IDE**: A plugin API keeps board- and platform-specific contributions separate from the core application.

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

