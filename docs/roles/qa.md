# QA (Quality Assurance) Role Guide

## Overview

QA ensures the application works correctly, meets requirements, and is free of critical bugs before release.

## Responsibilities

### Testing

- Write and execute test plans
- Perform manual testing (exploratory, functional, regression)
- Test in multiple browsers and devices
- Test in both Hebrew (RTL) and English (LTR)
- Verify accessibility compliance
- Document test cases and results

### Bug Management

- Identify, reproduce, and document bugs
- Prioritize bugs by severity
- Verify bug fixes
- Track bug lifecycle (open → fixed → verified → closed)
- Maintain bug backlog

### Quality Standards

- Ensure acceptance criteria are met
- Validate against requirements and designs
- Check for usability issues
- Test edge cases and error conditions
- Verify data integrity

### Collaboration

- Work with PM to understand acceptance criteria
- Clarify expected behavior with developers
- Provide detailed bug reports
- Participate in requirement reviews
- Advocate for quality

## Key Inputs

- Product requirements and acceptance criteria
- Design mockups and specifications
- Feature implementations from developers
- User feedback and bug reports
- Testing guidelines and standards

## Key Outputs

- Test plans and test cases
- Test execution results
- Bug reports with reproduction steps
- Test summary reports
- Regression test results
- Sign-off on features (when acceptance criteria met)

## Interaction with Other Roles

### With Product Manager

- Clarify acceptance criteria
- Validate features against requirements
- Report on quality status
- Recommend delaying release if quality insufficient

### With Developers

- Report bugs with clear reproduction steps
- Verify bug fixes
- Ask questions about expected behavior
- Pair on complex testing scenarios

### With Designer

- Verify implementation matches designs
- Test responsive behavior
- Check accessibility compliance
- Report UI/UX issues

### With Team Lead

- Report testing progress
- Prioritize testing work
- Escalate critical quality issues
- Recommend when features are ready

## Definition of Done

QA work is complete when:

- ✅ All acceptance criteria verified and passing
- ✅ Test cases executed and documented
- ✅ Critical and high-priority bugs fixed and verified
- ✅ Tested in both Hebrew (RTL) and English (LTR)
- ✅ Tested on multiple browsers (Chrome, Firefox, Safari, Edge)
- ✅ Tested on mobile and desktop
- ✅ Accessibility checks passed
- ✅ No console errors or warnings
- ✅ Regression tests passed (no existing features broken)
- ✅ Performance acceptable (no major slowdowns)
- ✅ Security vulnerabilities addressed
- ✅ Sign-off provided for release

## Quality Standards

### Bug Report Quality

A good bug report includes:

- **Clear title**: Brief description of the issue
- **Steps to reproduce**: Detailed, numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Browser, OS, device
- **Screenshots/videos**: Visual evidence
- **Severity**: Critical, high, medium, low
- **Priority**: Blocker, high, medium, low

**Example**:

```
Title: [Web] Confirm button not working on Hebrew volunteer screen

Steps to Reproduce:
1. Log in as volunteer
2. Switch language to Hebrew
3. Navigate to confirmation screen
4. Click "אשר השתתפות" button

Expected: Confirmation submitted, success message shown
Actual: Button does nothing, no response

Environment:
- Browser: Chrome 120 on macOS 14
- Language: Hebrew (RTL)

Screenshot: [attached]

Severity: High (blocks core user flow)
Priority: High (must fix before release)
```

### Test Case Quality

A good test case includes:

- **ID**: Unique identifier
- **Feature**: What feature is being tested
- **Scenario**: What specific scenario
- **Preconditions**: Setup required
- **Steps**: Detailed test steps
- **Expected result**: What success looks like
- **Actual result**: (filled during execution)
- **Status**: Pass/Fail
- **Notes**: Any observations

## Common Tasks

### 1. Creating a Test Plan

1. Review requirements and acceptance criteria
2. Identify test scenarios (happy path, edge cases, errors)
3. Write test cases for each scenario
4. Organize by feature/priority
5. Review with PM and developers
6. Get approval before execution

### 2. Executing Tests

1. Set up test environment
2. Execute test cases step-by-step
3. Document results (pass/fail, screenshots)
4. Log bugs for failures
5. Summarize test results
6. Report to team

### 3. Bug Reporting

1. Reproduce the bug consistently
2. Simplify reproduction steps (minimum steps needed)
3. Determine severity and priority
4. Write clear bug report (see format above)
5. Attach evidence (screenshots, videos, logs)
6. Submit to bug tracking system (GitHub Issues)
7. Follow up with developer if needed

### 4. Regression Testing

1. Identify areas affected by recent changes
2. Re-run relevant test cases
3. Verify no new bugs introduced
4. Check that old bugs remain fixed
5. Report any regressions immediately

### 5. Accessibility Testing

- **Keyboard navigation**: Tab through all interactive elements
- **Screen reader**: Test with VoiceOver (macOS) or NVDA (Windows)
- **Color contrast**: Use WebAIM Contrast Checker
- **Zoom**: Test at 200% zoom
- **Alt text**: Verify images have descriptions
- **ARIA labels**: Check for proper ARIA attributes
- **Focus indicators**: Ensure visible focus states

