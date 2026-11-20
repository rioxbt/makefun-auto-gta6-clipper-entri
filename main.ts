// gta6-clipper-01 entry — Node 22, standard library only.
//
// This is the graded program of the entry (harness "program/v1"): the grader runs it at the repository
// root and reads what it writes to /output. Its whole job is to hand the entry's video over:
//
//   VIDEO.json (repository root)  ->  /output/VIDEO.json
//
// The house then reads the video itself through the YouTube Data API (its views, likes and comments) and
// writes its own reading to /output/video.counts.json in place of anything a program put there, so this
// program never writes that file. Nothing this program writes about the video is scored.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR stand in for /bot and /output:
//
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deterministic: same VIDEO.json in, same bytes out, no network, no clock, no randomness.

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Exit codes, so a failed run says what went wrong without anyone reading the log.
const EXIT_OK = 0;
const EXIT_NO_SOURCE = 2; // no VIDEO.json anywhere we look
const EXIT_BAD_SOURCE = 3; // VIDEO.json is not a usable video address
const EXIT_BAD_OUTPUT = 4; // the copy to /output did not land

const OUTPUT_FILE = 'VIDEO.json';
const MAX_VIDEO_JSON_BYTES = 16384; // the gate's cap on VIDEO.json
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/; // a YouTube video id: 11 of letters, digits, _ and -

/**
 * Every place the entry's VIDEO.json may sit. The grader mounts the repository at /bot, so that is the
 * first place tried; the others keep the program working when it is run from a checkout instead.
 */
function sourceCandidates(outputDir: string): string[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.MAKEFUN_BOT_DIR,
    '/bot',
    here,
    process.cwd(),
  ];
  return candidates
    .filter((dir): dir is string => typeof dir === 'string' && dir.length > 0)
    .map((dir) => join(dir, OUTPUT_FILE))
    .filter((file) => file !== join(outputDir, OUTPUT_FILE)); // never read what we are about to write
}

/** The video id of a YouTube address, or null when the string is not one. */
function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  if (host === 'youtu.be') {
    const id = path.slice(1);
    return VIDEO_ID.test(id) ? id : null;
  }
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
    if (path === '/watch') {
      const id = parsed.searchParams.get('v');
      return id !== null && VIDEO_ID.test(id) ? id : null;
    }
    const shorts = path.match(/^\/shorts\/([^/]+)\/?$/);
    if (shorts) {
      return VIDEO_ID.test(shorts[1]) ? shorts[1] : null;
    }
    return null;
  }
  return null;
}

/** Read and vet the entry's VIDEO.json; throws with a plain reason when it cannot be used. */
function readVideoJson(file: string): { bytes: Buffer; id: string } {
  const bytes = readFileSync(file);
  if (bytes.byteLength > MAX_VIDEO_JSON_BYTES) {
    throw new Error(`${file} is ${bytes.byteLength} bytes, over the gate's cap of ${MAX_VIDEO_JSON_BYTES}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch (err) {
    throw new Error(`${file} is not JSON: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file} is not a JSON object`);
  }
  const url = (parsed as Record<string, unknown>).url;
  if (typeof url !== 'string') {
    throw new Error(`${file} has no string "url"`);
  }
  const id = youtubeVideoId(url);
  if (id === null) {
    throw new Error(`${file}'s url "${url}" is not a YouTube video address`);
  }
  return { bytes, id };
}

function main(): number {
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const outputFile = join(outputDir, OUTPUT_FILE);

  const source = sourceCandidates(outputDir).find((file) => existsSync(file) && statSync(file).isFile());
  if (source === undefined) {
    console.error(`${OUTPUT_FILE} not found: looked in ${sourceCandidates(outputDir).join(', ')}`);
    return EXIT_NO_SOURCE;
  }

  let video: { bytes: Buffer; id: string };
  try {
    video = readVideoJson(source);
  } catch (err) {
    console.error(`VIDEO.json is unusable: ${(err as Error).message}`);
    return EXIT_BAD_SOURCE;
  }

  try {
    mkdirSync(outputDir, { recursive: true });
    // Write beside the target and rename, so a reader never sees a half-written file.
    const staged = `${outputFile}.tmp`;
    try {
      copyFileSync(source, staged); // byte for byte, as the bounty's program is asked to do
      renameSync(staged, outputFile);
    } catch (err) {
      rmSync(staged, { force: true });
      throw err;
    }
    const written = readFileSync(outputFile);
    if (!written.equals(video.bytes)) {
      throw new Error(`the copy at ${outputFile} is not the ${video.bytes.byteLength} bytes of ${source}`);
    }
  } catch (err) {
    console.error(`${OUTPUT_FILE} could not be written to ${outputDir}: ${(err as Error).message}`);
    return EXIT_BAD_OUTPUT;
  }

  console.log(`${OUTPUT_FILE} -> ${outputFile}: ${video.bytes.byteLength} bytes, video ${video.id}`);
  return EXIT_OK;
}

process.exit(main());
