---
layout: default
title: Glossary
nav_order: 12
---

# Glossary
{: .no_toc }

Key terms used throughout this documentation.
{: .fs-6 .fw-300 }

---

**Adaptive Card**
A platform-agnostic card format used in Microsoft Teams (and other surfaces) to display structured information and collect user input. Used in this system to present the approval report summary and action buttons to the human approver.

**Agent IQ / Foundry IQ**
The knowledge indexing and grounding capability in Microsoft Foundry. Accessible via the **Knowledge** left-nav item in the Foundry portal. Allows agents to query document indexes, SharePoint, Blob Storage, and the web.

**Azure AI Search**
Microsoft's cloud search service used as the retrieval backbone for internal knowledge bases (`policy-index`, `vendor-index`, etc.). Supports semantic ranking, vector search, and hybrid search.

**Capability Host**
An infrastructure component provisioned by the **Standard Agent Setup** in Foundry. Provides agents with thread storage, file retrieval, and knowledge indexing capabilities backed by your own Azure Storage and AI Search instances.

**CIS Controls**
The Center for Internet Security Critical Security Controls — a prioritized set of actions to protect against known cyber attacks. Evaluated by the Compliance Research Agent.

**Code Interpreter**
A Foundry agent tool that provides a sandboxed Python execution environment. Used by the Security Agent for risk score calculations and by the Report Builder for risk matrix rendering.

**Connected Agents**
A Microsoft Foundry feature that allows one agent to call another agent as a tool. Enables the fan-out / fan-in multi-agent topology without custom orchestration code.

**CVE (Common Vulnerabilities and Exposures)**
A standardized identifier for publicly known security vulnerabilities. Evaluated by the Security Research Agent via NVD lookups.

**CVSS (Common Vulnerability Scoring System)**
A numeric severity score (0–10) for CVEs. Scores ≥ 7.0 are flagged by the Security Agent; scores ≥ 9.0 are considered Critical.

**DPA (Data Processing Agreement)**
A contract between a data controller and data processor governing how personal data is handled. Required by GDPR. Checked by the Compliance Research Agent.

**Fan-out / Fan-in**
The orchestration pattern used by this system. The Orchestrator *fans out* by spawning multiple specialist agents in parallel, then *fans in* by aggregating all their outputs before passing to the Report Builder.

**FedRAMP**
The Federal Risk and Authorization Management Program — a US government program for cloud service authorization. The Compliance Agent checks the FedRAMP Marketplace for software inclusion.

**Foundry Agent Service**
The managed service within Microsoft Foundry that hosts, orchestrates, and deploys AI agents. Provides thread management, tool integration, and the Connected Agents feature.

**Grounding with Bing Search**
A native first-party tool in Microsoft Foundry that connects an agent to real-time Bing web search. No separate Azure Bing resource is required. Configured via the Knowledge page (Foundry IQ) in the portal.

**Groundedness**
An evaluation metric that measures whether an AI-generated claim is supported by its cited sources. Detected by **Groundedness Detection** in Foundry Content Safety on the Report Builder Agent.

**Knowledge Base**
A collection of documents or data sources indexed and made queryable for agent grounding. Created and managed from the Foundry IQ (**Knowledge**) page in the portal.

**Managed Identity**
An Azure Active Directory identity automatically managed by Azure for a service instance. Used by all agents in this system to authenticate to Azure AI Search, Storage, and other services — no credentials stored in configuration.

**NIST CSF**
The NIST Cybersecurity Framework — guidelines for organizations to manage cybersecurity risk. Evaluated by the Compliance Research Agent.

**NVD (National Vulnerability Database)**
The US government repository of standards-based vulnerability data maintained by NIST at `nvd.nist.gov`. Queried by the Security Research Agent for CVE lookups.

**Orchestrator Agent**
The entry-point agent that receives software request intake, extracts structured metadata, and coordinates the parallel research agents via Connected Agents.

**Power Automate**
Microsoft's low-code workflow platform. Used in this system to trigger on Foundry agent completion, route approval cards via Teams, and drive post-decision system updates.

**Prompt Shield**
A Microsoft Foundry content safety feature that detects jailbreak attempts in agent inputs. Enabled on all agents to prevent adversarial software request submissions.

**RBAC (Role-Based Access Control)**
Azure's authorization system for managing access to Azure resources using role assignments. Used to grant agents least-privilege access to AI Search and Storage.

**Report Builder Agent**
The agent responsible for assembling the final Software Approval Report by aggregating structured JSON outputs from the three research agents into a Markdown document.

**SBOM (Software Bill of Materials)**
A formal record of the components and dependencies in a software product. The Security Agent checks whether the vendor publishes a SBOM.

**Semantic Chunking**
An AI Search ingestion feature that splits documents into semantically coherent chunks (rather than fixed-size chunks) for better retrieval quality.

**SOC 2 Type II**
A security auditing standard evaluating a vendor's controls for security, availability, processing integrity, confidentiality, and privacy over a period of time. Checked by the Compliance Research Agent.

**Standard Agent Setup**
A Foundry project configuration that connects an agent project to your own Azure Storage and Azure AI Search instances for thread storage and knowledge indexing. Required to use custom AI Search indexes with agents.

**System Updater Agent**
The agent that runs after the human decision is captured to write the approval status back to ServiceNow, Entra ID, Microsoft Intune, and SharePoint.

**Work IQ**
A Microsoft 365 Copilot capability providing organizational context awareness — including org-chart lookups, approval chain resolution, and calendar/meeting data. Used to route approval requests to the correct approver.

---

[← Back to Home](index.md)
