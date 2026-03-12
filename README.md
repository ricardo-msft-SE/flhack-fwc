# Software Request Approval — AI-Powered Future Architecture

> **"From Days to Minutes"** — Replace a manual, multi-day software approval workflow with an AI multi-agent system built on **Microsoft Foundry** that researches, evaluates, and reports on software requests automatically, routing only the final decision to a human approver.

## 📖 Full Documentation

**[View the documentation site →](https://ricardo-msft-se.github.io/flhack-fwc/)**

The docs cover the complete architecture, agent design, step-by-step deployment, configuration, usage, security, monitoring, troubleshooting, FAQ, and glossary.

## Quick Links

| Topic | Link |
|---|---|
| Architecture Overview | [docs/architecture.md](docs/architecture.md) |
| Multi-Agent Design | [docs/agents.md](docs/agents.md) |
| Getting Started | [docs/getting-started.md](docs/getting-started.md) |
| Configuration | [docs/configuration.md](docs/configuration.md) |
| Usage & Approval Workflow | [docs/usage.md](docs/usage.md) |
| Report Specification | [docs/report-spec.md](docs/report-spec.md) |
| Security & RBAC | [docs/security.md](docs/security.md) |
| Monitoring & Evaluation | [docs/monitoring.md](docs/monitoring.md) |
| Troubleshooting | [docs/troubleshooting.md](docs/troubleshooting.md) |
| FAQ | [docs/faq.md](docs/faq.md) |
| Glossary | [docs/glossary.md](docs/glossary.md) |

## What It Does

An AI multi-agent system built on **Microsoft Foundry** that:

1. Accepts software requests via a **Microsoft Teams bot** (Copilot Studio)
2. Runs **Compliance**, **Security**, and **Vendor** research agents in parallel
3. Assembles a structured **approval report** with risk matrix and AI recommendation
4. Routes to the human approver via a **Teams Adaptive Card** (one-click decision)
5. Writes the decision back to **ServiceNow, Entra ID, Intune, and SharePoint**

**Total time: ~3–7 minutes** vs. multiple days manually.

## Repository Contents

```
/
├── README.md          ← You are here (overview + links)
├── docs/              ← GitHub Pages documentation site
│   ├── _config.yml    ← Jekyll / just-the-docs configuration
│   ├── index.md       ← Site home page
│   ├── architecture.md
│   ├── agents.md
│   ├── getting-started.md
│   ├── configuration.md
│   ├── usage.md
│   ├── report-spec.md
│   ├── security.md
│   ├── monitoring.md
│   ├── troubleshooting.md
│   ├── faq.md
│   ├── glossary.md
│   └── *.png          ← Architecture and UI screenshots
```

