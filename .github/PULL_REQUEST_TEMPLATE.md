## Summary

<!-- What does this PR do? One or two sentences. -->

## Type of change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactoring / cleanup (no functional change)
- [ ] Documentation update
- [ ] CI / tooling update

## Affected projects

<!-- List the workspace projects touched. -->

- [ ] apps/serverless-web (admin console served by faas-server)
- [ ] apps/cloud-react (cloud console served by cloud-be)
- [ ] packages/serverless (publishable `@datadack/serverless`)
- [ ] config (eslint-config / typescript-config)
- [ ] CI / tooling / docs

## Checklist

- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run format:check` passes
- [ ] `bun run build` passes
- [ ] `bun run test` passes
- [ ] No secrets or credentials committed

## Downstream impact

This repo is the `web` submodule of two Go services, each copying one app's
`dist/` into its image as `views/`: `serverless_faas` takes
`apps/serverless-web`, `cloud-be-go` takes `apps/cloud-react`.

- [ ] Both `apps/*/dist` still build (CI asserts this)
- [ ] If the published package version changed, a `serverless-v*` tag is needed to release it
- [ ] Submodule pointers in `serverless_faas` and `cloud-be-go` need bumping after merge —
      push this repo first, or their checkouts cannot resolve the new commit

## How to test

<!-- Step-by-step instructions for reviewers to verify the change. -->

1. `bun install`
2. `bun run dev:admin`
3. …

## Related issues / tickets

<!-- Closes #123 -->
