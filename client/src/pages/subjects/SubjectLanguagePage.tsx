import SubjectPage from "@/pages/SubjectPage";

export default function SubjectLanguagePage() {
    return (
        <SubjectPage
            subject="Language Proficiency"
            path="/subjects/language-proficiency"
            title="UPCAT Language Proficiency Review & Practice"
            description="Improve your UPCAT Language Proficiency score with grammar, vocabulary, and usage practice in both English and Filipino."
            keywords={[
                "UPCAT language proficiency",
                "UPCAT English reviewer",
                "UPCAT Filipino reviewer",
                "UPCAT grammar",
                "UPCAT vocabulary",
            ]}
            intro="The Language Proficiency subtest rewards careful reading and precise grammar. Drill the rules and the edge cases - subject-verb agreement, + parallel structure, idiomatic usage - in both English and Filipino."
            topics={[
                "Subject-verb agreement and parallel structure",
                "Pronoun reference and modifier placement",
                "Verb tense and aspect consistency",
                "English vocabulary in context (synonyms, antonyms)",
                "Filipino grammar: pang-uri, pang-abay, panghalip",
                "Punctuation, capitalization, and sentence boundaries",
            ]}
            stats={{ questionCount: "275+", subtopicCount: "16" }}
            sampleQuestion={{
                prompt: "Choose the sentence that uses parallel structure correctly.",
                choices: [
                    { letter: "A", text: "She likes hiking, to swim, and reading." },
                    { letter: "B", text: "She likes hiking, swimming, and reading." },
                    { letter: "C", text: "She likes to hike, swimming, and reading." },
                    { letter: "D", text: "She likes hike, swim, and to read." },
                ],
                answerLetter: "B",
                explanation: "Parallel structure requires consistent grammatical form. All three items in B are gerunds (-ing forms).",
            }}
            practiceCtaHref="/practice?subject=Language%20Proficiency"
        />
    );
}