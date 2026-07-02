#!/usr/bin/env node
/**
 * STAM PR #306 — Firestore membership QA seed helper (local / maintainer only)
 *
 * Creates or updates demo membership data for membership gate QA:
 *   - users/{uid}
 *   - projects/{projectId}
 *   - projects/{projectId}/members/{uid}
 *
 * NOT product runtime. Uses Firebase Admin SDK + ADC / service account.
 * Does NOT modify firestore.rules or client write paths.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/seed-stam-demo-membership.mjs --uid <firebaseAuthUid>
 *
 *   node scripts/seed-stam-demo-membership.mjs --uid abc123 --status pending --dry-run
 *
 * Requirements (QA environment only — do not add to repo package.json):
 *   npm install firebase-admin
 */

const HELP = `
STAM PR #306 — Firestore membership QA seed helper

Usage:
  node scripts/seed-stam-demo-membership.mjs --uid <firebaseAuthUid> [options]

Required:
  --uid <string>            Firebase Auth UID (Google login uid)

Options:
  --email <string>          Default: airwav7@gmail.com
  --displayName <string>    Default: 이서
  --projectId <string>      Default: stam-demo
  --projectName <string>    Default: STAM Demo Project
  --tenantId <string>       Default: stam
  --status <string>         active | pending | denied | removed  (default: active)
  --role <string>           Default: owner
  --firebaseProject <string> Firebase projectId (default: stam-preview-hosting)
  --dry-run                 Print payloads without writing
  --help                    Show this help

Auth:
  Uses Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS.
  Requires Firestore Admin write access (bypasses client firestore.rules).

Examples:
  node scripts/seed-stam-demo-membership.mjs --uid YOUR_UID
  node scripts/seed-stam-demo-membership.mjs --uid YOUR_UID --status pending
  node scripts/seed-stam-demo-membership.mjs --uid YOUR_UID --status removed --dry-run

Safety:
  - QA / staging only (default project: stam-preview-hosting)
  - Not imported by product pages or stam/js/**
`.trim();

const VALID_MEMBER_STATUS = new Set(['active', 'pending', 'denied', 'removed']);

function parseArgs(argv) {
  const opts = {
    uid: '',
    email: 'airwav7@gmail.com',
    displayName: '이서',
    projectId: 'stam-demo',
    projectName: 'STAM Demo Project',
    tenantId: 'stam',
    status: 'active',
    role: 'owner',
    firebaseProject: 'stam-preview-hosting',
    dryRun: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--uid') {
      opts.uid = argv[++i] || '';
    } else if (arg === '--email') {
      opts.email = argv[++i] || opts.email;
    } else if (arg === '--displayName') {
      opts.displayName = argv[++i] || opts.displayName;
    } else if (arg === '--projectId') {
      opts.projectId = argv[++i] || opts.projectId;
    } else if (arg === '--projectName') {
      opts.projectName = argv[++i] || opts.projectName;
    } else if (arg === '--tenantId') {
      opts.tenantId = argv[++i] || opts.tenantId;
    } else if (arg === '--status') {
      opts.status = argv[++i] || opts.status;
    } else if (arg === '--role') {
      opts.role = argv[++i] || opts.role;
    } else if (arg === '--firebaseProject') {
      opts.firebaseProject = argv[++i] || opts.firebaseProject;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildPayloads(opts) {
  const emailNormalized = normalizeEmail(opts.email);
  const now = new Date().toISOString();

  const userDoc = {
    email: opts.email,
    emailNormalized,
    displayName: opts.displayName,
    provider: 'google',
    status: 'active',
    updatedAt: now,
  };

  const projectDoc = {
    id: opts.projectId,
    tenantId: opts.tenantId,
    name: opts.projectName,
    code: opts.projectId,
    description: 'PR #306 membership gate QA demo project',
    status: 'active',
    ownerUserId: opts.uid,
    updatedAt: now,
    updatedBy: opts.uid,
  };

  const memberDoc = {
    uid: opts.uid,
    userId: opts.uid,
    email: opts.email,
    emailNormalized,
    projectId: opts.projectId,
    projectName: opts.projectName,
    tenantId: opts.tenantId,
    role: opts.role,
    status: opts.status,
    updatedAt: now,
    updatedBy: opts.uid,
  };

  if (opts.status === 'active') {
    memberDoc.joinedAt = now;
  }

  return {
    paths: {
      user: `users/${opts.uid}`,
      project: `projects/${opts.projectId}`,
      member: `projects/${opts.projectId}/members/${opts.uid}`,
    },
    userDoc,
    projectDoc,
    memberDoc,
  };
}

async function loadFirebaseAdmin() {
  try {
    return await import('firebase-admin');
  } catch (err) {
    console.error('\nfirebase-admin is not installed in this environment.');
    console.error('Install in QA runtime only (do not commit package.json changes):');
    console.error('  npm install firebase-admin');
    console.error('\nOriginal error:', err.message);
    process.exit(1);
  }
}

async function seedFirestore(opts) {
  const payloads = buildPayloads(opts);

  if (opts.dryRun) {
    console.log('\n[dry-run] Firebase project:', opts.firebaseProject);
    console.log('[dry-run] Would upsert:');
    console.log(JSON.stringify({
      [payloads.paths.user]: payloads.userDoc,
      [payloads.paths.project]: payloads.projectDoc,
      [payloads.paths.member]: payloads.memberDoc,
    }, null, 2));
    return;
  }

  const admin = await loadFirebaseAdmin();
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: opts.firebaseProject });
  }

  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  const userRef = db.doc(payloads.paths.user);
  const projectRef = db.doc(payloads.paths.project);
  const memberRef = db.doc(payloads.paths.member);

  const userSnap = await userRef.get();
  const projectSnap = await projectRef.get();
  const memberSnap = await memberRef.get();

  const userWrite = {
    ...payloads.userDoc,
    updatedAt: FieldValue.serverTimestamp(),
    ...(userSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  };

  const projectWrite = {
    ...payloads.projectDoc,
    updatedAt: FieldValue.serverTimestamp(),
    ...(projectSnap.exists ? {} : {
      createdAt: FieldValue.serverTimestamp(),
      createdBy: opts.uid,
    }),
  };

  const memberWrite = {
    ...payloads.memberDoc,
    updatedAt: FieldValue.serverTimestamp(),
    ...(memberSnap.exists ? {} : {
      createdAt: FieldValue.serverTimestamp(),
      createdBy: opts.uid,
    }),
  };

  const batch = db.batch();
  batch.set(userRef, userWrite, { merge: true });
  batch.set(projectRef, projectWrite, { merge: true });
  batch.set(memberRef, memberWrite, { merge: true });
  await batch.commit();

  console.log('\nSeed complete:', opts.firebaseProject);
  console.log('  user   ', payloads.paths.user);
  console.log('  project', payloads.paths.project);
  console.log('  member ', payloads.paths.member);
  console.log('  status ', opts.status);
}

function validate(opts) {
  if (!opts.uid || !opts.uid.trim()) {
    throw new Error('--uid is required (Firebase Auth UID from Google login)');
  }
  if (!VALID_MEMBER_STATUS.has(opts.status)) {
    throw new Error(`--status must be one of: ${Array.from(VALID_MEMBER_STATUS).join(', ')}`);
  }
  if (!normalizeEmail(opts.email)) {
    throw new Error('--email is required');
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(HELP);
    return;
  }

  validate(opts);
  await seedFirestore(opts);
}

main().catch(function (err) {
  console.error('\nSeed failed:', err.message || err);
  process.exit(1);
});
