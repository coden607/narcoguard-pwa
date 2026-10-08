import { strict as assert } from "node:assert"
import { test } from "node:test"
import { rankResources, resourceKey, type ResourceFeedback } from "../lib/resource-personalization"
import type { NearbyResource } from "../lib/resource-finder"

const item = (name:string, distance:number): NearbyResource => ({ name, kind:"quick-meal", distanceMiles:distance, source:"OpenStreetMap contributors" })

test("resource personalization respects maximum distance", () => {
  const ranked=rankResources([item("Near",1),item("Far",8)],{maxDistanceMiles:3,preferFreeFood:false},[])
  assert.deepEqual(ranked.map((r)=>r.name),["Near"])
})

test("worked resources rise while rejected ones disappear", () => {
  const near=item("Near",1), known=item("Known",3), closed=item("Closed",0.5)
  const feedback:ResourceFeedback[]=[
    {key:resourceKey(known),value:"worked",updatedAt:"2026-01-01"},
    {key:resourceKey(closed),value:"closed",updatedAt:"2026-01-01"},
  ]
  const ranked=rankResources([near,known,closed],{maxDistanceMiles:null,preferFreeFood:false},feedback)
  assert.deepEqual(ranked.map((r)=>r.name),["Known","Near"])
})
