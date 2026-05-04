"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderReportHtml = renderReportHtml;
function riskClass(level) {
    switch (level) {
        case "Low":
            return "risk-low";
        case "Medium":
            return "risk-medium";
        default:
            return "risk-high";
    }
}
function renderReportHtml(record) {
    const evidence = record.evidenceUrls
        .map((url) => `<li><a href="${url}" target="_blank" rel="noreferrer">${url}</a></li>`)
        .join("\n");
    const decisionHtml = record.decision
        ? `<div class="decision-banner">Final Decision: <strong>${record.decision.value}</strong> (${record.decision.source})</div>`
        : `<div class="decision-banner pending">Final Decision: <strong>Pending Human Approval</strong></div>`;
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Software Request Report ${record.requestId}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg1: #f2f8ff;
      --bg2: #fff6ec;
      --ink: #18202a;
      --muted: #546271;
      --panel: rgba(255, 255, 255, 0.88);
      --stroke: #dde6f0;
      --accent: #106ebe;
      --accent-2: #e57c23;
      --risk-low: #007f5f;
      --risk-medium: #a15c00;
      --risk-high: #b42318;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at 10% 10%, var(--bg1), transparent 35%),
                  radial-gradient(circle at 90% 15%, var(--bg2), transparent 30%),
                  linear-gradient(120deg, #f9fcff 0%, #fff 100%);
      min-height: 100vh;
      padding: 24px;
    }
    .shell {
      max-width: 1024px;
      margin: 0 auto;
      background: var(--panel);
      border: 1px solid var(--stroke);
      border-radius: 24px;
      backdrop-filter: blur(3px);
      box-shadow: 0 12px 30px rgba(24, 32, 42, 0.08);
      overflow: hidden;
      animation: reveal 380ms ease-out;
    }
    @keyframes reveal {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    header {
      padding: 26px 28px;
      border-bottom: 1px solid var(--stroke);
      background: linear-gradient(90deg, rgba(16, 110, 190, 0.08), rgba(229, 124, 35, 0.12));
    }
    h1 {
      font-family: "Space Grotesk", "Segoe UI", sans-serif;
      margin: 0 0 6px;
      font-size: 1.5rem;
    }
    .meta {
      color: var(--muted);
      font-size: 0.95rem;
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      padding: 20px 28px;
      border-bottom: 1px solid var(--stroke);
    }
    .card {
      border: 1px solid var(--stroke);
      border-radius: 14px;
      padding: 12px 14px;
      background: #fff;
    }
    .card .label {
      color: var(--muted);
      font-size: 0.85rem;
      margin-bottom: 4px;
    }
    .card .value {
      font-weight: 600;
    }
    .risk {
      display: inline-block;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.8rem;
      font-weight: 700;
      color: #fff;
    }
    .risk-low { background: var(--risk-low); }
    .risk-medium { background: var(--risk-medium); }
    .risk-high { background: var(--risk-high); }
    section {
      padding: 20px 28px;
      border-bottom: 1px solid var(--stroke);
    }
    h2 {
      margin: 0 0 8px;
      font-family: "Space Grotesk", "Segoe UI", sans-serif;
      font-size: 1.15rem;
    }
    p { line-height: 1.55; margin: 8px 0; }
    ul { margin: 10px 0 0 18px; }
    a { color: var(--accent); }
    .decision-banner {
      margin: 16px 28px 24px;
      border-radius: 12px;
      border: 1px solid #ffd3a8;
      background: #fff5ea;
      padding: 12px 14px;
      font-size: 0.95rem;
    }
    .decision-banner.pending {
      border-color: #c6d5e5;
      background: #f2f7ff;
    }
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <h1>Software Request Assessment Report</h1>
      <div class="meta">Report ID: ${record.requestId} | Session: ${record.sessionId} | Generated: ${record.updatedAt}</div>
    </header>

    <div class="grid">
      <div class="card"><div class="label">Software</div><div class="value">${record.input.softwareName} ${record.input.softwareVersion}</div></div>
      <div class="card"><div class="label">Vendor</div><div class="value">${record.input.vendorName}</div></div>
      <div class="card"><div class="label">Requester</div><div class="value">${record.input.requesterName} (${record.input.requesterDepartment})</div></div>
      <div class="card"><div class="label">AI Recommendation</div><div class="value">${record.recommendation}</div></div>
      <div class="card"><div class="label">Compliance Risk</div><div class="value"><span class="risk ${riskClass(record.riskSummary.compliance)}">${record.riskSummary.compliance}</span></div></div>
      <div class="card"><div class="label">Security Risk</div><div class="value"><span class="risk ${riskClass(record.riskSummary.security)}">${record.riskSummary.security}</span></div></div>
      <div class="card"><div class="label">Vendor Risk</div><div class="value"><span class="risk ${riskClass(record.riskSummary.vendor)}">${record.riskSummary.vendor}</span></div></div>
    </div>

    <section>
      <h2>Business Justification</h2>
      <p>${record.input.businessJustification}</p>
      <p>Requested licenses: <strong>${record.input.licenseCount}</strong></p>
    </section>

    <section>
      <h2>Evidence Sources</h2>
      <ul>${evidence}</ul>
    </section>

    ${decisionHtml}
  </main>
</body>
</html>`;
}
