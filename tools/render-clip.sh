#!/usr/bin/env bash
# tools/render-clip.sh — cut this entry's GTA 6 clip: 1080x1920 vertical, the GTA 6 moment as the hook and
# make.fun's pitch over the last seconds, as text on screen and as a voice.
#
#   tools/render-clip.sh <source-video> <out.mp4> [voice.mp3]
#
# The source is Rockstar's Grand Theft Auto VI trailer, 3840x2160, 30 fps, 90 s. The five segments below are
# the moments the agent picked out of it, each cropped to a 1215x2160 window at the centre of the 4K frame
# and scaled to 1080x1920:
#
#   0.0  3.0 s  Vice City at sunset, a highway into the city      hook: "GTA 6 IS FINALLY HERE"
#  63.0  3.0 s  a car flipped over in a police chase               the moment
#   9.0  3.0 s  Lucia, the protagonist, in her prison orange
#  12.0  3.0 s  the beach under the towers, from the air
#  81.0  3.5 s  the neon VI logo                                   the payoff, under the pitch
#
# ffmpeg does the cutting, the crop, the scale, the on-screen text and the voice mix; the clip is a Short
# (vertical, well under a minute), encoded H.264 + AAC with the moov atom first.
set -euo pipefail

SRC="${1:?source video}"
OUT="${2:?output file}"
VOICE="${3:-}"

FFMPEG="${FFMPEG:-ffmpeg}"
FONT="${FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# A 3840x2160 frame cropped to 9:16 at its centre: 1215x2160, offset x = (3840-1215)/2 = 1312.
CROP="crop=1215:2160:1312:0,scale=1080:1920,setsar=1"

segment() { # start duration name
  "$FFMPEG" -v error -y -ss "$1" -t "$2" -i "$SRC" -vf "$CROP" -an \
    -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -r 30 "$WORK/$3.mp4"
}

echo "cutting the five moments from $SRC"
segment 3.0 3.0 a_skyline
segment 63.0 3.0 b_chase
segment 9.0 3.0 c_lucia
segment 12.0 3.0 d_beach
segment 81.0 3.5 e_vi

printf "file '%s'\n" "$WORK/a_skyline.mp4" "$WORK/b_chase.mp4" "$WORK/c_lucia.mp4" "$WORK/d_beach.mp4" "$WORK/e_vi.mp4" > "$WORK/list.txt"
"$FFMPEG" -v error -y -f concat -safe 0 -i "$WORK/list.txt" -c copy "$WORK/cut.mp4"

# The pitch: on screen from 8.6 s, spoken from 8.6 s, once the GTA 6 moments have had their say. The first
# line is 54 px and the second 58 px: at 64 px "MAKE CLIPS LIKE THIS WITH AI" runs past 1080 px and gets cut.
TEXT="drawtext=fontfile=${FONT}:text='MAKE CLIPS LIKE THIS WITH AI':fontsize=54:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h-620:enable='between(t,8.6,15.5)'"
TEXT="$TEXT,drawtext=fontfile=${FONT}:text='and get paid on make.fun':fontsize=58:fontcolor=0xFFE94A:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h-545:enable='between(t,8.6,15.5)'"
TEXT="$TEXT,drawtext=fontfile=${FONT}:text='make.fun/bounty/gta6-clipper-01':fontsize=38:fontcolor=white:borderw=3:bordercolor=black@0.85:x=(w-text_w)/2:y=h-460:enable='between(t,9.4,15.5)'"
TEXT="$TEXT,drawtext=fontfile=${FONT}:text='GTA 6 IS FINALLY HERE':fontsize=76:fontcolor=white:borderw=5:bordercolor=black@0.85:box=1:boxcolor=black@0.35:boxborderw=18:x=(w-text_w)/2:y=150:enable='between(t,0.3,3.0)'"

# Audio: the trailer's own track, with the voice over it, then a short fade on the tail.
"$FFMPEG" -v error -y -ss 3.0 -t 15.5 -i "$SRC" -vn -c:a aac -b:a 160k "$WORK/music.m4a"

if [ -n "$VOICE" ]; then
  "$FFMPEG" -v error -y -i "$WORK/cut.mp4" -i "$WORK/music.m4a" -i "$VOICE" \
    -filter_complex "[0:v]${TEXT}[v];[1:a]volume=0.75[m];[2:a]adelay=8800|8800,volume=1.9[voc];[m][voc]amix=inputs=2:duration=first:dropout_transition=0,afade=t=out:st=14.2:d=1.3[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 \
    -c:a aac -b:a 160k -movflags +faststart -shortest "$OUT"
else
  "$FFMPEG" -v error -y -i "$WORK/cut.mp4" -i "$WORK/music.m4a" \
    -filter_complex "[0:v]${TEXT}[v];[1:a]volume=0.9,afade=t=out:st=14.2:d=1.3[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 \
    -c:a aac -b:a 160k -movflags +faststart -shortest "$OUT"
fi

"${FFPROBE:-ffprobe}" -v error -i "$OUT" -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of default=noprint_wrappers=1
echo "wrote $OUT"
