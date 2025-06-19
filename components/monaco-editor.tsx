"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
  filename: string
}

export default function MonacoEditor({ value, onChange, language, filename }: MonacoEditorProps) {
  const editorRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    let monaco: any = null

    const initMonaco = async () => {
      try {
        // Use CDN version to avoid Node.js compatibility issues
        if (typeof window !== "undefined") {
          // Load Monaco from CDN
          const script = document.createElement("script")
          script.src = "https://unpkg.com/monaco-editor@0.45.0/min/vs/loader.js"
          script.onload = () => {
            // @ts-ignore
            window.require.config({ paths: { vs: "https://unpkg.com/monaco-editor@0.45.0/min/vs" } })
            // @ts-ignore
            window.require(["vs/editor/editor.main"], () => {
              // @ts-ignore
              monaco = window.monaco

              // Register HCL language
              if (!monaco.languages.getLanguages().find((lang: any) => lang.id === "hcl")) {
                monaco.languages.register({ id: "hcl" })

                // Define HCL syntax highlighting
                monaco.languages.setMonarchTokensProvider("hcl", {
                  tokenizer: {
                    root: [
                      // Comments
                      [/#.*$/, "comment"],
                      [/\/\/.*$/, "comment"],
                      [/\/\*/, "comment", "@comment"],

                      // Strings
                      [/"([^"\\]|\\.)*$/, "string.invalid"],
                      [/"/, "string", "@string"],

                      // Numbers
                      [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
                      [/\d+/, "number"],

                      // Keywords
                      [/\b(resource|data|variable|output|locals|module|provider|terraform)\b/, "keyword"],
                      [/\b(true|false|null)\b/, "keyword.literal"],

                      // Identifiers
                      [/[a-zA-Z_]\w*/, "identifier"],

                      // Operators
                      [/[{}()[\]]/, "@brackets"],
                      [/[<>]=?/, "operator"],
                      [/[=!]=/, "operator"],
                      [/[+\-*/]/, "operator"],
                    ],

                    comment: [
                      [/[^/*]+/, "comment"],
                      [/\*\//, "comment", "@pop"],
                      [/[/*]/, "comment"],
                    ],

                    string: [
                      [/[^\\"]+/, "string"],
                      [/\\./, "string.escape"],
                      [/"/, "string", "@pop"],
                    ],
                  },
                })

                // Configure HCL language features
                monaco.languages.setLanguageConfiguration("hcl", {
                  comments: {
                    lineComment: "#",
                    blockComment: ["/*", "*/"],
                  },
                  brackets: [
                    ["{", "}"],
                    ["[", "]"],
                    ["(", ")"],
                  ],
                  autoClosingPairs: [
                    { open: "{", close: "}" },
                    { open: "[", close: "]" },
                    { open: "(", close: ")" },
                    { open: '"', close: '"' },
                  ],
                  surroundingPairs: [
                    { open: "{", close: "}" },
                    { open: "[", close: "]" },
                    { open: "(", close: ")" },
                    { open: '"', close: '"' },
                  ],
                })
              }

              if (containerRef.current && !editorRef.current) {
                // Create the editor
                editorRef.current = monaco.editor.create(containerRef.current, {
                  value,
                  language,
                  theme: theme === "dark" ? "vs-dark" : "vs",
                  automaticLayout: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: "on",
                  renderWhitespace: "selection",
                  tabSize: 2,
                  insertSpaces: true,
                  wordWrap: "on",
                  folding: true,
                  foldingStrategy: "indentation",
                  showFoldingControls: "always",
                  bracketPairColorization: { enabled: true },
                  guides: {
                    bracketPairs: true,
                    indentation: true,
                  },
                  suggest: {
                    showKeywords: true,
                    showSnippets: true,
                    showFunctions: true,
                    showVariables: true,
                  },
                })

                // Listen for content changes
                editorRef.current.onDidChangeModelContent(() => {
                  const newValue = editorRef.current.getValue()
                  onChange(newValue)
                })
              }
            })
          }
          document.head.appendChild(script)
        }
      } catch (error) {
        console.error("Failed to load Monaco Editor:", error)
      }
    }

    initMonaco()

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose()
        editorRef.current = null
      }
    }
  }, [])

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value)
    }
  }, [value])

  // Update editor language when prop changes
  useEffect(() => {
    if (editorRef.current && typeof window !== "undefined") {
      const model = editorRef.current.getModel()
      if (model) {
        // @ts-ignore
        window.monaco?.editor.setModelLanguage(model, language)
      }
    }
  }, [language])

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current && typeof window !== "undefined") {
      // @ts-ignore
      window.monaco?.editor.setTheme(theme === "dark" ? "vs-dark" : "vs")
    }
  }, [theme])

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: "400px" }} />
}
