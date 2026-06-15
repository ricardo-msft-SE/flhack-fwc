---
layout: default
title: SharePoint Document Retrieval in Foundry
nav_order: 14
---

# SharePoint Document Retrieval in Foundry (June 2026)

**Last Updated:** June 2026  
**Audience:** Solution architects, AI engineers deploying Foundry agents with internal document grounding

## Overview

This guide explains how to integrate SharePoint document retrieval into your Foundry agents, comparing **indexed** vs **remote** approaches, and how to layer them with **Bing web grounding** for optimal production results.

---

## 1. Architecture Decision: Indexed vs Remote

### 1.1 SharePoint (Indexed) — **Recommended for Production**

**Best for:** Enterprise deployments requiring repeatability, compliance, and controlled retrieval.

**How it works:**
- Content is ingested from SharePoint into Azure AI Search
- Agents query AI Search, not SharePoint directly
- Scheduled refresh (weekly recommended for compliance/security docs)
- Semantic ranking and chunking applied during indexing
- Faster, more predictable query performance at scale

**Tradeoffs:**
- ✅ Better recall, semantic ranking, chunk control
- ✅ Compliance-friendly (indexed snapshot, immutable audit trail)
- ✅ Lower latency for agents at query time
- ✅ Governance through indexing pipeline
- ❌ Requires Azure AI Search instance
- ❌ Slightly more operational overhead (refresh scheduling)

**Setup in Foundry UI:**
1. Provision Azure AI Search (Standard tier recommended)
2. In **Foundry > Knowledge** → **Create a knowledge base**
3. Select **Azure AI Search** in the **Configure a knowledge base** section
4. Connect to your indexing account
5. Configure semantic ranking and embedding model (`text-embedding-3-large`)
6. Add the knowledge base to agents via **Agent Builder > Knowledge** tab

---

### 1.2 SharePoint (Remote) — **Good for Quick Start**

**Best for:** Pilots, low-ops setups, or when you need live M365 governance without indexing.

**How it works:**
- Agents query SharePoint directly at retrieval time via Microsoft Graph
- No separate Azure AI Search index required
- Content is governed entirely by M365 permissions and compliance controls
- Real-time access to latest SharePoint content (no refresh lag)

**Tradeoffs:**
- ✅ Simplest to set up (no Azure AI Search needed)
- ✅ Live M365 governance (permissions, retention policies, sensitivity labels apply)
- ✅ No separate indexing pipeline to maintain
- ❌ Potential latency variations (remote API call per query)
- ❌ Less control over chunking and ranking
- ❌ Less suitable for large-scale retrieval

**Setup in Foundry UI:**
1. In **Foundry > Knowledge** → **Create a knowledge base**
2. Select **Microsoft SharePoint (Remote)** in the dialog
3. Connect your M365 tenant
4. Select site(s) and document library
5. Add to agents via **Agent Builder > Knowledge** tab

---

## 2. Grounding Strategy: Internal-First with Web Fallback

### 2.1 Recommended Retrieval Chain

For your compliance and security research agents, use this precedence:

```
Query arrives → Check SharePoint KB first → If low confidence, invoke Bing grounding
  ↓
  ├─ Internal knowledge search (indexed or remote SharePoint)
  │  └─ If result confidence high, return with source attribution
  │
  └─ If low coverage or no match
     └─ Invoke Bing grounding tool
        └─ Merge results with internal findings + source attribution
```

### 2.2 PII Sanitization Before Web Grounding

**Critical:** Before any Bing grounding call, sanitize user-provided context.

From your [Jane Doe lab](Hands-On-Lab-Jane-Doe-SOC2-PII-Safe-Grounding.md):

```typescript
// Evaluate policy before web grounding
const policy = evaluatePiiPolicy(userText);

if (policy.action === "block" || policy.action === "manual-review") {
  // Do NOT invoke Bing grounding
  return "Request requires manual review.";
}

// Only pass sanitized query to Bing
const groundedContent = await runWebGrounding(policy.sanitizedQuery);
```

---

## 3. Agent-Specific Knowledge Base Mapping

### 3.1 Compliance Research Agent

