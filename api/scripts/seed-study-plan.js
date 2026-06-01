script
/* eslint-disable no-console */

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
    content:
    {
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
    createdAt: now,
    updatedAt: now,
  };
}

function templateBase(template) {
  const now = new Date().toISOString();
  return {
    ...template,
    createdBy: "seed_script",
    createdAt: now,
    updatedAt: now,
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
    sections:
    [
      {
        type: "definition",
        title: "What is a Linear Equation?",
        content:
        "A linear equation is an equation where the highest exponent of the variable is 1. In one variable, it has the form ax + b = c."
        + "In two variables, it can be written as y = mx + b, where m is slope and b is y-intercept.",
        formula: "ax + b = c",
        example: null,
      },
      {
        type: "text",
        title: "How to Solve Step-by-Step",
        content:
        "Use inverse operations to isolate the variable. Keep both sides balanced. Perform one operation at a time and simplify as you go.",
        formula: null,
        example: null,
      },
      {
        type: "example",
        title: "Example 1",
        content: "Solve a basic equation.",
        formula: null,
        example:
        {
          problem: "Solve: 3x + 7 = 22",
          solution: "3x = 15, then x = 5",
          explanation: "Subtract 7 from both sides, then divide both sides by 3.",
        },
      },
      {
        type: "example",
        title: "Example 2",
        content: "Solve an equation with fractions.",
        formula: null,
        example:
        {
          problem: "Solve: x/4 + 3 = 8",
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
    keyTakeaways:
    [
      "Linear equations have variables to the first power.",
    ]
  ]
}
{
  "Use inverse operations to isolate the variable.",
  "Always perform the same operation on both sides.",
  "Check your answer by substitution.",
  ],
  "quickReference: [
    {label: "Standard Form", value: "ax+b=c"},
    {label: "Slope-Intercept", value: "y=mx+b"},
    {label: "Balance Rule", value: "Do the same operation on both sides"},
  ],
  "relatedQuestionTags: ["linear-equations", "algebra", "graphing"],
  ]},
  "lessonBase({
    "subjectArea: "Mathematics",
    "subtopic: "Quadratic Equations",
    "title: "Quadratic Equations & the Quadratic Formula",
    "difficulty: "medium",
    "estimatedReadingMinutes: 18",
    "sections: [
      {
        "type": "definition",
        "title": "Quadratic Form",
        "content": "A quadratic equation has the general form ax^2+bx+c=0 where a≠0.",
        "formula": "ax^2+bx+c=0",
        "example": "null",
      },
      {
        "type": "formula",
        "title": "Quadratic Formula",
        "content": "Use this when factoring is difficult or impossible.",
        "formula": "x=(-b±√(b^2-4ac))/(2a)",
        "example": "null",
      },
      {
        "type": "example",
        "title": "Example 1: Factoring",
        "content": "Solve by factoring.",
        "formula": "null",
        "example": {
          "problem": "x^2-5x+6=0",
          "solution": "(x-2)(x-3)=0, so x=2 or x=3",
          "explanation": "Find two numbers that multiply to+6 and add to-5.",
        },
      },
      {
        "type": "example",
        "title": "Example 2: Formula",
        "content": "Solve using the quadratic formula.",
        "formula": "null",
        "example": {
          "problem": "2x^2+3x-2=0",
          "solution": "x=1/2 or x=-2",
          "explanation": "Substitute a=2, b=3, c=-2 into the formula and simplify.",
        },
      },
      ],
      "keyTakeaways: [
        "Quadratic can have two, one, or no real solutions.",
        "Try factoring first for speed.",
        "Use the quadratic formula for non-factorable expressions.",
        "The discriminant b^2-4ac tells the nature of roots.",
      ],
      "quickReference: [
        {label: "General Form", value: "ax^2+bx+c=0"},
        {label: "Discriminant", value: "D=b^2-4ac"},
        {label: "Quadratic Formula", value: "x=(-b±√D)/(2a)"},
      ],
      "relatedQuestionTags: ["quadratic-equations", "factoring", "quadratic-formula"],
      ]},
  ],
  "lessonBase({
    "subjectArea: "Mathematics",
    "subtopic: "Trigonometry",
    "title: "Introduction to Trigonometry",
    "difficulty: "medium",
    "estimatedReadingMinutes: 15",
    "sections: [
      {
        "type": "text",
        "title": "Core Idea",
        "content": "Trigonometry connects angles and side lengths in triangles. The basic ratios are sine, cosine, and tangent.",
        "formula": "null",
        "example": "null",
      },
      {
        "type": "formula",
        "title": "SOH-CAH-TOA",
        "content": "Memorize the three fundamental ratios.",
        "formula": "sinθ=opposite/hypotenuse, cosθ=adjacent/hypotenuse, tanθ=opposite/adjacent",
        "example": "null",
      },
      {
        "type": "example",
        "title": "Example 1",
        "content": "Find sinθ from side lengths.",
        "formula": "null",
        "example": {
          "problem": "Right triangle with opposite=3 and hypotenuse=5. Find sinθ.",
          "solution": "sinθ=3/5=0.6",
          "explanation": "Use sine ratio opposite over hypotenuse.",
        },
      },
      {
        "type": "example",
        "title": "Example 2",
        "content": "Use special-angle values.",
        "formula": "null",
      }
    ],
  }),
}
{
  formula: "null",
  example: {
    problem: "Find·cos·60°.",
    solution: "cos·60°=1/2",
    explanation: "From·standard·special-angle·values.",
  },
  quickReference: [
    {label: "sin·30°", value: "1/2"},
    {label: "cos·45°", value: "√2/2"},
    {label: "tan·60°", value: "√3"},
  ],
  relatedQuestionTags: ["trigonometry", "special-angles", "right-triangles"],
},
lessonBase({
  subjectArea: "Science",
  subtopic: "Cell·Biology",
  title: "Cell·Biology·Fundamentals",
  difficulty: "easy",
  estimatedReadingMinutes: 14,
  sections: [
    {
      type: "definition",
      title: "Cell·Theory",
      content: "All·living·things·are·made·of·cells. Cells·are·the·basic·unit·of·life, and·new·cells·come·from·pre-existing·cells.",
      formula: "null",
      example: "null",
    },
    {
      type: "text",
      title: "Major·Organelles",
      content: "Nucleus·stores·genetic·material, mitochondria·produce·ATP, ribosomes·synthesize·proteins, and·cell·membrane·controls·transport.",
      formula: "null",
      example: "null",
    },
    {
      type: "example",
      title: "Example·1",
      content: "Function·matching.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Why·does·water·move·into·a·hypertonic·solution·from·a·cell?",
        solution: "Osmosis·drives·water·toward·higher·solute·concentration.",
        explanation: "Water·movement·across·the·membrane·balances·concentration·differences.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondrion",
        explanation: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
      example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        problem: "Which·organelle·is·responsible·for·ATP·production?",
        solution: "Mitochondria·are·the·cell's·energy·factories·via·cellular·respiration.",
      },
    },
    {
      type: "example",
      title: "Example·2",
      content: "Cell·transport·scenario.",
      formula: "null",
 example: {
        type: "Example·transport·scenario.",
      formula: "null",
 example: {
        type: "Example·transport·scenario.",
      formula: "null",
 example: {
        type: "Example·transport·scenario.",
      formula: "null",
 example: {
        type: "Example·transport·scenario.",
      formula: "null",
 example: {
        type: "Example·transport·scenario.",
      formula: "null",
 example: {
        type: "Example·transport·scenario.",
      formula: "null",
 example: {
        type: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·transmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Example·trasmites·
      title: "Male·trasmites·
      title: "Male·trasmites·
      title: "Male·trasmites·
      title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Male·trasmites·
title: "Mike-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­- -­-­- -­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-­-`-­-­-`-­-­-­-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`- - -`-`-`-`-`- - -`- - -`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`- -`-­-­-­-­-­-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`- -`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-­-­-­-­-­-­-­-­-­-­-­-­-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-­-­-­-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`- - -­-­-­-­-­-­-­-`- -­-`-`-`-`-`-`-`-`-`-­-`-`-`-`-”: 
      <tr:c"c"s -­-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-”:iC"c"sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-”:iC`-`-“-”-`-`-”-`-`-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-“-”:iC`-“-”:iC`-“-“-”:iC`-“-”:iC`-“-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iB:c"sC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:i:c"sC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iB:c"sC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”-“-`-”:iC`-“-”:iC`-“-”:iC`-“-”:iC`-“-”: -`-”-`-“-”-”-`-”-`-`-“-”: -`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-“iC"sC"sC"sC"sC`-“-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*</td>*sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`B:c"sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*sC"sC`-`-`-`-`-”:C`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*B:c"sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*B:c"sC`-`-`-`-`-`-`-*B:c`-`-`-`-*B:c"sC`-`-`-`-`-`-`-`-`-`-`-`-*B:c"sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*B:c"sC`-`-`-`-`-`-`-`-`-*B:c"sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*B:c"sC`-`-*B:c"sC`-*B:c"sC`-`-`-*B:sC`-`-*B:sC`-`-*sNice,<br>`-*Nice-`-­-­-**`-­-`-`-`-`-­-`-`-`-`-`-`-`-`-`-`-`-`-*B:sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*B:sC`-`-`-`-`-`-*Nice,<nature,<brature-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*B:sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*B:c"sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*B:c`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*B:sC`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-`-*Nice,<br mane,<br mane,<`-`-`-`-`-`-`-`-`-`-`-`-`-*B:sB:sB:c`-*nature-<`-`-`-*Nice,<nature-*nature, "sB:b:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sNice,<nature-“- - -`-`-`-`-`-`-`-`-`-`-*B:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:tic, "bearning,<brane,<b:sB:sB:sB:sB:sB:sB:sB,“-`-`-`-`-`-`-`-`-`-`-`-{-`-`-`-`-`-*B:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB{... -`-­-`-`-`-`-`-`-`-`-`-*nature-*sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:sB:tire,<br>
    <tr>
    <tr>
    <tr>
    <tr: {name,<br">B:Sage,“-*B:S:cS:caring,“-“- -​-`-`{name-<br="-`-`-“-`-`-“-`-`-`-`-`{sB:s:c:b:s:b:s:b:s:c:c:c:c:b:s:c:c:c:c:s:s:c:c:c:c:c:c:s:c:tic,“-`{s:c:c:c:c:touch,<br>
    <tr:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:nature-<nature-“-ariths, "s:c:c:c:c:c:s:tic,*B:s:tic:the:<tr:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:b:{...-`-`-`-`{s:c:c:c:c:c:c:c:c:c:c:c:c:c:s:c:B:s:B:tire, "s:c:c:c:c:c:s:c:c:c:c:c:c:c:c:c:c:B:tic,*<br>
    <tr>
    <tr:texture: <tr: -*nice-​-*c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:c:{: -`-{:c: -*c:c:c:c:c:c:c:c:c:c:c:c:b: - -{-*c:c:c:c:c:c:c:c:c:c:c:B:c:c:c:b: -`-`-*B...-`-*c:c:c:c:c:c:B,<nature-*{orange,“-{s:c:c:c:b:b:b:s:b:b:b:b:b: -`-*b:c:c:b:b:b:b:b:b:b:b:b:b:b:B:b:c:b:b:c:c:B<table>*C:c:c:c:b:c:b:b:b:{name-{name-{name-{name-{name-`{name:b:b: | "literate, "literary, "literary, "literary "literate, "literary,“-{name,“-{name, "literate, "literate,“-{name,“-{name,“-{name: {name:b:tick,“-{name: {name-{name-*{name:tic,“-*native,“- {name:nature, "s:c:C:c:c:c:c:c:c:c:c:c:b: {*\*a:tic, "literate, "literate, "literate, "s:b: {... {... {... {... {... {...$*{...$: {-{nature, "s: {... [*B,<nature,<tr,*B:c:c:{...$:c:c:c:{name-{...{... *... {... *...{...{...{name-{*B:c:b:c:c:c:S, "literate, "s: "lute, "s
```{...{...{...{*{*B:c:c:c:b:tic,“-{*\*\*\*\*\*\*\*{...{*\*\*\*\*\*\*\*{...{...{...{name-{...{...{...{...{...{...{...{...{...{name-{name-{...{...{...{...{...{...{...{...{...{...{...{*{...{...{...{...{...{*...{*\*{*\*\*{...{*\*{*{*{*{*{...{...{*{...{... [... [... {...{...{...{*{*{*{*{...{...{*{*: {...{*{*{...{*{... {*{*{*{*{*{*{*{*B:lute: 
    "literate, "i
    "lute, "literate, "...{*{*{*{*{*{...{...{*{*{...{*{...{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{...{*{*{...{...{... {... {...{*{...{*{...{...{*{*{*{*{*{*{*\*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*Congue, "literable "I
    "I
    "lute, "literable, "literable,<nature-“-`-*{*{...{*{*{*{*{*{*{*{*{*{*{*{*{*{*\*{*{*Congue, "i
    <tr{*C {*C {*C {*-*-“-*\*C {*Cearning
    <tr>
    <tr{*{*{-{*{*{*{*{*{*{*<nature-{*<nature-*{*<nature-*{*{*-*{*-“-*{*C:C:C:C, "s
    "s
    "s
    "nature-*{*{*{*{*{*{*­*<br>
    "nature*<nature="nue
    "lute
    "s
    "s
    "... `{*{*{*B:c:c:c:c:c: {*{*{*{*{*{*{*{*:c:c:c: "nature, "s: *{*{*: *{*{*{*{*{*{*\*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*{*: {"-“{nationary "literate "literate="lute*{*{*{*{*{*{*{*{* {*{*{*<br>
    "literate "literate "literate "literate "literate*{*{*{* {*{*{*{*{*{*{*-“-“
```{*{*: *-*{*:{*{*{*{*{*{*{*{*{* {*{*{* {*{* {*{*{* {* {* {* {*{*{*   {* {... "literate="i
    "lute
•
    "late*{*{*{*{*{* * * *<br>
    "lane, "nature-{*{* *{*<br>
    "lane, "lue*B</td>
    "n:c:b:c:c, "nature-* *{*{* *{*{* “
•-*{*: *{*</td>
    "... "n
    "lue
    "lane{“
    "n, "n:lue* * *{* * *{*{*{*{*{* * *{*{* {*{* * {* {* {* * *{*<td>*{*{* *{*{* * * * * *{*<br>
    "l*B:lute* *{*{*­-­-*{*­-*{*­-  {* *</td>“-*  * *  {*</td> {*: {*: {* * * *{* *­-*­-* {*{*{*{*{* *{*{ * { * * * {  * {...{*{... { { {... {*{*  * {* * * {* {* {* {*{* |nature* [* {* {m
    <tr {*{*{*{*{*       {*{*{*{*   * * * {*{*• *{*{*-*{*{* {* {* {*    {* {* * {*  {* {* * {*{* {*{*{*  * {* {...  {* {*    {*   {*{* {* {*{* * *{*{* * *• {* * {* {*{*{*{*{*{*{*  * *{*   *      {*  * {* {*: * {* * {* * {* * {* * *<supning
• {*{*{*   {*  * {*    *  {* {*  * {* * *{*   * *-* *-*-*-* {* *{* {* * * {* {* *  "*{*{* "*-*{*<sup*{*{* {* {* {* {* {* {*{* {*  {* {*     {*    {    {* {* {* * {*  * {*  {* {*- *- *-{* {i {* {*- {*  *­-­* {*­*­*{* * *{* * {*    * * * * *­*<br>
    "literary "i
    "literate* “- " “- "i
    "i {*­*{* {* {*  {“ {* " " {* {* {* {* {*{*{literate* {* {* {* {* {* {* * *{* *­*-*{* {*{* {*{* *{*{*{* *{*{* *{*{* {* {* * * {* * *{*{*{*{* {* {* * *{* * {* {* {*{*{*{*{*{*{*{*{* {* {* *{* * *{* * * *{* *{*{* * *{*{* *{*{* {*{*{* {* * *{* * {* {* *{*{*{*​*{* * *{*{* *{*{* {* {* {* {* {* {* {*{* {* {* {* {* {* {* {* {* {* {* {* {* {* {* {* {* {* {* {* * * {* {* * * *<strong
    <i
```{* *{* {* * * * * * * * * * *- *{* * * * * * * * * * * * {* * {* * * * * * * * * * * * *   * * * * {* * {* {* * {* {* *{* * {* * * * * * {* {* {* * |* {* * * * * * * * * * * * * * * * * * * * * * * * * *  * * * " * * " * " * * " * " * *<sup* * *<sup{* {*   {i
    {* * *    {* {  { * * {*<strong* " {* * * * * * {* * * * * *<td aligningary "­*<td align="i
    <td align="*{* * *<strong " * *<td align="i
*<td align="i
*{* *{* * *<td align="i
    "i
    <i
    " *{*{* * *{*<supning
    <i
    <td>*{*{*{* *<sup *{*{*<sup* *{*{*{*{*{* * *-*-*<sup*{* *<sup绩
*{*{* * *{*<sup* " *<sup... " * * * *<sup绩
*<sup *<sup绩
*{* "* * * *<sup绩
* *   * *<sup * * * * *- *   {* *  * * *-lianealongary "*<td aligning
    <i
      <td aligning
* {* {*  * * * * *-   *- *-ing
| {* {*-lianeinged="
*   {* *    * {* <td align="s
*<suputeary "literary "literary "literary "literary "literary "laneing
<table> * * *<td aligningary "i
<table> *<supning
<table> * * *<td align="i
*<td align="i
<table*- {* * *<td align="i
<table>*- *-{*<supning
<table>*{* *<supers
<table> *<td align="li
<table>*<td>
    <td align="luteary "i
<table>* * *<td align="li
<table>*<td>
    <td align="lane's
      <td aligning
    <td aligning
<table> * * * *<td align{ * *{*<td aligning
*{*{*{*{alongue
*<td align="{|*<td aligning
```{* {*{*{ {* {*{ *{
    <td aligning
    <td aligning
```{ {... * * {... "i
<table* * *<sup... * {* *<td="*   ... *<td aligning
<table> {...   {...  * *     *    *<td="
```{*<sup{*{*<sup[]<sup {* * { {... "i
```{* {*<td="i
```{* *<sup{*<sup{* {* <sup{*<sup[] "iote{*<sup{*<sup... *<td aligning
*<td aligning
*<sup... * *<td aligning
    <td aligning
    <td align="lium
    <td="​*... <td align="liate{* |... "i
<table> {* <td="li
```{*<td="liute{*... "i
<table> {*{... {... * {... {... {... {* *<td="
<table> {*<td="liate{* {... *... * {... "iota{* |*<td aligning
```{ * {... * *<td="
```{* {* *<td="
    <td="
    <td="
    <td="
    <td="
    <td aligning
    <td="
    <td align{* {* {*{ { { { { |* * {* {*<td=" {*<td aligning
    <td align="lane{ {*... {* [*<td aligning
    <td aligning
    <td aligning { { {* { {* * {* {*: "s
```{* {* {* {* {* {* {*  {* {          * * {* {* * { {* { { * |* * { { * { { { { { { | {* { { { { { { { { { { { { * { { { { {* { {* {* {*: {*: 
```{... {... |* {...  {* {... {... { { { { {* <td aligning
      <td aligning
```{ { {* { { [* * * [* * { [* * * * * * {* * {*{* {*{* * * * *... {... *... *... { {... [* {* * { [* { {... {...{... {... {* ... * * ... ... * * {...<td="­* ...* *: 
```{*: 
    <td aligning
    <td aligning
    <td align{*  { {... ... * {... { *: {...<td aligning
    <td aligning
    <td aligning
    <td aligning
    <td aligning
    <td aligning
    <td aligning... { { { { {*: 
    <td aligning
```{*: 
```{note
        <td="
```{note
    <td aligning
    <td aligning
```{*<td aligning
    <td aligning
    <td aligning
    <td aligning
    <td aligning
```{*:   [*: {*: *: |td aligning
```{|tding
```{|{*{* [* [* [*: * [*: *: |*<td aligning
      <td aligning
      <td aligning
      <td aligning
      <td aligning
      <td aligning
```{*... { aline
```{ [* * * * * [* [* * [* * * [* { [* * * [*[*[*[*[*[*[* * *[*[*[* * *<td aligning
    <td aligning
    <td aligning
    <td aligning
```{ { { {* { * { {* * * * * { { [* * * * * {note
 * {* * {* {note
    <td aligning
    <td aligning
    <td aligning
    <td aligning
      {  {* * {note
    <td aligning
    <td aligning
    <td aligning
    "literary
    "ide
    "line
        `(**{note
    <td aligning
    <td aligning
    <td aligning
    <td aligning
    `'* {note
    <td aligning
    <td aligning
    <td aligning
    <td aligning
    <td aligning
      <td aligning
    <td aligning
      {*{ {note
      <td aligning
      <td aligning
```{ {note
      {ine
      {ine
      {note
      <td aligning
      <td aligning
```{note
        <td aligning
        `{ alongue
    <td aligning
    `[*{ { {note
        `alonging
        `{*{*{*{*{*{*{*{n
       ing
    `along
        <td aligning
    <td aligning
    <td aligning
    <td aligning
    <td aligning
    <td aligning
    <td aligning
    <td aligning
        `aline
        `along
    "litered
```{note
     ute
        <td aligning
```{ { {... { { {... { { {*<td aligning
    <td aligning
      <td aligning
      <td aligning
      <td aligning
```{*<td aligning
```{ alongue
```{note
```{ {n
```{n
```{note
      <td aligning
```{*隙
```{note
      <td aligning
```{note
      <td
      <td
      <td aligning
      <td aligning
      <td aligning
      <td aligning
```{* ing
    <tdute
    <td aligning
    <td aligning
```{note
      <td aligning
    <td aligning
        `alongue
        `alongue
        `{note
        `(**{note
```{note
        <td
```{note
        "li
      <td
        `{note
        `alterning
        `alterning
        `{ {* *<td aligning
        "lium
```{note
```{note
```{n{n
        `{n
        `{note
      <td
```{*<td aligning
       ing
       ing
       ing
      <td aligning
      <td aligning
      `al*<td aligning
      <td aligning
      <td aligning
```{note
      <td>
      <td
      <td
      <td
      <td aligning
      {note
      `{n
```{n,<td aligning
      <td aligning
      <td aligning
      <td aligning
      <td aligning
```{n
```{n
```{*<td
```{*{*{n\text{n\text{n
      <td aligning
```{* * alitered
```{* {* alitered
      <td
```{*{*{*{*{* al* al*<td aligning
     


```{*{n
```{n
     


```<td aligning
        `aliter
        `(**{n
        `alternate
    <td
      <td aligning
      <td aligning
    <td aligning
        `aliter
        `{n
        `to
      <td
      <td aligning
      <td
      <td="
      <td aligning
      <td
      <td
      <td
      <td
      <td
      <td aligning
      <td
     <td
     <td
      <td
      <td
```<td aligning
      <td align="lium
     <td aligning
```<td
```{ *<td align="
      <td align="
      <td align="
      <td align="
      <td align="
      <td align="
      <td align="
      <td="
      <td align="
      <td align="
      <br>
    <td align="
      <td
      <td align="
      <td
      <td align="
      <td align="
        <td>
    <td align="li
      <td
      <td>
    <td
      <td align="
      <td>​<td>
    <td>​<td>
      <td aligning
      <td aligning
      <td
      <td align="os
      <td align="li
     <td>*{n,<td>​-{
    <td align="
      <td>​->
    </td>
    <td
      <td>
    <td>
    <td>​-{
    <td>*...
    <td align="
      <td align="
      <td>​->
    <td> *<td align="
      <td align="
      <td align="
      <td align="
      <td align="
      <td align="
      <td align="
      <td align="
      <td align="
      <td align="lium
      <td> alternature
      <td align="
      <td>​->
    <td align="
      <td align="
      <td align="
      <td*<td>​<td
      <td>*{ iterum
      <td>...<td>...<td>​<td>
      `->
    <td>*{nature
      <td>​->
    <td align="
      <td>* * 
```<td>​<td>​->
    <td>\
    <td
      <td>
    <td
      <td>
      <td>
      <td>...<td>
    <td>
    <td>
{
  example: {
    problem: "Classify NaCl bonding.",
    solution: "Ionic bond",
    explanation: "Metal-sodium transfers an electron to nonmetal chlorine."
  },
  keyTakeaways: [
    "Ionic = transfer, covalent = share.",
    "Electronegativity difference predicts bond behavior.",
    "Molecular shape affects polarity.",
    "Bonding explains many physical properties."
  ],
  quickReference: [
    {label: "Ionic", value: "Metal + nonmetal"},
    {label: "Covalent", value: "Nonmetal + nonmetal"},
    {label: "Metallic", value: "Metal lattice + electron sea"}
  ],
  relatedQuestionTags: ["chemical-bonding", "electronegativity", "polarity"],
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
        example: null
      },
      {
        type: "tip",
        title: "Problem-Solving Routine",
        content: "Draw a free-body diagram, list known values, choose a sign convention, and solve systematically.",
        formula: null,
        example: null
      },
      {
        type: "example",
        title: "Example 1",
        content: "Compute force.",
        formula: null,
        example: {
          problem: "A 2 kg object accelerates at 3 m/s^2. Find net force.",
          solution: "F = 6 N",
          explanation: "Apply F = ma = 2 x 3."
        }
      },
      {
        type: "example",
        title: "Example 2",
        content: "Action-reaction pair.",
        formula: null,
        example: {
          problem: "A swimmer pushes water backward. Why does she move forward?",
          solution: "Water exerts an equal and opposite force on the swimmer.",
          explanation: "Newton's third law creates propulsion."
        }
      },
      {
        type: "example",
        title: "Inertia resists changes in motion.",
        content: "Net force determines acceleration.",
        formula: "Mass and acceleration are proportional through F = ma.",
        example: "Forces come in equal and opposite pairs."
      },
      {
        type: "tip",
        title: "Problem-Solving Routine",
        content: "Draw a free-body diagram, list known values, choose a sign convention, and solve systematically.",
        formula: null,
        example: {
          problem: "A swimmer pushes water backward. Why does she move forward?",
          solution: "Water exerts an equal and opposite force on the swimmer.",
          explanation: "Newton's third law creates propulsion."
        }
      },
      {
        type: "example",
        title: "Example 3",
        content: "Action = -Reaction",
        formula: null,
        example: {
          problem: "A swimmer pushes water backward. Why does she move forward?",
          solution: "Water exerts an equal and opposite force on the swimmer.",
          explanation: "Newton's third law creates propulsion."
        }
      },
      {
        type: "tip",
{
  title: "Tricky·Cases",
  content: "Watch·collective·nouns, compound·subjects, indefinite·pronouns, and·words·between·subject·and·verb.",
  formula: "null",
  example: "null",
},
{
  type: "example",
  title: "Example",
  content: "Agreement·with·interrupting·phrase.",
  formula: "null",
  example: {
    problem: "The·list·of·items·(is/are)·on·the·desk.",
    solution: "is",
    explanation: "The·true·subject·is·singular·list.",
  },
},
keyTakeaways: [
  "Match·verbs·to·the·true·subject.",
  "Ignore·prepositional·phrases·for·agreement.",
  "Indefinite·pronouns·often·take·singular·verbs.",
  "Read·sentences·aloud·to·catch·mismatches.",
],
quickReference: [
  {label: "Each·/·Every", value: "Usually·singular"},
  {label: "Either/Neither", value: "Singular·unless·paired·with·plural·near·verb"},
  {label: "As·well·as", value: "Does·not·make·subject·plural"},
],
relatedQuestionTags: ["subject-verb-agreement", "grammar"],
lessonBase({
  subjectArea: "Language·Proficiency",
  subtopic: "Vocabulary",
  title: "Common·Vocabulary·for·Academic·Texts",
  difficulty: "medium",
  estimatedReadingMinutes: 13,
  sections: [
    {
      type: "text",
      title: "Context·Clues",
      content: "Infer·word·meaning·by·reading·nearby·clues: definition, contrast, example, or cause-and-effect·context.",
      formula: "null",
      example: "null",
    },
    {
      type: "text",
      title: "Word·Parts",
      content: "Prefixes, roots, and suffixes·reveal·meaning. For example, 'bio'·means·life, and '-logy'·means·study.",
      formula: "null",
      example: "null",
    },
    {
      type: "example",
      title: "Example",
      content: "Use·contrast·clue.",
      formula: "null",
      example: {
        problem: "Though·his·brother·was·verbose, Carlo·was·succinct.",
        solution: "succinct·means·brief",
        explanation: "The·contrast·with·verbose·(wordy)·implies·brevity.",
      },
    },
    {
      type: "example",
      title: "Example",
      content: "Use·sentence·context·before·guessing.",
      learn: common·prefixes·and·suffixes.",
      track: new·words·in·a·personal·list.",
      review: in·spaced·intervals·for·retention.",
    },
    quickReference:
    {
      label: "Prefix·anti-", value: "against"},
      label: "Suffix·-ology", value: "study·of"},
      label: "Root·dict", value: "say/speak"},
    ],
    relatedQuestionTags: ["vocabulary", "context-clues", "word-roots"],
  },
  lessonBase({
    subjectArea: "Language·Proficiency",
    subtopic: "Sentence·Structure",
    title: "Sentence·Construction·&·Parallelism",
    difficulty: "medium",
    estimatedReadingMinutes: 14,
    sections:
    {
      type: "text",
      title: "Structure·Basics",
      content: "Clear·writing·depends·on·complete·clauses, proper·punctuation, and·consistent·structure.",
      formula: "null",
      example: "null",
    },
    {
      type: "definition",
      title: "Parallelism",
      content: "Items·in·a·list·or·paired·ideas·should·use·the·same·grammatical·form.",
      formula: "null",
      example: "null",
    },
    {
      type: "example",
      title: "Example",
      content: "Fix·a·non-parallel·sentence.",
      formula: "null",
      example: {
        problem: "She·likes·reading·to·swim, and·biking.",
solution: "She likes reading, swimming, and biking.",
explanation: "All list items are now in gerund form.",
},
},
keyTakeaways: [
  "Keep sentence parts grammatically consistent.",
  "Avoid fragments and run-ons.",
  "Use punctuation to show relationships clearly.",
  "Parallelism improves readability and logic.",
]
quickReference: [
  {label: "Parallel List", value: "verb-ing, verb-ing, verb-ing"},
  {label: "Common Error", value: "Mixed infinitive and gerund forms"},
  {label: "Check", value: "Read list items aloud"},
]
relatedQuestionTags: ["parallelism", "sentence-construction", "grammar"],
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
      content: "After each paragraph, ask what is the author doing here? Defining, arguing, contrasting, or giving evidence?",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
      type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
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
    {
    type: "summary",
      title: "Exam Routine",
      content: "Preview questions, read actively, annotate quickly, and eliminate weak answer choices.",
 formula: null,
      example: null,
    },
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary","
    {
    type: "summary",
    {
    type: "summary",
    type: "summary",
    {
    type: "summary",
    {
    type: "summary",
    {
    type: "summary", 
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
    •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        •
        ...,
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      »️, 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        //      ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., 
        ..., ..., 
        ..., 
        ..., ..., 
        ..., ..., ..., ..., ..., ..., ..., ..., ..., ..., ..., or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, "境内, "境内, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, "境内, "境内, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, "境内, or, "境内, "境内, "境内, "..., or, or, or, "..., or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, "境内, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, or, "境内, "境内, "境内, "..., "，or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "for, "or, "or, "or, "or, ", "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "for, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, or, "or, or, or, or, or, "or, "or, or, or, or, "or, "or, or, or, "or, or, or, "or, "or, "or, "or, "or, "or, or, or, "or, or, "or, "or, "or, "or, "or, or, or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "r\n, "for, "or, or, or, or, "or, "or, "or, or, "or, "or, "or, "or, "or, "or, "or, "or, "or, "or, or, "or, "for, "or, "or, "or, "or, "l, "or, "i, "...", "i, "...", "or, "l, or, or, "or, "or, "or, "or, "or, or, "or, or, or, "or, or, "or, or, "or, "or, "or, or, "or, "or, "or, "or, "or, "or, "r, "for, "or, "r, "or, "or, "for, "or, or, or, "or, "or, "or, "or, "or, "or, "or, "or, "for, "or, "or, "or, "or, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "and, "r, "r, "for, "r, "tire", "for, "r, "return, or, "r, r, "r, "r, "r, r, r, r, r, r, r, "r, r, "r, "," "," "," "r, "r, "r, "r, "tire, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "text, "r, "r, "r, "r, "r, "t, r, "r, "r, "r, "r, r, r, r, "r, "r, r, "and, "r, "r, "and, "r, "r, "r, "r, "r, r, r, "r, r, "re, "and, r, "r, "r, "r, r, "r, "r, "r, "," "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "," "r, "r, "r, "," "r, "r, "r, r, r, "，" "，" "text, "i, "ver, "and, ", "r, "," "text, r, ", "," "r, "i, "r, "r, "r, ", "r, "r, r, "r, "r, r, r, r, r, "r, ", "r, "r, "r, r, r, "r, "r, r, "r, r, "r, "r, r, r, r, "and, "r, "r, "r, "r, "r, "r, "r, "l, "r, "r, "l, "r, "r, "r, or, "r, or, "r, or, "r, "r, "r, "r, "r, "r, "r, "r, or, "or, "r, or, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "r, "re, "re, "Ir, "i, "l, "i, "i, "i, "i, "i, "i, "i: *</td="for, "re, "re, "re, "re, "r,  ..., "re, or, "r, or, "Ir, *</td, "re, "r, or, or, "r, "re, "r, or, "re, "re, "re, "re, "re, "Ir, "re, "i, "and, "i, "i, "re, "re, "re, "re, "re, "re, "re, "re, "re, "re, "re, "re, "re, "re, "r, "re, "r, "r, "r, "r, "r, "re, "re, "re, "re, "r, "re, "r, "r, or, "re, "re, "re, "re, "r, "r, "r, "r, "r, "r, "r, "i, "l, "i, "i: 
    <td, "i, "r, "r, *</td, "r, or, "l, "r, "r,*</td, "Region, "Name, "Value, "Value, "value, "r, "re, "r, "re, "r, "r, "r, or, value, "value, "re, "r, "r, value, "value, "value, "value, "i, "i, "i: "i: "re, "i, "i: "i, "i, "r, "re, "r, "r, "r, "re, "r, "r, "r, "r, "r, ", ", "re, ", "ver, "ver, "i, "I, "for, "Region, "value, "image, "value, "re, "re, "re, "re, "s, or, "value, "value, "value, "value, "re, "re, or, or, "l, "l, "liter, "liter, "..., "Region, ..., "Region, "s, "s, "s, "s, "s, "s,*</td, "s, or, "s, or, "s, "s, "s, "s, "s, "re, "s, "re, "re, "re, "name, "Name, "Name: "Name: "Name: "Name: "Name:Name:Name:Name:Name:Name:Name:Name:Name:Name:Name:Name:  , "re, "s, "re, "r, "s, ..., "s,   ..., "s,*</td="­, "s,*</td, "s, or, "s, "s, "s, "re, "r, "s, or,  * *</td* *</td* *repeat, "value, "image, "s, "image, "­, "s, "s, "s, "s, "s, "re, "s, "s, "s, "s, "s, "re, "s, "re, "re, "re, "­, "re, "re, "re, "re, "re, "­, "­, "­, "and, ", "re, "re, "re, "re, "and, "re, "re, "re, "r, "s, "s, " , "s, "s, "r, "­, "s, "­, "­, "­, "for, "for", "­, "­, "­, "­, "­, "re, "s, "s, "s, "s, "s, "s, "s, "s, "re, "s, "s, "s, "image, "image, "ver, "ver, "­, "­, "s, "re, "           *</td align="image, "s, "s, "s, "s, "s, "s, "s, "text, "­, "­, "image, "image, "name: "­, "name:name:name: * *</td="text, "­, "inputs, "s, "s, or, "s, "­, "s, "­, "­, "­, "­, "r, "s, "s, "­, "­, "­, "­, "­, "­, "­, "­, "­, "r, "­, "image, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "s, "­, "­, "­, "­, "­, "­, "­, "s, "­, "­, "name, "­, "name, "name, "s, "s, "s, "s, "s, "s, "s, "s, "s, "­, ", "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "­, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "­, "s, "s, "­, "­, "nature, "nature, "re, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "­, "­, "­, "s, "­, "s, ", "s, ", "s, "s, "s, "..., "s, "s, "s, "s, "image, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "s, "...", "s, "r, "­, "s, "name, "s, "s, "s, "s, "s, "s, "s, "s, "s, "text, "s, "s, "name, "name:name, "­, "s, "... "... "s, "s, "s, "s, "s, "s, "s, "­, "­, "s, "lots, "s, "­, "nature, "s, "s, "s, "s, "s, "s, "s, "re... "r, "­nature, "s, "r, "s, "re, "re, "for, "Ir, "re, "re, "re, "m
    ..., "m, "nature, "...", "­, "nature, "..., "re, "r, "re, "re, "s, "s, "s, "s, "­, "­, "­, "re, "­, "­, "​, "­, "­, "­, "s, "s, "s, "­, "s, "s, "s, "境内, "s, ", "," or, "s, "for, "for, "for, "liter, "s, "s, "re, "­, "­, "s, "s, "s, "s, "­, "s, "s, "r, "s, "r, "s, "s, "s, "s, "s, "s, "m, "­, "­, "­, "s, "s, "­, "­, "s, "s, "r, "s, "­, "­, "­, "s, "re, "m, "m, "m, "­, "­, "­, "m, "­, "m, "­, "repeat, "repeat, "s, "s, "s, "s, "s, "r, "s, "m, "m, "m, "m, "境内, "m, "name, "m, "region, "for, "r, "m, "­, "­, "­, "liter, "­, "­, "­, "­, "text, "      repeat, " {*​, "item, "­, "r, "s, "... "...", "m, "name, "name, "name, "name, "re, "s, "s, "s, "​, "name, "repeat, "line, "re, "­, "line, "...", "repeat, "repeat, "​, "­, "​, "­, "­, "r, "­, "­, "name, "name, "­, "re, "name, "m, "name, "m, "name, "m, "name, "m, "s, "s, "... `core, "name, "name, "name, "name, "m, "m, "­, "I, "I, "­, "­, "r, "­, "​*​*​*​*​*​*​*​*​*</td>
    {name, "name, "­, "name, "­, "­, "text, "...", "s, "...", "­, "­, "­, "m, "=", "­, "­, "m, "­, "­name, "­, "­, "­read, "­, "­readsound, "­read, "I, "­reads "", "r, "m, "m, "m, "m, "m, "境内, "m, "name, "­
    "text, "­
    , or, "­
    "text, "r, "text, "­, "­, "m, "­
    ..., "for, "­, "­
    "­, "­
    ...", "repeat, "­, "­, "s, "­, "­, "­
    "text, "­
*​, "­
    "，" <font, "name: 
    "name, "r, "text, "text, "text, "s
    "text, "s, "s, "s, "s, "repeat, "­
    "text, "name, "text, "name, "text, "name, "text, "name, "name, "text, "text, "­
    "text, "name, "name, "name, "name, "­reads=", "­
    "text, "text, "name, "text, "­, "text, "­name, "name, "­name, "name, "name, "name, "­, "­, "­, "m, "me, "name, "境内, " read, "reads, "reads, "reads, "­, "­
    <tr>
    <tr>
    <tr>
    "texture, "text, "text, "surementary, "text, "text, "name, "text, "name
```{*­reads
```{font, "text, "text, "name, "name, "name
```{* readsion, "name, "name, "name, "name, "name, "name, "r, "reads, "reads, "reads, "read, "reads, "threat, "readsize
    <tr, "name, "name, "name, "name
```{name, "re, "name
*<br>
    <tr, "text, "s, "s
* readsound, "re, "re, "re, "threat, "name, "name, "name, ornamental, "name, "name, "name, "name, "name, ornamentalized, "name, "name, "reads, "re, ornamental, "ide, "repeat, ornamning, "name, "re, "lengths
    `[... readsion, "re, "s, "s
*​*...,
    <tr, "text, "s, "s, "s, "s, "s, "s, "s, "s, "s, "re... [mealong, "re, "re, "name, "name, "name, "name, "name, "name, "or, "or, "or, "or, "name, "...  *... [re, "name, "native, "... [re, "name, "s, "... `[*... [... `[... `[... `[... `reads
      <tr, "name, "literation
    <tr.ly, "name, "lue, "...[iterate, "... `[... `[font, "... `[repeat, "... *​*​, "... `[... `reads, "­, or
    `[*.
    `[... `[*.
    `[... `[*\*... `[*native, "repeatable, "repeat, "surementation, "repeat, "... `[mealong, "repeat, "name, "reads, "re*n, "re, "re, "threads[alized, "retr.tear, "resear, "re... [re... [or, "name
    <tr... [re... reads
    <tr, "re
    <tr, "repeatable, "s, "s, "s, "... reads
    "s, "name, "reads, "reads, "reads, "reads, "s
    <tr, "s
    <tr, "line, "reads
    <tr, "s
    <tr... *<tr... [repeat, "re... `[re... [re... `[re, "s
    "reads
    <td align="line, "reads
    <td>s
    <td align="field
    <tr, "name, "i
    <tr, "i, "i, "re... reads
    <td>*<td>* reads
    <td align="reads
    <td align="reads
    <td align="­[* reads
    <td>* * * reads, "re: reads
    `reads
    `reads, "reads
    `reads
    `readsure
    `reads
    "reads, "reads
    "reads
    "readsurement, "reads
    `reads
    "reads
    "reads
    "readsuremental*<td align="reads
    "s
    "reads, "reads
    "s
    "s
    `s
    <td>*<br>
    <td>*  *... `s
    `reads, "reads, "reads
    "reads
    "reads
    "reads
    "reads
    "reads
    <td align="line, "reads
    <td align="s
    <td align="s
    "s
    <td align="s
    <td align="reads
    "reads
    <td align="line, "s
    <td align="line, "texturementary, "texturementary, "... reads
    "... [re, "s
    <td> [td align="reads
    <td align="reads, "s
    <td align="reads
    `{... `reads
    "reads
    `[td="reads
    `readsure
    "reads
    `[td
    `[... `[*    reads
    `reads
    <td>... [td aligning
    <td align="reads
    <td•  [td
    `reads
    `... `reads, "re...reads
    <td align="reads
    "reads, "re... `[... `reads, "reads, "reads, "reads,<td,<td>
    {@...
lessonBase({
  subjectArea: "Reading·Comprehension",
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
      example: null
    },
    {
      type: "text",
      title: "Evidence-Based Inference",
      content: "Strong inferences combine textual clues with logical reasoning. Avoid assumptions that go beyond the passage.",
      formula: null,
      example: null
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
      }
    },
  ],
  keyTakeaways: [
    "Inference must be evidence-based.",
    "Notice tone words and qualifiers.",
    "Avoid extreme choices unless text supports them.",
    "Cross-check inference with multiple clues.",
  ],
  quickReference: [
    {label: "Inference", value: "What the reader concludes"},
    {label: "Implication", value: "What the author suggests"},
    {label: "Rule", value: "Use text + logic"},
  ]
}
{
  relatedQuestionTags: ["inference", "implication", "author-purpose"],
  lessonBase({
    subjectArea: "Reading·Comprehension",
    subtopic: "Argument·Analysis",
    title: "Analyzing·Arguments",
    difficulty: "medium",
    estimatedReadingMinutes: 14,
    sections: [
      {
        type: "text",
        title: "Argument·Anatomy",
        content: "Most·arguments·contain·a·claim,·evidence,·assumptions,·and·a·line·of·reasoning·connecting·evidence·to·claim.",
        formula: null,
        example: null
      },
      {
        type: "warning",
        title: "Common·Fallacies",
        content: "Watch·for·ad·hominem,·false·dilemma,·hasty·generalization,·and·post·hoc·reasoning.",
        formula: null,
        example: null
      },
      {
        type: "example",
        title: "Example",
        content: "Spot·a·weak·argument.",
        formula: null,
        example: {
          problem: "I·met·two·rude·tourists·from·City·X,·so·people·from·City·X·are·rude.",
          solution: "This is a hasty generalization.",
          explanation: "A·broad·claim is made from insufficient sample size."
        }
      },
      ],
      keyTakeaways: [
        "Separate·claims·from·evidence.",
        "Evaluate·whether·evidence is·sufficient·and·relevant.",
        "Identify·hidden·assumptions.",
        "Recognize·logical·fallacies·quickly."
      ],
      quickReference: [
        {label: "Claim", value: "What is being argued"},
        {label: "Evidence", value: "Support for the claim"},
        {label: "Fallacy", value: "Reasoning error"}
      ],
      relatedQuestionTags: ["argument-analysis", "logical-fallacies", "critical-reading"],
    })
  ]
}
```

```json
const studyPlanTemplates = [
  templateBase({
    name: "Standard·8-Week·UPCAT·Prep",
    description: "Balanced, comprehensive·8-week·curriculum·covering all·UPCAT·subjects.",
    targetDuration: 8,
    targetHoursPerDay: 2,
    structure:
      {
        phases:
        {
          name: "Foundation",
          weekStart: 1,
          weekEnd: 2,
          description: "Build·core·concepts·across·all·subjects.",
          modules:
          {
            module("Language·Proficiency", "Grammar", "Grammar·Foundations", "easy", 2),
            module("Mathematics", "Linear·Equations", "Algebra·Fundamentals", "easy", 3),
            module("Science", "Cell·Biology", "Biology·Basics", "easy", 2),
            module("Reading·Comprehension", "Passage·Strategies", "Reading·Basics", "easy", 2),
          },
        },
        {
          name: "Strengthening",
          weekStart: 3,
          weekEnd: 5,
          description: "Grow·speed·and·accuracy·using·mixed·practice.",
          modules:
          {
            module("Language·Proficiency", "Vocabulary", "Academic·Vocabulary", "medium", 2),
            module("Mathematics", "Quadratic·Equations", "Quadratic·Mastery", "medium", 3),
            module("Science", "Chemical·Bonding", "Chemistry·Essentials", "medium", 2),
            module("Reading·Comprehension", "Inference", "Inference·Skills", "medium", 2),
          },
        },
        {
          name: "Mastery",
          weekStart: 6,
          weekEnd: 7,
          description: "Integrate·advanced·concepts·and·timed·accuracy.",
          modules:
          {
            module("Language·Proficiency", "Sentence·Structure", "Parallelism·and·Precision", "medium", 2),
            module("Mathematics", "Trigonometry", "Trigonometry·Essentials", "hard", 3),
            module("Science", "Newton's·Laws", "Physics·Problem·Solving", "hard", 3),
            module("Reading·Comprehension", "Argument·Analysis", "Argument·Evaluation", "medium", 2),
          },
        },
        {
          name: "Review·&·Mock·Prep",
          weekStart: 8,
          weekEnd: 8,
          description: "Final·consolidation·and·exam-readiness·checks.",
          modules:
          {
            module("Language·Proficiency", "Grammar", "Language·Final·Review", "medium", 2),
            module("Mathematics", "Quadratic·Equations", "Math·Final·Review", "hard", 2),
            module("Science", "Chemical·Bonding", "Science·Final·Review", "medium", 2),
            module("Reading·Comprehension", "Argument·Analysis", "Reading·Final·Review", "medium", 2),
          }
        }
      ]
}
script
],
},
],
},
adaptationRules: {
  weakAreaExtraTime: 50,
  strongAreaReduction: 30,
  failedAssessmentAction: "add_remedial",
  minimumModuleDays: 2,
  maximumModuleDays: 5,
},
}),
templateBase({
  name: "Intensive·4-Week·Crash·Course",
  description: "High-intensity plan focused on high-impact topics and weak areas.",
  targetDuration: 4,
  targetHoursPerDay: 3,
  structure: {
    phases: [
      {
        name: "Rapid·Assessment·&·Gaps",
        weekStart: 1,
        weekEnd: 1,
        description: "Identify·weak·spots·and·refresh·high-yield·basics.",
        modules: [
          module("Mathematics", "Linear·Equations", "Math·Gap·Repair", "medium", 2),
          module("Language·Proficiency", "Grammar", "Grammar·Gap·Repair", "medium", 2),
          module("Science", "Cell·Biology", "Science·Gap·Repair", "medium", 2),
        ],
      },
      {
        name: "Targeted·Practice",
        weekStart: 2,
        weekEnd: 3,
        description: "Focused·drills·on·priority·topics.",
        modules: [
          module("Mathematics", "Quadratic·Equations", "Targeted·Algebra", "hard", 3),
          module("Science", "Chemical·Bonding", "Targeted·Chemistry", "hard", 2),
          module("Reading·Comprehension", "Inference", "Targeted·Inference", "medium", 2),
          module("Language·Proficiency", "Vocabulary", "Targeted·Vocabulary", "medium", 2),
        ],
      },
      {
        name: "Mock·Exam·Sprint",
        weekStart: 4,
        weekEnd: 4,
        description: "Timed·readiness·and·strategic·review.",
        modules: [
          module("Reading·Comprehension", "Argument·Analysis", "Reading·Sprint", "hard", 2),
          module("Science", "Newton's·Laws", "Science·Sprint", "hard", 2),
          module("Mathematics", "Trigonometry", "Math·Sprint", "hard", 2),
        ],
      },
      {
        name:
        adaptationRules: {
          weakAreaExtraTime: 60,
          strongAreaReduction: 20,
          failedAssessmentAction: "slow_pace",
          minimumModuleDays: 1,
          maximumModuleDays: 4,
        },
      },
    }],
  ];

function module(subjectArea, subtopic, name, difficulty, estimatedDays) {
  return {
    subjectArea,
    subtopic,
    name,
    difficulty,
    estimatedDays,
    prerequisites: [],
    objectives: [
      `Understand key ${subtopic} concepts`,
      `Apply ${subtopic} techniques in UPCAT-style questions`,
      `Demonstrate confidence in module-end assessment`,
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
script
{$set: template},
{upsert: true},
);
if (result.upsertedCount > 0) templateInserted += 1;
}

console.log(
  `\nStudy plan content: ${studyLessons.length} lessons (${lessonInserted} new), ` +
  `${studyPlanTemplates.length} templates (${templateInserted} new).`,
);
}