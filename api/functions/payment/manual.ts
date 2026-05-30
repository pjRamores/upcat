import type {VercelRequest, VercelResponse} from "@vercel/node";
import {RATE_WINDOWS} from "@upcat/shared";
import {requireUser} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {getChannelById, getPaymentConfig, getPlanById} from "../../src/paymentConfig.js";
import {parseMultipart} from "../../src/multipart.js";
import {assertPaymentImage, uploadPaymentScreenshot} from "../../src/paymentStorage.js";
import {nextPaymentSubmissionNumber, validatePromoCode} from "../../src/payments.js";
import {logActivity} from "../../src/activityLog.js";
import {sendPaymentSubmissionReceivedEmail} from "../../src/email.js";
import {checkAndIncrement} from "../../src/security/rateLimit.js";

function getSubmissionNumber(req: VercelRequest): string | null {
  const n = req.query.submissionNumber;
  if (!n) return null;
  if (Array.isArray(n)) return n[0] ?? null;
  return String(n);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;
  const db = await getDb();

  const submissionNumber = getSubmissionNumber(req);

  if (req.method === "POST" && !submissionNumber) {
    const userLimit = await checkAndIncrement({
      scope: "user",
      identifier: user._id.toHexString(),
      endpoint: "POST/api/payment/manual/submit",
      limit: 3,
      windowMs: RATE_WINDOWS.perHour,
    });
    if (userLimit.limited) {
      return res.status(429).json({
        success: false,
        error: "Too many payment submissions. Try again later.",
      });
    }

    const contentType = String(req.headers["content-type"] || "");
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return res.status(400).json({
        success: false,
        error: "Content-Type must be multipart/form-data",
      });
    }

    const parsed = await parseMultipart(req);
    const fields = parsed.fields;
    const screenshot = parsed.files.screenshot;
    if (!screenshot) {
      return res.status(400).json({success: false, error: "screenshot is required"});
    }

    const planId = String(fields.planId || "").trim();
    const channelId = String(fields.channelId || "").trim();
    const referenceNumber = String(fields.referenceNumber || "").trim();
    const promoCode = String(fields.promoCode || "").trim();

    if (!planId || !channelId || !referenceNumber) {
      return res.status(400).json({
        success: false,
        error: "planId, channelId, and referenceNumber are required",
      });
    }

    const config = await getPaymentConfig(db);
    if (config.activePaymentType !== "manual") {
      return res.status(400).json({success: false, error: "Manual payment is not active"});
    }

    const plan = getPlanById(config, planId);
    if (!plan || !plan.isActive) {
      return res.status(400).json({success: false, error: "Invalid or inactive plan"});
    }

    const channel = getChannelById(config, channelId);
    if (!channel || !channel.isEnabled || channel.autoDisabled) {
      return res.status(400).json({success: false, error: "Selected channel is not available"});
    }

    const hasPending = await db.collection("payment_submissions").findOne({
      userId: user._id,
      status: "pending",
    });
    if (hasPending) {
      return res.status(409).json({
        success: false,
        error: "You already have a pending payment submission",
      });
    }

    assertPaymentImage({
      mimeType: screenshot.mimeType,
      size: screenshot.size,
      buffer: screenshot.buffer,
    });

    if (promoCode) {
      const promo = await validatePromoCode(db, user._id, promoCode);
      if (!promo.valid) {
        return res.status(400).json({
success: false,
error: promo.reason ?? "Invalid promo code",
});
}

const uploaded = await uploadPaymentScreenshot({
userId: user._id.toHexString(),
filename: screenshot.filename,
mimeType: screenshot.mimeType,
buffer: screenshot.buffer,
});

const submissionNumberValue = await nextPaymentSubmissionNumber(db);
const now = new Date();
const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

await db.collection("payment_submissions").insertOne({
submissionNumber: submissionNumberValue,
userId: user._id,
planId: plan.id,
planName: plan.name,
amount: plan.price,
currency: "PHP",
channel: channel.id,
channelName: channel.name,
referenceNumber,
screenshot: {
url: uploaded.url,
key: uploaded.key,
filename: uploaded.filename,
mimeType: uploaded.mimeType,
uploadedAt: now,
fileSize: uploaded.fileSize,
},
senderName: fields.senderName ? String(fields.senderName) : null,
senderNumber: fields.senderNumber ? String(fields.senderNumber) : null,
notes: fields.notes ? String(fields.notes) : null,
promoCode: promoCode || null,
status: "pending",
review: {
reviewedBy: null,
reviewedAt: null,
decision: null,
rejectionReason: null,
adminNotes: null,
},
subscriptionGranted: {
startDate: null,
endDate: null,
applied: false,
},
expiresAt,
createdAt: now,
updatedAt: now,
} as never);

await sendPaymentSubmissionReceivedEmail(user.email, {
submissionNumber: submissionNumberValue,
amount: plan.price,
processingMessage: config.manual.processingTimeMessage,
}).catch(() => undefined);

await logActivity(db, {
actorId: user._id,
actorRole: "reviewee",
action: "payment.manual.submitted",
targetType: "payment_submission",
targetId: null,
metadata: {
submissionNumber: submissionNumberValue,
planId,
channelId,
},
});

return res.status(201).json({
success: true,
data: {
submissionNumber: submissionNumberValue,
status: "pending",
message: config.manual.processingTimeMessage,
},
});
}

if (req.method === "GET" && !submissionNumber) {
const page = Math.max(1, Number(req.query.page || 1));
const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
db
.collection("payment_submissions")
.find({userId: user._id})
.sort({createdAt: -1})
.skip(skip)
.limit(limit)
.project({
_id: 0,
submissionNumber: 1,
planName: 1,
amount: 1,
channel: 1,
status: 1,
createdAt: 1,
"review.reviewedAt": 1,
})
.toArray(),
db.collection("payment_submissions").countDocuments({userId: user._id}),
});

