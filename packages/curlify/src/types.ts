import type { Response, Test } from 'supertest'

export interface CurlifyRequest {
  method?: string
  url?: string
  headers?: Record<string, string | number | boolean | string[] | undefined>
  header?: Record<string, string | number | boolean | string[] | undefined>
  body?: unknown
  data?: unknown
  _data?: unknown
}

export type CurlifyTarget = Response | Test | CurlifyRequest | Record<string, any>

export interface CurlifyOptions {
  multiline?: boolean
  indent?: string
}

export interface CurlifyMiddlewareOptions {
  logger?: (curl: string) => void
  options?: CurlifyOptions
  logOnError?: boolean
}

export type CurlifyMiddlewarePlugin = (req: Test) => void
