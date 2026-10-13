# Designer Role Guide

## Overview

The Designer owns the user experience and interface design, ensuring the application is intuitive, accessible, and delightful to use.

## Responsibilities

### User Experience (UX)

- Design user flows and journeys
- Create wireframes and prototypes
- Plan information architecture
- Ensure intuitive navigation
- Optimize for mobile and desktop experiences
- Consider accessibility in all designs

### User Interface (UI)

- Design visual interface (layouts, components, screens)
- Create design system and component library
- Define color palette, typography, spacing
- Design for RTL (Hebrew) and LTR (English)
- Ensure brand consistency
- Create high-fidelity mockups

### User Research

- Understand user needs and pain points
- Create user personas
- Conduct usability testing
- Gather feedback on designs
- Iterate based on user insights

### Collaboration

- Work with PM to understand requirements
- Collaborate with developers on feasibility
- Provide design specifications and assets
- Review implementations against designs
- Participate in design critiques

## Key Inputs

- Product requirements from PM
- User research and feedback
- Technical constraints from Architect
- Existing UI patterns and components
- Accessibility standards (WCAG)

## Key Outputs

- Wireframes and user flows
- High-fidelity mockups
- Interactive prototypes (if applicable)
- Design system documentation
- Icon and image assets
- Design specifications for developers
- Usability test reports

## Interaction with Other Roles

### With Product Manager

- Understand user needs and feature goals
- Propose UI/UX solutions to problems
- Discuss trade-offs in experience vs. scope
- Validate designs against requirements

### With Architect/Developers

- Understand technical constraints
- Ensure designs are feasible to implement
- Provide detailed specifications
- Review implementations for design accuracy
- Collaborate on component APIs

### With QA

- Define expected visual and interaction behavior
- Participate in usability testing
- Review bug reports related to UX
- Validate accessibility compliance

### With Team Lead

- Prioritize design work
- Estimate design effort
- Coordinate design reviews

## Definition of Done

A Designer's work is complete when:

- ✅ User flows are documented and validated
- ✅ Wireframes/mockups are created and approved by PM
- ✅ Designs work in both RTL (Hebrew) and LTR (English)
- ✅ Accessibility considerations are documented
- ✅ Design specs are clear enough for developers to implement
- ✅ Component designs align with Mantine library
- ✅ Mobile and desktop layouts are designed
- ✅ Design has been reviewed by team
- ✅ Implementation matches approved design
- ✅ Usability validated with users (when applicable)

## Quality Standards

### UX Quality

- **Intuitive**: Users can accomplish tasks without confusion
- **Efficient**: Minimal steps to complete actions
- **Consistent**: Patterns reused throughout app
- **Accessible**: Works for users with disabilities
- **Responsive**: Adapts to different screen sizes
- **Forgiving**: Clear error messages, easy to recover

### UI Quality

- **Clear**: Visual hierarchy guides attention
- **Readable**: Typography is legible at all sizes
- **Balanced**: Whitespace used effectively
- **Cohesive**: Consistent visual language
- **On-brand**: Matches project identity
- **Polished**: Attention to detail in every pixel

### Design Process

- Start with user needs, not aesthetics
- Sketch multiple options before committing
- Get feedback early and often
- Iterate based on testing
- Document decisions and rationale

## Common Tasks

### 1. Designing a User Flow

- Identify user goal and entry point
- Map out steps to accomplish goal
- Consider happy path and error cases
- Design decision points and branches
- Validate flow with users or PM
- Document in diagram or prototype

### 2. Creating a Screen Design

- Start with wireframe (low-fidelity)
- Define content and components needed
- Design layout for mobile and desktop
- Create RTL and LTR versions
- Add visual design (colors, typography)
- Annotate for developers (spacing, states, interactions)

### 3. Designing for Accessibility

- Use semantic HTML elements
- Ensure sufficient color contrast (WCAG AA)
- Provide text alternatives for images
- Design clear focus states
- Enable keyboard navigation
- Test with screen readers
- Provide ARIA labels where needed

### 4. Working with Mantine

- Leverage existing Mantine components
- Customize theme to match brand
- Follow Mantine patterns for consistency
- Propose custom components only when necessary
- Document component usage

## Design Guidelines for This Project

### Color Palette

