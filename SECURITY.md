# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Mux Protocol, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email security@muxprotocol.io with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested remediation

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Scope

This policy covers the `mux-backend` repository, including:

- API endpoints and authentication/authorization logic
- Wallet and account abstraction flows
- Payment and money-path operations
- JWT issuance and verification
- Webhook handling

## Identity Invariant: JWT Is the Only Source of User Identity

The acting user identity for every authenticated request is derived **exclusively** from the verified JWT (subject and claims). Client-supplied user identifiers are never trusted.

### Rules

1. **JWT is the source of truth.** The authenticated subject (`sub`) and associated claims from a verified, unexpired, non-revoked JWT are the only authoritative identity for a request.
2. **Reject client-supplied user ids.** Any user id supplied via request body, query parameters, or headers that does not match the JWT identity MUST be rejected with the stable error code `IDENTITY_MISMATCH` and a correlation id. Deny-by-default.
3. **Fail closed.** Missing, invalid, expired, or revoked JWTs MUST be rejected. There is no fallback to client-provided identity under any circumstance.
4. **No identity from untrusted fields.** Controllers and services MUST consume the verified identity via the typed guard/decorator/helper entrypoint rather than reading raw request fields.
5. **Dependency outages fail closed.** If a dependency (RPC/DB/Horizon) is unavailable, privileged writes MUST fail closed rather than proceeding with unverified identity.

### Error Codes

| Code | Meaning |
| --- | --- |
| `IDENTITY_MISMATCH` | A client-supplied user id does not match the verified JWT identity. |
| `UNAUTHENTICATED` | JWT is missing, invalid, expired, or revoked. |

All identity-related rejections include a correlation id for tracing and MUST NOT leak raw JWTs, keys, or secrets in responses or logs.

## Security Considerations

- The server and contracts remain the source of truth for spends, recovery, and admin operations.
- No secrets are committed to the repository or emitted in logs; keys, JWTs, and webhook secrets are redacted.
- Every external entrypoint is rate-limited and authorized.
- New privileged surfaces are deny-by-default.

## References

- `README.md`
- `test/auth-provider-unification.e2e-spec.ts`
