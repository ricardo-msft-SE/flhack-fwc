# Hands-On Lab: Webhook-Driven Software Assessment with Azure Foundry

**Duration:** 45-60 minutes  
**Difficulty:** Intermediate  
**Prerequisites:** Azure subscription, Foundry project with deployed agent, basic familiarity with Azure portal

---

## Overview

In this lab, you'll build a webhook-based integration that automatically triggers Foundry software assessments when a helpdesk ticket is submitted. Results are stored and notifications sent back to the ticket system.

**Architecture:**
```
Helpdesk Ticket Submission
    ↓
Azure Function (HTTP Trigger)
    ↓
Foundry Agent Assessment
    ↓
Store Results + Notify Requester
```

---

## Part 1: Set Up Your Foundry Agent (15 minutes)

### Step 1.1: Verify Your Agent in Foundry Portal

1. Open the **Azure AI Foundry portal** at https://ai.azure.com
2. In the left sidebar, click **Build** → **Agents** (or navigate directly to your project)
3. Find and click your **Software Assessment Agent**
4. In the **Agent Details** panel, note down:
   - **Agent ID** (displayed at the top, looks like `agent-abc123xyz`)
   - **Project Endpoint** (visible in the URL or under **Settings**)
   - These will be needed later

### Step 1.2: Test Agent Invocation URL

Your agent invoke endpoint will be:
```
https://{your-project-endpoint}/agents/{agent-id}/invoke?api-version=2024-12-01-preview
```

**Example:**
```
https://my-foundry-proj.openai.azure.com/agents/agent-12345abc/invoke?api-version=2024-12-01-preview
```

---

## Part 2: Create an Azure Function (20 minutes)

### Step 2.1: Open VS Code and Create a New Project

1. **Open VS Code**
2. Press `Ctrl+Shift+P` to open the Command Palette
3. Type `Azure Functions: Create New Project` and press Enter
4. Select or create a folder: `SoftwareAssessmentFunction`
5. Choose:
   - **Language:** TypeScript
   - **Runtime:** Node.js (LTS)
   - **Template:** HTTP Trigger
   - **Function name:** `onTicketSubmitted`
   - **Authorization level:** Function (or Anonymous if testing locally)

### Step 2.2: Replace the Function Code

1. In VS Code, open `src/functions/onTicketSubmitted.ts`
2. Replace the entire content with this code:

