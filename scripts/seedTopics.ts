/**
 * Seed initial gaming topics into Firestore using the new schema.
 * Run with: npx ts-node scripts/seedTopics.ts (after installing ts-node) or compile then node.
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON with Firestore access.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import path from 'node:path';
import fs from 'node:fs';

function ensureAdminInit() {
  if (getApps().length) return;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    console.error('Set FIREBASE_SERVICE_ACCOUNT_KEY_PATH (or GOOGLE_APPLICATION_CREDENTIALS).');
    process.exit(1);
  }
  const resolved = path.resolve(keyPath);
  if (!fs.existsSync(resolved)) {
    console.error('Service account file not found at', resolved);
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const projectId = process.env.FIREBASE_PROJECT_ID || json.project_id;
  initializeApp({ credential: cert(json as any), projectId });
}

interface SeedTopic {
  title: string;
  slug: string;
  urls: Record<string, string | string[]>;
}

const seedTopics: SeedTopic[] = [
  {
    title: 'Elden Ring',
    slug: 'elden-ring',
    urls: {
      fextralife: 'https://eldenring.wiki.fextralife.com/Elden+Ring',
      fandom: 'https://eldenring.fandom.com/wiki/Elden_Ring',
    },
  },
  {
    title: 'Dark Souls',
    slug: 'dark-souls',
    urls: {
      fextralife: 'https://darksouls.wiki.fextralife.com/Dark+Souls+Wiki',
      fandom: 'https://darksouls.fandom.com/wiki/Dark_Souls_Wiki',
    },
  },
  {
    title: 'Bloodborne',
    slug: 'bloodborne',
    urls: {
      fextralife: 'https://bloodborne.wiki.fextralife.com/Bloodborne+Wiki',
      fandom: 'https://bloodborne.fandom.com/wiki/Bloodborne_Wiki',
    },
  },
];

async function run() {
  ensureAdminInit();
  const db = getFirestore();
  const batch = db.batch();
  const now = new Date();

  for (const t of seedTopics) {
    const ref = db.collection('topics').doc(t.slug);
    batch.set(ref, {
      id: t.slug,
      title: t.title,
      slug: t.slug,
      urls: t.urls,
  name: t.title, // for client TopicSelector which reads data.name
      hasQuiz: false,
      lastQuizDate: null,
      lastGenerated: null,
      status: 'ready',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
  console.log(`Seeded ${seedTopics.length} topics.`);
  console.log('Reminder: Deep scrapers must crawl beyond landing pages (depth 2-3).');
  console.log('Add generation jobs as needed to topic-generation-jobs collection.');
}

run().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
