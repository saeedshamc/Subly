# IP Subnet Calculator

A production-ready, teaching-first **IPv4 + IPv6 subnet calculator** built with
Next.js 14 (App Router) and TypeScript. It supports standard subnetting,
reverse lookups (hosts \u2192 CIDR, subnets \u2192 CIDR), VLSM, FLSM, and IPv6
subnetting \u2014 with a step-by-step "show work" mode, bilingual English/Persian
UI (with full RTL support), and light/dark themes.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To run the test suite:

```bash
npm test          # single run
npm run test:watch
```

To build for production:

```bash
npm run build
npm start
```

## Project structure

```
lib/subnet-engine/   Pure, framework-independent TypeScript calculation engine
  types.ts             Shared types/interfaces (SubnetResult, VLSMRequest, IPv6Result, ...)
  binary.ts            IPv4 <-> integer <-> binary-string conversions
  validation.ts         IPv4/IPv6/CIDR/mask validation with specific error messages
  addressType.ts        IPv4 class + special-range detection (RFC 1918, loopback, etc.)
  ipv4.ts               calculateSubnet, hostsToCidr, subnetsToCidr
  vlsm.ts               calculateVLSM - variable-length subnet allocation
  flsm.ts               calculateFLSM - equal-size subnet splitting
  ipv6.ts               IPv6 parsing, expand/compress, address types, subnetting
  index.ts              Barrel export

lib/i18n/             React context + hook for the EN/FA translations (locales/*.json)
lib/hooks/             Theme provider (light/dark, OS-aware, persisted)
lib/utils/             CSV and PDF export helpers

components/           All UI (forms, result cards, binary visualizer, tables, ...)
app/                   Next.js App Router pages (single-page app with tab navigation)
locales/               en.json / fa.json translation dictionaries
tests/                 Vitest suite for the engine (ipv4, vlsm, flsm, ipv6, validation)
```

### Why the engine is separate

Everything under `lib/subnet-engine/` is **pure TypeScript with zero React or
Next.js imports**. Every exported function takes plain inputs (strings,
numbers) and returns plain objects \u2014 no side effects, no DOM, no framework
dependency. That means you can:

- Copy the `lib/subnet-engine/` folder into any other TypeScript project as-is.
- Publish it as its own npm package (just add a `package.json` inside that
  folder pointing at `index.ts` as the entry point, or run it through your
  bundler of choice).
- Wrap it in a small CLI (`node cli.js 192.168.1.0/24`) using nothing but
  `import { calculateSubnet } from './subnet-engine'`.

### Reusing the engine standalone

```ts
import { calculateSubnet, calculateVLSM, calculateFLSM } from './lib/subnet-engine';

const r = calculateSubnet('192.168.1.10', 24);
console.log(r.networkAddress, r.broadcastAddress, r.usableHosts);

const vlsm = calculateVLSM('10.0.0.0', 24, [
  { name: 'Sales', hostsNeeded: 60 },
  { name: 'Engineering', hostsNeeded: 25 },
]);
console.log(vlsm.allocations);
```

## Features

- **Multiple input modes**: IP + CIDR, IP + dotted-decimal mask, reverse
  lookup from a host count, reverse lookup from a subnet count.
- **Full IPv4 breakdown**: network/broadcast address, first/last usable host,
  usable host count, mask + wildcard mask, binary breakdown per octet,
  address class (A\u2013E), and special-range detection (RFC 1918 private space,
  loopback, link-local, CGNAT, benchmarking, documentation ranges, etc.).
- **VLSM**: give a base network and a list of named subnets with the hosts
  each one needs; subnets are allocated largest-to-smallest (the standard
  VLSM rule, which keeps every block naturally aligned), leftover space is
  reported as valid CIDR blocks, and requests that don't fit are flagged
  individually rather than aborting the whole calculation.
- **FLSM**: split a base network into N equal-size subnets (rounded up to
  the next power of two if necessary).
- **IPv6**: expand/compress addresses (RFC 5952 canonical form), compute
  network prefix and first/last address for any prefix length, split a
  prefix into smaller subnets (e.g. a /48 into /64s, capped so the UI never
  tries to render billions of rows), and detect address type (global
  unicast, link-local, unique local, multicast, loopback, documentation,
  IPv4-mapped).
- **Show work mode**: color-coded binary visualization of the AND operation
  that derives the network address, how the broadcast address sets all host
  bits to 1, and how the wildcard mask inverts the subnet mask.
- **Bilingual + RTL**: full English/Persian UI switch; Persian mode flips the
  entire layout to RTL while keeping IP addresses, binary strings, and
  numbers in standard Latin digits/left-to-right for technical accuracy.
- **Light/dark themes**: follows `prefers-color-scheme` by default, with a
  manual toggle that persists in `localStorage`.
- **Export**: copy any individual field, copy a full result summary, export
  a result set to CSV, or export to PDF.

## Notes on VLSM alignment

VLSM allocation sorts subnets **largest to smallest** before placing them
sequentially from the base network address. Because every block size is a
power of two, and the previous (larger or equal) block size is always a
multiple of the next block's size, each subnet automatically lands on a
correctly aligned boundary \u2014 no manual boundary math needed. Leftover space
after the last allocation is decomposed into the minimum number of valid
CIDR blocks (it usually isn't a single clean subnet).

## Notes on IPv6 subnetting

Because an IPv6 prefix can contain an astronomical number of subnets (a /48
split into /64s yields 65,536 of them; a /32 split into /64s yields over 4
billion), the subnetting UI caps how many are actually enumerated and shows
a warning when the full range was truncated. The underlying `subnetIPv6()`
function accepts a `limit` parameter for exactly this reason.

## Tech stack

- Next.js 14 (App Router) + TypeScript + React 18
- Tailwind CSS (class-based dark mode)
- Vitest for the engine test suite
- jsPDF + jspdf-autotable for client-side PDF export
- No backend/server required \u2014 everything runs client-side in the browser