return res.status(200).json({
success: true,
data: {
items: items.map((i) => ({
submissionNumber: i.submissionNumber,
planName: i.planName,
amount: i.amount,
channel: i.channel,
status: i.status,
createdAt: i.createdAt,
reviewedAt: (i.review as {reviewedAt?: Date}|undefined)?.reviewedAt??null,
})),
total,
page,
limit,
totalPages: Math.max(1, Math.ceil(total / limit)),
},
});
}

if (req.method === "GET" && submissionNumber) {
const submission = await db.collection("payment_submissions").findOne({
submissionNumber,
userId: user._id,
});
if (!submission) {
return res.status(404).json({success: false, error: "Submission not found"});
}

const sanitized = {
...submission,
_id: String(submission._id),
userId: String(submission.userId),
review: {
...(submission.review as Record<string, unknown>),
...adminNotes: undefined,
},
};
return res.status(200).json({success: true, data: sanitized});
}

if (req.method === "POST" && submissionNumber) {
const action = String(req.query.action || "").toLowerCase();
const url = String(req.url || "");
const isCancel = action === "cancel" || url.endsWith("/cancel");
if (!isCancel) {
return res.status(405).json({success: false, error: "Method not allowed"});
}

const submission = await db.collection("payment_submissions").findOne({
submissionNumber,
userId: user._id,
});
if (!submission) {
return res.status(404).json({success: false, error: "Submission not found"});
}
if (submission.status !== "pending") {
return res.status(400).json({success: false, error: "Only pending submissions can be cancelled"});
}

await db.collection("payment_submissions").updateOne({
_id: submission._id},
{
$set: {
status: "expired",
updatedAt: new Date(),
"review.rejectionReason": "Cancelled by user",
},
},
);
return res.status(200).json({success: true, data: {cancelled: true}});
}

res.setHeader("Allow", "GET, POST");
return res.status(405).json({success: false, error: "Method not allowed"});
}