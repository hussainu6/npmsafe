# Contributing to NPMSafe

First off, thank you for considering contributing to NPMSafe! It's people like you that make NPMSafe such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, [make one](https://github.com/hussainu6/npmsafe/issues/new)! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

### Fork & create a branch

If this is something you think you can fix, then [fork NPMSafe](https://github.com/hussainu6/npmsafe/fork) and create a branch with a descriptive name.

A good branch name would be (where issue #123 is the ticket you're working on):

```sh
git checkout -b 123-fix-secret-scanner-bug
```

### Get the test suite running

Make sure you're able to get the test suite running:
```sh
npm install
npm test
```

### Did you find a bug?

*   **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/hussainu6/npmsafe/issues).

*   If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/hussainu6/npmsafe/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Did you write a patch that fixes a bug?

*   Open a new GitHub pull request with the patch.

*   Ensure the PR description clearly describes the problem and solution. Include the relevant issue number if applicable.

### Do you intend to add a new feature or change an existing one?

*   Suggest your change in a [new issue](https://github.com/hussainu6/npmsafe/issues/new) and start writing code.

### Do you have questions about the source code?

*   Ask any question about how to use NPMSafe in the [GitHub Discussions](https://github.com/hussainu6/npmsafe/discussions).

## Submitting a pull request

When you're sending a pull request:

*   We prefer small pull requests.
*   Please ensure that the test suite passes before submitting a pull request.
*   If you're adding a new feature, please include tests for it.
*   Make sure you've updated the documentation if you've changed the API.

Thank you for your contribution! 