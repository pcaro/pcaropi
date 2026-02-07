---
description: Monitor and fix failing GitHub CI checks for current branch PR, waiting actively for running checks and fixing all failures in minimal commits
---

## Your Task

Monitor GitHub CI checks for the current branch's PR and fix any failures, minimizing the number of commits to reduce resource consumption.

## Process

### 1. Get PR and Check Status

```bash
# Get current branch PR
gh pr view --json number,url,title

# Get all checks with detailed status
gh pr checks --json name,state,bucket,completedAt,link,description
```

**Exit codes:**

- `0`: All checks passed
- `1`: Some checks failed
- `8`: Checks pending (still running)

### 2. Active Waiting for Running Checks

If checks are running (`bucket: "pending"`):

```bash
# Monitor every 5 seconds until complete
while true; do
  gh pr checks --json name,state,bucket,completedAt
  if [[ $? -ne 8 ]]; then
    break
  fi
  echo "Checks still running, waiting 5 seconds..."
  sleep 5
done
```

**IMPORTANT:** Do NOT proceed to fix failures until all checks finish running. Pushing changes restarts all checks, wasting resources.

### 3. Analyze Check Results

Categorize checks by status:

```bash
gh pr checks --json name,state,bucket,link,description
```

**Allowed to fail:**

- "Review Required" - This is the ONLY check we can ignore

**Must pass:**

- All other checks (CI, lint, typecheck, tests, deploy, etc.)

### 4. Investigate Failures

For EACH failed check (except "Review Required"):

1. **Get failure details:**

   ```bash
   # Get check logs/details from the link
   gh pr checks --web
   # Or view specific check details
   ```

2. **Understand the root cause:**
   - Read error messages completely
   - Check recent changes that might have caused this
   - Look at the specific files/lines mentioned

3. **Verify locally if possible:**
   - Run the same check locally (lint, typecheck, tests)
   - Reproduce the failure
   - Verify your fix works

### 5. Fix ALL Failures in ONE Commit

**CRITICAL:** Minimize commits to reduce CI resource consumption.

```
FOR all failed checks:
  1. Investigate failure cause
  2. Implement fix
  3. Verify fix locally
  4. Stage changes (git add)

AFTER all fixes are staged:
  1. Create single commit with all fixes
  2. Push once
  3. Wait for checks again
```

**Example workflow:**

```bash
# Fix lint errors
npm run lint:fix
git add .

# Fix typecheck errors
# ... make changes ...
git add affected-files.ts

# Fix test failures
# ... fix tests ...
git add test-files.test.ts

# Single commit with ALL fixes
git commit -m "Fix CI checks: lint errors, type errors, and test failures"
git push

# Now wait again for checks to complete
```

### 6. Iterate Until All Pass

```
REPEAT until all checks pass:
  1. Wait for all checks to complete (active polling every 5s)
  2. Check results
  3. If failures exist (except "Review Required"):
     - Fix ALL failures
     - Commit once
     - Push
     - Return to step 1
```

## Check Categories

### Pass Bucket

- State: `success`, `skipped`
- Bucket: `pass`, `skipping`
- Action: None needed

### Fail Bucket

- State: `failure`, `action_required`, `cancelled`
- Bucket: `fail`, `cancel`
- Action: Investigate and fix (except "Review Required")

### Pending Bucket

- State: `pending`, `queued`, `in_progress`, `waiting`
- Bucket: `pending`
- Action: Wait actively (poll every 5 seconds)

## Common Check Types and Fixes

| Check Type | Common Issues         | Typical Fix                        |
| ---------- | --------------------- | ---------------------------------- |
| Lint       | Code style violations | `npm run lint:fix` or manual fixes |
| Typecheck  | Type errors           | Fix type annotations, imports      |
| Tests      | Test failures         | Fix broken code or update tests    |
| Build      | Compilation errors    | Fix syntax, missing deps           |
| Deploy     | Deployment failures   | Check config, env vars             |

## Output Format

Present status clearly:

```markdown
## PR CI Checks Status

**PR**: #<number> - <title>
**URL**: <url>

### Running Checks (waiting...)

- Check Name 1 (started Xm ago)
- Check Name 2 (started Xm ago)

[Polling every 5 seconds...]

---

### Failed Checks (requires fixes)

1. **Check Name**: <failure reason>
   - Link: <url>
   - Fix: <what needs to be done>

### Passing Checks

- Check Name 1 ✓
- Check Name 2 ✓

### Ignored Checks

- Review Required (allowed to fail)
```

## Quality Standards

- **Wait for ALL checks** before fixing - don't push while checks are running
- **Fix ALL failures at once** - single commit for all fixes
- **Verify locally first** - don't guess, test your fixes
- **Read error messages completely** - they often contain the solution
- **Minimize pushes** - each push restarts all CI checks

## Workflow Example

```bash
# 1. Check status
gh pr checks --json name,state,bucket

# 2. Some checks running? Wait actively
while [[ $(gh pr checks 2>&1; echo $?) -eq 8 ]]; do
  echo "Waiting for checks..."
  sleep 5
done

# 3. Get failures
gh pr checks --json name,state,bucket,link | jq -r '.[] | select(.bucket=="fail") | .name'

# 4. Fix all locally
npm run lint:fix
npm run typecheck
npm test

# 5. Single commit
git add .
git commit -m "Fix CI: lint, typecheck, and test errors"
git push

# 6. Wait again and verify
while [[ $(gh pr checks 2>&1; echo $?) -eq 8 ]]; do
  sleep 5
done
gh pr checks
```

## Remember

- **Active waiting:** Check every 5 seconds when pending
- **Single commit:** Fix everything at once
- **Verify locally:** Test before pushing
- **Only exception:** "Review Required" can fail
- **Minimize CI runs:** Don't push while checks are running
