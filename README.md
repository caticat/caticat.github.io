# Live2D Companion Page

A static personal homepage with a configurable Live2D companion and a simple dialogue layer that can later be replaced by an AI provider.

## Run

Debug and preview through Docker Compose:

```bash
docker compose up --build -d
```

Open:

```text
http://localhost/
```

Stop:

```bash
docker compose down
```

## Documentation

- [Architecture](docs/architecture.md)
- [Task checklist](docs/tasks.md)

## GitHub Pages

The source of truth is this repository. The `caticat/caticat.github.io`
repository contains the GitHub Pages workflow and publishes these directories:

```text
index.html
notes.html
404.html
src/
public/
docs/
```

The Pages repository checks for source updates every hour and also supports
manual deployment. For immediate deployment after each push, add a fine-grained
`PAGES_DEPLOY_TOKEN` repository secret with access to dispatch workflows in
`caticat/caticat.github.io`.