| Knowledge Base | Source | Purpose |
|---|---|---|
| `compliance-frameworks-kb` | SharePoint (Indexed) | Internal compliance policy, NIST CSF, CIS Controls docs |
| Bing Grounding | Web | Live FedRAMP marketplace, certification updates |

**Query strategy:**
1. Query `compliance-frameworks-kb` for internal standards
2. For vendor-specific compliance status, invoke Bing (e.g., "Vendor SOC 2 certification 2026")
3. Merge and attribute sources

### 3.2 Security Research Agent

| Knowledge Base | Source | Purpose |
|---|---|---|
| `security-advisories-kb` | SharePoint (Indexed) | Internal CVE bulletins, red team reports, patch notes |
| Bing Grounding | Web | NVD live data, vendor security advisories, breach news |

**Query strategy:**
1. Query `security-advisories-kb` for internal knowledge
2. Invoke Bing for fresh NVD/vendor data and breach history
3. Merge findings with CVSS scoring and internal risk context

### 3.3 Vendor Due Diligence Agent

| Knowledge Base | Source | Purpose |
|---|---|---|
| `vendor-approved-list-kb` | SharePoint (Indexed) | Internal approved/denied vendors, past evaluations |
| Bing Grounding | Web | Public vendor financials, news, funding, ecosystem info |

**Query strategy:**
1. Query `vendor-approved-list-kb` for internal procurement decisions
2. Invoke Bing for public vendor profile (size, financials, news)
3. Return combined profile + internal flag if vendor already evaluated

### 3.4 Report Builder Agent

| Knowledge Base | Source | Purpose |
|---|---|---|
| `report-templates-kb` | SharePoint (Indexed) | Past approved reports, report template, formatting standards |

**Query strategy:**
- **No Bing grounding** — this agent only assembles internal knowledge
- Query templates for structure and past examples for style/completeness
- Reduces latency and focuses on deterministic assembly

---

## 4. Foundry Knowledge Base Creation Walkthrough

### 4.1 Create an Indexed SharePoint Knowledge Base

**Step 1: Provision Azure AI Search**
```bash
az search service create \
  --name ai-search-swreq-prod \
  --resource-group rg-swreq-approval \
  --location eastus2 \
  --sku standard \
  --partition-count 1 \
  --replica-count 1
```

**Step 2: In Foundry Portal > Knowledge**
1. Navigate to **Knowledge** (left nav)
2. Click **Create a knowledge base** (top right)
3. In the **"Choose a knowledge type"** dialog:
   - Under **Configure a knowledge base**, select **Azure AI Search**
4. Click **Connect**
5. Fill in:
   - **Knowledge base name:** `compliance-frameworks-kb`
   - **Search resource:** select `ai-search-swreq-prod`
   - **Index name:** (create new or select existing)
   - **Embedding model:** `text-embedding-3-large` (recommended)
   - **Semantic ranking:** Enabled
6. Click **Create**
7. Once status shows **Active**, move to Step 3

**Step 3: Index Your Documents**

Use the Azure AI Search ingestion pipeline:
1. Upload SharePoint documents (PDFs, DOCX) to Azure Blob Storage
2. Run the indexing pipeline:
   ```bash
   az search index create \
     --service-name ai-search-swreq-prod \
     --index-definition compliance_index.json
   ```
3. Verify index populated:
   ```bash
   az search documents search \
     --service-name ai-search-swreq-prod \
     --index-name compliance_index \
     --search-text "SOC 2"
   ```

**Step 4: Add to Agent**

In **Agent Builder > [Agent Name] > Knowledge**:
1. Click **Add knowledge**
2. Select `compliance-frameworks-kb`
3. **Save**

---

### 4.2 Create a Remote SharePoint Knowledge Base

**Step 1: In Foundry Portal > Knowledge**
1. Navigate to **Knowledge** (left nav)
2. Click **Create a knowledge base** (top right)
3. In the dialog, select **Microsoft SharePoint (Remote)** under **Configure a knowledge base**
4. Click **Connect**
5. Authenticate with your M365 account
6. Select **site(s)** and **document libraries** to surface
7. Set **refresh schedule** (optional, for metadata sync)
8. Click **Create**

