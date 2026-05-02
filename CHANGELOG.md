# @kitlangton/ghui

## 0.1.20

### Patch Changes

- 6457403: Add a searchable command palette for running ghui actions from one modal.
- 6457403: Add a command palette backed by a shared command registry and route core app actions through it.
- 180ada0: Prefetch pull request details around the current selection so adjacent navigation feels faster, and have `bun dev` send telemetry to the local motel port by default.
- 6457403: Load pull request diffs through the paginated GitHub files API so large PRs over 300 files render completely, and add `GHUI_REPO` for browsing open PRs in a specific repository.
- 712ed04: Load pull request lists in cursor-paged batches so large repositories open quickly, with a visible load-more footer and command. Keep PR detail loading placeholders out of scroll views while details hydrate.
- 6457403: Polish the command palette and pull request details preview: keep palette navigation stable, hide its scrollbar, allow paging through long descriptions, and stop showing a placeholder when a PR has no labels.
- 8426732: Add a command palette action for opening arbitrary repositories at runtime.
- c8fa2cd: Fix pull request diff races so large PRs do not briefly show another PR's file list, make fullscreen details scroll through long summaries, keep cached details loaded across refreshes, and enable shell syntax highlighting for `.sh`, `.bash`, `.zsh`, `.ksh`, and `.bats` diffs.
- 6457403: Add a System theme that uses the terminal foreground, background, selection, and ANSI palette colors.
