"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface SimpleCodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
  filename: string
}

export default function SimpleCodeEditor({ value, onChange, language, filename }: SimpleCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = value
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      // Insert tab character
      const newValue = value.substring(0, start) + "  " + value.substring(end)
      onChange(newValue)

      // Move cursor
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "hcl":
        return "Terraform"
      case "shell":
        return "Shell Script"
      case "json":
        return "JSON"
      case "yaml":
        return "YAML"
      default:
        return "Text"
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{filename}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-secondary px-2 py-1 rounded">{getLanguageLabel(language)}</span>
        </div>
      </div>
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          className={`w-full h-full p-4 font-mono text-sm resize-none border-0 focus:outline-none ${
            theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
          }`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder="Start typing your code..."
          style={{
            lineHeight: "1.5",
            tabSize: 2,
          }}
        />
        {/* Line numbers overlay */}
        <div
          className={`absolute left-0 top-0 p-4 pr-2 pointer-events-none select-none font-mono text-sm ${
            theme === "dark" ? "text-gray-500" : "text-gray-400"
          }`}
          style={{ lineHeight: "1.5" }}
        >
          {value.split("\n").map((_, index) => (
            <div key={index} className="text-right" style={{ minWidth: "2em" }}>
              {index + 1}
            </div>
          ))}
        </div>
        <style jsx>{`
          textarea {
            padding-left: ${Math.max(2, value.split("\n").length.toString().length) * 0.6 + 3}em !important;
          }
        `}</style>
      </div>
    </div>
  )
}
