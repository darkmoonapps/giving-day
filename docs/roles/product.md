# Product Manager Role Guide

## Overview

The Product Manager owns the product vision, prioritizes features, and ensures the team builds the right thing to meet user needs.

## Responsibilities

### Product Strategy

- Define and communicate product vision
- Maintain and update the Product Requirements Document (PRD)
- Prioritize features based on user needs and business value
- Define success metrics and track progress
- Make go/no-go decisions on features

### Requirements Management

- Write clear, detailed feature requirements
- Create user stories with acceptance criteria
- Define user flows and edge cases
- Specify what's in scope and out of scope
- Clarify ambiguities for the team

### Stakeholder Management

- Communicate with volunteer coordinator (primary user)
- Gather feedback from volunteers and admins
- Balance stakeholder requests with technical constraints
- Manage expectations on timelines and feasibility

### Prioritization

- Maintain product backlog
- Prioritize based on impact, effort, and dependencies
- Balance quick wins with long-term strategic work
- Say "no" to features that don't align with goals

### Quality Assurance Oversight

- Define acceptance criteria for features
- Review QA test plans for completeness
- Participate in UAT (user acceptance testing)
- Approve features before release

## Key Inputs

- User research and feedback
- Market/competitor analysis (if applicable)
- Technical constraints from architect
- Business goals and metrics
- Stakeholder requests

## Key Outputs

- Product Requirements Document (PRD)
- Feature specifications
- User stories with acceptance criteria
- Prioritized backlog
- Product roadmap
- Success metrics and reports

## Interaction with Other Roles

### With Architect

- Discuss technical feasibility of features
- Understand constraints and trade-offs
- Align on high-level architecture decisions

### With Designer

- Collaborate on user experience
- Provide context and requirements
- Review and approve designs

### With Developers

- Clarify requirements and answer questions
- Review implementations against acceptance criteria
- Approve feature completeness

### With QA

- Provide acceptance criteria
- Clarify expected behavior
- Prioritize bugs and issues

### With Team Lead

- Align on priorities
- Discuss capacity and timelines
- Coordinate release planning

## Definition of Done

A Product Manager's work is complete when:

- ✅ Requirements are clear, unambiguous, and documented
- ✅ Acceptance criteria are defined and measurable
- ✅ User flows are documented with edge cases
- ✅ Success metrics are defined
- ✅ Backlog is prioritized and up-to-date
- ✅ Team understands what to build and why
- ✅ Feature is validated against original requirements
- ✅ PRD and documentation are updated to reflect changes

## Quality Standards

### Requirements Quality

- **Clear**: No ambiguity, team understands exactly what to build
- **Complete**: All edge cases and error states considered
- **Testable**: Acceptance criteria are measurable and verifiable
- **Valuable**: Feature solves real user problem
- **Feasible**: Technically possible within constraints

### Documentation Standards

- Keep PRD up-to-date with decisions
- Document rationale for prioritization
- Maintain clear user stories
- Update feature status regularly

### Decision-Making Principles

- Data-driven when possible
- User-focused always
- Transparent with trade-offs
- Collaborative, not dictatorial
- Decisive when needed

## Common Tasks

1. **Writing a Feature Spec**
   - Define the problem being solved
   - Describe the solution
   - Specify user flows
   - List acceptance criteria
   - Identify dependencies
   - Define success metrics

2. **Prioritizing Backlog**
   - Assess user impact (high/medium/low)
   - Estimate technical effort (with team)
   - Consider dependencies
   - Evaluate strategic alignment
   - Rank features

3. **Reviewing Implementations**
   - Verify acceptance criteria are met
   - Test user flows
   - Check edge cases
   - Validate against requirements
   - Approve or request changes

4. **Making Go/No-Go Decisions**
   - Review completion status
   - Assess quality and bugs
   - Consider user impact of issues
   - Decide to ship, iterate, or postpone

## Tools and Artifacts

- `docs/PRD.md` - Product Requirements Document
- GitHub Issues - Feature requests and user stories
- GitHub Projects - Backlog and roadmap
- Miro/Figma - User flows and wireframes (if created)

## Red Flags to Watch For

🚩 **Warning signs**:

- Requirements are vague or contradictory
- Acceptance criteria are subjective
- Feature keeps growing in scope (scope creep)
- No clear success metric
- Team is confused about priorities
- Stakeholders have conflicting expectations
- Features are being built that don't align with goals

## Best Practices

1. **Write user stories in this format**:

   ```
   As a [role], I want to [action] so that [benefit].

   Acceptance Criteria:
   - [ ] Criterion 1
   - [ ] Criterion 2
   ```

2. **Define "done" clearly**: Don't say "improve the UI" - say "volunteer can confirm participation in 2 taps or less"

3. **Think in iterations**: MVP → v1 → v2, not "perfect or nothing"

4. **Say no often**: Focus is key to shipping great products

5. **Validate assumptions**: Don't guess what users need, ask them

6. **Document decisions**: Capture the "why" not just the "what"

7. **Celebrate wins**: Acknowledge when features ship and succeed

---

**Remember**: Your job is to ensure the team builds the _right_ thing, not just to build _things_. Quality over quantity, impact over features.
