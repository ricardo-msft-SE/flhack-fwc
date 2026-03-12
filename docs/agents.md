---
layout: default
title: Multi-Agent Design
nav_order: 3
---

# Multi-Agent Design
{: .no_toc }

Six specialized agents, their roles, system prompts, and tools.
{: .fs-6 .fw-300 }

## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

The system uses **Microsoft Agent Framework** (part of Azure AI Foundry) in a **fan-out / fan-in** topology. The Orchestrator delegates parallel research tasks to three specialist agents and aggregates their outputs into a single structured report.

| Agent | Role | Model |
|---|---|---|
| Orchestrator | Intake, fan-out, aggregation | `gpt-4o` |
| Compliance Research | Regulatory & framework evaluation | `gpt-4o` or `o3` |
| Security Research | CVE, breach, and patch assessment | `gpt-4o` or `o3` |
| Vendor Checklist | Vendor viability and procurement | `gpt-4o` |
| Report Builder | Aggregate findings into final report | `gpt-4o` |
| System Updater | Write decision back to systems of record | `hosted` agent |

---

## 2.1 Orchestrator Agent

**Role:** Entry point. Receives the software request, extracts structured metadata, spawns specialist agents in parallel, waits for outputs, and passes the aggregated findings to the Report Builder Agent.

**Foundry Agent Type:** `prompt` agent backed by `gpt-4o`

**System Prompt:**
```
You are a Software Request Intake Orchestrator. When you receive a software request, extract:
- Software name, version, vendor, intended use case
- Business justification
- Requester name, department, cost center

Then invoke the following specialist agents in parallel:
- compliance_agent
- security_agent
- vendor_checklist_agent

Collect all outputs, then invoke report_builder_agent with the combined findings.
```

**Tools:**

| Tool | Purpose |
|---|---|
| `invoke_agent` (Connected Agent) | Fan-out to Compliance, Security, Vendor agents |
| `bing_grounding` | Initial public web lookup of product |
| `azure_ai_search` | Query internal policy knowledge base (`policy-index`) |

---

## 2.2 Compliance Research Agent

**Role:** Research the software against regulatory and policy frameworks — SOC 2, ISO 27001, NIST CSF, CIS Controls, GDPR, HIPAA, FedRAMP — and assess data handling and DPA status.

**Foundry Agent Type:** `prompt` agent backed by `gpt-4o`

**System Prompt:**
```
You are a Compliance Research Specialist. Your task is to evaluate the requested
software against regulatory frameworks. Research the following:
1. Does the vendor hold SOC 2 Type II / ISO 27001 certification? Are certifications current?
2. Is the software included in FedRAMP Marketplace (if applicable)?
3. Are there known GDPR, HIPAA, or CCPA compliance gaps?
4. What data residency options are available? Does the vendor offer a DPA?
5. Review any relevant government or industry watchlists.

Output structured JSON with: compliant (boolean), frameworks_checked (list),
findings (list of {framework, status, notes}), risk_level (Low/Medium/High/Critical),
evidence_urls (list).
```

**Tools:**

| Tool | Purpose |
|---|---|
| `bing_grounding` | Web search for compliance certifications, DPA status |
| `azure_ai_search` | Internal compliance policy knowledge base |
| `code_interpreter` | Parse & summarize certification documents |

---

## 2.3 Security Research Agent

**Role:** Assess the software's security posture — CVE history, SBOM, known vulnerabilities, breach history, and alignment with security benchmarks.

**Foundry Agent Type:** `prompt` agent backed by `gpt-4o`

**System Prompt:**
```
You are a Security Research Specialist. Evaluate the requested software for security risks.
Research the following:
1. Search NVD (nvd.nist.gov) and CVE databases for known vulnerabilities (CVSS ≥ 7.0).
2. Check HaveIBeenPwned, BreachAware, and public breach databases for vendor incidents.
3. Identify whether the vendor publishes a SBOM or VEX document.
4. Assess patch cadence: how quickly does the vendor release security patches?
5. Check vendor's bug bounty program status.
6. Identify open-source components with high-severity OSS CVEs.

Output structured JSON with: cve_count_critical, cve_count_high, breach_history (list),
patch_cadence, sbom_available (boolean), risk_score (0–100), risk_level, evidence_urls.
```

