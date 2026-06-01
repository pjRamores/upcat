#!/usr/bin/env node
/**
 * Kill any process listening on port 3001 and start the API dev server.
 * Usage: node scripts/dev-api-restart.mjs
 */
import {spawn, spawnSync} from "child_process";
import net from "net";

const PORT = 3001;
const HOST = "127.0.0.1";

async function killPort3001() {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", (err) => {
            if (err.code === "EADDRINUSE") {
                // Port is in use, need to kill it
                if (process.platform === "win32") {
                    // Windows
                    const cmd = `netstat -ano | findstr :${PORT}`;
                    const proc = spawn("cmd.exe", ["/c", cmd], {stdio: "pipe"});
                    let output = "";
                    proc.stdout.on("data", (data) => {
                        output += data.toString();
                    });
                    proc.on("close", () => {
                        const lines = output.trim().split("\n");
                        if (lines.length > 0) {
                            const parts = lines[0].trim().split(/\s+/);
                            const pid = parts[parts.length - 1];
                            if (pid && pid !== "PID") {
                                spawnSync("taskkill", ["/PID", pid, "/F"], {stdio: "ignore"});
                                console.log(`Killed process ${pid} on port ${PORT}`);
                            }
                        }
                        server.close(resolve);
                    });
                } else {
                    // Unix-like
                    const proc = spawn("lsof", ["-i", `${PORT}`, "-t"], {
                        stdio: "pipe",
                    });
                    let pid = "";
                    proc.stdout.on("data", (data) => {
                        pid += data.toString().trim();
                    });
                    proc.on("close", () => {
                        if (pid) {
                            spawnSync("kill", ["-9", pid], {stdio: "ignore"});
                            console.log(`Killed process ${pid} on port ${PORT}`);
                        }
                    });
                    server.close(resolve);
                }
        )
            ;
        });
    });
    server.listen(PORT, () => {
        server.close(resolve);
    });
}

)
;

async function waitForPortFree(timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const free = await new Promise((resolve) => {
            const server = net.createServer();
            server.on("error", () => {
                server.close();
                resolve(false);
            });
            server.listen(PORT, () => {
                server.close();
                resolve(true);
            });
        });
        if (free) return;
        await new Promise((r) => setTimeout(r, 200));
    }
}

function startApi() {
    const result = spawnSync(`npm run dev --workspace=api`, {
        stdio: "inherit",
        shell: true,
    });
    process.exit(result.status ?? 0);
}

console.log("Preparing to restart API...");
await killPort3001();
await waitForPortFree();
console.log("Starting API dev server...");
startApi();