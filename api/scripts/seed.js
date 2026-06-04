script
/*eslint-disable no-console */
/**
 * UPCAT Simulator -- Question Bank Seed Script
 *
 * Inserts realistic UPCAT-style sample questions and passages into MongoDB.
 *
 * Usage:
 *   node scripts/seed.js          # insert seed data (skips if collections non-empty)
 *   node scripts/seed.js --clean  # drop existing questions/passages first
 *   node scripts/seed.js --clean --force  # also clean exam_sessions
 *
 * Required env: MONGODB_URI (and optionally MONGODB_DB or MONGODB_DB_NAME)
 * Default seeded users:
 *   admin@upcatsimulator.com      / admin
 *   reviewee1@upcatsimulator.com  / reviewee1
 *   reviewee2@upcatsimulator.com  / reviewee2
 *   reviewee3@upcatsimulator.com  / reviewee3
 *   reviewee4@upcatsimulator.com  / reviewee4
 *   reviewee5@upcatsimulator.com  / reviewee5
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient, ObjectId } from "mongodb";
import { DEFAULT_EXAM_CONFIG, DEFAULT_PAYMENT_CONFIG, SUBJECT_AREAS } from "@upcat/shared";
import { seedStudyPlanContent } from "./seed-study-plan.js";
import { seedQuestionRichSamples } from "./seed-question-rich-samples.js";
import { seedHelpSystem } from "./seed-help.js";

const PREDEFINED_SET_ID = "6a1079fe42aa96869876b532";
const LEGACY_PREDEFINED_SET_ID = "set-default";
const PREDEFINED_SET_NAME = "Default Seed Set";
const PREDEFINED_SET_DESCRIPTION = "System default set seeded by api/scripts/seed.js";

// env loader (no dotenv dep)
function loadEnvFile() {
    const envPath = resolve(process.cwd(), ".env");
    if (!existsSync(envPath)) return;
    const content = readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const sep = line.indexOf("=");
        if (sep <= 0) continue;
        const key = line.slice(0, sep).trim();
        let value = line.slice(sep + 1).trim();
        if (
            (value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
    }
}

// Argument parsing
const args = new Set(process.argv.slice(2));
const CLEAN = args.has("--clean");
const FORCE = args.has("--force");

// Stable IDs for the seed passages so questions can ref them
const PASSAGE_PHOTOSYNTHESIS_ID = new ObjectId("000000000000000000000001");
const PASSAGE_RIZAL_ID = new ObjectId("000000000000000000000002");

const NOW = new Date();

// Passages
const passages = [
    {
        _id: PASSAGE_PHOTOSYNTHESIS_ID,
        title: "The Process of Photosynthesis",
        subjectArea: "Reading Comprehension",
        source: "Adapted from a high school biology textbook",
        content: `
            Photosynthesis is the process by which green plants, algae, and certain bacteria convert light energy—usually from the sun—into chemical energy stored in glucose. The process occurs primarily in the chloroplasts of plant cells, which contain a green pigment called chlorophyll. Chlorophyll absorbs light most efficiently in the blue and red wavelengths while reflecting green light, which is why most plants appear green to the human eye.\n\nThe overall reaction can be summarized as: six molecules of carbon dioxide combine with six molecules of water in the presence of light energy to produce one molecule of glucose and six molecules of oxygen. Photosynthesis is essential to life on Earth because it produces nearly all of the oxygen in the atmosphere and forms the base of nearly every food chain.`,
        createdAt: NOW,
    },
    {
        _id: PASSAGE_RIZAL_ID,
        title: "Jose Rizal and the Philippine Revolution",
        subjectArea: "Reading Comprehension",
        source: "Adapted from Philippine History resources",
        content: `
            Dr. Jose Rizal is widely regarded as the national hero of the Philippines. Born in 1861 in Calamba, Laguna, Rizal was a polymath—a physician, novelist, poet, and reformist who advocated for peaceful reform under Spanish colonial rule. His two novels, Noli Me Tángere (1887) and El Filibusterismo (1891), exposed the abuses of the Spanish friars and colonial officials, awakening Filipino national consciousness.\n\nAlthough Rizal himself did not endorse armed revolution, his writings inspired the Katipunan, a secret society founded by Andres Bonifacio that launched the Philippine Revolution in 1896. Rizal was arrested, tried for sedition, and executed by firing squad at Bagumbayan (now Rizal Park) on December 30, 1896. His martyrdom galvanized the revolution and cemented his legacy as a symbol of Filipino patriotism.`,
        createdAt: NOW,
    },
];
script
function q(data) {
    return {
        setId: PREDEFINED_SET_ID,
        type: "multiple_choice",
        passageId: null,
        tags: [],
        createdat: NOW,
        updatedAt: NOW,
        ...data,
    };
}

const questions = [
    // ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
script
subtopic: "Statistics",
difficulty: "easy",
questionText: "Find the mean of the data set: 4, 8, 15, 16, 23, 42.",
choices: [
    { label: "A", text: "16" },
    { label: "B", text: "18" },
    { label: "C", text: "20" },
    { label: "D", text: "22" },
],
correctAnswer: "B",
rationale: "Sum = 4+8+15+16+23+42 = 108. Mean = 108 / 6 = 18.",
tags: ["mean", "central-tendency"],
}),
q({
subjectArea: "Mathematics",
subtopic: "Calculus",
difficulty: "hard",
questionText: "What is the derivative of f(x) = 3x^4 - 2x^2 + 7?",
choices: [
    { label: "A", text: "12x^3 - 4x^5" },
    { label: "B", text: "12x^3 - 4x + 7" },
    { label: "C", text: "3x^3 - 2x^5" },
    { label: "D", text: "12x^4 - 4x^25" },
],
correctAnswer: "A",
rationale: "Apply the power rule term by term: d/dx(3x^4) = 12x^3, d/dx(-2x^2) = -4x, d/dx(7) = 0.",
tags: ["derivatives", "power-rule"],
}),
q({
subjectArea: "Mathematics",
subtopic: "Algebra",
difficulty: "hard",
questionText: "Solve the quadratic equation x^2 - 5x + 6 = 0.",
choices: [
    { label: "A", text: "x = 1, x = 6" },
    { label: "B", text: "x = 2, x = 3" },
    { label: "C", text: "x = -2, x = -3" },
    { label: "D", text: "x = -1, x = -6" },
],
correctAnswer: "B",
rationale: "Factor: (x - 2)(x - 3) = 0. so x = 2 or x = 3. Check: 4 - 10 + 6 = 0 √ and 9 - 15 + 6 = 0 √.",
tags: ["quadratic-equations", "factoring"],
}),
// --------------------------------------------------- SCIENCE: (7) ---------------------------------------------------
q({
subjectArea: "Science",
subtopic: "Biology",
difficulty: "easy",
questionText: "Which organelle is known as the 'powerhouse of the cell'?",
choices: [
    { label: "A", text: "Nucleus" },
    { label: "B", text: "Ribosome" },
    { label: "C", text: "Mitochondrion" },
    { label: "D", text: "Golgi apparatus" },
],
correctAnswer: "C",
rationale: "Mitochondria produce ATP through cellular respiration, supplying the cell with energy.",
tags: ["cell-biology", "organelles"],
}),
q({
subjectArea: "Science",
subtopic: "Biology",
difficulty: "medium",
questionText: "DNA replication is described as 'semi-conservative' because:",
choices: [
    { label: "A", text: "Half of the DNA is destroyed during replication." },
    { label: "B", text: "Each new DNA molecule contains one old strand and one new strand." },
    { label: "C", text: "Only half of the chromosome is copied." },
    { label: "D", text: "The process conserves only half of the genetic information." },
],
correctAnswer: "B",
rationale: "In semi-conservative replication, the parental DNA strands separate and each serves as a template, so each daughter molecule has one original (conserved) strand and one newly synthesized strand.",
tags: ["genetics", "DNA"],
}),
q({
subjectArea: "Science",
subtopic: "Chemistry",
difficulty: "easy",
questionText: "What is the chemical symbol for gold?",
choices: [
    { label: "A", text: "Go" },
    { label: "B", text: "Gd" },
    { label: "C", text: "Au" },
    { label: "D", text: "Ag" },
],
correctAnswer: "C",
rationale: "Gold's symbol Au comes from its Latin name 'aurum'. (Ag is silver, from 'argentum').",
tags: ["periodic-table", "elements"],
}),
q({
subjectArea: "Science",
script
q({
    subjectArea: "Science",
    subtopic: "Chemistry",
    difficulty: "medium",
    questionText: "What is the pH of a neutral aqueous solution at 25°C?",
    choices: [
        { label: "A", text: "0" },
        { label: "B", text: "7" },
        { label: "C", text: "10" },
        { label: "D", text: "14" },
    ],
    correctAnswer: "B",
    rationale: "Pure water at 25°C has equal concentrations of H+ and OH- ions (1 × 10^-7 M each), giving a pH of 7.",
    tags: ["acids-bases", "pH"],
}),
q({
    subjectArea: "Science",
    subtopic: "Physics",
    difficulty: "medium",
    questionText: "An object accelerates from rest at 4 m/s². What is its velocity after 5 seconds?",
    choices: [
        { label: "A", text: "9 m/s" },
        { label: "B", text: "16 m/s" },
        { label: "C", text: "20 m/s" },
        { label: "D", text: "25 m/s" },
    ],
    correctAnswer: "C",
    rationale: "Using v = u + at with u = 0, a = 4 m/s², t = 5 s: v = 0 + (4)(5) = 20 m/s.",
    tags: ["kinematics", "motion"],
}),
q({
    subjectArea: "Science",
    subtopic: "Physics",
    difficulty: "hard",
    questionText: "According to Newton's third law of motion, for every action there is:",
    choices: [
        { label: "A", text: "An equal and opposite reaction." },
        { label: "B", text: "A reaction in the same direction." },
        { label: "C", text: "No reaction unless friction is present." },
        { label: "D", text: "A reaction proportional to mass." },
    ],
    correctAnswer: "A",
    rationale: "Newton's third law: when one body exerts a force on a second body, the second body exerts an equal and opposite force on the first.",
    tags: ["newtons-laws", "forces"],
}),
q({
    subjectArea: "Science",
    subtopic: "Earth Science",
    difficulty: "easy",
    questionText: "Which layer of Earth lies directly beneath the crust?",
    choices: [
        { label: "A", text: "Inner core" },
        { label: "B", text: "Outer core" },
        { label: "C", text: "Mantle" },
        { label: "D", text: "Lithosphere" },
    ],
    correctAnswer: "C",
    rationale: "Earth's structure from outside in: crust → mantle → outer core → inner core. The mantle is the thick layer just below the crust.",
    tags: ["geology", "earth-structure"],
}),
// -------------------------------- LANGUAGE PROFICIENCY (6) --------------------------------
q({
    subjectArea: "Language Proficiency",
    subtopic: "Grammar",
    difficulty: "easy",
    questionText: "Choose the sentence with the correct subject-verb agreement:",
    choices: [
        { label: "A", text: "The team are playing well today." },
        { label: "B", text: "The team is playing well today." },
        { label: "C", text: "The team were playing well today." },
        { label: "D", text: "The team be playing well today." },
    ],
    correctAnswer: "B",
    rationale: "In American English, collective nouns like 'team' typically take a singular verb when treated as a single unit: 'The team is...'.",
    tags: ["subject-verb-agreement"],
}),
q({
    subjectArea: "Language Proficiency",
    subtopic: "Vocabulary",
    difficulty: "medium",
    questionText: "Choose the word that is most nearly opposite in meaning to BENEVOLENT:",
    choices: [
        { label: "A", text: "Generous" },
        { label: "B", text: "Kind" },
        { label: "C", text: "Malevolent" },
        { label: "D", text: "Indifferent" },
    ],
    correctAnswer: "C",
    rationale: "Benevolent means well-meaning and kindly. Its direct antonym is malevolent -- wishing evil or harm to others.",
    tags: ["antonyms"],
})
script
tags: ["antonyms", "vocabulary"],
q({
    subjectArea: "Language Proficiency",
    subtopic: "Grammar",
    difficulty: "medium",
    questionText:
        "Identify the part of speech of the underlined word: 'She walked QUICKLY to the store.'",
    choices: [
        { label: "A", text: "Adjective" },
        { label: "B", text: "Adverb" },
        { label: "C", text: "Noun" },
        { label: "D", text: "Preposition" },
    ],
    correctAnswer: "B",
    rationale:
        "Quickly modifies the verb 'walked', describing how the action was performed, so it is an adverb.",
    tags: ["parts-of-speech"],
}),
q({
    subjectArea: "Language Proficiency",
    subtopic: "Vocabulary",
    difficulty: "easy",
    questionText:
        "Which word is a synonym of EPHEMERAL?",
    choices: [
        { label: "A", text: "Permanent" },
        { label: "B", text: "Short-lived" },
        { label: "C", text: "Powerful" },
        { label: "D", text: "Beautiful" },
    ],
    correctAnswer: "B",
    rationale:
        "Ephemeral means lasting for a very short time, so 'short-lived' is the closest synonym.",
    tags: ["synonyms", "vocabulary"],
}),
q({
    subjectArea: "Language Proficiency",
    subtopic: "Grammar",
    difficulty: "hard",
    questionText:
        "Choose the sentence that uses the semicolon correctly:",
    choices: [
        { label: "A", text: "I love reading; especially novels." },
        { label: "B", text: "I love reading novels; my brother prefers comics." },
        { label: "C", text: "I love reading; and writing." },
        { label: "D", text: "I love; reading novels." },
    ],
    correctAnswer: "B",
    rationale:
        "A semicolon joins two related independent clauses. Option B has two complete sentences on either side; the others use semicolons before fragments or coordinating conjunctions.",
    tags: ["punctuation", "semicolons"],
}),
q({
    subjectArea: "Language Proficiency",
    subtopic: "Vocabulary",
    difficulty: "medium",
    questionText:
        "The word UBQUITOUS most nearly means:",
    choices: [
        { label: "A", text: "Rare" },
        { label: "B", text: "Hidden" },
        { label: "C", text: "Found everywhere" },
        { label: "D", text: "Ancient" },
    ],
    correctAnswer: "C",
    rationale:
        "Ubiquitous means present, appearing, or found everywhere.",
    tags: ["vocabulary"],
}),
// READING COMPREHENSION (6)
// Photosynthesis passage
q({
    subjectArea: "Reading Comprehension",
    subtopic: "Main Idea",
    difficulty: "easy",
    type: "passage_based",
    passageId: PASSAGE_PHOTOSYNTHESIS_ID,
    questionText: "What is the main idea of the passage?",
    choices: [
        { label: "A", text: "Plants are mostly green because of light reflection." },
        { label: "B", text: "Photosynthesis converts light energy into chemical energy and is essential to life." },
        { label: "C", text: "Chlorophyll only absorbs blue and red light." },
        { label: "D", text: "Carbon dioxide and water are the main products of photosynthesis." },
    ],
    correctAnswer: "B",
    rationale:
        "The passage opens by defining photosynthesis and concludes with its essential role in producing oxygen and forming the base of food chains. B captures both ideas.",
    tags: ["main-idea", "biology"],
}),
q({
    subjectArea: "Reading Comprehension",
    subtopic: "Detail",
    difficulty: "easy",
    type: "passage_based",
    passageId: PASSAGE_PHOTOSYNTHESIS_ID,
    questionText: "According to the passage, why do most plants appear green?",
    choices: [
        { label: "A", text: "Chlorophyll produces green pigment as a byproduct." },
        { label: "B", text: "Plants absorb mostly green light." },
    ],
    correctAnswer: "A",
    rationale:
        "The passage states that chlorophyll is the pigment responsible for the green color of plants.",
    tags: ["detail", "biology"],
}),
script
{
    label: "C",
    text: "Chlorophyll reflects green light while absorbing other wavelengths."},
    {
        label: "D",
        text: "Sunlight contains more green light than other colors."},
    ],
    correctAnswer: "C",
    rationale:
        "The passage states chlorophyll absorbs blue and red wavelengths most efficiently and reflects green light.",
    tags: ["detail", "biology"],
}),
q({
    subjectArea: "Reading Comprehension",
    subtopic: "Inference",
    difficulty: "medium",
    type: "passage_based",
    passageId: PASSAGE_PHOTOSYNTHESIS_ID,
    questionText:
        "Based on the passage, what would most likely happen if photosynthesis suddenly stopped?",
    choices: [
        { label: "A", text: "The Earth would become warmer."},
        { label: "B", text: "Atmospheric oxygen would gradually decrease and food chains would collapse."},
        { label: "C", text: "Plants would grow faster."},
        { label: "D", text: "Carbon dioxide levels would drop."},
    ],
    correctAnswer: "B",
    rationale:
        "The passage states that photosynthesis produces nearly all atmospheric oxygen and forms the base of nearly every food chain, so its absence would deplete oxygen and disrupt ecosystems.",
    tags: ["inference", "biology"],
}),
// Rizal passage
q({
    subjectArea: "Reading Comprehension",
    subtopic: "Main Idea",
    difficulty: "easy",
    type: "passage_based",
    passageId: PASSAGE_RIZAL_ID,
    questionText: "What is the central idea of the passage?",
    choices: [
        { label: "A", text: "Rizal was the founder of the Katipunan."},
        {
            label: "B",
            text: "Rizal's writings inspired Filipino nationalism even though he opposed armed revolution."
        },
        { label: "C", text: "Andres Bonifacio was a more important hero than Rizal."},
        { label: "D", text: "Spanish colonial rule was generally peaceful."},
    ],
    correctAnswer: "B",
    rationale:
        "The passage emphasizes that Rizal favored peaceful reform but his works awakened national consciousness and inspired the revolution despite his stance.",
    tags: ["main-idea", "philippine-history"],
}),
q({
    subjectArea: "Reading Comprehension",
    subtopic: "Detail",
    difficulty: "medium",
    type: "passage_based",
    passageId: PASSAGE_RIZAL_ID,
    questionText:
        "According to the passage, where and when was Rizal executed?",
    choices: [
        { label: "A", text: "Calamba, Laguna in 1861"},
        { label: "B", text: "Manila in 1887"},
        { label: "C", text: "Bagumbayan on December 30, 1896"},
        { label: "D", text: "Bagumbayan in 1891"},
    ],
    correctAnswer: "C",
    rationale:
        "The passage explicitly states Rizal was executed by firing squad at Bagumbayan on December 30, 1896.",
    tags: ["detail", "philippine-history"],
}),
q({
    subjectArea: "Reading Comprehension",
    subtopic: "Inference",
    difficulty: "hard",
    type: "passage_based",
    passageId: PASSAGE_RIZAL_ID,
    questionText:
        "What can be inferred about the impact of Rizal's death on the Philippine Revolution?",
    choices: [
        { label: "A", text: "It ended the revolution immediately."},
        { label: "B", text: "It strengthened the resolve of revolutionaries."},
        { label: "C", text: "It convinced the Spanish to grant independence."},
        { label: "D", text: "It had no significant effect."},
    ],
    correctAnswer: "B",
    rationale:
        "The passage says his martyrdom 'galvanized the revolution', which implies it energized and strengthened the revolutionary movement.",
    tags: ["inference", "philippine-history"],
});
// Main
async function seed() {
    loadEnvFile();
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is not set (expected in api/.env)");
    }
    const client = new MongoClient(uri);
    console.log("...Connecting to MongoDB...");
}
script
await client.connect();
try {
    const db = client.db(process.env.MONGODB_DB ?? process.env.MONGODB_DB_NAME ?? undefined);
    console.log(`Connected to database: ${db.databaseName}`);
    console.log(`Seed mode: ${CLEAN ? "CLEAN (drop existing first)" : "APPEND (skip if non-empty)"}\n`);
    if (CLEAN) {
        console.log("Dropping existing 'questions' and 'passages'...");
        await db.collection("questions").deleteMany({});
        await db.collection("passages").deleteMany({});
        if (FORCE) {
            console.log("--force: also dropping 'exam_sessions'...");
            await db.collection("exam_sessions").deleteMany({});
        }
        console.log("Cleanup complete\n");
    }
    // Skip if data already present and not --clean
    if (!CLEAN) {
        const existing = await db.collection("questions").countDocuments();
        if (existing > 0) {
            console.log(`'questions' already has ${existing} documents. Skipping seed.`);
            console.log("Use --clean to wipe and reseed.");
            await backfillQuestionSetIds(db);
            await ensurePredefinedQuestionSet(db);
            // Ensure seeded default users still exist on repeat runs.
            await seedDefaultUsers(db);
            await seedPaymentAndSubscriptionDefaults(db);
            await seedMonitoringDefaults(db);
            await seedStudyPlanContent(db);
            await seedQuestionRichSamples(db, {setId: PREDEFINED_SET_ID});
            await seedHelpSystem(db);
            return;
        }
    }
    // Insert passages
    console.log(`Inserting ${passages.length} passages...`);
    const passagesResult = await db.collection("passages").insertMany(passages);
    console.log(`Inserted ${passagesResult.insertedCount} passages`);
    // Insert questions
    console.log(`Inserting ${questions.length} questions...`);
    const questionsResult = await db.collection("questions").insertMany(questions);
    console.log(`Inserted ${questionsResult.insertedCount} questions`);
    await ensurePredefinedQuestionSet(db);
    // Summary
    console.log("\nSeed Summary:");
    const bySubject = {};
    const byDifficulty = {easy: 0, medium: 0, hard: 0};
    for (const qq of questions) {
        bySubject[qq.subjectArea] = (bySubject[qq.subjectArea] || 0) + 1;
        byDifficulty[qq.difficulty]++;
    }
    console.log("- By subject:");
    for (const [subj, count] of Object.entries(bySubject)) {
        console.log(`• ${subj}: ${count}`);
    }
    console.log("- By difficulty:");
    for (const [diff, count] of Object.entries(byDifficulty)) {
        console.log(`• ${diff}: ${count}`);
    }
    console.log("\nSeed completed successfully.");
    // Seed default users (1 admin + 5 reviewees)
    await seedDefaultUsers(db);
    // Phase 16: payment/subscription defaults
    await seedPaymentAndSubscriptionDefaults(db);
    await seedMonitoringDefaults(db);
    // Study plan lessons and templates
    await seedStudyPlanContent(db);
    // Rich media samples for question workflow
    await seedQuestionRichSamples(db, {setId: PREDEFINED_SET_ID});
    // Help center, contextual help, onboarding
    await seedHelpSystem(db);
    // Phase 12: gamification catalogs
    await seedGamificationCatalogs(db);
} finally {
    await client.close();
}
}

async function backfillQuestionSetIds(db) {
    const migrateLegacy = await db.collection("questions").updateMany(
        {setId: LEGACY_PREDEFINED_SET_ID},
        {
            $set: {
                setId: PREDEFINED_SET_ID,
                updatedAt: new Date(),
            },
        },
    );
    if (migrateLegacy.modifiedCount > 0) {
        console.log(`Migrated ${migrateLegacy.modifiedCount} question(s) from '${LEGACY_PREDEFINED_SET_ID}' to '${PREDEFINED_SET_ID}'.`);
    }
}
script
const result = await db.collection("questions").updateMany(
    {
        $or: [
            {setId: {$exists: false}},
            {setId: null},
            {setId: ""},
        ],
    },
    {
        $set: {
            setId: PREDEFINED_SET_ID,
            updatedAt: new Date(),
        },
    },
);
if (result.modifiedCount > 0) {
    console.log(`→ Backfilled setId for ${result.modifiedCount} question(s) to ${PREDEFINED_SET_ID}`);
}

async function ensurePredefinedQuestionSet(db) {
    const setoid = new ObjectId(PREDEFINED_SET_ID);

    const migrateLegacySetDoc = await db.collection("question_sets").updateMany(
        {setId: LEGACY_PREDEFINED_SET_ID},
        {
            $set: {
                setId: PREDEFINED_SET_ID,
                updatedAt: new Date(),
            },
        },
    );
    if (migrateLegacySetDoc.modifiedCount > 0) {
        console.log(`→ Migrated ${migrateLegacySetDoc.modifiedCount} question_set document(s) from '${LEGACY_PREDEFINED_SET_ID}' to '${PREDEFINED_SET_ID}'`);
    }

    const match = {
        setId: PREDEFINED_SET_ID,
        isDeleted: {$ne: true},
        $or: [{publicationStatus: "published"}, {publicationStatus: {$exists: false}}],
    };

    const totalQuestions = await db.collection("questions").countDocuments(match);

    const bySubject = await db.collection("questions").aggregate([
        {$match: match},
        {$group: {_id: "$subjectArea", n: {$sum: 1}}},
    ]).toArray();

    const subjectCountMap = new Map(bySubject.map((row) => [String(row._id), Number(row.n) || 0]));
    const fallbackDistribution = DEFAULT_EXAM_CONFIG.distribution;
    const distribution = Object.fromEntries(
        SUBJECT_AREAS.map((subject) => {
            const questions = totalQuestions > 0
                ? Math.max(0, Number(subjectCountMap.get(subject) || 0))
                : Math.max(0, Number(fallbackDistribution[subject] || 0));
            const timeLimit = totalQuestions > 0
                ? Math.max(1, Math.round((questions * Number(DEFAULT_EXAM_CONFIG.timeLimit || 180)) / Math.max(1, totalQuestions)))
                : Math.max(1, Math.round((questions * Number(DEFAULT_EXAM_CONFIG.timeLimit || 180)) / Math.max(1, Number(DEFAULT_EXAM_CONFIG.totalQuestions || 100))));
            return [subject, {questions, timeLimit}];
        }),
    );

    const byDifficulty = await db.collection("questions").aggregate([
        {$match: match},
        {$group: {_id: "$difficulty", n: {$sum: 1}}},
    ]).toArray();
    const diffCountMap = new Map(byDifficulty.map((row) => [String(row._id), Number(row.n) || 0]));
    const safeTotal = Math.max(1, totalQuestions);
    const percent = (n) => Math.round((Math.max(0, Number(n) || 0) / safeTotal) * 100);
    const difficultyMix = totalQuestions > 0
        ? {
            easy: percent(diffCountMap.get("easy")),
            medium: percent(diffCountMap.get("medium")),
            hard: percent(diffCountMap.get("hard")),
            very_hard: percent(diffCountMap.get("very_hard")),
        }
        : {
            easy: Number(DEFAULT_EXAM_CONFIG.difficultyMix.easy || 0),
            medium: Number(DEFAULT_EXAM_CONFIG.difficultyMix.medium || 0),
            hard: Number(DEFAULT_EXAM_CONFIG.difficultyMix.hard || 0),
            very_hard: Number(DEFAULT_EXAM_CONFIG.difficultyMix.very_hard || 0),
        };

    const totalTimeLimit = Object.values(distribution).reduce((sum, cfg) => sum + (cfg.timeLimit || 0), 0);
    const now = new Date();

    await db.collection("question_sets").updateOne(
        {_id: setoid},
        {
            $set: {
                setId: PREDEFINED_SET_ID,
                name: PREDEFINED_SET_NAME,
                description: PREDEFINED_SET_DESCRIPTION,
                isActive: true,
                distribution,
                difficultyMix,
                totalQuestions: totalQuestions || Number(DEFAULT_EXAM_CONFIG.totalQuestions || 100),
                totalTimeLimit: totalTimeLimit || Number(DEFAULT_EXAM_CONFIG.timeLimit || 180),
                updatedAt: now,
            },
            $setOnInsert: {
async function seedDefaultUsers(db) {
    const users = db.collection("users");

    const seedUsers = [
        {
            firstName: "Platform",
            lastName: "Admin",
            email: "admin@upcatsimulator.com",
            role: "admin",
            plainPassword: "admin",
            notes: "Default seed admin",
        },
        {
            firstName: "Reviewee",
            lastName: "One",
            email: "reviewee1@upcatsimulator.com",
            role: "reviewee",
            plainPassword: "reviewee1",
            notes: "Default seed reviewee",
        },
        {
            firstName: "Reviewee",
            lastName: "Two",
            email: "reviewee2@upcatsimulator.com",
            role: "reviewee",
            plainPassword: "reviewee2",
            notes: "Default seed reviewee",
        },
        {
            firstName: "Reviewee",
            lastName: "Three",
            email: "reviewee3@upcatsimulator.com",
            role: "reviewee",
            plainPassword: "reviewee3",
            notes: "Default seed reviewee",
        },
        {
            firstName: "Reviewee",
            lastName: "Four",
            email: "reviewee4@upcatsimulator.com",
            role: "reviewee",
            plainPassword: "reviewee4",
            notes: "Default seed reviewee",
        },
        {
            firstName: "Reviewee",
            lastName: "Five",
            email: "reviewee5@upcatsimulator.com",
            role: "reviewee",
            plainPassword: "reviewee5",
            notes: "Default seed reviewee",
        },
    ];

    // Lazy-load bcrypt for password hashing in seed users.
    const bcrypt = await import("@node-rs/bcrypt");

    let upserted = 0;
    const now = new Date();
    for (const account of seedUsers) {
        const passwordHash = await bcrypt.hash(account.plainPassword, 12);
        const result = await users.updateOne(
            { email: account.email.toLowerCase() },
            {
                $set: {
                    firstName: account.firstName,
                    lastName: account.lastName,
                    email: account.email.toLowerCase(),
                    passwordHash,
                    role: account.role,
                    isActive: true,
                    isVerified: true,
                    updatedAt: now,
                    notes: account.notes,
                    deactivatedAt: null,
                    deactivatedBy: null,
                },
                $setOnInsert: {
                    loginCount: 0,
                    lastLoginAt: null,
                    createdAt: now,
                },
            },
            { upsert: true },
        );
        if (result.upsertedCount > 0) upserted += 1;
    }

    console.log(`\n\nSeeded default users (${upserted} new, ${seedUsers.length - upserted} updated).`);
}

// --- Phase 12: gamification catalogs
async function seedGamificationCatalogs(db) {
    const achievements = [

{
  id: "first_steps",
  category: "milestone",
  rarity: "common",
  title: "First Steps",
  description: "Complete your very first practice exam.",
  icon: "footprints",
  xpReward: 50,
  points: -10,
  condition: { kind: "examCount", gte: 1 }
},
{
  id: "getting_serious",
  category: "milestone",
  rarity: "common",
  title: "Getting Serious",
  description: "Complete 5 practice exams.",
  icon: "book-open",
  xpReward: 100,
  points: 20,
  condition: { kind: "examCount", gte: 5 }
},
{
  id: "dedicated_learner",
  category: "milestone",
  rarity: "uncommon",
  title: "Dedicated Learner",
  description: "Complete 25 practice exams.",
  icon: "graduation-cap",
  xpReward: 250,
  points: 50,
  condition: { kind: "examCount", gte: 25 }
},
{
  id: "exam_machine",
  category: "milestone",
  rarity: "rare",
  title: "Exam Machine",
  description: "Complete 100 practice exams.",
  icon: "rocket",
  xpReward: 500,
  points: 100,
  condition: { kind: "examCount", gte: 100 }
},
{
  id: "exam_titan",
  category: "milestone",
  rarity: "epic",
  title: "Exam Titan",
  description: "Complete 250 practice exams.",
  icon: "mountain",
  xpReward: 1000,
  points: 250,
  condition: { kind: "examCount", gte: 250 }
},
{
  id: "high_screr",
  category: "performance",
  rarity: "uncommon",
  title: "High Scorer",
  description: "Score 80% or higher on a practice exam.",
  icon: "trophy",
  xpReward: 100,
  points: 25,
  condition: { kind: "scoreThreshold", gte: 80, count: 1 }
},
{
  id: "top_of_class",
  category: "performance",
  rarity: "rare",
  title: "Top of the Class",
  description: "Score 90% or higher on a practice exam.",
  icon: "award",
  xpReward: 200,
  points: 50,
  condition: { kind: "scoreThreshold", gte: 90, count: 1 }
},
{
  id: "flawless",
  category: "performance",
  rarity: "legendary",
  title: "Flawless Victory",
  description: "Achieve a perfect 100% on a practice exam.",
  icon: "crown",
  xpReward: 500,
  points: 200,
  condition: { kind: "perfectScores", gte: 1 }
},
{
  id: "perfectionist",
  category: "performance",
  rarity: "epic",
  title: "Perfectionist",
  description: "Achieve 5 perfect scores.",
  icon: "diamond",
  xpReward: 1000,
  points: 300,
  condition: { kind: "perfectScores", gte: 5 }
},
{
  id: "consistent_excellence",
  category: "performance",
  rarity: "epic",
  title: "Consistent Excellence",

script
description: "Score 90%+ on 10 different exams.",
icon: "shield-check",
xpReward: 750,
points: 200,
condition: { kind: "scoreThreshold", gte: 90, count: 10 }
},
{
    id: "warming_up",
    category: "streak",
    rarity: "common",
    title: "Warming-Up",
    description: "Maintain a 3-day study streak.",
    icon: "flame",
    xpReward: 50,
    points: 15,
    condition: { kind: "streakDays", gte: 3 }
},
{
    id: "on_fire",
    category: "streak",
    rarity: "uncommon",
    title: "On Fire",
    description: "Maintain a 7-day study streak.",
    icon: "flame",
    xpReward: 150,
    points: 40,
    condition: { kind: "streakDays", gte: 7 }
},
{
    id: "fortnight_focus",
    category: "streak",
    rarity: "rare",
    title: "Fortnight-Focus",
    description: "Maintain a 14-day study streak.",
    icon: "calendar-days",
    xpReward: 300,
    points: 75,
    condition: { kind: "streakDays", gte: 14 }
},
{
    id: "unstoppable",
    category: "streak",
    rarity: "epic",
    title: "Unstoppable",
    description: "Maintain a 30-day study streak.",
    icon: "zap",
    xpReward: 750,
    points: 200,
    condition: { kind: "streakDays", gte: 30 }
},
{
    id: "legendary_dedication",
    category: "streak",
    rarity: "legendary",
    title: "Legendary Dedication",
    description: "Maintain a 100-day study streak.",
    icon: "star",
    xpReward: 2500,
    points: 500,
    condition: { kind: "streakDays", gte: 100 }
},
{
    id: "early_bird",
    category: "dedication",
    rarity: "common",
    title: "Early Bird",
    description: "Answer 100 questions in total.",
    icon: "sunrise",
    xpReward: 75,
    points: 20,
    condition: { kind: "questionsAnswered", gte: 100 }
},
{
    id: "knowledge_seeker",
    category: "dedication",
    rarity: "uncommon",
    title: "Knowledge-Seeker",
    description: "Answer 500 questions in total.",
    icon: "search",
    xpReward: 200,
    points: 50,
    condition: { kind: "questionsAnswered", gte: 500 }
},
{
    id: "scholar",
    category: "dedication",
    rarity: "rare",
    title: "Scholar",
    description: "Answer 2,000 questions in total.",
    icon: "library",
    xpReward: 500,
    points: 125,
    condition: { kind: "questionsAnswered", gte: 2000 }
},
{
    id: "marathon_mind",
    category: "dedication",
    rarity: "epic",
    title: "Marathon Mind",
    description: "Accumulate 1,000 minutes of study time.",
    icon: "timer",
    xpReward: 600,
    points: 150,
    condition: { kind: "studyMinutes", gte: 1000 }
}
script
},
{
    id: "deep_focus",
    category: "dedication",
    rarity: "rare",
    title: "Deep Focus",
    description: "Accumulate 300 minutes of study time.",
    icon: "headphones",
    xpReward: 250,
    points: 75,
    condition: { kind: "studyMinutes", gte: 300 }
},
{
    id: "math_master",
    category: "mastery",
    rarity: "rare",
    title: "Math Master",
    description: "Score 100% on a Mathematics exam.",
    icon: "calculator",
    xpReward: 300,
    points: 100,
    condition: { kind: "perfectSubject", subject: "math", gte: 1 }
},
{
    id: "science_savant",
    category: "mastery",
    rarity: "rare",
    title: "Science Savant",
    description: "Score 100% on a Science exam.",
    icon: "flask-conical",
    xpReward: 300,
    points: 100,
    condition: { kind: "perfectSubject", subject: "science", gte: 1 }
},
{
    id: "language_luminary",
    category: "mastery",
    rarity: "rare",
    title: "Language Luminary",
    description: "Score 100% on a Language Proficiency exam.",
    icon: "languages",
    xpReward: 300,
    points: 100,
    condition: { kind: "perfectSubject", subject: "language", gte: 1 }
},
{
    id: "reading_rockstar",
    category: "mastery",
    rarity: "rare",
    title: "Reading Rockstar",
    description: "Score 100% on a Reading Comprehension exam.",
    icon: "book-marked",
    xpReward: 300,
    points: 100,
    condition: { kind: "perfectSubject", subject: "reading", gte: 1 }
},
{
    id: "quadruple_threat",
    category: "mastery",
    rarity: "legendary",
    title: "Quadruple Threat",
    description: "Reach level 50.",
    icon: "swords",
    xpReward: 2000,
    points: 500,
    condition: { kind: "levelReached", gte: 50 }
},
{
    id: "level_10",
    category: "milestone",
    rarity: "uncommon",
    title: "Sophomore",
    description: "Reach level 10.",
    icon: "chevron-up",
    xpReward: 100,
    points: 25,
    condition: { kind: "levelReached", gte: 10 }
},
{
    id: "level_25",
    category: "milestone",
    rarity: "rare",
    title: "Upperclassman",
    description: "Reach level 25.",
    icon: "chevrons-up",
    xpReward: 300,
    points: 5,
    condition: { kind: "levelReached", gte: 25 }
},
{
    id: "level_50",
    category: "milestone",
    rarity: "epic",
    title: "Achiever",
    description: "Reach level 50.",
    icon: "trending-up",
    xpReward: 750,
    points: 200,
    condition: { kind: "levelReached", gte: 50 }
},
{
    id: "level_100",
    category: "milestone",
    rarity: "legendary",
script
title: "UPCAT-Champion",
description: "Reach the max level of 100.",
icon: "crown",
xpReward: 5000,
points: 1000,
condition: {kind: "levelReached", gte: 100}
},
{
    id: "practice_starter",
    category: "dedication",
    rarity: "common",
    title: "Practice Starter",
    description: "Complete your first practice session.",
    icon: "play",
    xpReward: 50,
    points: 10,
    condition: {kind: "practiceSessions", gte: 1}
},
{
    id: "practice_regular",
    category: "dedication",
    rarity: "uncommon",
    title: "Practice Regular",
    description: "Complete 25 practice sessions.",
    icon: "repeat",
    xpReward: 250,
    points: 60,
    condition: {kind: "practiceSessions", gte: 25}
},
{
    id: "review_perfectionist",
    category: "performance",
    rarity: "uncommon",
    title: "Reviewer",
    description: "Answer 100 questions correctly.",
    icon: "check-check",
    xpReward: 150,
    points: 40,
    condition: {kind: "correctAnswers", gte: 100}
},
];
const challenges = [
    {
        id: "weekly_exams_3",
        title: "Three-Exam Week",
        description: "Complete 3 practice exams this week.",
        metric: "exams_completed",
        target: 3,
        xpReward: 250,
        weight: 10
    },
    {
        id: "weekly_exams_5",
        title: "Exam Marathon",
        description: "Complete 5 practice exams this week.",
        metric: "exams_completed",
        target: 5,
        xpReward: 500,
        weight: 6
    },
    {
        id: "weekly_correct_100",
        title: "Hundred-Correct",
        description: "Answer 100 questions correctly this week.",
        metric: "questions_correct",
        target: 100,
        xpReward: 300,
        weight: 8
    },
    {
        id: "weekly_correct_250",
        title: "Quarter Champion",
        description: "Answer 250 questions correctly this week.",
        metric: "questions_correct",
        target: 250,
        xpReward: 700,
        weight: 4
    },
    {
        id: "weekly_minutes_120",
        title: "Two-Hour Focus",
        description: "Study for 120 minutes this week.",
        metric: "study_minutes",
        target: 120,
        xpReward: 250,
        weight: 9
    },
    {
        id: "weekly_minutes_300",
        title: "Deep Dive",
        description: "Study for 300 minutes this week.",
        metric: "study_minutes",
        target: 300,
        xpReward: 600,
        weight: 5
    },
    {
        id: "weekly_practice_5",
        title: "Practice Pentathlon",
        description: "Complete 5 practice sessions this week.",
        metric: "practice_sessions",
        target: 5,
        xpReward: 350,
        weight: 7
    },
script
}, {
    id: "weekly_perfect_1",
    title: "Pursuit of Perfection",
    description: "Score 100% on at least one exam this week.",
    metric: "perfect_scores",
    target: 1,
    xpReward: 400,
    weight: 6
}, {
    id: "weekly_high_3",
    title: "Elite Trio",
    description: "Score 85%+ on 3 exams this week.",
    metric: "score_above_threshold",
    target: 3,
    threshold: 85,
    xpReward: 500,
    weight: 5
}, {
    id: "weekly_high_5",
    title: "Top of the Curve",
    description: "Score 90%+ on 5 exams this week.",
    metric: "score_above_threshold",
    target: 5,
    threshold: 90,
    xpReward: 800,
    weight: 3
}];
const achievementsCol = db.collection("achievements_catalog");
const challengesCol = db.collection("weekly_challenges_catalog");
const now = new Date();
let achInserted = 0;
for (const a of achievements) {
    const r = await achievementsCol.updateOne(
        { id: a.id },
        {$set: {...a, hidden: false, isActive: true, updatedAt: now}, $setOnInsert: {createdAt: now}},
        {upsert: true}
    );
    if (r.upsertedCount > 0) achInserted += 1;
}
let chInserted = 0;
for (const c of challenges) {
    const r = await challengesCol.updateOne(
        { id: c.id },
        {$set: {...c, threshold: c.threshold ?? null, isActive: true, updatedAt: now}, $setOnInsert: {createdAt: now}},
        {upsert: true}
    );
    if (r.upsertedCount > 0) chInserted += 1;
}
console.log(
    `\nGamification catalogs: ${achievements.length} achievements (${achInserted} new), ${challenges.length} weekly challenges (${chInserted} new).`
);
async function seedPaymentAndSubscriptionDefaults(db) {
    const now = new Date();
    const nowIso = now.toISOString();
    const paymentConfigCol = db.collection("payment_config");
    const promoCodesCol = db.collection("promo_codes");
    const seedConfig = {
        DEFAULT_PAYMENT_CONFIG,
        updatedAt: nowIso,
        updatedBy: "seed_script",
    };
    const paymentResult = await paymentConfigCol.updateOne(
        {_id: "global"},
        {$setOnInsert: seedConfig},
        {upsert: true},
    );
    const promos = [
        {
            code: "WELCOME100",
            type: "discount",
            grant: {
                planId: null,
                durationDays: null,
                discountPercent: 100,
                discountAmount: null,
            },
            maxUses: 500,
            currentUses: 0,
            maxUsesPerUser: 1,
            isActive: true,
            validFrom: nowIso,
            validUntil: null,
            restrictToNewUsers: true,
            usedBy: [],
            createdAt: nowIso,
            createdBy: "seed_script",
        },
        {
            code: "TRIAL7",
            type: "extended_trial",

script
grant: {
    planId: null,
    durationDays: 7,
    discountPercent: null,
    discountAmount: null,
  },
  maxUses: 1000,
  currentUses: 0,
  maxUsesPerUser: 1,
  isActive: true,
  validFrom: nowIso,
  validUntil: null,
  restrictToNewUsers: true,
  usedBy: [],
  createdAt: nowIso,
  createdBy: "seed_script",
},
];
let promoInserted = 0;
for (const promo of promos) {
  const result = await promoCodesCol.updateOne(
    { code: promo.code },
    {$setOnInsert: promo},
    {upsert: true},
  );
  if (result.upsertedCount > 0) promoInserted += 1;
}

console.log(`
  Payment defaults: ${paymentResult.upsertedCount > 0 ? "config.seeded" : "config.exists"},
  ${promoInserted} promo code(s) inserted.`,
);
}

async function seedMonitoringDefaults(db) {
  const now = new Date();
  const monitoringConfig = {
    _id: "global",
    logging: {
      defaultLevel: process.env.LOG_LEVEL || "info",
      levelOverrides: {"api.auth": "debug", scheduler: "info"},
      sampleRate: {debug: 0.1, info: 1, warn: 1, error: 1, fatal: 1},
      sensitiveFields: [
        "password",
        "passwordHash",
        "token",
        "apiKey",
        "apiSecret",
        "creditCard",
        "ssn",
        "refreshToken",
        "verificationToken",
        "authorization",
        "cookie",
      ],
      maxLogSize: 10000,
      retentionDays: {debug: 7, info: 30, warn: 60, error: 90, fatal: 365},
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED !== "false",
      collectionInterval: 60,
      retentionDays: {raw: 7, "5min": 30, "1hour": 90, "1day": 365},
      standardMetrics: {
        requestDuration: true,
        requestCount: true,
        errorRate: true,
        dbQueryDuration: true,
        dbConnectionPool: true,
        activeUsers: true,
        examSessions: true,
        cacheHitRate: true,
        queueDepth: true,
        memoryUsage: true,
      },
      customMetrics: [],
    },
    healthChecks: {
      enabled: true,
      globalInterval: 60,
      statusPagePublic: process.env.STATUS_PAGE_ENABLED !== "false",
      statusPageUrl: "/status",
    },
    alerting: {
      enabled: true,
      globalCooldownMinutes: 5,
      maxAlertsPerHour: 50,
      channels: {
        adminEmail: {
          enabled: true,
          recipients: (process.env.ALERT_EMAIL_RECIPIENTS || "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
        },
        adminPush: {enabled: true},
        webhook: {
          enabled: Boolean(process.env.ALERT_WEBHOOK_URL),
          url: process.env.ALERT_WEBHOOK_URL || null,
          secret: process.env.ALERT_WEBHOOK_SECRET || null,
          headers: null,
        },
        slack: {enabled: false, webhookUrl: null},
      },
    },
  };
}
script
quietHours: {
    enabled: false,
    startTime: "22:00",
    endTime: "07:00",
    timezone: "Asia/Manila",
    suppressSeverities: ["info", "warning"],
  },
  dashboards: {
    refreshInterval: 30,
    defaultTimeRange: "1h",
    retainDashboardSnapshots: false,
  },
  updatedAt: now,
  updatedBy: null,
};
const configResult = await db.collection("monitoring_config").updateOne(
  {_id: "global"},
  {$setOnInsert: monitoringConfig},
  {upsert: true},
);
const checks = [
  "mongodb_connection",
  "mongodb_storage",
  "memory_usage",
  "dns_resolution",
  "scheduled_jobs",
  "question_pool",
  "application_response",
  "storage_bucket",
  "email_service",
  "ssl_certificate",
  "pangmeryenda_connectivity",
  "rate_limit_storage",
].map((checkId) => ({
  checkId,
  name: checkId.replace(/_/g, "."),
  category: "application",
  config: {
    enabled: true,
    intervalSeconds: 60,
    timeoutMs: 5000,
    retries: 1,
    degradedThreshold: {
      responseTimeMs: 2000,
      errorRate: null,
      custom: null,
    },
    alertOnFailure: true,
    alertOnDegraded: true,
    alertCooldownMinutes: 10,
    notifyChannels: ["admin_email", "admin_push"],
  },
  currentStatus: "unknown",
  lastCheckAt: null,
  lastHealthyAt: null,
  lastUnhealthyAt: null,
  consecutiveFailures: 0,
  history: [],
  updatedAt: now,
}));
let checksInserted = 0;
for (const check of checks) {
  const result = await db.collection("health_checks").updateOne(
    {checkId: check.checkId},
    {$setOnInsert: check},
    {upsert: true},
  );
  if (result.upsertedCount > 0) checksInserted += 1;
}
const rules = [
  {
    ruleId: "rule_high_error_rate",
    name: "High-Error-Rate",
    description: "API error rate exceeds threshold",
    isActive: true,
    condition: {
      type: "threshold",
      metric: "api.request.error",
      operator: "gt",
      value: 5,
      duration: 300,
      dimensions: null,
      changePercent: null,
      comparedTo: null,
      expectedMetric: null,
      maxAbsenceSeconds: null,
      logLevel: null,
      logPattern: null,
      countThreshold: null,
      windowSeconds: null,
    },
    severity: "critical",
    notifyChannels: ["admin_email", "admin_push"],
    cooldownMinutes: 5,
    autoResolve: true,
    autoResolveAfterMinutes: null,
    escalation: null,
    tags: ["api", "errors"],
    createdBy: new ObjectId("00000000000000000000000000000001"),
    createdAt: now,
  },
];
script
updatedAt: now,
},
{
    ruleId: "rule_slow_api",
    name: "Slow API Response",
    description: "API p95 duration greater than threshold",
    isActive: true,
    condition: {
        type: "threshold",
        metric: "api.request.duration",
        operator: "gt",
        value: 500,
        duration: 300,
        dimensions: null,
        changePercent: null,
        comparedTo: null,
        expectedMetric: null,
        maxAbsenceSeconds: null,
        logLevel: null,
        logPattern: null,
        countThreshold: null,
        windowSeconds: null,
    },
    severity: "warning",
    notifyChannels: ["admin_email"],
    cooldownMinutes: 10,
    autoResolve: true,
    autoResolveAfterMinutes: null,
    escalation: null,
    tags: ["api", "latency"],
    createdBy: new ObjectId("00000000000000000000000000000001"),
    createdAt: now,
    updatedAt: now,
},
];
let rulesInserted = 0;
for (const rule of rules) {
    const result = await db.collection("alert_rules").updateOne(
        { ruleId: rule.ruleId },
        {$setOnInsert: rule},
        {upsert: true},
    );
    if (result.upsertedCount > 0) rulesInserted += 1;
}

console.log(
    `\nMonitoring defaults: ${configResult.upsertedCount > 0 ? "config seeded" : "config exists"}, ${checksInserted} health checks inserted, ${rulesInserted} alert rules inserted.`,
);
}

seed().catch((err) => {
    console.error("\nSeed failed:", err);
    process.exit(1);
});