/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    staticEventListLoaded?: boolean;
    eventDetailLoaded?: boolean;
  }
}
