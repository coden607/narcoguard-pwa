import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'

test('the primary titanium watch artwork fully decodes through its last pixel', async () => {
  const { data, info } = await sharp('public/images/ng-titanium-3d.png', { failOn: 'warning' }).raw().toBuffer({ resolveWithObject: true })
  assert.equal(info.width, 1536)
  assert.equal(info.height, 1024)
  assert.equal(data.length, info.width * info.height * info.channels)
})
