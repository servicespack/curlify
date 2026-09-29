import type { CurlifyOptions, CurlifyTarget } from './types'
import { Buffer } from 'node:buffer'
import { escapeBody, escapeHeaderValue } from './escape'

export function curlify(target: CurlifyTarget, options: CurlifyOptions = {}): string {
  const hasRequestObject
    = target
      && typeof target === 'object'
      && 'request' in target
      && typeof (target as any).request === 'object'
      && (target as any).request !== null

  const reqObj: any = hasRequestObject
    ? (target as any).request
    : target || {}

  const method = (reqObj.method || 'GET').toUpperCase()
  const url = reqObj.url || ''

  const rawBody = reqObj._data !== undefined
    ? reqObj._data
    : (reqObj.data !== undefined ? reqObj.data : reqObj.body)

  let hasBody = false
  let serializedBody: string | undefined

  if (rawBody !== null && rawBody !== undefined) {
    if (typeof rawBody === 'string') {
      hasBody = rawBody.length > 0
      serializedBody = rawBody
    }
    else if (Buffer.isBuffer(rawBody)) {
      hasBody = rawBody.length > 0
      serializedBody = rawBody.toString('utf-8')
    }
    else if (typeof rawBody === 'object') {
      hasBody = Object.keys(rawBody).length > 0
      serializedBody = hasBody ? JSON.stringify(rawBody) : undefined
    }
    else {
      hasBody = true
      serializedBody = String(rawBody)
    }
  }

  const rawHeaders: Record<string, any> = {
    ...(reqObj.headers || {}),
    ...(reqObj.header || {}),
  }

  const hasContentType = Object.keys(rawHeaders).some(
    key => key.toLowerCase() === 'content-type',
  )

  if (hasBody && !hasContentType && typeof rawBody === 'object' && !Buffer.isBuffer(rawBody)) {
    rawHeaders['Content-Type'] = 'application/json'
  }

  const lines: string[] = [
    url
      ? `curl -X ${escapeHeaderValue(method)} "${escapeHeaderValue(url)}"`
      : `curl -X ${escapeHeaderValue(method)}`,
  ]

  if (hasBody) {
    lines.push(`-d ${escapeBody(serializedBody as string)}`)
  }

  const redactKeys = options.redact?.map(k => k.toLowerCase()) || []

  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value === undefined || value === null) {
      continue
    }

    if (key.toLowerCase() === 'content-type' && !hasBody) {
      continue
    }

    const isRedacted = redactKeys.includes(key.toLowerCase())

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          const valToLog = isRedacted ? '[REDACTED]' : item
          lines.push(`-H "${escapeHeaderValue(key)}: ${escapeHeaderValue(valToLog)}"`)
        }
      }
    }
    else {
      const valToLog = isRedacted ? '[REDACTED]' : value
      lines.push(`-H "${escapeHeaderValue(key)}: ${escapeHeaderValue(valToLog)}"`)
    }
  }

  const isMultiline = options.multiline ?? true
  const indent = options.indent ?? '\t'
  const separator = isMultiline ? ` \\\n${indent}` : ' '

  return lines.join(separator).trim()
}
