# AKShare Sync Worker

This worker runs in GitHub Actions and writes shared market/fund data to Supabase with the service role key.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Fund-specific tasks accept `--fund-codes`. If omitted, the worker queries active
tracked funds from Supabase `user_tracked_funds`.

Examples:

```bash
python -m akshare_sync sync-fund-basic --fund-codes 000001,161725
python -m akshare_sync sync-latest-nav
python -m akshare_sync sync-a-share-quotes
```
