You are an expert standardized-test item writer and exam editor.

Create an ORIGINAL, UPCAT-style mock admission exam WITH an answer key and explanations/solutions.

The deliverable MUST be a single valid JSON structure that can be imported into another application.

GOAL
Produce 1 complete mock exam that covers the full scope of the UPCAT-style MATHEMATICS subtest.

IMPORTANT CONSTRAINTS
- Write 100% original questions (no copying/rephrasing from UPCAT, review books, or online banks).
- Use clear, unambiguous wording; one best answer only.
- Multiple-choice format: 4 options (A-D) for every item unless specified otherwise.
- Difficulty mix:
    - 25% easy
    - 50% medium
    - 20% hard
    - 5% very hard
- Avoid culture/region-specific trivia; keep content fair and accessible to Philippine SHS learners.
- Avoid requiring external references (e.g., specific laws, obscure facts). Provide any needed constants or data in question.
- Keep computations reasonable under time pressure; prefer elegant setups over long arithmetic.
- Include at least 5 word problems.

EXAM BLUEPRINT (EDITABLE DEFAULT)
Create a “Full-Length” 60-item and 75-minute mock exam.

SCOPE + OBJECTIVES (YOU MUST COVER ALL)

Objectives to include (cover broadly and repeatedly):

Algebra
- Simplify and evaluate algebraic expressions.
- Solve linear, quadratic, logarithmic, radical, and rational equations.
- Apply laws of exponents and factoring techniques.
- Analyze functions, sequences, series, and coordinate geometry.
- Solve word problems using algebraic models.

Arithmetic and Sets
- Perform operations on integers, fractions, decimals, and sets.
- Apply order of operations, ratios, proportions, and percentages.
- Determine factors, multiples, and divisibility.
- Classify real and imaginary numbers.

Geometry
- Analyze geometric figures, angles, triangles, polygons, and circles.
- Compute perimeter, area, volume, and surface area.
- Apply congruence, similarity, and measurement conversions.

Inequalities
- Solve and graph linear, polynomial, rational, and absolute value inequalities.

Logic
- Analyze propositions and logical statements.
- Construct truth tables and determine logical equivalences.

Statistics
- Solve problems involving probability, counting principles, permutations, and combinations.
- Interpret graphs and compute measures of central tendency.
- Apply conditional probability concepts.

Trigonometry
- Evaluate trigonometric functions and identities.
- Apply sine and cosine laws.
- Use degree/radian measures, special angles, and the unit circle.

OUTPUT FORMAT
Return ONLY valid JSON.
Do not include markdown code fences, comments, explanations, or additional text outside the JSON output.

IMPORTANT JSON TEXT FORMATTING RULES
- Text fields inside the JSON MAY contain Markdown syntax.
- Markdown is allowed in:
    - questionText
    - rationale
    - instructions
    - explanations
    - notes
- You MAY use:
    - LaTeX math notation
    - bullet lists
    - numbered lists
    - bold and italic formatting
    - line breaks using `\n`
    - tables in Markdown format
- Mathematical expressions may use:
    - Inline LaTeX: `$x^2 + y^2 = z^2$`
    - Block LaTeX: `$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$`
- Ensure Markdown content is properly escaped for valid JSON.
- Do not wrap the entire JSON output in Markdown code fences.

SAMPLE JSON STRUCTURE
```json
[
  {
    "subjectArea": "Mathematics",
    "subtopic": "Linear Equations",
    "difficulty": "easy",
    "type": "multiple_choice",
    "questionText": "If 3x + 5 = 20, what is the value of x?",
    "choices": {
      "A": "3",
      "B": "4",
      "C": "5",
      "D": "6"
    },
    "correctAnswer": "C",
    "rationale": "3x = 15, so x = 5.",
    "objectives": [
      "Simplify and evaluate algebraic expressions"
    ],
    "tags": [
      "algebra",
      "linear"
    ],
    "isWordProblem": false
  }
]
```


REQUIRED JSON STRUCTURE
Return a JSON array containing exactly 60 question objects.

Each question object MUST follow this structure:
```json
{
  "subjectArea": "Mathematics",
  "subtopic": "string",
  "difficulty": "easy | medium | hard | very_hard",
  "type": "multiple_choice",
  "questionNumber": 1,
  "questionText": "string",
  "choices": {
    "A": "string",
    "B": "string",
    "C": "string",
    "D": "string"
  },
  "correctAnswer": "A | B | C | D",
  "rationale": "Concise but complete explanation or step-by-step solution",
  "objectives": [
    "Objective text from the required objective list"
  ],
  "tags": [
    "topic tag",
    "difficulty tag"
  ],
  "isWordProblem": true
}
```


RULES FOR JSON GENERATION
- Ensure the JSON is syntactically valid.
- Escape special characters properly.
- Use double quotes for all keys and string values.
- Do not include trailing commas.
- The JSON array must contain exactly 60 items.
- Every item must include:
    - subjectArea
    - subtopic
    - difficulty
    - type
    - questionNumber
    - questionText
    - choices
    - correctAnswer
    - rationale
    - objectives
    - tags
    - isWordProblem
- questionNumber values must be unique and sequential from 1 to 60.
- Every question must have exactly one correct answer.
- Ensure correct answers are randomly distributed among A-D.
- Ensure all required objectives are covered across the dataset.
- Include at least 5 word problems where "isWordProblem" is true.
- Ensure distractors are plausible and not obviously wrong.
- Ensure the requested difficulty distribution is satisfied.

QUALITY CONTROL (DO THIS BEFORE FINALIZING)
- Check that the JSON parses successfully without errors.
- Check that every question has exactly one best answer.
- Check numbering consistency.
- Check answer consistency.
- Check objective coverage completeness.
- Check that Markdown syntax does not break JSON formatting.

FINAL OUTPUT REQUIREMENT
Return ONLY the final JSON array.
No markdown code fences.
No commentary.
No additional explanations outside the JSON.
