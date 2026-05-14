#!/bin/bash

cd 'podcasts/en/deep-dive-bible' || exit

mapfile -t chapters < <(ls *.json) 
delimiter=' '

for file in "${chapters[@]}"; do
    chapter=$(basename "$file" .json)
    book="${chapter%"$delimiter"*}"
    mv "$file" "$book/$chapter"
    mv "${chapter}.txt" "$book/$chapter"
done