import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const root = path.resolve(args.find((arg) => !arg.startsWith("--")) ?? process.cwd());
const dryRun = args.includes("--dry-run");
const padding = Number(args.find((arg) => arg.startsWith("--padding="))?.split("=")[1] ?? 0);
const threshold = Number(args.find((arg) => arg.startsWith("--threshold="))?.split("=")[1] ?? 10);

if (!Number.isInteger(padding) || padding < 0) {
  throw new Error("--padding deve ser um número inteiro maior ou igual a zero.");
}

if (!Number.isFinite(threshold) || threshold < 0) {
  throw new Error("--threshold deve ser um número maior ou igual a zero.");
}

async function findPngFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "node_modules") continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findPngFiles(fullPath));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".png") {
      files.push(fullPath);
    }
  }

  return files;
}

async function trimImage(file) {
  const image = sharp(file, { animated: false });
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) return null;

  const pipeline = sharp(file, { animated: false }).trim({
    threshold,
    background: null
  });

  if (padding > 0) {
    const { width, height } = await pipeline.clone().toBuffer({ resolveWithObject: true }).then(({ info }) => info);
    pipeline.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

  // Sem trim: a imagem continua com as dimensões originais.
  if (info.width === metadata.width && info.height === metadata.height) return null;

  return { metadata, data, info };
}

async function processImage(file) {
  try {
    const image = sharp(file, { animated: false });
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) return;

    let trimmed = image.trim({ threshold, background: null });

    if (padding > 0) {
      trimmed = trimmed.extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    }

    const result = await trimmed.png().toBuffer({ resolveWithObject: true });

    if (result.info.width === metadata.width && result.info.height === metadata.height) return;

    if (!dryRun) {
      await fs.writeFile(file, result.data);
    }

    const relative = path.relative(root, file);
    console.log(`${relative}: ${metadata.width}x${metadata.height} -> ${result.info.width}x${result.info.height}`);
  } catch (error) {
    console.error(`Erro em ${path.relative(root, file)}: ${error.message}`);
  }
}

async function main() {
  const stat = await fs.stat(root).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Diretório não encontrado: ${root}`);
  }

  const files = await findPngFiles(root);
  console.log(`Processando ${files.length} PNG(s) em ${root}${dryRun ? " (simulação)" : ""}\n`);

  for (const file of files) {
    await processImage(file);
  }

  console.log("\nConcluído.");
}

await main();
