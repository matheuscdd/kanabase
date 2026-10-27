#!/usr/bin/env bash

set -euo pipefail

DIRECTORY="${1:?Usage: $0 <directory>}"

if [[ ! -d "$DIRECTORY" ]]; then
    echo "Error: directory not found: $DIRECTORY" >&2
    exit 1
fi

find "$DIRECTORY" -maxdepth 1 -type f -name '*.webm' -print0 |
while IFS= read -r -d '' file_path; do
    file_name="$(basename "$file_path")"

    if [[ "$file_name" =~ ^[[:alpha:]]+-([0-9]+)-[0-9]+-[0-9]+\.webm$ ]]; then
        section=$((10#${BASH_REMATCH[1]}))
        base_name="${file_name%.webm}"

        destination_directory="$DIRECTORY/$section/$base_name"

        mkdir -p "$destination_directory"
        mv -- "$file_path" "$destination_directory/$file_name"

        echo "Moved: $file_name -> $section/$base_name/$file_name"
    else
        echo "Skipped (invalid filename): $file_name" >&2
    fi
done

echo "Done!"