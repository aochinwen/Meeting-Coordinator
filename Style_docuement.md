# CSS Styling Alignment Plan: Meeting Coordinator

**1-sentence summary:** Audit and align all component styling to use consistent design tokens from globals.css instead of arbitrary Tailwind values, ensuring the Sage Green/Bone Cream design system matches the Figma specifications.

---

## Current State Analysis

### Design Tokens in globals.css (✅ Good)
```css
--color-board: #faf6f0        /* Warm background */
--color-surface: #f5f1ea      /* Cards/bento boxes */
--color-primary: #4a7c59      /* Forest green */
--color-primary-hover: #3f664a
--color-text-primary: #2e3230
--color-text-secondary: #4a4e4a
--color-text-tertiary: #78716c
--color-border: rgba(196,200,188,0.3)
```

### Fonts in layout.tsx (✅ Good)
- **Literata**: Headings (variable: `--font-literata`)
- **Nunito Sans**: Body text (variable: `--font-nunito-sans`)

---

## Issues Found

### 1. Arbitrary Tailwind Values (❌ Anti-pattern)
**Files affected:** `ChecklistClient.tsx` (53 matches), `ScheduleClient.tsx` (25), `DirectoryClient.tsx` (18)

**Examples:**
```tsx
// Current (BAD) - Hardcoded arbitrary values
<div className="bg-[#f8e0a8] border-[#c4a66a]/30">
<div className="text-[#705c30]">
<div className="bg-[#c8e8d0]">
```

**Required (GOOD) - Use design tokens:**
```tsx
<div className="bg-status-amber-bg border-status-amber/30">
<div className="text-status-amber">
<div className="bg-status-green-bg">
```

### 2. Missing Design Tokens
The following colors are used in components but NOT defined in globals.css:

| Arbitrary Value | Usage | Proposed Token |
|-----------------|-------|----------------|
| `#f8e0a8` | Amber/warning cards | `--color-amber: #f8e0a8` |
| `#c4a66a` | Amber borders | `--color-amber-border: #c4a66a` |
| `#705c30` | Amber text | Already have `--color-status-amber` |
| `#c8e8d0` | Green light bg | `--color-mint: #c8e8d0` |
| `#78a886` | Green mid | `--color-sage: #78a886` |
| `#2a6038` | Green dark text | Already have `--color-status-green` |
| `#f0e8db` | Warm beige | `--color-warm: #f0e8db` |
| `#e4e0d8` | Light beige | `--color-cream: #e4e0d8` |
| `#dcd8d0` | Border hover | `--color-border-hover: #dcd8d0` |

### 3. Font Usage Inconsistencies
Some components still use inline `style={{ fontFamily: '"Literata", serif' }}` while others may not. All headings should consistently use the CSS variable.

**Required pattern:**
```tsx
<h1 className="font-literata">Heading</h1>
```

### 4. Missing Font Token in globals.css
The `--font-literata` variable is defined in layout.tsx but not exposed in globals.css @theme.

---

## Implementation Tasks

### Task 1: Extend Design Tokens in globals.css
**File:** `/Users/aochinwen/Meeting-Coordinator/app/globals.css`

Add missing tokens:
```css
@theme {
  /* Existing tokens... */
  
  /* Extended palette */
  --color-amber: #f8e0a8;
  --color-amber-border: #c4a66a;
  --color-mint: #c8e8d0;
  --color-sage: #78a886;
  --color-warm: #f0e8db;
  --color-cream: #e4e0d8;
  --color-border-hover: #dcd8d0;
  
  /* Font families */
  --font-literata: 'Literata', serif;
  --font-nunito: 'Nunito Sans', sans-serif;
}
```

### Task 2: Replace Arbitrary Values in Components

**Priority order:**
1. `ChecklistClient.tsx` (53 arbitrary values)
2. `ScheduleClient.tsx` (25 arbitrary values)
3. `DirectoryClient.tsx` (18 arbitrary values)
4. `AddUserModal.tsx` (1 arbitrary value)
5. `Header.tsx` (1 arbitrary value)

**Mapping for replacement:**
| From | To |
|------|-----|
| `bg-[#f8e0a8]` | `bg-amber` |
| `border-[#c4a66a]/30` | `border-amber-border/30` |
| `text-[#705c30]` | `text-status-amber` |
| `bg-[#c8e8d0]` | `bg-mint` |
| `text-[#2a6038]` | `text-status-green` |
| `bg-[#f0e8db]` | `bg-warm` |
| `bg-[#e4e0d8]` | `bg-cream` |
| `bg-[#78a886]` | `bg-sage` |

### Task 3: Standardize Font Usage
Replace all inline font styles with utility classes:
```tsx
// Before
<h1 style={{ fontFamily: '"Literata", serif' }}>

// After
<h1 className="font-literata">
```

### Task 4: Verify Design System Consistency
Check that these Figma-specified elements are properly styled:
- [ ] Bento cards use `--color-surface` background
- [ ] Primary buttons use `--color-primary` with `--color-primary-hover`
- [ ] Status badges use the status color tokens
- [ ] Border radius follows 24px (rounded-3xl) for cards, 16px (rounded-2xl) for inputs
- [ ] Shadows follow the subtle pattern: `shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]`

---

## Verification Steps

1. **Visual regression check:** Compare each page against Figma node URLs
2. **Token audit:** Run `grep -r "bg-\[" components/ app/` - should show 0 arbitrary values
3. **Font check:** Ensure all headings use `font-literata`
4. **Color consistency:** No hardcoded hex values in className strings

---

## Success Criteria

- [ ] All arbitrary Tailwind values (`bg-[#...]`, `text-[#...]`) replaced with design tokens
- [ ] globals.css contains complete color palette matching Figma specs
- [ ] Font families consistently use CSS variables
- [ ] Visual appearance matches Figma designs across all 6 nodes:
  - Dashboard (1-4120)
  - People Directory (1-2231)
  - Calendar (1-2718)
  - List View (1-2975)
  - Template Builder (1-3237)
  - Add User Modal (1-3686)

---

## Related Files

- `/Users/aochinwen/Meeting-Coordinator/app/globals.css`
- `/Users/aochinwen/Meeting-Coordinator/app/layout.tsx`
- `/Users/aochinwen/Meeting-Coordinator/components/ChecklistClient.tsx`
- `/Users/aochinwen/Meeting-Coordinator/components/ScheduleClient.tsx`
- `/Users/aochinwen/Meeting-Coordinator/components/DirectoryClient.tsx`
- `/Users/aochinwen/Meeting-Coordinator/components/AddUserModal.tsx`
- `/Users/aochinwen/Meeting-Coordinator/components/Header.tsx`
- `/Users/aochinwen/Meeting-Coordinator/app/page.tsx`
- `/Users/aochinwen/Meeting-Coordinator/app/calendar/page.tsx`
- `/Users/aochinwen/Meeting-Coordinator/app/templates/page.tsx`
