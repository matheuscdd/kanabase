const fs = require('node:fs');
const crypto = require('node:crypto');

// Coloque aqui a lista dos capítulos do podcast.
// Formato esperado: 'aot-001-001-001. Você é aquilo que ama: adorar é humano'
// Ou deixe vazio para usar a leitura automática do nome dos arquivos.
const manualChapterList = [
    "hvj-001-001-001. O Mistério dos Heróis da Fé",
    "hvj-001-002-002. Jeronimo Savonarola (Precursor da Grande Reforma)",
    "hvj-001-003-003. Martinho Lutero (O Grande Reformador)",
    "hvj-001-004-004. João Bunyan (Sonhador Imortal)",
    "hvj-001-005-005. Jônatas Edwards (Grande despertador)",
    "hvj-001-006-006. João Wesley (Tocha Tirada do Fogo)",
    "hvj-001-007-007. Jorge Whitefield (Pregador ao Ar Livre)",
    "hvj-001-008-008. Daví Brainerd (Arauto aos Peles Vermelhas)",
    "hvj-001-009-009. Guilherme Carey (Pai das Missões Modernas)",
    "hvj-001-010-010. Christmas Evans (O \"João Bunyan de Gales\")",
    "hvj-001-011-011. Henrique Martin (Luz inteiramente Gasta por Deus)",
    "hvj-001-012-012. Adoniram Judson (Missionário, Pioneiro à Birmânia)",
    "hvj-001-013-013. Carlos Finney (Apóstolo de Avivamentos)",
    "hvj-001-014-014. O Salvador Espera e o Mundo Carece",
    "hvj-002-001-015. O Soluço de um Bilhão de Almas",
    "hvj-002-002-016. Jorge Muler (Apóstolo da Fé)",
    "hvj-002-003-017. Daví Livingstone (Célebre Missionário e Explorador)",
    "hvj-002-004-018. João Paton (Missionário aos Antropófagos)",
    "hvj-002-005-019. Hudson Taylor (O Pai da Missão do Interior da China)",
    "hvj-002-006-020. Carlos Spurgeon (O Príncipe dos Pregadores)",
    "hvj-002-007-021. Pastor Hsi (Amado Líder Chinês)",
    "hvj-002-008-022. Dwight Lyman Moody (Célebre Ganhador de Almas)",
    "hvj-002-009-023. Jônatas Goforth (\"Por Meu Espírito\")",
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
    const match = normalizedName.match(/^hvj-(\d+)-(\d+)-(\d+)(?:\.\s*(.*))?$/i);

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
        const match = item.match(/^hvj-(\d+)-(\d+)-(\d+)(?:\.\s*(.*))?$/i);

        if (!match) {
            throw new Error(`Capítulo inválido na lista manual: ${item}`);
        }

        const [, sectionIndex, internalSectionIndex, chapterNumber, title = ""] = match;
        const chapterKey = `${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
        const duration = rawDurations.find(x => {
            const fileName = x.file.split('/').at(-1).replace(/\.[^/.]+$/, '');
            return fileName === `hvj-${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
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
            return fileName === `hvj-${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
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
