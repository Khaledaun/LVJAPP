import 'server-only'

/**
 * Event bus — multi-channel dispatcher using Promise.allSettled.
 *
 * Golden Rule #5 (CLAUDE.md): never Promise.all() for multi-channel dispatch.
 * A failure in one channel (e.g. WhatsApp down) must never block the others
 * (e.g. email still goes out).
 *
 * Architecture Decision #2 (CLAUDE.md): events.ts dispatches to all channels.
 */

export type EventName =
  | 'case.created'
  | 'case.status_changed'
  | 'case.document_uploaded'
  | 'case.document_approved'
  | 'case.document_rejected'
  | 'case.payment_received'
  | 'case.deadline_approaching'
  | 'intake.submitted'
  | 'lead.captured'
  | 'notification.dispatch'
  | 'voice.call_completed'
  | 'whatsapp.inbound'
  | 'whatsapp.outbound'

export interface BaseEvent<P = unknown> {
  name: EventName
  payload: P
  caseId?: string
  userId?: string
  occurredAt: Date
}

export type EventHandler<P = any> = (event: BaseEvent<P>) => Promise<void> | void

export interface HandlerResult {
  handler: string
  status: 'ok' | 'error'
  error?: string
  durationMs: number
}

const handlers: Map<EventName, Array<{ id: string; fn: EventHandler }>> = new Map()

/** Register a handler for an event. Handlers run in parallel via Promise.allSettled. */
export function on<P = any>(name: EventName, id: string, fn: EventHandler<P>): void {
  const list = handlers.get(name) ?? []
  list.push({ id, fn: fn as EventHandler })
  handlers.set(name, list)
}

/** Remove a registered handler (useful in tests). */
export function off(name: EventName, id: string): void {
  const list = handlers.get(name)
  if (!list) return
  handlers.set(name, list.filter(h => h.id !== id))
}

/** Clear all handlers (tests only). */
export function clearAllHandlers(): void {
  handlers.clear()
}

/** Internal: build a fully-formed event object. */
function buildEvent<P>(name: EventName, payload: P, ctx?: { caseId?: string; userId?: string }): BaseEvent<P> {
  return {
    name,
    payload,
    caseId: ctx?.caseId,
    userId: ctx?.userId,
    occurredAt: new Date(),
  }
}

/**
 * Dispatch an event to every registered handler in parallel via Promise.allSettled.
 * Always resolves — never throws. Caller inspects returned HandlerResult[] for errors.
 */
export async function dispatch<P>(
  name: EventName,
  payload: P,
  ctx?: { caseId?: string; userId?: string },
): Promise<HandlerResult[]> {
  const event = buildEvent(name, payload, ctx)
  const list = handlers.get(name) ?? []
  if (list.length === 0) return []

  const runs = list.map(async ({ id, fn }): Promise<HandlerResult> => {
    const started = Date.now()
    try {
      await fn(event)
      return { handler: id, status: 'ok', durationMs: Date.now() - started }
    } catch (err: any) {
      return {
        handler: id,
        status: 'error',
        error: err?.message ?? String(err),
        durationMs: Date.now() - started,
      }
    }
  })

  const settled = await Promise.allSettled(runs)
  return settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : { handler: list[i].id, status: 'error', error: String(s.reason), durationMs: 0 },
  )
}

/** Inspect currently-registered handler ids for an event (tests + diagnostics). */
export function listHandlers(name: EventName): string[] {
  return (handlers.get(name) ?? []).map(h => h.id)
}
