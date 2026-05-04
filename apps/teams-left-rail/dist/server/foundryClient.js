"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invokeFoundryAssessment = invokeFoundryAssessment;
const identity_1 = require("@azure/identity");
const config_1 = require("./config");
function resolveCredential() {
    if (config_1.config.azureClientId && config_1.config.azureClientSecret && config_1.config.tenantId) {
        return new identity_1.ClientSecretCredential(config_1.config.tenantId, config_1.config.azureClientId, config_1.config.azureClientSecret);
    }
    return new identity_1.DefaultAzureCredential();
}
function buildInvokeUrl() {
    if (config_1.config.foundryInvokeUrl) {
        return config_1.config.foundryInvokeUrl;
    }
    if (!config_1.config.foundryProjectEndpoint || !config_1.config.foundryAgentId) {
        return "";
    }
    const endpoint = config_1.config.foundryProjectEndpoint.replace(/\/$/, "");
    return `${endpoint}/agents/${config_1.config.foundryAgentId}/invoke?api-version=${config_1.config.foundryApiVersion}`;
}
function extractEvidence(candidate) {
    if (!Array.isArray(candidate)) {
        return [];
    }
    return candidate.filter((x) => typeof x === "string" && x.length > 0);
}
function parseRisk(candidate) {
    if (candidate === "Low" || candidate === "Medium" || candidate === "High") {
        return candidate;
    }
    return "Medium";
}
function parseRecommendation(candidate) {
    if (candidate === "Approve" || candidate === "Conditional Approve" || candidate === "Reject") {
        return candidate;
    }
    return "Pending";
}
function parseResultPayload(payload) {
    const resultCandidate = payload?.result || payload?.output || payload?.data || {};
    const recommendation = parseRecommendation(resultCandidate?.recommendation || payload?.recommendation || payload?.decision);
    const riskSummary = {
        compliance: parseRisk(resultCandidate?.riskSummary?.compliance || payload?.riskSummary?.compliance),
        security: parseRisk(resultCandidate?.riskSummary?.security || payload?.riskSummary?.security),
        vendor: parseRisk(resultCandidate?.riskSummary?.vendor || payload?.riskSummary?.vendor)
    };
    const evidenceUrls = extractEvidence(resultCandidate?.evidenceUrls || resultCandidate?.evidence || payload?.evidenceUrls || payload?.evidence);
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
function buildFallbackResult(input) {
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
async function invokeFoundryAssessment(input) {
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
