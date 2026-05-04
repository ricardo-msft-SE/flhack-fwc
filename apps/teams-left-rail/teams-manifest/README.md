# Teams Manifest Packaging

1. Update placeholders in `manifest.json`:
- `<app-service-hostname>` with your deployed app host.
- `<entra-app-client-id>` with your Entra app registration client ID.

2. Keep tenant context aligned with this project:
- Azure tenant ID: `ecb61531-f7e1-4390-9633-9213f6c9c05c`

3. Zip these files at the root of the zip:
- `manifest.json`
- `color.png`
- `outline.png`

4. Upload the zip in Teams Admin Center or Teams client app catalog.
