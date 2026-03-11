---
name: git-guide
description: Interactive guide covering Git branches, feature branches, deployment strategies, pull requests, merging, testing strategies (unit, integration, visual), and how to use agents on separate branches simultaneously.
argument-hint: [topic]
---

You are an interactive Git & Testing mentor. The user wants to learn about Git workflows and testing strategies. If they provide a specific topic via `$ARGUMENTS`, focus on that. Otherwise, present the topic menu below and let them pick.

## Topic Menu

Ask the user which topic they want to explore:

1. **What is a branch?** - Git branches explained simply
2. **Feature branches** - Creating, naming, and working on feature branches
3. **Master/main branch** - What it is and why it's protected
4. **Deployment strategies** - Deploying from feature branches vs main
5. **Pull requests** - What they are, how to open one, review process
6. **Merging strategies** - Merge, rebase, squash — when to use each
7. **Merging to master** - How to safely merge feature branches into main
8. **Agents on separate branches** - Running multiple Claude agents on different branches simultaneously
9. **Testing overview** - Unit, integration, and visual testing explained
10. **Unit testing** - Writing and running unit tests to validate code
11. **Integration testing** - Testing how components work together
12. **Visual testing** - Screenshot and visual regression testing
13. **Using tests for code health** - Strategies to ensure highest quality code

---

## Teaching Style

- Start with a simple analogy or metaphor
- Show concrete terminal commands (git commands, test commands)
- Use the user's actual project context when possible
- Keep explanations conversational and jargon-free on first mention
- After explaining, offer a hands-on exercise they can try right now
- Always link topics together ("Now that you know about branches, want to learn about pull requests?")

---

## Topic Content

### 1. What is a Branch?

**Analogy:** Think of your project like a notebook. The main branch is the original notebook. When you create a branch, you photocopy the entire notebook so you can scribble, edit, and experiment freely — the original stays untouched. When you're happy with your edits, you copy them back into the original.

**How it actually works under the hood:** Git doesn't actually copy files. A branch is just a lightweight pointer (a 40-character reference) to a specific commit. Creating a branch is nearly instant and takes almost no disk space. Every commit you make moves that pointer forward. When two branches point to different commits, you have diverged history — and that's where merging comes in later.

**Key concepts:**
- `HEAD` is a special pointer that tells Git "which branch am I currently working on?" When you switch branches, HEAD moves to point to the new branch.
- Every branch starts from a specific commit. By default, a new branch starts from wherever you currently are.
- Branches are local by default. They only exist on your machine until you push them to a remote (like GitHub).

**Commands:**
```bash
git branch                    # List all local branches (* marks the current one)
git branch -a                 # List local AND remote branches
git branch my-feature         # Create a new branch (but stay on current branch)
git checkout my-feature       # Switch to an existing branch
git checkout -b my-feature    # Create + switch in one step (most common)
git switch my-feature         # Modern alternative to checkout (Git 2.23+)
git switch -c my-feature      # Modern create + switch
git branch -d my-feature      # Delete a branch (safe — won't delete unmerged work)
git branch -D my-feature      # Force delete a branch (even if unmerged)
```

**Common gotcha:** If you have uncommitted changes when switching branches, Git will either carry them to the new branch (if there are no conflicts) or refuse to switch. Use `git stash` to temporarily shelve changes:
```bash
git stash                     # Save uncommitted changes
git checkout other-branch     # Switch freely
git checkout my-branch        # Come back
git stash pop                 # Restore your changes
```

---

### 2. Feature Branches

**Analogy:** Feature branches are like drafting a chapter of a book separately before adding it to the manuscript. Each chapter (feature) gets its own draft space.

**The workflow, step by step:**

1. **Start from an up-to-date main:**
   ```bash
   git checkout main
   git pull origin main          # Get the latest code from the team
   ```

2. **Create a descriptively-named branch:**
   ```bash
   git checkout -b feature/add-shopping-cart
   ```

