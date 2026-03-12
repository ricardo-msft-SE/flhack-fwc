---
layout: default
title: Troubleshooting
nav_order: 10
---

# Troubleshooting
{: .no_toc }

Common issues and how to diagnose and fix them.
{: .fs-6 .fw-300 }

## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Agent Timeouts / No Response

**Symptom:** Orchestrator agent waits indefinitely or returns a timeout error after spawning specialist agents.

**Likely causes and fixes:**

| Cause | Fix |
|---|---|
| TPM (tokens per minute) limit reached | Increase the deployment's TPM quota in **Foundry > Model Catalog > Deployments** |
| Connected agent not saved correctly | Re-open the Orchestrator agent in Agent Builder and verify all three connected agents appear under **Tools** |
| `o3` model used synchronously | Switch Compliance/Security agents to `gpt-4o` for synchronous workflows, or implement async polling |
| Region capacity issue | Check [Azure AI Foundry status](https://status.azure.com) and consider redeploying in an alternate region |

{: .tip }
In **Foundry > Tracing**, search by `session_id` to see which agent call timed out and at what token count.

---

## Bing Grounding Returns No Results

**Symptom:** Research agents return generic or empty responses with no evidence URLs.

**Likely causes and fixes:**

| Cause | Fix |
|---|---|
| Bing Grounding connection not attached to agent | In Agent Builder, verify **Grounding with Bing Search** appears under the agent's **Tools** tab |
| Connection shows as "Disconnected" in Foundry IQ | Navigate to **Knowledge** → find the Bing connection → click **Reconnect** |
| System prompt query too broad | Refine agent prompts to use specific queries (e.g., `"Vendor Corp SOC 2 Type II 2025"` not `"vendor compliance"`) |
| Bing grounding capacity throttle | Check quotas in **Foundry portal** under **Usage** |

---

## Azure AI Search Returns No Results

**Symptom:** Agents return responses saying they couldn't find relevant policy/vendor information internally.

**Likely causes and fixes:**

| Cause | Fix |
|---|---|
| Index is empty | Verify documents have been uploaded and indexed — check **AI Search > Indexes > [index-name] > Document count** |
| Wrong index name in agent config | In Agent Builder, confirm the Azure AI Search tool points to the correct index name (e.g., `policy-index` not `policy_index`) |
| Semantic config not set up | Create a semantic configuration in AI Search portal and update the tool's `semantic_config` parameter |
| Standard Agent Setup not completed | Go to **Foundry > Settings > Agent settings** and confirm Standard Setup is Applied |

---

## Report Fails Quality Gate

**Symptom:** Report Builder marks the report INCOMPLETE and the approval card is not sent.

**Likely causes and fixes:**

| Gate | Cause | Fix |
|---|---|---|
| Not all research outputs received | One specialist agent timed out | Re-run the request; check Tracing for which agent failed |
| < 5 evidence URLs | Bing Grounding not returning results | See [Bing Grounding section](#bing-grounding-returns-no-results) above |
| Risk matrix missing | Research agent output JSON malformed | Check agent output format matches the expected JSON schema in the system prompt |
| Recommendation field empty | Report Builder prompt not extracting aggregated risk level | Review and update the Report Builder system prompt |

---

## Copilot Studio Connector — 401 Unauthorized

**Symptom:** The Teams bot fails when trying to call the Foundry Agents API; Power Automate logs a 401 error.

**Likely causes and fixes:**

| Cause | Fix |
|---|---|
| Entra ID app registration missing API permission | In Entra ID, add `Azure AI Projects > Agents.ReadWrite` and **Grant admin consent** |
| OAuth token scope mismatch | Verify the connector's OAuth scope matches the Foundry API scope |
| Connector using expired client secret | Rotate the client secret in Entra ID and update the connector |
| Wrong project endpoint URL | Double-check the endpoint format: `https://<hub>.services.ai.azure.com/api/projects/<project-name>` |

{: .important }
If you are using a client secret (not recommended), ensure it has not expired. Prefer certificate-based authentication for production connectors.

---

## Adaptive Card Not Appearing in Teams

**Symptom:** Power Automate flow completes successfully but the approver does not see the card in Teams.

**Likely causes and fixes:**

| Cause | Fix |
|---|---|
| Teams channel/chat not found | Verify the recipient identifier (UPN or channel ID) in the Power Automate "Post adaptive card" action |
| Adaptive Card JSON syntax error | Test the card in [https://adaptivecards.io/designer/](https://adaptivecards.io/designer/) |
| Power Automate flow suspended | In Power Automate, check **My flows > [flow name] > Run history** for suspension notices |
| Teams bot not published | Confirm the Copilot Studio bot is published to the Teams channel under **Publish > Channels** |

---

## System Updater Agent — ServiceNow Write Fails

**Symptom:** The decision is captured but ServiceNow is not updated; no CMDB entry is created.

**Likely causes and fixes:**

| Cause | Fix |
|---|---|
| HTTP connector endpoint incorrect | Verify the ServiceNow REST API endpoint and table name in the connector config |
| Managed Identity lacks ServiceNow permission | Confirm the System Updater Agent's MI has the correct ServiceNow role (e.g., `itil`) |
| ServiceNow instance in maintenance | Check ServiceNow status page |

{: .note }
**TODO:** Add organization-specific ServiceNow instance URL and required role names here.

---

## Getting Help

If an issue is not covered here:

1. Check **Foundry > Tracing** for the full agent execution trace.
2. Search [Microsoft Q&A for Azure AI Foundry](https://learn.microsoft.com/answers/tags/387/azure-ai-foundry).
3. File an issue in the [project repository](https://github.com/ricardo-msft-SE/flhack-fwc/issues).

---

[← Back to Home](index.md)
