#!/bin/bash

cd 'podcasts/pt/mergulho-profundo-bíblia' || exit

mapfile -t chapters < <(ls *.transcription.json) 
delimiter=' '

for file in "${chapters[@]}"; do
    chapter=$(basename "$file" .transcription.json)
    book="${chapter%"$delimiter"*}"
    mv "$file" "$book/$chapter"
    mv "${chapter}.txt" "$book/$chapter"
done