import { test } from 'node:test'
import assert from 'node:assert/strict'
import { watchCameraDistance } from '../lib/watch-framing'

test('camera contains the complete bounding sphere in narrow and wide views', () => {
  for (const aspect of [0.4, 0.75, 1, 2]) {
    for (const radius of [35, 70, 100]) {
      const distance = watchCameraDistance(radius, aspect, 30)
      const vertical = 15 * Math.PI / 180
      const horizontal = Math.atan(Math.tan(vertical) * aspect)
      assert.ok(distance * Math.sin(Math.min(vertical, horizontal)) > radius)
    }
  }
})
