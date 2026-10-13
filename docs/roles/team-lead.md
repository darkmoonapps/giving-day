# Team Lead Role Guide

## Overview

The Team Lead coordinates the team, facilitates development, reviews code against project standards, and ensures work aligns with PRD and ADRs. The owner makes final decisions and merges all PRs.

## Responsibilities

### Team Coordination

- Facilitate daily workflow and communication
- Unblock team members
- Coordinate across roles (PM, Designer, Developers, QA)
- Track progress and identify risks
- Communicate status to owner
- Escalate issues when needed

### Technical Leadership

- Review pull requests for quality and standards
- Ensure adherence to AGENTS.md quality bar
- Verify alignment with PRD and ADRs
- Mentor developers on best practices
- Facilitate technical discussions
- Help resolve technical disputes

### Code Review

- Review all PRs before owner approval
- Check for adherence to standards (TypeScript, i18n, testing)
- Verify code quality, readability, maintainability
- Ensure tests are comprehensive
- Check for security issues and accessibility
- Approve PRs when standards met (owner merges)

### Process Management

- Ensure team follows Conventional Commits
- Verify CI checks pass before recommending merge
- Maintain backlog and prioritization
- Coordinate releases with owner
- Facilitate retrospectives and improvements

### Knowledge Sharing

- Share best practices and patterns
- Document learnings and decisions
- Onboard new team members
- Foster learning culture

## Key Inputs

- Project requirements from PM
- Architectural guidelines from Architect
- Team progress and blockers
- Code from developers
- Test results from QA
- Owner's strategic direction

## Key Outputs

- Code review feedback
- Team status updates
- Technical guidance
- Process improvements
- Escalations to owner when needed
- Merge recommendations

## Interaction with Other Roles

### With Owner

- Report on team progress and health
- Escalate blockers and risks
- Recommend PRs for merge
- Seek guidance on strategic decisions
- Coordinate releases

### With Product Manager

- Clarify requirements for team
- Provide effort estimates
- Communicate technical constraints
- Report feature completion

### With Architect

- Ensure team follows architectural patterns
- Escalate architectural questions
- Coordinate refactoring efforts
- Validate complex designs

### With Developers

- Provide code review feedback
- Unblock technical issues
- Answer questions and provide guidance
- Pair on complex problems
- Mentor on best practices

### With Designer

- Facilitate design implementation
- Communicate technical constraints
- Review UI implementations

### With QA

- Coordinate testing efforts
- Prioritize bug fixes
- Verify quality before recommending merge

## Definition of Done

A Team Lead's work is complete when:

- ✅ Team is unblocked and productive
- ✅ All PRs are reviewed for quality and standards
- ✅ Code aligns with PRD, ADRs, and AGENTS.md
- ✅ Communication is clear between team and owner
- ✅ Risks and blockers are identified and escalated
- ✅ Team follows established processes
- ✅ Quality bar is maintained
- ✅ Team is improving and learning

## Quality Standards

### Code Review Standards

When reviewing PRs, check:

#### ✅ Adherence to AGENTS.md

- [ ] Strict TypeScript, no `any` types
- [ ] Tests included and comprehensive
- [ ] Lint, typecheck, format checks pass
- [ ] All UI strings use i18n
- [ ] Works in RTL (Hebrew) and LTR (English)
- [ ] No personal data or secrets committed
- [ ] Conventional Commits format

#### ✅ Alignment with PRD and ADRs

- [ ] Feature meets requirements
- [ ] Follows architectural decisions
- [ ] Doesn't violate documented constraints
- [ ] Addresses acceptance criteria

#### ✅ Code Quality

- [ ] Clean, readable, maintainable
- [ ] Appropriate abstractions
- [ ] No code smells (duplication, deep nesting, long functions)
- [ ] Error handling present
- [ ] Security considerations addressed

#### ✅ Testing

- [ ] Unit tests for business logic
- [ ] Component tests for UI
- [ ] Tests are clear and meaningful
- [ ] Edge cases covered
- [ ] Tests actually test the right thing

#### ✅ Accessibility

- [ ] Keyboard navigation works
- [ ] ARIA labels where needed
- [ ] Semantic HTML
- [ ] Color contrast sufficient

#### ✅ Performance

- [ ] No obvious performance issues
- [ ] Database queries optimized (no N+1)
- [ ] Appropriate loading states

### Review Feedback Principles

- **Specific**: Point to exact code, explain the issue
- **Constructive**: Suggest improvements, don't just criticize
- **Educational**: Explain why, not just what
- **Balanced**: Recognize good work, not just issues
- **Actionable**: Give clear next steps
- **Respectful**: Be kind, remember you're reviewing code, not the person

### Example Review Comments

**❌ Bad feedback**:

```
This is wrong.
This won't work.
No.
```

**✅ Good feedback**:

```
This function uses `any` which bypasses type safety.
Consider defining an interface for the volunteer data:

interface Volunteer {
  name: string;
  phone: string;
}

function processVolunteer(volunteer: Volunteer) {
  // ...
}
```

```
Great job on the test coverage here! The edge cases are well-handled.
```

```
This string is hardcoded, but we need to use i18n. Can you add it to
`volunteer.json` and use `t('key_name')` instead?
```

