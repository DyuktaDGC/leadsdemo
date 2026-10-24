export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    session: ['auth', 'session'] as const,
    users: ['auth', 'users'] as const
  },

  leads: {
    all: ['leads'] as const,
    list: (query: Record<string, unknown>) => ['leads', 'list', query] as const,
    performance: ['leads', 'performance'] as const
  },

  projects: {
    all: ['projects'] as const,
    list: () => ['projects', 'list'] as const
  },

  campaigns: {
    list: () => ['campaigns', 'list'] as const
  },

  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const
  }
}
