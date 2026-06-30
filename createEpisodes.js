const fs = require('node:fs');

const podcastId = process.argv[2];
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
    "1 - Deus conosco",
    "2 - O povo escolhido",
    "3 - A plenitude dos tempos",
    "4 - Hoje vos nasceu o Salvador",
    "5 - A dedicação",
    "6 - Vimos a sua estrela",
    "7 - Em criança",
    "8 - A visita pascoal",
    "9 - Dias de luta",
    "10 - A voz do deserto",
    "11 - O batismo",
    "12 - A tentação",
    "13 - A vitória",
    "14 - Achamos o Messias",
    "15 - Nas bodas",
    "16 - Em seu templo",
    "17 - Nicodemos",
    "18 - É necessário que ele cresça",
    "19 - Junto ao poço de Jacó",
    "20 - Se não virdes sinais e milagres",
    "21 - Betesda e o Sinédrio",
    "22 - Prisão e morte de João Batista",
    "23 - O reino de Deus está próximo",
    "24 - Não é este o filho do carpinteiro?",
    "25 - O chamado à beira-mar",
    "26 - Em Cafarnaum",
    "27 - Podes tornar-me limpo",
    "28 - Levi Mateus",
    "29 - O Sábado",
    "30 - Nomeou doze",
    "31 - O sermão da montanha",
    "32 - O centurião",
    "33 - Quem são meus irmãos?",
    "34 - O convite",
    "35 - Cala-te, aquieta-te",
    "36 - O toque da fé",
    "37 - Os primeiros evangelistas",
    "38 - Vinde e repousai um pouco",
    "39 - Dai-lhes vós de comer",
    "40 - Uma noite no lago",
    "41 - A crise na Galiléia",
    "42 - Tradição",
    "43 - Barreiras derrubadas",
    "44 - O verdadeiro sinal",
    "45 - A previsão da cruz",
    "46 - A transfiguração",
    "47 - Nada vos será impossível",
    "48 - Quem é o maior?",
    "49 - Na festa dos tabernáculos",
    "50 - Por entre laços",
    "51 - A luz da vida",
    "52 - O divino pastor",
    "53 - A última jornada da Galiléia",
    "54 - O bom samaritano",
    "55 - Não com aparência exterior",
    "56 - Deixai vir a mim os pequeninos",
    "57 - Uma coisa te falta",
    "58 - Lázaro, sai para fora",
    "59 - Os sacerdotes tramam",
    "60 - A lei do novo reino",
    "61 - Zaqueu",
    "62 - O banquete em casa de Simão",
    "63 - Eis que o teu rei virá",
    "64 - Um povo condenado",
    "65 - O templo novamente purificado",
    "66 - Conflito",
    "67 - Ais sobre os fariseus",
    "68 - No pátio",
    "69 - O Monte das Oliveiras",
    "70 - Um destes meus pequeninos irmãos",
    "71 - Servo dos servos",
    "72 - Em memória de mim",
    "73 - Não se turbe o vosso coração",
    "74 - Getsêmani",
    "75 - Perante Anás e o tribunal de Caifás",
    "76 - Judas",
    "77 - Na sala de julgamento de Pilatos",
    "78 - O Calvário",
    "79 - Está consumado",
    "80 - No sepulcro de José",
    "81 - O Senhor ressuscitou",
    "82 - Por que choras?",
    "83 - A viagem para Emaús",
    "84 - Paz seja convosco",
    "85 - Mais uma vez à beira-mar",
    "86 - Ide, ensinai a todas as nações",
    "87 - Para meu Pai e vosso Pai"
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

fs.writeFileSync(`${crypto.randomUUID()}.json`, JSON.stringify(results));
