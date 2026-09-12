const fs = require('node:fs');
const crypto = require('node:crypto');

// Coloque aqui a lista dos capítulos do podcast.
// Formato esperado: 'aot-001-001-001. Você é aquilo que ama: adorar é humano'
// Ou deixe vazio para usar a leitura automática do nome dos arquivos.
const manualChapterList = [
    'aot-001-001-001. Você é aquilo que ama: adorar é humano',
    'aot-001-002-002. Você pode não amar aquilo que acredita amar: aprendendo a ler as liturgias "seculares"',
    'aot-002-001-003. O espírito o encontra onde você estiver: adoração histórica para uma era pós-moderna',
    'aot-002-002-004. Em que história você está inserido? O arco narrativo da adoração cristã formadora',
    'aot-003-001-005. Guarde seu coração: as liturgias do lar',
    'aot-003-002-006. Ensine bem seus filhos: aprendendo de cor',
    'aot-003-003-007. Você faz o que deseja: liturgias',
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
    const match = normalizedName.match(/^aot-(\d+)-(\d+)-(\d+)(?:\.\s*(.*))?$/i);

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
        const match = item.match(/^aot-(\d+)-(\d+)-(\d+)(?:\.\s*(.*))?$/i);

        if (!match) {
            throw new Error(`Capítulo inválido na lista manual: ${item}`);
        }

        const [, sectionIndex, internalSectionIndex, chapterNumber, title = ""] = match;
        const chapterKey = `${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
        const duration = rawDurations.find(x => {
            const fileName = x.file.split('/').at(-1).replace(/\.[^/.]+$/, '');
            return fileName === `aot-${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
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
            return fileName === `aot-${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
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
            order: entry.chapter,
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

        section.chapters.push(entry.chapter);
        return result;
    });

fs.writeFileSync(`podcasts/${crypto.randomUUID()}.json`, JSON.stringify(results, null, 2));
