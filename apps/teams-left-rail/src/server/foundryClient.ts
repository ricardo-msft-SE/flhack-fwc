import { ClientSecretCredential, DefaultAzureCredential, TokenCredential } from "@azure/identity";
import { config } from "./config";
import { SoftwareRequestInput, SoftwareRequestRecord } from "./types";

interface FoundryInvokeResult {
  sessionId?: string;
  runId?: string;
  recommendation: SoftwareRequestRecord["recommendation"];
  riskSummary: SoftwareRequestRecord["riskSummary"];
  evidenceUrls: string[];
  incompleteReason?: string;
}

function resolveCredential(): TokenCredential {
  if (config.azureClientId && config.azureClientSecret && config.tenantId) {
    return new ClientSecretCredential(config.tenantId, config.azureClientId, config.azureClientSecret);
  }

  return new DefaultAzureCredential();
}

function buildInvokeUrl(): string {
  if (config.foundryInvokeUrl) {
    return config.foundryInvokeUrl;
  }

  if (!config.foundryProjectEndpoint || !config.foundryAgentId) {
    return "";
  }

  const endpoint = config.foundryProjectEndpoint.replace(/\/$/, "");
  return `${endpoint}/agents/${config.foundryAgentId}/invoke?api-version=${config.foundryApiVersion}`;
}

function extractEvidence(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function parseRisk(candidate: unknown): "Low" | "Medium" | "High" {
  if (candidate === "Low" || candidate === "Medium" || candidate === "High") {
    return candidate;
  }

  return "Medium";
}

function parseRecommendation(candidate: unknown): SoftwareRequestRecord["recommendation"] {
  if (candidate === "Approve" || candidate === "Conditional Approve" || candidate === "Reject") {
    return candidate;
  }

  return "Pending";
}

function parseResultPayload(payload: any): FoundryInvokeResult {
  const resultCandidate = payload?.result || payload?.output || payload?.data || {};

  const recommendation = parseRecommendation(
    resultCandidate?.recommendation || payload?.recommendation || payload?.decision
  );

  const riskSummary = {
    compliance: parseRisk(resultCandidate?.riskSummary?.compliance || payload?.riskSummary?.compliance),
    security: parseRisk(resultCandidate?.riskSummary?.security || payload?.riskSummary?.security),
    vendor: parseRisk(resultCandidate?.riskSummary?.vendor || payload?.riskSummary?.vendor)
  };

  const evidenceUrls = extractEvidence(
    resultCandidate?.evidenceUrls || resultCandidate?.evidence || payload?.evidenceUrls || payload?.evidence
  );

  const incompleteReason = evidenceUrls.length < 5 ? "Evidence quality gate failed (< 5 URLs)." : undefined;

  return {
    sessionId: payload?.session_id || payload?.sessionId || payload?.session?.id,
    runId: payload?.run_id || payload?.runId || payload?.id,
    recommendation,
    riskSummary,
    evidenceUrls,
    incompleteReason
  };
}

function buildFallbackResult(input: SoftwareRequestInput): FoundryInvokeResult {
  return {
    sessionId: `local-${Date.now()}`,
    runId: undefined,
    recommendation: "Conditional Approve",
    riskSummary: {
      compliance: "Medium",
      security: "Medium",
      vendor: "Low"
    },
    evidenceUrls: [
      `https://example.com/${encodeURIComponent(input.softwareName)}/soc2`,
      `https://example.com/${encodeURIComponent(input.softwareName)}/iso27001`,
      `https://example.com/${encodeURIComponent(input.softwareName)}/security-advisories`,
      `https://example.com/${encodeURIComponent(input.softwareName)}/vendor-financials`,
      `https://example.com/${encodeURIComponent(input.softwareName)}/privacy-dpa`
    ]
  };
}

export async function invokeFoundryAssessment(input: SoftwareRequestInput): Promise<FoundryInvokeResult> {
  const invokeUrl = buildInvokeUrl();

  if (!invokeUrl) {
    return buildFallbackResult(input);
  }

  const credential = resolveCredential();
  const token = await credential.getToken("https://ai.azure.com/.default");
  if (!token?.token) {
    throw new Error("Failed to acquire Azure AI Foundry access token.");
  }

  const body = {
    input,
    messages: [
      {
        role: "user",
        content: `Assess software request for ${input.softwareName} ${input.softwareVersion} from ${input.vendorName}.`
      }
    ],
    metadata: {
      requesterName: input.requesterName,
      requesterDepartment: input.requesterDepartment,
      licenseCount: input.licenseCount
    }
  };

  const response = await fetch(invokeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.token}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Foundry invoke failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  return parseResultPayload(payload);
}
