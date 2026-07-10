You are an expert standardized-test item writer and exam editor.

Create an ORIGINAL, UPCAT-style mock admission exam WITH an answer key and explanation or solution.

The deliverable MUST be a single, cleanly formatted PDF-ready document.

GOAL
Produce 1 complete mock exam that covers the full scope of the UPCAT-style SCIENCE subtest.

IMPORTANT CONSTRAINTS
- Write 100% original questions (no copying/rephrasing from UPCAT, review books, or online banks).
- Use clear, unambiguous wording; one best answer only.
- Multiple-choice format: 4 options (A-D) for every item unless specified otherwise.
- Difficulty mix:
    - 10% easy
    - 40% medium
    - 38% hard
    - 12% very hard
- Avoid culture/region-specific trivia; keep content fair and accessible to Philippine SHS learners.
- Avoid requiring external references (e.g., specific laws, obscure facts). Provide any needed constants or data in question.
- Keep computations reasonable under time pressure; prefer elegant setups over long arithmetic.
- Include at least 5 word problems.

EXAM BLUEPRINT (EDITABLE DEFAULT)
Create a “Full-Length” 60-item and 60-minute mock exam

SCOPE + OBJECTIVES (YOU MUST COVER ALL)

The mock exam must assess the full range of competencies typically covered in the UPCAT-style Science subtest. Coverage should be balanced across domains and should include both conceptual understanding and light computational/problem-solving tasks.

Biology
- cell structure and function
- biomolecules
- metabolism
- genetics and heredity
- evolution
- ecology
- reproduction
- taxonomy and classification
- biodiversity
- viruses
- characteristics of major plant and animal groups

Chemistry
- matter and its properties
- chemical bonding
- compounds and chemical nomenclature
- chemical reactions
- solutions
- acids and bases
- gas laws
- thermodynamics
- organic chemistry

Earth Science
- Earth’s structure
- origin of Earth
- Earth processes
- plate tectonics
- earthquakes
- volcanoes
- rocks and the rock cycle
- fossils
- atmosphere
- climate
- geologic history
- the solar system

General Science
- measurement
- the scientific method
- astronomy
- geology
- meteorology
- principles of light

Physics
- motion
- forces
- energy
- momentum
- vectors and scalars
- fluid mechanics
- pressure
- friction
- electricity
- magnetism
- waves
- optics
- circular motion

COVERAGE REQUIREMENTS
All objectives listed above must be represented in the exam, with broad and repeated coverage across the 60 items. The test should include a mix of direct concept questions and short quantitative or applied problems.

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
    "subjectArea": "Science",
    "subtopic": "Cell Biology",
    "difficulty": "medium",
    "type": "multiple_choice",
    "questionText": "Which organelle is primarily responsible for producing ATP in eukaryotic cells?",
    "choices": {
      "A": "Nucleus",
      "B": "Mitochondrion",
      "C": "Golgi apparatus",
      "D": "Ribosome"
    },
    "correctAnswer": "B",
    "rationale": "Mitochondria carry out cellular respiration and generate ATP.",
    "tags": [
      "biology",
      "cell"
    ],
    "isWordProblem": false
  }
]
```

REQUIRED JSON STRUCTURE
Return a JSON array containing exactly 60 question objects.

Each question object MUST follow this structure:
```json
[
  {
    "subjectArea": "Science",
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
]
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
- Return ONLY the final JSON array.
- No markdown code fences.
- No commentary.
- No additional explanations outside the JSON.
- If there is any conflict between pretty formatting and JSON validity, prioritize JSON validity.
- The output must be directly copy-pasteable into a .json file and parse successfully.
