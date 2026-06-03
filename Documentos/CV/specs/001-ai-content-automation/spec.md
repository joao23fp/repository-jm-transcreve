# Feature Specification: AI Content Automation

**Feature Branch**: `001-ai-content-automation`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Improve my LinkedIn and Upwork positioning, answer a Softplan application form, and build a daily n8n workflow that researches AI updates from at least 20 sources, sends a WhatsApp summary, and saves three LinkedIn/Instagram post drafts as Markdown in Google Drive every morning."

## Clarifications

### Session 2026-06-03

- Q: Which WhatsApp provider should deliver the daily briefing? -> A: Uazapi via n8n HTTP Request, with token stored as a credential or environment variable and the group number configured separately.
- Q: How should daily post drafts be stored and reviewed? -> A: Create a dated Google Drive folder for each run, save one structured document with three post options and any supporting image/material assets, then send the folder link by WhatsApp with an agent recommendation for the best option.
- Q: How should the recommendation agent access profile and recent-post context? -> A: The user will maintain a Google Drive file with profile context and recent posts for the agent to consult.
- Q: Should the MVP publish or only help the user decide? -> A: MVP only generates drafts, materials, recommendation, and WhatsApp decision information; the user publishes manually.
- Q: What should the daily WhatsApp decision message contain? -> A: A complete decision packet with folder link, summary of the three options, recommended option, rationale, best channel/format, available materials, and next steps; implementation must present five message template options for user selection.
- Q: What date format should daily Google Drive folders use? -> A: Use `DD-MM-YYYY`, for example `02-06-2026`, to keep Brazilian readability without using `/` as a path separator.
- Q: How fresh must the profile-context file be for recommendations? -> A: Treat the Google Drive profile-context file as fresh for 14 days; after that, alert the user and mark recommendations as using outdated context.
- Q: How should the three daily post options be organized in the dated folder? -> A: Use one `posts-do-dia.md` document containing the three options, recommendation, and material references.
- Q: When should the workflow generate image or visual material assets? -> A: Generate image/material assets only when the agent determines they improve the recommended option or make the post clearer.
- Q: What time should the daily workflow run? -> A: Run daily at 08:00 in the America/Sao_Paulo timezone.

## Methodology

This feature uses Spec Kit as the source of truth, BMAD as the role-based
product/architecture thinking model, and GSD as the execution discipline.

- **BMAD Analyst**: validate audience, positioning, source quality, risks, and
  user pain points before implementation.
- **BMAD PM**: define MVP, priorities, acceptance criteria, and weekly content
  outcomes.
- **BMAD Architect**: define n8n workflow boundaries, credentials, storage,
  error recovery, and integration tradeoffs.
- **GSD Plan**: complete spec, clarification, and implementation plan before
  building.
- **GSD Execute**: implement one independently testable story or workflow slice
  at a time.
- **GSD Verify**: compare generated outputs, logs, and approval behavior against
  this specification before activating the schedule.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily AI Briefing (Priority: P1)

As the user, I receive a concise WhatsApp briefing every morning with the most
relevant AI updates, why they matter, and which ones are worth turning into
content.

**Why this priority**: The WhatsApp briefing is the daily trigger that keeps the
user updated and makes the content system useful even before publication.

**Independent Test**: Run the workflow in dry-run mode for one morning cycle and
verify that the message contains verified stories, source links, confidence
labels, and no unsupported claims.

**Acceptance Scenarios**:

1. **Given** at least 20 configured sources, **When** the morning run starts,
   **Then** the system checks sources, deduplicates stories, and ranks the top
   updates by relevance to AI automation and business impact.
2. **Given** fewer than five sources respond successfully, **When** the run
   completes, **Then** the user receives an alert explaining the partial failure
   and the system still sends a reduced briefing if enough verified items exist.

---

### User Story 2 - Daily Draft Generation (Priority: P2)

