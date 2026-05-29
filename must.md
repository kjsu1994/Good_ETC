1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"

5. Repository Hygiene
Finish the work in the connected Git repository.

After completing and verifying a task:

Check `git status` and review the diff before committing.
Do not commit or push immediately after edits. Commit only after relevant checks pass.
If the change needs manual runtime confirmation, wait for the user's successful test confirmation before committing or pushing.
Commit only the files related to the user's request.
Push the finished commit to the connected GitHub repository unless the user explicitly says not to.
Use a concise Korean commit message that describes the user-visible change.
Never include unrelated local changes in the same commit.

6. Documentation Stays Current
README.md must match the current user-facing behavior.

When adding, removing, or modifying features:

Update `README.md` in the same change.
Keep setup steps, ports, shortcuts, command examples, environment variables, and diagrams accurate.
Document behavior that a user needs to understand, not internal implementation details.
If documentation is intentionally not updated, explain why before finishing.

7. Verification and Safety
Do the smallest meaningful verification before calling the task done.

Before finishing:

Run relevant checks, tests, or syntax validation when available.
Do not commit secrets, credentials, `.env`, generated data, or personal machine state.
If verification cannot be run, state exactly why and what risk remains.
Protect existing user data and unrelated changes.

8. Single-EXE User Experience
All future user-facing features must work from the standalone EXE.

When adding or changing features:

Assume the end user may only download and run `GoodETC_Launcher.exe`.
Do not require users to manually copy extra HTML, JS, CSS, Python, or asset files.
If a feature needs runtime files, servers, ports, or generated resources, bundle them into the EXE or have the EXE create them automatically.
The EXE must keep the dashboard and feature entry points working without visible command windows.
When a feature depends on LAN access, document the required port/firewall behavior and verify the EXE path, not only the source-file path.

9. Korean-First UI
All future user-facing UI must be Korean-first.

When adding or changing UI:

Use Korean labels, statuses, buttons, help text, errors, and empty states by default.
Use English only when it is a technical term, protocol name, API keyword, command, code value, or clearer than a forced Korean translation.
Keep mixed Korean/English text intentional and user-readable.
Do not leave new placeholder text, temporary labels, or developer-facing wording visible to users.
Every new user-facing feature screen must include a visible help control, such as a `?` icon button, that explains how a first-time user can use that screen.
Help text must describe user actions, required inputs, expected results, and relevant limits or cautions in Korean-first wording.
Place help controls consistently with nearby feature headers or controls so users can find them without reading documentation first.

10. Network Feature Connection Info
Features that use sockets, LAN, HTTP servers, WebSocket, file transfer, or other network communication must expose connection details where users naturally need them.

When adding or changing networked features:

Group socket/LAN/network communication features inside the LAN Center area/panel, not as separate buttons in the upper-left general tool dock.
Provide a clear way to view relevant connection info from the feature UI, such as an info button, compact details panel, or similar control.
Show the active port, target host/IP, share URL, WebSocket/HTTP endpoint, and the user's local/LAN-facing IP when that information is useful.
Warn when `localhost`, `127.x.x.x`, or `0.0.0.0` would not work for another PC.
Keep the connection info near the action that needs it, for example next to host/join/share controls.
Document any required firewall or LAN behavior in README.md when the behavior is user-facing.

11. Browser and EXE Runtime Parity
Users may run the app either as direct browser HTML or through the standalone EXE.

When adding or changing features:

Do not assume that pywebview, launcher query parameters, a local HTTP server, or `file://` access is always available.
Keep shared behavior working in both browser HTML and EXE whenever practical.
When an environment-specific capability exists only in one runtime, provide a useful fallback in the other runtime, such as manual host/port input, a generated share URL, or a clear status message.
Use explicit runtime detection and conservative defaults instead of silently depending on one environment.
If host, port, LAN IP, or server URL cannot be discovered automatically, fall back to user-provided values and safe defaults.
Verify both the browser/static path and the EXE path when the changed feature depends on runtime behavior; if one path cannot be verified, state the remaining risk.