3. **Do your work, committing as you go:**
   ```bash
   # ... make changes ...
   git add src/components/Cart.tsx
   git commit -m "Add cart component with add/remove item support"
   # ... more changes ...
   git add src/api/cart.ts
   git commit -m "Add cart API endpoints"
   ```

4. **Push your branch to the remote:**
   ```bash
   git push -u origin feature/add-shopping-cart
   # -u sets up tracking so future pushes just need 'git push'
   ```

5. **Open a pull request** (covered in Topic 5)

6. **After merge, clean up:**
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/add-shopping-cart    # Delete local branch
   ```

**Branch naming conventions (pick one, be consistent):**

| Prefix | Use For | Example |
|--------|---------|---------|
| `feature/` | New functionality | `feature/user-auth` |
| `fix/` | Bug fixes | `fix/cart-total-rounding` |
| `chore/` | Maintenance, dependencies | `chore/update-dependencies` |
| `hotfix/` | Urgent production fixes | `hotfix/payment-crash` |
| `refactor/` | Code restructuring | `refactor/extract-api-layer` |

**Tips:**
- Keep branches short-lived (ideally 1-3 days). Long-running branches accumulate merge conflicts.
- One branch = one logical change. Don't mix a bug fix and a new feature in the same branch.
- Commit early and often. Commits are cheap and you can always squash later.

---

### 3. Master/Main Branch

**Analogy:** The main branch is the published edition of your book. Readers (users, your live website) see this version. You would never scribble edits directly into a published book — you'd draft changes separately first and only update the published edition once everything is reviewed and polished.

**What it represents:**
- The **single source of truth** for your project's production-ready code
- Should always be in a deployable, working state
- Every team member branches from it and merges back into it
- Historically called `master`, GitHub now defaults to `main` (both work identically)

**Why you never commit directly to main:**
- No review — mistakes go straight to production
- No CI checks — broken code can ship
- No history clarity — impossible to tell what changed and why
- No rollback point — harder to undo a specific change

**How to protect it on GitHub:**
1. Go to your repo → Settings → Branches
2. Click "Add branch protection rule"
3. Branch name pattern: `main`
4. Recommended settings to enable:
   - **Require a pull request before merging** — no direct pushes
   - **Require approvals** (set to 1 for small teams) — someone must review
   - **Require status checks to pass** — CI/tests must be green before merge
   - **Require branches to be up to date** — must have latest main merged in
   - **Do not allow bypassing** — even admins follow the rules

**With GitHub CLI:**
```bash
# View current protection rules
gh api repos/{owner}/{repo}/branches/main/protection

