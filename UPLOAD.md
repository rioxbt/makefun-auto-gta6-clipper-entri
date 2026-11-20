# Publishing the clip and finishing the entry

The clip is cut and rendered; it is **not** in this repository (it is a working file, and its footage is Rockstar's,
so it stays out of a public repo). It sits beside the checkout:

    clip/gta6-makefun-clip.mp4

1080x1920 vertical, 15.5 s, 30 fps, H.264 + AAC, 11.97 MB — a Short. Source footage: Rockstar's *Grand Theft Auto
VI* trailer, 4K, taken from its archive.org mirror
`https://archive.org/download/grand-theft-auto-vi-trailer-14k-2160p/`. The five moments in it, the crop, the on-screen
text and the voice-over were chosen and rendered in the agent session that built this repository, by
`tools/render-clip.sh`; the session's transcripts carry every command.

## 1. Upload it

YouTube Studio -> **Create** -> **Upload videos** -> pick `clip/gta6-makefun-clip.mp4`

- **Visibility: Public.** Not unlisted, not private. Keep it public until the results are out
  (2026-12-07T07:00Z): a video that is gone or no longer public when the house reads it at the deadline takes no place.
- Not made for kids, no age restriction.
- **Title:**

      GTA 6 Is Finally Here 🔥 — My AI Agent Clipped This on make.fun

- **Description** — copy this whole block, word for word. It carries the line the gate looks for (`$500 bounty` and the
  make.fun link) and this entry's play code, and only the description is read for them:

      Made by my AI agent for a $500 bounty on make.fun, where you can earn money making clips with AI: https://make.fun/bounty/gta6-clipper-01

      GTA 6 is finally here. My AI agent found one of its best moments, cut it into a vertical clip, put make.fun's
      pitch on it and published it — hook, cut and upload, all done by an agent.

      On make.fun people and their AI agents build things, enter them in paid bounties and get paid in USDC when they
      win. If your agent can cut a clip, it can earn: https://make.fun/bounty/gta6-clipper-01

      makefun-bandana-satin-badger

      #GTA6 #GTAVI #Shorts #AI #makefun

  The play code `makefun-bandana-satin-badger` is this account's first of four; any one of them passes. It may go in
  the channel's description instead (YouTube Studio: Customization, Profile, Description, Publish), but it must be in
  one of the two.

## 2. Name the video in `VIDEO.json`

Take the video's address from YouTube's **Share -> Copy link** and put it in `VIDEO.json`, nothing else:

    {"url": "https://www.youtube.com/shorts/<the video's id>"}

Then:

    node test/selftest.mjs
    mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
    git add -A && git commit -m "gta6-clipper-01: name the published clip" && git push

`main.ts` prints the id it handed over; `out/VIDEO.json` must be byte for byte the repository's `VIDEO.json`.

## 3. Enter the commit

From the unpacked kit (the copy of this bounty's `kit/`, which holds `cli/makefun.mjs`):

    node cli/makefun.mjs check --kit . --repo <this repository> --transcripts transcripts.tar.gz
    node cli/makefun.mjs submit --competition gta6-clipper-01 \
      --repo-url https://github.com/rioxbt/makefun-auto-gta6-clipper-entri \
      --commit <the new commit sha> --title "GTA 6 clip, cut by an agent" \
      --bundle transcripts.tar.gz --keypair <the account's keypair file>

The transcripts must come from the sessions that made the clip and wrote this repository; the bundle is the whole
session tree, and the entry is signed by a wallet on the account. A description can be mended in YouTube Studio and
the same commit entered again — no new upload is needed for that.

## Dates

- Competition opened: **2026-11-20T01:00:00Z** (a video published before this does not count)
- Entries close: **2026-11-23T01:00:00Z**
- Results due: **2026-12-07T07:00:00Z** — keep the video public until then
