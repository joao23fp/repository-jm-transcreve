<!--
Sync Impact Report
Version change: 1.0.0 -> 1.1.0
Modified principles: added AI development methodology discipline
Added sections: BMAD & GSD Operating Model
Removed sections: none
Templates requiring updates:
- updated: .specify/templates/plan-template.md
- updated: .specify/templates/spec-template.md
- updated: .specify/templates/tasks-template.md
Follow-up TODOs: none
-->

# AI Content Authority Automation Constitution

## Core Principles

### I. Professional Authority First
Every feature MUST strengthen the user's positioning as an AI automation,
CRM/ERP, and revenue-operations professional. Content MUST connect AI news to
practical business outcomes, implementation lessons, or career credibility.
Generic trend summaries without a clear professional point of view are not
acceptable.

### II. Verifiable Sources Over Viral Claims
Every generated post, WhatsApp digest, and saved draft MUST preserve source
URLs, publication dates when available, and a confidence label. Official vendor
sources MUST be prioritized over secondary media. Rumors, social posts, and
community threads MAY be used only as inspiration or weak signals and MUST NOT
be presented as verified facts.

### III. Human Approval Before Public Posting
The system MUST save drafts and notify the user, but MUST NOT publish to
LinkedIn, Instagram, or any other public channel without an explicit approval
step. Generated content MUST be editable before publication, and the workflow
MUST make it clear which version is pending, approved, rejected, or published.

### IV. Privacy and Credential Minimization
Credentials for WhatsApp, Google Drive, OpenAI, Meta, LinkedIn, n8n, or any
third-party service MUST be stored only in approved credential stores or
environment variables. The project MUST NOT commit secrets, session cookies, or
personal tokens. Personal profile data and job-application answers MUST be used
only for the user's own career and content workflows.

### V. Observable and Recoverable Automation
Daily workflows MUST log source checks, generation results, delivery attempts,
approval state, and failures in a way that can be reviewed later. A failed
source or channel MUST NOT block the entire morning run when enough valid
sources remain. Failures MUST produce a concise user-facing alert with the next
action needed.

## Content & Automation Constraints

The automation MUST generate Portuguese-first content unless a specific draft is
marked for English. LinkedIn drafts MUST be suitable for professional authority
building and may use concise storytelling, contrarian analysis, tactical
checklists, or implementation lessons. Instagram drafts MUST be adapted to
carousel, Reel caption, or Story formats instead of copying the LinkedIn text.

The source registry MUST include at least 20 configured sources, with official
AI company and product-update sources at the top of the ranking. Each morning
run MUST deduplicate repeated stories and clearly separate confirmed releases,
analysis-worthy market moves, research papers, and speculative signals.

## BMAD & GSD Operating Model

The project MUST use BMAD-style role separation before implementation when a
feature changes product scope, architecture, data flow, external integrations,
or public user-facing behavior. At minimum, those features MUST capture:

- Analyst view: problem, audience, risks, and evidence;
- PM view: user outcomes, priority, acceptance criteria, and MVP boundary;
- Architect view: system shape, integration boundaries, credentials, storage,
  failure modes, and tradeoffs.

The project MUST use GSD-style execution discipline for every feature:

- Plan: finalize spec and plan before implementation;
- Execute: implement one independently testable story or task group at a time;
- Verify: check delivered behavior against the spec, constitution, and sample
  outputs before activating scheduled automation.

BMAD and GSD are operating disciplines for this project, not replacements for
Spec Kit artifacts. Spec Kit remains the source of truth for constitution,
specification, plan, tasks, and analysis records.

## Workflow & Quality Gates

Before planning or implementation, each feature MUST document:

- the user-facing outcome;
- the data sources and confidence rules;
- the approval flow before any public posting;
- where drafts, summaries, and logs are stored;
- which credentials are required and how they are protected;
- how a failed daily run is detected and recovered.
- the BMAD role notes required for the feature scope;
- the GSD Plan, Execute, and Verify checkpoints.

Implementation work MUST include a dry-run mode, sample outputs, and a manual
test path before any scheduled production run is activated.

## Governance

This constitution supersedes conflicting informal practices for this project.
Amendments require an explicit update to this file, a Sync Impact Report, and a
review of affected Spec Kit templates and active specs.

Versioning follows semantic versioning. MAJOR changes redefine or remove core
principles. MINOR changes add principles, required sections, or workflow gates.
PATCH changes clarify wording without changing obligations.

All specs, plans, and task lists MUST be checked against the Core Principles
before implementation starts. Any exception MUST be documented in the plan's
Complexity Tracking section with the reason and rejected simpler alternative.

**Version**: 1.1.0 | **Ratified**: 2026-06-03 | **Last Amended**: 2026-06-03
