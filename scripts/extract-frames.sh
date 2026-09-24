#!/usr/bin/env bash
#
# extract-frames.sh — Veo clip -> numbered WebP frame sequence, badge removed.
#
# Usage:
#   ./scripts/extract-frames.sh 2      # single scene (test first!)
#   ./scripts/extract-frames.sh all    # batch all six
#
# Override any knob from the environment, e.g.
#   MODE=crop ./scripts/extract-frames.sh 1
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SRC_DIR="${SRC_DIR:-video website}"
OUT_ROOT="${OUT_ROOT:-public/frames}"

# All clips normalise to this before badge removal. Clip 1 is 1080p, the rest
# are 720p; they must end up identical because scene 6 cross-fades straight
# back into scene 1 at the loop seam, where a size mismatch would pop.
BASE_W="${BASE_W:-1280}"
BASE_H="${BASE_H:-720}"

# --- Badge removal ---------------------------------------------------------
#
# MODE=hide  (default) — ffmpeg `delogo` interpolates the badge away and the
#                        full frame is kept.
# MODE=crop            — trim the bottom-right corner off instead.
#
# `hide` is the default because of scene 1: the TV — the whole point of the
# "two silhouettes, TV glow" beat — sits in the right-hand strip, so any crop
# deep enough to clear the badge also deletes the subject of the shot.
#
# Badge geometry, measured in 720p space rather than guessed. The badge is
# INSET ~95px from both edges, not flush in the corner:
#   primary badge   x 1136-1183, y 576-624   (all six clips, static all clip)
#   second badge    x 1180-1227, y 610-650   (clip 1 only — it looks like a
#                                             720p render upscaled + restamped)
#
# Box size is a real tradeoff: delogo smears in proportion to box area, but
# too tight and the badge's soft outer glow leaks out as a bright halo.
# Every border pixel of the box must sit on clean background: delogo
# interpolates FROM the border inward, so a border row touching the badge's
# lower spike gets smeared up through the box as a bright vertical streak.
# Tested 52x50 + 56x54 (streak) / 60x60 (clean, minimum safe) / 64x66 (clean
# but smears more). 60x60 leaves ~6px of clean margin on every side.
MODE="${MODE:-hide}"

DELOGO_PRIMARY="${DELOGO_PRIMARY:-x=1130:y=570:w=60:h=60}"
DELOGO_SECOND="${DELOGO_SECOND:-x=1172:y=602:w=64:h=60}"

# Only used when MODE=crop. 12.5% off the right is the minimum that clears
# the badge; trimming the bottom is near-useless (>20% before it clears).
CROP_RIGHT_PCT="${CROP_RIGHT_PCT:-12.5}"
CROP_BOTTOM_PCT="${CROP_BOTTOM_PCT:-0}"

# --- Encoding --------------------------------------------------------------
QUALITY="${QUALITY:-80}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"

# Per-scene output frame rate.
#
# Clips 1-5 are 8s @ 24fps (192 frames) -> 18fps gives 144 frames.
# Clip 6 is only 4s @ 24fps (96 frames), so it is NOT decimated — it keeps all
# 96 to preserve every bit of smoothness available. It gets a proportionally
# shorter scroll distance in the scene config instead, which keeps
# frames-per-scroll-pixel (what the eye actually reads as smooth) identical
# to its neighbours.
fps_for_scene() {
  case "$1" in
    6) echo 24 ;;
    *) echo 18 ;;
  esac
}

# Clip 1 is the only one carrying two badges.
delogo_for_scene() {
  case "$1" in
    1) echo "delogo=${DELOGO_PRIMARY},delogo=${DELOGO_SECOND}" ;;
    *) echo "delogo=${DELOGO_PRIMARY}" ;;
  esac
}

# ---------------------------------------------------------------------------
# Locate ffmpeg (winget installs it outside the current shell's PATH)
# ---------------------------------------------------------------------------

