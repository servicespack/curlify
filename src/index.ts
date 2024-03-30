export function curlify(request: Request): string {
  const {
    method,
    url,
    headers
  } = request

  

  const lines = [
    `curl -X ${method.toUpperCase()} ${url}`,
    ...headers.entries()
  ]

  return lines
    .join('\\\n')
    .trim();
}

export default curlify
