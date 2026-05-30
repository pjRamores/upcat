/* eslint-disable no-console */
import {MongoClient} from "mongodb";
import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function normalizeText(input) {
  return String(input ?? "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim();
}

function fingerprint(question) {
  const canonical = [
    normalizeText(question.subjectArea),
    normalizeText(question.subtopic),
    normalizeText(question.difficulty),
    normalizeText(question.questionText),
    ...(Array.isArray(question.choices) ? question.choices : []).map((c) => normalizeText(c?.text)),
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

async function main() {
  loadEnvFile();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB ?? process.env.MONGODB_DB_NAME ?? undefined);
    const questions = db.collection("questions");

    const cursor = questions.find({}, {projection: {_id: 1, isDraft: 1, publicationStatus: 1, version: 1}});
    let patched = 0;

    while (await cursor.hasNext()) {
      const q = await cursor.next();
      if (!q) continue;
      const existing = await questions.findOne({_id: q._id});
      if (!existing) continue;

      const status =
        typeof existing.publicationStatus === "string"
        ? existing.publicationStatus
        : existing.isDraft
        ? "draft"
        : "published";

      const update = {
        publicationStatus: status,
        isDraft: status !== "published",
        version: Number(existing.version ?? 1),
        dedupFingerprint: existing.dedupFingerprint || fingerprint(existing),
        contentBlocks: Array.isArray(existing.contentBlocks) ? existing.contentBlocks : [],
        mediaAssetIds: Array.isArray(existing.mediaAssetIds) ? existing.mediaAssetIds : [],
      };

      await questions.updateOne({_id: q._id}, {$set: update});
      patched += 1;
    }

    const passages = db.collection("passages");
    await passages.updateMany(
      {publicationStatus: {$exists: false}},
      {$set: {publicationStatus: "draft", contentBlocks: []}},
    );

    console.log(`Migrated ${patched} questions to workflow schema.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});