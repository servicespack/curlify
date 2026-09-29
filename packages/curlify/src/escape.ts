export function escapeBody(bodyStr: string): string {
  return `'${bodyStr.replace(/'/g, "'\\''")}'`
}

export function escapeHeaderValue(value: string | number | boolean): string {
  return String(value).replace(/["`$\\]/g, '\\$&')
}
