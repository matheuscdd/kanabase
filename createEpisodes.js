const fs = require('node:fs');
const crypto = require('node:crypto');

// Coloque aqui a lista dos capítulos do podcast.
// Formato esperado: 'aot-001-001-001. Você é aquilo que ama: adorar é humano'
// Ou deixe vazio para usar a leitura automática do nome dos arquivos.
const manualChapterList = [
"zoy-001-001-001. Introdução",
"zoy-001-002-002. Andar no Espírito",
"zoy-001-003-003. Deixar a 'fera' sem alimento",
"zoy-002-001-004. Como os seres humanos funcionam?",
"zoy-002-002-005. Apresentar o corpo e renovar a mente",
"zoy-003-001-006. A guerra mais longa",
"zoy-003-002-007. A guerra mais ampla",
"zoy-003-003-008. A guerra mais profunda",
"zoy-003-004-009. Fragmentação sexual",
"zoy-003-005-010. A guerra mais sutil",
"zoy-004-001-011. Uma palavra aos homens jovens — solteiros, namorando e noivos",
"zoy-004-002-012. Uma palavra aos homens casados ​​— o cão de guarda e o animal enjaulado",
"zoy-004-003-013. Uma palavra aos homens casados ​​— a luxúria incômoda e a intimidade conjugal",
"zoy-005-001-014. A exortação final",
];

const podcastId = process.argv[2]?.trim();

if (!podcastId) {
    throw new Error("PodcastId não informado");
}

const podcast = JSON.parse(fs.readFileSync("./podcasts/podcasts.json", "utf-8"))
    .find(x => x.id === podcastId);
if (!podcast) {
    throw new Error("PodcastId não encontrado");
}

const sections = JSON.parse(fs.readFileSync("./podcasts/sections.json", "utf-8"))
    .filter(x => x.podcastId === podcastId)
    .map(x => ({ ...x, chapters: [] }));

if (!sections.length) {
    throw new Error("Podcast sem seções");
}

const rawDurations = JSON.parse(fs.readFileSync("./podcasts/duration.json", "utf-8"))
    .filter(x => x.file.includes(podcast.path));

const durations = {};
const paths = {};
const chapterEntries = [];

const addChapterFromFile = (x) => {
    const fileName = x.file.split('/').at(-1);
    const normalizedName = fileName.replace(/\.[^/.]+$/, '');
    const match = normalizedName.match(/^zoy-(\d+)-(\d+)-(\d+)(?:\.\s*(.*))?$/i);

    if (!match) {
        return;
    }

    const [, sectionIndex, internalSectionIndex, chapterNumber, title = ""] = match;
    const chapterKey = `${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
    const chapter = Number(chapterNumber);

    durations[chapterKey] = x.duration;
    paths[chapterKey] = x.file.slice(2);

    chapterEntries.push({
        chapterKey,
        sectionIndex: Number(sectionIndex),
        internalSectionIndex: Number(internalSectionIndex),
        chapter,
        title: title.trim(),
    });
};

if (manualChapterList.length) {
    manualChapterList.forEach(item => {
        const match = item.match(/^zoy-(\d+)-(\d+)-(\d+)(?:\.\s*(.*))?$/i);

        if (!match) {
            throw new Error(`Capítulo inválido na lista manual: ${item}`);
        }

        const [, sectionIndex, internalSectionIndex, chapterNumber, title = ""] = match;
        const chapterKey = `${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
        const duration = rawDurations.find(x => {
            const fileName = x.file.split('/').at(-1).replace(/\.[^/.]+$/, '');
            return fileName === `zoy-${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
        })?.duration;

        chapterEntries.push({
            chapterKey,
            sectionIndex: Number(sectionIndex),
            internalSectionIndex: Number(internalSectionIndex),
            chapter: Number(chapterNumber),
            title: title.trim(),
            duration,
        });

        if (duration) {
            durations[chapterKey] = duration;
        }

        const matchingPath = rawDurations.find(x => {
            const fileName = x.file.split('/').at(-1).replace(/\.[^/.]+$/, '');
            return fileName === `zoy-${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
        })?.file;

        if (matchingPath) {
            paths[chapterKey] = matchingPath.slice(2);
        }
    });
} else {
    rawDurations.forEach(addChapterFromFile);
}

const results = chapterEntries
    .sort((a, b) => {
        if (a.sectionIndex !== b.sectionIndex) {
            return a.sectionIndex - b.sectionIndex;
        }

        if (a.internalSectionIndex !== b.internalSectionIndex) {
            return a.internalSectionIndex - b.internalSectionIndex;
        }

        return a.chapter - b.chapter;
    })
    .map(entry => {
        const section = sections.find(x => Number(x.order) === entry.sectionIndex) || sections[0];

        const result = {
            id: crypto.randomUUID(),
            order: entry.internalSectionIndex,
            name: `${entry.chapter} - ${entry.title}`.trim(),
            duration: durations[entry.chapterKey],
            sectionId: section.id,
            sectionName: section.name,
            podcastId: podcast.id,
            podcastName: podcast.name,
            audio: encodeURI(paths[entry.chapterKey]),
            transcription: "",
            color: "#196c31"
        };

        return result;
    });

fs.writeFileSync(`podcasts/${crypto.randomUUID()}.json`, JSON.stringify(results, null, 2));
