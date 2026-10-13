# Change record: Discovery voice call and Agentix team floor

Date: 2026-10-11 · Demo branch `claude/demo-voice-call-team-floor-20261011` · Base: demo commit `6f7673d`, the commit the portal refactor (`max-ai-platform` `docs/implementation/2026-09-23-portal-ui-demo-refactor/`) is pinned to.

This record says what the demo did before, what it does now, and what each change means for the real product's implementation plans. It is written for the people who amend those plans. Everything in the demo is still simulated in the browser: no microphone audio leaves the page, no system is called, and the people and figures are synthetic.

Screenshots: `before/` was captured from `6f7673d` and `after/` from this branch, both at 1440 × 900.

## Contents

1. [Summary](#1-summary)
2. [Discovery: the owner interview becomes a call](#2-discovery-the-owner-interview-becomes-a-call)
3. [Discovery: the stakeholder interviews become visible](#3-discovery-the-stakeholder-interviews-become-visible)
4. [Agentix: the team floor](#4-agentix-the-team-floor)
5. [The shared voice layer](#5-the-shared-voice-layer)
6. [What did not change](#6-what-did-not-change)
7. [Impact on the real product's plans](#7-impact-on-the-real-products-plans)
8. [Verification](#8-verification)
9. [Open questions](#9-open-questions)
10. [Agentix polish: type, glyphs and room (2026-10-12)](#10-agentix-polish-type-glyphs-and-room-2026-10-12)

---

## 1. Summary

| Surface | Before | After |
| --- | --- | --- |
| Owner interview | A text chat. A secondary **Voice** button opened a full-viewport modal: a spinning orb, the bare question in the browser's voice, press the mic, then press Send. The presenter's **Fill answer** could not reach the modal. | A **call with MAX**, offered first ("Talk it through with MAX · Start the call"). MAX greets the owner, speaks its whole reply, and listens hands-free (a pause sends). The orb answers to sound and has a ring of the six topics. **What MAX heard** fills as the owner talks. A source the owner points at is read during the call. **Fill answer** arrives as speech. The call ends on a summary. |
| MAX's interview replies | One template: "I'm treating '…' as the working position on {topic}." | In the customer demos, a written reply to each scripted answer (paraphrase, why it matters, next question). Elsewhere the template is unchanged. The close now says what MAX does next. |
| Interview record | Messages only. | Each answer also records a **fact**: label, value, and a status of captured, gap, checking, early or verified. Facts persist with the Discovery and show in the Thread's Details. |
| Stakeholder interviews | A count that went from 0 to 4 in about three seconds, then "Done". | **"MAX is talking to 4 stakeholders"**: one column per person with the exchange as it happens and what MAX took from it. A bracket joins the two people who disagree; that disagreement becomes the Discovery's decision. |
| Stakeholder link page | Text only, even for a stakeholder whose channel is Voice. | **Start by voice** for voice-channel stakeholders: the same orb, spoken questions, a topic ring and suggested answers. The text interview is unchanged. |
| Agentix deployed engagement | Opened on **Work** (lists), with the team as four text rows in an aside. Clicking a teammate opened its milestone, and every message went to the accountable agent. | Opens on the **Floor**, a live view of the team as one calm hierarchy: you, the accountable agent, the specialists in a row, and the systems they may use along the bottom. Only the team's lines are always drawn. Work at a system lights its line while it happens, work handed between specialists travels along the team's lines, decisions climb to you, failed checks and release read-backs show on the seats, and the team assembles on activation. |
| Talking to agents | The accountable agent only. | Every teammate has a **room** where you can talk to it. A specialist answers for its own work and routes steering to the accountable agent. Nobody can approve or release from chat. |
| Voice in Agentix | None. | **Talk to the team**: ask out loud, the coordinator answers, and each teammate's seat lights up as it is named. A spoken **Morning briefing** plays after a verified cycle. |
| MAX's voice | The browser's speech synthesis. | Pre-rendered ElevenLabs clips with word timings when rendered (`pnpm voice:render`). Otherwise the browser's voice, then captions. Silent under test automation. |

---

## 2. Discovery: the owner interview becomes a call

### 2.1 Before

| | |
| --- | --- |
| ![Thread at question 1](before/01-discovery-thread-owner-interview.jpg) | ![Voice consent](before/02-voice-consent.jpg) |
| ![Voice ready](before/03-voice-ready.jpg) | ![Voice mid-interview](before/04-voice-mid-interview.jpg) |

**Flow**
- Create Discovery → Preparing → the Thread opens on question 1 of 6. The toolbar's action was "Answer question", which focused the text composer.
- Voice was a ghost **Voice** button in the composer. It opened a modal (portalled to `document.body`, everything else inert) with a consent screen, then a call screen.

**Call behaviour**
- MAX read only the bare question (`message.prompt`), never its acknowledgement, using `speechSynthesis` at rate 0.96.
- Turn-taking was manual. The owner pressed the mic, spoke into Web Speech recognition, then pressed **Send**. Nothing sent on a pause, and the mic did not reopen after MAX spoke.
- The orb was a CSS conic pinwheel that turned on a fixed 1.8 s breathe. It did not react to sound.
- The right panel showed the last four messages, plus a text field ("Your response") and **Send response**.
- The presenter dock's **Fill answer** wrote into the Thread composer only. With the modal open the page was inert, so a presenter could not drive voice.

**Content**
- MAX's reply to every answer was a template: "I'm treating '{owner's words}' as the working position on {topic}. {evidence hint}". A named source produced "I'll verify {topic} in {source} instead of asking you to guess."
- The close read: "That gives me enough owner context for this pass. I've closed the interview, preserved the conversation…".
- No record of what MAX understood beyond the messages themselves.

### 2.2 After

| | |
| --- | --- |
| ![Thread call invitation](after/01-thread-call-invitation.jpg) | ![Call consent](after/02-call-consent.jpg) |
| ![MAX speaking](after/03-call-max-speaking.jpg) | ![Owner speaking](after/04-call-owner-speaking.jpg) |
| ![Early signal from the ledger](after/05-call-early-signal.jpg) | ![Call complete](after/06-call-complete.jpg) |
| ![What MAX heard in the Thread's Details](after/09-thread-details-what-max-heard.jpg) | ![The call on a phone](after/19-call-phone.jpg) |

**Entry: voice-first, never voice-forced**
- The Thread's interview callout is now a call invitation: a small orb, "Talk it through with MAX", "6 questions, about 4 minutes", and **Start the call**.
- The composer's **Voice** button opens the same call. Typing still works throughout.
- The presenter dock's interview step offers **Start the call** beside **Fill answer** (`DemoStep.secondary`). It works from any module and after a reload: the dock dispatches `DEMO_CALL_EVENT`, and the Discovery opens that record's Thread, then the call once that record is the open one (switching records otherwise ends a call).
- Why not open the call automatically: it would make the composer inert and break the presenter's keyboard path. "Voice-first" is the invitation and the dock's second action.

**Where the call lives**
- It covers the Discovery module, not the whole viewport.
- The platform sidebar stays visible and usable, so the presenter dock works during a call. Only the Discovery's own content is inert.
- It renders inside the Discovery root (`.vc-layer`, z-index `--ds-z-call` = 50, under the sidebar's 60). The Discovery content it covers is inert and unpainted (`visibility: hidden`) until it closes.
- It is a **non-modal** dialog: Tab can leave it for the sidebar and the presenter dock, which stay usable, and Escape or **End call** closes it. Focus returns to whatever opened it.
- In the standalone `/discovery-prototype` route it is fixed to the viewport.

**Turns** (`VoiceCall.tsx` keeps phase `consent → live → complete`; turns are `speaking → listening → thinking → speaking …`)

1. **Consent.** Same copy as before ("Continue this interview by voice", "does not retain the original audio"), plus "Hands-free: pause when you're done and MAX answers". **Continue with voice** starts the call and opens a microphone level meter (`getUserMedia`, echo cancellation on) for the orb. If the call ends while the browser is still asking for the microphone, the stream is released as soon as it arrives.
   An answer typed on the consent screen is sent as a typed answer; MAX's reply lands in the transcript and the field reopens.
2. **MAX speaks first** (`callOpener`): "Hi, I'm MAX. I'll lead this as the {interviewer}, and I'll keep it to 6 questions: I've already connected 4 sources, so I'll only ask for judgement the records can't give me. {question}". Reopened mid-interview, it says "Welcome back. We're on question 3 of 6, tolerance. {question}".
3. **Captions follow the voice.** Spoken words are full ink and the rest a lighter grey (the subtle text colour, which still meets contrast).
4. **Hands-free (default).** When MAX finishes, the mic opens. Speech recognition writes the live transcript into the "Your response" field, and about 1.2 s of silence after real words sends it.
5. **Push to talk** is the other mode (the switch is in the call toolbar and remembered per browser). Pressing the mic again sends.
6. **Thinking.** The orb draws in and a highlight circles it. The owner's last words stay on stage. If the answer pointed at a source, a chip shows MAX reading it: "Reading Billing ledger sample · 4,812 invoices".
7. **MAX speaks its whole reply**: the acknowledgement, then the next question. Before, only the question was spoken.
8. **Interrupting**
   - Press the mic, or start typing, while MAX speaks: MAX stops and the owner has the turn.
   - Voice barge-in (a sustained mic level over MAX) is enabled only when MAX's audio is a recorded clip, which the browser's echo cancellation can subtract. The browser's own speech voice plays outside the page, so the mic would hear MAX and interrupt it.
9. **The close.** MAX speaks the closing reply, then the stage shows "Interview complete · 5 positions captured, 1 kept open". It says what happens next ("MAX reads the 4 connected sources and talks to Olivia Hart, Grace Chen, Sam Okafor and Tom Whitfield…") and offers **Watch MAX work** (opens Autonomy) or **Keep talking** (mission conversation). Focus moves to **Watch MAX work**, since the microphone button it was on leaves with the live call.

**Controls** (one floating toolbar, the stage's only lifted element)
- Mute and Captions.
- Hands-free / Push to talk.
- **Type instead**: focuses the field and stops listening, and stops a presenter's simulated answer where it is.
- **End call**.
- The top bar carries Back ("Close voice session"), the title, "Question n of 6", Live or Typing only, the call clock, and "Audio not kept".

**The orb** (`VoiceOrb`)
- A canvas sphere in MAXION teal, built from the `--ds-orb-*` tokens.
- One look per turn:
  - idle breathes;
  - listening ripples with the mic level;
  - thinking contracts while a highlight circles;
  - speaking swells with MAX's audio level, or with an envelope pulsed per spoken word when there is no stream to measure;
  - off is grey.
- A ring of six segments shows the topics: done is ink, a gap is amber, the current one is teal, and pending is a hairline.
- Under reduced motion it draws one still frame per state.

**What MAX heard** (the call's rail, and a new **What MAX heard** group in the Thread's Details)
- Each answer becomes a fact (`OwnerFact`): label, value, status, the owner's words and the message they came from. Clicking a fact highlights those words in the transcript.
- Statuses:
  - **captured**: the owner's position;
  - **gap**: "not sure", or an item the owner explicitly left open, such as release authority. It is never an invented value;
  - **checking**: the owner pointed at a source;
  - **early**: a quick read during the call returned a signal. The scripted demos only, for example "612 of 4,812 sampled invoices are non-USD, and 212 have no region code";
  - **verified**: promoted once the run has moved past reading the sources (`settleFacts`, phase ≥ 3). The run holds before that stage while the owner's call is open, so the call never shows **Verified** while MAX is saying it will read the sources next.
- An early signal is labelled as one: full verification still happens after the interview, as before.
- Facts are persisted on the Discovery record (`facts?`). Older records without them still load, and a malformed fact is dropped, never its record.

**MAX's words**
- In the four customer demos each scripted answer has a written reply (`DemoScript.replies`), for example: "$50 a region each day, and anything over $200 stops with you before it's posted. That becomes the check the agents run every morning."
- The second reply keeps the Thread's sentence "I'll verify {topic} in {source} instead of asking you to guess".
- The close now reads: "{reply} That gives me enough owner context for this pass. I've closed the interview and kept the conversation for later additions. Next I'll read the 4 connected sources and talk to Olivia, Grace, Sam and Tom, and I'll only come back to you if something needs your call. You can follow all of it in Autonomy."
- Off-script answers keep the template.
- The Thread labels a spoken answer "Owner · spoken" (`ChatMessage.via = "voice"`).

**The presenter's Fill answer**
- With the call open, the scripted answer arrives as speech: words land in the live transcript at about 240 ms each, an envelope moves the orb, and the pause sends it.
- A second Fill replaces the words still landing; two never interleave.
- Under reduced motion the answer appears whole and sends at once.

**Narrow screens**
- At 1024 px the rail lies under the stage (facts scroll sideways, the transcript hides).
- At 600 px the orb shrinks, the toolbar shows icons only and loses its outline, the top bar keeps Back, the title, Live and the clock, and the voice-source note moves under the controls.
- Neither the page nor the call itself scrolls or clips sideways (tested at 390 px).

### 2.3 Data and contracts changed in the demo

| Item | Change |
| --- | --- |
| `ChatMessage` (`interview.ts`) | Moved out of the page. New optional `via: "voice" \| "typed"`. |
| `OwnerFact` (`interview.ts`) | New: `{ index, topic, label, value, status, quote, messageId, source?, finding? }`. |
| `DiscoveryRecord.facts?` | New, optional, persisted. |
| `DemoScript` | New `replies[]` (spoken replies), `heard[]` (`{label, value, open?, check?: {finding}}`), `calls[]` (stakeholder exchanges), `conflict` (`{between, summary}`). Validated at load: one reply and fact per answer, and calls only with mapped people. |
| `DemoStep.secondary`, `DemoAction {kind:"call"}`, `DEMO_CALL_EVENT` | New: the dock's **Start the call**. |
| Discovery phase timer | Holds at the start of stakeholder interviews (phase 2) while the owner's call is still open. In a customer demo with motion on, the stakeholder stage (phase 3) runs 7.5 s instead of 1.65 s. |
| Interview counts | One rule for every surface (`interviewsDone`): half done during the inquiry stage, all once conflicts are being resolved. Before, the count trailed the phase by two. |

---

## 3. Discovery: the stakeholder interviews become visible

| Before | After |
| --- | --- |
| ![Autonomy during stakeholder interviews](before/06-autonomy-stakeholder-interviews.jpg) | ![MAX talking to four stakeholders](after/07-autonomy-stakeholder-calls-live.jpg) |
| ![Autonomy with the decision](before/07-autonomy-decision.jpg) | ![The disagreement becomes the decision](after/08-autonomy-stakeholder-conflict.jpg) |

**Before**
- The stakeholder stage was two phase ticks of 1.65 s each.
- Autonomy showed "Stakeholder interviews · In progress" and an "Asking Olivia Hart about…" micro-line, then "Done". Nobody saw an interview happen.
- The decision appeared with its trigger sentence, and nothing showed where the disagreement came from.

**After** (`StakeholderCalls.tsx`, in Autonomy once the owner interview closes)
- One column per stakeholder: a small orb, name and role, channel (Voice call, Text interview or Workshop), state (Waiting, In conversation or Done), the exchange line by line, and what MAX took from it.
- In a customer demo the exchanges are the script's (`DemoScript.calls`) and the header says it is a replay ("these interviews run over days in practice"). Elsewhere the column says what MAX is covering with that person, never invented quotes.
- When both people in `DemoScript.conflict` are done, an amber bracket joins their columns and names the disagreement, for example "Grace and Tom disagree. The ledger converts at posting-date rates; Tom's close workbooks use invoice-date rates. 14 invoices, $126.24 apart." **Review the decision** goes to the decision card.
- The stage starts when the owner's call ends, so **Watch MAX work** lands on the calls as they begin.

**Stakeholder link page** (`/stakeholder-interview`)

| Before | After |
| --- | --- |
| ![Stakeholder landing](before/14-stakeholder-landing.jpg) | ![Stakeholder by voice](after/10-stakeholder-voice.jpg) |

- A voice-channel stakeholder gets **Start by voice** first, with **Start the interview** (text) beside it.
- The voice view (`StakeholderVoice.tsx`) uses the same orb with a topic ring. MAX speaks the greeting and each question. The stakeholder answers by mic (hands-free) or with **Suggest an answer**, spoken as simulated speech. **Type instead** keeps every answer, and the transcript runs underneath. The page still reads and writes none of the demo's state.

---

## 4. Agentix: the team floor

### 4.1 Before

| | |
| --- | --- |
| ![Engagement opens on Work](before/10-agentix-workspace-work.jpg) | ![Team in the Details sheet](before/11-agentix-team-details-sheet.jpg) |
| ![Clicking a teammate opened its milestone](before/12-agentix-agent-click-opens-milestone.jpg) | ![Conversation with the coordinator only](before/13-agentix-conversation-coordinator-only.jpg) |

- After **Activate engagement** the workspace opened on **Work**: "Now · Achieved", Delivery milestones, Exception cases, and an aside with the team as four rows (name, presence sentence, state).
- Clicking a teammate opened its lead work item (for example MS-1). The team's full description sat in Details → Team.
- One composer: "To {accountable agent} · about {scope}". Messages had no agent; the specialists never spoke.
- No canvas. `docs/agentix-workspace-ux.md` said "no … graph to configure", and its Prägnanz rule allowed "at most main, aside and an optional conversation".
- The engine logged a step's completion with its actor, but recorded no handoff, and no event named the step it closed.

### 4.2 After

| | |
| --- | --- |
| ![The team assembles on activation](after/11-floor-assembly.jpg) | ![The floor, live](after/12-floor-live.jpg) |
| ![A decision climbs to you](after/13-floor-decision-owner-room.jpg) | ![A specialist's room](after/14-floor-agent-room-chat.jpg) |
| ![Steering routed to the coordinator](after/15-floor-routed-steering.jpg) | ![Talk to the team](after/16-floor-talk-spotlight.jpg) |
| ![A failed check and its repair](after/17-floor-failed-check.jpg) | ![Release read back, not resent](after/18-floor-readback.jpg) |
| ![Morning briefing](after/20-floor-morning-briefing.jpg) | |

**Destination.** The engagement has four tabs: **Floor** (the new default), Work, Results and Activity. Work, Results and Activity are unchanged. The floor is a view, never an editor: nothing is wired or configured on it, which keeps the operating model's rule that Agentix "never asks the owner to configure an agent graph".

**Composition** (revised after review on 2026-10-11; the first version is described under "First version" below). One calm hierarchy, read top to bottom, on a quiet dot grid, inside one bordered surface shared with the room, as the reference's workflow tab shares its canvas with a settings panel. No element on the floor is lifted.

**Seating** (`floor.ts` `floorPlan` + `layoutFloor`; pixel-aware, never overlapping, tested at six real sizes and, for every scenario, at the narrowest seated width)
- **You** at the top centre: the engagement owner and the number of things waiting on you.
- The **accountable agent** under you, the same width as your seat, so the two read as one spine (over a single specialist, all three share its width).
- The **specialists** in one row under it, all the same width. Seats widen to the space the floor has (168 to 248 px) and the row is centred.
- The **systems** along the bottom, each placed under whoever reaches it, so lines to it stay short. When they need a second row, it sits in the first row's gaps, so a line to it runs down a gap instead of under a card.
- Every seat is the same hairline card. Names are measured in the floor's own font and **wrap rather than truncate**. A wrapped name gives its seat one line of sentence. A narrow system drops its icon tile to keep its name whole, and every system takes the height its longest name needs.
- A short floor tightens the agents' seats first, then the gaps.
- Below the narrowest seated width (`floorMinWidth`: the specialists' row at its minimum, the systems in two rows, and room for the canvas toolbar beside your seat, never under 560 px), the floor becomes a list: you, the team, then the systems with their capability. Phones get the list; a 1280 px window with a room open seats it (630 px).
- The floor is sized so the canvas and its timeline sit above the composer at 1280 × 800 and 1440 × 900 (`--ds-floor-h`: 400 to 600 px).

**Lines** (`route`, `roundedPath`, `labelPoint`): every line is a short orthogonal route with rounded corners that runs only between tiers and through gaps. A route through the accountable agent (you to a specialist, a decision climbing to you) is drawn as two runs, above and below its card, so nothing runs under it. A test checks every route the floor draws or sends something along, both ways, at every size, against every card.
- **Always drawn: the team.** From you to the accountable agent, then along one connector to each specialist, ending in arrowheads.
- **Drawn while it happens: work at a system.** While a step uses a system, its line carries a moving teal dash: into the agent for reads, out to the system for writes. Each agent has its own track, so two flows never share a line. The accountable agent's lines take the nearest gap past the specialists: straight down when the gap is well under it, out of its side with a clear step when the gap is well beside it, and otherwise from its foot (set in from the corner) with a short jog into the gap just under the team connector. A system under the specialists' row is never reached by going round the row.
- **Drawn for the agent you look at: reach.** Hovering, focusing or choosing an agent shows where it may reach, dashed, and quiets the systems it can't touch. Nothing else draws reach, so the floor stays clean.
- Who waits on you: their line up to your seat turns amber (static, not marching); your seat shows how many wait.

**Reach rules** (unchanged): derived from the scenario's steps and each specialist's tool list (`reachOf`). **Production is reached only by the accountable agent**; a test enforces it.

**Release state, in words**: a release whose acknowledgement was lost reads back in amber, and its system carries **Reading back** on its top edge. A blocked release is red (**Blocked**); one waiting carries **Awaits your approval** or **Held for its window**. The words sit on the system card, so they show at every size and the state is never told by colour alone.

**Labels on the lines** (the reference's edge pills) name only what is moving, and sit only on a level run long enough to hold them and clear of every card; a route without one carries no label. A test checks it for every route.

**What just moved** (`packetsFor`, fed by the engine's events): a small dot travels along the line it follows, under the cards, so it passes behind whoever it goes through. Where a label fits clear of the cards, a light one names it while it travels. Only what has a line to travel on is sent, so nothing flies in late after talking or the list view.

| Engine event | Travels | Label |
| --- | --- | --- |
| `handoff` (new) | From the specialist who finished to the one who starts next, along the team connector | The artifact and version ("Source-to-target mapping v2") |
| `decision`, raised by an agent | Up to **You** | Needs you |
| `decision`, made by the owner | From **You** to the agent that continues | Your decision |
| `release` applied | From the accountable agent to the production system | REL-… applied |
| `release` outcome unknown | Out to the system, then the read-back | No acknowledgement |
| `release` reconciled | From the system back to the accountable agent | Read back · applied once |

**Seats carry state**
- Each agent seat shows what it is doing now, a state dot (working teal; decision or recovering amber), its work reference as a tag (the sentence no longer repeats it), the accountable agent's role, and, while something it built is under test, "7 of 9 checks" or "2 of 9 failed · repaired". Motion is kept for what is moving: live flows and travelling dots; dots and waiting lines are still.
- An agent waiting on you is outlined amber. A chosen seat has an ink border, as the reference marks a selected node, and choosing wins over waiting. In your room the heading stays in view while you scroll.
- **Canvas toolbar**, top right: Morning briefing (after a verified cycle), Replay, and Talk to the team. Its words drop, Talk's last, before your seat would be crowded. The status sentence and the bar above the canvas are gone; the seats say it.
- **Your room opens by itself when a decision arrives**, so the decision is on the floor and decidable there (the same `DecisionCard`). A room that opens by itself doesn't take focus from someone typing elsewhere; one the owner picks moves focus to its heading, and closing it returns focus to the seat.

**Rooms** (`AgentRoom.tsx`): selecting any seat opens it beside the floor.
- **Your room**: everything waiting on you (decisions decidable in place, other items linking to their work) and your recent decisions.
- **A teammate's room**:
  - its duty;
  - **May use**: its systems with capability;
  - what it never does (its scope; for a specialist, "Production changes go through the revenue coordinator");
  - **Now**: its presence sentence, its current step's tools, and a link to the item;
  - **Built**: artifacts with check counts and production version;
  - **Recently**: its last four events;
  - **Talk to it**.

**Talking to one teammate** (`sendToAgent`)
- A **specialist answers for its own work**, in first person, in its own thread (`Message.agentId`):
  - what it is doing and with which tools;
  - why it waits (a waiting decision is explained with what it found: "212 of 4,812 invoices (4.4%)… It's a business rule, so I asked rather than choosing");
  - what it may touch;
  - whether anything it built failed.
- **Steering is the accountable agent's.** Pause, priority, holds, intake, amendments and new work written in a specialist's room are routed: the specialist says "That changes how the team runs, so it goes through the revenue coordinator. I've passed it on", and the coordinator applies it exactly as if written to it. It answers in the main conversation, prefixed "From your message to the data specialist:". A queued change rides on the message, so the engine applies it on the next demo minute as before.
- **No room can approve, release or widen authority**, the coordinator's included. These are refused, nothing changes, and the reply says decisions stay with the owner in their card.
- What a message did is read from its outcome, not guessed from its words: the toast "Passed to the revenue coordinator" appears only when steering was routed, and a declined message comes back to the room's field to be edited, as in the main composer.
- The coordinator's room is the existing conversation. The composer under the tabs still writes to the coordinator, unchanged.

**Talk to the team** (`FloorTalk.tsx`)
- Opens a flat band across the bottom of the canvas: the same orb, a caption, three starter questions ("What's the team doing?", "What needs me?", "Is anything failing?"), a field and a mic. The systems rest while it is open, so the team stays in view above it.
- "What's the team doing?" is answered in the accountable agent's voice, from live state: "Right now I'm reading back the exception status on INV-20842, the data specialist is profiling 30 days of invoices against the target model on MS-1… The reconciliation analyst is free for incoming work. One thing needs you: approve the $240 price variance." Asking *why* this team still gives the team's reason.
- Typed text and the starter questions go through the existing steering interpreter, exactly as the composer does: pressing **Ask** is the owner sending it, and the answer is the conversation's own.
- **Speech is heard, not trusted.** A spoken question is answered at once. Anything spoken that would change the work (pause, priority, new work) is put in the field with "Check what was heard, then press Ask to send it" and waits for the owner (`previewInstruction` tells the two apart without doing either).
- The mic button stops listening as well as starting it. Picking a starter question or closing the bar discards what the mic was hearing; only a finished utterance counts.
- The answer is spoken (browser voice; captions under automation). As the voice reaches each teammate's name, that seat lights up.
- Opening it closes any room so the whole floor is in view. Closing it returns focus to **Talk to the team**.

**Morning briefing**
- After a verified daily cycle, a **Morning briefing** button speaks the cycle's outcome: which outcomes have evidence and when they were checked, what each teammate did that morning grouped by who did it ("From the reconciliation analyst: totals agree within tolerance. From me: daily summary posted…"), and whether anything needs you.

**Replay and the timeline**
- The line under the floor carries every engagement event as a tick (handoffs teal, decisions amber, failures red, releases ink), ending at "Now {time} · next {weekday, date, time}".
- **Replay** steps through the last 40 events, one every 650 ms. Each lights the teammate who did it and replays what moved; the timeline says which event it is. It is a replay of the record, not a reconstruction of past state.

**Assembly**
- The first time the floor opens within three demo minutes of activation, the team assembles: the owner and the seats rise in, the systems follow and the lines draw.
- The Discovery package travels to the accountable agent, then each milestone (labelled with its reference, "MS-1") travels to the specialist who takes it first.

**First version** (built and reviewed the same day, then revised): the systems sat in two columns at the edges by capability, every reach line was always drawn, seats were a fixed 172 or 196 px and truncated names, packets were pills that flew across the cards, and a status bar sat above the canvas. At 1280 px with a room open the canvas fell back to a list and the decision's buttons were below the fold. The owner's review called it messy; the composition above replaces it. The behaviour (what lights, what moves, who may reach what, rooms and routing) is unchanged.
- Once per engagement per session; off under reduced motion.

### 4.3 Engine and contract changes in the demo

| Item | Change |
| --- | --- |
| `ActivityEvent.kind` | New `"handoff"`, logged by `complete()` when the next step belongs to another specialist. Work handed into a parallel group is handed to each member; a group hands on only when its last member finishes. New optional `stepId`, `from`, `to`. Activity lists handoffs under Operations ("MS-1: Data specialist handed source-to-target mapping v2 to the dashboard specialist"). |
| `Message.agentId?` | New: the teammate a message belongs to. Absent means the accountable agent's conversation, as before. The main conversation, latest-reply strip and unread count exclude specialist threads. |
| `sendToAgent(state, engagementId, agentId, text)` | New steering entry point with the routing rules above. `sendInstruction` is unchanged. |
| `previewInstruction(state, engagementId, scope, text)` | New: what an input would do (`intent`, `status`) without doing it. The talk bar uses it to answer spoken questions and hold spoken changes. |
| `View` / `Nav.view` | New `"floor"`, now the default when an engagement opens. Saved navigation with an unknown view falls back to `"floor"`. |
| Latest-reply strip | Hidden on the Floor (talk and rooms answer there). |

---

## 5. The shared voice layer

`src/components/voice/`

**`speak(text, options)` sources, best first**
1. A **recorded** ElevenLabs clip listed in `public/voice/manifest.json` for that voice and text. Captions follow the word timings, and the orb measures the audio with an `AnalyserNode`.
2. The **browser** voice. It prefers Premium, Enhanced, Natural or Siri English voices, and captions follow `onboundary` events. If the voice has not started after 1.6 s, it falls back to captions.
3. **Captions** only, at about 165 words a minute with rests at punctuation. Under reduced motion the line appears whole and ends at once.

**Silence**
- A browser under automation (`navigator.webdriver`) never speaks aloud: on a Mac the browser voice is the operating system's synthesizer, so a test run would talk through the speakers.
- `playwright.config.ts` also launches Chromium with `--mute-audio`.

**Pre-rendering**: `pnpm voice:render`
- Loads the app's own lines through Vite (`voiceLines.ts`): each demo's openers, reply-plus-next-question lines, closing, and the voice-channel stakeholder's interview.
- Calls ElevenLabs `POST /v1/text-to-speech/{voice}/with-timestamps` (default model `eleven_multilingual_v2`, chosen for quality because clips render once).
- Writes `public/voice/{hash}.mp3` and the manifest with `[charEnd, startSeconds]` marks per word.
- `--dry-run` lists 65 lines and 13,634 characters with no key.
- The key is read from `ELEVENLABS_API_KEY` only and never written.
- The clips have **not** been rendered in this change (no key was available). Until they are, the demo uses the browser's voice.

**`VoiceOrb` and `audioLevel`**
- The orb and its ring (§2.2).
- Level meters for an `<audio>` element and the microphone, plus a synthetic envelope. All write to a ref the orb reads per frame, so sound never re-renders React.

---

## 6. What did not change

- Authority:
  - decisions stay in their cards, chat never approves, and releases follow the owner's release policy;
  - an uncertain write is reconciled by read-back, never resent;
  - production is the accountable agent's.
- The Discovery Thread, Autonomy, Workshop and Package views, apart from the additions above. The typed interview works exactly as before.
- Agentix Work, Results and Activity, the Details sheet, Controls, the proposal and activation flow, and the composer under the tabs.
- The customer demos' twelve steps and their figures.

---

## 7. Impact on the real product's plans

Plan paths are in `max-ai-platform` `docs/implementation/` (current copy in the `max-ai-platform-portal-ui-impl` checkout, `origin/main` `ed046f383d`). Each row names the section to amend, what the demo now shows, and the contract the real product needs. None of this is implemented in the product; it is input for amending its plans.

### 7.1 Discovery

| Plan section | What it says today | Amendment the demo implies |
| --- | --- | --- |
| `2026-09-23-portal-ui-demo-refactor/06-phase-5-discovery-owner-journey.md` §4.6 Thread (demo `P:3914-4399`) | Interview in the Thread; "Answer question" toolbar action. | Add the call invitation as the interview's lead (voice-first, typing intact), and a **What MAX heard** group in Details. |
| Same file §4.7 Voice (demo `P:4526-5071`, now replaced) | Full-screen LiveKit modal; orb + mic; captions; last 4 transcript turns; Hands-free / Open mic / Push to talk menu; "Voice unavailable" when unconfigured. | The call covers the module, not the shell. The rail holds **What MAX heard** (facts with status) above the **full** transcript. The orb has a topic ring. MAX speaks its full reply. The close lands on a summary with **Watch MAX work** / **Keep talking**. A source check during the call shows a status chip. Keep the plan's three modes; the demo shows two (Hands-free = `open_mic`/`full_duplex`, Push to talk = `ptt`). |
| `2026-07-17-discovery-voice-interviews/APPENDIX-A` A4 data-channel events | `turn.user_partial`, `turn.agent_caption {text, charOffset}`, `turn.barged_in {spokenChars}`, `turn.thinking`, `turn.fanout {runId}`. | The demo uses exactly these semantics: live transcript, word-timed captions, barge-in, thinking, and a fan-out that becomes the stakeholder calls. **New events needed**: `turn.fact_captured {topic, label, value, status, sourceRef?}` and `turn.fact_updated` (checking → early → verified), and `turn.tool_check {source, status, finding?}` for the in-call source read. |
| `2026-08-21-discovery-skills-dialogue-runtime/03-phase-2-canonical-turn-contracts-and-obligation-ledger.md` (`discovery_turn_interpretations`, `discovery_turn_obligations`) | Turn interpretations are recorded server-side. | **What MAX heard** is the owner-facing view of a turn interpretation. Expose label, value and status per answered topic, with the message reference, and keep gaps explicit. The plan search found no owner-side "what MAX heard" section; add one. |
| `2026-07-17-discovery-voice-interviews/PINS.md` §1 (ElevenLabs `scribe_v2_realtime` STT, `eleven_flash_v2_5` TTS, LiveKit, Silero VAD, EOT 0.3) | Vendor pins. | Unchanged. The demo's word-timed captions need TTS alignment. Flash v2.5 streams it over the websocket (`alignment`), which the gateway must forward as `turn.agent_caption` char offsets. The demo's pre-rendered clips are a demo-only substitute. |
| `…voice-interviews/00-parent-roadmap.md` ADR-6 turn-taking and barge-in | Barge-in via the gateway. | The demo only allows voice barge-in over audio the page can echo-cancel. In the product, server-side EOT and AEC make this moot, but the client should still stop playback on `turn.barged_in`. |
| `…voice-interviews/06-phase-6-owner-voice-fanout.md` | Owner voice fan-out. | The fan-out should land the owner on the **stakeholder calls** view (`turn.fanout` → Autonomy), and the stakeholder stage should start when the owner's call ends. |
| `2026-09-23-portal-ui-demo-refactor/07-phase-6-discovery-package-stakeholder.md` §4.5 Stakeholder public pages; `…voice-interviews/07-phase-7-stakeholder-voice-consent-mobile.md` | Voice or text choice, consent, shared voice modal; editable insights (`PUT /interview/{token}/insights`). | Lead with **Start by voice** for voice-channel stakeholders. The voice view shares the owner call's orb and topic ring, and **Type instead** keeps answers. |
| Autonomy view (portal refactor phase 5) | Stakeholder interviews as a status row. | Add the stakeholder calls section: per-person columns with exchange, insight and state, plus the disagreement bracket that links to the decision. It needs the per-stakeholder interview stream (interview session → insights) and a conflict record linking two stakeholders to the decision. |
| `2026-10-01-discovery-owner-actions/00-plan.md` slices 5a–5d ("an answer is an answer", "the owner interview opens once") | Interview reliability rules. | Compatible. The call submits through the same turn path. A spoken answer is marked `via: voice` but is otherwise the same answer. |

### 7.2 Agentix

| Plan section | What it says today | Amendment the demo implies |
| --- | --- | --- |
| `2026-09-11-agentix-deployed-operations/03-ux-and-qualification.md` L11 | Persistent composer "Steer this agent" / "Steer this case"; work/status primary. | Keep the composer. Add **rooms**: an addressed conversation per teammate, in which specialists answer and steering routes to the accountable agent. |
| Same file L15 | "per-agent drill-down filters [the shared timeline] without introducing another execution workspace". | The room *is* that drill-down (Recently = the filtered timeline) plus an addressed conversation. Still no separate execution workspace. |
| Same file L91 (Prägnanz) | "≤4 main regions; no default graph". | **Owner decision needed**: the demo makes the floor the default. It stays within four regions (floor, room, the talk bar or timeline, and the composer) but it is a graph by default. Amend to "a view-only team floor is the default; no configurable graph". |
| `15-phase-5-coordination-and-processes.md` L27 | "Team view is a drill-down, not a mandatory canvas… not a graph of every tool call." | The floor shows step-level flows, handoffs and decisions, not every tool call (consistent). It is the default (conflicts); same owner decision. |
| `docs/operations/ux-reference-sheets/agentix-team-case-workspace.md` L130 | "Prägnanz: 1 collapsed group and 4 titled native disclosures; no graph." | Update the reference sheet with the floor and room states. |
| `02-architecture-and-contracts.md` ADR-08 (one coordinator, ≤3 specialists, depth 1) | Bounded coordination. | The floor's layout is designed for that bound (1 + 3 seats in one or two rows). |
| ADR-10 (common workspace and update transport: polling 3 s / 15 s, no token stream, not the Execute websocket) | Polling. | Polling is enough if events arrive as an ordered delta (`GET …/events?after={cursor}`); packets and flows animate client-side between polls. Without step-level events the floor can only show presence. |
| `packages/max-agentix-core/src/max_agentix_core/contracts/events.py` `EventV1.event_type` (closed list: `case.*`, `command.*`, `case.obligation_*`, `deployment.*`, `trigger.*`) | No step or handoff events. | **Add**: `step.started` / `step.completed` (with `contributor`, `step_id`, `system_ref`), `work.handed_off` (`from`, `to`, `artifact_ref`, version), `decision.requested` / `decision.resolved` (or map to `case.needs_attention`), and `release.outcome_unknown` / `release.read_back` (`dispatches`, `duplicates: 0`). |
| `case_workspace.py` `WorkspaceContributorV1.state`, `team_state` | Contributor states. | Map to seat states: working, recovering, decision, dependency, ready. Each also needs the current step's `doing` sentence, tool list and work reference. |
| `04-implementation-map.md` "Public steering commands" (L100) | One generated contract. | Add an optional `addressee` (contributor id) to commands and conversation messages. Specialists may answer questions about their own work; steering commands addressed to a specialist are re-addressed to the accountable agent with provenance ("via {specialist}"); approvals and authority changes are refused in every room. |
| Agentix reach and permissions (`delegation.py`, system links) | Delegation contracts. | The floor's reach rule (production only via the accountable agent) must come from the deployment's actual grants, not be inferred. Expose per-contributor system grants with capability. |
| Voice in Agentix (not in the plan) | — | New: a voice question to the accountable agent (same steering path) and a spoken morning briefing from the verified cycle. A spoken instruction that would change the work is shown back for the owner to send, never applied from a transcript. Reuse the Discovery voice gateway; mention spans (contributor ids with char offsets) let the client light seats in time with `turn.agent_caption`. |

### 7.3 Suggested acceptance criteria for the product

**Discovery call**
1. The owner can complete the interview by voice without touching the keyboard (hands-free). A pause of about 1–1.5 s after speech ends the turn.
2. MAX speaks its acknowledgement and the next question, and the captions follow the audio word by word.
3. Each answered topic shows one fact within one turn, with a status. "Not sure" is a gap, never a value.
4. A source named in an answer shows a check during the call. Verification is never claimed before the evidence stage has read the sources.
5. Typed and spoken answers produce the same thread, facts and Discovery state.
6. Ending the call lands on a summary and offers Autonomy, where the stakeholder interviews are visible as they run.

**Agentix floor**
7. Opening an active engagement shows every contributor, every granted system by capability, and who is waiting on the owner, with no overlap at 1280–1920 px.
8. Within one poll of a step starting, the edge between its contributor and system is live. Within one poll of a handoff, a packet shows the artifact and version.
9. A decision raised by any contributor is decidable on the floor.
10. In a specialist's room: a question gets a first-person answer about its work; a steering instruction is applied once, by the accountable agent, with provenance; an approval request is refused.
11. A release with an unknown outcome shows a read-back, never a second dispatch.
12. A spoken instruction never takes effect until the owner confirms the transcribed text; a spoken question may be answered directly.

---

## 8. Verification

Run on 2026-10-11 against the Vite dev server, Playwright Chromium (muted, `navigator.webdriver` silent), macOS.

| Check | Command | Result |
| --- | --- | --- |
| Types | `pnpm check-types` | Pass. |
| Unit | `pnpm test` | 20 files, 642 tests pass (before this change: 16 files, 590). |
| End-to-end | `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright test` | Final run: 101 of 101 pass, no retries (before this change: 92 of 92). Earlier runs failed where the change was intended (Floor as the default tab, the new close and opener) and where checks caught real defects; each is fixed and recorded in `.impl-cadence/STATE.md`. |
| Design tokens | `pnpm check:design` | Pass. The four new stylesheets are on the strict, tokens-only list. |
| Density | `PLAYWRIGHT_BROWSERS_PATH=0 pnpm check:density` | Every screen passes. New screens: **agentix-floor** 6 containers, 1 lift (the engagement composer); **discovery-call** 0 containers, 1 lift (the call toolbar). Baseline updated. |

**Unit suites added or extended**
- `interview.spec.ts`: facts, the ring, opener and close.
- `Scripts.spec.ts`: every demo's replies, facts, calls and conflict.
- `voiceLibrary.spec.ts`: manifest lookup, captions pace, stop, reduced motion, silence under automation.
- `Floor.spec.ts`: seating with no overlap at seven sizes and for every scenario at the narrowest seated width; reach (production only via the coordinator); live flows; handoff events and packets, including into and out of a parallel group; per-agent chat routing and refusals; previewing an instruction changes nothing.
- `Engine.spec.ts`: a change written in a specialist's room is applied once, through the accountable agent.

**End-to-end journeys**
- Existing journeys open **Work** explicitly where they used to land on it; the dock's "Open the engagement" now lands on the Floor.
- New journeys:
  - the call: Fill answer as speech, What MAX heard, early signal, completion, Watch MAX work into the stakeholder calls; with motion on, a filled answer landing word by word; the dock starting the call after a reload; an answer typed before the call starts; nothing clipped inside the call at 390 px;
  - the floor: the owner room on a decision; a specialist's answer, refusal and routed steering; talk with seat lighting and focus return; replay; accessibility and a 390 px phone;
  - the stakeholder page by voice.

**Rendered checks**
- Every `after/` image was captured from this branch at 1440 × 900 (19 at 390 × 844) and inspected.
- Inspection found two defects that the tests had not:
  - at 390 px the call's top bar sized the call wider than the screen, clipping the caption and toolbar (the page itself didn't scroll, so the old check passed);
  - in a narrow seat, a long check tag wrapped and cut off the seat's sentence.
  Both are fixed and recaptured, and the call test now checks for clipping inside the call.
- The density checker now skips unpainted (`visibility: hidden`) elements. Discovery content under the call's opaque layer is unpainted. The other screens' numbers are unchanged.

**Independent review**
- One review by a separate agent session found no authority-invariant violations, plus six correctness and effect-safety defects in the changed journeys, focus defects, weak tests and inaccuracies in this record.
- All findings were repaired in one cycle (see `.impl-cadence/STATE.md`), and the affected checks were rerun.

**Not verified here** (left for qualification on a real machine)
- Live microphone recognition (Web Speech) and real-voice barge-in: microphone capture isn't available to the automated browser.
- Pre-rendered ElevenLabs playback: no key was available, so clips weren't rendered. The manifest loader and fallbacks are unit-tested.
- Mobile Safari, and a screen-reader pass (only automated axe scans were run).

---

## 9. Open questions

1. **Floor as the default.** The real Agentix plan says "no default graph" and "not a mandatory canvas" (§7.2). The demo makes the floor the default. Should the product follow, or keep Work as the default with the floor one tab away?
2. **The call's footprint.** In the demo it covers the module and keeps the platform sidebar. The product plan has a full-screen modal. Which one?
3. **Mid-call source reads.** The demo reads a bound source during the interview and labels the result an early signal. Is a read inside the approved scope during the interview acceptable to the authority model, or must every read wait for the interview to close?
4. **MAX's voice.** Which ElevenLabs voice is MAX's (`ELEVENLABS_VOICE_ID`)? Should the stakeholders' demo replies have voices of their own?
5. **Specialist chat scope.** Should a specialist ever accept steering about its own step (for example, re-run a profile), or should all steering stay with the accountable agent as the demo does?

---

## 10. Agentix polish: type, glyphs and room (2026-10-12)

The owner's review of the redesigned floor: Results and Activity "still have a cramped feel", the icons "look so generic, there's no premium/creative feel", and "the text feels generic, especially noticeable in the chat". Shown three type treatments side by side (Inter as it was, Inter refined, Inter with a display face), the owner chose **Inter, refined**: keep ElevenLabs' typeface and set it with care.

| | Before | After |
| --- | --- | --- |
| Results | ![Results before](polish/01-before-results.jpg) | ![Results after](polish/04-after-results.jpg) |
| Activity | ![Activity before](polish/02-before-activity.jpg) | ![Activity after](polish/05-after-activity.jpg) |
| Conversation | ![Conversation before](polish/03-before-conversation.jpg) | ![Conversation after](polish/06-after-conversation.jpg) |
| A room | | ![A room's conversation after](polish/07-after-room-chat.jpg) |

**Type** (tokens `--ds-lh-read` 24px, `--ds-lh-relaxed` 22px, `--ds-track-name` −0.006em, `--ds-track-read` −0.006em, `--ds-opsz-display` "opsz" 28)
- Names and titles take Inter's display cut through its optical-size axis (`font-variation-settings: "opsz" 28`), set at 14/600 against 12px subtle meta with tabular figures. Automatic optical sizing would give 14px text the text cut, so the axis is set explicitly.
- Conversation replies read at 15/24, timelines and rooms at 14/22. Before, everything was 13/20 or 13/18.
- A reference such as "MS-2" is one word: it never breaks at its hyphen (`prose.tsx`).

**Conversation** (the drawer and every room)
- A reply reads like writing: the agent's mark, name and time, then its words, with no box around them.
- Your messages sit in one soft bubble on the right.
- Progress updates are signed with the accountable agent's mark instead of a generic sparkle, set in body type rather than a grey card.
- What a message concerns is a row of quiet links, not bordered chips.
- Messages sit 32px apart, and a reply runs the full width of the drawer under its name.

**Activity**: one quiet timeline.
- Each entry is a status seal on a thread, then who and when (the time alone, under its day heading), then what happened in reading type, then what it touched as quiet links.
- Consecutive entries by the same teammate within ten minutes read as one run: the name once, then only the times.
- The work reference no longer opens the sentence and repeats as a chip.
- No hairline between entries; whitespace does it.

**Results**
- The list is roomier: a 36px glyph tile, a 14px title, one quiet line, and 12px of padding per row.
- Beside the list there is always something to read. On a wide screen the first result opens as a choice made for you: the conversation is about it ("about Revenue dashboard v1", with "Use whole engagement" beside it) and it stays until you choose another. On a phone the list still comes first.
- A result you open yourself (from the list or a link elsewhere) takes focus once. One opened for you, or shown again when you come back to the tab, leaves focus where it is, so arrowing through the tabs never jumps into the page.
- A result's actions sit on their own row under its title, its test-data label appears once, and the dashboard's figures are plain columns.

**Glyphs** (`glyphs.tsx`, ![The glyph sheet](polish/08-glyphs.jpg))
- Agentix's semantic icons are redrawn in the sidebar's grammar (NavGlyphs.tsx): a 24 grid, 2px round strokes, one outline, one solid accent and one faded back layer.
- Statuses are seals, a soft disc in the status colour with the mark over it: done, attention, failed, paused, waiting, scheduled, info, declined, stopped, live, question and pending.
- Results and capabilities are figures in the same grammar, literal where meaning needs it at 12–14px:
  - a board with its measure raised (dashboard);
  - three stages with the one at work solid (pipeline);
  - fields matched across (mapping);
  - a written page (runbook);
  - a record and its seal (evidence and reconciliation);
  - a cylinder with its top solid (read);
  - blocks being laid (build);
  - a flask and its contents (test);
  - a rack with its unit in service lit (production);
  - a pen and its line (update);
  - a release leaving its pad;
  - a fork with the way taken solid (decision);
  - a tray receiving an event (incoming events);
  - one chat bubble (conversation);
  - the accountable agent over its duties (team).
- At 14px and under, the back layer and the seal's disc come forward so nothing goes faint. On a tinted pill, the pill is the seal: the glyph keeps only its mark.
- A result's tile takes the brand teal as its accent.
- Each glyph is exported under the stock name it replaces, so call sites are unchanged. Controls and action buttons (chevrons, arrows, close, search, play, pause, microphone, request a change, hold or release a notification) stay with the stock set.

**Impact on the product's plans.** The portal UI refactor (`2026-09-23-portal-ui-demo-refactor`) should take:
- the four type tokens;
- the reading sizes for conversation and timelines;
- the "references are links, not chips" rule;
- the glyph set, as a shared icon package beside NavGlyphs, rather than per-module stock icons.

The Agentix workspace reference sheet (`docs/operations/ux-reference-sheets/agentix-team-case-workspace.md`) should record the conversation and timeline treatments.

