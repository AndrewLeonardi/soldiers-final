# ACCEPTANCE CRITERIA -- Visual & Game Loop Phase

Pass/fail. No partial credit. Every item must be true before we move on.

---

## 1. BARRACKS (Hub Screen)

- [x] Shows real 3D flexSoldier models standing on a surface, NOT 2D icon cards
- [x] Each soldier is in their idle pose holding their equipped weapon
- [x] Soldiers are distinguishable (different weapons visible on the models)
- [x] Tapping a soldier opens their detail view
- [x] Recruit [+] button adds a new soldier (costs gold, soldier appears on screen)
- [x] DEPLOY button transitions to placement phase
- [x] Feels like looking at a toy collection, not a dashboard
- [x] A 10-year-old could figure out what to do in 5 seconds

## 2. SOLDIER DETAIL (Tap a soldier)

- [x] Full soldier model visible head-to-toe (not cut off)
- [x] Soldier is rotatable (drag to spin)
- [x] Equipped weapon is clearly visible on the model
- [x] Tapping a different weapon swaps the model's weapon live
- [x] Locked weapons show lock + compute cost clearly
- [x] Unlocking a weapon spends compute and equips it
- [x] Back button returns to barracks
- [x] Screen is NOT cluttered -- soldier is the hero, UI is minimal
- [ ] Weapon cards need 3D weapon models (currently SVG icons -- in progress)
- [x] Works on mobile portrait (375x812) without scrolling issues

## 3. DEPLOYMENT (After hitting DEPLOY)

- [x] Mission briefing modal appears with level name + squad roster
- [x] Placement tray shows YOUR roster soldiers by name (SGT RICO, PVT ACE)
- [x] NOT generic "RIFLE / ROCKET / SANDBAG / WALL" labels
- [x] Each soldier shows their equipped weapon type
- [x] Placing a soldier spawns a flexSoldier with the correct weapon
- [x] Soldiers appear on the battlefield in their idle pose
- [x] GO button starts the battle phase

## 4. BATTLEFIELD (After hitting GO)

- [x] Your configured soldiers appear on the battlefield where you placed them
- [x] Each soldier holds the weapon you equipped in the loadout
- [x] Soldiers are in their idle pose (alive, standing)
- [x] Camera stays usable (orbit still works)
- [ ] (Battle simulation is NOT required yet -- just visual presence)

## 5. GENERAL

- [x] Zero TypeScript errors
- [x] Zero console errors (warnings from THREE.Clock deprecation are acceptable)
- [x] 60fps on desktop (no major frame drops)
- [x] Mobile viewport (375x812) is usable for all screens
- [ ] Some UI still has dashboard-like elements (ongoing polish)
- [x] Every interactive element has touch feedback (scale on press)

## 6. TRAINING VISIBILITY (NEW)

- [x] Locked weapons show "REQUIRES TRAINING" when tapped
- [x] Training CTA overlay shows soldier name + weapon name
- [x] Pulsing TRAIN button with compute cost visible
- [x] "Watch your soldier learn through neural evolution" messaging
- [ ] Actual training arena (ML system) not built yet -- visual placeholder only

---

## REMAINING BEFORE MOVING TO ML/TRAINING

- [ ] Polish weapon cards in soldier detail (3D models instead of SVG icons)
- [ ] Ensure all screens pass "not a dashboard" test

*When these are done, we build the training/ML system.*
