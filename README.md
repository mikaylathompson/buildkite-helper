
# Installation:
1. Go to the Chrome extension page, [chrome://extensions](chrome://extensions/).
2. On the top-left, check "Developer mode".
3. A button should appear labeled "Load unpacked extension..." Click it.
4. Select this directory.
5. Refresh buildkite windows. There should be a small "B" logo in the address bar and the extension may ask for the ability to notify you.

# Use:
- To track a build, go to the build page and click the "B" next to the address bar.  A yellow checkmark should appear to indicate that the build is now being tracked. If a red x appears instead, the build is not trackale, most likely because you're not on a build page or the build isn't in a running state (either not started or already finished).  The build will be tracked and notify you even if you close the window, but will not work if you quit chrome.


May work in firefox, but some chrome apis are used, so likely not entirely compatible.
Firefox installation instructions [here](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox).

