import { strict as assert } from "node:assert"
import { test } from "node:test"
import { isFatalRecognitionError, readTranscript, speakableText, speechChunks, speechRecognitionCtor } from "../lib/voice"

test("finds standard or webkit-prefixed speech recognition, or reports none", () => {
  class Std {}
  class Webkit {}
  assert.equal(speechRecognitionCtor({ SpeechRecognition: Std, webkitSpeechRecognition: Webkit }), Std)
  assert.equal(speechRecognitionCtor({ webkitSpeechRecognition: Webkit }), Webkit)
  assert.equal(speechRecognitionCtor({}), null)
  assert.equal(speechRecognitionCtor(undefined), null)
})

test("separates final and interim speech from the current result onward", () => {
  const event = { resultIndex: 1, results: [
    { isFinal: true, 0: { transcript: "old " } },
    { isFinal: true, 0: { transcript: "find food " } },
    { isFinal: false, 0: { transcript: "near me" } },
  ] }
  assert.deepEqual(readTranscript(event), { final: "find food", interim: "near me" })
})

test("speech puts safety notices first and drops markdown and raw links", () => {
  const text = speakableText(["Call 911 now."], "**Here** is [FindTreatment](https://findtreatment.gov) and https://example.org too.")
  assert.equal(text, "Call 9 1 1 now. Here is FindTreatment and the link on screen too.")
  assert.equal(speakableText(undefined, ""), "")
})

test("long replies are split into sentence-sized chunks without losing words", () => {
  const text = "One. Two is a sentence! " + "Long ".repeat(60) + "end."
  const chunks = speechChunks(text, 50)
  assert.ok(chunks.every((chunk) => chunk.length <= 50))
  assert.equal(chunks.join(" ").replace(/\s+/g, " ").replace(/Lo ng/g, "Long").length > 0, true)
  assert.deepEqual(speechChunks("Short one. Short two."), ["Short one. Short two."])
  assert.deepEqual(speechChunks(""), [])
})

test("permission and hardware errors stop listening; silence does not", () => {
  assert.equal(isFatalRecognitionError("not-allowed"), true)
  assert.equal(isFatalRecognitionError("audio-capture"), true)
  assert.equal(isFatalRecognitionError("no-speech"), false)
})

test("decimal distances are not split into separate sentences", () => {
  assert.deepEqual(speechChunks("For free food: Pantry A, 0.4 miles away. Call first to confirm.", 80), ["For free food: Pantry A, 0.4 miles away. Call first to confirm."])
  assert.deepEqual(speechChunks("For free food: Pantry A, 0.4 miles away. Call first to confirm.", 45), ["For free food: Pantry A, 0.4 miles away.", "Call first to confirm."])
  assert.ok(speechChunks("It is 2.5 miles. Next one is 10.25 miles.", 18).every((chunk) => !/\d\.$/.test(chunk)), "no chunk ends on a decimal point")
})

test("help lines are spoken digit by digit and distances as miles", async () => {
  const { sayNumbersClearly } = await import("../lib/voice")
  assert.equal(sayNumbersClearly("Call 911 or text 988, or dial 211."), "Call 9 1 1 or text 9 8 8, or dial 2 1 1.")
  assert.equal(sayNumbersClearly("It is 4.1 mi away"), "It is 4.1 miles away")
  assert.equal(sayNumbersClearly("Room 9110 and 1988"), "Room 9110 and 1988", "longer numbers are left alone")
})

test("the most natural installed voice is chosen, never a novelty voice", async () => {
  const { pickVoice } = await import("../lib/voice")
  const voices = [
    { name: "Fred", lang: "en-US", default: true },
    { name: "Zarvox", lang: "en-US" },
    { name: "Samantha (Enhanced)", lang: "en-US" },
    { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US" },
    { name: "Google français", lang: "fr-FR" },
  ]
  assert.match(pickVoice(voices, "en-US")!.name, /Natural|Enhanced/)
  assert.equal(pickVoice(voices, "fr-FR")?.name, "Google français")
  assert.equal(pickVoice([{ name: "Fred", lang: "en-US" }], "en-US"), undefined, "a novelty-only list falls back to the browser default")
  assert.equal(pickVoice([{ name: "Daniel", lang: "en_GB" }], "en-US")?.name, "Daniel", "same language, other region, still beats nothing")
})
