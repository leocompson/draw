# Draw on Page

Draw directly over any website, PDF viewer, quiz, or procedure page. Draw on
the current viewport, add editable shapes, save drawings locally, and print the
result.

## Features

- Pencil, circle, and spray brushes.
- Circles, triangles, rectangles, lines, hexagons, and octagons.
- Move, resize, rotate, copy, paste, zoom, undo, and redo.
- Page-mode drawings scoped to the current page URL.
- Optional page anchoring that keeps drawings attached to document positions
  while scrolling.
- PNG export and printing.
- Light and dark interface themes.
- Keyboard shortcuts for Windows/Linux and macOS.

## Usage

1. Open the page you want to annotate.
2. Select **Draw on Page** from the browser toolbar.
3. Choose a brush or shape and draw over the page.
4. Use the controls to edit, save, export, print, or clear the drawing.

In page mode, use the anchor button when annotations should remain attached to
the document instead of the viewport. This is especially useful for PDFs,
quizzes, and long step-by-step procedures.
The anchor is disabled for new users and its preference is remembered after
you change it.

When the anchor is enabled, mouse-wheel scrolling is forwarded to the host page
and the drawings follow their document positions. To work with form controls,
save the drawing, close the overlay with **Close**, complete the form, and
reopen the extension; the saved anchored drawing will be restored at the same
page positions.

The drawing surface is an extension overlay above the page while drawing is
active. This keeps annotations isolated from the website, but it also means
that page controls directly underneath cannot receive clicks until the overlay
is closed.

## Keyboard shortcuts

| Action | Windows/Linux | macOS |
| --- | --- | --- |
| Undo | `Ctrl+Z` | `Command+Z` |
| Redo | `Ctrl+Y` or `Ctrl+Shift+Z` | `Command+Shift+Z` |
| Copy | `Ctrl+C` | `Command+C` |
| Paste | `Ctrl+V` | `Command+V` |
| Delete selected object | `Delete` or `Backspace` | `Delete` or `Backspace` |

## Storage and privacy

Drawings and preferences are stored locally with `chrome.storage.local`.
Page-mode drawings use a URL-specific storage key, so a drawing saved on one
page is not automatically loaded on another page. The extension does not read
page contents or send drawings to a remote service.

The extension uses these browser permissions:

- `activeTab` and `scripting` to place the drawing interface on the active page.
- `storage` to save drawings and preferences locally.
- `contextMenus` to select the preferred interface mode.

## Supported browsers

- [Chrome](https://chrome.google.com/webstore/detail/draw-on-page/ngmfehckdahhmlbabjemcepfhgnoddlo)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/edhkdegkbapjapmmcjmdboecngfknngi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/draw-on-page/)
- [Opera](https://addons.opera.com/en/extensions/details/draw-on-page/)
- [Web app and PWA](https://webbrowsertools.com/draw/)

## Development

This repository is a self-contained browser extension. Load the repository as
an unpacked extension from the browser's extension page, then reload the
extension after making changes.

Before submitting changes, run:

```bash
node --check background.js
for file in lib/*.js data/content_script/inject.js data/interface/index.js; do
  node --check "$file"
done
python3 -m json.tool manifest.json >/dev/null
git diff --check
```

## Credits

Drawing is powered by [Fabric.js](https://github.com/fabricjs/fabric.js),
bundled locally in `data/interface/vendor/fabric.js`.

## Release history

### 0.2.0

- Added URL-scoped page drawings.
- Stabilized canvas saving and undo/redo.
- Added page anchoring and macOS keyboard shortcuts.
- Removed legacy Manifest V2 code and intrusive install/uninstall navigation.
- Improved storage efficiency and documentation.

## License

The project license is pending confirmation from the upstream maintainer.
Please retain the existing copyright and third-party notices when distributing
or modifying the extension.

Support and FAQ: <https://mybrowseraddon.com/draw-on-page.html>