```typescript
import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { ClientSecretCredential, DefaultAzureCredential, TokenCredential } from "@azure/identity";

interface TicketPayload {
  id: string;
  softwareName: string;
  softwareVersion?: string;
  vendorName: string;
  requestorName: string;
  requestorDepartment: string;
  licenseCount?: number;
}

interface FoundryResult {
  recommendation: "Approve" | "Conditional Approve" | "Reject" | "Pending";
  riskSummary: {
    compliance: "Low" | "Medium" | "High";
    security: "Low" | "Medium" | "High";
    vendor: "Low" | "Medium" | "High";
  };
  evidenceUrls: string[];
}

function resolveCredential(): TokenCredential {
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID;

  if (clientId && clientSecret && tenantId) {
    return new ClientSecretCredential(tenantId, clientId, clientSecret);
  }

  return new DefaultAzureCredential();
}

async function invokeFoundryAgent(ticket: TicketPayload): Promise<FoundryResult> {
  const foundryEndpoint = process.env.FOUNDRY_PROJECT_ENDPOINT;
  const agentId = process.env.FOUNDRY_AGENT_ID;

  if (!foundryEndpoint || !agentId) {
    throw new Error("FOUNDRY_PROJECT_ENDPOINT or FOUNDRY_AGENT_ID not configured");
  }

  const credential = resolveCredential();
  const token = await credential.getToken("https://ai.azure.com/.default");

  if (!token?.token) {
    throw new Error("Failed to acquire Foundry access token");
  }

  const invokeUrl = `${foundryEndpoint}/agents/${agentId}/invoke?api-version=2024-12-01-preview`;

  const body = {
    input: {
      softwareName: ticket.softwareName,
      softwareVersion: ticket.softwareVersion || "unknown",
      vendorName: ticket.vendorName,
      requesterName: ticket.requestorName,
      requesterDepartment: ticket.requestorDepartment,
      licenseCount: ticket.licenseCount || 1
    },
    messages: [
      {
        role: "user",
        content: `Assess software request for ${ticket.softwareName} from ${ticket.vendorName}`
      }
    ]
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
    const error = await response.text();
    throw new Error(`Foundry invoke failed (${response.status}): ${error}`);
  }

  const result = await response.json();
  return parseFoundryResponse(result);
}

function parseFoundryResponse(payload: any): FoundryResult {
  const resultData = payload?.result || payload?.output || {};

  return {
    recommendation: ["Approve", "Conditional Approve", "Reject"].includes(resultData?.recommendation)
      ? resultData.recommendation
      : "Pending",
    riskSummary: {
      compliance: resultData?.riskSummary?.compliance || "Medium",
      security: resultData?.riskSummary?.security || "Medium",
      vendor: resultData?.riskSummary?.vendor || "Low"
    },
    evidenceUrls: Array.isArray(resultData?.evidenceUrls) ? resultData.evidenceUrls : []
  };
}

async function storeResult(ticketId: string, result: FoundryResult): Promise<void> {
  // TODO: Replace with your storage logic (Cosmos DB, SQL, SharePoint, etc.)
  console.log(`Storing result for ticket ${ticketId}:`, result);
}

async function notifyRequester(ticket: TicketPayload, result: FoundryResult): Promise<void> {
  // TODO: Replace with your notification logic (email, Slack, webhook, etc.)
  console.log(`Notifying ${ticket.requestorName} of assessment:`, result);
}

app.http("onTicketSubmitted", {
  methods: ["POST"],
  authLevel: "function",
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const ticket = (await request.json()) as TicketPayload;

      // Validate required fields
      if (!ticket.id || !ticket.softwareName || !ticket.vendorName) {
        return {
          status: 400,
          body: JSON.stringify({ error: "Missing required fields: id, softwareName, vendorName" })
        };
      }

      // Invoke Foundry (non-blocking)
      invokeFoundryAgent(ticket)
        .then(async (result) => {
          await storeResult(ticket.id, result);
          await notifyRequester(ticket, result);
        })
        .catch((err) => {
          console.error(`Assessment failed for ticket ${ticket.id}:`, err);
          // TODO: Add escalation/retry logic here
        });

      // Return immediately with 202 Accepted
      return {
        status: 202,
        body: JSON.stringify({
          ticketId: ticket.id,
          message: "Assessment queued",
          checkBackAt: new Date(Date.now() + 60000).toISOString()
        })
      };
    } catch (err) {
      return {
        status: 500,
        body: JSON.stringify({ error: String(err) })
      };
    }
  }
});
```

### Step 2.3: Update `package.json` Dependencies

1. Open `package.json` in the root of your project
2. Verify these dependencies are present:
   ```json
   "@azure/functions": "^1.11.0",
   "@azure/identity": "^4.0.0"
   ```
3. If missing, run in the VS Code terminal:
   ```bash
   npm install @azure/identity
   ```

### Step 2.4: Create Local Settings

1. Open `local.settings.json` in the root
2. Add your Foundry configuration:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FOUNDRY_PROJECT_ENDPOINT": "https://your-foundry-proj.openai.azure.com",
    "FOUNDRY_AGENT_ID": "agent-12345abc",
    "AZURE_CLIENT_ID": "your-client-id",
    "AZURE_CLIENT_SECRET": "your-client-secret",
    "AZURE_TENANT_ID": "your-tenant-id"
  }
}
```

**⚠️ Security Note:** Never commit `local.settings.json` to Git. It's already in `.gitignore` by default.

---

## Part 3: Test Locally (10 minutes)

### Step 3.1: Start the Function Locally

1. In VS Code, press `Ctrl+` (backtick) to open the terminal
2. Run:
   ```bash
   func start
   ```
3. Wait for the message: `Http Functions: onTicketSubmitted [POST]`
   - Note the URL, typically: `http://localhost:7071/api/onTicketSubmitted`

### Step 3.2: Send a Test Request

1. Open a new terminal or use **Postman** / **curl**
2. Send a POST request:

```bash
curl -X POST http://localhost:7071/api/onTicketSubmitted \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TICKET-001",
    "softwareName": "Slack",
    "softwareVersion": "4.30.0",
    "vendorName": "Slack Technologies",
    "requestorName": "John Smith",
    "requestorDepartment": "Engineering",
    "licenseCount": 10
  }'
```

