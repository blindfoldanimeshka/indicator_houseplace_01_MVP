# Profile Page Redesign - Spec

**Date:** 2025-08-24
**Author:** opencode
**Status:** Draft for approval

## Problem Statement

Current ProfileScreen.tsx presents a flat list of actions (profile fields, sign out, delete account) with minimal visual organization. Users cannot easily distinguish between viewing/editing profile information, managing account settings, or performing destructive actions.

## Proposed Solution

A multi-tab sectioned profile interface with clear visual hierarchy:

### 1. Personal Information (default tab)
Primary profile editing with avatar, contact info, and bio

### 2. Account Settings
Grouped into sub-tabs for notifications, privacy, security, and preferences

### 3. Connected Services
Social links, third-party integrations, and account connections

### 4. Danger Zone
Grouped destructive actions (sign out, delete account) at the bottom

## Visual Structure

```
┌─────────────────────┐
│ Profile Settings    │ ← Page title
├─────────────────────┤
│ [Personal] [Settings] [Connections] [Danger] │ ← Tabs
├─────────────────────┤
│ *Personal Info*    │ ← Tab content area (dynamic)
│ • Avatar preview    │
│ • Name field        │
│ • Email (readonly)  │
│ • Phone (optional)  │
│ • Bio (textarea)    │
│ • Save button       │
├─────────────────────┤
│ *Account Settings*  │
│ • Notifications     │
│ • Privacy           │
│ • Security          │
│ • Preferences       │
├─────────────────────┤
│ *Connected Services*│
│ • Google/Apple      │
│ • Social links      │
├─────────────────────┤
│ *Danger Zone*       │
│ • Sign out button   │
│ • Delete account    │
└─────────────────────┘
```

## Component Architecture

### ProfilePage
- Main container with tab navigation
- Manages tab state and content switching
- Header with user info

### PersonalInfoTab
- Avatar upload/preview
- Form fields with validation
- Save/cancel actions
- Success/error messaging

### SettingsTab
- Nested sub-tabs for each settings category
- Individual setting components (toggles, selects, inputs)
- Bulk save functionality

### ConnectionsTab
- List of connected services
- Connect/disconnect actions
- Service-specific configuration

### DangerTab
- Consolidated dangerous actions
- Confirmation dialogs
- Clear visual separation

## Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  ProfilePage│───▶│ API/Storage │◀───│  useAuth    │
│   (local)   │    │   (Supabase) │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
       ▲                   ▲                   ▲
       │                   │                   │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ UI Components│◀───│ UI Components│◀───│ UI Components │
└─────────────┘    └─────────────┘    └─────────────┘
```

## State Management

### Profile Data
```ts
{
  id: string
  name: string
  email: string
  avatar_url?: string
  phone?: string
  bio?: string
  city?: string
  // ... other fields
}
```

### Settings Data
```ts
{
  notifications: {
    email: boolean,
    push: boolean,
    inApp: boolean
  },
  privacy: {
    profileVisible: boolean,
    showEmail: boolean
  },
  security: {
    twoFactorEnabled: boolean,
    lastPasswordChange?: string
  },
  preferences: {
    theme: 'light' | 'dark' | 'system',
    language: string
  }
}
```

## Component Responsibilities

### ProfilePage.tsx
- Tab navigation
- Header with user avatar and email
- Global error/success messages
- Loading states

### PersonalInfoTab.tsx
- Avatar upload (supabase storage)
- Form validation (Zod)
- Optimistic UI updates
- Image compression for avatars

### SettingsTab.tsx
- Nested tab switching
- Individual setting components
- Bulk save coordination
- Setting value transformation

### ConnectionsTab.tsx
- Integration status indicators
- Connect/disconnect flows
- OAuth redirects
- Permission management

### DangerTab.tsx
- Clear visual styling for dangerous actions
- Confirmation dialogs (different for each action)
- Sequential confirmation for account deletion
- Error handling and recovery

## Technical Implementation Details

### Avatar Upload
- Max file size: 5MB
- Supported formats: JPG, PNG, WebP
- Auto-resize to thumbnails (200x200)
- Compression to reduce file size
- Supabase storage bucket: 'avatars'

### Form Validation
- Server-side Zod schemas
- Client-side real-time validation
- Field-level error messages
- Server error handling

### Settings Sync
- Debounced API calls (300ms)
- Conflict resolution
- Visual feedback for changes
- Auto-save vs manual save options

### Privacy & Security
- Sensitive data redaction in UI
- Permission-based access control
- Security best practices (no raw passwords)

## Performance Considerations

1. **Lazy loading** settings data
2. **Caching** user profile locally
3. **Optimistic UI** for profile updates
4. **Image optimization** for avatars
5. **Debounced** settings updates

## Accessibility

- Full keyboard navigation
- ARIA labels for all interactive elements
- Screen reader support for status messages
- Focus management for modals/dialogs
- High contrast mode support

## Error Handling

1. **Network errors**: Retry mechanism
2. **Validation errors**: Clear field-specific messages
3. **Permission errors**: Graceful degradation
4. **Server errors**: User-friendly messages with support contact

## Testing Strategy

1. **Unit tests**: Component rendering, validation logic
2. **Integration tests**: Profile updates, settings sync
3. **Accessibility tests**: Screen reader compatibility
4. **Performance tests**: Load times, interaction responsiveness

## Migration Plan

### Phase 1
- PersonalInfoTab implementation
- Basic form validation
- Profile data display/update

### Phase 2
- SettingsTab structure
- Individual setting components
- Settings persistence

### Phase 3
- ConnectionsTab
- DangerZone implementation
- Advanced features (avatar upload, etc.)

## Timeline
- Current date: 2026-07-19
- Foundational work completed: Phase 1 weeks 1-2
- Settings implementation: Phase 2 weeks 3-4
- Connections & advanced features: Phase 3 weeks 5-6
- Total: 6 weeks

## Risks & Mitigations

1. **Data loss during migration**: Implement incremental rollout
2. **Performance issues**: Optimize image uploads and API calls
3. **User confusion**: Clear visual hierarchy and onboarding
4. **Testing gaps**: Comprehensive test coverage for all components

## Next Steps

1. Get approval for design spec
2. Create implementation plan with specific tasks
3. Begin with PersonalInfoTab
4. Add settings incrementally
5. Include connections and danger zone

## Files to be Created/Modified

### New Files
- `src/features/profile/ProfilePage.tsx`
- `src/features/profile/components/PersonalInfoTab.tsx`
- `src/features/profile/components/SettingsTab.tsx`
- `src/features/profile/components/ConnectionsTab.tsx`
- `src/features/profile/components/DangerTab.tsx`
- `src/features/profile/types/profile.types.ts`

### Modified Files
- `src/features/profile/ProfileScreen.tsx` → Will become simpler, mostly just renders ProfilePage
- `src/features/profile/profileSchema.ts` → Expand to include new fields
- `src/features/auth/useAuth.ts` → May need additional profile methods

## Conclusion

This redesign transforms the profile from a flat list of actions into a well-organized, multi-section settings page that follows macOS/iOS design patterns. Users can easily find what they're looking for, settings are logically grouped, and destructive actions are visually separated.

The implementation is phased to minimize risk while delivering value progressively, starting with the most important feature (profile information editing) and building out settings over time.
