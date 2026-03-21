---
description: Create a pull request for the current branch with proper description and validation
---

## Your Task

**Primary function: Create a GitHub pull request for the current branch.**

Push the current branch to remote and create a PR with a comprehensive description that follows repository standards. Validate the creation and provide the PR URL.

## Process

### 1. Gather Branch Information

Get current branch and recent commits:

```bash
# Get current branch
git branch --show-current

# Get recent commits for context
git log --oneline -10

# Check git status
git status
```

**Required information:**

- Branch name
- Recent commit messages (last 10)
- Any uncommitted changes (should commit first)

### 2. Push to Remote

```bash
# Push current branch to remote
git push -u origin <branch-name>
```

**If branch doesn't exist on remote:**

- Use `-u` flag to set upstream
- Track the branch for future pushes

**If remote name is not `origin`:**

```bash
# List remotes
git remote -v

# Use actual remote name (e.g., upstream, origin)
git push -u <remote-name> <branch-name>
```

### 3. Generate PR Description

Create a structured PR description following this template:

```markdown
## Summary

[Brief description of changes - 1-2 sentences]

## Changes

### Core Changes

- [List main features/fixes implemented]
- [Brief explanation of each]

### Related Changes

- [Supporting changes, refactoring, etc.]
- [Why these were necessary]

### Files Changed

- [List key files modified]
- [Explain significance]

## Testing

- [ ] Tests pass locally
- [ ] Manual testing performed (if applicable)
- [ ] Edge cases considered
- [ ] Documentation updated (if needed)

## Notes

[Any additional context for reviewers]

- Why these changes were made
- Potential impact
- Future work (if relevant)
```

### 4. Create Pull Request

```bash
# Create PR with title and body
gh pr create \
  --title "[DESCRIPTIVE TITLE]" \
  --body "$(cat <<'EOF'
[PR description from step 3]
EOF
)"
```

**Title guidelines:**

- Start with verb (Add, Fix, Refactor, Update)
- Be specific but concise
- No emojis
- Example: "Add user authentication middleware"

**If PR already exists:**

```bash
# Check if PR already exists
gh pr view --json number,title

# If exists, provide URL instead of creating
# URL format: https://github.com/{owner}/{repo}/pull/{number}
```

### 5. Validate Creation

```bash
# Verify PR was created
gh pr view --json number,title,url
```

**Confirm:**

- PR number assigned
- Title is correct
- URL is accessible
- Description renders properly

### 6. Present Results

Present to Pablo:

```markdown
## Pull Request Created

**PR**: #[number] - [title]
**URL**: https://github.com/{owner}/{repo}/pull/{number}
**Branch**: [branch-name]

Ready for review.
```

## Quality Standards

- **Push first** - ensure remote branch exists
- **Clear title** - descriptive and action-oriented
- **Structured description** - easy to scan
- **Comprehensive changes** - explain what, why, how
- **Testing noted** - confirm validation steps
- **No emojis** - professional tone
- **Link provided** - make it easy to access

## Common Issues

**Branch already has PR:**

- Check with `gh pr view`
- Provide existing PR URL
- Don't create duplicate PRs

**Push rejected:**

```bash
# If remote has changes
git pull --rebase origin <branch-name>
git push origin <branch-name>

# If force push needed (use carefully)
git push --force-with-lease origin <branch-name>
```

**No remote tracking:**

```bash
# Set upstream explicitly
git push -u origin <branch-name>
```

## Remember

- Always push before creating PR
- Use gh CLI for consistent workflow
- Provide PR URL immediately after creation
- Make description scannable (bullets, sections)
- Focus on changes, not implementation details
- Include testing confirmation
