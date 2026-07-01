# Kibo — Architecture & Build Plan

This document is the source of truth for how Kibo (the desktop pet's
"do things on my OS" capability) is designed and built. Keep it in the
repo root or alongside `electron/` so the plan survives independent of
any single chat session.

---

## 1. Core idea

```
User → AI Brain → Planner → Skills → OS
```

Not:

```
User → Execute command
```

The AI never outputs raw shell strings. It outputs a structured
**intent** (`skillId + typed args`), which is validated and executed
through a single chokepoint — the **Skill Registry**. This is the one
decision everything else in this doc protects.

---

## 2. High-level flow

```
                    User
                      │
        ┌─────────────┴─────────────┐
   Voice Input                 Chat Input
        └─────────────┬─────────────┘
                      │
             Intent Recognition
                      │
      ┌───────────────┼────────────────┐
Conversation     Local Action      Knowledge
      │               │                │
   Memory        Task Planner      Retrieval
                      │
               Execution Planner
                      │
      ┌───────────────┼────────────────────────────┐
 Filesystem      Applications   Browser      Automation
      │               │             │              │
  OS Commands    Launch Apps     Control Tabs    Scripts
```

Renderer (React/desktop pet UI) never touches Node/OS directly — it
sends intents over IPC to the Electron **main process**, where the
Skill Registry lives.

---

## 3. Project structure

```
DESKTOP-PET/
├── electron/                       # main process
│   │ main.ts
│   │ preload.ts
│   │ bootstrap.ts                  # registers all skills
│   │
│   ├── models/
│   │      types.ts                 # Skill, SkillMetadata, SkillResult
│   │
│   ├── security/
│   │      ActionSchema.ts          # validateArgs() — arg validation
│   │      PermissionManager.ts     # confirmation gating
│   │      AuditLogger.ts           # (future) persists audit trail
│   │
│   ├── services/
│   │      SkillRegistry.ts         # THE chokepoint: register/execute
│   │      SystemService.ts         # (future, Step 4)
│   │
│   ├── adapters/                   # OS-specific implementations
│   │      WindowsAdapter.ts
│   │      MacAdapter.ts
│   │      LinuxAdapter.ts
│   │
│   ├── skills/
│   │      test/EchoSkill.ts        # pipeline-proving dummy skill
│   │      filesystem/              # Step 3
│   │      apps/                    # Step 4
│   │      clipboard/               # Step 4
│   │      system/                  # Step 4
│   │      utilities/               # Step 4
│   │
│   └── __test__/
│          registry.test.ts         # Step 1 checkpoint script
│
└── src/                            # existing renderer (untouched)
    ├── controllers/
    │      SystemActionController.ts   # (future) sends intents via bridge
    ├── services/
    │      AIService.ts                # (future) LLM → structured intent
    ├── models/
    │      types.ts                    # (future) ActionIntent types
    └── hooks/
           useElectronBridge.ts         # extend with skill:execute channel
```

---

## 4. The Skill contract

Every capability implements this interface (already built, Step 1):

```ts
interface Skill<TArgs, TData> {
  metadata: SkillMetadata;       // id, risk, undoable, requiresConfirmation, etc.
  validate(args: unknown): TArgs;
  execute(args: TArgs): Promise<SkillResult<TData>>;
  dryRun?(args: TArgs): Promise<DryRunResult>;
  undo?(args: TArgs, previousResult: SkillResult<TData>): Promise<SkillResult>;
}
```

`SkillMetadata` includes: `id`, `title`, `description`, `category`,
`risk` ("low"|"medium"|"high"), `undoable`, `requiresConfirmation`,
`supportsDryRun`, `timeout`, `version`, `tags`.

**Registration fails closed**: incomplete metadata, or a skill that
claims `supportsDryRun`/`undoable` but doesn't implement `dryRun()`/
`undo()`, is rejected at `register()` time — it can never load into a
half-safe state.

---

## 5. Full safety rule set

### Execution boundary
- No raw shell/command strings ever reach the AI or planner — only
  `skillId + typed args`.
- Skill whitelisting — planner can invoke *only* registered skills.
  Unknown intent → `"I don't know how to do that"`.
- Single chokepoint — only the Registry (and skills it calls) touch
  `child_process`/native APIs.
- `contextIsolation: true`, `nodeIntegration: false` — renderer has no
  direct Node access, only a narrow `window.electronAPI` surface via
  preload.

### Validation
- Typed schema per skill, validated *before* execution.
- Path sandboxing — canonicalize paths, reject `..` traversal, reject
  paths outside allowed roots unless explicitly widened.
- Preconditions — each skill declares requirements (tool installed,
  right context, network available); fails closed with a clear
  message.
- Confidence threshold — ambiguous targets get a clarifying question,
  not a guess.

### Risk classification
- Risk is **static registry metadata**, never inferred by the model at
  runtime.
- Human approval gates for medium/high risk: delete, overwrite-move,
  shutdown/restart, install/uninstall, running scripts, anything
  affecting >N items.
- Simulation/dry-run required for `risk >= medium` — show exact
  count/list of affected items before real execution.

### Reversibility
- Soft-delete first — route deletes through a trash library, never
  `fs.unlink` directly.
- Rollback support for move/rename/organize/extract/settings changes.
- Transactional multi-step plans — partial failure rolls back or is
  clearly reported, never silent.
- Idempotency — re-running the same plan must not double-damage.

### Control during execution
- Cancellation — user can interrupt at any point; aborts planner,
  kills child processes, rolls back where possible.
- Timeouts on every executed command (already enforced in
  `SkillRegistry.execute` via `withTimeout`).
