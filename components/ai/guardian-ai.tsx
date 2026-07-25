"use client"

import { useState, useEffect, useRef } from "react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Send, Mic, Volume2, Sparkles, Brain } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: number
  type: "user" | "ai"
  content: string
  timestamp: Date
}

export function GuardianAingelAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "ai",
        content:
        "Guardian Aingel is unavailable until a verified AI provider is configured. This interface does not provide medical or emergency guidance.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages([...messages, userMessage])
    setInput("")

    setMessages((prev) => [
      ...prev,
      {
        ...userMessage,
        id: prev.length + 1,
        type: "ai",
        content: "No verified AI provider is configured. This assistant cannot provide live guidance. For an emergency, call 911.",
        timestamp: new Date(),
      },
    ])
  }

  return (
    <HolographicCard className="p-6 h-[500px] flex flex-col" glowIntensity="high">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center pulse-glow rotate-3d">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-4 h-4 text-secondary pulse-glow" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold font-[family-name:var(--font-orbitron)]">GUARDIAN AINGEL</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="text-xs text-muted-foreground">AI provider unavailable</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button disabled className="p-2 rounded-full glass opacity-50">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === "user" ? "bg-primary text-primary-foreground pulse-glow" : "glass neon-border"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-60 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

        </div>
      </ScrollArea>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <button disabled className="p-3 rounded-full glass opacity-50 group">
          <Mic className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:pulse-glow" />
        </button>
        <Input disabled
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="AI provider unavailable"
          className="flex-1 glass neon-border"
        />
        <GlowButton disabled onClick={sendMessage} size="icon">
          <Send className="w-4 h-4" />
        </GlowButton>
      </div>

      {/* Quick suggestions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {["Check vitals", "Find resources", "Naloxone info"].map((suggestion) => (
          <button disabled
            key={suggestion}
            onClick={() => setInput(suggestion)}
            className="text-xs px-3 py-1 rounded-full glass hover:bg-primary/10 transition-all hover:pulse-glow"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </HolographicCard>
  )
}
