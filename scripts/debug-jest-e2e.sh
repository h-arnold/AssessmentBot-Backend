#!/bin/bash
# Run Jest E2E tests and pipe all output to jest-e2e.log
node ./node_modules/.bin/jest --runInBand --config jest-e2e.config.cjs "$@" > jest-e2e.log 2>&1