As the user, I get three Markdown drafts saved in Google Drive every morning:
LinkedIn authority post, LinkedIn practical/tutorial post, and Instagram-ready
adaptation.

**Why this priority**: Drafts are the core output that supports the user's goal
of posting three times per week while keeping a daily backlog of content ideas.

**Independent Test**: Run a generation cycle and verify that three Markdown
files are saved with title, hook, body, CTA, source links, confidence label,
suggested publish channel, and editing status.

**Acceptance Scenarios**:

1. **Given** ranked AI updates are available, **When** drafts are generated,
   **Then** each draft connects the update to the user's positioning in AI
   automation, CRM/ERP, sales operations, or professional productivity.
2. **Given** a story is based on a secondary or speculative source, **When** a
   draft uses it, **Then** the draft labels it as analysis or signal and avoids
   presenting it as a confirmed release.
3. **Given** the daily generation completes, **When** files are saved, **Then**
   the system creates a Google Drive folder named with the run date and stores
   the structured post document plus any generated or curated image/material
   assets inside that folder.

---

### User Story 3 - Approval-Ready Social Content (Priority: P3)

As the user, I receive a WhatsApp message with the daily folder link and a
recommendation for the strongest post option before anything is published on
LinkedIn or Instagram.

**Why this priority**: Recommendation and approval prevent accidental public
posts, reduce decision time, and preserve the user's voice and professional
judgment.

**Independent Test**: Run a daily cycle and verify that the WhatsApp message
contains the Google Drive folder link, the three-option summary, and a ranked
recommendation based on the user's profile and recent posts.

**Acceptance Scenarios**:

1. **Given** a draft has no approval, **When** a publishing step runs, **Then**
   the system does not publish it and records that approval is missing.
2. **Given** three draft options exist and the profile-context file is
   available in Google Drive, **When** the recommendation agent runs, **Then** it
   compares the options against the user's profile, positioning, and recent
   posts and marks one option as recommended for that day.
3. **Given** the recommendation is complete, **When** WhatsApp delivery runs,
   **Then** the user receives the folder link, the recommended option, the
   reason for the recommendation, and the decision information needed to access
   and manually publish the day's post.

---

### User Story 4 - Profile and Job Application Support (Priority: P4)

As the user, I maintain reusable profile-positioning notes and application
answers that align LinkedIn, Upwork, and job applications with the same
professional narrative.

**Why this priority**: Profile improvement supports conversion, but it can be
delivered independently from the daily automation.

**Independent Test**: Review the saved recommendations and confirm they include
headline, about section, proof points, portfolio changes, and application-form
answers.

**Acceptance Scenarios**:

1. **Given** the user provides screenshots or exports of profile pages, **When**
   analysis runs, **Then** recommendations are written with concrete text that
   can be pasted into LinkedIn, Upwork, or application forms.
2. **Given** a job application asks custom questions, **When** the user provides
   the questions, **Then** the system drafts concise answers consistent with
   the user's experience and truthful constraints.

### Edge Cases

- A source is unavailable, rate-limited, or blocks automation.
- Multiple sources report the same AI update with different dates or claims.
- A generated draft sounds too generic or lacks the user's point of view.
- WhatsApp delivery succeeds but Google Drive save fails, or the reverse.
- Instagram format requirements differ from LinkedIn format requirements.
- A public API changes permissions or rejects a publishing request.
- The user has no source updates worth posting on a given morning.
- Google Drive folder creation succeeds but one optional image/material asset
  fails to generate.
- The recommendation agent cannot access recent profile/post context.
- The profile-context file is missing, outdated, or unreadable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a configurable source registry with at least
  20 AI-related sources.
- **FR-001a**: System MUST run daily at 08:00 in the America/Sao_Paulo timezone.
- **FR-002**: System MUST rank official vendor, product, research, and developer
  sources above secondary media and community sources.
- **FR-003**: System MUST store source URL, source name, retrieved date, article
  or release date when available, summary, and confidence label for each used
  item.
