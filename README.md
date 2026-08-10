# ResetEra Hard Ignore

A browser extension for Chrome and Firefox that hard-ignores ResetEra users and adds reveal controls for quoted ignored content.

## What it does

- Provides a basic menu for managing ignored users
- Hides ignored users' posts and threads
- Hides ignored users' posts that are quoted by other posts, but gives the option to un-hide it just for that thread.

## How to install

### Chrome:
1. Download the source code by clicking on the green "Code" button at the top of this page -> Download as ZIP. Or use this [direct github link](https://github.com/matthew-b-dev/resetera-hard-ignore/archive/refs/heads/master.zip). Unpack the .zip anywhere that isn't going to annoy you.
2. Open the Chrome extension page by pasting this into a new tab: `chrome://extensions/`
3. Near the top left corner, click on the "Load unpacked"
4. In the file selector, select the folder itself: `resetera-hard-ignore-master` (wherever you saved it)
6. Open ResetEra, click on the Chrome "extensions" button (puzzle piece) and click on "ResetEra Hard Ignore" to manage ignored users
7. Changes are applied when you refresh the page.

### Firefox:
1. Download the source code by clicking on the green "Code" button at the top of this page -> Download as ZIP. Or use this [direct github link](https://github.com/matthew-b-dev/resetera-hard-ignore/archive/refs/heads/master.zip). Unpack the .zip anywhere that isn't going to annoy you.
2. Open the Firefox extension debugging page by pasting this into a new tab: `about:debugging#/runtime/this-firefox`
3. Click on the "Load Temporary Add-on…" button near the top of the page
4. In the file selector, navigate inside the `resetera-hard-ignore-master` folder (wherever you saved it) and choose `manifest.json`.
6. Open ResetEra, click on the Firefox "extensions" button (puzzle piece) and click on "ResetEra Hard Ignore" to manage ignored users
7. Changes are applied when you refresh the page.

## Examples:
Extension menu:

<img width="371" height="358" alt="image" src="https://github.com/user-attachments/assets/3fbdec0a-cce8-4eea-b236-9293482655c0" />

Posts and threads from ignored users are hidden entirely. The only way you might encounter their content is when one of their posts is block-quoted in another post. In the below example,

<img width="805" height="257" alt="image" src="https://github.com/user-attachments/assets/fe42045f-5cdf-4704-a0c5-adcba2d47e6b" />

Choosing "Show ignored content" would show the user's post content in the block-quote. Additionally, once you choose to show the content, the ignored user's post would appear elsewhere in the thread like this:

<img width="801" height="206" alt="image" src="https://github.com/user-attachments/assets/c0e90577-7039-4182-b45c-371342b26a05" />



## Files

- `manifest.json` - extension metadata and permissions
- `content-script.js` - page injection logic for hiding/unhiding content
- `extension-menu.html` - menu UI for managing ignored users
- `extension-menu.js` - menu behavior
- `extension-menu.css` - menu styling


## Notes

- Choosing to reveal ignored content (from a blockquote) will only apply to that particular user in that particular thread.
