const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFile, spawn } = require("node:child_process");
const ffmpegPath = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");

const ffprobePath =
  ffprobeStatic.path ||
  path.join(path.dirname(ffmpegPath), process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
const ESCAPED_DRIVE_SEPARATOR = String.raw`\:`;
const ESCAPED_SINGLE_QUOTE = String.raw`'\''`;

function showUsage() {
  console.log("Use: node concatMp3.js <saida.mp3> <entrada1.mp3> <entrada2.mp3> [...]");
  console.log("Exemplo: node concatMp3.js final.mp3 parte1.mp3 parte2.mp3 parte3.mp3");
}

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
          return;
        }

        resolve({ stdout, stderr });
      }
    );
  });
}

function toComparablePath(filePath) {
  const resolvedPath = path.resolve(filePath);
  return process.platform === "win32" ? resolvedPath.toLowerCase() : resolvedPath;
}

function parseTimestamp(value) {
  const parts = value.split(":");

  if (parts.length !== 3) {
    return 0;
  }

  return (
    Number.parseFloat(parts[0]) * 3600 +
    Number.parseFloat(parts[1]) * 60 +
    Number.parseFloat(parts[2])
  );
}

function normalizeArgs(argv) {
  if (argv.includes("-h") || argv.includes("--help")) {
    showUsage();
    process.exit(0);
  }

  if (argv.length < 3) {
    showUsage();
    throw new Error("Informe o arquivo de saida e pelo menos dois MP3s de entrada.");
  }

  const outputPath = path.resolve(argv[0]);
  const inputPaths = argv.slice(1).map(filePath => path.resolve(filePath));

  if (path.extname(outputPath).toLowerCase() !== ".mp3") {
    throw new Error("O arquivo de saida precisa terminar com .mp3.");
  }

  if (fs.existsSync(outputPath)) {
    throw new Error(`O arquivo de saida ja existe: ${outputPath}`);
  }

  const outputComparable = toComparablePath(outputPath);

  inputPaths.forEach(inputPath => {
    if (path.extname(inputPath).toLowerCase() !== ".mp3") {
      throw new Error(`A entrada nao e um MP3: ${inputPath}`);
    }

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Arquivo nao encontrado: ${inputPath}`);
    }

    const stat = fs.statSync(inputPath);

    if (!stat.isFile()) {
      throw new Error(`A entrada nao e um arquivo: ${inputPath}`);
    }

    if (toComparablePath(inputPath) === outputComparable) {
      throw new Error("O arquivo de saida nao pode ser um dos arquivos de entrada.");
    }
  });

  return { outputPath, inputPaths };
}

async function probeMp3(filePath) {
  const { stdout } = await execFileAsync(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  const data = JSON.parse(stdout);
  const audioStream = (data.streams || []).find(stream => stream.codec_type === "audio");

  if (!audioStream) {
    throw new Error(`O arquivo nao possui stream de audio: ${filePath}`);
  }

  if (audioStream.codec_name !== "mp3") {
    throw new Error(`O arquivo nao pode ser concatenado sem recodificar: ${filePath}`);
  }

  const durationSeconds = Number.parseFloat(data.format?.duration || audioStream.duration || "0");

  return {
    filePath,
    durationSeconds,
    signature: [
      audioStream.codec_name || "",
      audioStream.sample_rate || "",
      audioStream.channels || "",
      audioStream.channel_layout || "",
      audioStream.sample_fmt || "",
    ].join("|"),
    details: {
      codec: audioStream.codec_name || "desconhecido",
      sampleRate: audioStream.sample_rate || "desconhecido",
      channels: audioStream.channels || "desconhecido",
      channelLayout: audioStream.channel_layout || "desconhecido",
      sampleFormat: audioStream.sample_fmt || "desconhecido",
    },
  };
}

function validateCompatibility(files) {
  const [reference, ...rest] = files;
  const mismatches = rest.filter(file => file.signature !== reference.signature);

  if (mismatches.length === 0) {
    return;
  }

  const formatDetails = file => {
    return [
      `codec=${file.details.codec}`,
      `sampleRate=${file.details.sampleRate}`,
      `channels=${file.details.channels}`,
      `layout=${file.details.channelLayout}`,
      `sampleFmt=${file.details.sampleFormat}`,
    ].join(", ");
  };

  const lines = [
    "Os MP3s nao sao compativeis para concatenacao sem perda.",
    `Referencia: ${reference.filePath} (${formatDetails(reference)})`,
  ];

  mismatches.forEach(file => {
    lines.push(`Incompativel: ${file.filePath} (${formatDetails(file)})`);
  });

  throw new Error(lines.join("\n"));
}

function escapeConcatPath(filePath, baseDir) {
  const absolutePath = path.resolve(filePath);
  const baseRoot = path.parse(baseDir).root;
  const fileRoot = path.parse(absolutePath).root;

  let concatPath =
    baseRoot.toLowerCase() === fileRoot.toLowerCase()
      ? path.relative(baseDir, absolutePath)
      : absolutePath;

  concatPath = concatPath.split(path.sep).join("/");
  concatPath = concatPath.replaceAll(":", ESCAPED_DRIVE_SEPARATOR);
  concatPath = concatPath.replaceAll("'", ESCAPED_SINGLE_QUOTE);

  return concatPath;
}

async function createConcatFile(inputPaths) {
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "concat-mp3-"));
  const concatFilePath = path.join(tempDir, "inputs.txt");
  const contents = inputPaths
    .map(filePath => `file '${escapeConcatPath(filePath, tempDir)}'`)
    .join("\n");

  await fsp.writeFile(concatFilePath, `${contents}\n`, "utf8");

  return { tempDir, concatFilePath };
}

function runConcat(concatFilePath, outputPath, totalDurationSeconds) {
  return new Promise((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-progress",
      "pipe:1",
      "-nostats",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFilePath,
      "-c",
      "copy",
      outputPath,
    ];

    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let progressShown = false;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", chunk => {
      stdoutBuffer += chunk;

      while (stdoutBuffer.includes("\n")) {
        const lineBreakIndex = stdoutBuffer.indexOf("\n");
        const line = stdoutBuffer.slice(0, lineBreakIndex).trim();

        stdoutBuffer = stdoutBuffer.slice(lineBreakIndex + 1);

        if (!line.startsWith("out_time=")) {
          continue;
        }

        const currentSeconds = parseTimestamp(line.slice("out_time=".length));

        if (totalDurationSeconds <= 0 || Number.isNaN(currentSeconds)) {
          continue;
        }

        const percent = Math.min((currentSeconds / totalDurationSeconds) * 100, 100);

        progressShown = true;
        process.stdout.write(`Progresso: ${percent.toFixed(1)}%   \r`);
      }
    });

    child.stderr.on("data", chunk => {
      stderrBuffer += chunk;
    });

    child.on("error", error => {
      reject(error);
    });

    child.on("close", code => {
      if (progressShown) {
        process.stdout.write("\n");
      }

      if (code === 0) {
        resolve();
        return;
      }

      const error = new Error(stderrBuffer.trim() || "Falha ao juntar os MP3s.");
      reject(error);
    });
  });
}

async function cleanupTempDir(tempDir) {
  if (!tempDir) {
    return;
  }

  await fsp.rm(tempDir, { recursive: true, force: true });
}

async function main() {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new Error("ffmpeg nao encontrado. Rode npm install antes de usar este script.");
  }

  if (!fs.existsSync(ffprobePath)) {
    throw new Error("ffprobe nao encontrado ao lado do ffmpeg-static.");
  }

  const { outputPath, inputPaths } = normalizeArgs(process.argv.slice(2));

  await fsp.mkdir(path.dirname(outputPath), { recursive: true });

  console.log(`Validando ${inputPaths.length} MP3s...`);

  const files = await Promise.all(inputPaths.map(probeMp3));
  validateCompatibility(files);

  const totalDurationSeconds = files.reduce((sum, file) => sum + file.durationSeconds, 0);
  const { tempDir, concatFilePath } = await createConcatFile(inputPaths);

  try {
    console.log(`Juntando ${inputPaths.length} arquivos em ${outputPath}`);
    await runConcat(concatFilePath, outputPath, totalDurationSeconds);
    console.log(`Arquivo criado com sucesso: ${outputPath}`);
  } catch (error) {
    if (fs.existsSync(outputPath)) {
      await fsp.rm(outputPath, { force: true });
    }

    throw error;
  } finally {
    await cleanupTempDir(tempDir);
  }
}

main().catch(error => {
  console.error(`Erro: ${error.message}`);
  process.exit(1);
});