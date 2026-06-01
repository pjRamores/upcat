import SubjectPage from "@/pages/SubjectPage";

export default function SubjectMathPage() {
  return (
    <SubjectPage
      subject="Mathematics"
      path="/subjects/mathematics"
      title="UPCAT·Mathematics·Review·&·Practice"
      description="Master·UPCAT·Mathematics·with·focused·practice·on·arithmetic,·algebra,·geometry,·and·trigonometry.•+"
      keywords={[
        "UPCAT·math·practice·questions·with·answers",
        "UPCAT·math·reviewer",
        "UPCAT·algebra",
        "UPCAT·geometry",
        "UPCAT·trigonometry",
      ]}
      intro="Sharpen·the·math·skills·the·UPCAT·actually·tests. Every·question·on·UPCAT·Simulator·is·hand-written·to·mirror·the·difficulty·curve·of·the·real·exam,•+"
      with·detailed·step-by-step·explanations·so·you·understand·the·why·behind·each·answer."
      topics={[
        "Arithmetic·operations,·fractions,·percents,·ratio·and·proportion",
        "Linear,·quadratic,·and·rational·equations·and·inequalities",
        "Functions:·domain,·range,·composition,·and·inverses",
        "Plane·and·coordinate·geometry,·including·circles·and·polygons",
        "Right-triangle·trigonometry·and·the·unit·circle",
        "Word·problems:·work,·mixture,·motion,·and·number·puzzles",
      ]}
      stats={{questionCount: "300+", subtopicCount: "18"}}
      sampleQuestion={{
        prompt: "If·f(x) =·3x²·-·2x·+·5, what·is·f(2)?",
        choices: [
          {letter: "A", text: "9"},
          {letter: "B", text: "13"},
          {letter: "C", text: "15"},
          {letter: "D", text: "17"},
        ],
        answerLetter: "B",
        explanation:
          "Substitute·x·=·2:·f(2)·=·3(2)²·-·2(2)·+·5·=·12·-·4·+·5·=·13.",
      }}
      practiceCtaRef="/practice?subject=Mathematics"
    </>
  );
}