**Tools:**

| Tool | Purpose |
|---|---|
| `bing_grounding` | CVE lookups, breach news, security advisories |
| `azure_ai_search` | Internal security baseline knowledge (`cve-bulletins-index`) |
| `code_interpreter` | Score aggregation and risk calculation |

---

## 2.4 Vendor Checklist Agent

**Role:** Gather vendor viability, contractual, and procurement-related facts using the standard vendor due-diligence checklist.

**Foundry Agent Type:** `prompt` agent backed by `gpt-4o`

**System Prompt:**
```
You are a Vendor Due Diligence Specialist. Evaluate the software vendor using
the standard procurement checklist. Research and answer:
1. Vendor financial health: publicly traded or private? Recent funding? Revenue/size.
2. Is the vendor on any government denied/restricted lists (Entity List, OFAC SDN)?
3. Support model: SLA tiers, support hours, dedicated account manager?
4. Pricing model: per-seat, consumption, enterprise agreement? Estimate annual cost.
5. Data portability: can the organization export all data if the contract ends?
6. Subprocessors: who are the key subprocessors and where are they located?
7. Alternatives: list 2–3 comparable alternatives with brief comparison.

Output structured JSON with: vendor_name, vendor_size, financial_health,
restricted_list_check (clear/flagged), support_sla, estimated_annual_cost,
data_portability, subprocessors (list), alternatives (list),
overall_vendor_risk (Low/Medium/High).
```

**Tools:**

| Tool | Purpose |
|---|---|
| `bing_grounding` | Web search for vendor info, news, financials |
| `azure_ai_search` | Internal preferred vendors list (`vendor-index`) |
| `file_search` | Vendor onboarding policy documents |

---

## 2.5 Report Builder Agent

**Role:** Aggregate outputs from the three research agents and produce a comprehensive, structured approval report in Markdown.

**Foundry Agent Type:** `prompt` agent backed by `gpt-4o`

**System Prompt:**
```
You are a Report Builder Agent. You receive structured JSON from three research agents
and assemble a comprehensive Software Approval Report.
Format the report according to the standard template (knowledge base: "software-approval-report-template").
The report must include: Executive Summary, Compliance Section, Security Section, Vendor Section,
Risk Matrix, Recommendation, and an Appendix with all source URLs.
Set the overall recommendation to APPROVE / CONDITIONAL APPROVE / REJECT based on aggregated risk.
Output valid Markdown.
```

**Tools:**

| Tool | Purpose |
|---|---|
| `azure_ai_search` | Retrieve report template and past approved reports (`report-template-index`) |
| `code_interpreter` | Render risk matrix, format JSON → Markdown |

---

## 2.6 System Updater Agent

**Role:** After the human decision is captured, update the system of record (ServiceNow, Jira, or SharePoint list) with the final approval status and store the report artifact.

**Foundry Agent Type:** `hosted` agent (uses Power Automate HTTP connector or custom tool)

**Tools:**

| Tool | Purpose |
|---|---|
| `http_connector` (custom) | POST to ServiceNow/ITSM REST API |
| `sharepoint_connector` | Upload report PDF and update list item status |
| `email_connector` | Send approval notification to requester |

---

## Connected Agents Pattern

{: .note }
**Connected Agents** is the Microsoft Foundry feature that enables fan-out without writing orchestration code. Each specialist agent is registered as a "tool" that the Orchestrator can call. The Orchestrator's `invoke_agent` tool handles serialization, routing, and async response collection automatically.

To register a connected agent in Foundry portal:
1. Open the **Orchestrator Agent** in Agent Builder.
2. Under **Tools**, select **+ Add tool > Connected Agent**.
3. Select the target agent from the dropdown.
4. Repeat for each specialist agent.

---

## Next Steps

- [Architecture Overview](architecture.md) — see the full topology diagram.
- [Configuration](configuration.md) — configure each agent in the Foundry portal step-by-step.
- [Getting Started](getting-started.md) — provision the Azure resources first.
