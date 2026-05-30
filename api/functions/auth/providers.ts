/**
 * GET/api/auth/providers
 *
 * Public endpoint — returns the enabled state and clientId of each social
 * provider so the login/register pages can decide which buttons to render.
 * NEVER returns the client secret or any token material.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import type {PublicAuthProviders, SocialProvider} from "@upcat/shared";
import {SOCIAL_PROVIDERS} from "@upcat/shared";
import {getDb} from "../../src/db.js";
import {getAuthProviderSettings} from "../../src/oidc/settings.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  try {
    const db = await getDb();
    const settings = await getAuthProviderSettings(db);

    const out = {} as PublicAuthProviders;
    for (const p of SOCIAL_PROVIDERS as readonly SocialProvider[]) {
      const cfg = settings.providers[p];
      const usable =
        cfg.enabled && !!cfg.clientId && !!cfg.clientSecretEnc && !!cfg.redirectUri;
      out[p] = {
        enabled: usable,
        clientId: usable ? cfg.clientId : null,
      };
    }
    return res.status(200).json({success: true, data: out});
  } catch {
    // Never leak details from a public endpoint; default to "all disabled".
    const out = {} as PublicAuthProviders;
    for (const p of SOCIAL_PROVIDERS as readonly SocialProvider[]) {
      out[p] = {enabled: false, clientId: null};
    }
    return res.status(200).json({success: true, data: out});
  }
}