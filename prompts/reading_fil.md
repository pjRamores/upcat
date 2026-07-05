You are an expert standardized-test item writer and exam editor.

Create an ORIGINAL, UPCAT-style mock admission exam WITH an answer key and explanation or solution.

The deliverable MUST be a single, cleanly formatted PDF-ready document.

GOAL  
Produce 1 complete mock exam that covers the full scope of the UPCAT-style FILIPINO READING COMPREHENSION subtest.

LANGUAGE REQUIREMENT
- ALL passages, questions, answer choices, instructions, titles, rationales, explanations, and any other exam content MUST be written entirely in Filipino.
- Do NOT write any part of the exam in English, except for required JSON keys if applicable.
- The language used should be natural, grammatically correct, clear, and appropriate for Philippine SHS learners.
- If a source title or proper noun is originally in English, it may remain in English only when necessary, but the surrounding text must still be in Filipino.
- The exam must assess reading comprehension in Filipino, so the reading selections themselves must also be in Filipino.

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
      "title": "Pag-usbong ng Pagsasakang Panglungsod",
      "subjectArea": "Reading Comprehension",
      "source": "PhilStar Lifestyle, Marso 2026",
      "content": "Lumalawak ang pagsasakang panglungsod sa iba’t ibang lungsod habang naghahanap ang mga mamamayan ng mas sariwang ani at mas napapanatiling sistema ng pagkain. Ang mga hardin sa bubong, patayong taniman, at mga plot ng komunidad ay nagiging produktibong luntiang espasyo mula sa dating hindi napapansing mga lugar. Bukod sa suplay ng pagkain, nakatutulong ang mga inisyatibang ito sa pagpapabuti ng kalidad ng hangin, pagbawas ng init sa lungsod, at pagpapatibay ng ugnayan sa komunidad. May mga kritiko na nagsasabing hindi sapat ang ani ng mga urban farm upang makadagdag nang malaki sa suplay ng pagkain ng isang lungsod at maaaring mas mataas pa ang gastos sa tubig, ilaw, at paggawa kaysa sa benepisyo. Tinutugon naman ng mga tagasuporta na ang halaga ng kilusan ay hindi lamang nasusukat sa dami ng ani kundi pati sa edukasyon, benepisyo sa kalusugang pangkaisipan, at pagbawas ng food miles. Nagsimula nang maglaan ng subsidyo ang ilang pamahalaang lungsod sa Maynila, Singapore, at New York para sa mga programang pang-agrikultura sa lungsod, na nagpapakita ng pagbabago sa patakaran tungo sa pagsasama ng produksiyon ng pagkain sa pagpaplanong panglungsod."
    }
  ],
  "questions" : [
    {
      "subjectArea": "Reading Comprehension",
      "subtopic": "Layunin ng May-akda",
      "difficulty": "medium",
      "type": "passage_based",
      "passageId": "aaaaaaaaaaaaaaaaaaaaaaaa",
      "questionText": "Alin ang pinakamahusay na naglalarawan sa layunin ng may-akda sa paglalahad ng pananaw ng mga kritiko at tagasuporta tungkol sa pagsasakang panglungsod?",
      "choices": {
        "A": "Upang hikayatin ang mambabasa na isiping hindi praktikal ang urban farming.",
        "B": "Upang magbigay ng balanseng paglalahad ng usapin tungkol sa urban farming.",
        "C": "Upang igiit na dapat itigil ng mga pamahalaang lungsod ang pagpopondo sa urban agriculture.",
        "D": "Upang patunayang mali ang lahat ng kritiko ng urban farming."
      },
      "correctAnswer": "B",
      "rationale": "Inilahad sa teksto ang panig ng mga kritiko at tagasuporta nang hindi tahasang kumakampi sa iisang panig, kaya malinaw na layunin ng may-akda ang magbigay ng balanseng pagtalakay.",
      "tags": [
        "pagbasa",
        "layunin-ng-may-akda",
        "batay-sa-passage"
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
      "title": "string in Filipino",
      "subjectArea": "Reading Comprehension",
      "source": "string",
      "content": "string in Filipino"
    }
  ],
  "questions": [
    {
      "subjectArea": "Reading Comprehension",
      "subtopic": "string in Filipino",
      "difficulty": "easy | medium | hard | very_hard",
      "type": "passage_based",
      "passageId": "_id of the associated passage",
      "questionNumber": 1,
      "questionText": "string in Filipino",
      "choices": {
        "A": "string in Filipino",
        "B": "string in Filipino",
        "C": "string in Filipino",
        "D": "string in Filipino"
      },
      "correctAnswer": "A | B | C | D",
      "rationale": "Concise but complete explanation or step-by-step solution in Filipino",
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
- The JSON array must contain exactly 50 items.
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
- All human-readable exam content must be in Filipino.

QUALITY CONTROL (DO THIS BEFORE FINALIZING)
- Check that the JSON parses successfully without errors.
- Check that every question has exactly one best answer.
- Check numbering consistency.
- Check answer consistency.
- Check objective coverage completeness.
- Check that Markdown syntax does not break JSON formatting.
- Check that all passages, questions, choices, and rationales are written in Filipino.

FINAL OUTPUT REQUIREMENT
- Return ONLY the final JSON array.
- No markdown code fences.
- No commentary.
- No additional explanations outside the JSON.
