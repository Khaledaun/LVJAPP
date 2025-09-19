import * as admin from 'firebase-admin'
import type { JourneySummary, JourneyStage } from './types'

let _app: admin.app.App | null = null

function getAdmin() {
  if (_app) return _app
  if (!admin.apps.length) {
    _app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      } as any),
      projectId: process.env.FIREBASE_PROJECT_ID,
    })
  } else {
    _app = admin.app()
  }
  return _app!
}

export function db() { return getAdmin().firestore() }

export async function getJourney(caseId: string): Promise<JourneySummary> {
  const snap = await db().collection('journey_stages').where('case_id','==', caseId).orderBy('order','asc').get()
  const stages = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as JourneyStage[]
  const byId: Record<string, JourneyStage> = {}
  stages.forEach(s => { byId[s.id] = s })
  for (const s of stages) {
    const deps = s.depends_on || []
    const hasBlocking = deps.some((id: string) => byId[id] && byId[id].status !== 'completed')
    if (hasBlocking && s.status !== 'completed') s.status = 'blocked'
  }
  const total = stages.length || 1
  const completed = stages.filter(s => s.status === 'completed').length
  const completionPercentage = Math.round((completed / total) * 100)
  return { stages, completionPercentage }
}
