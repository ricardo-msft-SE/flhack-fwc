---
layout: default
title: Monitoring & Evaluation
nav_order: 9
---

# Monitoring & Evaluation
{: .no_toc }

Application Insights dashboards, Foundry Evaluation, and key metrics for the approval system.
{: .fs-6 .fw-300 }

## Table of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Application Insights

Microsoft Foundry automatically integrates with **Azure Application Insights**. Configure the workspace connection once and all agent invocations are traced automatically.

### Setup

1. In **Foundry > Tracing**, click **+ Link workspace**.
2. Select or create an **Application Insights** workspace in `rg-swreq-approval`.
3. Click **Save**.

### Key Signals to Monitor

| Signal | Where to find it |
|---|---|
| Agent invocation latency per agent | App Insights → Performance → Dependencies |
| Token consumption per request | App Insights → Custom Metrics → `token_count` |
| Tool call success/failure rate | App Insights → Failures → Dependency failures |
| End-to-end report generation time | App Insights → Performance → Operations |
| Bing grounding query count | Foundry portal → Usage |

### Recommended Dashboard Tiles

Create a workbook in **Azure Monitor** with:
- **Line chart** — End-to-end latency (P50, P95) over time
- **Pie chart** — Tool call failures by tool type
- **Counter** — Reports generated today / this week
- **Table** — Top 10 slowest individual agent calls

---

## Foundry Evaluation

Use **Foundry Evaluation** to continuously assess report quality against a ground-truth dataset of completed reports.

### Step 1 — Create an Evaluation Dataset

1. In **Foundry > Evaluation > Datasets**, click **+ New dataset**.
2. Upload 20–30 completed, human-reviewed reports as ground truth.
3. Include both APPROVED and REJECTED examples.

### Step 2 — Configure Evaluators

| Evaluator | What it measures | Target Score |
|---|---|---|
| **Groundedness** | Are report claims supported by cited sources? | > 85% |
| **Relevance** | Is the report relevant to the requested software? | > 90% |
| **Coherence** | Is the report logically structured and readable? | > 85% |
| **Report Completeness** *(custom)* | Are all required sections present and non-empty? | > 90% |

### Step 3 — Schedule Evaluations

1. In **Foundry > Evaluation**, click **+ New evaluation run**.
2. Select your dataset and evaluators.
3. Set schedule: **Weekly** (or trigger after each major prompt or model update).

### Step 4 — Set Regression Alerts

{: .warning }
Configure alerts in **Azure Monitor** to fire if any evaluator score drops **more than 10%** from the established baseline. This catches prompt regressions early — before they affect production approvals.

```bash
az monitor metrics alert create \
  --name "foundry-eval-groundedness-regression" \
  --resource-group rg-swreq-approval \
  --scopes <app-insights-resource-id> \
  --condition "avg customMetrics/groundedness_score < 75" \
  --description "Groundedness score below 75% threshold"
```

---

## Key Metrics

| Metric | Target | Alert Threshold |
|---|---|---|
| End-to-end report generation time | < 5 minutes | > 15 minutes |
| Report completeness score | > 90% | < 80% |
| Groundedness score | > 85% | < 75% |
| Bing tool call success rate | > 98% | < 95% |
| Human approval rate | Track only (no target) | N/A |
| Agent timeout rate | < 1% | > 5% |

{: .note }
**Human approval rate** is tracked for audit and continuous improvement purposes only — it is intentionally not a KPI, as the system's role is to inform decisions, not to optimize for a particular outcome.

---

## Tracing Individual Requests

For a specific request end-to-end trace:

1. In **Foundry > Tracing**, search by `session_id` or `report_id`.
2. Expand the trace tree to see each agent call, tool invocation, and latency.
3. Click any tool call to see the raw input/output payload.

This is the primary debugging tool for understanding why a specific report had unexpected content or a quality gate failure.

---

## Next Steps

- [Troubleshooting](troubleshooting.md) — common issues and how to diagnose them using traces.
- [Configuration](configuration.md) — configure Foundry Evaluation evaluators and dataset.
