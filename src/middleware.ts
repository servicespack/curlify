import type { Response, Test } from 'supertest'

import { curlify } from './curlify'
import type { CurlifyMiddlewareOptions, CurlifyMiddlewarePlugin } from './types'

export function createCurlifyMiddleware(middlewareOptions: CurlifyMiddlewareOptions = {}): CurlifyMiddlewarePlugin {
  const {
    logger = console.log,
    options,
    logOnError = true,
  } = middlewareOptions

  return (req: Test) => {
    let logged = false

    req.on('response', (res: Response) => {
      if (!logged) {
        logged = true
        logger(curlify(res, options))
      }
    })

    if (logOnError) {
      req.on('error', () => {
        if (!logged) {
          logged = true
          logger(curlify(req, options))
        }
      })
    }
  }
}

export function curlifyMiddleware(req: Test): void;
export function curlifyMiddleware(options?: CurlifyMiddlewareOptions): CurlifyMiddlewarePlugin;
export function curlifyMiddleware(
  target: Test | CurlifyMiddlewareOptions = {}
): void | CurlifyMiddlewarePlugin {
  if (target && typeof (target as any).on === 'function') {
    return createCurlifyMiddleware()(target as Test)
  }

  return createCurlifyMiddleware(target as CurlifyMiddlewareOptions)
}

