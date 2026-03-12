---
layout: default
title: Usage & Approval Workflow
nav_order: 6
---

# Usage & Approval Workflow
{: .no_toc }

How employees submit requests, how approvers receive and act on them, and how decisions flow back to systems of record.
{: .fs-6 .fw-300 }

## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Submission Channel (Copilot Studio)

**Microsoft Copilot Studio** provides the conversational front-end. Employees submit requests via a Teams bot — no portal login or form navigation required.

### Creating the Bot

1. In [Copilot Studio](https://copilotstudio.microsoft.com), create a new **AI Agent**: `Software Request Bot`.
2. Add a **topic**: *"New Software Request"*.
3. Define the **intake form** collecting:
   - Software name + version
   - Vendor name
   - Business justification
   - Number of licenses needed
   - Requester details (auto-populated from Entra ID via SSO)
4. Add an **action**: **Call Azure AI Foundry agent** using the HTTP connector to trigger the `orchestrator-agent` via the Foundry Agents API.
5. Publish the bot to **Microsoft Teams**.

### Foundry API Connection

In Copilot Studio, add a **custom connector** pointing to:

```
POST https://<project-endpoint>/agents/<agent-id>/sessions/<session-id>/messages
```

{: .important }
Authenticate using **Entra ID (OAuth 2.0)** — never use API keys in Copilot Studio connectors. Configure the connector with an Entra ID app registration that has the Foundry Agents API caller role.

---

## Approval Routing (Work IQ + Power Automate)

After the Report Builder Agent completes the report, **Power Automate** handles routing and capture.

### Approval Flow Steps

1. Power Automate trigger: **Foundry agent completion webhook** (or polling).
2. Work IQ org-hierarchy lookup → identify the **correct approver** for the requester's department.
3. Send a **Teams Adaptive Card** to the approver with the report summary.
4. Wait for approver response (Approve / Conditional Approve / Reject / Defer).
5. Trigger the **System Updater Agent** with the decision payload.

---

## Teams Adaptive Card

The approver receives the following card in Teams — no email, no portal login required:

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Software Approval Request",
      "size": "Large",
      "weight": "Bolder"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Software",        "value": "${softwareName} v${version}" },
        { "title": "Requester",       "value": "${requesterName}, ${department}" },
        { "title": "AI Recommendation","value": "${recommendation}" },
        { "title": "Risk Level",       "value": "${overallRisk}" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "${executiveSummary}",
      "wrap": true
    }
  ],
  "actions": [
    { "type": "Action.Submit",  "title": "✅ Approve",             "data": { "decision": "approve" } },
    { "type": "Action.Submit",  "title": "⚠️ Conditional Approve", "data": { "decision": "conditional" } },
    { "type": "Action.Submit",  "title": "❌ Reject",              "data": { "decision": "reject" } },
    { "type": "Action.OpenUrl", "title": "📄 View Full Report",    "url": "${reportUrl}" }
  ]
}
```

![Approval Adaptive Card — Teams Example](card1.png)

---

## Learning from History

The Report Builder Agent queries past reports as **grounding examples**:

- **Past APPROVED reports** for similar software categories → positive examples to model tone and completeness.
- **Past REJECTED reports** → identifies common rejection reasons to flag proactively in the new report.

This is powered by the `report-template-index` Azure AI Search index, which accumulates completed reports over time.

---

## System Updater Agent — Post-Decision

Once the approver submits a decision, the **System Updater Agent** writes back to:

| System | Action |
|---|---|
| **ServiceNow** | Create CMDB entry / software asset record |
| **Microsoft Entra ID** | Begin provisioning group/license assignment |
| **Microsoft Intune** | Flag for app packaging/deployment workflow |
| **SharePoint Software Catalog** | Add to approved software list |

The agent uses **Managed Identity** and HTTP connectors — no stored credentials.

---

## Next Steps

- [Report Specification](report-spec.md) — see the exact report template the Report Builder produces.
- [Security & RBAC](security.md) — understand the identity model for Copilot Studio connectors and Power Automate flows.
- [Troubleshooting](troubleshooting.md) — if the Copilot Studio connector fails with 401 errors or the adaptive card doesn't appear.
