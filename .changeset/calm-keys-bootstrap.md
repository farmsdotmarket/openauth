---
"@farmsdotmarket/openauth": patch
---

Fix key bootstrap stampede on eventually-consistent storage (Cloudflare KV). `signingKeys`/`encryptionKeys` now return the freshly generated key directly instead of re-scanning the store, which could miss the just-written key and mint hundreds of duplicates (anomalyco/openauth#322), making every subsequent key scan slow.
