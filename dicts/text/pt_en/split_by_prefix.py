import json
import os
from collections import defaultdict

# Caminho do arquivo de entrada
INPUT_FILE = '_pt_en.json'
OUTPUT_DIR = '.'  # Pode ajustar se quiser salvar em outra pasta

# Carrega o dicionário
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Organiza as palavras por prefixo
prefix_dict = defaultdict(dict)
for word, value in data.items():
    prefix = (word[:3] + '-' * (3 - len(word[:3]))).lower()
    # Substitui qualquer caractere que não seja letra minúscula por '-'
    prefix = ''.join([c if c.isalpha() else '-' for c in prefix])
    prefix_dict[prefix][word] = value

# Salva cada prefixo em um arquivo separado
for prefix, entries in prefix_dict.items():
    filename = f'prefix-{prefix}.dict.json'
    filepath = os.path.join(OUTPUT_DIR, filename)
    print([filepath])
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

print(f'{len(prefix_dict)} arquivos criados.')
