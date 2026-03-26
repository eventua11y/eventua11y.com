/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { User } from '@supabase/supabase-js';

declare namespace App {
  interface Locals {
    user: User | null;
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Server-only env vars accessed via process.env at runtime (not import.meta.env).
// Declared here for documentation; these are NOT available client-side.
declare namespace NodeJS {
  interface ProcessEnv {
    SUPABASE_SERVICE_ROLE_KEY?: string;
  }
}
