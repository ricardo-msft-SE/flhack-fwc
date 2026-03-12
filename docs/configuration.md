---
layout: default
title: Configuration
nav_order: 5
---

# Configuration
{: .no_toc }

Configure LLM models, Bing Grounding, knowledge bases, and each agent in the Microsoft Foundry portal.
{: .fs-6 .fw-300 }

## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Model Selection

Configure models in **Foundry > Model Catalog > Deployments**:

| Agent | Recommended Model | Rationale |
|---|---|---|
| Orchestrator | `gpt-4o` (2024-11-20) | Fast reasoning, parallel tool calling, low latency |
| Compliance Agent | `gpt-4o` or `o3` | Deep document reasoning |
| Security Agent | `gpt-4o` or `o3` | Long context for CVE reports |
| Vendor Checklist | `gpt-4o` | General research |
| Report Builder | `gpt-4o` | Long-form structured writing |

**Deployment settings:**

```
Model version:      gpt-4o (2024-11-20)
Deployment name:    gpt-4o-swreq
Tokens per minute:  100,000 (TPM) — increase if rate-limited
Content filtering:  Enabled (default policy)
```

{: .tip }
For Compliance and Security agents, deploy `o3` separately (`deployment name: o3-swreq`) and configure those agents to use it when `reasoning_effort: "high"` is needed. Use `o3` for async/background processing only — latency can be several minutes per complex query.

---

## Grounding with Bing Search

Microsoft Foundry provides **Grounding with Bing Search** as a native first-party tool — no separate Azure Bing Search resource is required.

1. In the [Foundry portal](https://ai.azure.com), navigate to **Knowledge** in the left nav (the **Foundry IQ** page).
2. Click **Create a knowledge base**.
3. In the **"Choose a knowledge type"** dialog, scroll to the **Tools** section.
4. Select **Grounding with Bing Search** — *"Enable your agent to use Grounding with Bing Search to access and return information from the web"*.
5. Click **Connect**. The connection is established automatically — no API key required.
6. Once connected, add it to each research agent via the agent's **Tools** tab in Agent Builder.

{: .note }
Configure each research agent's system prompt to issue **multiple targeted queries** rather than one broad query. Example: `"Acme Corp SOC 2 Type II certification 2025"` and `"Acme Corp DPA data processing agreement"` separately.

---

## Web Knowledge Base (Scheduled Crawl)

For periodically refreshed authoritative content (NIST, CIS Controls, FedRAMP docs):

1. In your project, navigate to **Knowledge** (left nav).
2. Click **Create a knowledge base**.
3. Under **Configure a knowledge base**, select **Web** — *"Ground with real-time web content via Bing"*.
4. Click **Connect**.
5. Add the URLs to crawl:
   - `https://nvd.nist.gov` — CVE/NVD data
   - `https://www.cisecurity.org/controls` — CIS Controls
   - `https://marketplace.fedramp.gov` — FedRAMP authorized products
6. Set embedding model: `text-embedding-3-large`.
7. Enable **semantic chunking**.
8. Set refresh schedule: **Weekly**.
9. Once Active, attach to the Compliance and Security agents via their **Knowledge** tab.

---

## Azure AI Search (Internal Knowledge)

Connect the AI Search indexes you created in [Getting Started](getting-started.md):

1. Navigate to **Knowledge** (left nav) → **Create a knowledge base**.
2. Under **Configure a knowledge base**, select **Azure AI Search Index**.
3. Follow the connection flow and select `ai-search-swreq`.
4. Configure semantic ranking:

```json
{
  "tool_type": "azure_ai_search",
  "index_name": "policy-index",
  "query_type": "semantic",
  "semantic_config": "policy-semantic-config",
  "top_k": 5
}
```

---

## All Knowledge Base Types

The **"Choose a knowledge type"** dialog in Foundry IQ supports:

| Type | When to use |
|---|---|
| **Azure AI Search Index** | Enterprise-scale; connect existing AI Search indexes |
| **Azure Blob Storage** | Upload policy PDFs and past reports directly |
| **Web** | Crawl NIST, CIS, FedRAMP, and vendor docs on a schedule |
| **Microsoft SharePoint (Remote)** | Live SharePoint content; no re-indexing required |
| **Microsoft SharePoint (Indexed)** | SharePoint indexed into AI Search for semantic ranking |
| **Microsoft OneLake** | Unstructured data from Fabric/OneLake |

**Tools section** of the same dialog:

| Tool | Purpose |
|---|---|
| **Azure AI search** | Connect Azure AI Search as a retrieval tool |
| **Grounding with Bing Search** | Real-time web search for agents |
| **Grounding with Bing Custom Search** | Scoped web search on custom domains |
| **Fabric Data Agent** | Query Fabric data assets |

---

## Grounding Strategy per Agent

| Agent | Primary Source | Secondary Source |
|---|---|---|
| Compliance | `compliance-frameworks-index` (internal) | Bing Grounding (live cert status) |
| Security | `cve-bulletins-index` (internal) | Bing Grounding (live NVD data) |
| Vendor | `vendor-index` (internal) | Bing Grounding (public vendor info) |
| Report Builder | `report-template-index` only | None (no live web search) |

---

## Orchestrator Agent Setup

1. In [ai.azure.com](https://ai.azure.com), open your project.
2. Navigate to **Agents > + New agent**.
3. Configure:
   - **Name**: `orchestrator-agent`
   - **Model**: `gpt-4o-swreq`
   - **Instructions**: Paste the Orchestrator system prompt from [Multi-Agent Design](agents.md#21-orchestrator-agent).
4. Under **Tools**, add:
   - **Bing Grounding** → select your Bing connection
   - **Azure AI Search** → index: `policy-index`
   - **Connected Agents** → add `compliance-agent`, `security-agent`, `vendor-checklist-agent`
5. Click **Save**.

{: .note }
**Connected Agents** registers each specialist agent as a callable tool on the Orchestrator. The fan-out pattern runs without any custom code.

---

## Research Agent Setup

Repeat for each of `compliance-agent`, `security-agent`, `vendor-checklist-agent`:

1. **Agents > + New agent**.
2. Configure name and paste the relevant system prompt from [Multi-Agent Design](agents.md).
3. **Model**: `gpt-4o-swreq` (or `o3-swreq` for compliance/security for deeper reasoning).
4. **Tools**:
   - Bing Grounding (all three)
   - Azure AI Search → appropriate index per agent
   - Code Interpreter → enable for Security and Compliance agents
5. **Save**.

---

## Report Builder Agent Setup

1. **Agents > + New agent**, name: `report-builder-agent`.
2. **Model**: `gpt-4o-swreq`.
3. **Instructions**: Paste the Report Builder system prompt from [Multi-Agent Design](agents.md#25-report-builder-agent).
4. **Tools**:
   - Azure AI Search → `report-template-index`
   - Code Interpreter → enabled
   - File Search → enabled
5. Upload the report template from [Report Specification](report-spec.md) as a **knowledge file** in the agent's **Files** tab.
6. **Save**.

---

## Content Safety

In **Foundry > Content Safety**:

- Enable **Prompt Shield** (jailbreak detection) on ALL agents — prevents adversarial software submissions designed to bypass security review.
- Set **Content Filtering** to `"Balanced"` profile.
- Enable **Groundedness Detection** on the Report Builder Agent to flag hallucinated evidence URLs.

---

## Next Steps

- [Usage & Approval Workflow](usage.md) — connect Copilot Studio and configure the Teams approval flow.
- [Monitoring & Evaluation](monitoring.md) — set up Application Insights and evaluation datasets.
