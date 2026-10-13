# Architect Role Guide

## Overview

The Architect ensures the technical integrity of the system, makes high-level design decisions, and guides the team on technology choices and patterns.

## Responsibilities

### System Architecture

- Design overall system architecture
- Define module boundaries and interactions
- Design database schema and data models
- Plan for scalability and performance
- Ensure system meets non-functional requirements (security, performance, maintainability)

### Technical Decision-Making

- Evaluate technology choices
- Write and maintain Architecture Decision Records (ADRs)
- Define coding standards and patterns
- Choose frameworks, libraries, and tools
- Balance technical excellence with pragmatism

### Technical Guidance

- Guide developers on implementation approaches
- Review complex technical designs
- Mentor team on architectural patterns
- Resolve technical disputes
- Provide technical risk assessment

### Quality Assurance

- Define technical quality standards
- Review code for architectural compliance
- Identify technical debt and plan remediation
- Ensure adherence to best practices
- Monitor system health and performance

### Documentation

- Maintain architectural documentation
- Keep ADRs up-to-date
- Document system design and patterns
- Create technical diagrams (system, database, flow)

## Key Inputs

- Product requirements from PM
- Technical constraints (infrastructure, budget, team skills)
- Current codebase state
- Industry best practices
- Team feedback on development experience

## Key Outputs

- System architecture design
- Architecture Decision Records (ADRs)
- Database schema design
- Technical specifications
- Code review feedback
- Technology recommendations
- Refactoring plans

## Interaction with Other Roles

### With Product Manager

- Assess technical feasibility of requirements
- Explain constraints and trade-offs
- Propose technical solutions to user needs
- Estimate complexity and effort

### With Developers

- Provide technical guidance
- Review designs and implementations
- Answer technical questions
- Pair on complex problems
- Share knowledge and mentor

### With Team Lead

- Align on technical priorities
- Coordinate refactoring work
- Assess technical risks
- Plan capacity for tech debt

### With QA

- Define testability requirements
- Review test architecture
- Identify areas needing more coverage

### With Designer

- Explain technical constraints on UI/UX
- Collaborate on performance requirements
- Ensure designs are technically feasible

## Definition of Done

An Architect's work is complete when:

- ✅ System design is documented and understood by team
- ✅ ADRs are written for major technical decisions
- ✅ Database schema is designed and reviewed
- ✅ Technical standards are defined and documented
- ✅ Module boundaries are clear and respected
- ✅ Non-functional requirements are addressed
- ✅ Technical risks are identified and mitigated
- ✅ Team can implement features without architectural blockers

## Quality Standards

### Architecture Quality

- **Scalable**: Can handle growth in users and data
- **Maintainable**: Easy to modify and extend
- **Testable**: Can be tested at all levels
- **Secure**: Follows security best practices
- **Performant**: Meets performance requirements
- **Simple**: As simple as possible, no simpler

### Decision-Making Principles

- **Documented**: ADRs for significant decisions
- **Pragmatic**: Balance ideal with practical
- **Reversible**: Prefer decisions that can be changed
- **Data-driven**: Benchmark and measure when possible
- **Team-aligned**: Consider team skills and preferences

### Code Review Standards

- Focus on architecture and patterns, not style
- Identify violations of design principles
- Check for security vulnerabilities
- Verify module boundaries respected
- Ensure consistency with existing patterns

## Common Tasks

### 1. Writing an ADR

```markdown
# ADR NNNN: [Title]

Status: [Proposed | Accepted | Deprecated | Superseded]
Date: YYYY-MM-DD

## Context

What problem are we solving? What constraints exist?

## Decision

What did we decide? What approach are we taking?

## Consequences

Positive: What benefits does this bring?
Negative: What are the downsides?
Mitigation: How do we address the negatives?

## Alternatives Considered

What else did we consider and why didn't we choose it?
```

### 2. Designing a Database Schema

