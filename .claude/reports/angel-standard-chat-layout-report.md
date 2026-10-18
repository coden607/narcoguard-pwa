# Implementation Report — Angel standard chat layout

**Branch**: feat/angel-standard-chat-layout  
**Status**: COMPLETE pending CI

## Summary
Reworks Angel AI into a conventional LLM chat layout. Voice/location/planning controls now sit above the transcript, the conversation history occupies the main scroll region, and a sticky multiline composer sits immediately beneath it.

## Tasks completed
- Moved non-chat controls above the transcript.
- Added dedicated transcript and composer test IDs.
- Replaced the single-line message field with a multiline composer.
- Added Enter-to-send and Shift+Enter-for-new-line behavior.
- Kept clear-conversation behavior synchronized with the in-memory message ref.
- Added a regression test for transcript/composer ordering.

## Validation
Pending exact-head CI, PWA smoke, quality, Lighthouse, and Vercel preview.

## Deviations
Conversation persistence remains unchanged: chat history is still in-memory only and disappears when the page is left, preserving the existing privacy behavior.
