import SubjectPage from "@/pages/SubjectPage";

export default function SubjectReadingPage() {
  return (
    <SubjectPage
      subject="Reading.Comprehension"
      path="/subjects/reading-comprehension"
      title="UPCAT·Reading·Comprehension·Review·&·Practice"
      description="Sharpen·your·critical-reading·skills·for·the·UPCAT·with·long-form·passages·and·main-idea·inference,·and·tone·questions."
      keywords={[
        "UPCAT·reading·comprehension·tips",
        "UPCAT·passages",
        "UPCAT·inference·questions",
        "UPCAT·reviewer",
      ]}
      intro="UPCAT·reading·passages·are·dense·and·the·questions·reward·inference,·not·lookup.·Build·endurance·with·full-length·passages."+
      "and·train·your·eye·to·spot·the·author's·purpose,·tone,·and·structural·cues."
    ]
    topics={[
      "Identifying·main·ideas·and·topic·sentences",
      "Inference·and·reading·between·the·lines",
      "Author·tone,·purpose,·and·point·of·view",
      "Recognizing·rhetorical·and·structural·devices",
      "Vocabulary·in·context·and·connotation",
      "Comparing·two·related·passages",
    ]}
    stats={{questionCount: "180+", subtopicCount: "10"}}
    sampleQuestion={{
      prompt:
        'In·the·sentence·"Although·the·storm·had·passed,·an·uneasy·silence·lingered·over·the·village,"·the·word·"lingered"·most·nearly·means:',
      choices: [
        {letter: "A", text: "Disappeared·quickly"},
        {letter: "B", text: "Remained·for·some·time"},
        {letter: "C", text: "Grew·louder"},
        {letter: "D", text: "Was·forgotten"},
      ],
      answerLetter: "B",
      explanation:
        "To·linger·means·to·stay·or·remain·longer·than·expected.·The·contrast·with·the·storm·passing·reinforces·that·the·silence·persisted.",
      }}
    practiceCtaHref="/practice?subject=Reading%20Comprehension"
  />
  );
}