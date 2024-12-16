![Eventua11y](https://github.com/mattobee/eventua11y/assets/3172945/a1cc64a6-c3f8-465a-b88f-e5f8524c3edd)

# Eventua11y.com

[![Netlify Status](https://api.netlify.com/api/v1/badges/147b62a2-2d05-4693-a42f-9f675c3c478d/deploy-status)](https://app.netlify.com/sites/eventua11y/deploys)

## Contributing

See the [contributing guide](CONTRIBUTING.md) for ways to get involved in this project, including some that don't require you to write a single line of code.

## Technology

This website is built using [Astro](https://astro.build/) and [Vue](https://vuejs.org/).

Pages are built using a combination of Astro and Vue components. The Vue components are hydrated client-side for interactivity.

The events are stored in a [Sanity](https://sanity.io/) real-time database, edited in [Sanity Studio](https://github.com/eventua11y/eventua11y-sanity).

The website is hosted by [Netlify](https://www.netlify.com/). Changes pushed to the main branch in GitHub are automatically built and deployed by Netlify. Branches are deployed to temporary URLs for previewing changes before they go live.

Netlify edge functions pull events from Sanity and apply localization to the dates.
