---
layout: default
title: Security & RBAC
nav_order: 8
---

# Security & RBAC
{: .no_toc }

Identity model, role assignments, and content safety configuration for the approval system.
{: .fs-6 .fw-300 }

## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Identity Model

All agents and connectors authenticate to Azure services using **Managed Identity** — no secrets, passwords, or API keys stored in agent configurations or connector settings.

| Identity | Type | Permissions |
|---|---|---|
| Foundry Agent Service | System-assigned MI | Azure AI Search Data Reader, Storage Blob Data Contributor |
| Copilot Studio Connector | User-delegated (OAuth 2.0) | Foundry Agents API caller (custom role) |
| Power Automate Flows | Connection MI | Teams message sender, SharePoint writer |
| System Updater Agent | System-assigned MI | ServiceNow integration (HTTPS only) |

---

## RBAC Configuration

### AI Search Access

```bash
az role assignment create \
  --assignee <foundry-agent-managed-identity-object-id> \
  --role "Search Index Data Reader" \
  --scope /subscriptions/{sub}/resourceGroups/rg-swreq-approval/providers/Microsoft.Search/searchServices/ai-search-swreq
```

### Storage Access (Report Artifacts)

```bash
az role assignment create \
  --assignee <foundry-agent-managed-identity-object-id> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/{sub}/resourceGroups/rg-swreq-approval/providers/Microsoft.Storage/storageAccounts/swreqreports
```

### Foundry Agents API Caller (for Copilot Studio)

Create an **Entra ID app registration** for the Copilot Studio connector:

1. In [Entra ID](https://entra.microsoft.com), register a new app: `swreq-copilot-connector`.
2. Add API permission: `Azure AI Projects` → `Agents.ReadWrite`.
3. Grant admin consent.
4. Use this app's OAuth 2.0 credentials in the Copilot Studio custom connector — no client secrets in the connector config; use certificate-based auth where possible.

{: .important }
**Never** store API keys or client secrets directly in Copilot Studio connector settings or Power Automate connection strings. Use Entra ID OAuth flows or managed identity connections exclusively.

---

## Content Safety

Configure in **Foundry > Content Safety** for all agents:

| Setting | Value | Reason |
|---|---|---|
| **Prompt Shield** | Enabled (all agents) | Prevents jailbreak attempts via adversarial software request submissions |
| **Content Filtering** | `Balanced` profile | Blocks harmful output without over-restricting research content |
| **Groundedness Detection** | Enabled (Report Builder only) | Flags hallucinated evidence URLs before the report reaches the approver |

{: .warning }
Prompt Shield is **critical** for this use case. An adversarial user could attempt to craft a software request description that manipulates the agents into bypassing security review or approving malicious software. Ensure Prompt Shield is enabled on the Orchestrator Agent at minimum.

---

## Network Security

{: .note }
**TODO:** Define network boundary requirements — VNet integration, private endpoints for AI Search and Storage, and outbound internet access policy for Bing Grounding. Consult your organization's network security team before deploying to production.

Recommended considerations:

- Deploy AI Search and Storage with **private endpoints** in `rg-swreq-approval` VNet.
- Restrict Foundry project outbound access to approved domains only.
- Enable **Azure Monitor diagnostic logs** on AI Search and Storage for audit trails.
- Ensure all HTTPS — no plaintext connections anywhere in the pipeline.

---

## Data Classification

| Data Type | Classification | Storage | Retention |
|---|---|---|---|
| Software request intake | Internal | Foundry thread storage | 90 days |
| Research agent outputs | Internal | Foundry thread storage | 90 days |
| Approval report (Markdown/PDF) | Internal | Azure Blob Storage | 3 years (per policy) |
| Approver decision | Internal | ServiceNow / SharePoint | Per ITSM policy |
| Bing Grounding queries | No PII | Transient (not stored) | None |

---

## Next Steps

- [Getting Started](getting-started.md) — the RBAC `az role assignment create` commands for initial provisioning.
- [Monitoring & Evaluation](monitoring.md) — audit trails and evaluation dashboards.
- [Troubleshooting](troubleshooting.md) — resolving 401 / 403 errors in connectors and agents.
