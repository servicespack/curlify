import type { Response } from 'supertest'

export function curlify(response: Response): string {
  const {
    request: {
      method,
      url,
      // @ts-ignore
      _data: body,
    },
  } = response

  const lines = [
    `curl -X ${method.toUpperCase()} ${url}`,
  ]

  if (body && Object.keys(body).length > 0) {
    lines.push(`-d '${JSON.stringify(body)}'`)
    lines.push('-H "Content-Type: application/json"')
  }

  return lines
    .join(' \\\n\t')
    .trim();
}

export function curlifyMiddleware(req: any) {
  req.on('response', (res: any) => {
    console.log(curlify(res))
  })
}

export default curlify
