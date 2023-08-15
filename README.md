# Network Request Logger Chrome Extension
This is a Chrome Extension that allows you to enable network request logging from the Chrome Devtools (similar to using "Network" tab). It adds a new "Request Logger" tab in the Devtools that is _very_ limited in terms of capabilities compared to the already existing network tab. However, it has some features that are different to the "Network" tab (or not available there)

- [x] only show received network responses
- [x] persist network requests also between page reloads
- [ ] filter HTTP requests by method (POST, GET, OPTIONS, etc.)
- [ ] obtain data from a selected request
  - [ ] copy auth token used
  - [ ] download request body
- [ ] copy whole request as cURL or something similar (e.g. for import in Postman)
- [ ] view request body directly in browser (for JSON responses)
- [ ] manage older sessions from options page of the extension
  - [ ] view sessions
  - [ ] download file with all requests
  - [ ] remove sessions

Those features with a ticked checkbox are already implemented, others are TODOs for me.

## Installation
The installation process is the same as for any 'unofficial' Chrome extension (not found in the Chrome Webstore), however you will have to build the project your self too.

### Part A: Build
For this you will need Node and a package manager of your choice (`npm`, `yarn`, or `pnpm`):

1. Run `yarn` or `npm i` or `pnpm i` (making sure your Node version is >= 16)
2. Run `yarn dev` or `npm run dev` or `pnpm dev`

### Part B: Install Extension

1. Open Chrome browser
2. Navigate to `chrome://extensions`
3. Tick 'Developer mode' checkbox
4. Click 'Load unpacked extension'
5. Select `dist` folder of this project (created by `dev` or `build` script)
