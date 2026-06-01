/**
 * Identity dispute endpoints -- admin only.
 *
 * GET /api/admin/support/identity-disputes -- list
 * GET /api/admin/support/identity-disputes/:id -- fetch
 * POST /api/admin/support/identity-disputes -- create
 * PUT /api/admin/support/identity-disputes/:id -- decide + execute
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {ObjectId} from "mongodb";
import {
  type: IdentityDispute,
  type: IdentityDisputeAction,
  type: IdentityDisputeStatus,
  SOCIAL_PROVIDERS,
  type: SocialProvider,
} from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {requireAdmin} from "../../src/auth.js";
import {logActivity} from "../../src/activityLog.js";
import {sendDisputeNotificationEmail, sendDisputeResolvedEmail,} from "../../src/email.js";

interface IdentityDisputeDoc {
  _id: ObjectId;
  supportTicketId: ObjectId;
  claimantUserId: ObjectId | null;
  claimantEmail: string;
  disputedProvider: SocialProvider;
  disputedProviderUserId: string;
  currentOwnerUserId: ObjectId;
  status: IdentityDisputeStatus;
  evidence: {
    claimant: {type: string; description: string; fileRef: string | null}[];
    owner: {type: string; description: string; fileRef: string | null}[];
  };
  adminDecision: {
    decidedBy: ObjectId | null;
    decidedAt: Date | null;
    reasoning: string | null;
    action: IdentityDisputeAction | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

function toDTO(d: IdentityDisputeDoc): IdentityDispute {
  return {
    _id: d._id.toString(),
    supportTicketId: d.supportTicketId.toString(),
    claimantUserId: d.claimantUserId?.toString() ?? null,
    claimantEmail: d.claimantEmail,
    disputedProvider: d.disputedProvider,
    disputedProviderUserId: d.disputedProviderUserId,
    currentOwnerUserId: d.currentOwnerUserId.toString(),
    status: d.status,
    evidence: d.evidence,
    adminDecision: {
      decidedBy: d.adminDecision.decidedBy?.toString() ?? null,
      decidedAt: d.adminDecision.decidedAt?.toISOString() ?? null,
      reasoning: d.adminDecision.reasoning,
      action: d.adminDecision.action,
    },
    createdAt: d.createAt.toISOString(),
    updatedAt: d.updateAt.toISOString(),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const id = (req.query.id ?? "").toString();
  if (req.method === "GET" && id) return getOne(res, id);
  if (req.method === "GET") return list(res);
  if (req.method === "POST" && !id) return create(req, res, admin);
  if (req.method === "PUT" && id) return decide(req, res, id, admin);
  return res.status(405).json({success: false, error: "Method not allowed"});
}

async function list(res: VercelResponse) {
  const db = await getDb();
  const docs = await db
    .collection<IdentityDisputeDoc>("identity_disputes")
    .find({})
    .sort({createdAt: -1})
    .limit(200)
    .toArray();
  return res.status(200).json({
    success: true,
    data: {items: docs.map(toDTO)},
  });
}

async function getOne(res: VercelResponse, id: string) {
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({success: false, error: "Invalid id."});
  }
  const db = await getDb();
  const doc = await db
    .collection<IdentityDisputeDoc>("identity_disputes")
    .findOne({_id: new ObjectId(id)});
  if (!doc) return res.status(404).json({success: false, error: "Not found."});
  return res.status(200).json({success: true, data: toDTO(doc)});
}
async function create(
  req: VercelRequest,
  res: VercelResponse,
  admin: { _id: ObjectId; email: string },
) {
  const body = (req.body ?? {}).as({
    supportTicketId?: string,
    claimantUserId?: string | null,
    claimantEmail?: string,
    disputedProvider?: SocialProvider,
    disputedProviderUserId?: string,
    currentOwnerUserId?: string
  });
  if (
    !body.supportTicketId ||
    !ObjectId.isValid(body.supportTicketId) ||
    !body.claimantEmail ||
    !body.disputedProvider ||
    !SOCIAL_PROVIDERS.includes(body.disputedProvider) ||
    !body.disputedProviderUserId ||
    !body.currentOwnerUserId ||
    !ObjectId.isValid(body.currentOwnerUserId)
  ) {
    return res.status(400).json({success: false, error: "Missing or invalid fields."});
  }
  const db = await getDb();
  const ticket = await db
    .collection("support_tickets")
    .findOne({_id: new ObjectId(body.supportTicketId)});
  if (!ticket) {
    return res
    .status(404)
    .json({success: false, error: "Linked support ticket not found."});
  }
  const owner = await db
    .collection("users")
    .findOne({_id: new ObjectId(body.currentOwnerUserId)});
  if (!owner) {
    return res
    .status(404)
    .json({success: false, error: "Current owner not found."});
  }
  const now = new Date();
  const doc: Omit<IdentityDisputeDoc, "_id"> = {
    supportTicketId: new ObjectId(body.supportTicketId),
    claimantUserId:
      body.claimantUserId && ObjectId.isValid(body.claimantUserId)
      ? new ObjectId(body.claimantUserId)
      : null,
    claimantEmail: body.claimantEmail.toLowerCase().trim(),
    disputedProvider: body.disputedProvider,
    disputedProviderUserId: body.disputedProviderUserId,
    currentOwnerUserId: new ObjectId(body.currentOwnerUserId),
    status: "open",
    evidence: {claimant: [], owner: []},
    adminDecision: {decidedBy: null, decidedAt: null, reasoning: null, action: null},
    createdAt: now,
    updatedAt: now,
  };
  const r = await db
    .collection<IdentityDisputeDoc>("identity_disputes")
    .insertOne(doc as IdentityDisputeDoc);

  await logActivity(db, {
    actorId: admin._id,
    actorRole: "admin",
    action: "support.dispute_created",
    targetType: "identity_dispute",
    targetId: r.insertedId,
    metadata: {
      ticketId: body.supportTicketId,
      provider: body.disputedProvider,
    },
  });

  await Promise.all([
    sendDisputeNotificationEmail(owner.email, {
      ticketNumber: ticket.ticketNumber as string,
      provider: body.disputedProvider,
      ownerOrClaimant: "owner",
    }).catch(() => undefined),
    sendDisputeNotificationEmail(body.claimantEmail.toLowerCase().trim(), {
      ticketNumber: ticket.ticketNumber as string,
      provider: body.disputedProvider,
      ownerOrClaimant: "claimant",
    }).catch(() => undefined),
  ]);
  return res
  .status(201)
  .json({success: true, data: {id: r.insertedId.toString()}});
}

async function decide(
  req: VercelRequest,
  res: VercelResponse,
  id: string,
  admin: { _id: ObjectId; email: string },
) {
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({success: false, error: "Invalid id."});
  }
  const body = (req.body ?? {}).as({
    status?: IdentityDisputeStatus,
    adminDecision?: {reasoning?: string; action?: IdentityDisputeAction};
  });
};
const action = body.adminDecision?.action;
if (!action || !["transfer_identity", "reject_claim", "remove_identity"].includes(action)) {
return res.status(400).json({success: false, error: "Invalid action."});
}
if (!body.adminDecision?.reasoning) {
return res.status(400).json({success: false, error: "Reasoning is required."});
}

const db = await getDb();
const dispute = await db
collection<IdentityDisputeDoc>("identity_disputes")
.findOne({_id: new ObjectId(id)});
if (!dispute) {
return res.status(404).json({success: false, error: "Dispute not found."});
}

const now = new Date();
// Execute the chosen action.
if (action === "transfer_identity") {
if (!dispute.claimantUserId) {
return res
status(400)
json({success: false, error: "Claimant user_id is required to transfer."});
}
// Remove any duplicate identity on the claimant's side first.
await db.collection("user_identities").deleteOne({
userId: dispute.claimantUserId,
provider: dispute.disputedProvider,
});
const r = await db.collection("user_identities").updateOne({
provider: dispute.disputedProvider,
providerUserId: dispute.disputedProviderUserId,
userId: dispute.currentOwnerUserId,
},
{$set: {userId: dispute.claimantUserId, transferredAt: now}},
);
if (r.matchedCount === 0) {
return res.status(404).json({
success: false,
error: "Disputed identity not found on the current owner.",
});
}
else if (action === "remove_identity") {
await db.collection("user_identities").deleteOne({
provider: dispute.disputedProvider,
providerUserId: dispute.disputedProviderUserId,
userId: dispute.currentOwnerUserId,
});
}
// reject_claim -- nothing changes.

const finalStatus: IdentityDisputeStatus =
body.status ?? {
(action === "transfer_identity"
? "resolved_for_claimant"
: action === "reject_claim"
? "resolved_for_owner"
: "resolved_for_owner")};

await db.collection<IdentityDisputeDoc>("identity_disputes").updateOne({
_id: dispute._id},
{
$set: {
status: finalStatus,
updatedAt: now,
"adminDecision.decidedBy": admin._id,
"adminDecision.decidedAt": now,
"adminDecision.reasoning": body.adminDecision.reasoning,
"adminDecision.action": action,
},
},
});

await logActivity(db, {
actorId: admin._id,
actorRole: "admin",
action: "support.dispute_resolved",
targetType: "identity_dispute",
targetId: dispute._id,
metadata: {action, status: finalStatus},
});

// Notify both parties.
const ticket = await db
collection("support_tickets")
.findOne({_id: dispute.supportTicketId});
const ticketNumber = (ticket?.ticketNumber as string) | undefined) ?? id;
const owner = await db
collection("users")
.findOne({_id: dispute.currentOwnerUserId});
const outcome =
action === "transfer_identity"
? "Identity transferred to claimant."
: action === "remove_identity"
? "Identity removed."
: "Claim rejected -- current owner retains the identity.";
if (owner?.email) {
sendDisputeResolvedEmail(owner.email, {ticketNumber, outcome}).catch(
() => undefined,
);
}
if (dispute.claimantEmail) {
sendDisputeResolvedEmail(dispute.claimantEmail, {ticketNumber, outcome}).catch(
  () => undefined,
);
return res.status(200).json({success: true, data: {resolved: true}});
}