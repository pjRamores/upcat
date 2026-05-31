import SubjectPage from "@/pages/SubjectPage";

export default function SubjectSciencePage() {
  return (
    <SubjectPage
      subject="Science"
      path="/subjects/science"
      title="UPCAT·Science·Review·&·Practice"
      description="Strengthen·your·UPCAT·Science·score·with·biology,·chemistry,·physics,·and·earth-science·practice·questions·and·scenario·problems."
      keywords={[
        "UPCAT·science·reviewer",
        "UPCAT·biology",
        "UPCAT·chemistry",
        "UPCAT·physics",
        "UPCAT·earth·science",
      ]}
      intro="Cover·every·branch·of·the·UPCAT·Science·subtest. Our·question·bank·emphasizes·the·scenario–style·problems·UP·favors—interpret·a·chart, "+
        "predict·an·outcome, apply·a·concept—not·just·rote·recall."
      topics={[
        "Cell·biology,·genetics,·evolution,·and·ecology",
        "Atomic·structure,·chemical·bonding,·and·stoichiometry",
        "Mechanics,·energy,·electricity,·and·waves",
        "Earth·systems,·weather,·and·astronomy·basics",
        "Scientific·method,·data·interpretation,·and·lab·safety",
        "Mixed-discipline·scenarios·and·applied·problem·solving",
      ]}
      stats={{questionCount: "250+", subtopicCount: "20"}}
      sampleQuestion={{
        prompt:
          "Which·of·the·following·best·describes·the·role·of·mitochondria·in·a·eukaryotic·cell?",
        choices: [
          {letter: "A", text: "Protein·synthesis·from·mRNA·templates"},
          {letter: "B", text: "Production·of·ATP·through·cellular·respiration"},
          {letter: "C", text: "Storage·of·genetic·material"},
          {letter: "D", text: "Breakdown·of·waste·via·hydrolytic·enzymes"},
        ],
        answerLetter: "B",
        explanation:
          "Mitochondria·generate·most·of·a·cell's·ATP·through·oxidative·phosphorylation,·the·final·stage·of·aerobic·respiration.",
        }}
      practiceCtaRef="/practice?subject=Science"
    }}
  );
}