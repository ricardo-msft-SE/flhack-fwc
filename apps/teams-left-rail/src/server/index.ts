import express from "express";
import fs from "fs";
import path from "path";
import { config } from "./config";
import { createRequest, getRequest, markCompleted, markError, markIncomplete, markRunning, saveDecision } from "./store";
import { renderReportHtml } from "./reportHtml";
import { invokeFoundryAssessment } from "./foundryClient";
import { SoftwareRequestInput } from "./types";

const app = express();
const builtWebPath = path.join(__dirname, "../web");
const sourceWebPath = path.join(process.cwd(), "src/web");
const webRoot = fs.existsSync(builtWebPath) ? builtWebPath : sourceWebPath;

app.use(express.json());
app.use(express.static(webRoot));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    tenantId: config.tenantId,
    foundryConfigured: Boolean(config.foundryProjectEndpoint && config.foundryAgentId)
  });
});

app.post("/api/requests", (req, res) => {
  const body = req.body as Partial<SoftwareRequestInput>;

  if (
    !body.softwareName ||
    !body.softwareVersion ||
    !body.vendorName ||
    !body.businessJustification ||
    !body.licenseCount ||
    !body.requesterName ||
    !body.requesterDepartment
  ) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const record = createRequest({
    softwareName: body.softwareName,
    softwareVersion: body.softwareVersion,
    vendorName: body.vendorName,
    businessJustification: body.businessJustification,
    licenseCount: Number(body.licenseCount),
    requesterName: body.requesterName,
    requesterDepartment: body.requesterDepartment,
    requesterEmail: body.requesterEmail
  });

  void (async () => {
    try {
      markRunning(record.requestId);
      const foundryResult = await invokeFoundryAssessment(record.input);
      markRunning(record.requestId, foundryResult.sessionId);

      if (foundryResult.incompleteReason) {
        markIncomplete(record.requestId, foundryResult.incompleteReason);
        return;
      }

      markCompleted(record.requestId, {
        recommendation: foundryResult.recommendation,
        riskSummary: foundryResult.riskSummary,
        evidenceUrls: foundryResult.evidenceUrls,
        foundryRunId: foundryResult.runId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Foundry processing failure.";
      markError(record.requestId, message);
    }
  })();

  res.status(202).json({
    requestId: record.requestId,
    sessionId: record.sessionId,
    status: record.status
  });
});

app.get("/api/requests/:id", (req, res) => {
  const record = getRequest(req.params.id);
  if (!record) {
    res.status(404).json({ error: "Request not found." });
    return;
  }

  res.json({
    requestId: record.requestId,
    sessionId: record.sessionId,
    status: record.status,
    recommendation: record.recommendation,
    riskSummary: record.riskSummary,
    decision: record.decision,
    errorMessage: record.errorMessage
  });
});

app.get("/api/reports/:id", (req, res) => {
  const record = getRequest(req.params.id);
  if (!record) {
    res.status(404).send("Report not found.");
    return;
  }

  if (record.status !== "completed" && record.status !== "incomplete") {
    res.status(409).send("Report is not ready yet.");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderReportHtml(record));
});

app.post("/api/requests/:id/approval", (req, res) => {
  const decision = req.body as {
    source?: "teams-card" | "left-rail";
    value?: "Approve" | "Conditional Approve" | "Reject";
    comment?: string;
    actor?: string;
  };

  if (!decision.value) {
    res.status(400).json({ error: "Decision value is required." });
    return;
  }

  const updated = saveDecision(req.params.id, {
    source: decision.source || "left-rail",
    value: decision.value,
    comment: decision.comment,
    actor: decision.actor
  });

  if (!updated) {
    res.status(404).json({ error: "Request not found." });
    return;
  }

  if (updated.decision?.value !== decision.value || updated.decision?.source !== (decision.source || "left-rail")) {
    res.status(409).json({
      error: "Request already decided.",
      existingDecision: updated.decision
    });
    return;
  }

  res.json({
    requestId: updated.requestId,
    decision: updated.decision
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(webRoot, "index.html"));
});

app.listen(config.port, () => {
  // Keep startup logging concise for containerized hosting.
  console.log(`Teams left-rail app listening on port ${config.port}`);
  console.log(`Azure tenant ID: ${config.tenantId}`);
});
