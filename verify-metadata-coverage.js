const fs = require('node:fs/promises');
const path = require('node:path');

const METADATA_SUFFIX = ' metadata.json';
const READY_STATUS = 'ARTIFACT_STATUS_READY';

const BOOKS = [
  ['Gênesis', 50],
  ['Êxodo', 40],
  ['Levítico', 27],
  ['Números', 36],
  ['Deuteronômio', 34],
  ['Josué', 24],
  ['Juízes', 21],
  ['Rute', 4],
  ['1 Samuel', 31],
  ['2 Samuel', 24],
  ['1 Reis', 22],
  ['2 Reis', 25],
  ['1 Crônicas', 29],
  ['2 Crônicas', 36],
  ['Esdras', 10],
  ['Neemias', 13],
  ['Ester', 10],
  ['Jó', 42],
  ['Salmos', 150],
  ['Provérbios', 31],
  ['Eclesiastes', 12],
  ['Cânticos', 8],
  ['Isaías', 66],
  ['Jeremias', 52],
  ['Lamentações', 5],
  ['Ezequiel', 48],
  ['Daniel', 12],
  ['Oséias', 14],
  ['Joel', 3],
  ['Amós', 9],
  ['Obadias', 1],
  ['Jonas', 4],
  ['Miquéias', 7],
  ['Naum', 3],
  ['Habacuque', 3],
  ['Sofonias', 3],
  ['Ageu', 2],
  ['Zacarias', 14],
  ['Malaquias', 4],
  ['Mateus', 28],
  ['Marcos', 16],
  ['Lucas', 24],
  ['João', 21],
  ['Atos', 28],
  ['Romanos', 16],
  ['1 Coríntios', 16],
  ['2 Coríntios', 13],
  ['Gálatas', 6],
  ['Efésios', 6],
  ['Filipenses', 4],
  ['Colossenses', 4],
  ['1 Tessalonicenses', 5],
  ['2 Tessalonicenses', 3],
  ['1 Timóteo', 6],
  ['2 Timóteo', 4],
  ['Tito', 3],
  ['Filemon', 1],
  ['Hebreus', 13],
  ['Tiago', 5],
  ['1 Pedro', 5],
  ['2 Pedro', 3],
  ['1 João', 5],
  ['2 João', 1],
  ['3 João', 1],
  ['Judas', 1],
  ['Apocalipse', 22]
];

const PROVERBS_SEGMENTS = [
  '1',
  '2',
  '3:1-10',
  '3:11-20',
  '3:21-35',
  '4:1-9',
  '4:10-19',
  '4:20-27',
  '5',
  '6:1-11',
  '6:12-19',
  '6:20-35',
  '7:1-9',
  '7:10-20',
  '7:21-27',
  '8',
  '9',
  '10:1-10',
  '10:11-21',
  '10:22-32',
  '11:1-10',
  '11:11-20',
  '11:21-31',
  '12:1-10',
  '12:11-20',
  '12:21-28',
  '13:1-10',
  '13:11-19',
  '13:20-25',
  '14:1-10',
  '14:11-21',
  '14:22-35',
  '15:1-10',
  '15:11-20',
  '15:21-33',
  '16:1-10',
  '16:11-20',
  '16:21-33',
  '17:1-10',
  '17:11-20',
  '17:21-28',
  '18:1-10',
  '18:11-24',
  '19:1-10',
  '19:11-20',
  '19:21-29',
  '20:1-10',
  '20:11-20',
  '20:21-30',
  '21:1-10',
  '21:11-20',
  '21:21-28',
  '22:1-10',
  '22:11-16',
  '22:17-29',
  '23:1-11',
  '23:12-18',
  '23:19-35',
  '24:1-9',
  '24:10-22',
  '24:23-34',
  '25:1-10',
  '25:11-17',
  '25:18-28',
  '26:1-10',
  '26:11-20',
  '26:21-28',
  '27:1-10',
  '27:11-19',
  '27:20-27',
  '28:1-10',
  '28:11-20',
  '28:21-28',
  '29:1-10',
  '29:11-20',
  '29:21-27',
  '30:1-10',
  '30:11-20',
  '30:21-33',
  '31:1-9',
  '31:10-31'
];

const CHAPTER_COUNTS = new Map(BOOKS);
const BOOK_NAMES_DESC = BOOKS.map(([book]) => book).sort((left, right) => right.length - left.length);
const PROVERBS_SEGMENT_SET = new Set(PROVERBS_SEGMENTS);

function isParsedReference(reference) {
  return Boolean(reference && !reference.error);
}

