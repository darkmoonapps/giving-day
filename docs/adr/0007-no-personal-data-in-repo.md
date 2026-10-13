# ADR 0007: No Personal Data in Repository

**Status**: Accepted

**Date**: 2026-10-13

## Context

The application will handle sensitive personal information:

- Volunteer names, phone numbers, addresses
- Elder names, addresses, dietary requirements, health information
- Volunteer-elder relationships

We need strict policies to protect privacy and comply with data protection regulations.

## Decision

**No real personal data shall ever be committed to the repository.**

Personal data includes:

- Real names (volunteers, elders)
- Real phone numbers
- Real addresses or locations
- Real email addresses
- Any other personally identifiable information (PII)

**All test data, seeds, fixtures, and examples must use fake/synthetic data only.**

## Consequences

### Positive

- **Privacy protection** - No risk of exposing real user data via git history
- **Regulatory compliance** - Helps meet GDPR, privacy law requirements
- **Security** - Reduces attack surface (no PII to steal from repository)
- **Safe open-source** - Can consider open-sourcing without privacy concerns
- **Safe collaboration** - External contributors can't accidentally access real data

### Negative

- **Development friction** - Can't use production data for debugging locally
- **Test data maintenance** - Must create and maintain realistic fake data
- **Onboarding** - New developers see only synthetic data, not real patterns

### Mitigation Strategies

- Provide realistic fake data generators for development
- Use tools like Faker.js for seed data
- Document data patterns without exposing real data
- Use environment-based configuration to connect to real database only in production

## Requirements

### For Development

- **Seed scripts** must generate fake data programmatically
- Use libraries like `@faker-js/faker` for realistic fake data
- Example seed pattern:
  ```typescript
  import { faker } from '@faker-js/faker';

  const volunteer = {
    name: faker.person.fullName(),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
  };
  ```

### For Tests

- **Fixtures** and test data must use obviously fake values
- Example:
  ```typescript
  const mockVolunteer = {
    name: 'Test Volunteer',
    phone: '+972-50-0000000',
    address: '123 Test Street, Tel Aviv',
  };
  ```

### For Documentation

- Use generic placeholders in examples:
  ```
  Name: [Volunteer Name]
  Phone: [Phone Number]
  ```
- Or clearly fake but illustrative data:
  ```
  Name: John Doe
  Phone: +972-50-1234567
  Address: 42 Example Street
  ```

### For Configuration

- **Never commit** `.env` files with real credentials
- Provide `.env.example` with placeholder values
- Use environment variables for all sensitive configuration
- Database connection strings must not be committed

## Forbidden Practices

❌ **Never do these:**

- Commit real production database dumps
- Copy-paste real data into seed files or tests
- Include real phone numbers or addresses in code comments
- Commit screenshots with real user data visible
- Store real data in fixtures or mock files

## Allowed Practices

✅ **Safe practices:**

- Generate fake data with Faker.js or similar
- Use generic placeholder names like "Volunteer 1", "Elder A"
- Create synthetic test datasets programmatically
- Anonymize/pseudonymize data if absolutely necessary for debugging (and still don't commit)

## Enforcement

### Code Review

- All PRs must be checked for PII before merging
- Reviewers must reject any PR containing real personal data
- Automated checks (grep for phone patterns, email patterns) can help but aren't sufficient

### Git History

- If real data is accidentally committed:
  1. Do NOT just delete it in a new commit (it remains in history)
  2. Use `git filter-branch` or BFG Repo-Cleaner to remove from history
  3. Force-push cleaned history (coordinate with team)
  4. Rotate any exposed credentials immediately

### CI Checks

- Consider adding pre-commit hooks to detect common PII patterns
- Check for phone number patterns, email formats, etc.
- Fail CI if suspicious patterns detected

## Alternatives Considered

### Allow Real Data with Gitignore

**Rejected**: Gitignore prevents future commits but doesn't protect against accidental `git add -f` or mistakes. Complete prohibition is safer.

### Encrypt Personal Data in Repo

**Rejected**: Adds complexity, key management issues, and doesn't solve the fundamental problem. Data should live in databases, not repositories.

### Use Git-Crypt or Similar

**Rejected**: Over-engineered for the problem. Test/seed data should simply be fake from the start.

## Notes

- Real data belongs in databases accessed via environment-specific credentials
- Development databases should be populated with fake data from seed scripts
- Production database backups must be stored securely outside of git
- Document data structures and patterns without including real examples
- Consider synthetic data generation tools for realistic testing at scale
