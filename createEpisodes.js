const fs = require('node:fs');
const crypto = require('node:crypto');

// Coloque aqui a lista dos capítulos do podcast.
// Formato esperado: 'aot-001-001-001. Você é aquilo que ama: adorar é humano'
// Ou deixe vazio para usar a leitura automática do nome dos arquivos.
const manualChapterList = [
  "srt-001-001-001. O mundo em que se iniciou o adventismo",
  "srt-001-002-002. O grande despertamento adventista",
  "srt-001-003-003. O movimento milerita (1839-1844)",
  "srt-001-004-004. Depois do desapontamento",
  "srt-001-005-005. O uso da página impressa",
  "srt-001-006-006. Dificuldades prenunciam o nascimento da organização",
  "srt-001-007-007. Tornando-se reformadores de saúde",
  "srt-001-008-008. Iniciando um sistema educacional",
  "srt-001-009-009. Expressão mundial (1868-1885)",
  "srt-001-010-010. Crescimento organizacional (1884-1887)",
  "srt-001-011-011. Desenvolvimento doutrinário (1849-1888)",
  "srt-001-012-012. Justificação pela fé: Minneápolis e seus resultados",
  "srt-002-001-013. A expansão das instituições (1877-1900)",
  "srt-002-002-014. Avanço missionário (1887-1900)",
  "srt-002-003-015. Entrando no sul dos Estados Unidos",
  "srt-002-004-016. Problemas levam à desorganização",
  "srt-002-005-017. Novos inícios em meio à crise",
  "srt-002-006-018. O início da globalização",
  "srt-002-007-019. Novos desafios, novas instituições",
  "srt-002-008-020. Refinamentos organizacionais",
  "srt-002-009-021. Dando à trombeta um tom certo",
  "srt-002-010-022. Anos finais e o legado de Ellen G. White",
  "srt-002-011-023. Duas guerras mundiais afetam uma igreja",
  "srt-003-001-024. Desenvolvendo um ministério profissional",
  "srt-003-002-025. Enfrentando pressões financeiras",
  "srt-003-003-026. A igreja se depara com um mundo secularizado",
  "srt-003-004-027. Relações com outros cristãos",
  "srt-003-005-028. Consciência social do adventismo",
  "srt-003-006-029. O movimento da saúde",
  "srt-003-007-030. Unidade e diversidade",
  "srt-003-008-031. Adaptando-se às adversidades internacionais",
  "srt-003-009-032. Crescimento de membros no mundo em desenvolvimento",
  "srt-003-010-033. Evangelismo e missão global",
  "srt-003-011-034. Internacionalizando a forma de governo",
  "srt-004-001-035. Discussões doutrinárias e dissidências",
  "srt-004-002-036. O debate do século 20 sobre crenças fundamentais",
  "srt-004-003-037. Depois de um século e meio"
]

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
    const match = normalizedName.match(/^srt-(\d+)-(\d+)-(\d+)(?:\.\s*(.*))?$/i);

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
        const match = item.match(/^srt-(\d+)-(\d+)-(\d+)(?:\.\s*(.*))?$/i);

        if (!match) {
            throw new Error(`Capítulo inválido na lista manual: ${item}`);
        }

        const [, sectionIndex, internalSectionIndex, chapterNumber, title = ""] = match;
        const chapterKey = `${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
        const duration = rawDurations.find(x => {
            const fileName = x.file.split('/').at(-1).replace(/\.[^/.]+$/, '');
            return fileName === `srt-${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
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
            return fileName === `srt-${sectionIndex}-${internalSectionIndex}-${chapterNumber}`;
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
