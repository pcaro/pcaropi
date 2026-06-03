# gw - Git Worktree Manager

Helper for managing git worktrees. Wraps `git worktree` with ergonomic commands for creating, reviewing, removing, and navigating between worktrees.

## Setup

```bash
source ~/.gw.sh
```

## Commands

### `gw create <name> [dir] [--stay]`

Create a new worktree from a new branch named `<name>`. By default, the branch is created from the current branch and the shell changes directory into the new worktree.

```bash
gw create feature-x          # Create branch "feature-x", cd into it
gw create bugfix ../bugfix   # Create at custom path
gw create feat --stay        # Create but don't cd
```

Options:
- `dir`: Custom directory path for the worktree (default: `../<name>`)
- `--stay`: Don't change directory after creation

### `gw review <name> [--stay]`

Create a worktree from an **existing** branch `<name>`. Useful for reviewing PRs or inspecting a branch without leaving your current context.

```bash
gw review pr-42             # Create worktree for branch "pr-42", cd into it
gw review pr-42 --stay      # Create but don't cd
```

Options:
- `--stay`: Don't change directory after creation

### `gw rm <name> [--keep-branch]`

Remove a worktree by branch `<name>`. By default, also deletes the associated branch.

```bash
gw rm feature-x             # Remove worktree and delete branch
gw rm feature-x --keep-branch  # Remove worktree, keep the branch
```

Options:
- `--keep-branch`: Remove the worktree but preserve the branch

### `gw cd [name]`

Navigate to a worktree or repo root.

```bash
gw cd feature-x             # Cd into the "feature-x" worktree
gw cd                       # Cd to the main repo root
```

### `gw list`

List all worktrees with their branches and paths.

```bash
gw list
```

### `gw clean`

Remove **all** worktrees (and their branches). Destructive — use with caution.

```bash
gw clean
```

## Common Workflows

### Starting a new feature

```bash
gw create my-feature
# Now in ~/repo/my-feature, branch "my-feature" checked out
```

### Reviewing a PR

```bash
gh pr checkout 42           # Create local branch from PR
cd /path/to/main/repo
gw review pr-42             # Open worktree to inspect
# ... review code ...
gw rm pr-42                 # Clean up when done
```

### Cleaning up stale worktrees

```bash
gw list                     # See what's around
gw rm stale-branch          # Remove individually
gw clean                    # Or nuke everything at once
```

## Gotchas

- The script relies on `cd` to navigate, so it must be **sourced** (`source ~/.gw.sh`), not executed.
- Worktrees share the same `.git` directory — be careful with `git reset --hard`, rebases, etc. in one worktree while another has uncommitted changes.
- `gw clean` is destructive and removes all worktrees. Use `gw list` first to check what will be deleted.
