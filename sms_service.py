"""Placeholder SMS Service Module.

Standard placeholder implementation replacing Twilio SMS across repositories.
Logs outbound SMS messages to stdout and maintains zero external Twilio dependencies.
"""

from __future__ import annotations

import sys


def send_sms(to: str, message: str) -> None:
    """Send an SMS message by logging its destination and body to stdout.

    Args:
        to: The destination phone number in E.164 or local format.
        message: The text content of the message.
    """
    if not isinstance(to, str):
        to = str(to)
    if not isinstance(message, str):
        message = str(message)
    sys.stdout.write(f"[SMS] To: {to} | Message: {message}\n")
    sys.stdout.flush()


if __name__ == "__main__":
    send_sms("+16075550199", "Test placeholder SMS message")
