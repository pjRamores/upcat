script
/**
 * -------------------------------------------------------------------------
 * scripts/sync-help-content.mjs
 *
 * Download published help content from the admin API and save it
 * as a static asset. This is called during the build process to
 * generate a snapshot of help content that is bundled with the app.
 *
 * Usage:
 * node scripts/sync-help-content.mjs
 * node scripts/sync-help-content.mjs --server http://localhost:3001
 *
 * Environment variables:
 * ADMIN_API_URL API endpoint for content export (default: http://localhost:3001/api)
 * ADMIN_TOKEN Bearer token for authentication (required for local)
 *
 */

import fs from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "client", "public", "data");
const outputFile = path.join(dataDir, "help-content.json");

async function syncHelpContent() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let apiUrl = process.env.ADMIN_API_URL || "http://localhost:3001/api";
    let adminToken = process.env.ADMIN_TOKEN;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--server") {
        apiUrl = args[i + 1] || apiUrl;
        i++;
      }
      if (args[i] === "--token") {
        adminToken = args[i + 1];
        i++;
      }
    }

    console.log(`Syncing help content from: ${apiUrl}`);

    // Ensure data directory exists
    await fs.mkdir(dataDir, {recursive: true});

    // Call the publish endpoint
    const response = await fetch(`${apiUrl}/admin/help/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminToken && {Authorization: `Bearer ${adminToken}`}),
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success || !result.data?.payload) {
      throw new Error("Invalid response from publish endpoint");
    }

    // Write the static content to file
    const staticContent = result.data.payload;
    await fs.writeFile(outputFile, JSON.stringify(staticContent, null, 2), "utf-8");

    console.log(`Help content synced successfully!`);
    console.log(`Saved to: ${path.relative(rootDir, outputFile)}`);
    console.log(`Metrics:`);
    console.log(`Articles: ${staticContent.meta.totalArticles}`);
    console.log(`Categories: ${staticContent.meta.totalCategories}`);
    console.log(`File size: ${(result.data.contentSize / 1024).toFixed(2)} KB`);
    console.log(`Published: ${staticContent.publishedAt}`);
    console.log(`Published by: ${staticContent.publishedBy}`);
    console.log(
      `\n Next: Commit ${path.relative(rootDir, outputFile)} and redeploy.`
    );
  } catch (error) {
    console.error(`X Failed to sync help content:`, error instanceof Error ? error.message : error);
    console.error(`\n Troubleshooting:`);
    console.error(`Is the API server running? (expected at http://localhost:3001/api)`);
    console.error(`Are you logged in as an admin?`);
    console.error(`Use --server to specify a different API URL`);
    console.error(`Use --token to provide a Bearer token for authentication`);
    process.exit(1);
  }
}

syncHelpContent().catch(() => {
  process.exit(1);
});