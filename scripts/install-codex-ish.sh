#!/bin/sh
# Interactive Codex bootstrap for iSH (Alpine Linux on iPhone/iPad).
#
# Modern Codex CLI releases do not ship an iSH/i686 binary. This installer
# therefore makes the iPhone a thin SSH client and runs Codex on a supported
# 64-bit Linux host while keeping the interactive terminal experience in iSH.

set -eu

say() { printf '%s\n' "$*"; }
die() { printf 'Error: %s\n' "$*" >&2; exit 1; }
prompt() {
  label=$1
  default=${2-}
  if [ -n "$default" ]; then
    printf '%s [%s]: ' "$label" "$default"
  else
    printf '%s: ' "$label"
  fi
  IFS= read -r answer
  REPLY=${answer:-$default}
}
confirm() {
  printf '%s [y/N]: ' "$1"
  IFS= read -r answer
  case $answer in y|Y|yes|YES) return 0 ;; *) return 1 ;; esac
}

[ -t 0 ] || die "run this script interactively (do not pipe it directly into sh)"

cat <<'BANNER'

Codex for iSH
=============
iSH emulates 32-bit x86, for which the current Codex CLI has no native build.
This setup gives you a `codex` command in iSH that opens Codex over SSH on a
64-bit Linux computer (a VPS, home server, Mac/Linux PC, or cloud workspace).

You need the SSH hostname/IP and login name for that computer.
BANNER

if command -v apk >/dev/null 2>&1; then
  say "Installing the small iSH-side prerequisites..."
  apk add --no-cache openssh-client ca-certificates >/dev/null
else
  say "Note: this does not look like iSH/Alpine; continuing without apk."
fi

prompt "SSH host or IP"
REMOTE_HOST=$REPLY
[ -n "$REMOTE_HOST" ] || die "an SSH host is required"
prompt "SSH user" "$(id -un)"
REMOTE_USER=$REPLY
prompt "SSH port" "22"
REMOTE_PORT=$REPLY
prompt "Short connection name (letters, numbers, _ or -)" "codex-host"
HOST_ALIAS=$REPLY
prompt "Remote project folder (blank starts in your remote home)" ""
REMOTE_DIR=$REPLY

case $REMOTE_PORT in *[!0-9]*|'') die "SSH port must be a number" ;; esac
case $HOST_ALIAS in *[!A-Za-z0-9_-]*|'') die "connection name contains unsupported characters" ;; esac
case $REMOTE_HOST in *[!A-Za-z0-9._:-]*|'') die "host contains unsupported characters" ;; esac
case $REMOTE_USER in *[!A-Za-z0-9._-]*|'') die "user contains unsupported characters" ;; esac

SSH_DIR=$HOME/.ssh
CONFIG=$SSH_DIR/config
KEY=$SSH_DIR/codex_ish_ed25519
mkdir -p "$SSH_DIR" "$HOME/bin"
chmod 700 "$SSH_DIR"

if [ ! -f "$KEY" ]; then
  say "Generating a dedicated SSH key (you may leave its passphrase blank)..."
  ssh-keygen -t ed25519 -f "$KEY" -C "codex-ish" || die "could not generate SSH key"
fi

if ! grep -q "^Host $HOST_ALIAS$" "$CONFIG" 2>/dev/null; then
  cat >>"$CONFIG" <<EOF

# Added by install-codex-ish.sh
Host $HOST_ALIAS
  HostName $REMOTE_HOST
  User $REMOTE_USER
  Port $REMOTE_PORT
  IdentityFile $KEY
  ServerAliveInterval 30
  ServerAliveCountMax 3
EOF
  chmod 600 "$CONFIG"
else
  say "Keeping the existing SSH entry named '$HOST_ALIAS'."
fi

say ""
say "Your public key must be authorized on the remote computer."
if confirm "Copy it now? (You may be asked for the remote account password)"; then
  if command -v ssh-copy-id >/dev/null 2>&1; then
    ssh-copy-id -i "$KEY.pub" "$HOST_ALIAS"
  else
    cat "$KEY.pub" | ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" \
      'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys'
  fi
fi

say "Testing the connection..."
ssh -t "$HOST_ALIAS" 'printf "Connected to %s (%s).\n" "$(hostname)" "$(uname -m)"'

if confirm "Install or update Codex on the remote computer now?"; then
  ssh -t "$HOST_ALIAS" 'sh -s' <<'REMOTE_INSTALL'
set -eu
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm is required on the remote host."
  echo "Install a current Node.js LTS release there, then run this installer again."
  exit 1
fi
machine=$(uname -m)
case $machine in x86_64|amd64|aarch64|arm64) ;; *)
  echo "Unsupported remote architecture: $machine (use x86_64 or arm64)." >&2
  exit 1
esac
echo "Installing @openai/codex with npm..."
if npm install -g @openai/codex; then :
elif command -v sudo >/dev/null 2>&1; then sudo npm install -g @openai/codex
else
  echo "Global npm install was denied and sudo is unavailable." >&2
  echo "Configure a user-owned npm prefix, then retry." >&2
  exit 1
fi
codex --version
REMOTE_INSTALL
fi