function listExpectedUnits(book) {
  if (book === 'Provérbios') {
    return PROVERBS_SEGMENTS;
  }

  const chapterCount = CHAPTER_COUNTS.get(book);
  return Array.from({ length: chapterCount }, (_, index) => String(index + 1));
}

function buildReferenceKey(reference) {
  return `${reference.book}|${reference.unit}`;
}

function formatReference(book, unit) {
  return book === 'Provérbios' ? `${book} ${unit}` : `${book} ${unit}`;
}

function matchBook(rawReference) {
  for (const book of BOOK_NAMES_DESC) {
    if (rawReference === book) {
      return { book, remainder: '' };
    }

    const prefix = `${book} `;
    if (rawReference.startsWith(prefix)) {
      return { book, remainder: rawReference.slice(prefix.length) };
    }
  }

  return null;
}

function parseReference(rawReference, sourceLabel) {
  const trimmed = rawReference.trim();
  const match = matchBook(trimmed);

  if (!match) {
    return { error: `Livro não reconhecido em ${sourceLabel}: ${rawReference}` };
  }

  const { book, remainder } = match;
  const chapterCount = CHAPTER_COUNTS.get(book);

  if (book === 'Provérbios') {
    if (!remainder) {
      return { error: `Referência ausente para Provérbios em ${sourceLabel}: ${rawReference}` };
    }

    if (/^\d+$/.test(remainder)) {
      return {
        book,
        kind: 'proverbs',
        unit: String(Number(remainder)),
        form: 'chapter'
      };
    }

    if (/^\d+[_:]\d+-\d+$/.test(remainder)) {
      return {
        book,
        kind: 'proverbs',
        unit: remainder.replace('_', ':'),
        form: 'segment'
      };
    }

    return { error: `Segmento inválido de Provérbios em ${sourceLabel}: ${rawReference}` };
  }

  if (!remainder) {
    if (chapterCount === 1) {
      return {
        book,
        kind: 'chapter',
        chapter: 1,
        unit: '1',
        form: 'book-only'
      };
    }

    return { error: `Capítulo ausente em ${sourceLabel}: ${rawReference}` };
  }

  if (!/^\d+$/.test(remainder)) {
    return { error: `Capítulo inválido em ${sourceLabel}: ${rawReference}` };
  }

  const chapter = Number(remainder);

  return {
    book,
    kind: 'chapter',
    chapter,
    unit: String(chapter),
    form: 'numbered'
  };
}

function isExpectedReference(reference) {
  if (reference.book === 'Provérbios') {
    return PROVERBS_SEGMENT_SET.has(reference.unit);
  }

  const chapterCount = CHAPTER_COUNTS.get(reference.book);
  return reference.chapter >= 1 && reference.chapter <= chapterCount;
}

function sortRecordsByFileName(records) {
  return [...records].sort((left, right) => left.fileName.localeCompare(right.fileName, 'pt-BR', { numeric: true }));
}

function classifyDuplicateGroup(book, records) {
  if (records.length <= 1) {
    return null;
  }

  if (CHAPTER_COUNTS.get(book) !== 1) {
    return { kind: 'duplicate' };
  }

  const countsByForm = new Map();

  for (const record of records) {
    const form = isParsedReference(record.filenameReference) ? record.filenameReference.form : 'unknown';
    countsByForm.set(form, (countsByForm.get(form) || 0) + 1);
  }

  const numberedCount = countsByForm.get('numbered') || 0;
  const bookOnlyCount = countsByForm.get('book-only') || 0;
  const otherCount = records.length - numberedCount - bookOnlyCount;

  if (numberedCount === 1 && bookOnlyCount === 1 && otherCount === 0 && records.length === 2) {
    return { kind: 'alias' };
  }

  return { kind: 'duplicate' };
}

async function loadRecord(directoryPath, fileName) {
  const filePath = path.join(directoryPath, fileName);
  const rawReference = fileName.slice(0, -METADATA_SUFFIX.length);
  const filenameReference = parseReference(rawReference, `filename ${fileName}`);

  let jsonData = null;
  let jsonError = null;

  try {
    const content = await fs.readFile(filePath, 'utf8');
    jsonData = JSON.parse(content);
  } catch (error) {
    jsonError = error instanceof Error ? error.message : String(error);
  }

  let titleReference = null;
  let titleError = null;
  let rawTitle = null;

  if (jsonData) {
    rawTitle = typeof jsonData.title === 'string' ? jsonData.title.trim() : null;
    if (!rawTitle) {
      titleError = 'Campo "title" ausente ou inválido';
    } else {
      titleReference = parseReference(rawTitle, `title ${fileName}`);
    }
  }

  const chosenReference = isParsedReference(titleReference)
    ? titleReference
    : isParsedReference(filenameReference)
      ? filenameReference
      : null;

  const mismatch = isParsedReference(filenameReference)
    && isParsedReference(titleReference)
    && buildReferenceKey(filenameReference) !== buildReferenceKey(titleReference);

  return {
    fileName,
    filePath,
    rawReference,
    rawTitle,
    filenameReference,
    titleReference,
    chosenReference,
    mismatch,
    jsonError,
    titleError,
    status: jsonData && typeof jsonData.status === 'string' ? jsonData.status : null
  };
}

