# Security Policy

## Reporting a vulnerability

Report privately through
[GitHub Security Advisories](https://github.com/DataDack/web-ui/security/advisories/new).
Do not open a public issue — public issues are visible before a fix exists.

Include the affected version or commit, reproduction steps, and the impact you
believe it has. You will get an acknowledgement within three working days.

## Supported versions

Only `main` is supported. Fixes ship forward; there are no backport branches.

## Automated scanning

Every pull request and push runs dependency auditing, CodeQL static analysis,
and a secret scan. A weekly scheduled run repeats them, so an advisory published
against an untouched dependency is still caught.

Secrets belong in the deployment environment, never in this repository. If one
is committed, treat it as compromised: rotate the credential first, then remove
it from history.
