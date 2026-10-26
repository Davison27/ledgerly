# Runtime and dependency security maintenance

## Runtime versions

Production Node.js images use `22.23.4`, pinned by digest in both builder
Dockerfiles and the backend runtime stage. This keeps production on the Node 22
line while applying the October 2026 security release. The workspace engine
range permits local Node `22.23.4` or `24.22.1`; this does not change the
production runtime major. See the [October 2026 security releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
and the [Node 22.23.4 release](https://nodejs.org/en/blog/release/v22.23.4).

The root `packageManager` pins pnpm to `12.4.2`. Use that version for lockfile
updates and verify it before installing. CI, local verification, Docker
builders, and release-audit dependency resolution must use the checked-in
lockfile with frozen installs.

## Dependency resolution and image checks

The security update raised 40 direct package names to versions allowed by
their declared ranges. It keeps NestJS 11 and Vite 6, updates Multer to `2.5.0`,
and refreshes Better Auth to `1.7.12`. The Nest platform adapter still declares
Multer `2.4.0`, so `pnpm-workspace.yaml` scopes a `2.5.0` override to
`@nestjs/platform-express@11.2.8` rather than changing unrelated Multer paths.

Better Auth `1.7.12` declares Vitest as an optional peer for its test utilities.
Ledgerly's server uses the package's production entry points and does not
import those utilities. `.pnpmfile.cjs` removes only that optional peer and its
metadata for version `1.7.12`; its tests preserve the peer for every other
package and version. Keep this hook in both Docker builder contexts and the
temporary manifest context used by `release-audit.sh`, so lockfile resolution
is consistent across local, image, and audit installs. Recheck the hook when
updating Better Auth.

The backend Jest commands disable V8's compilation cache with
`--no-compilation-cache` because Jest VM tests otherwise hit the Node/V8
teardown failure tracked in [Node.js issue 65866](https://github.com/nodejs/node/issues/65866).
This is a test-runner setting only; do not add it to production Node commands.

After building production images, `release-audit.sh` checks that the backend
image runs Node `22.23.4` and scans the physical `/app/node_modules` tree,
including pnpm's `.pnpm` store. It rejects `vitest`, `@vitest/mocker`, and
`tinypool`, and verifies Multer `2.5.0` from both the application root and the
Nest platform adapter. This application dependency check does not scan base
image packages or replace the existing Docker Scout gate.

## Audit status and deferred upgrades

On 2026-10-26, `pnpm audit --prod --json` reported no production dependency
advisories. The full workspace audit still reported five records: two critical
`tinypool@1.1.1` findings and three moderate findings for `vitest@3.2.7` and
`@vitest/mocker@3.2.7`. `pnpm why` locates these packages only under frontend
development dependencies; the frontend production image serves static files
from Caddy. These results describe package advisories, not a full container
image CVE scan.

The update left 28 direct package names with newer releases that require a
major-version change or a breaking minor change for a `0.x` package. Examples
include NestJS 12, Vite 8, Vitest 5, ESLint 10, PDF.js 6, Jest 30, and jsdom 30.
Keep those migrations separate and test their compatibility rather than
forcing them through a patch release.

Some deprecated transitive packages also remain in the resolved graph:

- `node-domexception@1.0.0` is reachable from the backend through
  `google-auth-library@10.9.1` and its fetch dependencies.
- `glob@7.2.3` and `inflight@1.0.6` are in backend Jest 29 tooling.
- `glob@10.5.0` and `whatwg-encoding@3.1.1` are in frontend Vitest 3 and
  jsdom 26 tooling.

Do not hide these entries with broad overrides. Revisit them when their parent
libraries can be upgraded within the supported compatibility range or as part
of a separately tested major migration.
