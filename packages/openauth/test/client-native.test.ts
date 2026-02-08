import { expect, test } from "bun:test"
import { createClient } from "../src/client-native.js"

test("client-native exposes minimal mobile-safe surface", () => {
  const client = createClient({
    issuer: "https://auth.example.com",
    clientID: "mobile",
    fetch: async () =>
      ({
        ok: true,
        json: async () => ({}),
      }) as any,
  })

  expect(typeof client.authorize).toBe("function")
  expect(typeof client.exchange).toBe("function")
  expect(typeof client.refresh).toBe("function")
  expect((client as any).verify).toBeUndefined()
})

test("client-native enforces issuer safety", () => {
  expect(() =>
    createClient({
      issuer: "http://example.com",
      clientID: "mobile",
    }),
  ).toThrow(
    "OpenAuth issuer must use https except for localhost/loopback during development",
  )
})
