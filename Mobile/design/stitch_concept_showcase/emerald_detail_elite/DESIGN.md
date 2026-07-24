---
name: Emerald Detail Elite
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3e4942'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6e7a71'
  outline-variant: '#bdcac0'
  surface-tint: '#006c47'
  primary: '#006b47'
  on-primary: '#ffffff'
  primary-container: '#00875a'
  on-primary-container: '#ffffff'
  inverse-primary: '#71dba6'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cca730'
  on-tertiary-container: '#4f3d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#8df7c1'
  primary-fixed-dim: '#71dba6'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005235'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#ffe088'
  tertiary-fixed-dim: '#e9c349'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 20px
  gutter: 16px
  card-gap: 12px
  section-margin: 32px
---

## Brand & Style

This design system embodies the essence of high-end automotive care, merging the precision of professional detailing with the warmth of concierge-level service. The brand personality is **sophisticated, precise, and dependable**, designed to appeal to automotive enthusiasts and luxury vehicle owners who view their car as an investment.

The visual direction follows a **Modern Corporate** aesthetic with **Tactile** influences. It utilizes clean, expansive whitespace to evoke a sense of "spotless" quality, while card-based layouts and subtle depth effects provide a tangible, premium feel. The interface avoids unnecessary clutter, focusing instead on clarity and ease of use to reflect the seamless experience of the service itself.

The emotional response should be one of **trust and tranquility**. By using a deep emerald palette against crisp neutrals, the design system signals environmental consciousness and professional authority.

## Colors

The palette is centered around **Emerald Green (#00875A)**, a color that represents growth, quality, and the "green light" of professional approval. It serves as the primary action color and brand identifier.

- **Primary:** Emerald Green is used for primary buttons, active states, and critical brand iconography.
- **Secondary:** Deep Onyx (#1A1A1A) provides the necessary weight for typography and structural elements, ensuring a grounded, professional feel.
- **Tertiary:** Metallic Gold (#D4AF37) is reserved for loyalty tiers (Gold Member) and premium rewards, adding an element of exclusivity.
- **Neutrals:** A range of cool grays (from #F8F9FA to #E0E0E0) are used for backgrounds and card strokes to maintain a clean, "freshly polished" aesthetic.
- **Status:** Functional colors are tuned for legibility. "Pending" states use a warm orange to signify "action required" or "in progress" without the urgency of an error.

## Typography

The design system utilizes **Manrope** across all levels to ensure a cohesive, modern, and highly legible experience. Its geometric yet humanist characteristics strike the perfect balance between technical precision and approachability.

- **Headlines:** Set with tight letter spacing and high weights (700-800) to create a bold, authoritative hierarchy.
- **Body Text:** Optimized for readability with generous line heights. High-contrast text (#0A0A0A) is used for primary body content to ensure accessibility.
- **Labels:** Small caps or increased letter-spacing are applied to labels and secondary metadata to differentiate them from interactive text.
- **Mobile Scaling:** Headlines above 32px should scale down by 20% on mobile devices to prevent awkward line breaks while maintaining visual impact.

## Layout & Spacing

The layout philosophy relies on a **Fluid Grid** with specific attention to safe margins and logical grouping. A base-8 spacing system ensures mathematical consistency across all components.

- **Mobile:** Uses a 4-column grid with 20px outside margins. Content cards typically span the full width of the safe area.
- **Desktop/Tablet:** Transitions to a 12-column grid. Service cards and booking modules should follow a modular "masonry" or "bentogrid" style to allow for varying content heights while maintaining a clean horizontal alignment.
- **Rhythm:** Vertical rhythm is strictly enforced. Spacing between related items within a card is 8px or 12px, while spacing between distinct sections (e.g., "Explore Services" vs "Recommended") is 32px.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Ambient Shadows**.

- **Surfaces:** The primary background is #F8F9FA. Interactive cards are pure white (#FFFFFF) to create a "lifted" effect.
- **Shadows:** Use extremely soft, diffused shadows with a slight tint of the primary color (Emerald) in the shadow's shadow-color to create a premium, atmospheric depth.
  - *Standard Card:* `0px 4px 20px rgba(0, 0, 0, 0.05)`
  - *Floating Action:* `0px 10px 30px rgba(0, 135, 90, 0.15)`
- **Interaction:** On hover or press, cards should slightly increase their elevation or apply a subtle inner-glow to mimic a tactile physical button.

## Shapes

The shape language is defined by **Smooth Border Radii**, conveying a sense of safety and modern elegance.

- **Standard Elements:** Buttons and small input fields use a 0.5rem (8px) radius.
- **Containers:** Content cards and main navigation containers use 1rem (16px) or 1.5rem (24px) for a softer, more inviting appearance.
- **Visual Continuity:** Circular shapes are reserved for user avatars and status indicators to provide a distinct contrast against the predominantly rectangular card-based layout.

## Components

### Buttons
- **Primary:** Filled Emerald Green (#00875A) with White text. Bold weight, 16px padding, 8px radius.
- **Secondary:** White background with an Emerald border and Emerald text.
- **Ghost:** No background, Emerald or Onyx text, used for less critical actions like "Back" or "Cancel."

### Cards
- **Service Cards:** Feature a top-aligned image with a subtle 12px radius, followed by title, duration, and price. Includes a chevron icon to indicate tapability.
- **Booking Cards:** High-contrast containers with thick left-border accents in Emerald (Success) or Orange (Pending) to provide instant status recognition.

### Inputs & Selection
- **Text Fields:** Minimalist style with a subtle gray border (#E0E0E0) that transitions to Emerald on focus. Labels sit just above the field in Label-MD style.
- **Chips:** Used for filtering (e.g., "Wash," "Polish," "Interior"). Active chips use a light Emerald tint with deep Emerald text.

### Navigation
- **Bottom Bar:** Clean white blur effect with high-contrast active icons in Emerald. Uses Manrope Caption style for labels.
- **Segmented Control:** Used for "Upcoming" vs "Past" bookings. Uses a pill-shaped background for the active state with a subtle shadow.