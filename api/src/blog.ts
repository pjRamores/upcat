/**
 * Server-side blog accessors. All collection plumbing for `blog_posts` lives here so handlers stay thin and so unit tests can stub a single module.
 */
import { type Db, type Filter, ObjectId } from "mongodb";
import {
  BLOG_LIST_PAGE_SIZE,
  type BlogPost,
  type BlogPostSummary,
  type BlogStatus,
  isValidBlogSlug,
  slugifyBlogTitle
} from "@upcat/shared";

export const BLOG_COLLECTION = "blog_posts";

interface BlogPostDoc {
  _id?: ObjectId;
  slug: string;
  title: string;
  summary: string;
  body: string;
  heroImage?: string | null;
  authorName: string;
  tags: string[];
  status: BlogStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}

function toBlogPost(doc: BlogPostDoc): BlogPost {
  return {
    _id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    body: doc.body,
    heroImage: doc.heroImage ?? null,
    authorName: doc.authorName,
    tags: doc.tags ?? [],
    status: doc.status,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    updatedAt: doc.updatedAt.toISOString(),
    createdAt: doc.createdAt.toISOString()
  };
}

function toSummary(doc: BlogPostDoc): BlogPostSummary {
  const { body: _body, status: _status, createdAt: _createdAt, ...rest } = toBlogPost(doc) as BlogPost & {
    body: string;
    status: BlogStatus;
    createdAt: string;
  };
  void _body;
  void _status;
  void _createdAt;
  return rest;
}

export interface ListBlogPostsOptions {
  status?: BlogStatus | "any";
  tag?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface ListBlogPostsResult {
  posts: BlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listBlogPosts(
  db: Db,
  opts: ListBlogPostsOptions = {},
): Promise<ListBlogPostsResult> => {
  const pageSize = Math.min(BLOG_LIST_PAGE_SIZE, Math.max(1, opts.pageSize ?? BLOG_LIST_PAGE_SIZE));
  const page = Math.max(1, opts.page ?? 1);
  const filter: Filter<BlogPostDoc> = {};
  if (opts.status && opts.status !== "any") filter.status = opts.status;
  if (opts.tag) filter.tags = opts.tag;
  if (opts.search) {
    const re = new RegExp(opts.search.replace(/[*+?^$()|\\]/g, "\\\\"));
    filter.$or = [{ title: re }, { summary: re }];
  }
  const coll = db.collection<BlogPostDoc>(BLOG_COLLECTION);
  const [docs, total] = await Promise.all([
    coll.find(filter)
      .sort([{ publishedAt: -1, updatedAt: -1 }])
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    coll.countDocuments(filter),
  ]);
  return { posts: docs.map(toSummary), total, page, pageSize };
}

export async function listPublishedSlugs(db: Db): Promise<{ slug: string; updatedAt: string }[]> {
  const docs = await db.collection<BlogPostDoc>(BLOG_COLLECTION)
.find({status:"published"}, {projection: {slug:1, updatedAt:1}})
.toArray();
return docs.map((d) => ({slug: d.slug, updatedAt: d.updatedAt.toISOString()}));
}

export async function getBlogPostBySlug(
  db: Db,
  slug: string,
  opts: { includeDrafts?: boolean } = {}
): Promise<BlogPost | null> {
  const filter: Filter<BlogPostDoc> = {slug};
  if (!opts.includeDrafts) filter.status = "published";
  const doc = await db.collection<BlogPostDoc>(BLOG_COLLECTION).findOne(filter);
  return doc ? toBlogPost(doc) : null;
}

export async function getBlogPostById(db: Db, id: string): Promise<BlogPost | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await db.collection<BlogPostDoc>(BLOG_COLLECTION)
    .findOne({_id: new ObjectId(id)});
  return doc ? toBlogPost(doc) : null;
}

export interface CreateBlogPostInput {
  slug?: string;
  title: string;
  summary: string;
  body: string;
  heroImage?: string | null;
  authorName: string;
  tags?: string[];
  status?: BlogStatus;
}

export async function createBlogPost(db: Db, input: CreateBlogPostInput): Promise<BlogPost> {
  const slug = (input.slug ?? slugifyBlogTitle(input.title)).trim().toLowerCase();
  if (!isValidBlogSlug(slug)) {
    throw new BlogValidationError("Invalid slug.");
  }
  const existing = await db.collection<BlogPostDoc>(BLOG_COLLECTION).findOne({slug});
  if (existing) throw new BlogConflictError(`Slug "${slug}" already exists.`);
  const now = new Date();
  const status: BlogStatus = input.status ?? "draft";
  const doc: BlogPostDoc = {
    slug,
    title: input.title.trim(),
    summary: input.summary.trim(),
    body: input.body,
    heroImage: input.heroImage ?? null,
    authorName: input.authorName.trim(),
    tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
    status,
    publishedAt: status === "published" ? now : null,
    updatedAt: now,
    createdAt: now,
  };
  const res = await db.collection<BlogPostDoc>(BLOG_COLLECTION).insertOne(doc);
  return toBlogPost({...doc, _id: res.insertedId});
}

export type UpdateBlogPostInput = Partial<
  Pick<BlogPost, "slug" | "title" | "summary" | "body" | "heroImage" | "authorName" | "tags" | "status">
>;

export async function updateBlogPost(
  db: Db,
  id: string,
  patch: UpdateBlogPostInput,
): Promise<BlogPost | null> {
  if (!ObjectId.isValid(id)) return null;
  const coll = db.collection<BlogPostDoc>(BLOG_COLLECTION);
  const current = await coll.findOne({_id: new ObjectId(id)});
  if (!current) return null;

  const next: Partial<BlogPostDoc> = {};
  if (patch.slug !== undefined) {
    const slug = patch.slug.trim().toLowerCase();
    if (!isValidBlogSlug(slug)) throw new BlogValidationError("Invalid slug.");
    if (slug !== current.slug) {
      const dup = await coll.findOne({slug, _id: {$ne: current._id}});
      if (dup) throw new BlogConflictError(`Slug "${slug}" already exists.`);
      next.slug = slug;
    }
  }
  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.summary !== undefined) next.summary = patch.summary.trim();
  if (patch.body !== undefined) next.body = patch.body;
  if (patch.heroImage !== undefined) next.heroImage = patch.heroImage;
  if (patch.authorName !== undefined) next.authorName = patch.authorName.trim();
  if (patch.tags !== undefined) {
    next.tags = patch.tags.map((t) => t.trim()).filter(Boolean);
  }
  if (patch.status !== undefined) {
    next.status = patch.status;
    if (patch.status === "published" && !current.publishedAt) {
      next.publishedAt = new Date();
    }
  }
  next.updatedAt = new Date();

  await coll.updateOne({_id: current._id}, {$set: next});
  const merged = {...current, ...next};
  return toBlogPost(merged);
}
export async function deleteBlogPost(db: Db, id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const r = await db
        .collection<BlogPostDoc>(BLOG_COLLECTION)
        .deleteOne({_id: new ObjectId(id)});
    return (r.deletedCount ?? 0) > 0;
}

export class BlogValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BlogValidationError";
    }
}

export class BlogConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BlogConflictError";
    }
}