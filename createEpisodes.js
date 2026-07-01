const fs = require('node:fs');

const podcastId = process.argv[2].trim();

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
    .map(x => ({...x, chapters: []}));

if (!sections.length) {
    throw new Error("Podcast sem seções");
}

const rawDurations = JSON.parse(fs.readFileSync("./podcasts/duration.json", "utf-8"))
    .filter(x => x.file.includes(podcast.path));

const durations = {};
const paths = {}
rawDurations.forEach(x => {
    const index = x.file.split('/').at(-1).split(' -')[0];
    durations[index] = x.duration
    paths[index] = x.file.slice(2);
});

const titles = [
    "1 - Strategic planning",
    "2 - Waging war",
    "3 - Strategic attack",
    "4 - Tactical dispositions",
    "5 - Energy",
    "6 - Weak points and strong points",
    "7 - Maneuvers",
    "8 - Variation of tactics",
    "9 - The army on the march",
    "10 - Terrain",
    "11 - The nine situations",
    "12 - Attack by fire",
    "13 - The use of spies",
    // "1 - Planejamento estatégico",
    // "2 - Conduzindo a guerra",
    // "3 - Ataque for estratégia",
    // "4 - Disposições táticas",
    // "5 - Energia",
    // "6 - Pontos fracos e fortes",
    // "7 - Manobras",
    // "8 - Variação de táticas",
    // "9 - O exército em marcha",
    // "10 - Terreno",
    // "11 - As noves situações",
    // "12 - O ataque pelo fogo",
    // "13 - O uso de espiões",
]

const results = []
titles.forEach(x => {
    const index = Number(x.split('-')[0].trim())
    const section = sections.find(x => index <= x.last);
    section.chapters.push(index);
    const order = section.chapters.indexOf(index) + 1;
    const id = crypto.randomUUID();
    const duration = durations[index];

    const result = {
        id,
        order,
        name: x,
        duration,
        sectionId: section.id,
        sectionName: section.name,
        podcastId: podcast.id,
        podcastName: podcast.name,
        audio: encodeURI(paths[index]),
        transcription: "",
        color: "#196c31"
    }

    results.push(result);
});

fs.writeFileSync(`podcasts/${crypto.randomUUID()}.json`, JSON.stringify(results));
