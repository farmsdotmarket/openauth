export function generateUnbiasedDigits(length: number): string {
  const result: number[] = []
  while (result.length < length) {
    const buffer = crypto.getRandomValues(new Uint8Array(length * 2))
    for (const byte of buffer) {
      if (byte < 250 && result.length < length) {
        result.push(byte % 10)
      }
    }
  }
  return result.join("")
}

export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false
  }
  if (a.length !== b.length) {
    return false
  }

  // Keep runtime-agnostic constant-time behavior for equal-length strings.
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