- **FR-004**: System MUST deduplicate materially similar updates before
  summarization or draft generation.
- **FR-005**: System MUST generate one concise WhatsApp morning briefing in
  Portuguese with top updates, business relevance, and source links.
- **FR-005a**: System MUST send WhatsApp briefings through Uazapi using an n8n
  HTTP Request node, with the API token stored outside workflow code and the
  destination group number provided as configuration.
- **FR-006**: System MUST save three Markdown drafts per morning run in the
  configured Google Drive folder.
- **FR-006a**: System MUST create one Google Drive folder per morning run named
  with the run date in `DD-MM-YYYY` format.
- **FR-006b**: System MUST save one structured daily document named
  `posts-do-dia.md` inside the dated folder containing the three post options,
  recommendation, source links, material references, and publishing notes.
- **FR-006c**: System MUST save any generated or curated image/material assets
  for the daily posts inside the same dated folder.
- **FR-006d**: System MUST generate image/material assets only when the
  recommendation agent determines they improve the recommended option or make
  the post clearer; otherwise it MUST include only a visual suggestion in
  `posts-do-dia.md`.
- **FR-007**: Each Markdown draft MUST include title, channel, suggested format,
  hook, body, CTA, source links, confidence label, and approval status.
- **FR-008**: System MUST generate LinkedIn drafts for professional authority
  and practical AI automation positioning.
- **FR-009**: System MUST generate Instagram variants adapted to carousel,
  caption, Reel, or Story language rather than duplicating LinkedIn text.
- **FR-010**: System MUST support a weekly plan that selects three LinkedIn
  publishing candidates from the daily backlog.
- **FR-011**: System MUST prevent public publishing unless a draft is explicitly
  approved.
- **FR-011a**: System MUST run a recommendation agent that reviews the user's
  profile context, recent posts, and the three daily options to recommend the
  strongest post for that day.
- **FR-011c**: System MUST use a user-maintained Google Drive file as the source
  of profile and recent-post context for the recommendation agent.
- **FR-011d**: System MUST alert the user when the profile-context file is
  missing or has not been updated within the configured freshness window.
- **FR-011i**: System MUST treat the profile-context file as fresh for 14 days;
  if older, the WhatsApp decision message MUST warn that the recommendation is
  based on outdated profile/post context.
- **FR-011b**: System MUST send a WhatsApp message containing the dated Google
  Drive folder link, the recommended option, and a short rationale.
- **FR-011e**: System MUST keep the MVP in manual-publishing mode: it may
  recommend and prepare content, but it MUST NOT schedule or publish posts.
- **FR-011f**: System MUST include enough decision context in the WhatsApp
  message for the user to choose and access the day's post without opening the
  automation builder.
- **FR-011g**: During implementation, the system design MUST present five
  WhatsApp decision-message template options and use the user-selected template
  as the production format.
- **FR-011h**: The selected WhatsApp decision-message template MUST include the
  dated folder link, summary of all three options, recommended option,
  recommendation rationale, best channel/format, available materials, and next
  steps for manual publishing.
- **FR-012**: System MUST log run status, source failures, generation errors,
  delivery attempts, and output file links.
- **FR-013**: System MUST provide a dry-run mode that creates sample outputs
  without sending WhatsApp messages or publishing content.
- **FR-014**: System MUST preserve user profile and application recommendations
  as editable Markdown artifacts.
- **FR-015**: System MUST avoid saving secrets, cookies, or personal access
  tokens in generated files.
- **FR-016**: System MUST maintain BMAD notes for Analyst, PM, and Architect
  perspectives before implementation.
- **FR-017**: System MUST maintain GSD Plan, Execute, and Verify checkpoints for
  each implemented workflow slice.

### Constitutional Constraints

- **CC-001**: Every generated draft MUST reinforce the user's positioning in AI
  automation, CRM/ERP systems, sales operations, or operational efficiency.
- **CC-002**: Every factual claim used from external sources MUST include a URL
  and confidence label.
