# Profile Page Redesign - Visual Description

**Date:** 2025-08-24
**Author:** opencode
**Purpose:** Visual specification for profile page redesign

## Overview

The new Profile page transforms from a flat list of actions into a comprehensive, multi-section settings interface inspired by modern mobile/desktop settings pages (iOS/Android settings apps and macOS System Settings).

## Layout Structure

### Header Section

```
┌─────────────────────────────────────┐
│ • Arrow back button (←)             │
│ • Page title: "Настройки профиля"     │
│ • User avatar + email              │
└─────────────────────────────────────┘
```

**Components:**
- **Navigation:** Back arrow button (left)
- **Title:** "Settings" or "Profile Settings"
- **User Info:** Circular avatar image, user email
- **Status indicator:** Email verification status (green check if verified)

### Tab Navigation

```
┌─────────────────────────────────────┐
│ [Личные данные] [Аккаунт] [Безопасность] [Подключения] [Действия] │
└─────────────────────────────────────┘
```

**Tab specifications:**
- **Личные данные** (Personal Information) - Active by default
- **Аккаунт** (Account) - Notifications, preferences
- **Безопасность** (Security) - Password, 2FA, sessions
- **Подключения** (Connections) - Social links, integrations
- **Действия** (Actions) - Sign out, delete account

### Main Content Area

Each tab opens to reveal its specific form or list interface:

#### Personal Information Tab
```
┌─────────────────────────────────────┐
│ • Avatar upload section            │
│ • Name field (required)            │
│ • Email (read-only, copy button)   │
│ • Phone (optional)                 │
│ • Bio textarea (optional)          │
│ • City field (optional)            │
│ • Save/Cancel buttons              │
└─────────────────────────────────────┘
```

#### Account Settings Tab
```
┌─────────────────────────────────────┐
│ • Notifications subsection         │
│   ○ Email notifications           │
│   ○ Push notifications             │
│   ○ In-app notifications           │
│ • Preferences subsection           │
│   ○ Theme (Light/Dark/System)      │
│   ○ Language                       │
│   ○ Currency                       │
└─────────────────────────────────────┘
```

#### Security Tab
```
┌─────────────────────────────────────┐
│ • Password change section          │
│ • Two-factor authentication        │
│ • Active sessions                  │
│ • Recent login history             │
├─────────────────────────────────────┤
│ • Connected services               │
│ • Authorized apps                  │
└─────────────────────────────────────┘
```

#### Connections Tab
```
┌─────────────────────────────────────┐
│ • Google Account                   │
│ • Apple ID                         │
│ • Google Maps profile               │
│ • Direct social links (VK, Telegram)│
├─────────────────────────────────────┤
│ • Disconnect buttons for each       │
└─────────────────────────────────────┘
```

#### Actions Tab
```
┌─────────────────────────────────────┐
│ • Sign out button (secondary)       │
│ • Delete account button (danger)    │
│ • Account deletion confirmation     │
│   (enter email + confirmation)     │
└─────────────────────────────────────┘
```

## Visual Style Guide

