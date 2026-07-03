#!/usr/bin/env node
/**
 * STAM PR #314 — Firestore requirements QA seed helper (local / maintainer only)
 *
 * Seeds demo requirement documents for list-read QA:
 *   projects/{projectId}/requirements/{requirementId}
 *
 * NOT product runtime. Uses Firebase Admin SDK + ADC / service account.
 * Does NOT modify firestore.rules or client write paths.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/seed-stam-demo-requirements.mjs --uid <firebaseAuthUid>
 *
 *   node scripts/seed-stam-demo-requirements.mjs --uid abc123 --dry-run
 *
 * Requirements (QA environment only — do not add to repo package.json):
 *   npm install --no-save firebase-admin
 */

const HELP = `
STAM PR #314 — Firestore requirements QA seed helper

Usage:
  node scripts/seed-stam-demo-requirements.mjs --uid <firebaseAuthUid> [options]

Required:
  --uid <string>            Firebase Auth UID used as owner/audit actor

Options:
  --projectId <string>      Default: stam-demo
  --firebaseProject <string> Firebase projectId (default: stam-preview-hosting)
  --dry-run                 Print payloads without writing
  --help                    Show this help

Auth:
  Uses Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS.
  Requires Firestore Admin write access (bypasses client firestore.rules).

Examples:
  node scripts/seed-stam-demo-requirements.mjs --uid YOUR_UID
  node scripts/seed-stam-demo-requirements.mjs --uid YOUR_UID --projectId stam-demo --dry-run

Safety:
  - QA / staging only (default project: stam-preview-hosting)
  - Not imported by product pages or stam/js/**
`.trim();

function parseArgs(argv) {
  const opts = {
    uid: '',
    projectId: 'stam-demo',
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
    } else if (arg === '--projectId') {
      opts.projectId = argv[++i] || opts.projectId;
    } else if (arg === '--firebaseProject') {
      opts.firebaseProject = argv[++i] || opts.firebaseProject;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

function buildRequirementDocs(opts) {
  const now = new Date().toISOString();
  const base = {
    projectId: opts.projectId,
    ownerUid: opts.uid,
    ownerName: 'QA Owner',
    createdAt: now,
    createdBy: opts.uid,
    updatedAt: now,
    updatedBy: opts.uid,
    deletedAt: null,
    deletedBy: null,
    isDeleted: false,
    version: 1,
    visibility: 'project',
    reviewStatus: 'Review Needed',
    approvalStatus: 'none',
    tags: ['기능'],
  };

  return [
    {
      id: 'REQ-DEMO-001',
      path: `projects/${opts.projectId}/requirements/REQ-DEMO-001`,
      data: {
        ...base,
        code: 'REQ-001',
        title: '요구사항정의서 Firestore 목록 read QA',
        description: 'PR #314 list read verification document',
        status: 'approved',
        priority: 'high',
        sortOrder: 1,
        linkedScreenSpec: 'SCR-001',
        linkedWbs: 'WBS-001',
      },
    },
    {
      id: 'REQ-DEMO-002',
      path: `projects/${opts.projectId}/requirements/REQ-DEMO-002`,
      data: {
        ...base,
        code: 'REQ-002',
        title: '요구사항 등록 Drawer shell 유지',
        description: 'Read-only PR keeps drawer UI without Firestore write wiring',
        status: 'review',
        priority: 'normal',
        reviewStatus: 'In Review',
        sortOrder: 2,
      },
    },
    {
      id: 'REQ-DEMO-003',
      path: `projects/${opts.projectId}/requirements/REQ-DEMO-003`,
      data: {
        ...base,
        code: 'REQ-003',
        title: 'Soft-deleted requirement (hidden by default)',
        description: 'Should be excluded from default list query',
        status: 'archived',
        priority: 'low',
        isDeleted: true,
        deletedAt: now,
        deletedBy: opts.uid,
        sortOrder: 3,
      },
    },
  ];
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(HELP);
    return;
  }
  if (!opts.uid) {
    throw new Error('--uid is required');
  }

  const docs = buildRequirementDocs(opts);
  if (opts.dryRun) {
    console.log(JSON.stringify({ projectId: opts.projectId, docs }, null, 2));
    return;
  }

  let admin;
  try {
    admin = await import('firebase-admin');
  } catch (err) {
    throw new Error('firebase-admin is required for seeding. Run: npm install --no-save firebase-admin');
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: opts.firebaseProject });
  }

  const db = admin.firestore();
  const batch = db.batch();
  docs.forEach((doc) => {
    batch.set(db.doc(doc.path), doc.data, { merge: true });
  });
  await batch.commit();

  console.log(`Seeded ${docs.length} requirements under projects/${opts.projectId}/requirements`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
