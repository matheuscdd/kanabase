#!/bin/bash

find . -type f -name "*.webm" -print0 | while IFS= read -r -d '' file; do
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
        echo "Já está no Git: $file"
    else
        echo "Adicionando: $file"

        git add "$file"

        if git diff --cached --quiet; then
            echo "Nenhuma alteração para commit: $file"
            continue
        fi

        git commit -m "Add $(basename "$file")"
        git push

        if [ $? -ne 0 ]; then
            echo "Erro no push. Interrompendo."
            exit 1
        fi
    fi
done