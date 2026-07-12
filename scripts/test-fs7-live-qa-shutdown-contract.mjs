#!/usr/bin/env node
/**
 * Contract: FS-7 live QA — shutdown / artifact / timeout regression guards.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(ROOT, 'scripts/qa-fs7-live-persistence-agent.mjs');
const workflowPath = path.join(ROOT, '.github/workflows/fs7-live-firestore-qa.yml');

const script = fs.readFileSync(scriptPath, 'utf8');
const workflow = fs.readFileSync(workflowPath, 'utf8');

// Run 29187889638: W-10b waitFor threw before finish() — artifact missing.
assert.match(script, /deleteApp/);
assert.match(script, /shutdownRuntime/);
assert.match(script, /waitForFnByTitle/);
assert.match(script, /timeout:\$\{label\}/);
assert.match(script, /setImmediate\(\(\) => process\.exit\(exitCode\)\)/);
assert.match(script, /catch \(err\)/);
assert.match(script, /currentStep = 'W-10b'/);
assert.match(script, /closeDrawers\(page\)/);

// W-10b must reset UI before legacy picker (post W-09 drawer residue).
const w10bBlock = script.slice(script.indexOf("currentStep = 'W-10b'"), script.indexOf('await selectLegacyByTitle'));
assert.match(w10bBlock, /page\.reload/);
assert.match(w10bBlock, /openFunctionalSpec/);

// Workflow job timeout headroom (not the root cause for run 29187889638 ~90s).
assert.match(workflow, /timeout-minutes:\s*30/);

console.log('fs7 live qa shutdown contract: PASS');