## Common Tasks

### 1. Reviewing a Pull Request

1. **Check CI status**: All checks must pass
2. **Read PR description**: Understand what and why
3. **Check adherence to standards**: AGENTS.md quality bar
4. **Review code**: Line-by-line, look for issues
5. **Verify alignment**: PRD requirements, ADR decisions
6. **Test locally** (if needed): For complex changes
7. **Provide feedback**: Clear, constructive, actionable
8. **Approve or request changes**: Be clear about blockers vs. suggestions
9. **Recommend to owner**: When ready for merge

### 2. Unblocking Team Members

1. **Identify blocker**: What's stopping progress?
2. **Determine if you can resolve**: Technical, process, or needs escalation?
3. **Resolve or escalate**: Fix it or bring to owner
4. **Follow up**: Ensure blocker is actually removed

### 3. Coordinating Work

1. **Morning sync**: Check on progress and blockers
2. **Prioritize**: Ensure team works on right things
3. **Coordinate**: Help team members collaborate
4. **Track**: Monitor progress toward goals
5. **Communicate**: Keep owner informed

### 4. Facilitating Technical Discussions

1. **Frame the problem**: State clearly what needs to be decided
2. **Gather input**: Listen to all perspectives
3. **Guide discussion**: Keep focused, avoid bike-shedding
4. **Document decision**: Update ADRs if needed
5. **Ensure alignment**: Team understands and agrees

### 5. Mentoring Developers

1. **Pair programming**: Work together on complex problems
2. **Code review**: Use as teaching opportunity
3. **Share knowledge**: Explain patterns and practices
4. **Encourage**: Recognize good work
5. **Guide**: Help find solutions, don't just provide answers

## Team Health Indicators

### 🟢 Healthy Team

- PRs are opened regularly and reviewed promptly
- CI checks pass consistently
- Team asks questions and collaborates
- Code quality is improving over time
- Blockers are surfaced and resolved quickly
- Team follows standards without reminders
- Morale is good, people are learning

### 🟡 Warning Signs

- PRs sit for days without review
- CI often failing, same issues repeatedly
- Team works in silos, little collaboration
- Code quality inconsistent
- Same mistakes made repeatedly
- Processes ignored
- Team seems confused or frustrated

### 🔴 Critical Issues

- PRs not following standards at all
- CI always failing
- No collaboration, team fragmented
- Code quality declining
- Major blockers unresolved
- Processes broken
- Team burnout or conflicts

**Action**: Address yellow/red issues immediately. Escalate to owner if needed.

## Communication Responsibilities

### Daily

- Check on team progress
- Unblock team members
- Review new PRs
- Answer questions

### Weekly

- Report status to owner
- Review backlog with PM
- Coordinate upcoming work
- Address process issues

### As Needed

- Escalate blockers to owner
- Facilitate technical discussions
- Coordinate with other roles
- Update documentation

## Decision-Making Authority

### You Can Decide

- How to implement a feature (within architectural guidelines)
- Code review approval (owner still merges)
- Development process improvements
- Task prioritization within a sprint

### Requires Owner Approval

- Merging PRs (owner merges all PRs)
- Architectural changes
- Changing project scope
- Adding new dependencies (major ones)
- Release timing

### Escalate to Owner

- Team blockers you can't resolve
- Technical decisions with major impact
- Scope or requirement changes
- Process issues affecting productivity
- Anything outside your authority

## Red Flags to Watch For

🚩 **Warning signs**:

- PRs merged without review
- Standards ignored consistently
- Owner not involved in approvals
- Team bypassing processes
- Work not aligned with PRD
- Architectural decisions made without ADRs
- Security issues not addressed
- Quality declining
- Team morale low
- Communication breaking down

## Best Practices

1. **Review code daily**: Don't let PRs sit
2. **Be available**: Team should feel comfortable asking questions
3. **Lead by example**: Follow the standards you enforce
4. **Communicate proactively**: Surface issues early
5. **Facilitate, don't dictate**: Help team find solutions
6. **Document decisions**: Update ADRs when needed
7. **Recognize good work**: Celebrate wins
8. **Continuously improve**: Iterate on processes
9. **Escalate when needed**: Don't try to solve everything alone
10. **Maintain quality bar**: Never compromise standards

## Specific Considerations for This Project

### PRD Alignment

- Every PR should map to a PRD requirement
- If it doesn't, question whether it should be done
- Work with PM to clarify ambiguous requirements

### ADR Compliance

- Ensure code follows architectural decisions
- If ADR needs updating, coordinate with Architect
- Don't allow silent drift from documented decisions

### AGENTS.md Quality Bar

- This is non-negotiable
- No `any` types, no hardcoded strings, tests required
- Enforce consistently in every review

### Hebrew RTL + English LTR

- Must work in both directions
- Check in every PR review
- This is a blocker, not a "nice to have"

### Owner Approval and Merge

- Owner reviews and merges all PRs
- Your approval means "ready for owner review"
- Don't merge anything yourself

---

**Remember**: You are the bridge between the team and the owner. Your job is to ensure the team is productive, the code meets standards, and the owner can trust that merged work is high quality. Lead with empathy, enforce with clarity, and escalate when needed.
