![Eventua11y](https://github.com/mattobee/eventua11y/assets/3172945/a1cc64a6-c3f8-465a-b88f-e5f8524c3edd)

# Eventua11y.com

[![Netlify Status](https://api.netlify.com/api/v1/badges/147b62a2-2d05-4693-a42f-9f675c3c478d/deploy-status)](https://app.netlify.com/sites/eventua11y/deploys)

## Contributing

See the [contributing guide](CONTRIBUTING.md) for ways to get involved in this project, including some that don't require you to write a single line of code.

## Technology

This website is built using [Eleventy](https://www.11ty.dev/), which is a static site generator. This means that instead of waiting until a page is requested by a visitor and then building it on demand, the pages are all built in advance so that they are ready to serve ahead of time.

Page templates are written in the [Liquid](https://github.com/Shopify/liquid) templating language, which is then transformed into HTML.

The events themselves are stored in a [Sanity](https://sanity.io/) real-time database, edited in [Sanity Studio](https://github.com/eventua11y/eventua11y-sanity).

The website is hosted by [Netlify](https://www.netlify.com/). Whenever changes are pushed to the main branch in GitHub, Netlify builds and deploys the changes automatically. Branches are also deployed temporarily for testing purposes.

Netlify edge functions pull events from Sanity and apply localisation to the dates, which means that visitors should see a list of events that is appropriate for their locale and timezone.