- Identify entities and relationships
- Define primary keys and foreign keys
- Plan indexes for query performance
- Consider data integrity constraints
- Design for future extensibility
- Document schema in Prisma schema file
- Review with team before implementing

### 3. Reviewing Code for Architecture

Focus on:

- Module coupling and cohesion
- Layer boundaries (presentation, business, data)
- Error handling patterns
- Security concerns
- Performance implications
- Consistency with existing architecture

### 4. Refactoring Planning

- Identify technical debt
- Assess impact and priority
- Plan incremental steps
- Balance with feature work
- Document rationale

## Technical Standards for This Project

### Module Structure

```
apps/web/src/
├── components/       # Reusable UI components
├── features/         # Feature-specific code
├── hooks/           # Custom React hooks
├── services/        # API clients, external services
├── utils/           # Utilities and helpers
└── types/           # TypeScript types

apps/api/src/
├── [feature]/       # Feature modules (volunteers, distribution-days)
│   ├── [feature].controller.ts
│   ├── [feature].service.ts
│   ├── [feature].module.ts
│   └── dto/         # Data transfer objects
├── common/          # Shared utilities
└── prisma/          # Database service
```

### Layer Architecture

- **Presentation**: Controllers (API), Components (Web)
- **Business Logic**: Services
- **Data Access**: Prisma repositories
- **Cross-Cutting**: Guards, pipes, interceptors, middleware

### Key Patterns

- **Dependency Injection**: Use NestJS DI container
- **Repository Pattern**: Prisma service encapsulates DB access
- **DTO Pattern**: Validate input with class-validator
- **Hooks Pattern**: Extract reusable logic into custom hooks
- **Context Pattern**: Use React context sparingly, prefer prop drilling

## Tools and Artifacts

- `docs/adr/` - Architecture Decision Records
- `apps/api/prisma/schema.prisma` - Database schema
- System diagrams (when needed)
- GitHub PR reviews for architectural guidance

## Red Flags to Watch For

🚩 **Warning signs**:

- Circular dependencies between modules
- Business logic in controllers or components
- Direct database access outside Prisma service
- Inconsistent error handling
- Lack of input validation
- Security vulnerabilities (SQL injection, XSS, CSRF)
- Performance issues (N+1 queries, missing indexes)
- Diverging from established patterns without reason
- Overengineering simple features
- Technical debt accumulating without plan

## Best Practices

1. **Keep it simple**: Start with the simplest solution that works
2. **Document decisions**: Write ADRs for non-trivial choices
3. **Favor standards**: Use established patterns over custom solutions
4. **Think long-term**: Consider maintenance, not just initial build
5. **Security first**: Build security in, don't bolt it on
6. **Performance matters**: Design for performance from the start
7. **Fail fast**: Validate early, fail with clear errors
8. **Separate concerns**: Keep layers and modules independent
9. **Make it testable**: Design with testing in mind
10. **Be pragmatic**: Perfect is the enemy of good

## Specific Considerations for This Project

### Internationalization

- All text must be translatable
- Support RTL (Hebrew) and LTR (English)
- Use react-i18next, never hardcode strings
- Test both directions

### Security

- Validate all user input with class-validator
- Use Passport for authentication
- Implement role-based authorization
- Sanitize user-generated content
- Never expose sensitive data in API responses
- Rate-limit API endpoints

### Performance

- Index foreign keys and frequently queried fields
- Use Prisma `select` and `include` wisely to avoid over-fetching
- Implement pagination for large lists
- Cache static data when appropriate
- Lazy-load routes in frontend

### Scalability

- Design for horizontal scaling (stateless API)
- Use database connection pooling
- Consider background jobs for expensive operations (notifications)
- Plan for eventual caching layer if needed

---

**Remember**: Your role is to ensure the system is well-designed and maintainable for the long term. Make thoughtful decisions, document them clearly, and guide the team to build a solid foundation.
