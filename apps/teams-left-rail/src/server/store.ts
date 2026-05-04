import { v4 as uuidv4 } from "uuid";
import { SoftwareRequestInput, SoftwareRequestRecord } from "./types";

const records = new Map<string, SoftwareRequestRecord>();

function buildMockEvidence(softwareName: string): string[] {
  return [
    `https://example.com/${encodeURIComponent(softwareName)}/soc2`,
    `https://example.com/${encodeURIComponent(softwareName)}/iso27001`,
    `https://example.com/${encodeURIComponent(softwareName)}/security-advisories`,
    `https://example.com/${encodeURIComponent(softwareName)}/vendor-financials`,
    `https://example.com/${encodeURIComponent(softwareName)}/privacy-dpa`
  ];
}

export function createRequest(input: SoftwareRequestInput): SoftwareRequestRecord {
  const requestId = uuidv4();
  const now = new Date().toISOString();

  const record: SoftwareRequestRecord = {
    requestId,
    sessionId: uuidv4(),
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

export function markRunning(requestId: string, sessionId?: string): SoftwareRequestRecord | undefined {
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

export function markCompleted(
  requestId: string,
  completion: {
    recommendation: SoftwareRequestRecord["recommendation"];
    riskSummary: SoftwareRequestRecord["riskSummary"];
    evidenceUrls: string[];
    foundryRunId?: string;
  }
): SoftwareRequestRecord | undefined {
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

export function markIncomplete(requestId: string, reason: string): SoftwareRequestRecord | undefined {
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

export function markError(requestId: string, reason: string): SoftwareRequestRecord | undefined {
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

export function getRequest(requestId: string): SoftwareRequestRecord | undefined {
  return records.get(requestId);
}

export function saveDecision(
  requestId: string,
  decision: { source: "teams-card" | "left-rail"; value: "Approve" | "Conditional Approve" | "Reject"; comment?: string; actor?: string }
): SoftwareRequestRecord | undefined {
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
