# Environment Skills & CLI Tools Discovery (Requirement R2)

This catalog documents the verified global and runnable CLI skills, compilers, and toolchains discovered in the environment for Hoshinote desktop application development, testing, and distribution.

---

## 1. System & Native Compilers

| Tool | Version | Path / Provider | Verification Status | Notes |
|------|---------|-----------------|---------------------|-------|
| **Rust Compiler (`rustc`)** | `1.99.1` (58cf8f9c3 2026-10-13) | `C:\Users\nomoka\.cargo\bin\rustc.exe` | Verified | Target: `x86_64-pc-windows-msvc` |
| **Cargo Package Manager** | `1.99.1` (5f94df478 2026-08-27) | `C:\Users\nomoka\.cargo\bin\cargo.exe` | Verified | Zero-warning policy (`cargo clippy`, `cargo test`) |
| **Clippy Linter** | `1.99.1` (5f94df478 2026-08-27) | `C:\Users\nomoka\.cargo\bin\cargo-clippy.exe` | Verified | Strict warnings enforced: `-D warnings` |
| **MSVC C/C++ Compiler** | Visual Studio Professional 2026 | Visual Studio 2026 Build Tools | Verified | Required for linking Tauri desktop binaries and SQLite C bundle |
| **WebView2 Runtime** | `156.0.4314.50` | Windows System Evergreen Runtime | Verified | Native desktop web engine for Tauri 2.0 |

---

## 2. Desktop Framework & Tauri Toolchain

| Tool | Version | Invocation Command | Verification Status | Notes |
|------|---------|--------------------|---------------------|-------|
| **Tauri CLI** | `2.12.4` | `pnpm tauri` or `pnpm dlx @tauri-apps/cli` | Verified | Tauri 2.0 multi-platform desktop runner & bundler |
| **Create Tauri App** | `4.8.0` | `pnpm dlx create-tauri-app` | Verified | Project scaffolding utility supporting React 18 LTS |
| **SQLite (rusqlite)** | `0.41.1` (bundled) | `rusqlite = { version = "0.41", features = ["bundled"] }` | Verified | In-process embedded SQLite with WAL & FTS5 full-text search |

---

## 3. Node.js & Package Managers

| Tool | Version | Invocation Command | Verification Status | Notes |
|------|---------|--------------------|---------------------|-------|
| **Node.js** | `v26.7.0` | `node` | Verified | Fast JavaScript/TypeScript runtime |
| **pnpm** | `12.5.1` | `pnpm` | Verified | Primary package manager; binary executable bypassing PowerShell script restrictions |
| **npm.cmd** | `11.19.0` | `npm.cmd` | Verified | Windows cmd-wrapped npm script fallback |
| **npx.cmd** | `11.19.0` | `npx.cmd` | Verified | Windows cmd-wrapped npx runner fallback |

*PowerShell ExecutionPolicy Note*: The Windows execution policy blocks unsigned `.ps1` scripts (`npm.ps1`, `npx.ps1`). Always invoke `pnpm` directly or use `npm.cmd` / `npx.cmd`.

---

## 4. Testing, Automation & UI Verification

| Tool | Version | Invocation Command | Verification Status | Notes |
|------|---------|--------------------|---------------------|-------|
| **Playwright** | `1.64.1` | `pnpm dlx playwright` or `npx.cmd playwright` | Verified | Visual UI screenshot verification via Microsoft Edge channel (`--channel msedge`) |
| **Vitest** | `5.0.5` | `pnpm dlx vitest` | Verified | Fast unit testing engine for React and TypeScript components |
| **TypeScript Compiler (`tsc`)** | `5.6.3+` | `pnpm exec tsc` | Verified | Strict typechecking across frontend codebase |
| **FFmpeg** | `2026-10-01` | `ffmpeg` | Verified | Optional desktop window video/audio capture utility with `gdigrab` |
| **PowerShell .NET CopyFromScreen** | PowerShell 5.1/7+ | `[System.Drawing.Graphics]::CopyFromScreen` | Verified | Native Windows headless screenshot capture |

---

## 5. Version Control & Remote Release

| Tool | Version | Remote | Verification Status | Notes |
|------|---------|--------|---------------------|-------|
| **Git** | `2.55.0.windows.3` | `git@github.com:nmkdeveloper/hoshinote.git` | Verified | Branch `main`, SSH key authenticated for `nmkdeveloper` |
