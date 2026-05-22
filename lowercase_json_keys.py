import os
import json

# Caminho da pasta onde estão os arquivos JSON
PASTA = os.path.dirname(os.path.abspath(__file__))


# Função para converter apenas as chaves do primeiro nível para lowercase
def keys_to_lowercase_first_level(obj):
    if isinstance(obj, dict):
        return {k.lower(): v for k, v in obj.items()}
    else:
        return obj

# Percorre todos os arquivos .json na pasta
for nome_arquivo in os.listdir(PASTA):
    if nome_arquivo.endswith('.json'):
        caminho_arquivo = os.path.join(PASTA, nome_arquivo)
        with open(caminho_arquivo, 'r', encoding='utf-8') as f:
            try:
                dados = json.load(f)
            except Exception as e:
                print(f'Erro ao ler {nome_arquivo}: {e}')
                continue
        dados_lower = keys_to_lowercase_first_level(dados)
        with open(caminho_arquivo, 'w', encoding='utf-8') as f:
            json.dump(dados_lower, f, ensure_ascii=False, indent=2)
        print(f'Processado: {nome_arquivo}')
