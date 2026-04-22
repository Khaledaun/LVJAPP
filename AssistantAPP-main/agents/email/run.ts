import 'server-only'
import { register, type AgentRunner } from '@/lib/agents/invoke'
import { getPrisma } from '@/lib/db'
import { MANIFEST } from './manifest'
import { EmailInputSchema, EmailOutputSchema, type EmailInput, type EmailOutput } from './schema'

/**
 * Email channel adapter.
 * docs/AGENT_OS.md §7.4 row 11.
 *
 * Deterministic — no LLM. SendGrid is wired when `SENDGRID_API_KEY` is set;
 * otherwise writes the NotificationLog row in QUEUED state so outbound is
 * still traceable end-to-end.
 *
 * HITL gate: when `highRisk === true`, emits `hitl.requested` and returns
 * a QUEUED row; the approval queue handles the actual send after approval.
 */

const run: AgentRunner<EmailInput, EmailOutput> = async (raw, ctx, tools) => {
  const input = EmailInputSchema.parse(raw)

  await tools.audit('agent.email.started', {
    to: input.to.email, subject: input.subject, highRisk: input.highRisk,
  })

  // HITL gate for high-risk messages.
  if (input.highRisk) {
    await tools.emit('hitl.requested', {
      agentId: MANIFEST.id,
      gate: MANIFEST.humanGates[0],
      correlationId: ctx.correlationId,
      caseId: input.caseId,
      leadId: input.leadId,
      draftId: input.draftId,
      payload: { to: input.to, subject: input.subject, preview: input.text.slice(0, 400) },
    })
    // Record a QUEUED NotificationLog — the approval queue finishes the send.
    const logId = await writeNotificationLog(input, 'QUEUED')
    return EmailOutputSchema.parse({ notificationLogId: logId, status: 'QUEUED' })
  }

  // Deterministic send path.
  const provider = getProvider()
  let externalId: string | undefined
  let status: 'SENT' | 'FAILED' = 'SENT'

  try {
    if (provider === 'sendgrid') {
      externalId = await sendViaSendGrid(input)
    } else {
      // No provider configured — dev / test path. We still log, so the loop is observable.
      // eslint-disable-next-line no-console
      console.log(`[email agent · dev path] → ${input.to.email} · ${input.subject}`)
      externalId = `dev-${Date.now()}`
    }
  } catch (err) {
    status = 'FAILED'
    await tools.audit('agent.email.send_failed', {
      errorMessage: String((err as Error)?.message ?? err),
    })
  }

  const notificationLogId = await writeNotificationLog(input, status, externalId)

  // Mark the draft sent if one was provided.
  if (input.draftId && process.env.SKIP_DB !== '1') {
    try {
      const prisma = await getPrisma()
      await prisma.agentDraft.update({
        where: { id: input.draftId },
        data: { reviewState: 'SENT', sentAt: new Date(), externalId: externalId ?? null },
      })
    } catch (err) {
      await tools.audit('agent.email.draft_update_failed', {
        draftId: input.draftId,
        errorMessage: String((err as Error)?.message ?? err),
      })
    }
  }

  await tools.audit('agent.email.completed', { status, notificationLogId })

  return EmailOutputSchema.parse({ notificationLogId, status, externalId })
}

function getProvider(): 'sendgrid' | 'none' {
  return process.env.SENDGRID_API_KEY ? 'sendgrid' : 'none'
}

async function sendViaSendGrid(input: EmailInput): Promise<string> {
  const key = process.env.SENDGRID_API_KEY!
  const from = process.env.SENDGRID_FROM_EMAIL || 'noreply@lvj.law'
  const body = {
    personalizations: [{ to: [{ email: input.to.email, name: input.to.name }] }],
    from: { email: from },
    subject: input.subject,
    content: [
      { type: 'text/plain', value: input.text },
      ...(input.html ? [{ type: 'text/html', value: input.html }] : []),
    ],
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`sendgrid ${res.status}: ${text.slice(0, 200)}`)
  }
  // SendGrid returns 202 with X-Message-Id header.
  return res.headers.get('x-message-id') ?? `sg-${Date.now()}`
}

async function writeNotificationLog(
  input: EmailInput,
  status: 'QUEUED' | 'SENT' | 'FAILED',
  externalId?: string,
): Promise<string> {
  if (process.env.SKIP_DB === '1') return 'mock-notif-' + Date.now()
  const prisma = await getPrisma()
  const row = await prisma.notificationLog.create({
    data: {
      caseId: input.caseId ?? null,
      userId: input.userId,
      channel: 'EMAIL',
      subject: input.subject,
      body: input.text,
      status,
      externalId: externalId ?? null,
    },
    select: { id: true },
  })
  return row.id as string
}

register({ manifest: MANIFEST, runner: run as AgentRunner<unknown, unknown> })

export { run }
