import {
  InvalidAuthorizationCodeError,
  InvalidRefreshTokenError,
} from "./error.js"
import { generatePKCE } from "./pkce.js"

interface ResponseLike {
  json(): Promise<unknown>
  ok: Response["ok"]
}
type FetchLike = (...args: any[]) => Promise<ResponseLike>

export interface Tokens {
  access: string
  refresh: string
  expiresIn: number
}

export type Challenge = {
  state: string
  verifier?: string
}

export interface ClientInput {
  clientID: string
  issuer?: string
  fetch?: FetchLike
}

export interface AuthorizeOptions {
  pkce?: boolean
  provider?: string
}

export interface AuthorizeResult {
  challenge: Challenge
  url: string
}

export interface ExchangeSuccess {
  err: false
  tokens: Tokens
}

export interface ExchangeError {
  err: InvalidAuthorizationCodeError
}

export interface RefreshOptions {
  access?: string
}

export interface RefreshSuccess {
  err: false
  tokens?: Tokens
}

export interface RefreshError {
  err: InvalidRefreshTokenError
}

export interface Client {
  authorize(
    redirectURI: string,
    response: "code" | "token",
    opts?: AuthorizeOptions,
  ): Promise<AuthorizeResult>
  exchange(
    code: string,
    redirectURI: string,
    verifier?: string,
  ): Promise<ExchangeSuccess | ExchangeError>
  refresh(refresh: string, opts?: RefreshOptions): Promise<RefreshSuccess | RefreshError>
}

function getEnvIssuer() {
  if (typeof process === "undefined") return undefined
  return process.env.OPENAUTH_ISSUER
}

function validateIssuer(raw: string) {
  const parsed = new URL(raw)
  const isLoopback =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1"
  if (parsed.protocol !== "https:" && !isLoopback) {
    throw new Error(
      "OpenAuth issuer must use https except for localhost/loopback during development",
    )
  }
  return parsed.toString().replace(/\/+$/, "")
}

function validateURI(uri: string) {
  return new URL(uri).toString()
}

function randomState() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function createClient(input: ClientInput): Client {
  const issuer = input.issuer || getEnvIssuer()
  if (!issuer) throw new Error("No issuer")
  const validatedIssuer = validateIssuer(issuer)
  const f = input.fetch ?? fetch

  return {
    async authorize(
      redirectURI: string,
      response: "code" | "token",
      opts?: AuthorizeOptions,
    ) {
      const parsedRedirect = validateURI(redirectURI)
      const url = new URL(validatedIssuer + "/authorize")
      const challenge: Challenge = {
        state: randomState(),
      }
      url.searchParams.set("client_id", input.clientID)
      url.searchParams.set("redirect_uri", parsedRedirect)
      url.searchParams.set("response_type", response)
      url.searchParams.set("state", challenge.state)
      if (opts?.provider) url.searchParams.set("provider", opts.provider)
      if (opts?.pkce && response === "code") {
        const pkce = await generatePKCE()
        url.searchParams.set("code_challenge_method", "S256")
        url.searchParams.set("code_challenge", pkce.challenge)
        challenge.verifier = pkce.verifier
      }
      return {
        challenge,
        url: url.toString(),
      }
    },
    async exchange(
      code: string,
      redirectURI: string,
      verifier?: string,
    ): Promise<ExchangeSuccess | ExchangeError> {
      const parsedRedirect = validateURI(redirectURI)
      const tokens = await f(validatedIssuer + "/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          redirect_uri: parsedRedirect,
          grant_type: "authorization_code",
          client_id: input.clientID,
          code_verifier: verifier || "",
        }).toString(),
      })
      const json = (await tokens.json()) as any
      if (!tokens.ok) {
        return {
          err: new InvalidAuthorizationCodeError(),
        }
      }
      return {
        err: false,
        tokens: {
          access: json.access_token as string,
          refresh: json.refresh_token as string,
          expiresIn: json.expires_in as number,
        },
      }
    },
    async refresh(
      refresh: string,
      _opts?: RefreshOptions,
    ): Promise<RefreshSuccess | RefreshError> {
      const tokens = await f(validatedIssuer + "/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refresh,
        }).toString(),
      })
      const json = (await tokens.json()) as any
      if (!tokens.ok) {
        return {
          err: new InvalidRefreshTokenError(),
        }
      }
      return {
        err: false,
        tokens: {
          access: json.access_token as string,
          refresh: json.refresh_token as string,
          expiresIn: json.expires_in as number,
        },
      }
    },
  }
}
