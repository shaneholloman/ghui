# ghui

Minimal terminal UI for browsing and acting on your GitHub pull requests.

## Requirements

- `bun`
- `gh` authenticated with GitHub
- macOS `open` and `pbcopy` for browser and clipboard actions

## Install

```bash
bun install
bun link
```

Then run `ghui` from anywhere.

## Configuration

- `GHUI_REPOS`: comma-separated list of repos to query
- `GHUI_AUTHOR`: author passed to `gh pr list`, defaults to `@me`
- `GHUI_PR_FETCH_LIMIT`: max PRs fetched per repo, defaults to `200`

Default repos:

- `anomalyco/opencode`
- `Effect-TS/effect-smol`
- `anomalyco/opencode-console`

## Commands

```bash
bun run dev
bun run typecheck
```

## Keybindings

- `up` / `down`: move selection
- `[` / `]`: jump between repos
- `/`: filter
- `r`: refresh
- `d`: toggle draft
- `b`: toggle `beta` label
- `o`: open PR in browser
- `y`: copy PR metadata
- `q`: quit
