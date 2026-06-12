import { describe, expect, test } from "bun:test"
import { MemoryStorage } from "../src/storage/memory.js"
import type { StorageAdapter } from "../src/storage/storage.js"
import { encryptionKeys, signingKeys } from "../src/keys.js"

// Simulates an eventually-consistent store (e.g. Cloudflare KV) where writes
// are never visible to scan() during the test. The old implementation
// re-scanned after writing a fresh key and looped, minting hundreds of keys.
function eventuallyConsistentStorage(): StorageAdapter & {
  writes: () => number
} {
  const visible = MemoryStorage()
  const hidden = MemoryStorage()
  let writes = 0
  return {
    get: (key) => hidden.get(key),
    set: async (key, value, expiry) => {
      writes++
      await hidden.set(key, value, expiry)
    },
    remove: (key) => hidden.remove(key),
    scan: (prefix) => visible.scan(prefix),
    writes: () => writes,
  }
}

describe("signingKeys", () => {
  test("bootstrap returns generated key without re-scanning stale store", async () => {
    const storage = eventuallyConsistentStorage()
    const keys = await signingKeys(storage)
    expect(storage.writes()).toBe(1)
    expect(keys.length).toBe(1)
    expect(keys[0].expired).toBeUndefined()
    expect(keys[0].jwk.kid).toBe(keys[0].id)
    expect(keys[0].jwk.use).toBe("sig")
  })

  test("existing valid key is reused, nothing written", async () => {
    const storage = MemoryStorage()
    const first = await signingKeys(storage)
    const second = await signingKeys(storage)
    expect(second.length).toBe(1)
    expect(second[0].id).toBe(first[0].id)
  })
})

describe("encryptionKeys", () => {
  test("bootstrap returns generated key without re-scanning stale store", async () => {
    const storage = eventuallyConsistentStorage()
    const keys = await encryptionKeys(storage)
    expect(storage.writes()).toBe(1)
    expect(keys.length).toBe(1)
    expect(keys[0].expired).toBeUndefined()
    expect(keys[0].jwk.kid).toBe(keys[0].id)
  })
})
