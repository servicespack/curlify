import type { NextFunction, Request, RequestHandler, Response } from 'express'

export interface AuthorizeOptions {
  /**
   * The expected scheme for the Authorization header (e.g. 'Bearer', 'Basic').
   * Case-insensitive.
   * @default 'Bearer'
   */
  scheme?: string

  /**
   * Optional custom validation function for the token.
   * If it returns false, null, undefined, or throws/rejects, authorization fails.
   * It can also return a payload that will be attached to `req.auth`.
   */
  validate?: (token: string, req: Request) => any | Promise<any>

  /**
   * Custom unauthorized response handler.
   * If not provided, it sends a 401 response with a JSON payload.
   */
  unauthorized?: (req: Request, res: Response, next: NextFunction, message: string) => void
}

declare global {
  // eslint-disable-next-line ts/no-namespace
  namespace Express {
    interface Request {
      auth?: any
    }
  }
}

export function authorize(options: AuthorizeOptions = {}): RequestHandler {
  const {
    scheme = 'Bearer',
    validate,
    unauthorized = (_req, res, _next, message) => {
      res.status(401).json({ message })
    },
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return unauthorized(req, res, next, 'Missing Authorization header')
    }

    const trimmedHeader = authHeader.replace(/^\s+/, '')
    const firstSpaceIndex = trimmedHeader.search(/\s/)

    if (firstSpaceIndex === -1) {
      return unauthorized(req, res, next, 'Format is Authorization: <scheme> <token>')
    }

    const headerScheme = trimmedHeader.slice(0, firstSpaceIndex)
    const token = trimmedHeader.slice(firstSpaceIndex).trim()

    if (headerScheme.toLowerCase() !== scheme.toLowerCase()) {
      return unauthorized(req, res, next, `Expected ${scheme} scheme`)
    }

    if (!token) {
      return unauthorized(req, res, next, 'Missing token')
    }

    if (validate) {
      try {
        const result = await validate(token, req)
        if (result === false || result === null || result === undefined) {
          return unauthorized(req, res, next, 'Invalid token')
        }
        req.auth = result === true ? token : result
      }
      catch (error: any) {
        return unauthorized(req, res, next, (error && error.message) || 'Token validation failed')
      }
    }
    else {
      req.auth = token
    }

    next()
  }
}
