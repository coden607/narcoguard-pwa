import { SensorFusion } from "./kalman-filter"

export interface VitalSigns {
  heartRate: number
  spO2: number
  temperature: number
  respiratoryRate: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  timestamp: number
}

export interface SensorReading {
  type: "ppg" | "ecg" | "accelerometer" | "thermometer" | "oximeter"
  value: number
  confidence: number
  timestamp: number
}

export class VitalsProcessor {
  private sensorFusion: SensorFusion
  private currentVitals: VitalSigns
  private baselineHeartRate = 72
  private baselineTemp = 98.6

  constructor() {
    this.sensorFusion = new SensorFusion()

    // Initialize Kalman filters for each vital sign
    this.sensorFusion.initSensor("heartRate", 72, 0.01, 2.0)
    this.sensorFusion.initSensor("spO2", 98, 0.001, 0.5)
    this.sensorFusion.initSensor("temperature", 98.6, 0.0001, 0.1)
    this.sensorFusion.initSensor("respiratoryRate", 16, 0.01, 1.0)
    this.sensorFusion.initSensor("bpSystolic", 120, 0.1, 3.0)
    this.sensorFusion.initSensor("bpDiastolic", 80, 0.1, 2.0)

    this.currentVitals = {
      heartRate: 72,
      spO2: 98,
      temperature: 98.6,
      respiratoryRate: 16,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      timestamp: Date.now(),
    }
  }

  // Process raw sensor readings and update vitals
  processSensorReadings(readings: SensorReading[]): VitalSigns {
    readings.forEach((reading) => {
      switch (reading.type) {
        case "ppg":
        case "ecg":
          // Heart rate from PPG or ECG sensors
          const hr = this.sensorFusion.processMeasurement("heartRate", reading.value)
          this.currentVitals.heartRate = hr
          break

        case "oximeter":
          // SpO2 from pulse oximeter
          const spo2 = this.sensorFusion.processMeasurement("spO2", reading.value)
          this.currentVitals.spO2 = spo2
          break

        case "thermometer":
          // Body temperature
          const temp = this.sensorFusion.processMeasurement("temperature", reading.value)
          this.currentVitals.temperature = temp
          break

        case "accelerometer":
          // Respiratory rate from chest movement
          const rr = this.sensorFusion.processMeasurement("respiratoryRate", reading.value)
          this.currentVitals.respiratoryRate = rr
          break
      }
    })

    this.currentVitals.timestamp = Date.now()
    return { ...this.currentVitals }
  }

  // Detect overdose indicators
  detectOverdoseIndicators(): {
    isAbnormal: boolean
    severity: "none" | "low" | "medium" | "high" | "critical"
    indicators: string[]
  } {
    const indicators: string[] = []
    let severity: "none" | "low" | "medium" | "high" | "critical" = "none"

    // Check for dangerously low respiratory rate (primary opioid overdose indicator)
    if (this.currentVitals.respiratoryRate < 8) {
      indicators.push("Severely depressed respiration (< 8 breaths/min)")
      severity = "critical"
    } else if (this.currentVitals.respiratoryRate < 12) {
      indicators.push("Low respiratory rate")
      severity = "high"
    }

    // Check for low oxygen saturation
    if (this.currentVitals.spO2 < 90) {
      indicators.push("Low blood oxygen (< 90%)")
      severity = severity === "critical" ? "critical" : "high"
    } else if (this.currentVitals.spO2 < 95) {
      indicators.push("Reduced oxygen saturation")
      severity = severity === "critical" || severity === "high" ? severity : "medium"
    }

    // Check for abnormal heart rate
    if (this.currentVitals.heartRate < 50) {
      indicators.push("Bradycardia (slow heart rate)")
      severity = severity === "critical" ? "critical" : "high"
    } else if (this.currentVitals.heartRate > 120) {
      indicators.push("Tachycardia (rapid heart rate)")
      severity = severity === "critical" || severity === "high" ? severity : "medium"
    }

    // Check for abnormal temperature
    if (this.currentVitals.temperature < 95) {
      indicators.push("Hypothermia detected")
      severity = severity === "critical" || severity === "high" ? severity : "medium"
    }

    return {
      isAbnormal: indicators.length > 0,
      severity,
      indicators,
    }
  }

  // Get current vitals
  getCurrentVitals(): VitalSigns {
    return { ...this.currentVitals }
  }

  // Simulate sensor data (for testing when no real sensors available)
  simulateSensorData(): SensorReading[] {
    const now = Date.now()
    return [
      {
        type: "ppg",
        value: this.baselineHeartRate + (Math.random() - 0.5) * 10,
        confidence: 0.9,
        timestamp: now,
      },
      {
        type: "oximeter",
        value: 98 + (Math.random() - 0.5) * 2,
        confidence: 0.95,
        timestamp: now,
      },
      {
        type: "thermometer",
        value: this.baselineTemp + (Math.random() - 0.5) * 0.5,
        confidence: 0.98,
        timestamp: now,
      },
      {
        type: "accelerometer",
        value: 16 + (Math.random() - 0.5) * 4,
        confidence: 0.85,
        timestamp: now,
      },
    ]
  }
}