- **CC-003**: Publishing MUST require human approval.
- **CC-004**: Credentials MUST be referenced by credential name or environment
  variable only, never written into Markdown outputs or specs.
- **CC-005**: BMAD and GSD checkpoints MUST be completed before scheduled
  production activation.

### Initial Source Registry

- **Official / primary**: OpenAI Product Releases, OpenAI Help Center release
  notes, Anthropic Newsroom, Claude product updates, Google Gemini Blog, Google
  DeepMind Blog, Google Developers AI Blog, Google Cloud AI Blog, AI at Meta
  Blog, Microsoft AI Blog, GitHub Blog AI, AWS Machine Learning Blog, NVIDIA AI
  Blog, Hugging Face Blog, Mistral AI News, Cohere Blog.
- **Research / developer signal**: arXiv CS.AI, Papers with Code, Stanford HAI,
  MIT CSAIL, Berkeley BAIR.
- **Secondary trend validation**: The Decoder, VentureBeat AI, TechCrunch AI,
  MIT Technology Review AI, The Rundown AI, Ben's Bites.

### Key Entities *(include if feature involves data)*

- **Source**: Configured website, feed, or endpoint with ranking, category, and
  trust level.
- **Update Item**: Retrieved AI news or release with source metadata, summary,
  confidence, and relevance score.
- **Daily Briefing**: WhatsApp-ready digest for the user.
- **Draft Post**: Markdown content artifact for LinkedIn or Instagram with
  channel, format, sources, and approval state.
- **Daily Folder**: Google Drive folder named by run date containing the daily
  structured document and related assets.
- **Recommendation**: Agent-generated ranking of the three daily post options
  based on profile context, recent posts, fit with positioning, and timing.
- **Profile Context File**: User-maintained Google Drive document containing the
  current profile narrative, positioning, and recent post examples used by the
  recommendation agent.
- **Approval Record**: User decision that marks a draft pending, approved,
  rejected, edited, scheduled, or published.
- **Run Log**: Execution record containing timing, source results, delivery
  status, failures, and output links.
- **Profile Recommendation**: Reusable profile and application guidance tied to
  LinkedIn, Upwork, or job applications.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A morning run produces a WhatsApp briefing and three Markdown
  drafts by 08:00 America/Sao_Paulo on at least 90% of scheduled days.
- **SC-002**: At least 95% of published factual claims in drafts include source
  URLs and confidence labels.
- **SC-003**: The user can identify the best three LinkedIn posts for the week
  in under 10 minutes from the saved drafts.
- **SC-004**: No public social post is published without a recorded approval.
- **SC-005**: Partial source failures do not prevent output generation when at
  least five verified source items are available.
- **SC-006**: Profile and application recommendation artifacts can be reviewed
  and edited without opening the automation builder.

## Assumptions

- n8n is the intended orchestration platform.
- The daily schedule is 08:00 in the America/Sao_Paulo timezone.
- Google Drive is the storage target for Markdown drafts and logs.
- The daily folder name uses the local run date in `DD-MM-YYYY` format, for
  example `02-06-2026`, to keep Brazilian readability without using `/` as a
  path separator.
- WhatsApp delivery will use Uazapi through an n8n HTTP Request node.
- Profile and recent-post context will come from a user-maintained Google Drive
  file, not automated LinkedIn scraping or browser login.
- The profile-context file freshness window is 14 days.
- Instagram publishing, if enabled later, requires an Instagram Business or
  Creator account connected to a Facebook Page.
- LinkedIn and Instagram posts remain drafts until the user explicitly approves
  them.
- The first implementation focuses on daily draft generation and WhatsApp
  summaries, not autonomous public posting.
- MVP publishing is manual: the user opens the Google Drive folder, reviews the
  recommended option, and publishes directly on the chosen social channel.
- BMAD and GSD are process layers used alongside Spec Kit, not separate sources
  of truth for requirements.
