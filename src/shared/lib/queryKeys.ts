export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    session: ['auth', 'session'] as const,
    email: ['auth', 'email'] as const
  },

  leads: {
    all: ['leads'] as const,
    list: (query: Record<string, unknown>) => ['leads', 'list', query] as const,
    performance: ['leads', 'performance'] as const,
    calls: ['leads', 'calls'] as const
  },

  projects: {
    all: ['projects'] as const,
    list: () => ['projects', 'list'] as const
  },

  campaigns: {
    list: () => ['campaigns', 'list'] as const,
    sources: () => ['campaigns', 'sources'] as const
  },

  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const
  }
}
