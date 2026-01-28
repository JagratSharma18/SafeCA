# Safe CA - Manual Test Scenarios

## Pre-requisites
1. Extension loaded in browser (Chrome/Firefox)
2. Access to X/Twitter account
3. Network connection for API calls

---

## Test Suite 1: Basic Installation

### TC1.1: Extension Loads Successfully
**Steps:**
1. Load extension in developer mode
2. Check for errors in extension page

**Expected:**
- Extension icon appears in toolbar
- No errors in console
- Welcome notification appears (first install)

### TC1.2: Popup Opens
**Steps:**
1. Click extension icon

**Expected:**
- Popup opens with 3 tabs (Scan, Watchlist, Settings)
- Dark theme applied by default
- "Active" status shown

---

## Test Suite 2: CA Detection on X/Twitter

### TC2.1: EVM Address Detection
**Steps:**
1. Navigate to X/Twitter
2. Find or create a tweet containing: `0x1234567890123456789012345678901234567890`

**Expected:**
- Address is detected
- Loading badge appears (blue spinner)
- Badge updates to score (green/yellow/red)

### TC2.2: Solana Address Detection
**Steps:**
1. Find or create a tweet containing: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

**Expected:**
- Address is detected
- Badge appears with score

### TC2.3: Multiple Addresses in One Tweet
**Steps:**
1. Create tweet with 2+ different addresses

**Expected:**
- All addresses detected
- Each has its own badge

