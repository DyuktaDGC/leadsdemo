const values = import.meta.env as unknown as Record<string, string | undefined>

const read = (name: string, fallback: string) => values[name]?.trim() || fallback

export const env = {
  appName: read('VITE_APP_NAME', 'DGC Lead Tracker'),
  timeZone: read('VITE_APP_TIME_ZONE', 'Asia/Kolkata')
}
