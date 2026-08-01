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

- [ ] apps/serverless-admin (admin console embedded in the faas-server binary)
- [ ] packages/function-studio (publishable `@datadack/function-studio`)
- [ ] src/components (shared UI)
- [ ] config (eslint-config / typescript-config)
- [ ] CI / tooling / docs

## Checklist

- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run format:check` passes
- [ ] `bun run build` passes
- [ ] No secrets or credentials committed

## Downstream impact

The admin console bundle is embedded into the `serverless_faas` Go binary
(`apps/serverless-admin/assets.go`), and this repo is consumed there as the
`web` submodule.

- [ ] `apps/serverless-admin/dist` still builds (CI asserts this)
- [ ] If the published package version changed, a `function-studio-v*` tag is needed to release it
- [ ] `serverless_faas` submodule pointer needs bumping after merge

## How to test

<!-- Step-by-step instructions for reviewers to verify the change. -->

1. `bun install`
2. `bun run dev:admin`
3. …

## Related issues / tickets

<!-- Closes #123 -->
