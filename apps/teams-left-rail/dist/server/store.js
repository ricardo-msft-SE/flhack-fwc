"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequest = createRequest;
exports.markRunning = markRunning;
exports.markCompleted = markCompleted;
exports.markIncomplete = markIncomplete;
exports.markError = markError;
exports.getRequest = getRequest;
exports.saveDecision = saveDecision;
const uuid_1 = require("uuid");
const records = new Map();
function buildMockEvidence(softwareName) {
    return [
        `https://example.com/${encodeURIComponent(softwareName)}/soc2`,
        `https://example.com/${encodeURIComponent(softwareName)}/iso27001`,
        `https://example.com/${encodeURIComponent(softwareName)}/security-advisories`,
        `https://example.com/${encodeURIComponent(softwareName)}/vendor-financials`,
        `https://example.com/${encodeURIComponent(softwareName)}/privacy-dpa`
    ];
}
function createRequest(input) {
    const requestId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const record = {
        requestId,
        sessionId: (0, uuid_1.v4)(),
        createdAt: now,
        updatedAt: now,
        status: "queued",
        input,
        recommendation: "Pending",
        riskSummary: {
            compliance: "Medium",
            security: "Medium",
            vendor: "Low"
        },
        evidenceUrls: buildMockEvidence(input.softwareName)
    };
    records.set(requestId, record);
    return record;
}
function markRunning(requestId, sessionId) {
    const record = records.get(requestId);
    if (!record) {
        return undefined;
    }
    record.status = "running";
    record.updatedAt = new Date().toISOString();
    if (sessionId) {
        record.sessionId = sessionId;
    }
    records.set(requestId, record);
    return record;
}
function markCompleted(requestId, completion) {
    const record = records.get(requestId);
    if (!record) {
        return undefined;
    }
    record.status = "completed";
    record.recommendation = completion.recommendation;
    record.riskSummary = completion.riskSummary;
    record.evidenceUrls = completion.evidenceUrls;
    record.foundryRunId = completion.foundryRunId;
    record.errorMessage = undefined;
    record.updatedAt = new Date().toISOString();
    records.set(requestId, record);
    return record;
}
function markIncomplete(requestId, reason) {
    const record = records.get(requestId);
    if (!record) {
        return undefined;
    }
    record.status = "incomplete";
    record.errorMessage = reason;
    record.updatedAt = new Date().toISOString();
    records.set(requestId, record);
    return record;
}
function markError(requestId, reason) {
    const record = records.get(requestId);
    if (!record) {
        return undefined;
    }
    record.status = "error";
    record.errorMessage = reason;
    record.updatedAt = new Date().toISOString();
    records.set(requestId, record);
    return record;
}
function getRequest(requestId) {
    return records.get(requestId);
}
function saveDecision(requestId, decision) {
    const record = records.get(requestId);
    if (!record) {
        return undefined;
    }
    if (record.decision) {
        return record;
    }
    record.decision = {
        ...decision,
        decidedAt: new Date().toISOString()
    };
    record.updatedAt = new Date().toISOString();
    records.set(requestId, record);
    return record;
}