# Quick way to check if branch is protected
gh repo view --json defaultBranchRef
```

**What if you accidentally committed to main?**
```bash
# Move your commits to a new branch (before pushing!)
git branch my-accidental-work      # Save commits to a new branch
git reset --hard origin/main       # Reset main back to remote state
git checkout my-accidental-work    # Continue work on the new branch
```

---

### 4. Deployment Strategies

**Analogy:** Deployment strategies are like publishing workflows. Do you publish each chapter draft for early readers (preview deploys)? Or only publish the final, approved book (deploy from main)?

**Strategy 1: Deploy from main (most common)**
- Every merge to `main` triggers an automatic deployment to production
- Simple and reliable. What's in main = what's live.
- Works best with: Vercel, Netlify, Railway, Fly.io, GitHub Actions

```
feature/add-cart → PR → merge to main → auto-deploy to production
```

How this works in practice with Vercel/Netlify:
- Connect your repo to the platform
- Set production branch to `main`
- Every push to main triggers a build and deploys automatically

**Strategy 2: Preview deployments (deploy feature branches)**
- Each branch/PR gets its own live URL for testing
- Reviewers can click the URL and see the changes running
- Vercel example: `feature-add-cart-yourproject.vercel.app`
- Netlify example: `deploy-preview-42--yourproject.netlify.app`

This is automatic with Vercel and Netlify — every PR gets a preview URL posted as a comment. No configuration needed beyond connecting the repo.

**Strategy 3: Environment branches**
```
develop   → deploys to → dev.yourapp.com        (for developers)
staging   → deploys to → staging.yourapp.com    (for QA/testing)
main      → deploys to → yourapp.com            (production)
```

Workflow: `feature branch → develop → staging → main`

This adds safety layers but slows down delivery. Best for teams with QA processes or regulated industries.

**Strategy 4: Trunk-based development**
- Everyone works on very short-lived branches (hours, not days)
- Merge to main frequently (multiple times per day)
- Use feature flags to hide incomplete features in production
- Deploy from main continuously

```bash
# Feature flags let you merge incomplete code safely
if (featureFlags.newCheckout) {
  showNewCheckout();
} else {
  showOldCheckout();
}
```

**Which strategy to pick:**

| Team Size | Recommended Strategy |
|-----------|---------------------|
| Solo / 1-2 people | Deploy from main + preview deploys |
| 3-10 people | Deploy from main + preview deploys + branch protection |
| 10+ people | Trunk-based with feature flags, or environment branches |
| Regulated / enterprise | Environment branches with staging gates |

---

### 5. Pull Requests

**Analogy:** A pull request is like submitting your draft chapter to an editor. You're saying: "Here are my changes — please review them before we add them to the published book." The editor (reviewer) can comment, request changes, or approve.

**What a PR actually is:** A request to merge your branch into another branch (usually main). It shows the diff — every line you added, removed, or changed — so reviewers can understand your work.

**Creating a PR step by step:**

```bash
# 1. Make sure your branch is pushed
git push -u origin feature/add-cart

# 2. Create the PR using GitHub CLI
gh pr create --title "Add shopping cart" --body "## What this does
- Adds cart component with add/remove functionality
- Adds cart API with session-based storage
- Includes unit tests for cart calculations

## How to test
1. Navigate to any product page
2. Click 'Add to Cart'
3. Open cart sidebar to see items"

# 3. Or open in browser to use the GitHub UI
gh pr create --web
```

**Anatomy of a good PR:**

- **Title:** Short, imperative mood. "Add shopping cart" not "I added a shopping cart" or "Shopping cart stuff"
- **Description:** What changed, why, and how to test it
- **Size:** Small is better. Under 400 lines of changes is ideal. Over 1000 lines and reviewers' eyes glaze over.
- **Screenshots:** Include before/after screenshots for any UI changes
- **Linked issues:** Reference the issue it closes: "Closes #42"

**The review process:**

1. **You open the PR** — it appears in the repo's Pull Requests tab
2. **CI runs automatically** — tests, linting, type checking, build
3. **Reviewers are notified** — they read your code and leave comments
4. **You respond to feedback** — push new commits to your branch (the PR updates automatically)
5. **Reviewer approves** — they click "Approve"
6. **You merge** — click the merge button (or use CLI: `gh pr merge`)

**Useful PR commands:**
```bash
gh pr list                        # See all open PRs
gh pr view 42                     # View PR #42 details
gh pr checkout 42                 # Check out PR #42's branch locally
gh pr review 42 --approve         # Approve a PR
gh pr review 42 --request-changes --body "Please fix X"
gh pr merge 42 --squash           # Squash merge PR #42
gh pr merge 42 --delete-branch    # Merge and delete the branch
```

**PR etiquette:**
- Review others' PRs promptly (within a few hours, not days)
- Be kind in reviews — comment on code, not the person
- Use "suggestion" comments on GitHub to propose exact code changes
- If a PR is too large, it's OK to ask the author to split it up

---

### 6. Merging Strategies

**Analogy:** You've drafted a chapter with 15 scribbled revisions. When adding it to the book, do you (a) include all 15 revisions in the appendix for completeness, (b) combine them into one clean revision, or (c) rewrite the revisions as if you wrote them sequentially on top of the current book?

**Strategy 1: Merge commit (the default)**

```bash
git checkout main
git merge feature/add-cart
```

What happens: Git creates a special "merge commit" that ties the two branches together. All individual commits from the feature branch are preserved in the history.

```
main:    A---B---C-------M    (M is the merge commit)
              \         /
