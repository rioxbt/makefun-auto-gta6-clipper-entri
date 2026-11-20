// Self-test for main.ts: runs the graded program the way the grader does, in throwaway directories, and
// checks what it writes to the output directory. Node 22+, standard library only.
//
//   node test/selftest.mjs
//
// Every case is a VIDEO.json the gate may be handed, a run of main.ts over it, and an assertion on the
// exit code and on what landed in the output directory.

import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAIN = join(ROOT, 'main.ts');

let failures = 0;
let checks = 0;

function report(ok, label, detail = '') {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
}

/** Run main.ts over `videoJson` (null = no VIDEO.json at all) and return the run and the output dir. */
function run(videoJson, { repeat = 1 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'gta6-clipper-selftest-'));
  const bot = join(dir, 'bot');
  const out = join(dir, 'output');
  mkdirSync(bot, { recursive: true });
  if (videoJson !== null && videoJson !== undefined) writeFileSync(join(bot, 'VIDEO.json'), videoJson);

  const runs = [];
  for (let i = 0; i < repeat; i += 1) {
    runs.push(
      spawnSync(process.execPath, [MAIN], {
        encoding: 'utf8',
        env: { ...process.env, MAKEFUN_BOT_DIR: bot, MAKEFUN_OUTPUT_DIR: out },
      }),
    );
  }
  const outputFile = join(out, 'VIDEO.json');
  const result = {
    dir,
    runs,
    status: runs[0].status,
    stdout: runs[0].stdout ?? '',
    stderr: runs[0].stderr ?? '',
    output: existsSync(outputFile) ? readFileSync(outputFile) : null,
  };
  return result;
}

console.log(`main.ts self-test — ${MAIN}\n`);

// 1. A Shorts address, as YouTube's Share button gives it: copied byte for byte.
{
  const source = '{"url": "https://www.youtube.com/shorts/dQw4w9WgXcQ"}\n';
  const r = run(source);
  report(r.status === 0, 'a Shorts address runs clean', `exit ${r.status}`);
  report(
    r.output !== null && r.output.equals(Buffer.from(source)),
    'a Shorts address is copied byte for byte',
    r.output === null ? 'no output' : `${r.output.byteLength} bytes`,
  );
  report(r.stdout.includes('dQw4w9WgXcQ'), 'the run names the video it handed over');
}

// 2. The other address shapes the bounty accepts, a query and a fragment read past.
for (const url of [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=12s',
  'https://youtu.be/dQw4w9WgXcQ?si=abc#frag',
  'http://m.youtube.com/shorts/dQw4w9WgXcQ',
]) {
  const r = run(`{"url": "${url}"}`);
  report(r.status === 0, `accepts ${url}`, `exit ${r.status}`);
}

// 3. The placeholder the starter ships, and every other unusable source: refused, with nothing written.
for (const [label, videoJson] of [
  ['the starter placeholder', '{"url": "https://www.youtube.com/shorts/<id>"}\n'],
  ['a url that is not YouTube', '{"url": "https://example.com/shorts/dQw4w9WgXcQ"}'],
  ['a lookalike host', '{"url": "https://youtube.com.evil.com/shorts/dQw4w9WgXcQ"}'],
  ['an id of the wrong length', '{"url": "https://www.youtube.com/shorts/dQw4w9WgXc"}'],
  ['no url at all', '{"video": "https://youtu.be/dQw4w9WgXcQ"}'],
  ['a url that is not a string', '{"url": 42}'],
  ['a JSON array', '[{"url": "https://youtu.be/dQw4w9WgXcQ"}]'],
  ['malformed JSON', '{"url": '],
  ['an empty file', ''],
  ['over the gate’s 16384-byte cap', `{"url": "https://youtu.be/dQw4w9WgXcQ", "pad": "${'x'.repeat(16400)}"}`],
]) {
  const r = run(videoJson);
  report(r.status === 3, `refuses ${label}`, `exit ${r.status}`);
  report(r.output === null, `writes nothing for ${label}`);
  report(r.stderr.length > 0, `says why it refused ${label}`);
}

// 4. No VIDEO.json anywhere: the source is missing, not unusable. The program also looks beside itself
// and in the working directory, so this case needs a copy of main.ts with no VIDEO.json near it.
{
  const dir = mkdtempSync(join(tmpdir(), 'gta6-clipper-selftest-'));
  const lonely = join(dir, 'main.ts');
  writeFileSync(lonely, readFileSync(MAIN));
  const out = join(dir, 'output');
  const r = spawnSync(process.execPath, [lonely], {
    encoding: 'utf8',
    cwd: dir,
    env: { ...process.env, MAKEFUN_BOT_DIR: join(dir, 'empty'), MAKEFUN_OUTPUT_DIR: out },
  });
  report(r.status === 2, 'refuses a checkout with no VIDEO.json', `exit ${r.status}`);
  report(!existsSync(join(out, 'VIDEO.json')), 'writes nothing when the source is missing');
  report((r.stderr ?? '').includes('not found'), 'says which places it looked in');
  rmSync(dir, { recursive: true, force: true });
}

// 5. Two runs, same input: the same bytes out, and no video.counts.json of the program's own.
{
  const source = '{"url": "https://youtu.be/dQw4w9WgXcQ"}';
  const r = run(source, { repeat: 2 });
  const both = r.runs.every((x) => x.status === 0);
  report(both, 'runs clean twice (the grader runs it twice)');
  report(r.output !== null && r.output.equals(Buffer.from(source)), 'both runs leave the same bytes');
  report(!existsSync(join(r.dir, 'output', 'video.counts.json')), 'never writes video.counts.json');
  report(
    r.runs[0].stdout === r.runs[1].stdout,
    'the two runs report the same thing (deterministic stdout)',
  );
}

// 6. A re-run over an output directory that already holds a VIDEO.json replaces it.
{
  const dir = mkdtempSync(join(tmpdir(), 'gta6-clipper-selftest-'));
  const bot = join(dir, 'bot');
  const out = join(dir, 'output');
  mkdirSync(bot, { recursive: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'VIDEO.json'), '{"url": "https://youtu.be/OLDOLDOLD01"}');
  writeFileSync(join(bot, 'VIDEO.json'), '{"url": "https://youtu.be/dQw4w9WgXcQ"}');
  const r = spawnSync(process.execPath, [MAIN], {
    encoding: 'utf8',
    env: { ...process.env, MAKEFUN_BOT_DIR: bot, MAKEFUN_OUTPUT_DIR: out },
  });
  const written = readFileSync(join(out, 'VIDEO.json'), 'utf8');
  report(r.status === 0 && written.includes('dQw4w9WgXcQ'), 'replaces a stale output file');
  rmSync(dir, { recursive: true, force: true });
}

// 7. With no environment at all, the program falls back to the repository beside it.
{
  const r = spawnSync(process.execPath, [MAIN], {
    encoding: 'utf8',
    cwd: ROOT,
    env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('MAKEFUN_'))),
  });
  report(r.status === 3, 'with no env it reads the repository’s own VIDEO.json', `exit ${r.status}`);
  report(r.stderr.includes('placeholder') || r.stderr.includes('not a YouTube video address'), 'and refuses the placeholder', r.stderr.trim().slice(0, 80));
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
