#!/usr/bin/env bash
# Measures each instrument's attack loudness and prints the gain trim that
# levels it against the rest of the roster.
#
# Why a 300ms window: these are one-shot hits, so what you hear is the attack.
# Whole-file mean punishes short instruments (kalimba reads 15dB quieter than
# bass on that measure purely because its note stops sooner), and peak alone
# ignores how much energy is actually behind the hit.
#
#   bash scripts/measure-levels.sh
set -euo pipefail

TARGET=-32   # dB; roughly the middle of the roster. Absolute level is the
             # user's volume slider's job, not the trim's.

printf '%-18s %10s %8s\n' instrument attack_dB trim
for dir in assets/samples/*/; do
  name=$(basename "$dir")
  vals=""
  for f in "$dir"*.mp3; do
    out=$(ffmpeg -hide_banner -i "$f" -t 0.3 -af volumedetect -f null - 2>&1)
    vals="$vals $(echo "$out" | grep mean_volume | sed 's/.*mean_volume: //; s/ dB//')"
  done
  python3 -c "
v = [float(x) for x in '''$vals'''.split()]
avg = sum(v) / len(v)
gain = 10 ** (($TARGET - avg) / 20)
print(f'{\"$name\":<18} {avg:10.2f} {gain:8.2f}')
"
done
