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
