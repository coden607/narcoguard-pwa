"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlowButton } from "@/components/effects/glow-button"
import { Watch, Battery, Droplet, Wifi, Bluetooth, Sun, Zap, Activity, Settings, Package } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function WatchDetails() {
  const [selectedTab, setSelectedTab] = useState("overview")

  return (
    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 glass">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="vitals">Vitals</TabsTrigger>
        <TabsTrigger value="power">Power</TabsTrigger>
        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Watch className="w-5 h-5 text-primary pulse-glow" />
              <span className="text-sm font-medium">Device Info</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Model: NarcoGuard NG</p>
              <p>Serial: NG-2024-8472</p>
              <p>Firmware: v2.4.1</p>
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Bluetooth className="w-5 h-5 text-blue-500 pulse-glow" />
              <span className="text-sm font-medium">Connectivity</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Bluetooth: Connected</p>
              <p>eSIM: Active</p>
              <p>Signal: Strong</p>
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="w-5 h-5 text-green-500 pulse-glow" />
              <span className="text-sm font-medium">Naloxone</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Status: Ready</p>
              <p>Expires: 180 days</p>
              <p>Doses: 2mg x 2</p>
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-5 h-5 text-yellow-500 pulse-glow" />
              <span className="text-sm font-medium">Power</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Battery: 85%</p>
              <p>Charging: Solar</p>
              <p>Runtime: 48h</p>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-lg neon-border">
          <h4 className="font-medium mb-3">3D Watch Model</h4>
          <div className="relative h-64 bg-muted/20 rounded-lg overflow-hidden flex items-center justify-center">
            <div className="relative w-32 h-32 rotate-3d">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-purple-500 pulse-glow" />
              <div className="absolute inset-2 rounded-xl bg-background flex items-center justify-center">
                <Watch className="w-16 h-16 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="vitals" className="space-y-4 mt-4">
        <div className="space-y-4">
          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Heart Rate</span>
              <span className="text-2xl font-bold glow-text">72 BPM</span>
            </div>
            <Progress value={60} className="h-2 pulse-glow" />
            <p className="text-xs text-muted-foreground mt-2">Normal range: 60-100 BPM</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Blood Oxygen (SpO2)</span>
              <span className="text-2xl font-bold glow-text">98%</span>
            </div>
            <Progress value={98} className="h-2 pulse-glow" />
            <p className="text-xs text-muted-foreground mt-2">Optimal: 95-100%</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Movement Activity</span>
              <span className="text-2xl font-bold glow-text">Active</span>
            </div>
            <Progress value={75} className="h-2 pulse-glow" />
            <p className="text-xs text-muted-foreground mt-2">Last movement: 2 minutes ago</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              24-Hour Vitals Chart
            </h4>
            <div className="h-32 flex items-end gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-primary to-purple-500 rounded-t pulse-glow"
                  style={{ height: `${Math.random() * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="power" className="space-y-4 mt-4">
        <div className="glass p-4 rounded-lg neon-border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Battery Status</h4>
            <span className="text-3xl font-bold glow-text">85%</span>
          </div>
          <Progress value={85} className="h-4 pulse-glow mb-2" />
          <p className="text-xs text-muted-foreground">Estimated runtime: 48 hours</p>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Charging Methods</h4>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="w-6 h-6 text-yellow-500 pulse-glow" />
                <div>
                  <p className="font-medium">Solar Charging</p>
                  <p className="text-xs text-muted-foreground">Active - 5% per hour</p>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border opacity-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="font-medium">Kinetic Charging</p>
                  <p className="text-xs text-muted-foreground">Inactive - Movement required</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border opacity-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="font-medium">Wireless Charging</p>
                  <p className="text-xs text-muted-foreground">Not on charger</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-4 rounded-lg neon-border opacity-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium">USB-C Fast Charge</p>
                  <p className="text-xs text-muted-foreground">Not connected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="maintenance" className="space-y-4 mt-4">
        <div className="glass p-4 rounded-lg neon-border">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-6 h-6 text-primary pulse-glow" />
            <h4 className="font-medium">Modular Components</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg glass">
              <div>
                <p className="text-sm font-medium">Naloxone Cartridge</p>
                <p className="text-xs text-muted-foreground">Expires in 180 days</p>
              </div>
              <GlowButton size="sm" variant="default">
                Replace
              </GlowButton>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg glass">
              <div>
                <p className="text-sm font-medium">Battery Module</p>
                <p className="text-xs text-muted-foreground">Health: 95%</p>
              </div>
              <GlowButton size="sm" variant="default">
                Check
              </GlowButton>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg glass">
              <div>
                <p className="text-sm font-medium">Sensor Array</p>
                <p className="text-xs text-muted-foreground">Calibrated 2 days ago</p>
              </div>
              <GlowButton size="sm" variant="default">
                Calibrate
              </GlowButton>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-lg neon-border">
          <h4 className="font-medium mb-3">Firmware Updates</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Current Version: v2.4.1</p>
              <p className="text-xs text-muted-foreground">Latest version available</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
          </div>
        </div>

        <GlowButton variant="default" className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          Advanced Settings
        </GlowButton>
      </TabsContent>
    </Tabs>
  )
}
