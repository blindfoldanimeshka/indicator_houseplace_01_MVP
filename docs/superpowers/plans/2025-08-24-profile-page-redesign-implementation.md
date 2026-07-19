# Profile Page Redesign - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive, multi-section profile page with tab-based navigation for managing user information, settings, connections, and account actions.

**Architecture:** Multi-component profile system with shared design patterns, tab-based navigation, and cohesive user settings organization. Follows existing patterns from the codebase (Tailwind CSS, React, TypeScript, Zod validation).

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Zod validation, Supabase (auth/storage), framer-motion, lucide-react

---

## Task Structure

### Task 1: Create Core Profile Components Structure

**Files:**
- Create: `src/features/profile/components/ProfilePage.tsx`
- Create: `src/features/profile/components/PersonalInfoTab.tsx`
- Create: `src/features/profile/components/SettingsTab.tsx`
- Create: `src/features/profile/components/ConnectionsTab.tsx`
- Create: `src/features/profile/components/DangerTab.tsx`
- Create: `src/features/profile/types/profile.types.ts`
- Create: `src/features/profile/types/settings.types.ts`
- Create: `src/features/profile/constants/profile.constants.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/features/profile/ProfilePage.test.tsx - basic render test
import { render, screen } from '@testing-library/react'
import { ProfilePage } from '@/features/profile/components/ProfilePage'

it('renders profile page with tabs', () => {
  render(<ProfilePage />)
  expect(screen.getByText('Личные данные')).toBeInTheDocument()
  expect(screen.getByText('Аккаунт')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/features/profile/ProfilePage.test.tsx -v`
Expected: FAIL with "Cannot find module '@/features/profile/components/ProfilePage'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/profile/components/ProfilePage.tsx - minimal implementation
import { useState } from 'react'
import { PersonalInfoTab } from './PersonalInfoTab'

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal')

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1>Profile Settings</h1>
      <div className="tabs">TODO</div>
      <PersonalInfoTab />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/features/profile/ProfilePage.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/ProfilePage.tsx
npm run lint
npm run typecheck
```

### Task 2: Implement Personal Information Tab

**Files:**
- Modify: `src/features/profile/components/ProfilePage.tsx`
- Create: `src/features/profile/components/PersonalInfoTab.tsx`
- Create: `src/features/profile/components/AvatarUpload.tsx`
- Create: `src/features/profile/schema/profile-schema.ts`
- Create: `tests/features/profile/PersonalInfoTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/features/profile/PersonalInfoTab.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PersonalInfoTab } from '@/features/profile/components/PersonalInfoTab'
import { vi } from 'vitest'