**Step 2: Add to Agent**

Same as indexed: **Agent Builder > [Agent Name] > Knowledge** → **Add knowledge** → select the remote KB.

**M365 Governance Note:** Agents inherit SharePoint's permission model — users see only documents they have access to, and compliance labels/retention policies apply automatically.

---

## 5. Grounding with Bing Search

### 5.1 First-Party Native Tool

Microsoft Foundry provides **Grounding with Bing Search** as a first-party tool — no separate Bing Search resource required.

**Setup:**
1. In **Foundry > [Project] > Knowledge**
2. Click **Create a knowledge base** (top right)
3. In the dialog, scroll to **Tools** section at the bottom
4. Select **Grounding with Bing Search** — *"Enable your agent to use Grounding with Bing Search to access and return information from the web"*
5. Click **Connect** — connection established automatically (no API key needed)
6. Once **Active**, add to agents via **Agent Builder > Tools**

### 5.2 Best Practices for Web Grounding

1. **Sanitize before querying:**
   - Use the Jane Doe PII policy module to redact identity fields
   - Pass only the sanitized `query` to Bing grounding

2. **Use targeted queries:**
   - Bad: `"software compliance"`
   - Good: `"Vendor XYZ SOC 2 certification 2026"`

3. **Attribute sources:**
   - Always include `[source URL]` citations in agent responses
   - Keep a list of web sources in the report

4. **Control scope:**
   - For vendor research: `"[VendorName] financials news 2026"`
   - For CVE data: `"NVD [VendorName] critical CVE"`
   - For standards: `"NIST 800-53 revision 2026"` (for live updates)

---

## 6. Work IQ Integration (Context & Orchestration)

**Work IQ** is not a document retrieval engine—it's an **orchestration and context layer**.

### 6.1 When to Use Work IQ

| Use Case | Tool |
|---|---|
| Find and ground internal policy docs | SharePoint Knowledge (Indexed or Remote) |
| Route approvals to correct manager | Work IQ (org hierarchy lookup) |
| Look up requester's department/cost center | Work IQ (M365 user context) |
| Fetch latest vendor security data | Bing Grounding |
| Assemble report with org context | Work IQ (for routing metadata) + SharePoint KB (for content) |

### 6.2 Example: Policy Routing with Work IQ

```
User submits request → Foundry extracts dept from M365 profile (Work IQ) 
  ↓
  → Compliance agent queries policy KB (SharePoint) for dept-specific policy
  ↓
  → Report built with policy + org context
  ↓
  → Power Automate uses Work IQ to find dept approver
  ↓
  → Route via Teams card to correct manager
```

**Key:** Work IQ handles *who and where*, SharePoint handles *what (policy content)*.

---

## 7. Preview Features & Stability Guidance

### 7.1 June 2026 Foundry Status

| Feature | Status | Production Ready? | Notes |
|---|---|---|---|
| SharePoint (Indexed) KB | GA | ✅ Yes | Use for production |
| SharePoint (Remote) KB | GA | ✅ Yes | Use for pilots or low-ops |
| Bing Grounding | GA | ✅ Yes | First-party native tool |
| Azure AI Search integration | GA | ✅ Yes | Stable with semantic ranking |
| Work IQ context provisioning | GA | ✅ Yes | Use for orchestration |

### 7.2 Preview Features Policy

For any connector/feature marked **Preview** in your tenant:

1. **Pilot phase:** Use in non-critical paths only
2. **Add fallback:** If a preview KB fails, fall back to web grounding or cached results
3. **Monitor latency:** Track query times daily
4. **Quality regressions:** Set alerts if search recall drops >10%
5. **Lock-in timeline:** Plan to migrate or lock-in before Preview EOL announced

---

## 8. Configuration Checklist for This Solution

Use this checklist to validate your SharePoint + Foundry setup before production:

