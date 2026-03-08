

# Fix Balance to $119

The current balance in the database is `$100,019.24`. The user wants it set to `$119`.

## Plan
Run a single SQL migration to update the `global_trading_account` row:
```sql
UPDATE global_trading_account
SET balance = 119, equity = 119
WHERE id = '00000000-0000-0000-0000-000000000001';
```

No code changes needed — the dashboard already reads `account.balance` directly.