### Colors
- **Primary:** Teal (#0F766E) - consistent with app branding
- **Secondary:** Stone (#525252) - neutral text
- **Background:** White (#FFFFFF) with light gray (#F5F5F5) sections
- **Danger:** Red (#DC2626) for destructive actions
- **Success:** Green (#16A34A) for successful operations

### Typography
- **Headings:** 24px, Inter, 600 weight, stone-900
- **Labels:** 14px, Inter, 500 weight, stone-700
- **Body text:** 14px, Inter, 400 weight, stone-600
- **Descriptions:** 12px, Inter, 400 weight, stone-500

### Spacing
- **Section padding:** 24px
- **Element gap:** 16px
- **Form field spacing:** 12px
- **Button size:** 44px height for touch targets

### Iconography
- **Settings:** lucide-react icons (User, Bell, Shield, Link, LogOut, Trash2)
- **Status icons:** Check (green), Alert (yellow), Error (red)
- **Navigation:** Chevron right (for expandable sections)

## Responsive Design

### Desktop (≥1024px)
```
┌──────────────┬──────────────┐
│ Header       │              │
│ TabNav       │              │
├──────────────┼──────────────┤
│ Content      │              │
│ (2 columns)  │              │
└──────────────┴──────────────┘
```

- Two-column layout with sidebar for tabs
- Wider form fields (60% of container width)
- Side navigation with detailed descriptions

### Mobile (<1024px)
```
┌─────────────────┐
│ Header          │
│ TabNav          │
├─────────────────┤
│ Content         │
│ (single column) │
└─────────────────┘
```

- Full-width tab navigation (scrollable)
- Single column forms
- Mobile-optimized touch targets

## Interaction Patterns

### Tab Switching
- **Desktop:** Click tab or navigate via keyboard
- **Mobile:** Tap tab with smooth content transition
- **Active state:** Underlined text or colored indicator
- **Accessibility:** ARIA tabs API

### Form Interactions
- **Field focus:** Clear border with teal glow
- **Error states:** Red border with error message below
- **Success states:** Green check icon + success toast
- **Loading states:** Spinner or loading text

### Hover/Focus States
- **Buttons:** Background color change
- **Links:** Underline and color change
- **Interactive elements:** Subtle scale effect

## Component Library

### Common Components

#### Section Component
```tsx
export interface SectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

<section className="bg-white rounded-lg p-6 shadow-sm">
  <h2 className="text-xl font-semibold mb-2">{title}</h2>
  {description && <p className="text-stone-600 mb-4">{description}</p>}
  {children}
</section>
```

#### FormField Component
```tsx
export interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

<div className="space-y-2">
  <label className="block text-sm font-medium text-stone-700">
    {label}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
  {children}
  {error && <p className="text-sm text-red-600">{error}</p>}
</div>
```

#### Toggle Component
```tsx
export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

<div className="flex items-center justify-between py-3">
  <div>
    <span className="text-sm font-medium text-stone-900">{label}</span>
    {description && <p className="text-xs text-stone-600">{description}</p>}
  </div>
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full 
      ${checked ? 'bg-teal-600' : 'bg-stone-200'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white 
      ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
</div>
```

## Wireframe Sketches

### Personal Information Tab Wireframe
```
┌─────────────────────────────┐
│ Avatar Upload              │
│ ┌─────────────────────┐    │
│ │ • [previewImage]   │    │
│ │   • Upload photo   │    │
│ │   • Remove photo   │    │
│ └─────────────────────┘    │
├─────────────────────────────┤
│ Name                      │
│ [input]                   │
├─────────────────────────────┤
│ Email                     │
│ [input] readonly          │
│ [copy button]             │
├─────────────────────────────┤
│ Phone (optional)           │
│ [input]                    │
├─────────────────────────────┤
│ Bio (optional)             │
│ [textarea]                │
│ [character count]          │
├─────────────────────────────┤
│ City (optional)            │
│ [input]                    │
├─────────────────────────────┤
│ Save • Cancel buttons      │
└─────────────────────────────┘
```

### Account Settings Tab Wireframe
```
┌─────────────────────────────┐
│ Notifications              │
│ ┌─────────────────────┐    │
│ │ Email notifications │    │
│ │ [toggle]           │    │
│ │ Push notifications  │    │
│ │ [toggle]           │    │
│ │ In-app notifications│   │
│ │ [toggle]           │    │
│ └─────────────────────┘    │
├─────────────────────────────┤
│ Preferences               │
│ ┌─────────────────────┐    │
│ │ Theme               │    │
│ │ [select: Light/Dark│    │
│ │   System]          │    │
│ │ Language            │    │
│ │ [select: Russian/   │    │
│ │   English]          │    │
│ │ Currency            │    │
│ │ [select: RUB/USD/EUR]│   │
│ └─────────────────────┘    │
└─────────────────────────────┘
```

## Design System

### Color Palette
```css
:root {
  --primary: #0F766E;
  --primary-foreground: #FFFFFF;
  --secondary: #525252;
  --secondary-foreground: #FFFFFF;
  --background: #FFFFFF;
  --background-secondary: #F5F5F5;
  --border: #E5E5E5;
  --danger: #DC2626;
  --danger-foreground: #FFFFFF;
  --success: #16A34A;
  --success-foreground: #FFFFFF;
  --warning: #CA8A04;
  --warning-foreground: #FFFFFF;
}
```

### Typography System
```css
.headings {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 24px;
  color: #1A1A1A;
}

.labels {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 14px;
  color: #404040;
}

.body {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 14px;
  color: #525252;
}

.captions {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 12px;
  color: #737373;
}
```

### Shadow System
```css
/* Card elevation */
.shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }

/* Interactive elements */
.shadow-hover { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
```

## Motion & Animation

### Transition Speeds
```css
:root {
  --transition-fast: 150ms;
  --transition-normal: 300ms;
  --transition-slow: 500ms;
}
```

### Animation Types
- **Tabs:** Fade in/out with slide effect
- **Forms:** Immediate field validation
- **Buttons:** Scale effect on press
- **Notifications:** Slide in from top
- **Modals:** Fade overlay + scale content

## Accessibility Considerations

### Keyboard Navigation
- **Tab navigation:** Order: Back button → Tabs → Form fields → Buttons
- **Focus management:** Trap focus within tabs content
- **ARIA labels:** Descriptive text for all interactive elements
- **Screen reader:** Section headings, state announcements

### Screen Reader Support
```html
<section aria-labelledby="personal-info-heading">
  <h2 id="personal-info-heading">Personal Information</h2>
  <div role="form">
    <div role="group" aria-label="Profile fields">
      <label>Full Name <span aria-hidden="true">*</span></label>
      <input type="text" aria-required="true" />
    </div>
  </div>
</section>
```

## Testing Visual States

### Hover States
- **Buttons:** Background color, subtle shadow
- **Links:** Underline, text color change
- **Interactive elements:** Scale 1.05

### Focus States
- **Inputs:** Border color change, outline removal
- **Buttons:** Ring outline
- **Keyboard navigation:** Visible focus indicators

### Error States
- **Fields:** Red border, error message below
- **Toast notifications:** Slide in from bottom
- **Form submission:** Loading state with spinner

## Development Guidelines

### Component Naming
- **PascalCase:** ProfilePage, PersonalInfoTab, SettingsTab
- **kebab-case:** For CSS classes (`data-section`)

### Prop Conventions
- **Optional props:** Use `?` notation
- **Required props:** Documented in component docstrings
- **Event handlers:** `onClick`, `onChange`, `onFocus`, etc.

### Code Standards
- **TypeScript:** Strict null checks
- **React:** Functional components with hooks
- **CSS:** Tailwind classes for styling
- **Testing:** Vitest with React Testing Library

## Conclusion

The Profile page redesign creates a professional, intuitive interface that organizes user settings into clear, actionable sections. The design follows platform conventions (iOS Android macOS) while maintaining consistency with the application's existing design system.

The visual structure, interaction patterns, and accessibility features ensure that users can easily manage their profile information, account settings, and connected services with minimal friction.

## Implementation Priority

1. **Personal Information Tab** - Core profile editing
2. **Tab Navigation System** - Foundation for all other tabs
3. **Account Settings** - Notifications and preferences
4. **Security Settings** - Password and 2FA
5. **Connections** - Social integrations
6. **Actions/Zone** - Dangerous operations

## Next Steps

1. Create component library with shared UI elements
2. Implement tab navigation and routing logic
3. Build Personal Information tab (MVP)
4. Add Settings tabs and individual settings
5. Implement Connections management
6. Create Danger Zone with confirmation flows

This visual specification provides a comprehensive foundation for the Profile page redesign while maintaining flexibility for iterative development and continuous improvement based on user feedback.

---

*Visual design documentation for Profile page redesign. Updated continuously based on development progress and user feedback.*
