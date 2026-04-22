import type { AgentManifest } from '@/lib/agents/types'

/**
 * Drafting Agent — docs/AGENT_OS.md §7.2.
 *
 * Produces template-instantiated first drafts for emails, letters,
 * WhatsApp, portal banners, and internal summaries. Never produces
 * `reviewState: APPROVED` — that is solely a human action.
 */
export const MANIFEST: AgentManifest = {
  id: 'drafting',
  name: 'Drafting Agent',
  version: '0.1.0',
  status: 'draft',
  owner: 'founding-engineer',
  tier: 'workflow',
  type: 'workflow',

  triggers: ['drafting.request'],
  emits: [
    'drafting.draft_ready',
    'drafting.banned_phrase_blocked',
    'hitl.requested',
  ],

  toolsAllowed: [
    'lib/ai-router:routeAI',
    'lib/events:dispatch',
    'lib/audit:logAuditEvent',
    'prisma:AgentDraft.create',
    'prisma:AuditLog.create',
  ],

  models: ['email-draft', 'social-copy', 'rfe-draft'],

  rbacScope: {
    invoker: [
      'LVJ_ADMIN', 'LVJ_TEAM', 'LVJ_MARKETING',
      'LAWYER_ADMIN', 'LAWYER_ASSOCIATE', 'LAWYER_ASSISTANT',
    ],
    actsOnBehalfOf: ['CLIENT', 'LVJ_TEAM'],
  },
  vaultAccess: false,

  prismaWrites: ['AgentDraft', 'AuditLog'],

  // Drafting itself has no internal HITL gate — gates live at the channel
  // agent (email / whatsapp / voice) before delivery, or upstream.
  humanGates: [],

  budgets: {
    maxCostUsd: 0.12,
    maxDurationMs: 30000,
    maxLlmCalls: 3,
  },

  escalationTriggers: [],

  kpis: [
    { name: 'draft_acceptance_rate', target: '> 0.80' },
    { name: 'avg_edit_distance',     target: '< 0.20' },
    { name: 'banned_phrase_incidents_per_1000', target: '< 1' },
    { name: 'upl_review_rate',       target: '< 0.10' },
  ],

  kb: {
    core: 'skills/core/SKILL.md',
    agent: 'skills/drafting/SKILL.md',
  },

  featureFlag: 'AGENT_DRAFTING_ENABLED',
}
