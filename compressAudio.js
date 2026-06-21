const fs = require("node:fs");
const path = require("node:path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const inputDir = process.argv[2];

if (!inputDir) {
  console.log("❌ Use: node compressAudio.js <pasta>");
  process.exit(1);
}

const BITRATE = "64k";
const CHANNELS = 1;
const EXTENSIONS = [".m4a", ".mp3", ".wav"];

let queue = [];

function collectFiles(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      collectFiles(fullPath);
    } else if (EXTENSIONS.includes(path.extname(file).toLowerCase())) {
      const parsedPath = path.parse(fullPath);
      const output = path.join(parsedPath.dir, `${parsedPath.name}.webm`);

      if (!fs.existsSync(output)) {
        queue.push({ input: fullPath, output });
      }
    }
  });
}

function runQueue() {
  if (queue.length === 0) {
    console.log("🎉 Tudo convertido!");
    return;
  }

  const file = queue.shift();

  console.log(`🎧 Convertendo (${queue.length} restantes):`, file.input);

  ffmpeg(file.input)
    .audioCodec("libopus")
    .audioBitrate(BITRATE)
    .audioChannels(CHANNELS)
    .audioFrequency(48000)
    .audioFilters('pan=mono|c0=0.5*c0+0.5*c1')
    .format("webm")
    .on("progress", p => {
      if (p.percent) {
        process.stdout.write(`⏳ ${p.percent.toFixed(1)}%   \r`);
      }
    })
    .on("end", () => {
      console.log("\n✅ OK:", file.output);
      runQueue();
    })
    .on("error", err => {
      console.log("\n❌ Erro:", err.message);
      runQueue();
    })
    .save(file.output);
}

collectFiles(path.resolve(inputDir));

console.log(`📂 ${queue.length} arquivos para converter\n`);

runQueue();