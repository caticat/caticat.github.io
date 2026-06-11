# Task Checklist

## Completed in the first pass

- Create a static frontend shell.
- Extract Hiyori runtime assets into `public/assets/live2d/hiyori/`.
- Keep the source zip out of the runtime path.
- Put the active Live2D model in `src/config/live2d.config.js`.
- Add a random dialogue provider that can later be replaced by an AI provider.
- Add a footer attribution block for the active model.
- Add Docker Compose based static serving for local debugging.
- Document the current architecture and runtime flow.

## Next implementation tasks

- Verify the Live2D runtime through `docker compose up --build`.
- Tune Hiyori scale and position after visual inspection.
- Add an AI provider behind the same assistant interface.
- Keep debugging and preview commands containerized.
