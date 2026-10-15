/** Fit the entire rotating assembly, with padding, inside both camera axes. */
export function watchCameraDistance(radius: number, aspect: number, verticalFovDegrees: number): number {
  const vertical = verticalFovDegrees * Math.PI / 360
  const horizontal = Math.atan(Math.tan(vertical) * Math.max(aspect, 0.01))
  return Math.max(radius, 1) * 1.15 / Math.sin(Math.min(vertical, horizontal))
}