- Concurrency locks on conflicting actions against the same resource.
- Resource limits (CPU/RAM/disk/concurrent processes) per skill.
- Planner budget — max steps, max wall-clock time, max external calls
  per plan.

### Secrets & network
- Secrets vault — API keys never pass through the LLM's context; a
  skill fetches its own credential locally.
- Offline/online separation — network-capable skill categories can be
  globally disabled by the user.

### Observability & trust
- Full audit log — every planned action logged with timestamp, args,
  result, duration (already built in `SkillRegistry`, in-memory for
  now; persistent storage is a Step 4/5 upgrade via
  `DatabaseService`/`StorageService`).
- Postconditions reported in real terms ("moved 37, skipped 2
  duplicates"), not "done."
- Progress streaming for long-running skills.
- Skill health checks at startup (which tools are actually available).

### Plugin/extensibility safety
- Plugin permission manifest — each skill/plugin declares what it
  needs (filesystem, network, clipboard, mic, camera).
- Skill versioning — old saved plans keep working when an
  implementation changes underneath.
- Capability graph, not flat list — groupable/toggle-able by category.

### Memory/context scoping
- Scope v1 actions to the current explicit instruction only — don't
  let the planner act on inferred long-term memory without
  re-confirming.
- Don't let conversational history silently expand permission scope
  (one approved delete ≠ blanket approval for the rest of the
  session).

### Fail-closed defaults
- Any skill with incomplete metadata cannot be registered (already
  enforced).
- If the registry, permission manager, or audit logger fails to
  initialize at startup, the whole execution pipeline refuses to run
  rather than falling back to an unguarded mode.

---

## 6. v1 skill scope

Deliberately excludes RobotJS (mouse/keyboard control) — postponed to
v2 due to the much larger trust surface it opens.

```
Filesystem
──────────
Read File · Write File · Create File · Rename File · Move File
Delete File (via Trash, never permanent in v1) · Search Files
Open Folder · Open File

Applications
────────────
Open App · Close App · List Installed Apps

Clipboard
─────────
Copy Text · Read Clipboard

System
──────
Battery · CPU · RAM · Storage · Processes

Utilities
─────────
Screenshot · Open URL · Timer · Notification
```

Implementation notes:
- Use `spawn`/`execFile`, never `exec()` with a shell string.
- Route deletes through a trash library (e.g. `trash` npm package).
- Use `systeminformation` for CPU/RAM/battery/storage.
- Use `desktopCapturer` for screenshots, `shell.openPath()` for
  opening files/folders, `electron.clipboard` for clipboard ops.
- Prefer user-oriented action names (`Create Note`, `Save File`) over
  exposing generic `filesystem.write` directly to the planner.

---

## 7. Five-step build plan

### Step 1 — Skill interface + Registry ✅ DONE
Built and verified: `models/types.ts`, `security/ActionSchema.ts`,
`security/PermissionManager.ts` (stub — auto-approves for now),
`services/SkillRegistry.ts`, `skills/test/EchoSkill.ts`,
`bootstrap.ts`, `__test__/registry.test.ts`.

Verified via `npx ts-node electron/__test__/registry.test.ts`:
happy path, missing required field, unknown field (rejected — fail
closed), and unknown skill id all handled cleanly with a full audit
trail, no uncaught exceptions.

**Not yet done:** real confirmation UI (`PermissionManager.confirm()`
currently always returns `true`).

### Step 2 — Electron IPC plumbing (main ↔ renderer) — NEXT
- `preload.ts` exposes `window.electronAPI.executeSkill(skillId, args)`
- `ipcMain.handle('skill:execute', ...)` in main → calls
  `skillRegistry.execute()`
- Verify `contextIsolation: true`, `nodeIntegration: false`
- Done when: `test.echo` can be triggered from the renderer and the
  result returns through IPC.

### Step 3 — Filesystem skills (hardest trust surface, build first among skill types)
- Read/Write/Create/Rename/Move/Search/Open Folder/Open File
- Delete → routed through trash library, never `fs.unlink`
- Path sandboxing, size limits on reads, overwrite confirmation
- Dry-run for Move/Delete/Rename
- Done when: move/delete/rename work with confirmation + trash, and
  it's provably impossible to touch a path outside the allowed root.

### Step 4 — Apps, Clipboard, System, Utilities skills
- Apps via per-OS adapters (Windows/Mac at minimum)
- Clipboard via `electron.clipboard`
- System via `systeminformation`
- Utilities: Screenshot, Open URL, Timer, Notification
- Done when: all v1 skills are registered, callable, with correct
  risk levels set.

### Step 5 — Planner + AI intent layer
- `AIService` prompts the model for structured JSON matching a skill
  call — never freeform text-to-shell
- Planner calls `registry.listSkills()` for available capabilities,
  produces a plan (single skill call for v1)
- Confirmation gate: `requiresConfirmation: true` skills show dry-run
  result and wait for explicit user yes
- Audit log persisted via existing `DatabaseService`/`StorageService`
- Done when: "delete all PDFs in Downloads" → planner picks
  `filesystem.delete` → dry-run shows count/list → user confirms →
  trash-deletes → result reported back in chat.

---

## 8. Open decisions / things to revisit later

- Whether to add zod (or similar) in place of the hand-rolled
  `validateArgs` once schemas get more complex (unions, nested
  objects).
- Persistent audit log storage — currently in-memory only in the
  Registry; needs to move to `DatabaseService`/`StorageService` by
  Step 5.
- Real confirmation UX — chat-based yes/no vs. a native dialog.
- RobotJS — revisit for v2 once v1 trust patterns (dry-run, confirm,
  undo, audit) are proven out.
