// Translucent tint of a brand hex color — used for brand-aware fills,
// glows, and gradients so every client's palette drives its own chrome.
export function hexTint(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return `rgba(0, 0, 0, ${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
