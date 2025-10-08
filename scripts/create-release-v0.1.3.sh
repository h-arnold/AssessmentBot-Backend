#!/bin/bash
# Script to create GitHub release for v0.1.3
# 
# Prerequisites:
# 1. The PR must be merged to the main/master branch
# 2. GH_TOKEN environment variable must be set with appropriate permissions
# 3. gh CLI must be installed
#
# Usage:
#   export GH_TOKEN=<your-github-token>
#   ./scripts/create-release-v0.1.3.sh

set -e

# Configuration
VERSION="v0.1.3"
RELEASE_NOTES_FILE="RELEASE_NOTES_v0.1.3.md"
BRANCH="main"

echo "Creating release ${VERSION}..."

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if GH_TOKEN is set
if [ -z "$GH_TOKEN" ]; then
    echo "Error: GH_TOKEN environment variable is not set"
    echo "Set it with: export GH_TOKEN=<your-github-token>"
    exit 1
fi

# Check if release notes file exists
if [ ! -f "$RELEASE_NOTES_FILE" ]; then
    echo "Error: Release notes file not found: $RELEASE_NOTES_FILE"
    exit 1
fi

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo "Warning: You are on branch '$CURRENT_BRANCH', not '$BRANCH'"
    echo "Make sure the PR has been merged before creating the release"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create the release
echo "Creating GitHub release..."
gh release create "$VERSION" \
    --title "Release $VERSION" \
    --notes-file "$RELEASE_NOTES_FILE" \
    --target "$BRANCH"

echo "✅ Release $VERSION created successfully!"
echo "View it at: https://github.com/h-arnold/AssessmentBot-Backend/releases/tag/$VERSION"
