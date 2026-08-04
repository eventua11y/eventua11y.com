---
title: Get Events API
status: released
tags:
  - sanity
sort: a1
uid: ea63f52402
---

Netlify edge function at `/api/get-events` that fetches parent and child events from Sanity, classifies them into today/future/past, and caches the response for 5 minutes with stale-while-revalidate.