- **Wisteria** `#A99BE0` is the primary brand scale
- **Mint** `#A8E6CF` is the success / Delivered accent
- **Deep plum** `#1E1A2E` is the dark-theme background
- Light default is a pastel Wisteria & mint theme; dark uses brightened accents
- Meet WCAG AA contrast requirements (verified in `packages/ui` theme tests)
- Use Mantine's theming system in `packages/ui`

### Typography

- Use Mantine's default font stack or define custom
- Ensure Hebrew and English fonts are readable
- Define heading hierarchy (h1, h2, h3, etc.)
- Set appropriate line-height for readability
- Consider RTL text alignment

### Spacing

- Use Mantine's spacing scale (xs, sm, md, lg, xl)
- Be consistent with padding and margins
- Ensure touch targets are 44x44px minimum (mobile)

### Icons

- Use Tabler Icons (already in project via @tabler/icons-react)
- Consider directionality (arrows may need RTL flipping)
- Ensure icons have text labels or ARIA labels

### RTL/LTR Design

- Mirror layouts for RTL (navigation, buttons, etc.)
- Keep icons/images that shouldn't flip unchanged
- Test both directions thoroughly
- Consider reading order and visual flow

### Mobile-First

- Design for mobile screens first
- Add complexity for larger screens
- Ensure tap targets are large enough
- Consider thumb reach zones
- Test on real devices

## Tools

**Recommended**:

- Figma - Collaborative design and prototyping
- Excalidraw - Quick wireframes and flows
- Mantine Docs - Reference for components
- Coolors - Color palette generation
- WebAIM Contrast Checker - Accessibility validation

**Alternative**:

- Sketch, Adobe XD, Penpot (open-source)

## Deliverables Format

### Wireframes

- Low-fidelity sketches or digital wireframes
- Annotated with content and functionality notes
- Include user flow context

### High-Fidelity Mockups

- Full visual design
- Mobile and desktop versions
- RTL and LTR versions (or indicate mirroring)
- Multiple states (default, hover, active, disabled, error)
- Annotations for developers (spacing, behavior, copy)

### Design Specs

- Component specifications
- Spacing values (use Mantine spacing units)
- Color values (hex/rgb)
- Typography styles
- Interaction notes (hover, click, animation)
- Responsive breakpoints

## Red Flags to Watch For

🚩 **Warning signs**:

- Designs don't account for RTL/LTR
- Accessibility not considered
- Inconsistent UI patterns
- Mobile experience is an afterthought
- Designs don't align with Mantine components
- No user validation or feedback
- Visual design without UX foundation
- Ignoring technical constraints
- Not designing for error states
- Forgetting loading and empty states

## Best Practices

1. **Start with the user**: Understand their goals and pain points
2. **Design mobile-first**: Prioritize the most constrained view
3. **Keep it simple**: Don't over-design, especially for MVP
4. **Be consistent**: Reuse patterns and components
5. **Design for both directions**: RTL and LTR from the start
6. **Think in components**: Design reusable UI elements
7. **Design all states**: Default, hover, active, disabled, loading, error, empty
8. **Get feedback early**: Show sketches, don't wait for perfect mockups
9. **Test with real users**: Validate assumptions with actual volunteers/admins
10. **Collaborate closely**: Work with developers, don't throw designs over the wall

## Specific Considerations for This Project

### Hebrew RTL Design

- Right-to-left reading order
- Right-aligned text
- Navigation on the right side
- Mirrored icons (arrows, back buttons)
- Consider Hebrew font readability

### Volunteer vs. Admin Experiences

- **Volunteers**: Simple, mobile-focused, clear CTAs
- **Admins**: Data-dense, dashboard, desktop-optimized (with mobile support)

### Key Screens to Design

1. Login (Google/Facebook OAuth)
2. Volunteer Confirmation Screen (confirm/decline)
3. Admin Dashboard (stats, volunteer list, needs deliverer list)
4. Admin Volunteer Management (CRUD)
5. Admin Elder Management (CRUD)
6. Create Distribution Day
7. Language Switcher

---

**Remember**: Good design is invisible. Users shouldn't notice the interface, they should just accomplish their goals effortlessly. Design with empathy, iterate based on feedback, and always prioritize user needs over aesthetic preferences.
