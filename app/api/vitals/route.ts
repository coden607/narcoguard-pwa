import { NextResponse } from "next/server"
import { VitalsProcessor } from "@/lib/vitals-processor"
import { z } from "zod"

const vitalsProcessor = new VitalsProcessor()

const readingsSchema = z.array(z.object({ type: z.enum(["ppg", "ecg", "accelerometer", "thermometer", "oximeter"]), value: z.number().finite(), unit: z.string().min(1).max(20), confidence: z.number().finite().min(0).max(1), timestamp: z.number().finite().default(() => Date.now()) })).min(1).max(100)

export async function GET() {
  const sensorReadings = vitalsProcessor.simulateSensorData()
  const vitals = vitalsProcessor.processSensorReadings(sensorReadings)
  const overdoseCheck = vitalsProcessor.detectOverdoseIndicators()

  return NextResponse.json({
    vitals,
    overdoseCheck,
    timestamp: Date.now(),
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const readings = readingsSchema.parse(body?.readings)

    const vitals = vitalsProcessor.processSensorReadings(readings)
    const overdoseCheck = vitalsProcessor.detectOverdoseIndicators()

    return NextResponse.json({
      success: true,
      vitals,
      overdoseCheck,
    })
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: status === 400 ? "Invalid sensor readings" : "Failed to process vitals" }, { status })
  }
}
