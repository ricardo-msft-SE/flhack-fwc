---
layout: default
title: Getting Started
nav_order: 4
---

# Getting Started
{: .no_toc }

Provision all required Azure resources and create the Microsoft Foundry project.
{: .fs-6 .fw-300 }

## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

Ensure the following are in place before provisioning:

| Requirement | Details |
|---|---|
| Azure subscription | **Owner** or **Contributor** + **User Access Administrator** roles |
| Azure CLI | `az --version` ≥ 2.60 — [Install](https://learn.microsoft.com/cli/azure/install-azure-cli) |
| Azure Developer CLI | `azd --version` ≥ 1.9 — [Install](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd) |
| Bicep CLI | `az bicep install` |
| Azure AI Projects Python SDK | `pip install azure-ai-projects` |
| Microsoft Foundry access | Sign in at [ai.azure.com](https://ai.azure.com) |

---

## Step 1 — Create a Resource Group

```bash
az group create \
  --name rg-swreq-approval \
  --location eastus2
```

{: .tip }
**East US 2** is recommended for the widest model availability (`gpt-4o`, `o3`, `text-embedding-3-large`). Check [Azure AI Foundry model availability](https://learn.microsoft.com/azure/ai-foundry/concepts/model-availability) for alternatives.

---

## Step 2 — Create the Foundry Project

In the [Microsoft Foundry portal](https://ai.azure.com):

1. Click **+ New project**.
2. Set **Project name**: `swreq-approval-project`.
3. Select your subscription and resource group `rg-swreq-approval`.
4. Select region: **East US 2**.
5. Under **Customize**, confirm the portal will auto-provision:
   - Azure AI Services (multi-service account)
   - Azure Key Vault
   - Azure Storage Account
6. Click **Create project**.

{: .note }
In the current Microsoft Foundry experience the **Project** is your primary workspace. A Hub is created automatically in the background but you interact exclusively with the project. You do not need to create a Hub manually.

**Note the project endpoint** — you'll need it for Copilot Studio connector setup:
```
https://<hub-name>.services.ai.azure.com/api/projects/<project-name>
```

---

## Step 3 — Deploy the LLM

In **Foundry > Model Catalog**:

1. Search for `gpt-4o`.
2. Select version `2024-11-20`.
3. Click **Deploy > Customize**:
   - Deployment name: `gpt-4o-swreq`
   - Tokens per minute: `100,000` (scale as needed)
4. *(Optional)* Repeat for `o3` if you want deeper reasoning for Compliance/Security agents.

---

## Step 4 — Provision Azure AI Search

```bash
az search service create \
  --name ai-search-swreq \
  --resource-group rg-swreq-approval \
  --sku standard \
  --location eastus2 \
  --partition-count 1 \
  --replica-count 1
```

Create the three required indexes in the portal or via the REST API:

| Index Name | Content |
|---|---|
| `policy-index` | Internal IT/security/compliance policies |
| `vendor-index` | Approved/denied vendors, past evaluations |
| `report-template-index` | Report templates and past approved reports |
| `compliance-frameworks-index` | NIST CSF, CIS Controls, ISO annexes, FedRAMP docs |
| `cve-bulletins-index` | Internal security advisories, patch notes |

---

## Step 5 — Provision Storage for Report Artifacts

```bash
az storage account create \
  --name swreqreports \
  --resource-group rg-swreq-approval \
  --location eastus2 \
  --sku Standard_LRS \
  --kind StorageV2
```

---

## Step 6 — Configure Standard Agent Setup

The **Standard Agent Setup** connects your own Azure Storage and AI Search instance for agent thread storage and knowledge indexing.

In the [Foundry portal](https://ai.azure.com):

1. Navigate to your project **> Settings > Agent settings**.
2. Select **Standard setup**.
3. Connect:
   - **Azure AI Storage**: select `swreqreports`.
   - **Azure AI Search**: select `ai-search-swreq`.
4. Click **Apply**.

{: .note }
This provisions a **Capability Host** that all agents use for thread storage, file retrieval, and knowledge indexing. Standard setup is required to connect agents to your own AI Search indexes.

---

## Step 7 — Grant Permissions (RBAC)

```bash
# Foundry agents → read from AI Search
az role assignment create \
  --assignee <foundry-agent-managed-identity-object-id> \
  --role "Search Index Data Reader" \
  --scope /subscriptions/{sub}/resourceGroups/rg-swreq-approval/providers/Microsoft.Search/searchServices/ai-search-swreq

# Foundry agents → write reports to Storage
az role assignment create \
  --assignee <foundry-agent-managed-identity-object-id> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/{sub}/resourceGroups/rg-swreq-approval/providers/Microsoft.Storage/storageAccounts/swreqreports
```

{: .important }
All identities use **Managed Identity** — no secrets or API keys in agent configurations. See [Security & RBAC](security.md) for the full identity model.

---

## What's Next

- [Configuration](configuration.md) — configure LLM models, Bing grounding, knowledge bases, and each agent in the Foundry portal.
- [Multi-Agent Design](agents.md) — review each agent's system prompt and tool list before configuring.
