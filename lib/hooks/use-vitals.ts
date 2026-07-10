"use client"

import { useState, useEffect, useCallback } from "react"

export interface VitalSigns {
  heartRate: number
  spO2: number
  temperature: number
  respiratoryRate: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  timestamp: number
}

export interface OverdoseCheck {
  isAbnormal: boolean
  severity: "none" | "low" | "medium" | "high" | "critical"
  indicators: string[]
  riskScore: number
  confidence: number
  recommendedAction: "monitor" | "increase_observation" | "prepare_response" | "activate_emergency"
  supportingSignals: number
}

export function useVitals(pollingInterval = 2000) {
  const [vitals, setVitals] = useState<VitalSigns | null>(null)
  const [overdoseCheck, setOverdoseCheck] = useState<OverdoseCheck | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVitals = useCallback(async () => {
    try {
      const response = await fetch("/api/vitals")
      if (!response.ok) throw new Error("Failed to fetch vitals")

      const data = await response.json()
      setVitals(data.vitals)
      setOverdoseCheck(data.overdoseCheck)
      setError(null)

      // Auto-trigger emergency if critical
      if (data.overdoseCheck.severity === "critical") {
        console.log("[v0] CRITICAL VITALS DETECTED - Auto-alerting")
        // This would trigger auto-emergency in production
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVitals()
    const interval = setInterval(fetchVitals, pollingInterval)
    return () => clearInterval(interval)
  }, [fetchVitals, pollingInterval])

  return { vitals, overdoseCheck, isLoading, error, refetch: fetchVitals }
}
