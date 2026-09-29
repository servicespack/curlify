import { Buffer } from 'node:buffer'
import EventEmitter from 'node:events'
import nock from 'nock'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import defaultCurlify, {
  createCurlifyMiddleware,
  curlify,
  curlifyMiddleware,
  escapeBody,
  escapeHeaderValue,
} from './index'

describe('curlify', () => {
  it('should export curlify as default', () => {
    expect(defaultCurlify).toBe(curlify)
  })

  it('should parse the request', async () => {
    nock('http://api.something.com')
      .post('/')
      .reply(201)

    const response = await request('http://api.something.com')
      .post('/')
      .send({})
      .expect(201)

    const returned = curlify(response)

    expect(returned).toBe('curl -X POST "http://api.something.com/"')
  })

  it('should parse the request with body', async () => {
    nock('http://api.something.com')
      .post('/')
      .reply(201, { ok: true })

    const response = await request('http://api.something.com')
      .post('/')
      .send({ foo: 'bar' })
      .expect(201)

    const returned = curlify(response)

    expect(returned).toBe('curl -X POST "http://api.something.com/" \\\n\t-d \'{"foo":"bar"}\' \\\n\t-H "Content-Type: application/json"')
  })

  it('should parse request with custom headers', async () => {
    nock('http://api.something.com')
      .get('/users')
      .reply(200, [])

    const response = await request('http://api.something.com')
      .get('/users')
      .set('Authorization', 'Bearer my-token-123')
      .set('X-Api-Key', 'secret-key')
      .expect(200)

    const returned = curlify(response)

    expect(returned).toBe(
      'curl -X GET "http://api.something.com/users" \\\n\t-H "Authorization: Bearer my-token-123" \\\n\t-H "X-Api-Key: secret-key"',
    )
  })

  it('should safely escape single quotes in body', async () => {
    nock('http://api.something.com')
      .post('/authors')
      .reply(201, { ok: true })

    const response = await request('http://api.something.com')
      .post('/authors')
      .send({ name: 'Flannery O\'Connor' })
      .expect(201)

    const returned = curlify(response)

    expect(returned).toBe(
      'curl -X POST "http://api.something.com/authors" \\\n\t-d \'{"name":"Flannery O\'\\\'\'Connor"}\' \\\n\t-H "Content-Type: application/json"',
    )
  })

  it('should escape special characters in headers', async () => {
    nock('http://api.something.com')
      .get('/secure')
      .reply(200)

    const response = await request('http://api.something.com')
      .get('/secure')
      .set('X-Special', 'Value with $dollar and "quotes"')
      .expect(200)

    const returned = curlify(response)

    expect(returned).toBe(
      'curl -X GET "http://api.something.com/secure" \\\n\t-H "X-Special: Value with \\$dollar and \\"quotes\\""',
    )
  })

  it('should support query strings in URL', async () => {
    nock('http://api.something.com')
      .get('/search')
      .query({ q: 'typescript', page: '1' })
      .reply(200, [])

    const response = await request('http://api.something.com')
      .get('/search')
      .query({ q: 'typescript', page: '1' })
      .expect(200)

    const returned = curlify(response)

    expect(returned).toBe('curl -X GET "http://api.something.com/search?q=typescript&page=1"')
  })

  it('should format as single line when multiline is false', async () => {
    nock('http://api.something.com')
      .post('/items')
      .reply(200)

    const response = await request('http://api.something.com')
      .post('/items')
      .send({ item: 'box' })
      .expect(200)

    const returned = curlify(response, { multiline: false })

    expect(returned).toBe(
      'curl -X POST "http://api.something.com/items" -d \'{"item":"box"}\' -H "Content-Type: application/json"',
    )
  })

  it('should use custom indentation when provided', async () => {
    nock('http://api.something.com')
      .post('/items')
      .reply(200)

    const response = await request('http://api.something.com')
      .post('/items')
      .send({ item: 'box' })
      .expect(200)

    const returned = curlify(response, { indent: '  ' })

    expect(returned).toBe(
      'curl -X POST "http://api.something.com/items" \\\n  -d \'{"item":"box"}\' \\\n  -H "Content-Type: application/json"',
    )
  })

  it('should accept plain request objects (framework-agnostic)', () => {
    const curl = curlify({
      method: 'PUT',
      url: 'https://api.example.com/data/42',
      headers: {
        Authorization: 'Bearer token',
      },
      body: { active: true },
    })

    expect(curl).toBe(
      'curl -X PUT "https://api.example.com/data/42" \\\n\t-d \'{"active":true}\' \\\n\t-H "Authorization: Bearer token" \\\n\t-H "Content-Type: application/json"',
    )
  })

  it('should accept raw string body', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/webhook',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'plain raw payload',
    })

    expect(curl).toBe(
      'curl -X POST "https://api.example.com/webhook" \\\n\t-d \'plain raw payload\' \\\n\t-H "Content-Type: text/plain"',
    )
  })

  it('should accept Buffer body', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/raw',
      body: Buffer.from('hello buffer'),
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/raw" \\\n\t-d \'hello buffer\'')
  })

  it('should handle array header values', () => {
    const curl = curlify({
      method: 'GET',
      url: 'https://api.example.com/items',
      headers: {
        'Accept': ['application/json', 'text/plain'],
        'X-Nullable': null as any,
        'X-Undefined': undefined,
      },
    })

    expect(curl).toBe(
      'curl -X GET "https://api.example.com/items" \\\n\t-H "Accept: application/json" \\\n\t-H "Accept: text/plain"',
    )
  })

  it('should handle numeric and boolean body', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/count',
      body: 42,
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/count" \\\n\t-d \'42\'')
  })

  it('should handle falsy target or missing properties with default values', () => {
    expect(curlify(undefined as any)).toBe('curl -X GET')
    expect(curlify(null as any)).toBe('curl -X GET')
    expect(curlify('string_target' as any)).toBe('curl -X GET')
    expect(curlify({ request: null } as any)).toBe('curl -X GET')
    expect(curlify({})).toBe('curl -X GET')
    expect(curlify({ method: 'DELETE' })).toBe('curl -X DELETE')
    expect(curlify({ url: 'http://api.something.com' })).toBe('curl -X GET "http://api.something.com"')
  })

  it('should accept data property when _data is undefined', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/data',
      data: { message: 'payload via data' },
    })

    expect(curl).toBe(
      'curl -X POST "https://api.example.com/data" \\\n\t-d \'{"message":"payload via data"}\' \\\n\t-H "Content-Type: application/json"',
    )
  })

  it('should handle empty string body', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/data',
      body: '',
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/data"')
  })

  it('should handle empty buffer body', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/data',
      body: Buffer.from(''),
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/data"')
  })

  it('should handle empty object body', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/data',
      body: {},
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/data"')
  })

  it('should handle completely undefined request body variable', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/data',
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/data"')
  })

  it('should serialize empty array as body', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/data',
      body: [],
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/data"')
  })

  it('should not serialize body if null', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/data',
      body: null,
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/data"')
  })

  it('should serialize object with inherited properties correctly', () => {
    const body = Object.create({ inherited: true })
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/data',
      body,
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/data"')
  })

  it('should not add Content-Type for request without body', () => {
    const curl = curlify({
      method: 'GET',
      url: 'https://api.example.com/data',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    expect(curl).toBe('curl -X GET "https://api.example.com/data"')
  })

  it('should keep Content-Type in uppercase if not JSON', () => {
    const curl = curlify({
      method: 'POST',
      url: 'https://api.example.com/data',
      body: { a: 1 },
      headers: {
        'CONTENT-TYPE': 'text/plain',
      },
    })

    expect(curl).toBe('curl -X POST "https://api.example.com/data" \\\n\t-d \'{"a":1}\' \\\n\t-H "CONTENT-TYPE: text/plain"')
  })

  it('should skip undefined and null items within array headers', () => {
    const curl = curlify({
      method: 'GET',
      url: 'https://api.example.com/items',
      headers: {
        Accept: ['application/json', undefined as any, null as any, 'text/plain'],
      },
    })

    expect(curl).toBe(
      'curl -X GET "https://api.example.com/items" \\\n\t-H "Accept: application/json" \\\n\t-H "Accept: text/plain"',
    )
  })
})

