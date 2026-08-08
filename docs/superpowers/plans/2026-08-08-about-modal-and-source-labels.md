# About Modal & Data Source Label Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relabel the rankings source as FantasyPros, refresh stale settings helper text, and add an About modal crediting Boris Chen and explaining the tool.

**Architecture:** Pure presentational changes. Copy edits in four existing components, plus a new `components/About/` (button + modal) composed exactly like the existing `components/Settings/` pattern and mounted in the AppBar. No API, state, or dependency changes.

**Tech Stack:** Next.js (pages router), React, Chakra UI, TypeScript.

**Testing note:** Per the approved spec ([2026-08-08-about-modal-and-source-labels-design.md](../specs/2026-08-08-about-modal-and-source-labels-design.md)), these are presentational copy changes — no new unit tests. Verification is `npm run lint`, `npm run build`, and a visual check in the dev server. TDD steps are intentionally omitted.

---

### Task 1: Relabel rankings source in AppBar and stale banner

**Files:**
- Modify: `components/AppBar/index.tsx:46`
- Modify: `components/StaleRankingsBanner.tsx:21-22`

- [ ] **Step 1: Update the AppBar subtitle**

In `components/AppBar/index.tsx`, change:

```tsx
              <Text as="span" fontWeight="medium">
                Boris Chen {getFormatName(state.format)}
              </Text>
```

to:

```tsx
              <Text as="span" fontWeight="medium">
                FantasyPros {getFormatName(state.format)}
              </Text>
```

- [ ] **Step 2: Make the stale banner source-neutral**

In `components/StaleRankingsBanner.tsx`, change:

```tsx
      <AlertDescription fontSize="sm">
        Boris Chen rankings were last updated {formatted} and may be from a
        previous season.
      </AlertDescription>
```

to:

```tsx
      <AlertDescription fontSize="sm">
        Rankings were last updated {formatted} and may be from a previous
        season.
      </AlertDescription>
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors (warnings pre-existing, if any).

- [ ] **Step 4: Commit**

```bash
git add components/AppBar/index.tsx components/StaleRankingsBanner.tsx
git commit -m "fix(ui): credit FantasyPros as rankings source in labels"
```

---

### Task 2: Refresh settings helper text

**Files:**
- Modify: `components/Settings/SettingsTeams.tsx:29-32`
- Modify: `components/Settings/SettingsRoster.tsx:37-39`

- [ ] **Step 1: Update the Teams helper text**

In `components/Settings/SettingsTeams.tsx`, change:

```tsx
        <FormHelperText>
          Number of teams in the draft. For now, just used to display the
          correct pick number.
        </FormHelperText>
```

to:

```tsx
        <FormHelperText>
          Number of teams in the draft. Used to show pick numbers and to
          compute scarcity-adjusted rankings.
        </FormHelperText>
```

- [ ] **Step 2: Update the Roster Size helper text**

In `components/Settings/SettingsRoster.tsx`, change:

```tsx
      <FormHelperText mb={3}>
        Number of players per position. Used to track your roster composition.
      </FormHelperText>
```

to:

```tsx
      <FormHelperText mb={3}>
        Number of players per position. Used to track your roster composition
        and to compute scarcity-adjusted rankings.
      </FormHelperText>
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Settings/SettingsTeams.tsx components/Settings/SettingsRoster.tsx
git commit -m "fix(settings): update stale helper text for scarcity-adjusted rankings"
```

---

### Task 3: Add About modal and mount it in the AppBar

**Files:**
- Create: `components/About/AboutModal.tsx`
- Create: `components/About/About.tsx`
- Create: `components/About/index.ts`
- Modify: `components/AppBar/index.tsx` (imports + button group)

- [ ] **Step 1: Create `components/About/AboutModal.tsx`**

Mirrors `SettingsModal` sizing/structure. Reads the last-updated date from
`useDraft` the same way `StaleRankingsBanner` does (date may be undefined
before rankings load — render nothing for that sentence in that case).

```tsx
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Flex,
  Heading,
  Link,
  Text,
} from '@chakra-ui/react';
import { useDraft } from 'providers/DraftProvider';

type AboutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AboutModal = (props: AboutModalProps) => {
  const { getters } = useDraft();
  const lastModified = getters.rankingsLastModified;
  const formatted = lastModified
    ? new Date(lastModified).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      size={['xs', 'sm', 'lg']}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>About Draft Driver</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap={4}>
            <div>
              <Heading as="h3" size="sm" marginBottom={1}>
                How it works
              </Heading>
              <Text fontSize="sm">
                Draft Driver is a fantasy football draft assistant built
                around a tier-based draft board. Mark players as drafted,
                favorite or avoid them, and jot per-player notes while the
                roster panel tracks your team by position. Turn on
                Scarcity-Adjusted Rankings in settings to re-order the board
                by value over replacement, computed from your roster sizes
                and league size. All draft state is saved locally in your
                browser.
              </Text>
            </div>
            <div>
              <Heading as="h3" size="sm" marginBottom={1}>
                Data &amp; credits
              </Heading>
              <Text fontSize="sm">
                Tiers and rankings come from{' '}
                <Link
                  href="https://www.borischen.co"
                  isExternal
                  textDecoration="underline"
                >
                  Boris Chen
                </Link>
                , whose tiers are built on FantasyPros expert consensus
                rankings. Season projections, ADP, team info, and rookie
                flags come from the Sleeper API.
                {formatted && <> Rankings were last updated {formatted}.</>}
              </Text>
            </div>
          </Flex>
        </ModalBody>

        <ModalFooter>
          <Button onClick={props.onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AboutModal;
```

- [ ] **Step 2: Create `components/About/About.tsx`**

Mirrors `components/Settings/Settings.tsx` (icon button + `useDisclosure`
+ modal). The icon is a standard material "info" glyph via Chakra's
`createIcon`, using `currentColor` like `SettingsIcon`.

```tsx
import {
  IconButton,
  createIcon,
  useDisclosure,
} from '@chakra-ui/react';
import AboutModal from './AboutModal';

const InfoIcon = createIcon({
  displayName: 'InfoIcon',
  viewBox: '0 0 24 24',
  path: (
    <path
      fill="currentColor"
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
    ></path>
  ),
});

const About = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <IconButton
        aria-label="about"
        variant="ghost"
        icon={<InfoIcon />}
        onClick={onOpen}
      />
      <AboutModal isOpen={isOpen} onClose={onClose} />
    </>
  );
};

export default About;
```

- [ ] **Step 3: Create `components/About/index.ts`**

```ts
export { default } from './About';
```

- [ ] **Step 4: Mount the button in the AppBar**

In `components/AppBar/index.tsx`, add the import after the
`ChartsButton` import:

```tsx
import AboutButton from 'components/About';
```

and change the button group:

```tsx
        <Flex gap={2}>
          <HomeButton />
          <ChartsButton />
          <SettingsButton />
        </Flex>
```

to:

```tsx
        <Flex gap={2}>
          <HomeButton />
          <ChartsButton />
          <AboutButton />
          <SettingsButton />
        </Flex>
```

- [ ] **Step 5: Lint and build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add components/About components/AppBar/index.tsx
git commit -m "feat(ui): add About modal crediting data sources"
```

---

### Task 4: Visual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (or the project's preview tooling).

- [ ] **Step 2: Verify in the browser**

On `http://localhost:3000`:

1. AppBar subtitle reads "Rankings: FantasyPros PPR" (or the selected format).
2. An info icon button appears between the charts and settings buttons.
3. Clicking it opens "About Draft Driver" with the "How it works" and
   "Data & credits" sections; the Boris Chen link points to
   `https://www.borischen.co` and opens in a new tab; the last-updated
   sentence shows a date once rankings have loaded.
4. Settings modal shows the updated Teams and Roster Size helper text.
5. Modal renders correctly in both light and dark mode.

- [ ] **Step 3: Fix anything found, amend the relevant commit, re-verify**
