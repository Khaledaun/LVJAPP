import 'server-only'

/**
 * Safe, lazy accessors for Firebase Admin/GCS.
 * Activates only if ENABLE_GCS=1 and GCS_BUCKET is set.
 * Uses Application Default Credentials in Cloud Shell if specific keys are not provided.
 */

type UploadUrlResult = { ok: true; url: string; objectName: string } | { ok: false; reason: string }

export function isStorageEnabled() {
  return process.env.ENABLE_GCS === '1' && !!process.env.GCS_BUCKET
}

let initOnce: Promise<any> | null = null
async function getAdmin() {
  const admin = await import('firebase-admin')
  if (!initOnce) {
    initOnce = (async () => {
      if (admin.apps.length) return admin.apps[0]
      try {
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
          const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey,
            }),
            storageBucket: process.env.GCS_BUCKET,
          })
        } else {
          // ADC (works in Cloud Shell if project is set)
          admin.initializeApp({ storageBucket: process.env.GCS_BUCKET })
        }
      } catch (err) {
        console.error('[GCS] init failed:', err)
        throw err
      }
      return admin.apps[0]
    })()
  }
  return initOnce
}

export async function getSignedUploadUrlForCase(caseId: string, filename: string, contentType: string): Promise<UploadUrlResult> {
  if (!isStorageEnabled()) return { ok: false, reason: 'disabled' }
  const admin = await getAdmin()
  const { randomUUID } = await import('crypto')
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120)
  const objectName = `${caseId}/${Date.now()}-${randomUUID()}-${safeName}`

  try {
    const storage = (await import('firebase-admin')).storage()
    const bucket = storage.bucket(process.env.GCS_BUCKET!)
    const file = bucket.file(objectName)
    const expires = Date.now() + 15 * 60 * 1000 // 15 minutes

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires,
      contentType,
    })
    return { ok: true, url, objectName }
  } catch (err: any) {
    console.error('[GCS] signed URL error:', err?.message || err)
    return { ok: false, reason: 'sign-error' }
  }
}

export function publicUrlForObject(objectName: string) {
  // This is the unauthenticated public URL if the object/bucket is public.
  // If not public, we still store it as a reference.
  return `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${objectName}`
}
