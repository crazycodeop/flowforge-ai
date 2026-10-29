import { spawn } from "node:child_process";

const VIEWPORTS = [
  { name: "Small Mobile (320px)", width: 320, height: 640 },
  { name: "Standard Mobile (375px)", width: 375, height: 812 },
  { name: "Large Mobile (390px)", width: 390, height: 844 },
  { name: "Large Mobile+ (430px)", width: 430, height: 932 },
  { name: "Tablet Portrait (768px)", width: 768, height: 1024 },
  { name: "Tablet Landscape (1024px)", width: 1024, height: 768 },
  { name: "Laptop/Desktop (1440px)", width: 1440, height: 900 },
  { name: "Ultrawide (1920px)", width: 1920, height: 1080 },
];

const PAGES = [
  "/login",
  "/register",
  "/",
  "/workflows",
  "/executions",
  "/approvals",
  "/evaluations",
  "/use-cases",
  "/system",
  "/settings",
];

async function main() {
  console.log("🚀 Starting Headless Chrome for Multi-Viewport Responsive Audit...");

  const port = 9222;
  const chrome = spawn("google-chrome", [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    `--remote-debugging-port=${port}`,
    "about:blank",
  ]);

  // Wait for Chrome remote debugging to come up
  await new Promise((r) => setTimeout(r, 1500));

  let versionData;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`);
    versionData = await res.json();
  } catch (err) {
    console.error("Failed to connect to Chrome remote debugging:", err);
    chrome.kill();
    process.exit(1);
  }

  const wsUrl = versionData.webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Create new target / tab
  const { result: { targetId } } = await send("Target.createTarget", { url: "http://localhost:5173/login" });
  const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });

  function sendSession(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, sessionId, method, params }));
    });
  }

  await sendSession("Page.enable");
  await sendSession("DOM.enable");
  await sendSession("Runtime.enable");

  // Inject authentication tokens into localStorage so all protected routes render properly
  await sendSession("Page.navigate", { url: "http://localhost:5173/login" });
  await new Promise((r) => setTimeout(r, 1200));

  await sendSession("Runtime.evaluate", {
    expression: `
      localStorage.setItem("token", "mock-dev-jwt-token");
      localStorage.setItem("user", JSON.stringify({ email: "lead.architect@flowforge.ai", full_name: "Lead System Architect", role: "admin" }));
      localStorage.setItem("org_id", "test-org-1");
      localStorage.setItem("org_name", "Production Workspace");
      localStorage.setItem("org_role", "owner");
    `,
  });

  console.log("\n📊 Starting Responsive Viewport & Overflow Tests Across 8 Breakpoints:\n");

  let totalTests = 0;
  let passedTests = 0;
  let failures = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n📱 Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);

    // Emulate device metrics
    await sendSession("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 1024,
    });

    for (const pagePath of PAGES) {
      totalTests++;
      const fullUrl = `http://localhost:5173${pagePath}`;

      await sendSession("Page.navigate", { url: fullUrl });
      await new Promise((r) => setTimeout(r, 400));

      // Evaluate document dimensions
      const evalRes = await sendSession("Runtime.evaluate", {
        expression: `
          (() => {
            const body = document.body;
            const doc = document.documentElement;
            const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
            const clientWidth = doc.clientWidth;
            const innerWidth = window.innerWidth;
            const overflows = scrollWidth > innerWidth + 1; // 1px threshold for fractional subpixel rounding
            return { scrollWidth, clientWidth, innerWidth, overflows };
          })()
        `,
        returnByValue: true,
      });

      const metrics = evalRes.result?.result?.value;
      if (!metrics || metrics.overflows) {
        failures.push({
          viewport: vp.name,
          page: pagePath,
          scrollWidth: metrics?.scrollWidth,
          innerWidth: metrics?.innerWidth,
        });
        console.log(`  ❌ ${pagePath}: Horizontal Overflow Detected! (scrollWidth: ${metrics?.scrollWidth}px > innerWidth: ${metrics?.innerWidth}px)`);
      } else {
        passedTests++;
        console.log(`  ✅ ${pagePath}: OK (scrollWidth: ${metrics.scrollWidth}px <= innerWidth: ${metrics.innerWidth}px)`);
      }
    }
  }

  console.log("\n=======================================================");
  console.log(`🎯 Audit Complete: ${passedTests}/${totalTests} tests passed.`);
  if (failures.length > 0) {
    console.log(`❌ Failures (${failures.length}):`);
    console.table(failures);
    chrome.kill();
    process.exit(1);
  } else {
    console.log("✨ Perfect! Zero unintended horizontal scrolling across all viewports!");
    chrome.kill();
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Script execution failed:", e);
  process.exit(1);
});
