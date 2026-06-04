/**
 * Static configuration for each supported social provider.
 *
 * Provider clientId / secret / redirectUri / scopes are stored at runtime in the `auth_provider_settings` collection -- these constants only describe the IdP endpoints and capabilities.
 */
import type { SocialProvider } from "@upcat/shared";

export interface ProviderEndpoints {
    /** Supports OIDC (i.e. id_token + JWKS verification). */
    oidc: boolean;
    /** Authorization endpoint (browser redirect target). */
    authorizationEndpoint: string;
    /** Token endpoint (server-side code exchange). */
    tokenEndpoint: string;
    /** Userinfo endpoint (used for non-OIDC providers and as a sanity fallback). */
    userinfoEndpoint: string;
    /** JWKS URI for id_token signature validation (OIDC only). */
    jwksUri?: string;
    /** Expected iss claim value(s) on id_token. */
    issuer?: string | string[];
    /** Default scopes used when the admin hasn't customised any. */
    defaultScopes: string[];
    /** Whether the provider supports PKCE (S256). All three do today. */
    pkce: boolean;
    /** Auth-endpoint extras (e.g. `access_type=offline` for Google). */
    extraAuthParams?: Record<string, string>;
}

export const PROVIDER_ENDPOINTS: Record<SocialProvider, ProviderEndpoints> = {
    google: {
        oidc: true,
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        userinfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
        jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        defaultScopes: ["openid", "email", "profile"],
        pkce: true,
        extraAuthParams: { access_type: "offline", prompt: "consent" },
    },
    linkedin: {
        oidc: true,
        authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
        tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
        userinfoEndpoint: "https://api.linkedin.com/v2/userinfo",
        jwksUri: "https://www.linkedin.com/oauth/openid/jwks",
        issuer: "https://www.linkedin.com",
        defaultScopes: ["openid", "profile", "email"],
        pkce: true,
    },
    facebook: {
        // Facebook only speaks OAuth2 + Graph API, no JWKS/id_token.
        oidc: false,
        authorizationEndpoint: "https://www.facebook.com/v18.0/dialog/oauth",
        tokenEndpoint: "https://graph.facebook.com/v18.0/oauth/access_token",
        userinfoEndpoint: "https://graph.facebook.com/me?fields=id,email,name,first_name,last_name,picture.type(large)",
        defaultScopes: ["email", "public_profile"],
        pkce: true,
    },
};

export function isSupportedProvider(value: unknown): value is SocialProvider {
    return value === "google" || value === "linkedin" || value === "facebook";
}