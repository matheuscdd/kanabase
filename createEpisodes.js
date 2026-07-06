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
    "1 - In a tight spot with atheism",
    "2 - God: a doubt, a certainty, a distortion",
    "3 - I do question it, so what?",
    "4 - Do you know what you (dis)believe in?",
    "5 - Decoding Homer Simpson",
    "6 - Questioning the university",
    "7 - The superstitions and the delusions",
    "8 - Living with uncertainty",
    "9 - The origins of atheism",
    "10 - Atheism in antiquity",
    "11 - When believers become criminals",
    "12 - The incoherence of faith",
    "13 - Witch hunt",
    "14 - Is it worth talking about God?",
    "15 - No one escapes transcendence",
    "16 - Rational intuition",
    "17 - Touched by the absurd",
    "18 - The open, closed, and isolated systems",
    "19 - The meaning of it all",
    "20 - The supermarket of faith",
    "21 - The being and the existing",
    "22 - Is anyone up there?",
    "23 - The improbability of God",
    "24 - Why do we exist?",
    "25 - Do moral values exist?",
    "26 - Deus Absconditus",
    "27 - Deus Revelatus",
    "28 - The uniqueness of christianity",
    "29 - The church: who needs it?",
    "30 - The pain of sobriety",
    "31 - Jesus Christ: myth or reality?",
    "32 - Do miracles exist?",
    "33 - What about the Bible?",
    "34 - Unearthing the truth",
    "35 - Is God genocidal?",
    "36 - God and suffering",
    "37 - Is there logic in pain?",
    "38 - A narrative for chaos",
]

const results = []
titles.forEach(x => {
    const index = Number(x.split('-')[0].trim());
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