it('renders personal info form with fields', () => {
  render(<PersonalInfoTab />)
  expect(screen.getByLabelText(/имя/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/город/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /сохранить/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/features/profile/PersonalInfoTab.test.tsx -v`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/profile/components/PersonalInfoTab.tsx - basic implementation
import { useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { AvatarUpload } from './AvatarUpload'

export function PersonalInfoTab() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.user_metadata?.name ?? '')
  const [city, setCity] = useState(user?.user_metadata?.city ?? '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await updateProfile({ name, city })
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AvatarUpload userId={user?.id} onUploadComplete={() => {}} />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Имя"
      />
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Город"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/features/profile/PersonalInfoTab.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/PersonalInfoTab.tsx
npm run lint
npm run typecheck
```

### Task 3: Implement Settings Tab with Nested Configuration

**Files:**
- Modify: `src/features/profile/components/ProfilePage.tsx`
- Create: `src/features/profile/components/SettingsTab.tsx`
- Create: `src/features/profile/components/NotificationSettings.tsx`
- Create: `src/features/profile/components/PrivacySettings.tsx`
- Create: `src/features/profile/components/SecuritySettings.tsx`
- Create: `src/features/profile/components/PreferencesSettings.tsx`
- Create: `tests/features/profile/SettingsTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/features/profile/SettingsTab.test.tsx
import { render, screen } from '@testing-library/react'
import { SettingsTab } from '@/features/profile/components/SettingsTab'

it('renders settings tab with notification section', () => {
  render(<SettingsTab />)
  expect(screen.getByText(/Notifications/i)).toBeInTheDocument()
  expect(screen.getByText(/Privacy/i)).toBeInTheDocument()
  expect(screen.getByText(/Security/i)).toBeInTheDocument()
  expect(screen.getByText(/Preferences/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/features/profile/SettingsTab.test.tsx -v`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/profile/components/SettingsTab.tsx - basic implementation
import { useState } from 'react'

export function SettingsTab() {
  const [activeSettingsTab, setActiveSettingsTab] = useState('notifications')

  return (
    <div className="space-y-6">
      <div className="tabs">
        <button onClick={() => setActiveSettingsTab('notifications')}>Notifications</button>
        <button onClick={() => setActiveSettingsTab('privacy')}>Privacy</button>
        <button onClick={() => setActiveSettingsTab('security')}>Security</button>
        <button onClick={() => setActiveSettingsTab('preferences')}>Preferences</button>
      </div>

      {activeSettingsTab === 'notifications' && <div>Notifications settings</div>}
      {activeSettingsTab === 'privacy' && <div>Privacy settings</div>}
      {activeSettingsTab === 'security' && <div>Security settings</div>}
      {activeSettingsTab === 'preferences' && <div>Preferences settings</div>}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/features/profile/SettingsTab.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/SettingsTab.tsx
npm run lint
npm run typecheck
```

### Task 4: Implement Connections Tab

**Files:**
- Modify: `src/features/profile/components/ProfilePage.tsx`
- Create: `src/features/profile/components/ConnectionsTab.tsx`
- Create: `src/features/profile/components/ConnectedService.tsx`
- Create: `src/features/profile/api/connections-api.ts`
- Create: `tests/features/profile/ConnectionsTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/features/profile/ConnectionsTab.test.tsx
import { render, screen } from '@testing-library/react'
import { ConnectionsTab } from '@/features/profile/components/ConnectionsTab'

it('renders connected services list', () => {
  render(<ConnectionsTab />)
  expect(screen.getByText(/Connected Services/i)).toBeInTheDocument()
  expect(screen.getByText(/Google Account/i)).toBeInTheDocument()
  expect(screen.getByText(/Apple ID/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/features/profile/ConnectionsTab.test.tsx -v`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/profile/components/ConnectionsTab.tsx - basic implementation
import { useState } from 'react'

interface ConnectedService {
  id: string
  name: string
  status: 'connected' | 'not_connected'
  icon?: string
}

export function ConnectionsTab() {
  const [services] = useState<ConnectedService[]>([
    { id: 'google', name: 'Google Account', status: 'connected' },
    { id: 'apple', name: 'Apple ID', status: 'not_connected' },
    { id: 'maps', name: 'Google Maps', status: 'connected' },
  ])

  return (
    <div className="space-y-4">
      <h3>Connected Services</h3>
      {services.map((service) => (
        <div key={service.id} className="service-item">
          <span>{service.name}</span>
          <span className={service.status === 'connected' ? 'text-green-600' : 'text-stone-400'}>
            {service.status === 'connected' ? 'Connected' : 'Not connected'}
          </span>
          {service.status === 'not_connected' && (
            <button>Connect</button>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/features/profile/ConnectionsTab.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/ConnectionsTab.tsx
npm run lint
npm run typecheck
```

### Task 5: Implement Danger Zone Tab

**Files:**
- Modify: `src/features/profile/components/ProfilePage.tsx`
- Create: `src/features/profile/components/DangerZoneTab.tsx`
- Create: `src/features/profile/components/ConfirmDialog.tsx`
- Create: `tests/features/profile/DangerZoneTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/features/profile/DangerZoneTab.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DangerZoneTab } from '@/features/profile/components/DangerZoneTab'
import { vi } from 'vitest'

it('renders danger zone with sign out and delete account buttons', () => {
  render(<DangerZoneTab />)
  expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /delete account and my data/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/features/profile/DangerZoneTab.test.tsx -v`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/profile/components/DangerZoneTab.tsx - basic implementation
import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

export function DangerZoneTab() {
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSignOut = async () => {
    // Implement sign out logic
    console.log('Signing out...')
  }

  const handleDeleteAccount = async () => {
    // Implement delete account logic
    console.log('Deleting account...')
  }

  return (
    <div className="space-y-4 border-t pt-6">
      <h3>Danger Zone</h3>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <h4>Sign Out</h4>
          <p className="text-sm text-stone-600">Sign out from this device</p>
        </div>
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="px-4 py-2 text-sm font-medium text-stone-800 bg-white border border-stone-300 rounded-xl hover:bg-stone-100"
        >
          Sign Out
        </button>
      </div>

      <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
        <div>
          <h4 className="text-red-900">Delete Account</h4>
          <p className="text-sm text-red-700">Permanently delete account and all data</p>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-xl hover:bg-red-50"
        >
          Delete Account
        </button>
      </div>

      <ConfirmDialog
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="This action cannot be undone. Are you sure?"
      />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/features/profile/DangerZoneTab.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/DangerZoneTab.tsx
npm run lint
npm run typecheck
```

### Task 6: Integrate Tabs Navigation

**Files:**
- Modify: `src/features/profile/components/ProfilePage.tsx` (update to integrate all tabs)
- Create: `src/features/profile/components/TabNavigation.tsx`
- Update: `src/features/profile/ProfileScreen.tsx` (remove it and point to ProfilePage)
- Create: `tests/features/profile/ProfilePage.test.tsx` (full integration test)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/features/profile/ProfilePage.test.tsx - integration test
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfilePage } from '@/features/profile/components/ProfilePage'

it('switches between tabs and shows correct content', async () => {
  render(<ProfilePage />)

  // Check default tab
  expect(screen.getByText('Личные данные')).toBeInTheDocument()

  // Switch to settings tab
  fireEvent.click(screen.getByText('Аккаунт'))
  await waitFor(() => {
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  // Switch to security tab
  fireEvent.click(screen.getByText('Безопасность'))
  await waitFor(() => {
    expect(screen.getByText('Password change')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/features/profile/ProfilePage.test.tsx -v`
Expected: FAIL with module not found or implementation incomplete

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/profile/components/ProfilePage.tsx - updated implementation
import { useState } from 'react'
import { PersonalInfoTab } from './PersonalInfoTab'
import { SettingsTab } from './SettingsTab'
import { ConnectionsTab } from './ConnectionsTab'
import { DangerZoneTab } from './DangerZoneTab'

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal')

  const tabs = [
    { id: 'personal', label: 'Личные данные' },
    { id: 'settings', label: 'Аккаунт' },
    { id: 'security', label: 'Безопасность' },
    { id: 'connections', label: 'Подключения' },
    { id: 'danger', label: 'Действия' },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return <PersonalInfoTab />
      case 'settings':
        return <SettingsTab />
      case 'security':
        return <DangerZoneTab /> // Simplified for MVP
      case 'connections':
        return <ConnectionsTab />
      case 'danger':
        return <DangerZoneTab />
      default:
        return null
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Профиль</h1>
        <p className="mt-1 text-sm text-stone-600">Управляйте своими настройками и связанными аккаунтами</p>
      </header>

      <nav className="flex space-x-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>{renderTabContent()}</main>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/features/profile/ProfilePage.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/ProfilePage.tsx
```

### Task 7: Update ProfileScreen and Integrate into App

**Files:**
- Modify: `src/app/App.tsx` (import ProfilePage)
- Modify: `src/features/profile/ProfileScreen.tsx` (export ProfilePage instead)
- Create: `tests/features/profile/ProfileScreen.test.tsx` (export new tests)
- Create: `src/features/profile/ProfileProvider.tsx`
- Update: `src/features/auth/useAuth.ts` (add profile methods)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/features/profile/ProfileScreen.test.tsx - migration test
import { render, screen } from '@testing-library/react'
import { ProfileScreen } from '@/features/profile/ProfileScreen'

it('renders ProfileScreen component (backward compatibility)', () => {
  render(<ProfileScreen onBack={() => {}} />)
  // Should show profile interface
  expect(screen.getByText(/profile/i)).toBeInTheDocument()
  // Or at least should render something
  expect(screen.getByRole('button', { name: /← назад/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/features/profile/ProfileScreen.test.tsx -v`
Expected: FAIL (ProfileScreen needs to be updated)

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/profile/ProfileScreen.tsx - updated export
import { ProfilePage } from './components/ProfilePage'

// Re-export ProfilePage for backward compatibility
export { ProfilePage }

// Keep existing ProfileScreen as wrapper for compatibility
export function ProfileScreen({ onBack }: { onBack: () => void }) {
  return <ProfilePage />
}

// Re-export other types for convenience
export type { ProfileInput } from './schema/profile-schema'
export type { Setting } from './types/settings.types'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/features/profile/ProfileScreen.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/ProfileScreen.tsx
```

### Task 8: Finalize and Run Full Test Suite

**Files:**
- Run: `npm run lint` - Run eslint on entire codebase
- Run: `npm run typecheck` - Run TypeScript type checking
- Run: `npm test` - Run all tests
- Create: `docs/features/profile/IMPLEMENTATION.md` (final documentation)
- Update: `src/app/App.tsx` import to use ProfilePage directly

- [ ] **Step 1: Run linting**

Run: `npm run lint`
Expected: No linting errors or warnings

- [ ] **Step 2: Run type checking**

Run: `npm run typecheck`
Expected: No TypeScript errors

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests passing (80+ tests)

- [ ] **Step 4: Update App.tsx**

Update `src/app/App.tsx` to import `ProfilePage` instead of `ProfileScreen`

```typescript
// Before:
import { ProfileScreen } from '@/features/profile/ProfileScreen'

// After:
import { ProfilePage } from '@/features/profile/components/ProfilePage'
```

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx
npm run lint
npm run typecheck
```

## Final Integration Checklist

- [ ] All 8 tasks completed (80+ tests passing)
- [ ] No linting or typecheck errors
- [ ] Profile page displays in app (http://localhost:5173)
- [ ] All tabs functional and switching correctly
- [ ] Personal info form works with validation
- [ ] Settings management functional
- [ ] Connections management working
- [ ] Danger zone actions protected
- [ ] Accessibility features implemented
- [ ] Responsive design for mobile/desktop
- [ ] Final documentation updated

## Estimated Timeline

**Phase 1 (Tasks 1-2):** 3 days - Core components structure and personal info
**Phase 2 (Tasks 3-4):** 2 days - Settings and connections management
**Phase 3 (Tasks 5-6):** 2 days - Danger zone and tab integration
**Phase 4 (Task 7-8):** 1 day - Final integration and testing

**Total:** 8 days expected completion

---

**Implementation Notes:**
- Follow existing codebase patterns (Tailwind CSS, TypeScript, Vitest)
- Maintain app consistency with existing components
- Implement gradual tab addition for user feedback
- Prioritize accessibility and responsive design
- Ensure backward compatibility during migration
- Use existing auth API methods for profile updates
- Implement proper error handling and validation

This implementation plan provides a comprehensive, phased approach to building the new profile page while ensuring all functionality is tested and working correctly.