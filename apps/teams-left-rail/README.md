# Teams Left-Rail Implementation (MVP)

This folder contains the initial implementation for a Microsoft Teams left-rail software request app.

## Included in this MVP

- Teams-manifest package scaffold for personal app installation in the left rail.
- Adaptive-card intake UI (software name/version, vendor, justification, licenses, requester fields).
- TypeScript backend API for request submission, status tracking, report retrieval, and in-app approval action.
- Live Foundry invocation integration using Azure token authentication (`https://ai.azure.com/.default`).
- Visually styled HTML report rendering endpoint.

## Azure tenant

This implementation is preconfigured for:

- `AZURE_TENANT_ID=ecb61531-f7e1-4390-9633-9213f6c9c05c`

Set values in `.env.example` and copy to your local env setup.

Required Foundry settings:

- `FOUNDRY_PROJECT_ENDPOINT` + `FOUNDRY_AGENT_ID`, or direct `FOUNDRY_INVOKE_URL`
- `FOUNDRY_API_VERSION` (default: `2025-05-01-preview`)

Auth options:

- Preferred for production: managed identity / workload identity (`DefaultAzureCredential`)
- Local fallback: `AZURE_CLIENT_ID` + `AZURE_CLIENT_SECRET` + `AZURE_TENANT_ID`

## Local run

```powershell
cd apps/teams-left-rail
npm install
npm run dev
```

Open `http://localhost:3979`.

## Build and start

```powershell
cd apps/teams-left-rail
npm run build
npm start
```

## Teams manifest packaging

1. Update placeholders in [teams-manifest/manifest.json](teams-manifest/manifest.json).
2. Zip the contents of `teams-manifest/` at zip root:
- `manifest.json`
- `color.png`
- `outline.png`
3. Upload in Teams app catalog.

## Azure Deployment

### Deployed Instance (West Central US)

The MVP is deployed to:

- **URL:** `https://app-flhack-swreq-wcu.azurewebsites.net`
- **Resource Group:** `rg-flhack-swreq-westcentralus`
- **App Service Plan:** `asp-flhack-swreq-wcu` (F1 Free, Node.js 22 LTS, Linux)
- **Subscription:** `ee0073ce-de38-45ed-a940-4dbfd9435dc1`

Update Teams manifest `validDomains` and tab URLs to use this hostname.

### Environment Configuration

When deployed to App Service, configure these app settings:

```
AZURE_TENANT_ID=ecb61531-f7e1-4390-9633-9213f6c9c05c
FOUNDRY_PROJECT_ENDPOINT=https://your-foundry-project.ai.azure.com
FOUNDRY_AGENT_ID=your-agent-id
```

Or use managed identity + Key Vault references for secrets.

## Next implementation step

Persist generated HTML reports in Azure Blob Storage and attach immutable artifact URLs for approval surfaces.
