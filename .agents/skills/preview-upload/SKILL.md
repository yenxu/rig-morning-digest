---
name: preview-upload
description: Save a rig page as one HTML file, put it on the public preview host (Netlify) for a reviewer, and later upload it again without the lane marker. Use for a plan's "Preview for review" and "Clean up" issues.
---

# preview-upload

ADR 0003 is the rule; this is how. Host: Netlify, site `tubular-maamoul-60aa13`, public link
`https://tubular-maamoul-60aa13.netlify.app`. Upload folder: one folder outside the repo holding
only `index.html` (on Yen's Mac: `~/github/rig-preview`).

## Ask first

Every upload is public. Before each one, tell the human what goes up, where, who can see it, and
how to undo it, then wait for a yes.

## 1. Save the page (a command, not "save as")

```sh
PORT=8791 pnpm start &                      # LANE_MARKER from .env
curl -sf localhost:8791/digest/<night> -o <upload-folder>/index.html
kill %1
grep -c '<script' <upload-folder>/index.html   # must be 0 (ADR 0001)
```

Never save it inside the repo, an issue or a chat attachment.

## 2. Upload

```sh
netlify status                               # signed in, linked to the site above
netlify deploy --prod --dir <upload-folder>
```

Give the reviewer the site link, never the `<hash>--site.netlify.app` deploy link: that one
never changes, so its marker can't be taken off.

## 3. Check the link from outside

Open the site link without a login (private window or `curl -s -o /dev/null -w '%{http_code}'`).
Anything but 200 with the page is not sent. A sandbox that can't reach `netlify.app` can't check:
ask the human to.

## 4. Wait for the review

The preview issue stays open after the link is sent. Comment what it waits on. Close it only when
the reviewer has looked. The clean-up issue is blocked by that.

## 5. Clean up (after the review)

Save the page again with the marker unset, upload over the same site, then delete the first
deploy so its hash link is gone too:

```sh
LANE_MARKER= PORT=8791 pnpm start &         # banner reads "no marker set"
curl -sf localhost:8791/digest/<night> -o <upload-folder>/index.html; kill %1
netlify deploy --prod --dir <upload-folder>
netlify api listSiteDeploys --data '{"site_id":"<site id>"}'   # find the old deploy id
netlify api deleteDeploy --data '{"deploy_id":"<old id>"}'
```

Done when the site link and the old deploy link no longer show the marker.
