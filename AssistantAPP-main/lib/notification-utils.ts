import 'server-only';

/**
 * Cloud Run–safe email sender.
 * - No crash if SENDGRID_API_KEY is missing.
 * - Lazy-imports @sendgrid/mail at runtime.
 * - Returns a small result object instead of throwing.
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) {
  const key = process.env.SENDGRID_API_KEY;
  const fromEmail = from ?? process.env.SENDGRID_FROM;
  if (!key || !fromEmail) {
    console.warn('Email skipped: SENDGRID_API_KEY or SENDGRID_FROM not set.');
    return { ok: false, skipped: true, reason: 'missing-config' };
  }

  try {
    // Lazy import so builds/SSR don't need the module if unused
    const sg = (await import('@sendgrid/mail')).default as any;
    sg.setApiKey(key);

    const msg = {
      to,
      from: fromEmail,
      subject,
      html,
    };

    const res = await sg.send(msg as any);
    return { ok: true, res };
  } catch (err) {
    console.warn('SendGrid send failed (non-fatal):', (err as Error).message);
    return { ok: false, error: String(err) };
  }
}