find_ffmpeg() {
  if command -v ffmpeg >/dev/null 2>&1; then command -v ffmpeg; return; fi
  local winget_bin
  winget_bin=$(ls -d "$HOME/AppData/Local/Microsoft/WinGet/Packages/"*[Ff][Ff]mpeg*/*/bin/ffmpeg.exe 2>/dev/null | head -1 || true)
  if [[ -n "$winget_bin" ]]; then echo "$winget_bin"; return; fi
  echo "ERROR: ffmpeg not found. Install with: winget install Gyan.FFmpeg" >&2
  exit 1
}

FFMPEG="$(find_ffmpeg)"
FFPROBE="${FFMPEG%ffmpeg.exe}ffprobe.exe"
[[ -x "$FFPROBE" ]] || FFPROBE="$(command -v ffprobe)"

# ---------------------------------------------------------------------------
# Derived geometry
# ---------------------------------------------------------------------------

if [[ "$MODE" == "crop" ]]; then
  OUT_W=$(awk -v w="$BASE_W" -v p="$CROP_RIGHT_PCT"  'BEGIN{v=int(w*(100-p)/100); print v-(v%2)}')
  OUT_H=$(awk -v h="$BASE_H" -v p="$CROP_BOTTOM_PCT" 'BEGIN{v=int(h*(100-p)/100); print v-(v%2)}')
else
  OUT_W="$BASE_W"
  OUT_H="$BASE_H"
fi

# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

extract_scene() {
  local n="$1"
  local src="$SRC_DIR/$n.mp4"
  local out="$OUT_ROOT/scene$n"
  local fps; fps="$(fps_for_scene "$n")"

  [[ -f "$src" ]] || { echo "ERROR: missing $src" >&2; exit 1; }

  rm -rf "$out"; mkdir -p "$out"

  # lanczos keeps clip 1's 1080p->720p downscale from going soft.
  local vf="scale=${BASE_W}:${BASE_H}:flags=lanczos"
  if [[ "$MODE" == "crop" ]]; then
    vf="${vf},crop=${OUT_W}:${OUT_H}:0:0"
  else
    vf="${vf},$(delogo_for_scene "$n")"
  fi
  # fps_mode=passthrough stops ffmpeg silently duplicating frames.
  vf="${vf},fps=${fps}"

  "$FFMPEG" -v error -y -i "$src" -vf "$vf" -fps_mode passthrough \
    -c:v libwebp -quality "$QUALITY" -compression_level "$COMPRESSION_LEVEL" \
    -lossless 0 -preset picture -an \
    "$out/%04d.webp"

  local count bytes dims
  count=$(find "$out" -name '*.webp' | wc -l | tr -d ' ')
  bytes=$(du -sk "$out" | cut -f1)
  dims=$("$FFPROBE" -v error -select_streams v:0 -show_entries stream=width,height \
    -of csv=p=0:nk=1 "$out/0001.webp")

  printf '  scene%-2s  %-10s %4s frames @ %2sfps  %6s KB  avg %5s KB/frame\n' \
    "$n" "$dims" "$count" "$fps" "$bytes" \
    "$(awk -v b="$bytes" -v c="$count" 'BEGIN{printf "%.1f", b/c}')"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

target="${1:-}"
[[ -n "$target" ]] || { echo "Usage: $0 <scene-number|all>" >&2; exit 1; }

echo "ffmpeg    : $FFMPEG"
echo "normalise : ${BASE_W}x${BASE_H}"
if [[ "$MODE" == "crop" ]]; then
  echo "mode      : crop  (-${CROP_RIGHT_PCT}% right, -${CROP_BOTTOM_PCT}% bottom)"
else
  echo "mode      : hide  (delogo ${DELOGO_PRIMARY}; +second box on scene 1)"
fi
echo "webp      : quality ${QUALITY}, compression_level ${COMPRESSION_LEVEL}"
echo

if [[ "$target" == "all" ]]; then
  for n in 1 2 3 4 5 6; do extract_scene "$n"; done
else
  extract_scene "$target"
fi

echo
echo "Output canvas dimensions: ${OUT_W} x ${OUT_H}"
