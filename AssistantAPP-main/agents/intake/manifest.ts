import type { AgentManifest } from '@/lib/agents/types'

/**
 * Intake Agent — docs/AGENT_OS.md §7.1.
 *
 * Only change this file in a PR. Version bump is required when any of:
 *   - tools_allowed / prisma_writes / models changes
 *   - human_gates changes
 *   - input / output schema changes
 *   - prompt version changes
 */
export const MANIFEST: AgentManifest = {
  id: 'intake',
  name: 'Matter Intake Agent',
  version: '0.1.0',
  status: 'draft',
  owner: 'founding-engineer',
  tier: 'workflow',
  type: 'workflow',

  triggers: ['lead.captured', 'intake.submitted'],
  emits: [
    'intake.draft_ready',
    'hitl.requested',
    'notification.dispatch',
    'escalation.raised',
    'intake.duplicate_detected',
  ],

  toolsAllowed: [
    'lib/ai-router:routeAI',
    'lib/events:dispatch',
    'lib/audit:logAuditEvent',
    'prisma:EligibilityLead.update',
    'prisma:AuditLog.create',
  ],

  models: ['eligibility-score', 'form-prefill'],

  rbacScope: {
    invoker: ['LVJ_ADMIN', 'LVJ_TEAM', 'LAWYER_ADMIN', 'LAWYER_ASSOCIATE'],
    actsOnBehalfOf: ['CLIENT', 'LVJ_TEAM'],
  },
  vaultAccess: false,

  prismaWrites: ['EligibilityLead', 'AuditLog'],

  humanGates: [
    {
      id: 'before_case_creation',
      approverRole: 'LAWYER_ADMIN',
      slaHours: 4,
      rule: 'eligibilityScore < 0.6 OR riskFlags.length > 0',
    },
  ],

  budgets: {
    maxCostUsd: 0.25,
    maxDurationMs: 45000,
    maxLlmCalls: 6,
  },

  escalationTriggers: [
    'escalation.criminal_history',
    'escalation.prior_refusal',
    'escalation.urgent_deadline',
    'escalation.inconsistent_identity',
    'escalation.distressed_client',
  ],

  kpis: [
    { name: 'lead_to_case_conversion_rate', target: '> 0.35' },
    { name: 'intake_completeness_pct',      target: '> 0.90' },
    { name: 'time_to_first_human_touch_minutes', target: '< 60' },
    { name: 'hallucination_rate_per_100_runs',   target: '< 0.5' },
  ],

  kb: {
    core: 'skills/core/SKILL.md',
    agent: 'skills/intake/SKILL.md',
  },

  featureFlag: 'AGENT_INTAKE_ENABLED',
}
