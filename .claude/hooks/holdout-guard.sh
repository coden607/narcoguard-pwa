#!/usr/bin/env bash
# Keeps every Claude session out of the factory's hidden scenarios (FACTORY_RULES.md 9). The checks
# still run inside factory/validate.sh; agents only ever see a count. Humans edit them outside Claude.
input="$(cat)"
if printf '%s' "$input" | grep -Eqi '\.factory/hold|holdout/(scenarios|fixtures)|factory/holdout'; then
  echo "Blocked: .factory/holdout is hidden from agents (FACTORY_RULES.md 9). Work from the issue and MISSION.md Gate 3." >&2
  exit 2
fi
exit 0
