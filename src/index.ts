import type { Response } from 'supertest'

export function curlify(response: Response): string {
  const {
    request: {
      method,
      url,
    },
  } = response

  const lines = [
    `curl -X ${method.toUpperCase()} ${url}`,
  ]

  return lines
    .join('\\\n\t')
    .trim();
}

export default curlify