async function collectRecords(directoryPath) {
  const directoryEntries = await fs.readdir(directoryPath, { withFileTypes: true });
  const metadataFiles = directoryEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(METADATA_SUFFIX))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'pt-BR', { numeric: true }));

  const records = await Promise.all(metadataFiles.map((fileName) => loadRecord(directoryPath, fileName)));
  return { metadataFiles, records };
}

function analyzeRecords(records) {
  const groupedRecords = new Map();
  const issues = {
    jsonParse: [],
    filenameParse: [],
    titleParse: [],
    status: [],
    mismatches: [],
    missing: [],
    unexpected: [],
    duplicates: [],
    aliasWarnings: []
  };

  for (const record of records) {
    if (record.jsonError) {
      issues.jsonParse.push({ fileName: record.fileName, message: record.jsonError });
    }

    if (!isParsedReference(record.filenameReference)) {
      issues.filenameParse.push({ fileName: record.fileName, message: record.filenameReference.error });
    }

    if (record.titleError) {
      issues.titleParse.push({ fileName: record.fileName, message: record.titleError });
    } else if (!isParsedReference(record.titleReference)) {
      issues.titleParse.push({ fileName: record.fileName, message: record.titleReference.error });
    }

    if (record.status !== READY_STATUS) {
      issues.status.push({ fileName: record.fileName, status: record.status || '(ausente)' });
    }

    if (record.mismatch) {
      issues.mismatches.push({
        fileName: record.fileName,
        fileReference: formatReference(record.filenameReference.book, record.filenameReference.unit),
        titleReference: formatReference(record.titleReference.book, record.titleReference.unit)
      });
    }

    if (!record.chosenReference) {
      continue;
    }

    const bookGroups = groupedRecords.get(record.chosenReference.book) || new Map();
    const referenceKey = record.chosenReference.unit;
    const referenceGroup = bookGroups.get(referenceKey) || [];

    referenceGroup.push(record);
    bookGroups.set(referenceKey, referenceGroup);
    groupedRecords.set(record.chosenReference.book, bookGroups);
  }

  const bookSummaries = [];

  for (const [book, chapterCount] of BOOKS) {
    const expectedUnits = listExpectedUnits(book);
    const expectedUnitSet = new Set(expectedUnits);
    const bookGroups = groupedRecords.get(book) || new Map();
    const missingUnits = [];
    const unexpectedUnits = [];
    const duplicateUnits = [];
    const aliasUnits = [];

    for (const expectedUnit of expectedUnits) {
      const group = bookGroups.get(expectedUnit) || [];

      if (group.length === 0) {
        missingUnits.push(expectedUnit);
        issues.missing.push({ book, unit: expectedUnit });
        continue;
      }

      const classification = classifyDuplicateGroup(book, group);
      if (!classification) {
        continue;
      }

      if (classification.kind === 'alias') {
        aliasUnits.push({ unit: expectedUnit, records: sortRecordsByFileName(group) });
        issues.aliasWarnings.push({ book, unit: expectedUnit, records: sortRecordsByFileName(group) });
      } else {
        duplicateUnits.push({ unit: expectedUnit, records: sortRecordsByFileName(group) });
        issues.duplicates.push({ book, unit: expectedUnit, records: sortRecordsByFileName(group) });
      }
    }

    for (const [actualUnit, group] of bookGroups.entries()) {
      if (expectedUnitSet.has(actualUnit)) {
        continue;
      }

      unexpectedUnits.push({ unit: actualUnit, records: sortRecordsByFileName(group) });
      issues.unexpected.push({ book, unit: actualUnit, records: sortRecordsByFileName(group) });
    }

    const hasCoverage = missingUnits.length === 0;
    const isClean = hasCoverage && unexpectedUnits.length === 0 && duplicateUnits.length === 0;

    bookSummaries.push({
      book,
      chapterCount,
      expectedCount: expectedUnits.length,
      foundCount: bookGroups.size,
      hasCoverage,
      isClean,
      missingUnits,
      unexpectedUnits,
      duplicateUnits,
      aliasUnits
    });
  }

  return { groupedRecords, issues, bookSummaries };
}

