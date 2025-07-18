In the folder @test/testsToRefactor you will find the old e2e tests, which did work but getting them to work was messy, brittle and didn't properly test them because they relied on additional testing modules or controllers rather than using the regular ones built in into the app.

The latest e2e test, @test/logging.e2e-spec.ts has been written to work as a proper e2e test, running the full app and capturing the log output to a file in the root directory called `e2e-test.log`. You'll notice that the logging e2e test has all the hooks and supporting functions needed for this to work properly.

I want you to do the following:

1. Spin off the testing infrastructure code (e.g. `waitForLog` etc.) into a separate file so that shared testing functionality can be reused across e2e test suites.
2. Verify that the logging e2e-tests still pass. Make sure you specify the exact test file you want to run rather than `npm run test:e2e` because that will run all the tests I want you to refactor.
3. Commit your changes and address any linting errors that appear.
4. Await further instructions.