if confirm "Install the remote browser/E2E lab (Chrome-compatible Chromium, Firefox, WebKit, and Playwright)?"; then
  [ -n "$REMOTE_DIR" ] || die "a remote project folder is required for browser/E2E setup"
  quoted_remote_dir=$(printf "'%s'" "$(printf %s "$REMOTE_DIR" | sed "s/'/'\\\\''/g")")
  ssh -t "$HOST_ALIAS" "sh -s -- $quoted_remote_dir" <<'REMOTE_BROWSERS'
set -eu
project_dir=$1
cd -- "$project_dir"
[ -f package.json ] || {
  echo "No package.json found in $project_dir; enter the remote project folder and retry." >&2
  exit 1
}
command -v npm >/dev/null 2>&1 || {
  echo "Node.js/npm is required on the remote host." >&2
  exit 1
}

echo "Installing the locked project dependencies..."
if [ -f package-lock.json ]; then npm ci; else npm install; fi

echo "Installing current Playwright browsers and Linux browser libraries..."
if npx playwright install --with-deps chromium firefox webkit; then :
else
  echo "Automatic system-library installation failed; retrying with sudo." >&2
  command -v sudo >/dev/null 2>&1 || exit 1
  sudo npx playwright install-deps chromium firefox webkit
  npx playwright install chromium firefox webkit
fi

npx playwright --version
echo "Browser lab ready. Chromium provides the Chrome-compatible DevTools engine."
REMOTE_BROWSERS
fi

WRAPPER=$HOME/bin/codex
if [ -e "$WRAPPER" ] && [ ! -f "$WRAPPER" ]; then
  die "$WRAPPER exists and is not a regular file; refusing to replace it"
fi
cat >"$WRAPPER" <<EOF
#!/bin/sh
set -eu
REMOTE_DIR=$(printf "'%s'" "$(printf %s "$REMOTE_DIR" | sed "s/'/'\\\\''/g")")
quote_remote() {
  printf "'%s'" "\$(printf %s "\$1" | sed "s/'/'\\\\\\\\''/g")"
}
if [ -n "\$REMOTE_DIR" ]; then
  remote_command="cd -- \$(quote_remote "\$REMOTE_DIR") && exec codex"
else
  remote_command="exec codex"
fi
for argument do
  remote_command="\$remote_command \$(quote_remote "\$argument")"
done
exec ssh -t $HOST_ALIAS "\$remote_command"
EOF
chmod 700 "$WRAPPER"

E2E_WRAPPER=$HOME/bin/browser-e2e
cat >"$E2E_WRAPPER" <<EOF
#!/bin/sh
set -eu
REMOTE_DIR=$(printf "'%s'" "$(printf %s "$REMOTE_DIR" | sed "s/'/'\\\\''/g")")
quote_remote() {
  printf "'%s'" "\$(printf %s "\$1" | sed "s/'/'\\\\\\\\''/g")"
}
[ -n "\$REMOTE_DIR" ] || {
  echo "No remote project folder was configured; rerun the installer." >&2
  exit 1
}
remote_command="cd -- \$(quote_remote "\$REMOTE_DIR") && exec npx playwright test"
for argument do
  remote_command="\$remote_command \$(quote_remote "\$argument")"
done
exec ssh -t $HOST_ALIAS "\$remote_command"
EOF
chmod 700 "$E2E_WRAPPER"

UI_WRAPPER=$HOME/bin/browser-tools
cat >"$UI_WRAPPER" <<EOF
#!/bin/sh
set -eu
REMOTE_DIR=$(printf "'%s'" "$(printf %s "$REMOTE_DIR" | sed "s/'/'\\\\''/g")")
quote_remote() {
  printf "'%s'" "\$(printf %s "\$1" | sed "s/'/'\\\\\\\\''/g")"
}
[ -n "\$REMOTE_DIR" ] || {
  echo "No remote project folder was configured; rerun the installer." >&2
  exit 1
}
printf '%s\n' "Open http://127.0.0.1:9323 in Safari on this iPhone." \
  "Keep iSH in the foreground while using the Playwright test/trace UI." \
  "Press Ctrl-C here when finished."
remote_command="cd -- \$(quote_remote "\$REMOTE_DIR") && exec npx playwright test --ui-host=127.0.0.1 --ui-port=9323"
exec ssh -t -L 9323:127.0.0.1:9323 $HOST_ALIAS "\$remote_command"
EOF
chmod 700 "$UI_WRAPPER"

case :$PATH: in *:$HOME/bin:*) ;; *)
  PROFILE=$HOME/.profile
  printf '\n# Added by install-codex-ish.sh\nexport PATH="$HOME/bin:$PATH"\n' >>"$PROFILE"
  export PATH="$HOME/bin:$PATH"
esac

cat <<EOF

Setup complete.

Start Codex with:
  codex

Run the remote Playwright suite or open its browser tools with:
  browser-e2e
  browser-tools

On the first run, follow Codex's sign-in prompt. Credentials remain on the
remote host; this script never requests or stores an OpenAI API key.

If iOS suspends iSH, reconnect simply by running `codex` again. For resilient
long jobs, install tmux on the remote computer and start Codex inside tmux.
EOF