**Expected Response (202 Accepted):**
```json
{
  "ticketId": "TICKET-001",
  "message": "Assessment queued",
  "checkBackAt": "2026-06-15T10:05:30.000Z"
}
```

### Step 3.3: Verify Logs

1. In the terminal running `func start`, you should see log output showing the Foundry invocation
2. If you see errors, check:
   - Foundry endpoint is correct (no trailing slash)
   - Agent ID matches exactly
   - Azure credentials in `local.settings.json` are valid

---

## Part 4: Deploy to Azure (15 minutes)

### Step 4.1: Create a Function App in Azure Portal

1. Go to https://portal.azure.com
2. Click **Create a Resource** → search **Function App**
3. Fill in:
   - **Subscription:** Your subscription
   - **Resource Group:** Create new or select existing
   - **Function App name:** `software-assessment-function` (must be globally unique)
   - **Runtime:** Node.js
   - **Region:** Same as your Foundry project (recommended)
4. Click **Review + Create** → **Create**

### Step 4.2: Deploy from VS Code

1. In VS Code, open the **Azure** extension (icon on left sidebar)
2. Under **Functions**, click the **Deploy to Function App** icon (cloud with up arrow)
3. Select your subscription and the Function App you just created
4. Click **Deploy**
5. Wait for the message: `Deployment successful`

### Step 4.3: Configure Application Settings

1. In Azure Portal, open your **Function App**
2. Click **Configuration** (left sidebar, under **Settings**)
3. Click **+ New application setting** and add each variable from `local.settings.json`:
   - `FOUNDRY_PROJECT_ENDPOINT`
   - `FOUNDRY_AGENT_ID`
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`
4. Click **Save**

### Step 4.4: Get Your Function URL

1. In the Function App, click **Functions** → **onTicketSubmitted**
2. Click **Get Function URL**
3. Copy the URL (looks like `https://software-assessment-function.azurewebsites.net/api/onTicketSubmitted?code=...`)

---

## Part 5: Integrate with Helpdesk (Optional - 10 minutes)

### For Jira Cloud:

1. In Jira, go to **Settings** → **Automations**
2. Create new automation:
   - **Trigger:** Issue Created
   - **Action:** Send Web Request
     - **URL:** Your Function App URL from Step 4.4
     - **Headers:** `Content-Type: application/json`
     - **Body:**
       ```json
       {
         "id": "{{issue.key}}",
         "softwareName": "{{issue.summary}}",
         "vendorName": "{{issue.description}}",
         "requestorName": "{{issue.reporter.displayName}}",
         "requestorDepartment": "Unknown",
         "licenseCount": 1
       }
       ```

### For ServiceNow:

1. Go to **System Web Services** → **Outbound** → **REST Message**
2. Create new REST message:
   - **Name:** Foundry Assessment Webhook
   - **Endpoint:** Your Function App URL
   - **Authentication:** OAuth 2.0 (if required)
3. Create HTTP method POST
4. In a **Business Rule**, trigger: `On insert` → Call the REST message

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **401 Unauthorized from Foundry** | Check Azure credentials in Application Settings; verify they have Foundry permissions |
| **404 Not Found on invoke** | Verify `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_AGENT_ID` are correct; remove trailing slashes |
| **Function times out** | Foundry assessment is taking >5 minutes; increase Function timeout in **Configuration** → **General Settings** to max (600s) |
| **No notification received** | Implement storage/notification logic in `storeResult()` and `notifyRequester()` functions |

---

## Next Steps

1. **Add storage:** Implement `storeResult()` to write assessments to Cosmos DB, SQL, or your ticket system
2. **Add notifications:** Implement `notifyRequester()` to send email, Slack, or update the ticket comment
3. **Add retry logic:** Wrap Foundry calls in exponential backoff for resilience
4. **Monitor:** Enable Application Insights on your Function App to track invocation latency

---

## Appendix A: PII Handling Patterns for This Lab

This appendix provides practical options to detect, redact, flag, and govern personally identifiable information (PII) in the webhook-driven software assessment flow.

### A.1 Where PII Can Appear in This Solution

PII can appear in multiple stages:

1. **Inbound ticket payload** (requestor name, email, phone, free text fields)
2. **Prompt payload sent to Foundry** (ticket fields copied into model context)
3. **Agent output** (recommendation text, evidence links, notes)
4. **Stored records** (database rows, ticket comments, logs, telemetry)

Use layered controls so no single missed check becomes a data leak.

