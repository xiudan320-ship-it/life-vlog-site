# Supabase to Cloudflare D1 migration

Current status:

- R2 is used for new media uploads.
- This worker now contains the D1/auth foundation.
- D1 creation is blocked until the Cloudflare API token includes D1 edit permissions.

Required Cloudflare API token permissions:

- Account > D1 > Edit
- Account > Workers Scripts > Edit
- Account > Workers Routes > Edit
- Account > Workers R2 Storage > Edit

After permissions are fixed:

```powershell
$env:CLOUDFLARE_API_TOKEN=(Get-Content -Raw ..\cloudfileToken.txt).Trim()
pnpm dlx wrangler@latest d1 create life-vlog-db
```

Copy the returned `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "life-vlog-db"
database_id = "..."
```

Then apply the schema:

```powershell
pnpm dlx wrangler@latest d1 execute life-vlog-db --file ./schema.d1.sql --remote
pnpm dlx wrangler@latest deploy
```
