#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const dryRun = process.argv.includes('--dry-run');

const textExtensions = new Set([
  '.sh', '.bash', '.zsh', '.env', '.env.example', '.env.local',
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.py', '.rb', '.php', '.java', '.cs', '.go', '.rs',
  '.json', '.jsonc', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.md', '.txt', '.csv', '.sql', '.xml', '.html', '.css', '.scss',
  '.less', '.vue', '.svelte', '.astro', '.ps1', '.bat', '.cmd'
]);

const skipDirectories = new Set([
  '.git', '.svn', '.hg', 'node_modules', '.venv', 'venv', 'dist', 'build',
  'coverage', '.idea', '.vscode', '__pycache__', 'tmp', 'temp'
]);

function isTextByExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ext && filePath.endsWith('Dockerfile')) return true;
  return textExtensions.has(ext) || ext === '' && filePath.endsWith('.gitignore');
}

function shouldSkipDirectory(dirName) {
  return skipDirectories.has(dirName);
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) continue;
      walk(fullPath, files);
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
}

function fixFile(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (buffer.includes(0)) {
    return { changed: false, skipped: true, reason: 'binary' };
  }

  if (!buffer.includes(13)) {
    return { changed: false, skipped: true, reason: 'no-cr' };
  }

  const original = buffer.toString('utf8');
  const normalized = original.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (normalized === original) {
    return { changed: false, skipped: true, reason: 'already-normalized' };
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, normalized, 'utf8');
  }

  return { changed: true, skipped: false, reason: 'fixed' };
}

function main() {
  if (!fs.existsSync(rootDir)) {
    console.error(`Diretório não encontrado: ${rootDir}`);
    process.exit(1);
  }

  const files = [];
  walk(rootDir, files);

  const textFiles = files.filter((file) => isTextByExtension(file));
  let changed = 0;
  let scanned = 0;

  for (const file of textFiles) {
    scanned += 1;
    const result = fixFile(file);

    if (result.changed) {
      changed += 1;
      console.log(`${dryRun ? '[DRY RUN]' : ''} ${path.relative(rootDir, file)} => CRLF/CR removidos`);
    }
  }

  console.log(`\nArquivos verificados: ${scanned}`);
  console.log(`Arquivos alterados: ${changed}`);
  console.log(dryRun ? 'Modo: dry-run (sem escrever arquivos).' : 'Modo: escrita real.');
}

main();
