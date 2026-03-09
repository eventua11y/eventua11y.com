/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { User, Session } from '@supabase/supabase-js';

declare namespace App {
  interface Locals {
    user: User | null;
    session: Session | null;
  }
}
