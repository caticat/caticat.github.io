# Project TODO

Status values:

- `[x]` completed
- `[-]` implemented but waiting for external verification or user action
- `[ ]` not started

## Phase 1: Security and deployment

- [-] Rotate or revoke credentials exposed by the legacy Hexo repository.
  - Repository cleanup can reduce accidental reuse, but cannot make leaked credentials safe again.
  - Revoke the old LeanCloud credentials in the LeanCloud console.
  - Revoke or regenerate the old GitHub OAuth application secret used by Gitalk.
- [x] Remove legacy deployment automation and credentials from the latest `source` branch state.
- [x] Keep the legacy Hexo source only as an archived `source` branch.
- [x] Use `caticat/live2d-companion-page` as the source repository.
- [x] Use `caticat/caticat.github.io` as the generated GitHub Pages repository.
- [x] Synchronize the static site from the source repository every hour.
- [-] Configure `PAGES_DEPLOY_TOKEN` for immediate cross-repository deployment.
  - Until configured, scheduled and manual deployment remain available.

## Phase 2: Notes

- [x] Add a local Markdown viewer.
- [x] Render Markdown with a vendored parser instead of opening raw `.md` files.
- [x] Point the homepage Notes link to the local viewer.
- [x] Keep Markdown files under `docs/` as the content source.
- [x] Verify Notes locally through Docker and on GitHub Pages.

## Phase 3: Site basics

- [x] Add favicon assets and browser metadata.
- [x] Add description and Open Graph metadata.
- [x] Add a static `404.html`.
- [x] Verify desktop and mobile layouts.
- [x] Add cache rules appropriate for HTML, source modules, and model assets.

## Phase 4: Live2D interaction

- [x] Add configurable idle dialogue intervals.
- [x] Add dialogue visibility duration and fade-out behavior.
- [x] Pause idle dialogue while the page is hidden.
- [ ] Add pointer tracking only if it does not interfere with model motions.
- [x] Keep all interaction timing and motion mappings in config.

## Phase 5: AI provider

- [x] Define a provider interface shared by random and AI dialogue providers.
- [x] Keep the random provider as the offline fallback.
- [x] Cancel stale provider requests when a newer interaction starts.
- [ ] Decide on a serverless or backend proxy before using an API key.
- [ ] Do not expose AI provider secrets in browser code.
- [ ] Add timeout, rate-limit, and failure fallback behavior with the real AI provider.

## Release checklist

- [x] Run and verify through `docker compose up --build -d`.
- [x] Confirm no browser console errors.
- [-] Confirm Live2D model, motions, and dialogue work.
  - Model loading and dialogue are verified.
  - Motion regression remains part of final manual review.
- [x] Confirm Notes renders without downloading files.
- [x] Confirm `https://caticat.github.io/` serves the latest source commit.
- [x] Update architecture documentation when responsibilities change.
