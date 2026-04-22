import type { AgentManifest } from '@/lib/agents/types'

/**
 * Email channel agent — docs/AGENT_OS.md §7.4 row 11.
 * Owns delivery; consumes drafts produced by the Drafting agent.
 * No LLM inside — this is a deterministic channel adapter.
 */
export const MANIFEST: AgentManifest = {
  id: 'email',
  name: 'Email Channel Agent',
  version: '0.1.0',
  status: 'draft',
  owner: 'founding-engineer',
  tier: 'channel',
  type: 'conversational',

  triggers: ['notification.dispatch'],
  emits: ['hitl.requested'],

  toolsAllowed: [
    'lib/events:dispatch',
    'lib/audit:logAuditEvent',
    'prisma:NotificationLog.create',
    'prisma:AgentDraft.update',
    'prisma:AuditLog.create',
  ],

  models: [],   // channel agents run deterministic adapters

  rbacScope: {
    invoker: ['LVJ_ADMIN', 'LVJ_TEAM', 'LAWYER_ADMIN', 'LAWYER_ASSOCIATE'],
    actsOnBehalfOf: ['CLIENT', 'LVJ_TEAM'],
  },
  vaultAccess: false,

  prismaWrites: ['NotificationLog', 'AgentDraft', 'AuditLog'],

  humanGates: [
    {
      id: 'send_to_client_high_risk',
      approverRole: 'LAWYER_ADMIN',
      slaHours: 4,
      rule: 'payload.highRisk === true',
    },
  ],

  budgets: {
    maxCostUsd: 0.01,       // channel adapters have negligible variable cost
    maxDurationMs: 10000,
    maxLlmCalls: 0,
  },

  escalationTriggers: [],

  kpis: [
    { name: 'email_delivery_rate', target: '> 0.98' },
    { name: 'email_bounce_rate',   target: '< 0.02' },
  ],

  kb: {
    core: 'skills/core/SKILL.md',
    agent: 'skills/email/SKILL.md',
  },

  featureFlag: 'AGENT_EMAIL_ENABLED',
}
