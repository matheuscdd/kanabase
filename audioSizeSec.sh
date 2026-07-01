#!/bin/bash

cd podcasts || exit
echo "[" > duration.json
count=0
total=$(find . -type f -name "*.webm" | wc -l)

find . -type f -name "*.webm" -print0 | while IFS= read -r -d '' file; do
  duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$file")
  duration_rounded=$(printf "%.0f" "$duration")
  printf '  {"file": "%s", "duration": %d},\n' "$file" "$duration_rounded" >> duration.json

  ((count++))
  percent=$((count * 100 / total))
  bar=$(printf "%-${percent}s" "#" | tr ' ' '#')
  printf "\r[%s] %d%% (%d/%d)" "$bar" "$percent" "$count" "$total"
done

sed -i '$ s/},/}/' duration.json  # Linux
echo "]" >> duration.json
echo -e "\nConcluído!"