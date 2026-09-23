const localtunnel = require("localtunnel");

// Never let unhandled errors crash the process
process.on("uncaughtException", (err) => {
  console.warn("[reclaim_tunnel] Uncaught exception caught:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.warn("[reclaim_tunnel] Unhandled rejection caught:", err);
});

let activeTunnel = null;
let consecutiveFailures = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function closeActiveTunnel() {
  if (activeTunnel) {
    try {
      activeTunnel.removeAllListeners();
      activeTunnel.close();
    } catch {}
    activeTunnel = null;
  }
}

async function connectTunnel() {
  console.log("[reclaim_tunnel] Requesting tunnel goldenhour-live -> localhost:5000...");
  try {
    const tunnel = await localtunnel({
      port: 5000,
      subdomain: "goldenhour-live",
    });

    if (tunnel.url && tunnel.url.includes("goldenhour-live")) {
      console.log("[reclaim_tunnel] SUCCESS! Locked onto:", tunnel.url);
      activeTunnel = tunnel;
      consecutiveFailures = 0;

      tunnel.on("close", () => {
        console.warn("[reclaim_tunnel] Tunnel closed event fired.");
        activeTunnel = null;
      });

      tunnel.on("error", (err) => {
        console.warn("[reclaim_tunnel] Tunnel error event:", err.message);
        activeTunnel = null;
      });

      return true;
    } else {
      console.warn("[reclaim_tunnel] Got unexpected url:", tunnel.url, "- releasing...");
      try { tunnel.close(); } catch {}
      return false;
    }
  } catch (err) {
    console.warn("[reclaim_tunnel] Connection attempt failed:", err.message);
    return false;
  }
}

async function run() {
  console.log("[reclaim_tunnel] Supervisor started.");

  while (true) {
    if (!activeTunnel) {
      const ok = await connectTunnel();
      if (!ok) {
        // Wait 15 seconds before trying again to allow server-side release
        await sleep(15000);
        continue;
      }
    }

    // Tunnel is active — wait 30s between health checks
    await sleep(30000);

    if (!activeTunnel) continue;

    try {
      const res = await fetch("https://goldenhour-live.loca.lt/api/health", {
        headers: { "Bypass-Tunnel-Reminder": "true" },
        signal: AbortSignal.timeout(20000),
      });

      if (res.status === 200) {
        consecutiveFailures = 0;
        console.log("[reclaim_tunnel] Heartbeat 200 OK — tunnel healthy.");
      } else {
        consecutiveFailures++;
        console.warn(`[reclaim_tunnel] Heartbeat status ${res.status} (failure count: ${consecutiveFailures}/3)`);
      }
    } catch (pingErr) {
      consecutiveFailures++;
      console.warn(`[reclaim_tunnel] Heartbeat timeout/error: ${pingErr.message} (failure count: ${consecutiveFailures}/3)`);
    }

    if (consecutiveFailures >= 3) {
      console.warn("[reclaim_tunnel] 3 consecutive failures. Recycling tunnel connection...");
      await closeActiveTunnel();
      consecutiveFailures = 0;
      await sleep(5000);
    }
  }
}

run();