## Testing Checklist (Per Feature)

### Functional Testing

- [ ] Happy path works as expected
- [ ] Edge cases handled correctly
- [ ] Error cases show appropriate messages
- [ ] Form validation works (required fields, formats)
- [ ] Data persists correctly (saved to database)
- [ ] API responses are correct

### UI/UX Testing

- [ ] Matches design mockups
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Works in RTL (Hebrew) and LTR (English)
- [ ] Loading states display correctly
- [ ] Success messages display correctly
- [ ] Error messages are clear and helpful
- [ ] No layout issues (overflow, overlapping, alignment)

### Browser Testing

- [ ] Chrome (desktop and mobile)
- [ ] Firefox
- [ ] Safari (desktop and iOS)
- [ ] Edge

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Alt text on images
- [ ] Form labels present

### Performance Testing

- [ ] Page loads in reasonable time (<3 seconds)
- [ ] No console errors or warnings
- [ ] No memory leaks (test for sustained use)
- [ ] Smooth animations and interactions

### Security Testing (Basic)

- [ ] Authentication required where needed
- [ ] Unauthorized access denied
- [ ] XSS protection (test with `<script>alert('xss')</script>`)
- [ ] SQL injection protection (test with `' OR '1'='1`)
- [ ] Sensitive data not exposed in URLs or responses

## Test Types

### 1. Smoke Testing

Quick check after deployment to verify core functionality:

- App loads
- Login works
- Critical user flows work
- No obvious breaks

### 2. Functional Testing

Verify features work according to specifications:

- Test each feature against acceptance criteria
- Verify inputs, outputs, and side effects

### 3. Regression Testing

Ensure existing features still work after changes:

- Re-run tests for related features
- Focus on areas likely affected by changes

### 4. Exploratory Testing

Unscripted testing to find unexpected issues:

- Try unusual inputs
- Click around freely
- Test combinations of features
- Think like a malicious user

### 5. Usability Testing

Evaluate user experience:

- Is it intuitive?
- Can users accomplish tasks easily?
- Are error messages helpful?
- Is the flow logical?

## Bug Severity and Priority

### Severity (Impact)

- **Critical**: App is unusable, data loss, security breach
- **High**: Major feature broken, no workaround
- **Medium**: Feature partially broken, workaround exists
- **Low**: Minor issue, cosmetic, typo

### Priority (Urgency)

- **Blocker**: Must fix before release
- **High**: Fix soon, in next release
- **Medium**: Fix when possible
- **Low**: Nice to have, backlog

## Tools

### Testing Tools

- **Manual testing**: Browser, mobile devices
- **Browser DevTools**: Inspect elements, console, network
- **Accessibility**: WAVE, axe DevTools, Lighthouse
- **Screen readers**: VoiceOver (macOS), NVDA (Windows)
- **Responsive design mode**: Browser built-in tools

### Bug Tracking

- **GitHub Issues**: For bug reports and tracking

### Test Management (Optional)

- Spreadsheet for test cases (simple)
- TestRail, Zephyr (if more formal process needed)

## Red Flags to Watch For

🚩 **Warning signs**:

- Features deployed without testing
- Bugs marked as "won't fix" without justification
- No time allocated for regression testing
- Only testing happy path, ignoring edge cases
- Not testing in both Hebrew and English
- Ignoring accessibility
- Bugs found by users, not QA
- No test documentation
- Pressure to skip testing to meet deadlines

## Best Practices

1. **Test early and often**: Don't wait until the end
2. **Test as a user would**: Think like the end user
3. **Document everything**: Test cases, results, bugs
4. **Communicate clearly**: Clear bug reports save time
5. **Be thorough, not pedantic**: Focus on real issues
6. **Advocate for quality**: Push back on shipping broken features
7. **Collaborate, don't blame**: Work with developers, not against them
8. **Test in both languages**: Hebrew (RTL) and English (LTR) every time
9. **Test on real devices**: Emulators are useful but not sufficient
10. **Automate when possible**: Work with developers to automate repetitive tests

## Specific Considerations for This Project

### Hebrew RTL Testing

- Verify text right-aligned
- Check navigation on correct side
- Ensure icons mirrored (arrows, etc.)
- Test form layouts
- Verify tables flow right-to-left

### Mobile-First Focus

- Most volunteers use mobile
- Test mobile experience thoroughly
- Ensure touch targets are large enough (44x44px)
- Test on actual mobile devices, not just browser emulation

### Volunteer vs. Admin Flows

- **Volunteer**: Simple, must be intuitive
- **Admin**: More complex, data-heavy, needs thorough testing

### Key User Flows to Test

1. **Volunteer Confirmation**:
   - Login → Receive notification → Confirm participation
2. **Admin Create Distribution Day**:
   - Login → Create day → Verify volunteers notified
3. **Admin Reassignment**:
   - Volunteer cancels → Elder appears in "needs deliverer" → Admin assigns replacement

---

**Remember**: Your role is to ensure quality, not to rubber-stamp releases. It's okay to say "this isn't ready." Better to delay a release than to ship broken features. Quality is everyone's responsibility, but you are its champion.