### A.2 Approach 1: Azure AI Content Safety for Real-Time Detection

Use Azure AI Content Safety before and after agent invocation to identify PII categories in near real time.

**Best use in this lab:**

1. Scan inbound ticket text before calling Foundry
2. Decide action by policy: redact, flag for review, block, or route to escalation
3. Scan agent output before writing to storage or posting back to helpdesk

**When to choose this:**

- You need deterministic API-based checks in the request path
- You want explicit control over what gets blocked vs redacted

### A.3 Approach 2: Foundry Guardrails and Safety Configuration

Use Foundry safety settings to reduce PII risk at the model layer.

**Best use in this lab:**

1. Configure safety/guardrail policies in the agent
2. Add output constraints so responses avoid unnecessary sensitive fields
3. Use policy-based handling to flag or block unsafe outputs

**When to choose this:**

- You want built-in model safety controls with minimal custom code
- You want protection close to prompt/response generation

### A.4 Approach 3: Microsoft Purview for Governance and Classification

Use Purview to classify and govern PII in persisted data stores (for example, the assessment results database).

**Best use in this lab:**

1. Register your result data source in Purview
2. Run scans/classification on stored assessment records
3. Apply governance: retention, access boundaries, and auditability

**When to choose this:**

- You need compliance reporting, lineage, and enterprise governance
- You need ongoing visibility of where sensitive fields are stored

### A.5 Approach 4: Hybrid Pattern (Recommended)

Most teams should combine the prior approaches:

1. **Ingress check:** Content Safety on incoming ticket text
2. **Generation safety:** Foundry guardrails during model processing
3. **Egress check:** Content Safety on final model output
4. **At-rest governance:** Purview scans and policy enforcement on stored data

This gives prevention + detection + governance coverage across the full lifecycle.

### A.6 Approach 5: Purview Information Protection (MIP Labels and DLP)

Use MIP and DLP to classify and protect sensitive content where results are shared (for example, collaboration tools, documents, downstream systems).

**Best use in this lab:**

1. Apply sensitivity labels to records/documents generated from assessments
2. Use DLP policies to prevent oversharing/exfiltration
3. Enforce encryption/handling rules for highly sensitive outputs

**When to choose this:**

- You need cross-tool protection beyond the app/database boundary
- You have enterprise labeling and DLP requirements

### A.7 Recommended Policy Decisions to Define Early

Define these decisions before production:

1. **PII categories in scope:** email, phone, national ID, payment data, etc.
2. **Action per category/severity:** redact vs block vs manual review
3. **Logging policy:** never log raw sensitive values
4. **Retention windows:** how long ticket payloads and outputs are kept
5. **Access model:** least privilege for operations and analysts

### A.8 Example Control Points in This Lab Workflow

Map controls to existing lab steps:

1. **Function entrypoint (before invokeFoundryAgent):** inbound PII scan and redaction
2. **Foundry agent configuration:** safety/guardrail policy
3. **After Foundry response:** outbound scan/redaction before storeResult and notifyRequester
4. **Storage layer:** Purview classification and governance policies
5. **Notification layer:** suppress sensitive fields in ticket comments/emails

### A.9 Practical Rollout Plan

Implement in phases:

1. **Phase 1 (MVP):** Foundry guardrails + minimal field redaction + safe logging
2. **Phase 2:** Add Content Safety checks at ingress and egress
3. **Phase 3:** Enable Purview scans and governance reporting
4. **Phase 4:** Add MIP labels and DLP for downstream sharing channels

### A.10 Quick Decision Guide

| Requirement | Best Starting Point |
|---|---|
| Fastest path to basic protection | Foundry guardrails |
| Real-time API checks and explicit policy actions | Azure AI Content Safety |
| Compliance, inventory, and governance reporting | Microsoft Purview |
| End-to-end enterprise protection | Hybrid pattern with MIP and DLP |

---

## Appendix B: Lab Extension Exercise - Implement PII Controls Incrementally

Use this extension to turn the conceptual PII guidance into executable implementation tasks.

### B.1 Goal

Implement and validate PII handling in four progressive stages:

1. Stage 1: Foundry guardrails and safe logging
2. Stage 2: Real-time ingress/egress PII detection with Azure AI Content Safety
3. Stage 3: Governance and classification with Microsoft Purview
4. Stage 4: Sensitivity labels and DLP controls for downstream sharing

### B.1.1 Estimated Effort

