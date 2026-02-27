---
name: brainstorming-requirement
description: Use when creating or developing anything, before writing code or implementation plans - refines rough ideas into fully-formed designs through structured Socratic questioning, alternative exploration, and incremental validation. The result is a `REQs/REQ-<topic>-YYYY-MM-DD.md` file in REQs dir.
---

# Brainstorming Ideas Into Requirement file

## Overview

Transform rough ideas into fully-formed designs through structured questioning and alternative exploration.

**Core principle:** Ask questions to understand, explore alternatives, present design incrementally for validation.

**Announce at start:** "I'm using the brainstorming requirements skill to refine your idea into a design."

## Quick Reference

| Phase                       | Key Activities                        | Tool Usage                             | Output                               |
| --------------------------- | ------------------------------------- | -------------------------------------- | ------------------------------------ |
| **1. Understanding**        | Ask questions (one at a time)         | `ask_user` for choices                 | Purpose, constraints, criteria       |
| **2. Exploration**          | Propose 2-3 approaches                | `ask_user` for approach selection      | Architecture options with trade-offs |
| **3. Design Presentation**  | Present in 200-300 word sections      | Open-ended questions                   | Complete design with validation      |
| **4. Design Documentation** | Write requirement and design document | Use `write` to create REQ file         | Design doc in REQs/                  |

## The Process

Copy this checklist to track progress:

```
Brainstorming Progress:
- [ ] Phase 1: Understanding (purpose, constraints, criteria gathered)
- [ ] Phase 2: Exploration (2-3 approaches proposed and evaluated)
- [ ] Phase 3: Design Presentation (design validated in sections)
- [ ] Phase 4: Design Documentation (design written to REQs/)
```

### Phase 1: Understanding

- Check current project state in working directory using `read`, `bash`, `ls`.
- Ask ONE question at a time to refine the idea.
- **Use `ask_user` tool** when you have multiple choice options.
- Gather: Purpose, constraints, success criteria.

**Example using `ask_user`:**

```json
{
  "question": "Where should the authentication data be stored?",
  "options": [
    {"label": "Session storage", "description": "clears on tab close, more secure"},
    {"label": "Local storage", "description": "persists across sessions, more convenient"},
    {"label": "Cookies", "description": "works with SSR, compatible with older approach"}
  ]
}
```

### Phase 2: Exploration

- Propose 2-3 different approaches.
- For each: Core architecture, trade-offs, complexity assessment.
- **Use `ask_user` tool** to present approaches as structured choices.
- Ask your human partner which approach resonates.

**Example using `ask_user`:**

```json
{
  "question": "Which architectural approach should we use?",
  "options": [
    {"label": "Event-driven with message queue", "description": "scalable, complex setup, eventual consistency"},
    {"label": "Direct API calls with retry logic", "description": "simple, synchronous, easier to debug"},
    {"label": "Hybrid with background jobs", "description": "balanced, moderate complexity, best of both"}
  ]
}
```

### Phase 3: Design Presentation

- Present in 200-300 word sections.
- Cover: Architecture, components, data flow, error handling, testing.
- Ask after each section: "Does this look right so far?" (open-ended).
- Use open-ended questions here to allow freeform feedback.

### Phase 4: Design Requirement Documentation

After design is validated, write it to a permanent document:

- **File location:** `REQs/REQ-<topic>-YYYY-MM-DD.md` (use actual date and descriptive topic).
- **Content:** Capture the design as discussed and validated in Phase 3, organized into the sections that emerged from the conversation.
- Generate comprehensive `REQs/REQ-<topic>-YYYY-MM-DD.md` with:
  - Feature overview and user stories.
  - Functional requirements in EARS notation.
  - Non-functional requirements.
  - Acceptance criteria and dependencies.
- **Quick Validation**: Check requirements completeness.
- This document is not versioned.

## Question Patterns

### When to Use `ask_user` Tool

**Use `ask_user` for:**

- Phase 1: Clarifying questions with 2-4 clear options.
- Phase 2: Architectural approach selection (2-3 alternatives).
- Any decision with distinct, mutually exclusive choices.
- When options have clear trade-offs to explain.
- This is the preferred method. `ask_user`: User will always be able to select "Other" to provide custom text input if you include it as an option or if they cancel.
- Use `multiSelect: true` to allow multiple answers to be selected for a question.

**Benefits:**

- Structured presentation of options with descriptions.
- Clear trade-off visibility for partner.
- Forces explicit choice (prevents vague "maybe both" responses).

### When to Use Open-Ended Questions

**Use open-ended questions for:**

- Phase 3: Design validation ("Does this look right so far?").
- When you need detailed feedback or explanation.
- When partner should describe their own requirements.
- When structured options would limit creative input.

## Key Principles

| Principle                  | Application                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| **One question at a time** | Phase 1: Single question per message, use `ask_user` for choices      |
| **Structured choices**     | Use `ask_user` tool for 2-4 options with trade-offs                   |
| **YAGNI ruthlessly**       | Remove unnecessary features from all designs                          |
| **Explore alternatives**   | Always propose 2-3 approaches before settling                         |
| **Incremental validation** | Present design in sections, validate each                             |
| **Flexible progression**   | Go backward when needed - flexibility > rigidity                      |
| **Announce usage**         | State skill usage at start of session                                 |
