import { strict as assert } from "node:assert"
import { test } from "node:test"
import { ATTEMPT_TTL_MS, issueAttempt, issueCertificate, markGraded, verify, verifyCertificate } from "../lib/hero-certification"
import { HERO_BANK, QUESTIONS_PER_ATTEMPT, drawQuestions, gradeAttempt } from "../lib/hero-test-bank"

const SECRET = "x".repeat(40)
const key = Object.fromEntries(HERO_BANK.map((question) => [question.id, question.answer]))

test("the bank is well formed: unique ids, four options, one valid answer, an explanation", () => {
  assert.ok(HERO_BANK.length >= QUESTIONS_PER_ATTEMPT * 2, "enough questions for varied draws")
  assert.equal(new Set(HERO_BANK.map((question) => question.id)).size, HERO_BANK.length)
  for (const question of HERO_BANK) {
    assert.equal(question.options.length, 4, question.id)
    assert.equal(new Set(question.options.map((option) => option.id)).size, 4, question.id)
    assert.ok(question.options.some((option) => option.id === question.answer), question.id)
    assert.ok(question.why.length > 20, question.id)
  }
})

test("draws are random, never include answers, and shuffle options", () => {
  const draws = Array.from({ length: 20 }, () => drawQuestions())
  for (const draw of draws) {
    assert.equal(draw.length, QUESTIONS_PER_ATTEMPT)
    assert.ok(!JSON.stringify(draw).includes("\"answer\"") && !JSON.stringify(draw).includes("\"why\""))
  }
  assert.ok(new Set(draws.map((draw) => draw.map((q) => q.id).join())).size > 1)
  assert.ok(draws.some((draw) => draw.some((q) => q.options[0].id !== "a")), "correct answer is not always first")
})

test("only a perfect score passes", () => {
  const ids = drawQuestions().map((question) => question.id)
  const perfect = Object.fromEntries(ids.map((id) => [id, key[id]]))
  assert.equal(gradeAttempt(ids, perfect)?.passed, true)
  const oneWrong = { ...perfect, [ids[0]]: perfect[ids[0]] === "a" ? "b" : "a" }
  const grade = gradeAttempt(ids, oneWrong)!
  assert.equal(grade.passed, false)
  assert.equal(grade.correct, QUESTIONS_PER_ATTEMPT - 1)
  assert.deepEqual(grade.missed.map((item) => item.id), [ids[0]])
  const { [ids[1]]: _skipped, ...unanswered } = perfect
  void _skipped
  assert.equal(gradeAttempt(ids, unanswered)?.passed, false, "a blank answer is wrong")
  assert.equal(gradeAttempt(ids.slice(1), perfect), null, "short attempts are refused")
  assert.equal(gradeAttempt([...ids.slice(1), ids[1]], perfect), null, "repeated questions are refused")
  assert.equal(gradeAttempt([...ids.slice(1), "made-up"], perfect), null)
})

test("attempts and certificates are signed, expire, and are single-use", () => {
  const { token, attempt } = issueAttempt(["a", "b"], SECRET)
  assert.deepEqual(verify(token, SECRET, "attempt")?.q, ["a", "b"])
  assert.equal(verify(token, "y".repeat(40), "attempt"), null, "another secret fails")
  assert.equal(verify(token, SECRET, "attempt", Date.now() + ATTEMPT_TTL_MS + 1000), null, "expired")
  assert.equal(verify(token.replace(/^eyJ/, "eyK"), SECRET, "attempt"), null, "tampered")
  assert.equal(verify(token, SECRET, "hero"), null, "an attempt is not a certificate")
  assert.equal(markGraded(attempt.id), true)
  assert.equal(markGraded(attempt.id), false, "grading twice is refused")

  const certificate = issueCertificate(attempt.id, SECRET)
  assert.ok(verifyCertificate(certificate.token, SECRET))
  assert.equal(verifyCertificate(certificate.token, SECRET, Date.now() + 366 * 24 * 3600 * 1000), null, "certificates expire after a year")
})

test("the answer key is only imported by server code", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs")
  const { join } = await import("node:path")
  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(ts|tsx)$/.test(name) && readFileSync(path, "utf8").includes("hero-test-bank") && (readFileSync(path, "utf8").includes("\"use client\"") || !path.includes(join("app", "api")) && !path.startsWith("lib"))) offenders.push(path)
    }
  }
  for (const dir of ["app", "components", "lib"]) walk(dir)
  assert.deepEqual(offenders, [])
})
