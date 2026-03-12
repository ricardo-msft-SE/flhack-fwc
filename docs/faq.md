---
layout: default
title: FAQ
nav_order: 11
---

# Frequently Asked Questions
{: .no_toc }

## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## How long does a full report take to generate?

**~3–7 minutes** end-to-end for a typical request. The three research agents run in parallel, so total latency is determined by the *slowest* single agent rather than the sum of all three. Using `o3` for Compliance or Security agents adds latency (potentially several minutes per agent) — use `gpt-4o` for synchronous, time-sensitive workflows.

---

## Can I use a different LLM?

Yes. Any model available in the **Microsoft Foundry Model Catalog** can be used. The system is tested with `gpt-4o` (2024-11-20). To switch models, update the **Model** field in each agent's configuration in Agent Builder. No code changes are required.

---

## Do I need all five agents?

The **Orchestrator, three Research Agents, and Report Builder** are the core pipeline — all five are required for a complete report. The **System Updater Agent** is optional if you handle post-decision system updates through another mechanism (e.g., a Power Automate flow without an AI agent).

---

## What's the difference between Bing Grounding and a Web knowledge base?

| | Grounding with Bing Search | Web Knowledge Base |
|---|---|---|
| **Freshness** | Real-time (live web) | Scheduled crawl (e.g., weekly) |
| **Setup** | Connect once in Foundry IQ Tools | Define URLs, set crawl schedule |
| **Best for** | Current CVE data, certification status, vendor news | NIST, CIS Controls, FedRAMP docs that change infrequently |
| **Index** | No index — queries Bing at runtime | Builds an Azure AI Search index |

For most research agent use cases, **both** should be enabled: Bing for live lookups and the Web KB for authoritative framework documents.

---

## Is this a production-ready system?

This repository documents a **reference architecture** designed for a Microsoft hackathon. Key components are not production-hardened:

- `TODO` items in [Security](security.md) (network boundaries, private endpoints) should be resolved before production use.
- The system prompt examples are starting points — tune them with your organization's specific policies and risk thresholds.
- Evaluation datasets should be built from your organization's actual approved/rejected reports.

---

## How do I add a new approval category (e.g., AI/ML Tools)?

1. Update each research agent's system prompt to include AI/ML-specific frameworks (e.g., EU AI Act, NIST AI RMF).
2. Add a new index (`ai-ml-policy-index`) with relevant internal AI governance policies.
3. Optionally, create a specialized **AI/ML Research Agent** and register it as an additional connected agent on the Orchestrator.
4. Update the report template to include an "AI/ML Risk" section in the Risk Matrix.

---

## Can the system reject requests automatically without human review?

By design, **no**. The system produces a recommendation (APPROVE / CONDITIONAL APPROVE / REJECT) but always routes to a human approver. This is intentional — automated rejection of software requests without human oversight creates accountability gaps and may violate procurement policy.

The human can act on the AI recommendation in one click, keeping the process fast while preserving human control.

---

## How is requester identity resolved?

The Copilot Studio bot uses the user's **Entra ID (SSO)** session. Requester name, department, and cost center are auto-populated from the Entra ID profile — users do not manually enter this information.

---

## What happens if an agent fails mid-workflow?

Power Automate and Foundry handle failure states as follows:

- If a research agent fails or times out, the Orchestrator marks that branch as incomplete.
- The Report Builder flags the report as **INCOMPLETE** and does not route it to the approver.
- The workflow coordinator is alerted (see [Troubleshooting](troubleshooting.md)).
- The request can be resubmitted once the root cause is resolved.

---

[← Back to Home](index.md)
