const KEY = 'leaddgc.session'
const LEADS = 'leaddgc.leads.'

function readJson<T>(key: string): T | undefined {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? undefined
  } catch {
    return undefined
  }
}

export const readCachedSession = <T>() => readJson<T>(KEY)

export function writeCachedSession(session: unknown) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else {
      localStorage.removeItem(KEY)
      Object.keys(localStorage)
        .filter((key) => key.startsWith(LEADS))
        .forEach((key) => localStorage.removeItem(key))
    }
  } catch {}
}

const leadsKey = (query: unknown) =>
  `${LEADS}${readCachedSession<{ userId: string }>()?.userId ?? ''}.${JSON.stringify(query)}`

export const readCachedLeads = <T>(query: unknown) => readJson<T>(leadsKey(query))

export function writeCachedLeads(query: unknown, data: unknown) {
  try {
    localStorage.setItem(leadsKey(query), JSON.stringify(data))
  } catch {}
}
