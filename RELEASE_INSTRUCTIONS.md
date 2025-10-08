# Creating the v0.1.3 Release

This document provides instructions for creating the v0.1.3 release after the PR has been merged.

## Prerequisites

1. ✅ The PR `copilot/update-npm-dependencies-to-latest` must be **merged** to the main/master branch
2. ✅ GitHub CLI (`gh`) must be installed: https://cli.github.com/
3. ✅ GitHub Personal Access Token with appropriate permissions

## Option 1: Automated Release (Recommended)

Use the provided script to create the release automatically:

```bash
# 1. Ensure you're on the main branch after PR merge
git checkout main
git pull origin main

# 2. Set your GitHub token
export GH_TOKEN=<your-github-token>

# 3. Run the release script
./scripts/create-release-v0.1.3.sh
```

The script will:

- Verify prerequisites
- Create a GitHub release with tag `v0.1.3`
- Use the content from `RELEASE_NOTES_v0.1.3.md`
- Target the main branch

## Option 2: Manual Release via gh CLI

If you prefer to create the release manually:

```bash
# 1. Ensure you're on the main branch
git checkout main
git pull origin main

# 2. Set your GitHub token
export GH_TOKEN=<your-github-token>

# 3. Create the release
gh release create v0.1.3 \
  --title "Release v0.1.3" \
  --notes-file RELEASE_NOTES_v0.1.3.md \
  --target main
```

## Option 3: Manual Release via GitHub Web UI

If `gh` CLI is not available:

1. Navigate to https://github.com/h-arnold/AssessmentBot-Backend/releases/new
2. Click "Choose a tag" and type `v0.1.3`, then click "Create new tag: v0.1.3 on publish"
3. Set "Target" to `main` branch
4. Set "Release title" to `Release v0.1.3`
5. Copy the content from `RELEASE_NOTES_v0.1.3.md` and paste into the description
6. Leave "Set as a pre-release" unchecked
7. Check "Set as the latest release"
8. Click "Publish release"

## Verification

After creating the release:

1. Verify the release appears at: https://github.com/h-arnold/AssessmentBot-Backend/releases/tag/v0.1.3
2. Check that the release notes are correctly displayed
3. Confirm the tag `v0.1.3` has been created
4. Verify the release is marked as "Latest"

## Troubleshooting

### GH_TOKEN Not Set

If you see "GH_TOKEN environment variable is not set":

```bash
# Generate a token at: https://github.com/settings/tokens
# Token needs 'repo' scope for private repos, or 'public_repo' for public repos
export GH_TOKEN=ghp_your_token_here
```

### Permission Denied

If you get permission errors:

- Ensure your GitHub token has the correct scopes
- Verify you have write access to the repository
- Try re-authenticating: `gh auth login`

### Not on Main Branch

If the script warns about branch mismatch:

- Merge the PR first
- Switch to main: `git checkout main`
- Pull latest: `git pull origin main`
- Run the script again

## Post-Release Tasks

After successfully creating the release:

1. ✅ Update any documentation that references version numbers
2. ✅ Notify the team about the new release
3. ✅ Consider updating Docker images if applicable
4. ✅ Archive or close the release notes file if no longer needed

## Current Status

As of commit `e75e17c`:

- ✅ Version bumped to 0.1.3 in package.json
- ✅ Release notes created in RELEASE_NOTES_v0.1.3.md
- ✅ All tests passing
- ⏳ **Waiting for PR merge before release can be created**

## Notes

- The release cannot be created from a branch; it must be created from the main branch after PR merge
- The GH_TOKEN environment variable is not available in the GitHub Actions environment where this work was done
- Manual intervention is required to complete the release process
