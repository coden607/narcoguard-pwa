# Run Codex from iSH on iPhone or iPad

Current Codex CLI packages provide 64-bit Linux builds, while iSH emulates a
32-bit x86 Alpine environment. A direct installation in iSH therefore is not
supported. The included interactive installer uses iSH as a lightweight SSH
terminal and runs Codex on a supported 64-bit Linux computer.

## What you need

- iSH installed on the iPhone or iPad.
- A reachable 64-bit Linux SSH host: a VPS, home computer, or cloud workspace.
- Your SSH hostname/IP, username, and (initially) password or existing access.
- Node.js and npm on the remote host if you want the installer to install Codex.

## One-command launch

Download first, inspect the script, and then run it interactively:

```sh
apk add --no-cache curl
curl -fL https://raw.githubusercontent.com/Coden809/narcoguard-pwa/main/scripts/install-codex-ish.sh -o /tmp/install-codex-ish.sh
less /tmp/install-codex-ish.sh
sh /tmp/install-codex-ish.sh
```

The prompts create a dedicated SSH key, optionally authorize it on the remote
host, optionally install/update `@openai/codex`, and optionally install the
project's current Playwright browsers and Linux browser dependencies remotely.
The browser set includes Chromium (the Chrome-compatible engine), Firefox, and
WebKit. After setup, start an interactive remote Codex session with:

```sh
codex
```

Run the complete Playwright project remotely from iSH with:

```sh
browser-e2e
```

Open Playwright's interactive test runner and trace tools on the iPhone with:

```sh
browser-tools
```

Keep iSH open, then visit `http://127.0.0.1:9323` in Safari. The command uses
an SSH tunnel, so the testing interface is not exposed publicly. It includes
test steps, DOM snapshots, network activity, console output, screenshots,
videos, and Playwright traces when those artifacts are enabled by the project.

## About Chrome and F12 tools on iPhone

iSH cannot run desktop Chrome: it is a 32-bit emulated Linux userland without
an iOS GUI integration, and Apple does not provide desktop-style F12 tools in
iPhone browsers. Chrome on iPhone also uses Apple's browser engine rather than
the desktop Chrome binary. The installer therefore puts the full browsers on
the 64-bit remote host and securely exposes Playwright's browser tools to the
iPhone.

For debugging the actual Safari app on a physical iPhone, Apple's supported
workflow still requires Safari Web Inspector on a trusted Mac: enable Web
Inspector under **Settings → Apps → Safari → Advanced**, connect the iPhone to
the Mac, and select the page from Safari's **Develop** menu. Do not expose a
Chrome DevTools debugging port to the public internet.

The installer does not ask for or save an OpenAI API key. Authentication is
handled by Codex on the remote computer during its normal first-run flow.

## Keeping sessions alive

iOS may suspend iSH when it is backgrounded. For long-running work, install
`tmux` on the remote host and use it over SSH; then a suspended iSH app does not
terminate the remote shell. Never expose SSH directly without key-based access,
a firewall, and routine security updates.
