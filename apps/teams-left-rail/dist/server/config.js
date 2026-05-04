"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: Number(process.env.PORT || 3979),
    tenantId: process.env.AZURE_TENANT_ID || "ecb61531-f7e1-4390-9633-9213f6c9c05c",
    reportBaseUrl: process.env.REPORT_BASE_URL || "http://localhost:3979",
    foundryProjectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT || "",
    foundryAgentId: process.env.FOUNDRY_AGENT_ID || "",
    foundryInvokeUrl: process.env.FOUNDRY_INVOKE_URL || "",
    foundryApiVersion: process.env.FOUNDRY_API_VERSION || "2025-05-01-preview",
    azureClientId: process.env.AZURE_CLIENT_ID || "",
    azureClientSecret: process.env.AZURE_CLIENT_SECRET || ""
};
