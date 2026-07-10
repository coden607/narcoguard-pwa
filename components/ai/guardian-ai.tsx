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
        "Hello! I'm Guardian Aingel, your personal AI angel and assistant. I'm here to help keep you safe and guide you through any questions about overdose prevention, naloxone use, or recovery resources. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const aiResponses = [
    "Remember to check your naloxone expiration date regularly. Would you like me to set a reminder?",
    "Your vitals look good today! Keep up the great work staying healthy.",
    "I noticed you haven't checked in today. How are you feeling?",
    "There's a recovery support meeting near you tomorrow at 6 PM. Would you like directions?",
    "Great job maintaining your 30-day streak! That's a significant milestone.",
  ]

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
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: messages.length + 2,
        type: "ai",
        content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
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
              <div className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
              <span className="text-xs text-muted-foreground">Online & Learning</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsSpeaking(!isSpeaking)}
            className={`p-2 rounded-full glass hover:bg-primary/10 transition-all ${isSpeaking ? "pulse-glow" : ""}`}
          >
            <Volume2 className={`w-4 h-4 ${isSpeaking ? "text-primary" : "text-muted-foreground"}`} />
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

          {isTyping && (
            <div className="flex justify-start">
              <div className="glass neon-border p-3 rounded-lg">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary pulse-glow" style={{ animationDelay: "0s" }} />
                  <div className="w-2 h-2 rounded-full bg-primary pulse-glow" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 rounded-full bg-primary pulse-glow" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <button className="p-3 rounded-full glass hover:bg-primary/10 transition-all group">
          <Mic className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:pulse-glow" />
        </button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask Guardian Aingel anything..."
          className="flex-1 glass neon-border"
        />
        <GlowButton onClick={sendMessage} size="icon">
          <Send className="w-4 h-4" />
        </GlowButton>
      </div>

      {/* Quick suggestions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {["Check vitals", "Find resources", "Naloxone info"].map((suggestion) => (
          <button
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
