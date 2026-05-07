#!/bin/bash

cd 'podcasts/en/Deep Dive - Bible' || exit
mapfile -t books < <(ls)

delimiter='.webm'

for book in "${books[@]}"; do
    mapfile -t chapters < <(ls "$book")

    for chapter in "${chapters[@]}"; do
        name=${chapter%%"$delimiter"*}
        mkdir "$book/$name"
        mv "$book/$chapter" "$book/$name"
    done
done