/**
 * Cloudflare Worker Handler for UPCAT Simulator API
 *
 * This serves as the entry point for Cloudflare Workers and Pages
 * Functions, bridging the existing Express-based API to the
 * Cloudflare runtime environment.
 */

import {Request as CFRequest, Response as CFResponse} from "@cloudflare/workers-types";

// Import the Express app
// Note: When deploying to Cloudflare, this will be wrapped via node_compat
declare const ASSETS: { fetch: (request: Request) => Promise<Response> };

/**
 * Main Cloudflare Pages Function handler
 * Routes API requests to the Express app
 * Routes static requests to Pages Assets
 */
export default {
    async fetch(
        request: CFRequest,
        env: any,
        ctx: any
    ): Promise<CFResponse> {
        const url = new URL(request.url);

        // Route API requests to the API handler
        if (url.pathname.startsWith("/api/")) {
            // Import the Express app (available after npm run build)
            // The app will be loaded from api/dist/index.js
            try {
                const apiModule = await import("./api/dist/index.js");
                const app = apiModule.default || apiModule;

                // Convert Cloudflare Request to Node.js-compatible format
                const response = await app(request, env, ctx);
                return response;
            } catch (error) {
                console.error("API handler error:", error);
                return new Response(
                    JSON.stringify({
                        error: "API Error",
                        message: error instanceof Error ? error.message : "Unknown error",
                    }),
                    {
                        status: 500,
                        headers: {"Content-Type": "application/json"},
                    }
                );
            }

            // Route static requests to Cloudflare Pages Assets
            return ASSETS.fetch(request);
        }
    ,
    };