---
id: core.roles
owner: founding-engineer
jurisdiction: GLOBAL
service_lines: ["*"]
audience: [lawyer, staff, client]
tone: internal-ops
confidence: draft
source_type: firm_policy
reviewed_by: founding-engineer
reviewed_at: 2026-04-22
review_ttl_days: 180
supersedes: []
superseded_by: null
privileged: false
---

# Roles & RBAC matrix

Mirrors `lib/rbac.ts` and `docs/PRD.md` §2.2. Agents consult this
article to determine which disclosures are permitted per role.

## Role matrix

| Role | Surface | Scope | Key jobs |
|---|---|---|---|
| Platform Admin (LVJ ops)       | `/platform/*` | Cross-tenant | Onboard tenants + providers; commission ledger; platform health; cost guardrails |
| Platform Marketing (LVJ growth)| `/platform/marketing/*` | Marketing only | Run content/SEO/GEO agents; review marketing drafts; manage Webflow CMS |
| Tenant Admin (firm partner)    | `/admin/*` | Single tenant | Firm settings, team, billing, service-type catalogue, agent flags |
| Tenant Lawyer / Counsel        | `/cases/*` + AI Counsel | Tenant-scoped | Strategy, drafting, AI-assisted analysis, HITL approver |
| Tenant Paralegal / Intake      | `/dashboard`, `/intake/*`, `/cases/*` | Tenant + office | Intake wizard, document gathering, routine comms |
| Tenant Office Manager          | `/operations` | Single office | Caseload, capacity, office KPIs |
| Service Provider Manager       | `/provider/*` | Single provider org | Accept/decline LVJ-routed leads; manage team; commission ledger; set availability; manage public listing |
| Service Provider Operator      | `/provider/cases/*` | Assigned engagements only | Execute provider's portion of a case |
| End Client / Applicant         | `/my-case` (EN + AR) | Own case only | Progress, upload docs, pay, message |
| Public Visitor                 | `/eligibility`, `/book`, Webflow (EN + AR) | None | Self-screen, book, browse provider directory |

## Disclosure rules by role

- **Client** sees approved case status, upload requests, invoices,
  messages **from** staff, appointment times. Never sees:
  internal notes, strategy memos, privileged KB chunks
  (`privileged: true`), attorney-work-product drafts, cross-tenant
  data, or any row with a `tenantId` ≠ the client's case's tenant.
- **Paralegal / Intake** sees case data scoped to their office;
  cannot approve HITL at tier Standard and above (those go to a
  Lawyer role); can triage and collect documents.
- **Lawyer / Counsel** sees full case data for their tenant; may
  approve HITL Standard + Urgent; only a lawyer **licensed in the
  matter's destination jurisdiction** may set
  `advice_class = attorney_approved_advice`.
- **Tenant Admin** sees full tenant data + team analytics;
  never cross-tenant (D-018).
- **Service Provider Manager** sees only their own engagements +
  commission ledger slice. Never a case's internal strategy memo.
- **Platform Admin** is the only cross-tenant role. Every
  cross-tenant PII access writes
  `AuditLog action='cross_tenant_pii_access'` (D-018).

## Agent invocation vs. target

The manifest contract (docs/AGENT_OS.md §4) separates:
- `invoker:` — which roles may *trigger* the agent.
- `acts_on_behalf_of:` — whose data the agent *touches* during its
  run (different from the caller's scope).

An `LVJ_MARKETING` user may invoke the Marketing Drafting agent but
not the Intake agent even though both write to the DB — enforced by
`invoke()` via the `rbac_scope` block.

## Common role mistakes to avoid in agent outputs

- ❌ Paraphrasing "our legal team" in client email when the work
  was handled by a paralegal. Use "our case team" or name the lawyer
  directly.
- ❌ Exposing office-level data to a client ("your case is one of 40
  in our Lisbon office" — tenant/office metrics are internal).
- ❌ Sending an `attorney_approved_advice` without attribution to a
  named, jurisdiction-licensed lawyer.
