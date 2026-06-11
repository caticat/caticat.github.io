# Architecture

This project is a static personal homepage. It runs behind an Nginx container exposed on port 80 and does not require a backend for the current feature set.

## Current Features

- Personal homepage shell with title, subtitle, and navigation links.
- Configurable Live2D model loaded from local static assets.
- Hiyori Momose sample model bundled under `public/assets/live2d/hiyori/`.
- Local Live2D runtime dependencies bundled under `public/vendor/live2d-runtime/`.
- Random dialogue bubble shown on page load and model tap.
- Docker Compose based local preview.
- Attribution footer for the active Live2D model.

## Runtime Flow

1. `index.html` loads `src/main.js` as an ES module.
2. `src/main.js` reads site, Live2D, and assistant configuration.
3. The profile content and footer are rendered from config.
4. `Live2DStage.js` loads local runtime scripts in order:
   - Pixi.js
   - Live2D Cubism Core
   - pixi-live2d-display Cubism4 bundle
5. The active model is loaded from `live2d.config.js`.
6. The model is scaled relative to the canvas height using `viewportHeightRatio`.
7. Tapping the model plays the configured tap motion and asks the dialogue provider for a reply.

## Directory Layout

```text
.
  Dockerfile
  docker-compose.yml
  nginx.conf
  index.html
  docs/
    architecture.md
    tasks.md
  public/
    assets/
      live2d/
        hiyori/
          runtime/
    vendor/
      live2d-runtime/
  src/
    config/
      assistant.config.js
      live2d.config.js
      site.config.js
    features/
      assistant/
      live2d/
    styles/
      main.css
    main.js
```

## Directory Responsibilities

`Dockerfile` builds the static Nginx image. It copies the page, source modules, public assets, and documentation into the container image.

`docker-compose.yml` defines the local preview service. It builds the image and exposes the container's Nginx port on host port 80.

`nginx.conf` configures the static web server. It serves normal files directly and falls back to `index.html` for page routes.

`index.html` is the only HTML entry point. It declares the page shell, canvas, dialogue bubble, footer, stylesheet, and module script.

`docs/` stores project documentation. `architecture.md` describes how the project is organized, and `tasks.md` tracks implementation tasks.

`public/assets/live2d/` stores Live2D model assets. These are character-specific files such as `model3.json`, `.moc3`, textures, motions, physics, and model readme files.

`public/vendor/live2d-runtime/` stores third-party runtime libraries needed to render Live2D in the browser. These files are not project business code:

- `pixi.min.js`: PixiJS rendering library.
- `live2dcubismcore.min.js`: official Live2D Cubism Core runtime.
- `cubism4.min.js`: `pixi-live2d-display` Cubism4 bundle that connects PixiJS and Cubism Core.

`src/config/` keeps replaceable project settings. Site copy, model selection, model placement, motion names, attribution, and dialogue text live here instead of being hard-coded in feature code.

`src/features/live2d/` owns model rendering. `Live2DStage.js` loads the runtime scripts, creates the Pixi application, loads the active model, sizes it, and wires tap events.

`src/features/assistant/` owns dialogue behavior. The current provider returns random configured messages, and future AI providers should fit behind the same interface.

`src/styles/main.css` contains the page layout and visual styling.

`src/main.js` is the browser entry module. It connects config, rendering, dialogue, and DOM updates.

## Configuration

`src/config/site.config.js` controls homepage copy and navigation links.

`src/config/live2d.config.js` controls the active Live2D model:

- `activeModelId`: selects the current model.
- `modelJsonPath`: points to the model's `model3.json`.
- `viewportHeightRatio`: controls visible model height relative to the canvas.
- `position`: controls model anchor position in the canvas.
- `motions`: maps UI triggers to model motion groups.
- `attribution`: drives the footer text.

`src/config/assistant.config.js` stores dialogue text grouped by trigger. The current provider picks a random message from the trigger group.

## Model Replacement

The model is intentionally selected through configuration instead of being hard-coded into rendering logic.

To replace the model:

1. Add the new model runtime files under `public/assets/live2d/<model-id>/`.
2. Add a new entry to `live2dConfig.models`.
3. Point `activeModelId` to the new model id.
4. Update motion group names to match the new model's `model3.json`.
5. Tune `viewportHeightRatio` and `position`.

The page should not need changes outside configuration unless the new model requires a different runtime version.

## Assistant Layer

The current assistant layer is deliberately small:

- `randomDialogueProvider.js` returns random configured messages.
- The page calls `reply({ trigger })` without knowing how the reply is produced.

This keeps the later AI integration path simple. A future AI provider can implement the same `reply` shape while adding API calls, streaming, caching, or backend proxying.

## Backend Decision

No backend is needed for the current static page, Live2D rendering, and random dialogue.

A backend or serverless function becomes useful when:

- an AI API key must be hidden;
- requests need rate limiting or logging;
- conversation memory needs storage;
- multiple AI providers need centralized routing.

Until then, the project stays static and is served by the Nginx container.

## Deployment

The two repositories have separate responsibilities:

- `caticat/live2d-companion-page`: source code, model assets, documentation, and Docker-based local preview.
- `caticat/caticat.github.io`: GitHub Pages deployment controller.

The Pages workflow checks out the source repository and publishes only
`index.html`, `src/`, `public/`, and `docs/`. Docker and Nginx files are not part
of the GitHub Pages artifact.

The deployment workflow can be started manually, by a repository dispatch
event, or by its hourly schedule. The source repository includes an optional
dispatch workflow that uses the `PAGES_DEPLOY_TOKEN` secret for immediate
deployment after a push. Without that secret, the scheduled deployment remains
the fallback.

## Asset Policy

The original downloaded zip is not used at runtime and is ignored by `.gitignore`.

The repo keeps:

- extracted Live2D runtime assets required by the browser;
- the model `ReadMe.txt` for attribution and license context;
- local vendor runtime scripts so the page does not depend on a CDN.
