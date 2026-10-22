const demoSeed = Math.floor(Math.random() * 0xffffffff)

/** Stable for one page load; display-only fallback, never graph evidence. */
export function displayConfidence(actual: number | undefined, key: string) {
  if (actual !== undefined) return { percent: Math.round(actual * 100), demo: false }
  let hash = 2166136261 ^ demoSeed
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return { percent: 83 + ((hash >>> 0) % 17), demo: true }
}

export function confidenceText(actual: number | undefined, key: string) {
  const confidence = displayConfidence(actual, key)
  return `${confidence.percent}%${confidence.demo ? ' (demo)' : ''}`
}