function printLine(text = '') {
  process.stdout.write(`${text}\n`);
}

function printIssueSection(title, rows, formatter) {
  printLine(title);

  if (rows.length === 0) {
    printLine('  - nenhum');
    printLine();
    return;
  }

  for (const row of rows) {
    printLine(`  - ${formatter(row)}`);
  }

  printLine();
}

function printSummary(metadataFiles, analysis) {
  const coverageComplete = analysis.bookSummaries.filter((summary) => summary.hasCoverage).length;
  const cleanBooks = analysis.bookSummaries.filter((summary) => summary.isClean).length;
  const proverbsSummary = analysis.bookSummaries.find((summary) => summary.book === 'Provérbios');

  printLine('Verificacao de cobertura dos metadata.json');
  printLine('=====================================');
  printLine(`Arquivos metadata.json lidos: ${metadataFiles.length}`);
  printLine(`Livros com cobertura completa: ${coverageComplete}/${BOOKS.length}`);
  printLine(`Livros sem extras/duplicatas: ${cleanBooks}/${BOOKS.length}`);
  printLine(`Provérbios segmentos esperados: ${proverbsSummary ? proverbsSummary.expectedCount : 0}`);
  printLine(`Provérbios segmentos encontrados: ${proverbsSummary ? proverbsSummary.foundCount : 0}`);
  printLine();

  const booksWithGaps = analysis.bookSummaries.filter((summary) => summary.missingUnits.length > 0);
  printIssueSection('Livros com faltantes', booksWithGaps, (summary) => {
    const units = summary.missingUnits.join(', ');
    return `${summary.book}: ${units}`;
  });

  const booksWithUnexpected = analysis.bookSummaries.filter((summary) => summary.unexpectedUnits.length > 0);
  printIssueSection('Capitulos ou segmentos extras', booksWithUnexpected, (summary) => {
    const units = summary.unexpectedUnits.map((item) => `${item.unit} [${item.records.map((record) => record.fileName).join(', ')}]`).join('; ');
    return `${summary.book}: ${units}`;
  });

  const booksWithDuplicates = analysis.bookSummaries.filter((summary) => summary.duplicateUnits.length > 0);
  printIssueSection('Duplicatas', booksWithDuplicates, (summary) => {
    const units = summary.duplicateUnits.map((item) => `${item.unit} [${item.records.map((record) => record.fileName).join(', ')}]`).join('; ');
    return `${summary.book}: ${units}`;
  });

  printIssueSection('Aliases tolerados', analysis.issues.aliasWarnings, (issue) => {
    const files = issue.records.map((record) => record.fileName).join(', ');
    return `${formatReference(issue.book, issue.unit)} [${files}]`;
  });

  printIssueSection('Inconsistencias filename x title', analysis.issues.mismatches, (issue) => {
    return `${issue.fileName}: filename=${issue.fileReference}; title=${issue.titleReference}`;
  });

  printIssueSection('Status diferente de READY', analysis.issues.status, (issue) => {
    return `${issue.fileName}: ${issue.status}`;
  });

  printIssueSection('Erros de parse de filename', analysis.issues.filenameParse, (issue) => {
    return `${issue.fileName}: ${issue.message}`;
  });

  printIssueSection('Erros de parse de title', analysis.issues.titleParse, (issue) => {
    return `${issue.fileName}: ${issue.message}`;
  });

  printIssueSection('Erros de leitura ou JSON', analysis.issues.jsonParse, (issue) => {
    return `${issue.fileName}: ${issue.message}`;
  });
}

function hasBlockingIssues(analysis) {
  return analysis.issues.missing.length > 0
    || analysis.issues.unexpected.length > 0
    || analysis.issues.duplicates.length > 0
    || analysis.issues.mismatches.length > 0
    || analysis.issues.status.length > 0
    || analysis.issues.filenameParse.length > 0
    || analysis.issues.titleParse.length > 0
    || analysis.issues.jsonParse.length > 0;
}

async function main() {
  const directoryPath = path.resolve(process.argv[2] || process.cwd());
  const stat = await fs.stat(directoryPath).catch(() => null);

  if (!stat || !stat.isDirectory()) {
    throw new Error(`Diretorio invalido: ${directoryPath}`);
  }

  const { metadataFiles, records } = await collectRecords(directoryPath);
  const analysis = analyzeRecords(records);
  printSummary(metadataFiles, analysis);
  process.exitCode = hasBlockingIssues(analysis) ? 1 : 0;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});