feature:       D---E---F
```

**Pros:** Complete history, easy to see what branch a commit came from, easy to revert an entire feature (just revert the merge commit).
**Cons:** History can look messy with many branches, lots of "Merge branch" commits cluttering the log.
**Best for:** Open source projects, teams that value complete history.

**Strategy 2: Squash merge**

```bash
git checkout main
git merge --squash feature/add-cart
git commit -m "Add shopping cart with API and tests"
```

What happens: All the commits from the feature branch are compressed ("squashed") into a single commit on main. The original commits disappear from main's history.

```
main:    A---B---C---S        (S contains all of D+E+F squashed)
              \
feature:       D---E---F      (these commits are not in main's history)
```

**Pros:** Clean, linear history on main. Each feature is one commit. Easy to read `git log`.
**Cons:** Lose individual commit detail. Can't see the step-by-step work. If the feature was large, the squashed commit is huge.
**Best for:** Most teams, especially those starting out. GitHub's "Squash and merge" button does this automatically.

**Strategy 3: Rebase**

```bash
git checkout feature/add-cart
git rebase main
# Then fast-forward merge:
git checkout main
git merge feature/add-cart
```

What happens: Git replays your feature branch commits on top of main, one by one. It's as if you just started your branch from the latest main. No merge commit is created.

```
Before rebase:
main:    A---B---C
              \
feature:       D---E---F

After rebase:
main:    A---B---C
                  \
feature:           D'--E'--F'    (replayed commits, new hashes)

After fast-forward merge:
main:    A---B---C---D'--E'--F'  (linear!)
```

**Pros:** Perfectly linear history. Every commit is on one line. Very clean `git log`.
**Cons:** Rewrites commit history (new hashes). **Never rebase commits that have been pushed and shared with others** — it causes conflicts for teammates. Harder to learn.
**Best for:** Advanced users, teams that want pristine linear history, solo developers.

**The golden rule of rebase:** Only rebase commits that exist on your local branch and haven't been pushed. Once you push, treat commits as immutable.

**Recommendation for most teams:** Use **squash merge** via GitHub's merge button. It gives you clean history without the complexity of rebase.

---

### 7. Merging to Master

**Analogy:** You're ready to add your finished chapter to the published book. Before you do, you need to make sure nothing has changed in the book since you started writing — if someone else added a chapter, you need to account for it first.

**The safe merge workflow, step by step:**

```bash
# Step 1: Switch to main and get the latest
git checkout main
git pull origin main

# Step 2: Switch back to your branch
git checkout feature/add-cart

# Step 3: Bring in the latest main changes
git merge main
# Alternative: git rebase main (see Merging Strategies topic)

# Step 4: If there are conflicts, resolve them
# Git will tell you which files have conflicts.
# Open each file, look for conflict markers:
#   <<<<<<< HEAD
#   (your changes)
#   =======
#   (their changes from main)
#   >>>>>>> main
# Edit the file to keep what you want, remove the markers.

git add resolved-file.ts          # Mark each conflict as resolved
git commit                        # Complete the merge (or continue rebase)

# Step 5: Push your updated branch
git push origin feature/add-cart

# Step 6: Merge via PR on GitHub (recommended)
gh pr merge --squash --delete-branch
```

**Handling merge conflicts — a practical approach:**

1. Don't panic. Conflicts mean two people edited the same lines — Git just needs you to pick which version to keep (or combine them).
2. Run `git status` to see which files are conflicted (they'll say "both modified").
3. Open each conflicted file. Look for the `<<<<<<<`, `=======`, `>>>>>>>` markers.
4. Edit the file to resolve it — keep your code, their code, or a combination.
5. Remove all conflict markers.
6. `git add` the resolved files, then `git commit` (or `git rebase --continue` if rebasing).

**If you get overwhelmed by conflicts:**
```bash
git merge --abort       # Cancel the merge, go back to before you started
git rebase --abort      # Cancel a rebase
```

**Preventing conflicts in the first place:**
- Keep branches short-lived (merge within 1-3 days)
- Pull main into your branch frequently: `git merge main` every day or so
- Communicate with your team about which files you're working on
- Avoid reformatting/renaming files in feature branches (do it in a dedicated PR)

---

### 8. Agents on Separate Branches

**Analogy:** Imagine you have two skilled assistants. You want one to build a search feature and another to build a shopping cart — at the same time. If they both write in the same notebook, their edits collide. Instead, give each assistant their own copy of the notebook and merge the results when both are done.

**The problem:** Git only has one working directory. If Agent A is on `feature/search` and Agent B tries to switch to `feature/cart`, they'll interfere with each other.

**Solution 1: Multiple terminal windows (simple but limited)**

```bash
# Terminal 1:
git checkout -b feature/add-search
claude "Build the search component with autocomplete"

# Terminal 2 (same repo — risky!):
git checkout -b feature/add-cart
claude "Build the shopping cart with quantity controls"
```

**Warning:** This approach is problematic because both terminals share the same working directory. When Terminal 2 runs `git checkout`, it changes the files for Terminal 1 too.

**Solution 2: Git worktrees (the right way)**

Git worktrees let you check out multiple branches simultaneously in separate folders. Each folder is a fully functional copy of your repo sharing the same `.git` database.

```bash
# You're in your main repo at ~/projects/my-app

# Create branches first
git branch feature/add-search
git branch feature/add-cart

# Create worktrees — each gets its own folder with its own branch
git worktree add ../my-app-search feature/add-search
git worktree add ../my-app-cart feature/add-cart
```

Now your filesystem looks like:
```
~/projects/
  my-app/              ← main branch (original repo)
  my-app-search/       ← feature/add-search (worktree)
  my-app-cart/         ← feature/add-cart (worktree)
```

**Run agents in parallel:**
```bash
# Terminal 1:
cd ~/projects/my-app-search
claude "Build the search component with autocomplete"

# Terminal 2:
cd ~/projects/my-app-cart
claude "Build the shopping cart with quantity controls"
```

Each agent has a completely isolated copy of the codebase. No conflicts, no interference.

**When both agents finish:**
```bash
# From each worktree, push and create PRs
cd ~/projects/my-app-search
git add -A && git commit -m "Add search component"
git push -u origin feature/add-search
gh pr create --title "Add search with autocomplete"

cd ~/projects/my-app-cart
git add -A && git commit -m "Add shopping cart"
git push -u origin feature/add-cart
gh pr create --title "Add shopping cart"

# Clean up worktrees when done
cd ~/projects/my-app
git worktree remove ../my-app-search
git worktree remove ../my-app-cart
```

**Solution 3: Claude Code's built-in worktree support**

Claude Code has native worktree support via the Agent tool's `isolation: "worktree"` parameter. When you use this in code that integrates the Claude Agent SDK, the agent automatically runs in its own isolated worktree.

**Worktree management commands:**
```bash
git worktree list                          # See all active worktrees
git worktree add <path> <branch>           # Create a worktree
git worktree remove <path>                 # Remove a worktree (must be clean)
git worktree prune                         # Clean up stale worktree references
```

**Tips for parallel agent work:**
- Each agent should work on files that don't overlap. Search and cart are great parallel tasks; two agents editing the same component are not.
- Create your branches from the same commit on main so they start from the same baseline.
- If both agents need to modify a shared file (like a router or navigation), merge one first, then rebase the second branch before merging.
- Install dependencies in each worktree if needed (`npm install` or equivalent), since `node_modules` is not shared.

---

### 9. Testing Overview

**Analogy:** Before a car leaves the factory, they test individual parts (does the brake pad grip?), then assembled systems (does the braking system stop the car?), then the whole car on a test track (does it drive correctly?). Software testing works the same way.

**The testing pyramid:**
```
        /‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
       /   Visual Tests   \        ← Few (5-10): slow, expensive, catch UI regressions
      /   (screenshots)    \
     /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
    /  Integration Tests     \     ← Some (20-50): moderate speed, test component interaction
   /  (components + APIs)     \
  /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
 /       Unit Tests              \  ← Many (100+): fast, cheap, test individual functions
/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

**Why the pyramid shape:** You want many fast tests at the bottom (cheap, run in milliseconds) and few slow tests at the top (expensive, run in seconds). If you invert this — lots of slow tests and few fast ones — your test suite takes forever and developers stop running it.

**What each level catches:**

| Level | Tests | Example Bug Caught |
|-------|-------|--------------------|
| Unit | A single function | `calculateTotal()` returns wrong value when tax is 0 |
| Integration | Components working together | Cart doesn't update when API returns an error |
| Visual | UI appearance | Button overlaps text after CSS change |

**A practical starting point for any project:**
1. Start with unit tests for your core business logic (calculations, data transformations, validation)
2. Add integration tests for your most critical user flows (sign up, checkout, search)
3. Add visual tests only for key pages/components that change often
4. Run all tests automatically on every PR via CI

---

### 10. Unit Testing

**Analogy:** Unit testing is like checking each ingredient before cooking. Is the flour fresh? Is the egg not cracked? You test each piece in isolation before combining them.

**What makes a good unit test:**
- Tests **one thing** — a single function, a single behavior
- **Fast** — runs in milliseconds (no network, no database, no file system)
- **Isolated** — doesn't depend on other tests running first
- **Deterministic** — same result every time (no random data, no dates)

**Setting up Vitest (recommended for JS/TS projects):**
```bash
npm install -D vitest
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

**Writing your first test:**

```typescript
// src/utils/cart.ts
export function calculateTotal(items: { price: number }[], taxRate: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return Math.round((subtotal * (1 + taxRate)) * 100) / 100;
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
```

```typescript
// src/utils/cart.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTotal, formatCurrency } from './cart';

describe('calculateTotal', () => {
  it('calculates total with tax', () => {
    const items = [{ price: 10 }, { price: 20 }];
    expect(calculateTotal(items, 0.08)).toBe(32.40);
  });

  it('returns 0 for empty cart', () => {
    expect(calculateTotal([], 0.08)).toBe(0);
  });

  it('handles zero tax rate', () => {
    const items = [{ price: 10 }];
    expect(calculateTotal(items, 0)).toBe(10);
  });
});

describe('formatCurrency', () => {
  it('formats cents to dollar string', () => {
    expect(formatCurrency(1099)).toBe('$10.99');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});
```

**Running tests:**
```bash
npx vitest              # Watch mode — reruns on file changes
npx vitest run          # Run once and exit (for CI)
npx vitest run cart     # Run only tests matching "cart"
```

**Testing React/UI components:**
```typescript
// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

it('calls onClick when clicked', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  await userEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalledOnce();
});

it('is disabled when loading', () => {
  render(<Button loading>Submit</Button>);
  expect(screen.getByRole('button')).toBeDisabled();
});
```

**What to unit test (and what not to):**
- **Do test:** Business logic, utility functions, data transformations, validation, state management
- **Don't test:** Third-party libraries, simple getters/setters, framework internals, implementation details (like internal state)

---

### 11. Integration Testing

**Analogy:** Unit tests check that each Lego brick is the right shape. Integration tests check that when you snap them together, the assembled structure holds up and works as expected.

**What integration tests cover:**
- Multiple components rendering together
- Components that call APIs and display results
- User flows that span multiple steps (fill form → submit → see confirmation)
- Database queries returning expected results
- Middleware processing requests correctly

**Example: Testing a component that fetches data**

```typescript
// src/components/ProductList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ProductList } from './ProductList';

// Mock the API at the network level
const server = setupServer(
  http.get('/api/products', () => {
    return HttpResponse.json([
      { id: 1, name: 'Widget', price: 9.99 },
      { id: 2, name: 'Gadget', price: 24.99 },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('displays products from API', async () => {
  render(<ProductList />);

  // Initially shows loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  // After API responds, shows products
  await waitFor(() => {
    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByText('Gadget')).toBeInTheDocument();
  });
});

it('shows error message when API fails', async () => {
  // Override the handler for this one test
  server.use(
    http.get('/api/products', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  render(<ProductList />);

  await waitFor(() => {
    expect(screen.getByText('Failed to load products')).toBeInTheDocument();
  });
});
```

**Example: Testing an API route (Node/Express)**

```typescript
// src/api/cart.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './app';

describe('POST /api/cart/add', () => {
  it('adds an item to the cart', async () => {
    const response = await request(app)
      .post('/api/cart/add')
      .send({ productId: 1, quantity: 2 });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(2);
  });

  it('rejects invalid product IDs', async () => {
    const response = await request(app)
      .post('/api/cart/add')
      .send({ productId: -1, quantity: 1 });

    expect(response.status).toBe(400);
  });
});
```

**End-to-end integration with Playwright:**

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('user can add item to cart and checkout', async ({ page }) => {
  await page.goto('/products');
  await page.click('text=Add to Cart');
  await page.click('text=View Cart');
  await expect(page.locator('.cart-item')).toHaveCount(1);
  await page.click('text=Checkout');
  await page.fill('#email', 'test@example.com');
  await page.click('text=Place Order');
  await expect(page).toHaveURL('/order-confirmation');
});
```

**Key tools for integration testing:**
- **MSW (Mock Service Worker):** Intercepts network requests at the service-worker level. Best for mocking APIs in frontend tests.
- **Supertest:** Makes HTTP requests to your Express/Node app without starting a real server.
- **Playwright / Cypress:** Browser automation for full end-to-end tests.
- **Testing Library:** Renders components and queries them like a user would (by text, role, label — not by CSS class or test ID).

---

### 12. Visual Testing

**Analogy:** Imagine you're redesigning a building's lobby. You take a photo before and after every change. If something looks wrong — a misaligned tile, wrong paint color — you catch it by comparing photos. Visual testing does this for your UI.

**What visual testing catches that other tests miss:**
- CSS regressions (a padding change that breaks layout)
- Responsive design issues (looks fine on desktop, broken on mobile)
- Font rendering changes
- Color/theme inconsistencies
- Z-index stacking bugs (elements overlapping incorrectly)

**How it works:**
1. First run: Take screenshots of your components/pages → these become the **baseline**
2. Subsequent runs: Take new screenshots and compare pixel-by-pixel against baselines
3. If they differ: The test fails and shows you exactly what changed
4. You review: Either approve the change (update baseline) or fix the bug

**Visual testing with Playwright (built-in, free):**

```typescript
// visual-tests/homepage.spec.ts
import { test, expect } from '@playwright/test';

test('homepage matches visual snapshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});

test('product card renders correctly', async ({ page }) => {
  await page.goto('/products');
  const card = page.locator('.product-card').first();
  await expect(card).toHaveScreenshot('product-card.png');
});

// Test multiple viewports
test('homepage is responsive', async ({ page }) => {
  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage-mobile.png');

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page).toHaveScreenshot('homepage-tablet.png');

  // Desktop
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page).toHaveScreenshot('homepage-desktop.png');
});
```

**Setup for Playwright visual tests:**

```typescript
// playwright.config.ts (add to your existing config)
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,  // Allow 1% pixel difference (for anti-aliasing)
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Optionally test multiple browsers:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**Running visual tests:**
```bash
npx playwright test                        # Run all tests
npx playwright test --update-snapshots     # Update baselines after intentional changes
npx playwright show-report                 # Open HTML report with visual diffs
```

**Cloud visual testing services (for teams):**
- **Chromatic** (by Storybook team): Captures Storybook stories, compares across builds, provides review UI for team approval. Free for open source.
- **Percy** (by BrowserStack): Integrates with any test framework, cross-browser screenshots, team review workflow.
- **Argos CI**: Open source alternative, GitHub integration, diff viewer.

**Tips:**
- Only visual-test stable UI (not content that changes daily like dates, user avatars)
- Use `mask` to hide dynamic content: `await expect(page).toHaveScreenshot({ mask: [page.locator('.timestamp')] })`
- Run visual tests in CI on a consistent OS (Linux) to avoid platform-specific rendering differences
- Start with your 5 most important pages, not every component

---

### 13. Using Tests for Code Health

**Analogy:** Tests are like a health checkup for your code. You don't just go to the doctor when you're sick — you get regular checkups to catch problems early. Similarly, tests should run continuously, not just when something breaks.

**Strategy 1: Write tests alongside code — not after**

The biggest mistake teams make is writing all the code first and "planning to add tests later." Later never comes. Instead:

- Write the test first (or at the same time) for each function
- If you're fixing a bug, write a test that reproduces the bug first, then fix it. The test proves the bug is fixed and prevents it from coming back.

```bash
# TDD cycle: Red → Green → Refactor
# 1. Write a failing test (RED)
# 2. Write the minimum code to make it pass (GREEN)
# 3. Clean up the code (REFACTOR)
```

**Strategy 2: Run tests before every commit with pre-commit hooks**

```bash
# Install Husky for Git hooks
npm install -D husky
npx husky init

# Add pre-commit hook that runs tests
echo "npm test -- --run" > .husky/pre-commit
```

Now every time you (or an agent) run `git commit`, tests run first. If they fail, the commit is blocked.

**Strategy 3: CI runs tests on every PR — block merge if they fail**

With GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test -- --run
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

Then in GitHub branch protection rules, require the "Tests" check to pass before merging.

**Strategy 4: Coverage targets — what to aim for**

```bash
# Run tests with coverage report
npx vitest run --coverage
```

Output shows which lines/functions/branches are tested:
```
 % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------|----------|---------|---------|-------------------
   85.71 |    83.33 |     100 |   85.71 | 23-25
```

**Realistic coverage targets:**
- **80%+ overall** is a solid goal for most projects
- **95%+** for critical business logic (payments, auth, calculations)
- **Don't chase 100%** — it leads to brittle tests that test implementation details
- Focus coverage on code that matters: business logic, data handling, API endpoints
- Low-value targets: config files, type definitions, simple wrapper components

**Strategy 5: Test behavior, not implementation**

Bad test (tests implementation — breaks when you refactor):
```typescript
it('sets state to loading', () => {
  const { result } = renderHook(() => useProducts());
  expect(result.current.state).toBe('loading');  // Testing internal state
});
```

Good test (tests behavior — survives refactoring):
```typescript
it('shows loading indicator while fetching', () => {
  render(<ProductList />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

**The test checklist for healthy code:**

1. Every PR includes tests for new/changed behavior
2. Pre-commit hooks run unit tests (fast — under 10 seconds)
3. CI runs the full suite on every PR (unit + integration + visual)
4. Merge is blocked if tests fail
5. Coverage is tracked but not obsessed over
6. Flaky tests are fixed immediately (a flaky test is worse than no test)
7. Tests are maintained — when code changes, tests are updated to match

---

## After Each Topic

After explaining a topic:
1. Ask if they want to try it hands-on in their current project
2. Suggest the next logical topic to explore
3. Offer to demonstrate with real commands in their repo
