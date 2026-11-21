# Recovery Sleep

**Status:** opt-in wellness feature in the PWA (`/recovery-sleep`), default off. The watch-side support described below is a concept that has not been built or tested.

Recovery Sleep is not a medical device. It does not diagnose or treat insomnia or any sleep disorder, and it does not prevent or reverse an overdose.

## Why

Sleep problems are common and persistent during opioid withdrawal and recovery, including for people on methadone or buprenorphine, and poor sleep travels with craving, stress, pain and worse treatment outcomes ([Huhn & Finan, *Sleep disturbance as a therapeutic target to improve opioid use disorder treatment*](https://pmc.ncbi.nlm.nih.gov/articles/PMC8660927/); [Dunn et al., *Frequency and correlates of sleep disturbance in methadone and buprenorphine-maintained patients*](https://pmc.ncbi.nlm.nih.gov/articles/PMC5614840/)). Whether improving sleep directly reduces return to use is still an open research question, so NarcoGuard makes no such claim.

The idea comes from Dan Gartenberg's TED talk [*The brain benefits of deep sleep, and how to get more of it*](https://www.ted.com/talks/dan_gartenberg_the_brain_benefits_of_deep_sleep_and_how_to_get_more_of_it): play quiet sounds timed to deep-sleep (slow-wave) brain activity, and track sleep.

## What the evidence does and doesn't say

- In the lab, 50 ms pink-noise pulses timed by EEG to the up-state of slow oscillations increased slow-wave activity and overnight word-pair recall in 11 young adults; pulses out of phase did not ([Ngo et al., 2013, *Neuron* 78:545-553](https://doi.org/10.1016/j.neuron.2013.03.006)).
- A phase-locked-loop version with five-pulse ON blocks and equal OFF pauses raised slow-wave activity during ON blocks and improved recall in 13 older adults ([Papalambros et al., 2017, *Front. Hum. Neurosci.* 11:109](https://doi.org/10.3389/fnhum.2017.00109)).
- Effects are small and inconsistent across studies: a meta-analysis found a pooled memory effect of g = 0.25 (p = 0.07) and concluded the evidence does not support recommending consumer devices ([Wunderlin et al., 2021, *Sleep* zsaa296](https://doi.org/10.1093/sleep/zsaa296)); a later meta-analysis found effect sizes declining by publication year ([Frontiers in Sleep, 2023](https://www.frontiersin.org/journals/sleep/articles/10.3389/frsle.2023.1082253/full)).
- Steady white or pink noise for sleep has weak evidence but no reported short-term harms ([Capezuti et al., 2022, *J Clin Sleep Med*](https://pmc.ncbi.nlm.nih.gov/articles/PMC9163611/)).
- **All of these studies used EEG.** A phone or watch cannot measure slow waves, so the PWA's pulse mode is labelled experimental and only approximates timing.

## The safety problem, and the gate

NarcoGuard exists to catch opioid overdose. During opioid-induced respiratory depression, waking up is one of the things that restores breathing; opioids already raise the threshold for arousal and disturb breathing in non-REM sleep ([Bateman et al., *Understanding and countering opioid-induced respiratory depression*](https://pmc.ncbi.nlm.nih.gov/articles/PMC8997313/); [*Opioid use disorder, sleep deficiency, and ventilatory control*](https://pmc.ncbi.nlm.nih.gov/articles/PMC9801989/); [*Obstructive sleep apnea, pain, and opioids*](https://pmc.ncbi.nlm.nih.gov/articles/PMC4927322/)). Anything meant to deepen sleep therefore has to step aside whenever overdose is possible. The rules live in `lib/recovery-sleep.ts` (`detectRiskFlags`, `evaluateSleepGate`) and are unit-tested in `tests/feature-recovery-sleep.test.ts`:

1. **Off by default.** Nothing plays until the person turns Recovery Sleep on for this device.
2. **Check-in before every session:** "Have you used opioids or sedatives in the last 24 hours?" No audio until it is answered. The answer is never stored or sent, and it is asked again next session.
3. **Recent use = plain sound only.** A "yes" allows only steady pink noise at a lower volume cap (12% instead of 30%). The timed-pulse mode is unavailable.
4. **Any risk signal blocks and stops all audio:** an overdose-risk result from the vitals service (anything other than "none / monitor"), breathing rate below 10/min, a current blood-oxygen reading below 92%, a current heart rate below 40, a watch low-motion alert, any other NarcoGuard alert, or the wake-up alarm. Stopping is a hard cut (gain to zero, sources stopped, audio context closed) within about a second of the signal reaching the page.
5. **Monitoring is never touched.** Recovery Sleep only reads vitals; it does not pause, mute or delay monitoring, alerts or contacts.
6. **Bounded:** volume caps, a sleep timer (5 to 480 minutes), and the experimental pulses run only in the first 3 hours after estimated sleep onset and pause for 10 minutes after a heart-rate rise.

## Watch-side concept

How the NarcoGuard watch's existing sensors could support Recovery Sleep. Public concept only; detailed hardware engineering stays private.

- **Motion sensor.** Wrist movement (actigraphy) can estimate sleep onset and wake times better than a fixed timer, and can pause pulses when the wearer stirs. A long period of unusual stillness combined with abnormal vitals is an overdose-risk input, and the watch would raise that as an alert that overrides Recovery Sleep.
- **Heart-rate sensor.** A settling heart rate helps estimate sleep onset; a rise suggests arousal and pauses pulses. Very low heart rate or low blood oxygen are risk signals that stop all sleep audio.
- **Speaker.** The watch speaker could play the quiet pink-noise bed and pulses so no phone is needed at the bedside, and it is the same speaker used for alarms, so an alert always replaces sleep sound on the same device.
- **Priority rule on the watch:** overdose detection and alerts first, wake-up alarm second, sleep sound last. The watch firmware would enforce the same gate as the PWA.
- **What the watch still can't do:** without EEG it cannot see slow waves, so any timing remains an approximation.

## Privacy

The opt-in choice and the sleep log are stored only in the browser (`localStorage`). The recent-use answer is kept in memory for one session. Nothing is sent to Heroes, contacts, Angel or analytics.
