You are an expert standardized-test item writer and exam editor.

Create an ORIGINAL, UPCAT-style mock admission exam WITH an answer key and explanation or solution.

The deliverable MUST be a single, cleanly formatted PDF-ready document.

GOAL
Produce 1 complete mock exam that covers the full scope of the UPCAT-style ENGLISH READING COMPREHENSION subtest.

IMPORTANT CONSTRAINTS
- Write 100% original questions (no copying/rephrasing from UPCAT, review books, or online banks).
- Use clear, unambiguous wording; one best answer only.
- Multiple-choice format: 4 options (A-D) for every item unless specified otherwise.
- Difficulty mix:
    - 10% easy
    - 47% medium
    - 30% hard
    - 13% very hard
- Avoid culture/region-specific trivia; keep content fair and accessible to Philippine SHS learners.
- Avoid requiring external references (e.g., specific laws, obscure facts). Provide any needed constants or data in question.
- Keep computations reasonable under time pressure; prefer elegant setups over long arithmetic.
- Include at least 5 word problems.

EXAM BLUEPRINT (EDITABLE DEFAULT)
Create a “Full-Length” 50-item and 40-minute mock exam (use 4-6 passages of varying length; include at least 1 paired passage set)


SCOPE + OBJECTIVES (YOU MUST COVER ALL)

The mock exam must assess the full range of competencies typically covered in the UPCAT-style Reading Comprehension subtest. Coverage should be broad, balanced, and recurring, with each objective appearing in multiple items across the set of passages.

Core Reading Comprehension Skills
- identify the main idea or central claim
- recognize supporting details and textual evidence
- make inferences and derive implied meaning
- determine tone, purpose, and author’s attitude
- analyze logic and argument structure, including claims, reasons, and assumptions
- determine the meaning of words and phrases in context
- synthesize and compare ideas, especially in paired passages
- interpret a short embedded informational element such as a table, graph, or similar text-based data
- choose an appropriate title for a selection
- identify the author’s point of view
- draw conclusions based on the text

Text Types and Forms
- essays
- articles
- speeches
- procedures
- short stories
- poetry
- mythology and fables
- comic strips
- editorial cartoons
- graphs or graph-based text presentations

Interpretive and Analytical Reading Skills
- distinguish fact from opinion
- identify and interpret figures of speech
- locate the main idea or topic sentence
- use context clues to determine meaning
- apply literary and textual criticism at an appropriate level
- make valid inferences
- use skimming and scanning strategies effectively

COVERAGE REQUIREMENTS
All objectives listed above must be represented in the exam and assessed multiple times across 4–6 passages of varying length, including at least one paired-passage set. The item set should combine literal, inferential, analytical, and evaluative reading tasks to ensure comprehensive coverage of the subtest.

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
{
  "passages" : [
    {
      "_id": "aaaaaaaaaaaaaaaaaaaaaaaa",
      "title": "The Rise of Urban Farming",
      "subjectArea": "Reading Comprehension",
      "source": "PhilStar Lifestyle, March 2026",
      "content": "Urban farming has gained momentum in cities worldwide as residents seek fresher produce and more sustainable food systems. Rooftop gardens, vertical farms, and community plots are transforming underutilized spaces into productive green areas. Beyond food supply, these initiatives improve air quality, reduce urban heat islands, and foster community cohesion. Critics argue that urban farms rarely produce enough to meaningfully supplement a city's food supply and that the resources invested - water, lighting, and labour - may exceed the benefits. Proponents counter that the movement's value lies not only in yield but also in education, mental health benefits, and reduced food miles. Municipal governments in Manila, Singapore, and New York have bugun subsidizing urban agriculture programs, signalling a policy shift toward integrating food production into city planning."
    }
  ],
  "questions" : [
    {
      "subjectArea": "Reading Comprehension",
      "subtopic": "Author's Purpose",
      "difficulty": "medium",
      "type": "passage_based",
      "passageId": "aaaaaaaaaaaaaaaaaaaaaaaa",
      "questionText": "Which best describes the author's purpose in presenting both critics' and proponents' views on urban farming?",
      "choices": {
        "A": "To persuade readers that urban farming is impractical.",
        "B": "To provide a balanced overview of the debate surrounding urban farming.",
        "C": "To argue that municipal governments should defund urban agriculture programs.",
        "D": "To show that critics of urban farming are wrong."
      },
      "correctAnswer": "B",
      "rationale": "The passage presents arguments from both critics and proponents without taking a one-sided stance, indicating the author's intent to offer a balanced perspective",
      "tags": [
        "reading",
        "author-purpose",
        "passage-based"
      ]
    }
  ]
}
```

REQUIRED JSON STRUCTURE
Return a JSON array containing exactly 50 question objects.

Each question object MUST follow this structure:
```json
{
  "passages": [
    {
      "_id": "objectId",
      "title": "string",
      "subjectArea": "Reading Comprehension",
      "source": "string",
      "content": "string"
    }
  ],
  "questions": [
    {
      "subjectArea": "Reading Comprehension",
      "subtopic": "string",
      "difficulty": "easy | medium | hard | very_hard",
      "type": "passage_based",
      "passageId": "_id of the associated passage",
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
      ]
    }
  ]
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
- questionNumber values must be unique and sequential from 1 to 50.
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
