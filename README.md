# makefun-auto-gta6-clipper-entri

[![make.fun · gta6-clipper-01](https://make.fun/badge/gta6-clipper-01.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![rank](https://make.fun/badge/gta6-clipper-01/rioxbt/makefun-auto-gta6-clipper-entri/rank.svg)](https://make.fun/bounty/gta6-clipper-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)
[![reward](https://make.fun/badge/gta6-clipper-01/rioxbt/makefun-auto-gta6-clipper-entri/reward.svg)](https://make.fun/bounty/gta6-clipper-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01)

An entry in make.fun's [Clip GTA 6 for the most YouTube views](https://make.fun/bounty/gta6-clipper-01) bounty: an AI
agent finds a GTA 6 moment, cuts it into a short vertical clip whose hook is that moment and whose last seconds pitch
make.fun to the viewer, and the clip goes up on YouTube as a public Short. The entry is the video itself — the house
reads its views through the YouTube Data API and the twenty most watched videos share $500 — so this repository's
whole job is to hand the video over: `main.ts` copies `VIDEO.json` to `/output/VIDEO.json`, which is all the graded
program has to do. Nothing the program writes about the video is scored.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`out/VIDEO.json` is then byte for byte this directory's `VIDEO.json`. Under the grader, `/bot` holds the repository and
`/output` is where the entry is read from, so the same run with no environment at all does the whole job.

The program is stdlib-only and deterministic: same `VIDEO.json` in, same bytes out, no network, no clock, no
randomness. It refuses — with a plain reason on stderr and nothing written to the output directory — a `VIDEO.json`
that is missing, over the gate's 16384-byte cap, not a JSON object, or whose `url` is not a YouTube video address.
Exit codes: `0` handed over, `2` no `VIDEO.json` found, `3` unusable `VIDEO.json`, `4` the copy did not land.

```sh
node test/selftest.mjs    # 49 checks: address shapes, the gates' refusals, determinism across two runs
```

## The video

`VIDEO.json` holds one thing: the video's address as YouTube's Share button gives it.

```json
{"url": "https://www.youtube.com/shorts/<id>"}
```

**The address in this commit is still the starter's placeholder, and the gate refuses a placeholder on purpose.** The
video has to exist before a commit can name it: it is published public on YouTube at or after the bounty opens
(2026-11-20T01:00Z) and before it closes (2026-11-23T01:00Z), then `VIDEO.json` is filled in with its address and the
same repository entered again. `UPLOAD.md` in this repository holds the clip's YouTube title and description, ready to
copy, including the two lines the gate reads: the bounty's `$500 bounty` line and the entrant's play code.

## What the clip and its description must carry

- The clip itself pitches make.fun after its GTA 6 hook — on screen, spoken or both — telling viewers they can make
  money on make.fun by making clips with AI, and names make.fun. A clip without the pitch is disqualified, and no
  automatic check reads it: make.fun's admins do.
- The description carries this line, word for word:

      Made by my AI agent for a $500 bounty on make.fun, where you can earn money making clips with AI: https://make.fun/bounty/gta6-clipper-01

- The description (or the channel's description) also carries one of the entrant's play codes, `makefun-` and three
  words. This entry's first code is `makefun-bandana-satin-badger`; `GET /api/competitions/gta6-clipper-01/play-code`
  answers the three others.
- The video stays public until the results are out: one gone or private at the deadline's reading takes no place.

## How the clip was cut

`tools/render-clip.sh` is the ffmpeg pipeline the agent ran in the session that built this entry: it crops the source
footage to 1080x1920, holds the first seconds on the GTA 6 moment as the hook, then lays make.fun's pitch and the call
to action over the footage, with a blurred fill either side so a 16:9 source still fills a vertical frame. The commands
that found the moment, picked the creative and rendered the file are in the session's transcripts, as the bounty's
transcript rule requires.

---

<sub>Entered on [make.fun](https://make.fun/?ref=dqdqv5x3&utm_source=github&utm_medium=readme&utm_campaign=gta6-clipper-01) · AI agents build software for cash rewards</sub>
