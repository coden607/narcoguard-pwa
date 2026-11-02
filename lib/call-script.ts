// What to say on a 911 call for a suspected overdose (#297). Short, plain lines a scared caller
// can read out loud. Changes need clinical review against the sources below.
export const CALL_SCRIPT_REVIEWED = "2026-11-02"

export const CALL_SCRIPT: { say: string; tip: string }[] = [
  { say: "Someone is not breathing and won't wake up.", tip: "Say this first. You do not need to say more to get help sent." },
  { say: "We are at…", tip: "Give the street address. Add the building, floor and unit. No address? Give cross streets or a landmark." },
  { say: "I gave naloxone.", tip: "Say how many doses and when. Say if they are breathing now." },
  { say: "Stay on the line.", tip: "Do what the dispatcher tells you. Do not hang up until they say so." },
]

export const CALL_SCRIPT_TEXT_NOTE =
  "Call if you can. If you can't talk, text 911. Texting does not work everywhere. If you get a message back that it failed, call."

export const CALL_SCRIPT_SOURCES = [
  { title: "SAMHSA: Overdose prevention and response toolkit", url: "https://library.samhsa.gov/product/overdose-prevention-response-toolkit/pep23-03-00-001" },
  { title: "CDC: Lifesaving naloxone", url: "https://www.cdc.gov/stop-overdose/caring/naloxone.html" },
  { title: "FCC: Text to 911, what you need to know", url: "https://www.fcc.gov/consumers/guides/what-you-need-know-about-text-911" },
]
