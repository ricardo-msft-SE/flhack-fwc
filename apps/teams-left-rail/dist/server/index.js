"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const store_1 = require("./store");
const reportHtml_1 = require("./reportHtml");
const foundryClient_1 = require("./foundryClient");
const app = (0, express_1.default)();
const builtWebPath = path_1.default.join(__dirname, "../web");
const sourceWebPath = path_1.default.join(process.cwd(), "src/web");
const webRoot = fs_1.default.existsSync(builtWebPath) ? builtWebPath : sourceWebPath;
app.use(express_1.default.json());
app.use(express_1.default.static(webRoot));
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        tenantId: config_1.config.tenantId,
        foundryConfigured: Boolean(config_1.config.foundryProjectEndpoint && config_1.config.foundryAgentId)
    });
});
app.post("/api/requests", (req, res) => {
    const body = req.body;
    if (!body.softwareName ||
        !body.softwareVersion ||
        !body.vendorName ||
        !body.businessJustification ||
        !body.licenseCount ||
        !body.requesterName ||
        !body.requesterDepartment) {
        res.status(400).json({ error: "Missing required fields." });
        return;
    }
    const record = (0, store_1.createRequest)({
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
            (0, store_1.markRunning)(record.requestId);
            const foundryResult = await (0, foundryClient_1.invokeFoundryAssessment)(record.input);
            (0, store_1.markRunning)(record.requestId, foundryResult.sessionId);
            if (foundryResult.incompleteReason) {
                (0, store_1.markIncomplete)(record.requestId, foundryResult.incompleteReason);
                return;
            }
            (0, store_1.markCompleted)(record.requestId, {
                recommendation: foundryResult.recommendation,
                riskSummary: foundryResult.riskSummary,
                evidenceUrls: foundryResult.evidenceUrls,
                foundryRunId: foundryResult.runId
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown Foundry processing failure.";
            (0, store_1.markError)(record.requestId, message);
        }
    })();
    res.status(202).json({
        requestId: record.requestId,
        sessionId: record.sessionId,
        status: record.status
    });
});
app.get("/api/requests/:id", (req, res) => {
    const record = (0, store_1.getRequest)(req.params.id);
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
    const record = (0, store_1.getRequest)(req.params.id);
    if (!record) {
        res.status(404).send("Report not found.");
        return;
    }
    if (record.status !== "completed" && record.status !== "incomplete") {
        res.status(409).send("Report is not ready yet.");
        return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send((0, reportHtml_1.renderReportHtml)(record));
});
app.post("/api/requests/:id/approval", (req, res) => {
    const decision = req.body;
    if (!decision.value) {
        res.status(400).json({ error: "Decision value is required." });
        return;
    }
    const updated = (0, store_1.saveDecision)(req.params.id, {
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
    res.sendFile(path_1.default.join(webRoot, "index.html"));
});
app.listen(config_1.config.port, () => {
    // Keep startup logging concise for containerized hosting.
    console.log(`Teams left-rail app listening on port ${config_1.config.port}`);
    console.log(`Azure tenant ID: ${config_1.config.tenantId}`);
});
