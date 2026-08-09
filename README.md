# ResetEra Hard Ignore

A browser extension for Chrome and Firefox that hard-ignores ResetEra users and adds reveal controls for quoted ignored content.

## What it does

- Provides a basic menu for managing ignored users
- Hides ignored users' posts and threads
- Hides ignored users' posts that are quoted by other posts, but gives the option to un-hide it just for that thread.

## Files

- `manifest.json` - extension metadata and permissions
- `content-script.js` - page injection logic for hiding/unhiding content
- `extension-menu.html` - menu UI for managing ignored users
- `extension-menu.js` - menu behavior
- `extension-menu.css` - menu styling

## Getting started

1. Load the extension in Chrome/Firefox as an unpacked extension
2. Open ResetEra and add ignored usernames via the extension menu
3. Refresh the page to apply ignore rules

## Notes

- Choosing to reveal ignored content (from a blockquote) will only apply to that particular user in that particular thread.