### TC2.4: No False Positives
**Steps:**
1. Find tweets with:
   - Regular URLs (https://example.com)
   - Normal text
   - Numbers

**Expected:**
- No badges appear on non-CA content

### TC2.5: Dynamic Content Loading
**Steps:**
1. Open X/Twitter timeline
2. Scroll down to load new tweets
3. New tweets contain CAs

**Expected:**
- New CAs detected automatically
- Badges injected without page refresh

---

## Test Suite 3: Badge Interaction

### TC3.1: Hover Tooltip
**Steps:**
1. Hover over a badge

**Expected:**
- Tooltip appears after ~500ms
- Shows token symbol, score, basic info
- "Click for details" hint

### TC3.2: Click Popup
**Steps:**
1. Click on a badge

**Expected:**
- Detail popup opens
- Shows full analysis:
  - Token name/symbol
  - Score with color
  - Address (copyable)
  - Chain badge
  - Risk flags
  - Metrics grid
  - Breakdown bars
  - Action buttons

### TC3.3: Copy Address
**Steps:**
1. Click copy button in popup

**Expected:**
- Address copied to clipboard
- Button shows checkmark briefly

### TC3.4: Close Popup
**Steps:**
1. Click X button or click outside popup

**Expected:**
- Popup closes smoothly

---

## Test Suite 4: Manual Scanning

### TC4.1: Single Address Scan
**Steps:**
1. Open popup
2. Paste EVM address in input
3. Click "Scan Token"

**Expected:**
- Loading state shown
- Result card appears
- Score and details displayed

### TC4.2: Multiple Address Scan
**Steps:**
1. Paste multiple addresses (one per line)
2. Click "Scan Token"

**Expected:**
- All addresses scanned
- Multiple result cards shown

### TC4.3: Chain Selection
**Steps:**
1. Paste address
2. Select specific chain (e.g., BSC)
3. Scan

**Expected:**
- Scan uses selected chain
- Result shows correct chain

### TC4.4: Invalid Address
**Steps:**
1. Paste invalid text
2. Click "Scan Token"

**Expected:**
- Error message: "No valid contract addresses found"

### TC4.5: Context Menu Scan
**Steps:**
1. Select an address on any webpage
2. Right-click > "Scan with Safe CA"

**Expected:**
- Popup opens with address pre-filled
- Scan starts automatically

---

## Test Suite 5: Watchlist

### TC5.1: Add to Watchlist
**Steps:**
1. Scan a token
2. Click "Add to Watchlist"

**Expected:**
- Button changes to "Added!"
- Watchlist count badge updates

### TC5.2: View Watchlist
**Steps:**
1. Switch to Watchlist tab

**Expected:**
- Added token appears in list
- Shows score, name, address, chain

### TC5.3: Remove from Watchlist
**Steps:**
1. Click X button on watchlist item

**Expected:**
- Item removed
- Count updates

### TC5.4: Click Watchlist Item
**Steps:**
1. Click on a watchlist item

**Expected:**
- Switches to Scan tab
- Shows full details for that token

### TC5.5: Refresh Watchlist
**Steps:**
1. Click refresh button

**Expected:**
- Spinner animates
- Data refreshed

---

## Test Suite 6: Settings

### TC6.1: Toggle Auto-scan
**Steps:**
1. Go to Settings
2. Toggle "Auto-scan on X/Twitter" off
3. Visit X/Twitter with CAs

**Expected:**
- No badges appear
- Toggle back on, badges appear

### TC6.2: Toggle Badges
**Steps:**
1. Toggle "Show badges" off

**Expected:**
- Badges hidden on X/Twitter

### TC6.3: Dark/Light Mode
**Steps:**
1. Toggle "Dark mode" off

**Expected:**
- Popup switches to light theme

### TC6.4: Notifications Toggle
**Steps:**
1. Toggle "Enable notifications" off
2. Add token to watchlist
3. Wait for change

**Expected:**
- No notification appears

### TC6.5: Threshold Sliders
**Steps:**
1. Adjust liquidity drop threshold
2. Adjust score drop threshold

**Expected:**
- Values update in real-time
- Settings persist after popup close

### TC6.6: Clear Cache
**Steps:**
1. Click "Clear Cache"

**Expected:**
- Button shows "Cache Cleared!"
- Next scans fetch fresh data

### TC6.7: Clear Watchlist
**Steps:**
1. Click "Clear Watchlist"
2. Confirm dialog

**Expected:**
- All items removed
- Empty state shown

---

## Test Suite 7: Error Handling

### TC7.1: Network Error
**Steps:**
1. Disable network
2. Try to scan a token

**Expected:**
- Error badge (gray with !)
- Error message in popup
- No crash

### TC7.2: API Rate Limit
**Steps:**
1. Scan many tokens rapidly

**Expected:**
- Rate limiting kicks in
- Requests queued
- Eventually completes

### TC7.3: Invalid API Response
**Steps:**
1. Scan known problematic address

**Expected:**
- Graceful handling
- Partial data shown if available

---

## Test Suite 8: Performance

### TC8.1: Large Timeline
**Steps:**
1. Scroll through 100+ tweets with CAs

**Expected:**
- No UI lag
- Badges load progressively
- Memory stable

### TC8.2: Rapid Scrolling
**Steps:**
1. Scroll very fast through timeline

**Expected:**
- Debouncing prevents excessive scans
- No duplicate badges

### TC8.3: Cache Effectiveness
**Steps:**
1. Scan a token
2. Navigate away
3. Return and see same token

**Expected:**
- Cached result used (instant badge)
- No API call for 5 minutes

---

## Test Suite 9: Cross-Browser

### TC9.1: Chrome
**Steps:**
1. Test all above scenarios in Chrome

**Expected:**
- All features work

### TC9.2: Brave
**Steps:**
1. Test key scenarios in Brave

**Expected:**
- All features work
- Shields don't block functionality

### TC9.3: Firefox
**Steps:**
1. Load Firefox package
2. Test key scenarios

**Expected:**
- All features work
- No manifest errors

---

## Test Suite 10: Edge Cases

### TC10.1: Very Long Address List
**Steps:**
1. Paste 20+ addresses in manual scan

**Expected:**
- All processed
- Results paginated/scrollable

### TC10.2: Special Characters in Tweet
**Steps:**
1. Tweet with emojis, links, and CA

**Expected:**
- CA still detected
- No parsing errors

### TC10.3: Extension Update
**Steps:**
1. Simulate extension update

**Expected:**
- Watchlist preserved
- Settings preserved
- Cache cleared

### TC10.4: Concurrent Tabs
**Steps:**
1. Open X/Twitter in multiple tabs

**Expected:**
- Each tab works independently
- No conflicts

---

## Checklist Summary

| Suite | Pass | Fail | Notes |
|-------|------|------|-------|
| 1. Installation | | | |
| 2. CA Detection | | | |
| 3. Badge Interaction | | | |
| 4. Manual Scanning | | | |
| 5. Watchlist | | | |
| 6. Settings | | | |
| 7. Error Handling | | | |
| 8. Performance | | | |
| 9. Cross-Browser | | | |
| 10. Edge Cases | | | |

**Tester:** _______________
**Date:** _______________
**Version:** _______________
