import 'server-only'

/**
 * Central registration — import this module once from server entry points
 * (API routes, cron handlers) to ensure every Phase-1 agent is registered
 * with the invoke runtime before its manifest is looked up.
 *
 * Each agent's run.ts self-registers on import, so the side-effect imports
 * below are sufficient. Do not add business logic to this module.
 */

import '@/agents/intake/run'
import '@/agents/drafting/run'
import '@/agents/email/run'
