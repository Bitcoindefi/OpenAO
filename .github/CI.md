# Continuous integration

Every push and pull request runs the following required checks:

- `CI / api`: TypeScript typecheck and the Vitest test suite.
- `CI / server`: TypeScript typecheck and ESLint.
- `CI / frontend`: TypeScript typecheck and ESLint.
- `Secret scan / Gitleaks`: committed-secret detection across the full history.
- `Docker builds`: builds only images affected by Docker or component changes on pull requests.

Dependencies are installed independently for each component with its own frozen
pnpm lockfile and cached pnpm store. Matrix jobs run in parallel and do not stop
the remaining components when one fails.

## Repository setting

GitHub branch protection is configured outside the repository. A maintainer must
create a ruleset for the default branch, enable **Require status checks to pass**,
and select the checks listed above. The workflows themselves intentionally use
read-only repository permissions and never publish images.