describe('curlifyMiddleware', () => {
  it('should log curl command using console.log by default', async () => {
    nock('http://api.something.com')
      .get('/middleware-test')
      .reply(200)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await request('http://api.something.com')
      .get('/middleware-test')
      .use(curlifyMiddleware)

    expect(consoleSpy).toHaveBeenCalledWith('curl -X GET "http://api.something.com/middleware-test"')

    consoleSpy.mockRestore()
  })

  it('should log with custom logger function', async () => {
    nock('http://api.something.com')
      .post('/custom-logger')
      .reply(200)

    const customLogger = vi.fn()

    await request('http://api.something.com')
      .post('/custom-logger')
      .send({ test: true })
      .use(curlifyMiddleware({ logger: customLogger, options: { multiline: false } }))

    expect(customLogger).toHaveBeenCalledWith(
      'curl -X POST "http://api.something.com/custom-logger" -d \'{"test":true}\' -H "Content-Type: application/json"',
    )
  })

  it('should work with createCurlifyMiddleware factory directly', async () => {
    nock('http://api.something.com')
      .get('/factory-test')
      .reply(200)

    const customLogger = vi.fn()

    await request('http://api.something.com')
      .get('/factory-test')
      .use(createCurlifyMiddleware({ logger: customLogger }))

    expect(customLogger).toHaveBeenCalledWith('curl -X GET "http://api.something.com/factory-test"')
  })

  it('should log curl command on request error when logOnError is true', async () => {
    const customLogger = vi.fn()

    await request('http://localhost:59999')
      .get('/error-test')
      .use(createCurlifyMiddleware({ logger: customLogger, logOnError: true }))
      .catch(() => {})

    expect(customLogger).toHaveBeenCalledWith('curl -X GET "http://localhost:59999/error-test"')
  })

  it('should return a middleware function when curlifyMiddleware is called without arguments', () => {
    const middleware = curlifyMiddleware()
    expect(typeof middleware).toBe('function')
  })

  it('should return a middleware function when called with options object', () => {
    const middleware = curlifyMiddleware({ logOnError: false })
    expect(typeof middleware).toBe('function')
  })

  it('should not attach error listener when logOnError is false', () => {
    const req = new EventEmitter()
    const middleware = createCurlifyMiddleware({ logOnError: false })

    middleware(req as any)

    expect(req.listenerCount('error')).toBe(0)
  })

  it('should log response only once if response event fires multiple times', () => {
    const logger = vi.fn()
    const req = new EventEmitter()
    const middleware = createCurlifyMiddleware({ logger })

    middleware(req as any)

    const response = { request: { method: 'GET', url: 'http://api.example.com' } }
    req.emit('response', response)
    req.emit('response', response)

    expect(logger).toHaveBeenCalledTimes(1)
  })

  it('should not log error if response was already logged', () => {
    const logger = vi.fn()
    const req = new EventEmitter()
    const middleware = createCurlifyMiddleware({ logger })

    middleware(req as any)

    const response = { request: { method: 'GET', url: 'http://api.example.com' } }
    req.emit('response', response)
    req.emit('error', new Error('test-error'))

    expect(logger).toHaveBeenCalledTimes(1)
  })

  it('should log error only once if error event fires multiple times', () => {
    const logger = vi.fn()
    const req = Object.assign(new EventEmitter(), {
      method: 'GET',
      url: 'http://api.example.com/error',
    })
    const middleware = createCurlifyMiddleware({ logger })

    middleware(req as any)

    req.emit('error', new Error('err1'))
    req.emit('error', new Error('err2'))

    expect(logger).toHaveBeenCalledTimes(1)
  })

  it('should redact Authorization and Cookie headers by default', async () => {
    nock('http://api.something.com')
      .get('/redact-test')
      .reply(200)

    const logger = vi.fn()

    await request('http://api.something.com')
      .get('/redact-test')
      .set('Authorization', 'Bearer token')
      .set('Cookie', 'session=123')
      .set('X-Api-Key', 'my-api-key')
      .use(createCurlifyMiddleware({ logger }))

    expect(logger).toHaveBeenCalledWith(
      'curl -X GET "http://api.something.com/redact-test" \\\n\t-H "Authorization: [REDACTED]" \\\n\t-H "Cookie: [REDACTED]" \\\n\t-H "X-Api-Key: my-api-key"',
    )
  })

  it('should opt into sensitive headers when allowSensitiveHeaders is true', async () => {
    nock('http://api.something.com')
      .get('/sensitive-test')
      .reply(200)

    const logger = vi.fn()

    await request('http://api.something.com')
      .get('/sensitive-test')
      .set('Authorization', 'Bearer token')
      .set('Cookie', 'session=123')
      .use(createCurlifyMiddleware({ logger, allowSensitiveHeaders: true }))

    expect(logger).toHaveBeenCalledWith(
      'curl -X GET "http://api.something.com/sensitive-test" \\\n\t-H "Authorization: Bearer token" \\\n\t-H "Cookie: session=123"',
    )
  })

  it('should preserve caller-configured redactions alongside defaults', async () => {
    nock('http://api.something.com')
      .get('/preserve-redact')
      .reply(200)

    const logger = vi.fn()

    await request('http://api.something.com')
      .get('/preserve-redact')
      .set('Authorization', 'Bearer token')
      .set('X-Custom', 'my-custom-value')
      .use(createCurlifyMiddleware({ logger, options: { redact: ['X-Custom'] } }))

    expect(logger).toHaveBeenCalledWith(
      'curl -X GET "http://api.something.com/preserve-redact" \\\n\t-H "Authorization: [REDACTED]" \\\n\t-H "X-Custom: [REDACTED]"',
    )
  })

  it('should not redact headers in direct curlify calls unless specified in options', () => {
    const req = {
      method: 'GET',
      url: 'https://api.example.com/direct',
      headers: {
        Authorization: 'Bearer direct-token',
      },
    }

    expect(curlify(req)).toBe(
      'curl -X GET "https://api.example.com/direct" \\\n\t-H "Authorization: Bearer direct-token"',
    )

    expect(curlify(req, { redact: ['Authorization'] })).toBe(
      'curl -X GET "https://api.example.com/direct" \\\n\t-H "Authorization: [REDACTED]"',
    )
  })
})

describe('escape utilities', () => {
  it('should escape body single quotes correctly', () => {
    expect(escapeBody('it\'s a test')).toBe('\'it\'\\\'\'s a test\'')
  })

  it('should escape header values with special characters', () => {
    expect(escapeHeaderValue('hello "$world" `cmd` \\slash')).toBe(
      'hello \\"\\$world\\" \\`cmd\\` \\\\slash',
    )
    expect(escapeHeaderValue(123)).toBe('123')
    expect(escapeHeaderValue(true)).toBe('true')
  })
})
