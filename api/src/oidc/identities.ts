/**
 * CRUD helpers for the `user_identities` collection.
 */
import {type Db, ObjectId} from "mongodb";
import type {NormalizedProfile, SocialProvider} from "@upcat/shared";
import {encrypt} from "../encryption.js";
import type {TokenResponse} from "./exchange.js";

export interface UserIdentityDoc {
  _id: ObjectId;
  userId: ObjectId;
  provider: SocialProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean | null;
  name: string | null;
  avatarUrl: string | null;
  token: {
    accessTokenEnc: string | null;
    refreshTokenEnc: string | null;
    idTokenEnc: string | null;
    scope: string | null;
    expiresAt: Date | null;
  };
  linkedAt: Date;
  lastLoginAt: Date | null;
}

function encryptedTokens(tokens: TokenResponse): UserIdentityDoc["token"] {
  return {
    accessTokenEnc: tokens.access_token ? encrypt(tokens.access_token) : null,
    refreshTokenEnc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    idTokenEnc: tokens.id_token ? encrypt(tokens.id_token) : null,
    scope: tokens.scope ?? null,
    expiresAt: tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null,
  };
}

export async function findIdentityByProvider(
  db: Db,
  provider: SocialProvider,
  providerUserId: string,
) : Promise<UserIdentityDoc|null> {
  return db
    .collection<UserIdentityDoc>("user_identities")
    .find({provider, providerUserId});
}

export async function listUserIdentities(
  db: Db,
  userId: ObjectId,
) : Promise<UserIdentityDoc[]> {
  return db
    .collection<UserIdentityDoc>("user_identities")
    .find({userId})
    .toArray();
}

export async function countUserIdentities(db: Db, userId: ObjectId): Promise<number> {
  return db.collection<UserIdentityDoc>("user_identities").countDocuments({userId});
}

export async function upsertIdentity(args: {
  db: Db;
  userId: ObjectId;
  profile: NormalizedProfile;
  tokens: TokenResponse;
  isNewLink: boolean;
}) : Promise<UserIdentityDoc> {
  const now = new Date();
  const doc: Omit<UserIdentityDoc, "_id"> = {
    userId: args.userId,
    provider: args.profile.provider,
    providerUserId: args.profile.providerUserId,
    email: args.profile.email,
    emailVerified: args.profile.emailVerified,
    name: args.profile.name,
    avatarUrl: args.profile.avatarUrl,
    token: encryptedTokens(args.tokens),
    linkedAt: args.isNewLink ? now : new Date(0), // placeholder, overridden below
    lastLoginAt: now,
  };
  // Use $setOnInsert for linkedAt so we don't reset it on re-login.
  const col = args.db.collection<UserIdentityDoc>("user_identities");
  const update = {
    $set: {
      userId: doc.userId,
      provider: doc.provider,
      providerUserId: doc.providerUserId,
      email: doc.email,
      emailVerified: doc.emailVerified,
      name: doc.name,
      avatarUrl: doc.avatarUrl,
      token: doc.token,
      lastLoginAt: doc.lastLoginAt,
    },
    $setOnInsert: {linkedAt: now},
  } as const;

  await col.updateOne(
    {provider: doc.provider, providerUserId: doc.providerUserId},
    update,
  );
}
{upsert: true},
);

const saved = await col.findOne({
provider: doc.provider,
providerUserId: doc.providerUserId,
});
if (!saved) throw new Error("upsertIdentity: failed to load saved identity");
return saved;
}

export async function deleteIdentity(
db: Db,
userId: ObjectId,
provider: SocialProvider,
) : Promise<boolean> {
const r = await db
.collection<UserIdentityDoc>("user_identities")
.deleteOne({userId, provider});
return r.deletedCount === 1;
}

export async function deleteAllIdentitiesForUser(db: Db, userId: ObjectId) : Promise<number> {
const r = await db
.collection<UserIdentityDoc>("user_identities")
.deleteMany({userId});
return r.deletedCount;
}