import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'

export type ProjectTemplate = 'esp32' | 'arduino-uno' | 'arduino-nano' | 'pico'

export async function createProjectTemplate(parentDirectory: string, projectName: string, template: ProjectTemplate) {
  const safeName = basename(projectName.trim()).replace(/[^\w.-]/g, '_')
  if (!safeName || safeName === '.' || safeName === '..') throw new Error('Enter a valid project name.')
  if (!/^[A-Za-z0-9_]/.test(safeName)) throw new Error('Project names must start with a letter, number, or underscore.')
  const projectPath = resolve(parentDirectory, safeName)
  const pathFromParent = relative(resolve(parentDirectory), projectPath)
  if (!pathFromParent || pathFromParent.startsWith('..') || isAbsolute(pathFromParent)) throw new Error('Project name must be a single directory name.')
  await mkdir(projectPath)
  const files: Record<string, string> = {
    'src/main.cpp': template === 'pico'
      ? `#include <cstdio>\n#include "pico/stdlib.h"\n\nint main() {\n  stdio_init_all();\n  const uint led = PICO_DEFAULT_LED_PIN;\n  gpio_init(led);\n  gpio_set_dir(led, GPIO_OUT);\n  while (true) {\n    gpio_put(led, 1);\n    sleep_ms(500);\n    gpio_put(led, 0);\n    sleep_ms(500);\n  }\n}\n`
      : `#include <Arduino.h>\n\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(500);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(500);\n}\n`,
  }
  if (template === 'pico') {
    files['CMakeLists.txt'] = `cmake_minimum_required(VERSION 3.13)\ninclude($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)\nproject(${safeName} C CXX ASM)\nset(CMAKE_C_STANDARD 11)\nset(CMAKE_CXX_STANDARD 17)\npico_sdk_init()\nadd_executable(${safeName} src/main.cpp)\ntarget_link_libraries(${safeName} pico_stdlib)\npico_enable_stdio_usb(${safeName} 1)\npico_enable_stdio_uart(${safeName} 0)\npico_add_extra_outputs(${safeName})\n`
    files['README.md'] = `# ${safeName}\n\nBuild with the Raspberry Pi Pico SDK. Set PICO_SDK_PATH before configuring CMake.\n`
  } else {
    const board = template === 'esp32' ? 'esp32dev' : template === 'arduino-nano' ? 'nanoatmega328' : 'uno'
    const platform = template === 'esp32' ? 'espressif32' : 'atmelavr'
    files['platformio.ini'] = `[env:${board}]\nplatform = ${platform}\nboard = ${board}\nframework = arduino\nmonitor_speed = 115200\n${template === 'arduino-nano' ? 'board_upload.speed = 115200\n' : ''}`
    files['README.md'] = `# ${safeName}\n\nBuild and upload with PlatformIO.\n`
  }
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(projectPath, relativePath)
    await mkdir(dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, content, 'utf8')
  }
  return projectPath
}
