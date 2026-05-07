#!/bin/bash

for f in *.wav; do
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  dur=${dur%.*}
  echo "$dur|$f"
done | sort -n | while IFS="|" read dur f; do
  printf "%s: %02d:%02d\n" "$f" $((dur/60)) $((dur%60))
done