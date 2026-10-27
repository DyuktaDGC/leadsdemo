import { DEMO_OWNER_EMAIL, DEMO_PASSWORD } from '@shared/lib/supabase'

const values = import.meta.env as unknown as Record<string, string | undefined>

const read = (name: string, fallback: string) => values[name]?.trim() || fallback

export const env = {
  appName: read('VITE_APP_NAME', 'DGC'),
  timeZone: read('VITE_APP_TIME_ZONE', 'Asia/Kolkata'),
  demoAccounts: [
    { role: 'owner', email: DEMO_OWNER_EMAIL, name: 'Anita Desai', password: DEMO_PASSWORD },
    { role: 'employee', email: 'sneha@dgcdemo.in', name: 'Sneha Iyer', password: DEMO_PASSWORD }
  ]
}
