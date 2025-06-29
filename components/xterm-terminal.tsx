"use client"

import { useEffect, useRef } from "react"

// XTerm Terminal Component
export default function XTermTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)

  useEffect(() => {
    const loadXTerm = async () => {
      if (typeof window !== "undefined") {
        try {
          const { Terminal } = await import("xterm")
          const { FitAddon } = await import("xterm-addon-fit")

          // Import CSS
          await import("xterm/css/xterm.css")

          if (terminalRef.current && !xtermRef.current) {
            // Detect current theme
            const isDark = document.documentElement.classList.contains("dark")

            const terminal = new Terminal({
              theme: isDark
                ? {
                    background: "#1e1e1e",
                    foreground: "#d4d4d4",
                    cursor: "#ffffff",
                    selection: "#264f78",
                    black: "#000000",
                    red: "#cd3131",
                    green: "#0dbc79",
                    yellow: "#e5e510",
                    blue: "#2472c8",
                    magenta: "#bc3fbc",
                    cyan: "#11a8cd",
                    white: "#e5e5e5",
                    brightBlack: "#666666",
                    brightRed: "#f14c4c",
                    brightGreen: "#23d18b",
                    brightYellow: "#f5f543",
                    brightBlue: "#3b8eea",
                    brightMagenta: "#d670d6",
                    brightCyan: "#29b8db",
                    brightWhite: "#e5e5e5",
                  }
                : {
                    background: "#ffffff",
                    foreground: "#333333",
                    cursor: "#000000",
                    selection: "#b3d4fc",
                    black: "#000000",
                    red: "#cd3131",
                    green: "#00bc00",
                    yellow: "#949800",
                    blue: "#0451a5",
                    magenta: "#bc05bc",
                    cyan: "#0598bc",
                    white: "#555555",
                    brightBlack: "#666666",
                    brightRed: "#cd3131",
                    brightGreen: "#14ce14",
                    brightYellow: "#b5ba00",
                    brightBlue: "#0451a5",
                    brightMagenta: "#bc05bc",
                    brightCyan: "#0598bc",
                    brightWhite: "#a5a5a5",
                  },
              fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
              fontSize: 13,
              lineHeight: 1.2,
              cursorBlink: true,
              cursorStyle: "block",
              scrollback: 1000,
            })

            const fitAddon = new FitAddon()
            terminal.loadAddon(fitAddon)

            terminal.open(terminalRef.current)
            fitAddon.fit()

            // Welcome message
            terminal.writeln("Welcome to Terraform Workspace Terminal")
            terminal.writeln("Type 'help' for available commands")
            terminal.write("$ ")

            let currentLine = ""

            terminal.onData((data) => {
              switch (data) {
                case "\r": // Enter
                  terminal.write("\r\n")
                  handleCommand(currentLine.trim(), terminal)
                  currentLine = ""
                  terminal.write("$ ")
                  break
                case "\u007F": // Backspace
                  if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1)
                    terminal.write("\b \b")
                  }
                  break
                default:
                  currentLine += data
                  terminal.write(data)
              }
            })

            xtermRef.current = terminal

            // Handle resize
            const handleResize = () => {
              fitAddon.fit()
            }

            window.addEventListener("resize", handleResize)

            return () => {
              window.removeEventListener("resize", handleResize)
              terminal.dispose()
            }
          }
        } catch (error) {
          console.error("Failed to load XTerm:", error)
        }
      }
    }

    loadXTerm()
  }, [])

  const handleCommand = (command: string, terminal: any) => {
    switch (command.toLowerCase()) {
      case "help":
        terminal.writeln("Available commands:")
        terminal.writeln("  help          - Show this help message")
        terminal.writeln("  clear         - Clear the terminal")
        terminal.writeln("  terraform     - Show Terraform commands")
        terminal.writeln("  ls            - List files")
        terminal.writeln("  pwd           - Show current directory")
        terminal.writeln("  whoami        - Show current user")
        break
      case "clear":
        terminal.clear()
        break
      case "terraform":
        terminal.writeln("Terraform commands:")
        terminal.writeln("  terraform init     - Initialize Terraform")
        terminal.writeln("  terraform plan     - Create execution plan")
        terminal.writeln("  terraform apply    - Apply changes")
        terminal.writeln("  terraform destroy  - Destroy infrastructure")
        break
      case "ls":
        terminal.writeln("main.tf")
        terminal.writeln("variables.tf")
        terminal.writeln("outputs.tf")
        terminal.writeln("providers.tf")
        terminal.writeln("modules/")
        break
      case "pwd":
        terminal.writeln("/workspace/terraform-project")
        break
      case "whoami":
        terminal.writeln("terraform-user")
        break
      case "":
        // Empty command, just show prompt
        break
      default:
        terminal.writeln(`Command not found: ${command}`)
        terminal.writeln("Type 'help' for available commands")
    }
  }

  return <div ref={terminalRef} className="w-full h-full" style={{ minHeight: "200px" }} />
}
