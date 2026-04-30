export interface Env {
  ASSETS:       Fetcher
  DATABASE_URL: string
  JWT_SECRET:   string
  SETUP_TOKEN?: string
}

export type UserRole = 'ADMIN' | 'USER'

export interface HonoBindings {
  DATABASE_URL: string
  JWT_SECRET:   string
  SETUP_TOKEN?: string
  ASSETS:       Fetcher
}

export interface HonoVariables {
  userId:   string
  userRole: UserRole
  username: string
}
