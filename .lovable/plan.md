

# Fix: Syntax error in `supabase/functions/_shared/settings.ts`

## Problem
The `AiSettings` interface is split in two — the closing brace `}` on line 17 ends the interface prematurely, leaving the IA2 fields (lines 18-22) as orphaned statements outside any block. The second `}` on line 23 is then unexpected, causing the Deno bundler to fail with "Expression expected at line 23".

## Fix (single file, single change)

**File:** `supabase/functions/_shared/settings.ts`

Remove the premature closing brace on line 17 and the comment on line 18, merging both halves into one interface:

```typescript
export interface AiSettings {
  providerPrimary: string;
  modelPrimary: string;
  quatarlyApiUrl: string;
  allowGoogleFallback: boolean;
  googleDirectEnabled: boolean;
  googleDirectModel: string;
  preferredLanguage: string;
  maxImageBytes: number;
  // IA2 additions
  googleDirectMaxRequestsPerDay: number;
  ollamaEnabled: boolean;
  ollamaBaseUrl: string;
  ollamaDefaultModel: string;
}
```

## After the fix
Re-run on the VM:
```
supabase functions deploy ai-provider-dispatch --debug --project-ref iqfmxyyrgqnlvfyvrxph
```

## Scope
- Only `settings.ts` is modified (1 line removed).
- No change to `ai-extract-rows`, `ai-provider-dispatch`, or the ballistic engine.

