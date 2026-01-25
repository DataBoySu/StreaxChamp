/** Backfill: set name field = title when missing */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

function init() {
  if (getApps().length) return;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY_PATH');
  const p = path.resolve(keyPath);
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  initializeApp({ credential: cert(json as any), projectId: process.env.FIREBASE_PROJECT_ID || json.project_id });
}

async function run() {
  init();
  const db = getFirestore();
  const snap = await db.collection('topics').get();
  let updated = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.title && (d.name === undefined || d.name === null)) {
      await doc.ref.update({ name: d.title });
      updated++;
      console.log('Updated', doc.id);
    }
  }
  console.log('Done. Updated', updated, 'docs');
}

run().catch(e => { console.error(e); process.exit(1); });
