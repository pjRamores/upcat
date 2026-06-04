script
/*eslint-disable no-console */
function lessonBase({
    subjectArea,
    subtopic,
    title,
    difficulty,
    estimatedReadingMinutes,
    sections,
    keyTakeaways,
    quickReference,
    relatedQuestionTags,
}) {
    const now = new Date().toISOString();
    return {
        subjectArea,
        subtopic,
        title,
        content: {
            format: "structured",
            body: null,
            sections,
        },
        keyTakeaways,
        quickReference,
        difficulty,
        estimatedReadingMinutes,
        prerequisites: [],
        relatedQuestionTags,
        status: "published",
        createdBy: "seed_script",
        createdat: now,
        updatedat: now,
    };
}

function templateBase(template) {
    const now = new Date().toISOString();
    return {
        ...template,
        createdBy: "seed_script",
        createdat: now,
        updatedat: now,
        status: "active",
    };
}

const studyLessons = [
    lessonBase({
        subjectArea: "Mathematics",
        subtopic: "Linear Equations",
        title: "Understanding Linear Equations",
        difficulty: "easy",
        estimatedReadingMinutes: 16,
        sections: [
            {
                type: "definition",
                title: "What is a Linear Equation?",
                content: `
A linear equation is an equation where the highest exponent of the variable is 1. In one variable, it has the form ax + b = c. In two variables, it can be written as y = mx + b, where m is slope and b is y-intercept.`,
                formula: "ax + b = c",
                example: null,
            },
            {
                type: "text",
                title: "How to Solve Step-by-Step",
                content: `
Use inverse operations to isolate the variable. Keep both sides balanced. Perform one operation at a time and simplify as you go.`,
                formula: null,
                example: null,
            },
            {
                type: "example",
                title: "Example 1",
                content: "Solve a basic equation.",
                formula: null,
                example: {
                    problem: "3x + 7 = 22",
                    solution: "3x = 15, then x = 5",
                    explanation: "Subtract 7 from both sides, then divide both sides by 3.",
                },
            },
            {
                type: "example",
                title: "Example 2",
                content: "Solve an equation with fractions.",
                formula: null,
                example: {
                    problem: "x/4 + 3 = 6",
                    solution: "x/4 = 5, then x = 20",
                    explanation: "Subtract 3 from both sides, then multiply both sides by 4.",
                },
            },
            {
                type: "summary",
                title: "Quick Wrap-up",
                content: "Linear equations model constant-rate relationships and are foundational for algebra and graphing.",
                formula: null,
                example: null,
            },
        ],
        keyTakeaways: [
            "Linear equations have variables to the first power.",
        ],
    }),
];
script
    "Use inverse operations to isolate the variable.",
    "Always perform the same operation on both sides.",
    "Check your answer by substitution.",
  ],
  quickReference: [
    { label: "Standard Form", value: "ax + b = c" },
    { label: "Slope-Intercept", value: "y = mx + b" },
    { label: "Balance Rule", value: "Do the same operation on both sides" },
  ],
  relatedQuestionTags: ["linear-equations", "algebra", "graphing"],
}),
lessonBase({
  subjectArea: "Mathematics",
  subtopic: "Quadratic Equations",
  title: "Quadratic Equations & the Quadratic Formula",
  difficulty: "medium",
  estimatedReadingMinutes: 18,
  sections: [
    {
      type: "definition",
      title: "Quadratic Form",
      content: "A quadratic equation has the general form ax^2 + bx + c = 0 where a ≠ 0.",
      formula: "ax^2 + bx + c = 0",
      example: null,
    },
    {
      type: "formula",
      title: "Quadratic Formula",
      content: "Use this when factoring is difficult or impossible.",
      formula: "x = (-b ± √(b^2 - 4ac)) / (2a)",
      example: null,
    },
    {
      type: "example",
      title: "Example 1: Factoring",
      content: "Solve by factoring.",
      formula: null,
      example: {
        problem: "x^2 - 5x + 6 = 0",
        solution: "(x - 2)(x - 3) = 0, so x = -2 or x = 3",
        explanation: "Find two numbers that multiply to +6 and add to -5.",
      },
    },
    {
      type: "example",
      title: "Example 2: Formula",
      content: "Solve using the quadratic formula.",
      formula: null,
      example: {
        problem: "2x^2 + 3x - 2 = 0",
        solution: "x = 1/2 or x = -2",
        explanation: "Substitute a=2, b=3, c=-2 into the formula and simplify.",
      },
    },
  ],
  keyTakeaways: [
    "Quadratics can have two, one, or no real solutions.",
    "Try factoring first for speed.",
    "Use the quadratic formula for non-factorable expressions.",
    "The discriminant b^2 - 4ac tells the nature of roots.",
  ],
  quickReference: [
    { label: "General Form", value: "ax^2 + bx + c = 0" },
    { label: "Discriminant", value: "D = b^2 - 4ac" },
    { label: "Quadratic Formula", value: "x = (-b ± √D) / (2a)" },
  ],
  relatedQuestionTags: ["quadratic-equations", "factoring", "quadratic-formula"],
}),
lessonBase({
  subjectArea: "Mathematics",
  subtopic: "Trigonometry",
  title: "Introduction to Trigonometry",
  difficulty: "medium",
  estimatedReadingMinutes: 15,
  sections: [
    {
      type: "text",
      title: "Core Idea",
      content: "Trigonometry connects angles and side lengths in triangles. The basic ratios are sine, cosine, and tangent.",
      formula: null,
      example: null,
    },
    {
      type: "formula",
      title: "SOH-CAH-TOA",
      content: "Memorize the three fundamental ratios.",
      formula: "sin θ = opposite/hypotenuse, cos θ = adjacent/hypotenuse, tan θ = opposite/adjacent",
      example: null,
    },
    {
      type: "example",
      title: "Example 1",
      content: "Find sin θ from side lengths.",
      formula: null,
      example: {
        problem: "Right triangle with opposite=3 and hypotenuse=5. Find sin θ.",
        solution: "sin θ = 3/5 = 0.6",
        explanation: "Use sine ratio: opposite over hypotenuse.",
      },
    },
    {
      type: "example",
      title: "Example 2",
      content: "Use special angle values.",
      formula: null,
      example: {
        problem: "Find cos 45°.",
        solution: "cos 45° = √2/2",
        explanation: "Use the 45-45-90 triangle ratio.",
      },
    },
  ],
});
script
formula: null,
example: {
    problem: "Find cos 60°.",
    solution: "cos 60° = 1/2",
    explanation: "From standard special angle values.",
},
],
keyTakeaways: [
    "Use SOH-CAH-TOA for right triangles.",
    "Know common angle values: 30°, 45°, 60°.",
    "Draw and label triangles carefully.",
    "Match the ratio to the required side lengths.",
],
quickReference: [
    { label: "sin 30°", value: "1/2" },
    { label: "cos 45°", value: "√2/2" },
    { label: "tan 60°", value: "√3" },
],
relatedQuestionTags: ["trigonometry", "special-angles", "right-triangles"],
}),
lessonBase({
    subjectArea: "Science",
    subtopic: "Cell Biology",
    title: "Cell Biology Fundamentals",
    difficulty: "easy",
    estimatedReadingMinutes: 14,
    sections: [
        {
            type: "definition",
            title: "Cell Theory",
            content: "All living things are made of cells. Cells are the basic unit of life, and new cells come from pre-existing cells.",
            formula: null,
            example: null,
        },
        {
            type: "text",
            title: "Major Organelles",
            content: "Nucleus stores genetic material, mitochondria produce ATP, ribosomes synthesize proteins, and cell membrane controls transport.",
            formula: null,
            example: null,
        },
        {
            type: "example",
            title: "Example 1",
            content: "Function matching.",
            formula: null,
            example: {
                problem: "Which organelle is responsible for ATP production?",
                solution: "Mitochondrion",
                explanation: "Mitochondria are the cell's energy factories via cellular respiration.",
            },
        },
        {
            type: "example",
            title: "Example 2",
            content: "Cell transport scenario.",
            formula: null,
            example: {
                problem: "Why does water move into a hypertonic solution from a cell?",
                solution: "Osmosis drives water toward higher solute concentration.",
                explanation: "Water movement across the membrane balances concentration differences.",
            },
        },
    ],
    keyTakeaways: [
        "Cells are the fundamental units of life.",
        "Organelles have specialized functions.",
        "Membranes regulate what enters and leaves cells.",
        "ATP is the energy currency of cells.",
    ],
    quickReference: [
        { label: "Nucleus", value: "Stores DNA" },
        { label: "Mitochondria", value: "Produce ATP" },
        { label: "Ribosomes", value: "Protein synthesis" },
    ],
    relatedQuestionTags: ["cell-biology", "organelles", "osmosis"],
}),
lessonBase({
    subjectArea: "Science",
    subtopic: "Chemical Bonding",
    title: "Chemical Bonding",
    difficulty: "medium",
    estimatedReadingMinutes: 16,
    sections: [
        {
            type: "text",
            title: "Bond Types",
            content: "Ionic bonds involve electron transfer, covalent bonds involve sharing electrons, and metallic bonds involve delocalized electron clouds.",
            formula: null,
            example: null,
        },
        {
            type: "definition",
            title: "Electronegativity",
            content: "Electronegativity is an atom's ability to attract bonding electrons. Greater difference generally increases ionic character.",
            formula: null,
            example: null,
        },
        {
            type: "example",
            title: "Example 1",
            content: "Bond identification.",
            formula: null,
            example: {
                problem: "Identify the type of bond in NaCl.",
                solution: "Ionic bond",
                explanation: "NaCl is composed of sodium and chlorine ions, which transfer electrons to form oppositely charged ions.",
            },
        },
        {
            type: "example",
            title: "Example 2",
            content: "Predict the type of bond in H₂O.",
            formula: null,
            example: {
                problem: "Predict the type of bond in H₂O.",
                solution: "Covalent bond",
                explanation: "H₂O consists of hydrogen and oxygen atoms, which share electrons to form covalent bonds.",
            },
        },
    ],
    keyTakeaways: [
        "Ionic bonds involve electron transfer.",
        "Covalent bonds involve electron sharing.",
        "Metallic bonds involve delocalized electrons.",
        "Electronegativity difference affects bond type.",
    ],
    quickReference: [
        { label: "Ionic", value: "Electron transfer" },
        { label: "Covalent", value: "Electron sharing" },
        { label: "Metallic", value: "Delocalized electrons" },
    ],
    relatedQuestionTags: ["chemical-bonding", "ionic-bonds", "covalent-bonds", "metallic-bonds"],
}),
script
example: {
    problem: "Classify NaCl bonding.",
    solution: "Ionic bond",
    explanation: "Metal sodium transfers an electron to nonmetal chlorine.",
  },
  {
    type: "example",
    title: "Example 2",
    content: "Polarity reasoning.",
    formula: null,
    example: {
      problem: "Why is H2O polar?",
      solution: "Unequal electron sharing and bent geometry create net dipole.",
      explanation: "Oxygen pulls electrons more strongly than hydrogen.",
    },
  },
  keyTakeaways: [
    "Ionic = transfer, covalent = share.",
    "Electronegativity difference predicts bond behavior.",
    "Molecular shape affects polarity.",
    "Bonding explains many physical properties.",
  ],
  quickReference: [
    { label: "Ionic", value: "Metal + nonmetal" },
    { label: "Covalent", value: "Nonmetal + nonmetal" },
    { label: "Metallic", value: "Metal lattice + electron sea" },
  ],
  relatedQuestionTags: ["chemical-bonding", "electronegativity", "polarity"],
}),
lessonBase({
  subjectArea: "Science",
  subtopic: "Newton's Laws",
  title: "Newton's Laws of Motion",
  difficulty: "medium",
  estimatedReadingMinutes: 18,
  sections: [
    {
      type: "text",
      title: "Three Laws",
      content: "First law: inertia. Second law: F = ma. Third law: action-reaction force pairs.",
      formula: "F = ma",
      example: null,
    },
    {
      type: "tip",
      title: "Problem-Solving Routine",
      content: "Draw a free-body diagram, list known values, choose a sign convention, and solve systematically.",
      formula: null,
      example: null,
    },
    {
      type: "example",
      title: "Example 1",
      content: "Compute force.",
      formula: null,
      example: {
        problem: "A 2 kg object accelerates at 3 m/s^2. Find net force.",
        solution: "F = 6 N",
        explanation: "Apply F = ma = 2 x 3.",
      },
    },
    {
      type: "example",
      title: "Example 2",
      content: "Action-reaction pair.",
      formula: null,
      example: {
        problem: "A swimmer pushes water backward. Why does she move forward?",
        solution: "Water exerts an equal and opposite force on the swimmer.",
        explanation: "Newton's third law creates propulsion.",
      },
    },
  ],
  keyTakeaways: [
    "Inertia resists changes in motion.",
    "Net force determines acceleration.",
    "Mass and acceleration are proportional through F = ma.",
    "Forces come in equal and opposite pairs.",
  ],
  quickReference: [
    { label: "1st Law", value: "Inertia" },
    { label: "2nd Law", value: "F = ma" },
    { label: "3rd Law", value: "Action = -Reaction" },
  ],
  relatedQuestionTags: ["newtons-laws", "forces", "kinematics"],
}),
lessonBase({
  subjectArea: "Language Proficiency",
  subtopic: "Grammar",
  title: "Subject-Verb Agreement Rules",
  difficulty: "easy",
  estimatedReadingMinutes: 12,
  sections: [
    {
      type: "text",
      title: "Core Rule",
      content: "Singular subjects take singular verbs; plural subjects take plural verbs. Ignore interrupting phrases.",
      formula: null,
      example: null,
    },
    {
      type: "tip",
script
title: "Tricky-Cases",
content: "Watch·collective·nouns,·compound·subjects,·indefinite·pronouns,·and·words·between·subject-and·verb.",
formula: null,
example: null,
},
{
    type: "example",
    title: "Example",
    content: "Agreement·with·interrupting·phrase.",
    formula: null,
    example: {
        problem: "The·list·of·items·(is/are)·on·the·desk.",
        solution: "is",
        explanation: "The·true·subject·is·singular·list.",
    },
},
],
keyTakeaways: [
    "Match·verbs-to-the·true·subject.",
    "Ignore·prepositional·phrases·for·agreement.",
    "Indefinite·pronouns·often·take·singular·verbs.",
    "Read·sentences·aloud-to-catch·mismatches.",
],
quickReference: [
    { label: "Each./Every", value: "Usually·singular" },
    { label: "Either/Neither", value: "Singular-unless·paired-with·plural·near·verb" },
    { label: "As·well-as", value: "Does·not·make·subject-plural" },
],
relatedQuestionTags: ["subject-verb-agreement", "grammar"],
}),
lessonBase({
    subjectArea: "Language-Proficiency",
    subtopic: "Vocabulary",
    title: "Common·Vocabulary·for·Academic·Texts",
    difficulty: "medium",
    estimatedReadingMinutes: 13,
    sections: [
        {
            type: "text",
            title: "Context·Clues",
            content: "Infer·word-meaning·by·reading·nearby·clues·definition,·contrast,·example,·or·cause-and-effect·context.",
            formula: null,
            example: null,
        },
        {
            type: "text",
            title: "Word-Parts",
            content: "Prefixes,·roots,·and·suffixes·reveal·meaning.·For·example,·'bio'·means·life,·and·'logy'·means·study.",
            formula: null,
            example: null,
        },
        {
            type: "example",
            title: "Example",
            content: "Use·contrast·clue.",
            formula: null,
            example: {
                problem: "Though·his·brother·was·verbose,·Carlo·was·succinct.",
                solution: "succinct·means·brief",
                explanation: "The·contrast·with·verbose·(wordy)·implies·brevity.",
            },
        },
    ],
    keyTakeaways: [
        "Use·sentence-context·before·guessing.",
        "Learn·common·prefixes-and·suffixes.",
        "Track·new·words-in·a·personal·list.",
        "Review-in·spaced·intervals-for-retention.",
    ],
    quickReference: [
        { label: "Prefix:·anti-", value: "against" },
        { label: "Suffix:·-ology", value: "study-of" },
        { label: "Root:·dict", value: "say/speak" },
    ],
    relatedQuestionTags: ["vocabulary", "context-clues", "word-roots"],
}),
lessonBase({
    subjectArea: "Language-Proficiency",
    subtopic: "Sentence-Structure",
    title: "Sentence-Construction·&·Parallelism",
    difficulty: "medium",
    estimatedReadingMinutes: 14,
    sections: [
        {
            type: "text",
            title: "Structure-Basics",
            content: "Clear·writing-depends-on·complete·clauses,·proper·punctuation,·and·consistent·structure.",
            formula: null,
            example: null,
        },
        {
            type: "definition",
            title: "Parallelism",
            content: "Items·in·a·list·or·paired·ideas·should·use·the·same·grammatical·form.",
            formula: null,
            example: null,
        },
        {
            type: "example",
            title: "Example",
            content: "Fix·a·non-parallel·sentence.",
            formula: null,
            example: {
                problem: "She·likes·reading,·to·swim,·and·biking.",
                solution: "She·likes·reading,·swimming,·and·biking.",
                explanation: "The·items·in·the·list·should·be·in·the·same·form."
            },
        },
    ],
    keyTakeaways: [
        "Identify·and·correct·parallelism·errors.",
        "Ensure·subject-verb-agreement·in·parallel·structures.",
        "Maintain·consistency·in·sentence·structure.",
    ],
    quickReference: [
        { label: "Parallel·items", value: "Use·the·same·form" },
        { label: "Subject-verb-agreement", value: "Ensure·correct·agreement" },
        { label: "Consistency", value: "Maintain·uniform·structure" },
    ],
    relatedQuestionTags: ["sentence-structure", "parallelism"],
})
script
solution: "She likes reading, swimming, and biking.",
explanation: "All list items are now in gerund form.",
},
],
keyTakeaways: [
"Keep sentence parts grammatically consistent.",
"Avoid fragments and run-ons.",
"Use punctuation to show relationships clearly.",
"Parallelism improves readability and logic.",
],
quickReference: [
{ label: "Parallel List", value: "verb-ing, verb-ing, verb-ing" },
{ label: "Common Error", value: "Mixed infinitive and gerund forms" },
{ label: "Check", value: "Read list items aloud" },
],
relatedQuestionTags: ["parallelism", "sentence-construction", "grammar"],
}),
lessonBase({
subjectArea: "Reading Comprehension",
subtopic: "Passage Strategies",
title: "Strategies for Reading Passages",
difficulty: "easy",
estimatedReadingMinutes: 12,
sections: [
{
type: "text",
title: "Skim Then Scan",
content: "Skim first for structure and tone, then scan for key details tied to specific questions.",
formula: null,
example: null,
},
{
type: "tip",
title: "Main Idea Method",
content: "After each paragraph, ask: what is the author doing here? Defining, arguing, contrasting, or giving evidence?",
formula: null,
example: null,
},
{
type: "summary",
title: "Exam Routine",
content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
formula: null,
example: null,
},
],
keyTakeaways: [
"Read with purpose, not passively.",
"Identify the role of each paragraph.",
"Use elimination for multiple-choice options.",
"Anchor answers in textual evidence.",
],
quickReference: [
{ label: "Skim", value: "Structure and thesis" },
{ label: "Scan", value: "Specific details" },
{ label: "Verify", value: "Evidence in text" },
],
relatedQuestionTags: ["main-idea", "reading-strategy", "passage-analysis"],
})
script
lessonBase({
    subjectArea: "Reading Comprehension",
    subtopic: "Inference",
    title: "Inference and Implication",
    difficulty: "medium",
    estimatedReadingMinutes: 13,
    sections: [
        {
            type: "definition",
            title: "Inference vs. Implication",
            content: "An implication is suggested by the author; an inference is concluded by the reader from clues.",
            formula: null,
            example: null,
        },
        {
            type: "text",
            title: "Evidence-Based Inference",
            content: "Strong inferences combine textual clues with logical reasoning. Avoid assumptions that go beyond the passage.",
            formula: null,
            example: null,
        },
        {
            type: "example",
            title: "Example",
            content: "Infer tone from wording.",
            formula: null,
            example: {
                problem: "The report called the proposal 'ambitious but underfunded.' What is implied?",
                solution: "The idea is promising but unlikely to succeed without more resources.",
                explanation: "Both positive and limiting language shape a cautious interpretation.",
            },
        },
    ],
    keyTakeaways: [
        "Inference must be evidence-based.",
        "Notice tone, words, and qualifiers.",
        "Avoid extreme choices unless text supports them.",
        "Cross-check inference with multiple clues.",
    ],
    quickReference: [
        { label: "Inference", value: "What the reader concludes" },
        { label: "Implication", value: "What the author suggests" },
        { label: "Rule", value: "Use text + logic" },
    ],
},
script
relatedQuestionTags: ["inference", "implication", "author-purpose"],
}), lessonBase({
subjectArea: "Reading Comprehension",
subtopic: "Argument Analysis",
title: "Analyzing Arguments",
difficulty: "medium",
estimatedReadingMinutes: 14,
sections: [
{
type: "text",
title: "Argument Anatomy",
content: "Most arguments contain a claim, evidence, assumptions, and a line of reasoning connecting evidence to claim.",
formula: null,
example: null,
},
{
type: "warning",
title: "Common Fallacies",
content: "Watch for ad hominem, false dilemma, hasty generalization, and post hoc reasoning.",
formula: null,
example: null,
},
{
type: "example",
title: "Example",
content: "Spot a weak argument.",
formula: null,
example: {
problem: "I met two rude tourists from City X, so people from City X are rude.",
solution: "This is a hasty generalization.",
explanation: "A broad claim is made from insufficient sample size.",
},
},
],
keyTakeaways: [
"Separate claims from evidence.",
"Evaluate whether evidence is sufficient and relevant.",
"Identify hidden assumptions.",
"Recognize logical fallacies quickly.",
],
quickReference: [
{ label: "Claim", value: "What is being argued" },
{ label: "Evidence", value: "Support for the claim" },
{ label: "Fallacy", value: "Reasoning error" },
],
relatedQuestionTags: ["argument-analysis", "logical-fallacies", "critical-reading"],
}),
const studyPlanTemplates = [
templateBase({
name: "Standard 8-Week UPCAT Prep",
description: "Balanced, comprehensive 8-week curriculum covering all UPCAT subjects.",
targetDuration: 8,
targetHoursPerDay: 2,
structure: {
phases: [
{
name: "Foundation",
weekStart: 1,
weekEnd: 2,
description: "Build core concepts across all subjects.",
modules: [
module("Language Proficiency", "Grammar", "Grammar Foundations", "easy", 2),
module("Mathematics", "Linear Equations", "Algebra Fundamentals", "easy", 3),
module("Science", "Cell Biology", "Biology Basics", "easy", 2),
module("Reading Comprehension", "Passage Strategies", "Reading Basics", "easy", 2),
],
},
{
name: "Strengthening",
weekStart: 3,
weekEnd: 5,
description: "Grow speed and accuracy using mixed practice.",
modules: [
module("Language Proficiency", "Vocabulary", "Academic Vocabulary", "medium", 2),
module("Mathematics", "Quadratic Equations", "Quadratic Mastery", "medium", 3),
module("Science", "Chemical Bonding", "Chemistry Essentials", "medium", 2),
module("Reading Comprehension", "Inference", "Inference Skills", "medium", 2),
],
},
{
name: "Mastery",
weekStart: 6,
weekEnd: 7,
description: "Integrate advanced concepts and timed accuracy.",
modules: [
module("Language Proficiency", "Sentence Structure", "Parallelism and Precision", "medium", 2),
module("Mathematics", "Trigonometry", "Trigonometry Essentials", "hard", 3),
module("Science", "Newton's Laws", "Physics Problem Solving", "hard", 3),
module("Reading Comprehension", "Argument Analysis", "Argument Evaluation", "medium", 2),
],
},
{
name: "Review & Mock Prep",
weekStart: 8,
weekEnd: 8,
description: "Final consolidation and exam-readiness checks.",
modules: [
module("Language Proficiency", "Grammar", "Language Final Review", "medium", 2),
module("Mathematics", "Quadratic Equations", "Math Final Review", "hard", 2),
module("Science", "Chemical Bonding", "Science Final Review", "medium", 2),
module("Reading Comprehension", "Argument Analysis", "Reading Final Review", "medium", 2),
],
}),
script
}, ],
}, ],
}, ],
adaptationRules: {
    weakAreaExtraTime: 50,
    strongAreaReduction: 30,
    failedAssessmentAction: "add remedial",
    minimumModuleDays: 2,
    maximumModuleDays: 5,
}),
templateBase({
    name: "Intensive 4-Week Crash Course",
    description: "High-intensity plan focused on high-impact topics and weak areas.",
    targetDuration: 4,
    targetHoursPerDay: 3,
    structure: {
        phases: [
            {
                name: "Rapid Assessment & Gaps",
                weekStart: 1,
                weekEnd: 1,
                description: "Identify weak spots and refresh high-yield basics.",
                modules: [
                    module("Mathematics", "Linear Equations", "Math Gap Repair", "medium", 2),
                    module("Language Proficiency", "Grammar", "Grammar Gap Repair", "medium", 2),
                    module("Science", "Cell Biology", "Science Gap Repair", "medium", 2),
                ],
            },
            {
                name: "Targeted Practice",
                weekStart: 2,
                weekEnd: 3,
                description: "Focused drills on priority topics.",
                modules: [
                    module("Mathematics", "Quadratic Equations", "Targeted Algebra", "hard", 3),
                    module("Science", "Chemical Bonding", "Targeted Chemistry", "hard", 2),
                    module("Reading Comprehension", "Inference", "Targeted Inference", "medium", 2),
                    module("Language Proficiency", "Vocabulary", "Targeted Vocabulary", "medium", 2),
                ],
            },
            {
                name: "Mock Exam Sprint",
                weekStart: 4,
                weekEnd: 4,
                description: "Timed readiness and strategic review.",
                modules: [
                    module("Reading Comprehension", "Argument Analysis", "Reading Sprint", "hard", 2),
                    module("Science", "Newton's Laws", "Science Sprint", "hard", 2),
                    module("Mathematics", "Trigonometry", "Math Sprint", "hard", 2),
                ],
            },
        ],
    },
    adaptationRules: {
        weakAreaExtraTime: 60,
        strongAreaReduction: 20,
        failedAssessmentAction: "slow pace",
        minimumModuleDays: 1,
        maximumModuleDays: 4,
    }),
},
function module(subjectArea, subtopic, name, difficulty, estimatedDays) {
    return {
        subjectArea,
        subtopic,
        name,
        difficulty,
        estimatedDays,
        prerequisites: [],
        objectives: [
            "Understand key ${subtopic} concepts",
            "Apply ${subtopic} techniques in UPCAT-style questions",
            "Demonstrate confidence in module-end assessment",
        ],
        assessmentConfig: {
            questionCount: difficulty === "hard" ? 20 : 15,
            passThreshold: 75,
            maxAttempts: 3,
        },
    };
}
export async function seedStudyPlanContent(db) {
    const lessonsCol = db.collection("study_lessons");
    const templatesCol = db.collection("study_plan_templates");

    let lessonInserted = 0;
    for (const lesson of studyLessons) {
        const result = await lessonsCol.updateOne(
            {title: lesson.title},
            {$set: lesson},
            {upsert: true},
        );
        if (result.upsertedCount > 0) lessonInserted += 1;
    }

    let templateInserted = 0;
    for (const template of studyPlanTemplates) {
        const result = await templatesCol.updateOne(
            {name: template.name},
            {$set: template},
            {upsert: true},
        );
        if (result.upsertedCount > 0) templateInserted += 1;
    }
}
script
console.log(
    `\nStudy plan content: ${studyLessons.length} lessons (${lessonInserted} new), ${studyPlanTemplates.length} templates (${templateInserted} new)`,
);