| Stage | Typical Effort | Primary Owners |
|---|---|---|
| Stage 1: Guardrails + safe logging | 0.5-1 day | App engineer + AI engineer |
| Stage 2: Content Safety ingress/egress checks | 1-2 days | App engineer |
| Stage 3: Purview governance onboarding | 2-5 days | Data governance + platform team |
| Stage 4: MIP labels and DLP rollout | 2-5 days | Security/compliance + M365 admin |

Notes:

1. Effort varies by existing enterprise controls, approval processes, and environment readiness.
2. For pilot projects, complete Stage 1 and Stage 2 first to reduce risk quickly.

### B.2 Prerequisites

Before starting this extension:

1. Complete Parts 1-4 of this lab
2. Confirm `onTicketSubmitted` is deployed and callable
3. Have test payloads ready that include synthetic PII (not real customer data)

### B.3 Stage 1 Exercise: Foundry Guardrails + Safe Logging

**Objective:** Ensure model-level controls exist and sensitive values are not written to logs.

Tasks:

1. In Foundry, open your agent safety/guardrail configuration and enable appropriate safeguards
2. Update function logging policy so inbound and outbound payload logs redact or suppress sensitive fields
3. Add a `piiPolicyVersion` metadata field to each assessment record so policy rollout is traceable

Validation checklist:

1. Trigger with synthetic PII values and verify logs do not contain raw values
2. Confirm assessment flow still succeeds for non-sensitive payloads
3. Confirm records contain `piiPolicyVersion`

### B.4 Stage 2 Exercise: Azure AI Content Safety in Request Path

**Objective:** Add explicit PII detection before and after Foundry invocation.

Tasks:

1. Provision an Azure AI Content Safety resource
2. Add function settings for endpoint and credentials
3. Implement an ingress check (before `invokeFoundryAgent`) that scans ticket text
4. Apply policy action for detections: redact, flag, or route to manual review
5. Implement an egress check (after Foundry response) before `storeResult` and `notifyRequester`

Suggested policy example:

1. High-risk detections: block and route to review queue
2. Medium-risk detections: redact and continue
3. Low-risk detections: flag and continue

Validation checklist:

1. A payload with synthetic email/phone is detected at ingress
2. Redacted values are used in downstream processing when configured
3. Outbound detections prevent raw sensitive values from being stored/shared
4. Non-PII payload path still returns `202` with normal latency profile

### B.5 Stage 3 Exercise: Purview Governance and Classification

**Objective:** Govern sensitive data at rest and produce auditable classification outcomes.

Tasks:

1. Register the assessment data source in Purview
2. Configure and run classification scans against stored assessment records
3. Define retention and access policy aligned to sensitivity
4. Create a recurring review process for scan results and exceptions

Validation checklist:

1. Sensitive fields are classified in scan output
2. Classification artifacts are reviewable by compliance owners
3. Access and retention policies are documented and enforceable

### B.6 Stage 4 Exercise: Sensitivity Labels and DLP

**Objective:** Prevent oversharing when results leave the app boundary.

Tasks:

1. Define label mapping from assessment sensitivity level to MIP label
2. Apply labels to generated artifacts/messages where applicable
3. Configure DLP rules for common exfiltration paths (email/chat/document channels)
4. Add exception workflow for approved business cases

Validation checklist:

1. Sensitive assessment outputs are labeled automatically
2. DLP policies block or warn on prohibited sharing actions
3. Exception path is auditable and policy-governed

### B.7 Test Dataset for the Exercise

Create synthetic payloads for each class:

1. Clean payload (no sensitive tokens)
2. Email and phone in requester fields
3. National ID-like pattern in free text
4. Mixed payload with multiple sensitive categories

For each payload, capture:

1. Ingress detection result
2. Action taken (allow/redact/block/review)
3. Egress detection result
4. Stored record outcome
5. Notification output outcome

### B.8 Exit Criteria

This extension is complete when:

1. Sensitive values are not present in logs
2. Ingress and egress detection paths are active and tested
3. Data-at-rest is classifiable and governed
4. Downstream sharing controls are in place for sensitive outputs

### B.9 Optional Advanced Challenge

Implement policy-as-code for PII handling:

1. Externalize detection thresholds and actions by environment (dev/test/prod)
2. Version policy changes and attach policy version to each record
3. Add automated integration tests that assert policy behavior for synthetic payloads
