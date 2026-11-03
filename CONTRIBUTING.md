# Contributing to Hoshinote

Thank you for your interest in contributing to Hoshinote! We welcome contributions from developers, researchers, and technical writers.

---

## 🛠️ Code of Conduct & Standards

To maintain high software reliability across native desktop platforms, Hoshinote enforces strict code standards:
- **Zero-Warning Policy**: Code must compile and pass linters with **0 warnings** on all targets.
- **Test-Driven Rigor**: Any bug fix or new feature must be accompanied by automated unit or integration tests.
- **Non-Destructive Operations**: Never write destructive database migrations that drop user notes without safe migration and backup snapshots.

---

## 💻 Development Environment Setup

1. **Install Prerequisites**:
   - Node.js `22.x LTS` (or `20.x+`)
   - `pnpm` `12.x`
   - Rust `1.85+` or `1.99+` (`rustup default stable`)
   - Desktop build tools (MSVC on Windows, build-essential and WebKitGTK on Linux, Xcode CLT on macOS).

2. **Clone & Install**:
   ```bash
   git clone git@github.com:nmkdeveloper/hoshinote.git
   cd hoshinote
   pnpm install
   ```

3. **Running Dev Servers**:
   ```bash
   # Launch Tauri Desktop Application in Dev Mode
   pnpm run tauri dev

   # Launch Frontend Vite Server (Browser Mock DB)
   pnpm run dev
   ```

---

## 🧪 Verification & Testing Commands

Before submitting a Pull Request, ensure all following verification checks pass cleanly:

```bash
# 1. Frontend TypeScript Strict Typecheck
pnpm exec tsc --noEmit

# 2. Vitest Frontend Unit & Integration Tests
pnpm test

# 3. Opaque-Box E2E Test Suite (4 Tiers, 78 Test Cases)
node tests/e2e/runner.js

# 4. Rust Backend Tests (SQLite, FTS5, Concurrency, Crypto)
cargo test --manifest-path src-tauri/Cargo.toml --all-targets

# 5. Rust Clippy (Zero Warnings Enforced)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings

# 6. Production Bundle Build
pnpm run build
```

---

## 📦 Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes using Conventional Commits:
   - `feat:` for new capabilities
   - `fix:` for bug fixes
   - `docs:` for documentation updates
   - `test:` for test additions or fixtures
   - `refactor:` for code restructuring without behavior changes
3. Push to your branch and open a Pull Request against the `main` branch.
4. Ensure all GitHub Actions CI checks (`frontend-checks`, `rust-checks`) pass.
