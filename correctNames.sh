#!/bin/bash

jq -r '
  (.audioOverview.generationOptions.episodeFocus? // "")
  | match("cap[íi]tulo[^.]*\\.")?
  | select(.)
  | "\(input_filename): \(.string)"
' *.json | sort