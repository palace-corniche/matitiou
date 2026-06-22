# Plan: Full System Documentation Dump

Produce a complete 23-section reconstruction document for this trading system, delivered as a single (very long) chat response.

## What I'll do

1. **Inventory pass** (parallel reads):
   - Full file tree of `src/` and `supabase/functions/`
   - `package.json`, `supabase/config.toml`, `.env` keys
   - All ~80 edge function `index.ts` files
   - All `src/pages/`, `src/hooks/`, `src/services/`, `src/components/` files
   - All migrations / RPC definitions
2. **Database pass** (parallel queries via `supabase--read_query`):
   - `information_schema.columns` for every public table (columns, types, nullability, defaults)
   - `pg_policies` for all RLS policies
   - `pg_indexes` for indexes
   - `pg_trigger` + `pg_proc` for triggers and functions
   - `cron.job` for scheduled jobs
3. **Assemble the response** following the user's exact 23-section template:
   - Section 1: Project identity
   - Section 2: Full file tree (every file, no `...`)
   - Section 3: Every table — columns, RLS, policies, indexes, triggers
   - Section 4: Every edge function — purpose, I/O, tables touched, full code
   - Section 5: All cron jobs with SQL
   - Section 6: Every React component — props, state, hooks, queries
   - Section 7: Every custom hook — full code
   - Section 8: Signal generation, indicators, risk management, backtesting logic
   - Section 9: External APIs (Alpha Vantage, Telegram, etc.)
   - Section 10: Realtime subscriptions
   - Section 11: Auth (currently none — will mark accordingly)
   - Section 12: State management (TanStack Query usage)
   - Section 13: Env vars & secrets table
   - Section 14: Pages & routing
   - Section 15: Charting components
   - Section 16: Notifications & alerts (Telegram pipeline)
   - Section 17: All Postgres RPCs with full SQL
   - Section 18: Known bugs / incomplete features (from `*_REPORT.md` files)
   - Section 19: Recent changes (Telegram-notification fix across 4 exit functions)
   - Section 20: Full `package.json`
   - Section 21: Performance notes
   - Section 22: Position/portfolio state model
   - Section 23: Final "SYSTEM RECONSTRUCTION CONTEXT" block

## Constraints / expectations

- This is **read-only**; no files edited, no functions deployed.
- The response will be **very long** — likely split across multiple chat messages if it exceeds a single response budget. I'll note continuation points clearly.
- Code blocks for files >200 lines will be pasted in full per the user's spec, but I'll skip pasting auto-generated files (`src/integrations/supabase/types.ts`, `client.ts`) and only reference them.
- Estimated work: ~40–60 parallel read tool calls before writing the final answer.
- No code changes, no schema changes, no deploys.

## Deliverable

A single exhaustive markdown document in chat covering all 23 sections, ending with the "=== SYSTEM RECONSTRUCTION CONTEXT ===" handoff block ready to paste into a fresh AI session.
