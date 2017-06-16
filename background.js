
// This is a way to do python-ish string formatting. Borrowed from: http://stackoverflow.com/a/4256130/5678409
String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
}

var tracked_builds = []

function spawnNotification(noteTitle, noteBody, timeout_s, is_important, icon = null) {
    var options = {
        body: noteBody,
        requireInteraction: is_important
    }
    if (icon) {
        options['icon'] = icon;
    }
    var n = new Notification(noteTitle, options);
    if (!is_important) {
        setTimeout(n.close.bind(n), timeout_s * 1000); 
    }
    return n;
}

function indicateTabIsTracked(tabId) {
    chrome.browserAction.setBadgeText({'text': '✔️', 'tabId': tabId});
    chrome.browserAction.setBadgeBackgroundColor({"color": "#ffc107", "tabId": tabId});
    chrome.browserAction.setTitle({'title': "Build is already being tracked.", tabId: tabId});
}

function indicateTabCantBeTracked(tabId) {
    chrome.browserAction.setBadgeText({'text': ' ✖️', 'tabId': tabId});
    chrome.browserAction.setBadgeBackgroundColor({"color": "#b94a48", "tabId": tabId});
    chrome.browserAction.setTitle({'title': "Build cannot be tracked.", tabId: tabId});
}


function attachTracker(jsonUrl, pageUrl) {
    var retry = setInterval(function() {
        $.getJSON(jsonUrl, function(data) {
            if (data.state !== "started") {
                // Announce that it is done and stop the retry.
                clearInterval(retry);
                tracked_builds.splice(tracked_builds.indexOf(data.number), 1);
                if (data.state === 'passed') {
                    var state_description = 'has passed';
                    var icon = 'passed.png';
                } else if (data.state === 'canceled') {
                    var state_description = 'has been canceled';
                    var icon = 'cancelled.png';
                } else if (data.state === 'failed') {
                    var state_description = 'has failed';
                    var icon = 'failed.png';
                } else {
                    var state_description = 'is unknown';
                    var icon = null;
                }
                var title = "{0} (#{1}) {2}.".format(data.branch_name, data.number, state_description);

                n = spawnNotification(title, data.message, 10, true, icon);

                n.onclick = function() {
                    if (data.state === 'passed' && data.pull_request) {
                        chrome.tabs.create({'url': data.pull_request.url, 'active': true});
                        n.close();
                    } else {
                        chrome.tabs.create({'url': pageUrl, 'active': true});
                        n.close();
                    }
                };
            }
        });

    }, 10 * 1000); // Reloads every 10 seconds.
}

// Called when the url of a tab changes.
function checkForBuildUrl(tabId, changeInfo, tab) {
    // If the tabs url starts with "http://specificsite.com"...
    if (/.*buildkite\.com\/[\w-\d]+\/\w+\/builds\/\d{1,6}(#.*)?$/.test(tab.url)) {
        console.log("Whooo! Tab {0} is on buildkite!".format(tabId));
        chrome.browserAction.enable(tabId);

        var build_num = tab.url.match(/.*buildkite\.com\/[\w-\d]+\/\w+\/builds\/(\d{1,6})(#.*)?$/)[1];
        console.log(build_num);
        if (-1 === $.inArray(parseInt(build_num), tracked_builds)) {
            chrome.browserAction.setTitle({'title': "Track this build!", 'tabId': tabId});
        } else {
            indicateTabIsTracked(tabId);
        }
    } else {
        chrome.browserAction.disable(tabId);
        chrome.browserAction.setTitle({'title': "This page is not a trackable build.", 'tabId': tabId});
    }
};
// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForBuildUrl);


chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var activeTab = tabs[0];
        var pageUrl = activeTab.url.split('#')[0];
        var jsonUrl = pageUrl + ".json";

        $.getJSON(jsonUrl, function(data) {
            console.log(data.id);
            console.log(data.state);
            console.log(data.message);

            if (data.state === "started") {
                if (-1 === $.inArray(data.number, tracked_builds)) {
                    console.log("Tab Id: "+ activeTab.id);

                    indicateTabIsTracked(activeTab.id);

                    tracked_builds.push(data.number);
                    attachTracker(jsonUrl, pageUrl);
                } else {
                    indicateTabIsTracked(activeTab.id);
                }
            } else {
                console.log("Can't attach tracker to not-in-progress builds.");
                indicateTabCantBeTracked(activeTab.id);
            }

        });
    });
});

// Right-click Menu 
chrome.contextMenus.create({title: "Track Build",
                            contexts: ["link"],
                            targetUrlPatterns: ["https://buildkite.com/*/builds/*"],
                            onclick: function(info, tab) {
                                var url = info.linkUrl;
                                var pageUrl = url.split('#')[0];
                                var jsonUrl = pageUrl + ".json";

                                $.getJSON(jsonUrl, function(data) {
                                    if (data.state === "started") {
                                        if (-1 === $.inArray(data.number, tracked_builds)) {
                                            indicateTabIsTracked(tab.id);
                                            tracked_builds.push(data.number);
                                            attachTracker(jsonUrl, pageUrl);
                                        } else {
                                            indicateTabIsTracked(tab.id);
                                        }
                                    } else {
                                        indicateTabCantBeTracked(tab.id);
                                    }
                                });
                            }
});


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("Message: " + request.message);
    }
);
