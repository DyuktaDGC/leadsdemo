const EMAIL_PATTERN = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}$/

const RESERVED_TLDS = new Set(['test', 'example', 'invalid', 'localhost', 'local'])

export function validateEmail(raw: string): string | undefined {
  const email = raw.trim().toLowerCase()

  if (!email) return 'Enter your email address.'
  if (email.length > 254) return 'That email address is too long.'
  if (email.includes('..')) return 'That email address is not valid.'
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.'

  const [local, domain] = email.split('@') as [string, string]
  if (local.length > 64) return 'That email address is not valid.'

  const tld = domain.slice(domain.lastIndexOf('.') + 1)
  if (RESERVED_TLDS.has(tld)) return `".${tld}" is not a real domain ending.`

  return undefined
}
