# AKShare Sync Worker

This worker runs in GitHub Actions and writes shared market/fund data to Supabase with the service role key.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional environment variables:

- `FUND_CODES`: comma-separated fund codes, for example `000001,161725,006327`

Examples:

```bash
python -m akshare_sync sync-fund-basic --fund-codes 000001,161725
python -m akshare_sync sync-latest-nav
python -m akshare_sync sync-a-share-quotes
```
