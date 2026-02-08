# Farms OpenAuth Fork Patches

This fork branch contains Farms-specific patches for React Native compatibility and security hardening.

## 1) React Native client export and mobile-safe client entry
- Fork patch:
  - Added `./client` export condition with `react-native` target in `packages/openauth/package.json`.
  - Added `packages/openauth/src/client-native.ts` with a minimal mobile-safe surface:
    - `authorize`
    - `exchange`
    - `refresh`
  - Added `packages/openauth/test/client-native.test.ts`.
- Upstream related work:
  - https://github.com/anomalyco/openauth/pull/222 (Expo/React Native example)
  - https://github.com/anomalyco/openauth/pull/136 (platform-specific dependency cleanup)

## 2) Runtime import portability fix for timing-safe compare
- Fork patch:
  - Replaced Node-only `node:crypto` import in `packages/openauth/src/random.ts`.
  - Implemented runtime-agnostic constant-time string compare for equal-length strings.
- Upstream related work:
  - https://github.com/anomalyco/openauth/pull/93 (OTP bias and timing attack work)
  - https://github.com/anomalyco/openauth/pull/136 (platform-specific dependency cleanup)

## 3) Client issuer security guardrails
- Fork patch:
  - Added issuer validation in `packages/openauth/src/client.ts` and `packages/openauth/src/client-native.ts`.
  - Requires `https` issuer except for localhost/loopback development hosts.
  - Added tests in `packages/openauth/test/client.test.ts`.
- Upstream related work:
  - https://github.com/anomalyco/openauth/pull/305 (redirect URI security hardening)
  - https://github.com/anomalyco/openauth/pull/309 (JWT audience validation hardening)