### Knowledge Bases
- [ ] Azure AI Search provisioned (Standard tier, 1 partition, 1 replica)
- [ ] SharePoint (Indexed) KB created for compliance docs
- [ ] SharePoint (Indexed) KB created for security advisories
- [ ] SharePoint (Indexed) KB created for vendor approved/denied list
- [ ] SharePoint (Indexed) KB created for report templates
- [ ] Bing Grounding enabled and tested
- [ ] Refresh schedule configured (weekly for compliance, security)

### Agent Configuration
- [ ] Compliance agent: attached to compliance-frameworks-kb + Bing tool
- [ ] Security agent: attached to security-advisories-kb + Bing tool
- [ ] Vendor agent: attached to vendor-approved-list-kb + Bing tool
- [ ] Report builder: attached to report-templates-kb (no Bing)
- [ ] Orchestrator: can invoke all research agents + report builder

### PII & Security
- [ ] PII policy module deployed (`piiQueryPolicy.ts` or equivalent)
- [ ] Pre-grounding policy gate: all web queries sanitized
- [ ] Managed identity RBAC configured for Azure AI Search read access
- [ ] SharePoint permissions inherited by agents (no credential duplication)

### Operations
- [ ] Application Insights monitoring enabled
- [ ] Baseline metrics recorded (query latency, recall, citation count)
- [ ] Alert thresholds set (latency >5s, recall drop >10%)
- [ ] Runbook created for index refresh failures
- [ ] Documentation link: [This guide](Foundry-SharePoint-Retrieval.md)

---

## 9. Troubleshooting

### 9.1 Knowledge Base Not Returning Results

**Symptom:** Agent queries KB but returns empty or "no relevant documents found"

**Diagnosis:**
1. Check KB status in **Foundry > Knowledge** — should show **Active**
2. Test search directly:
   ```bash
   az search documents search \
     --service-name ai-search-swreq-prod \
     --index-name compliance_index \
     --search-text "test query"
   ```
3. Check embedding dimensions match (`text-embedding-3-large` = 3072-dim vectors)

**Fix:**
- Reindex using the refresh pipeline
- Check chunking settings (default 2048 token chunks)
- Verify documents were ingested (blob count in search diagnostics)

### 9.2 SharePoint Remote KB Returning Permission Errors

**Symptom:** Agent can query KB but some docs filtered out or "access denied"

**Diagnosis:**
- This is expected — remote KB respects SharePoint permissions
- Check agent's service principal has "Reader" role on target site

**Fix:**
- Grant service principal `Site Collection Reader` on SharePoint
- Or switch to **Indexed KB** for cross-user consistency

### 9.3 Bing Grounding Slow or Failing

**Symptom:** Web grounding queries timeout or return empty

**Diagnosis:**
1. Check network connectivity (Foundry agents need outbound HTTPS to bing.com)
2. Verify PII sanitization — Bing may reject malformed queries
3. Check query length (Bing has URL limits)

**Fix:**
- Simplify queries (remove verbose context)
- Check network egress firewall rules
- Test with `curl "https://www.bing.com/search?q=test"` from agent host

---

## 10. Related Documentation

- [Architecture Overview](architecture.md) — Multi-agent topology
- [Configuration Guide](configuration.md) — Foundry project setup
- [PII-Safe Grounding Lab](Hands-On-Lab-Jane-Doe-SOC2-PII-Safe-Grounding.md) — Query sanitization patterns
- [Azure AI Search Documentation](https://learn.microsoft.com/azure/search/)
- [Foundry Knowledge & Grounding](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/bing-grounding)

---

## 11. Recommendations Summary

| Scenario | Recommended Setup |
|---|---|
| **Production, compliance-critical** | SharePoint (Indexed) + AI Search + Bing fallback |
| **Pilot, low operational overhead** | SharePoint (Remote) + Bing grounding |
| **Vendor research at scale** | Separate indexed KB per domain + Bing web grounding |
| **PII-safe grounding** | Apply sanitization policy before Bing calls (Jane Doe pattern) |
| **Fastest time-to-value** | Remote KB + Bing grounding (no separate indexing) |
| **Best recall & ranking** | Indexed KB with semantic ranking enabled |

---

**Last Updated:** June 15, 2026  
**Version:** 1.0  
**Owner:** Solutions Architecture
