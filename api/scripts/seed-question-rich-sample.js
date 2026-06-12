/*eslint-disable no-console*/
import { ObjectId } from "mongodb";

export async function seedQuestionRichSamples(db, options = {}) {
  const setId = String(options.setId || "set-default").trim() || "set-default";
  const questions = db.collection("questions");
  const passages = db.collection("passages");

  const existing = await questions.countDocuments({ tags: "rich-media-sample" });
  if (existing > 0) {
    console.log(`Rich media samples already exist (\${existing}), skipping.`);
    return;
  }

  const now = new Date();
  const samplePassageId = new ObjectId();

  await passages.insertOne({
    id: samplePassageId,
    title: "Climate Adaptation in Coastal Communities",
    subjectArea: "Reading Comprehension",
    source: "UPCAT sample editorial",
    content:
      "Coastal communities adapt to rising sea levels through a combination of mangrove restoration, elevated housing, and relocation planning. Each option has social and economic trade-offs.",
    contentBlocks: [
      { id: "p1", type: "paragraph", text: "Coastal communities adapt to rising sea levels..." },
      { id: "p2", type: "paragraph", text: "Each option has social and economic trade-offs." },
    ],
    publicationStatus: "published",
    isDeleted: false,
    createdat: now,
    updatedAt: now,
  });

  await questions.insertMany([
    {
      setId,
      subjectArea: "Science",
      subtopic: "Earth Science",
      difficulty: "medium",
      type: "multiple_choice",
      passageId: null,
      questionText: "Which intervention most directly reduces storm surge impact?",
      choices: [
        { label: "A", text: "Mangrove restoration" },
        { label: "B", text: "Installing solar panels" },
        { label: "C", text: "Road widening" },
        { label: "D", text: "School rezoning" },
      ],
      correctAnswer: "A",
      rationale: "Mangroves absorb wave energy and reduce storm surge impact.",
      tags: ["earth-science", "rich-media-sample"],
      contentBlocks: [
        { id: "q1", type: "paragraph", text: "Analyze the diagram and scenario details." },
        { id: "q2", type: "image", caption: "Mangrove buffer zone cross-section", altText: "coastal mangroves" },
      ],
      mediaAssetIds: [],
      dedupFingerprint: "seed-rich-media-science-1",
      publicationStatus: "published",
      isDraft: false,
      version: 1,
      flagCount: 0,
      usageCount: 0,
      isDeleted: false,
      editHistory: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      setId,
      subjectArea: "Reading Comprehension",
      subtopic: "Inference",
      difficulty: "medium",
      type: "passage_based",
      passageId: samplePassageId,
      questionText: "Which claim is best supported by the passage?",
      choices: [
        { label: "A", text: "Relocation has no social impact." },
        { label: "B", text: "Adaptation options involve trade-offs." },
        { label: "C", text: "Mangroves increase sea level rise." },
        { label: "D", text: "Only one strategy is effective." },
      ],
      correctAnswer: "B",
      rationale: "The passage explicitly states there are social and economic trade-offs.",
      tags: ["inference", "rich-media-sample"],
      contentBlocks: [
        { id: "r1", type: "paragraph", text: "Use the passage and audio note to answer." },
        { id: "r2", type: "audio", caption: "Short policy interview excerpt" },
      ],
      mediaAssetIds: [],
      dedupFingerprint: "seed-rich-media-reading-1",
      publicationStatus: "published",
      isDraft: false,
      version: 1,
      flagCount: 0,
      usageCount: 0,
      isDeleted: false,
      editHistory: [],
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log("✓ Seeded rich media question samples (2 questions, 1 passage)");
}
