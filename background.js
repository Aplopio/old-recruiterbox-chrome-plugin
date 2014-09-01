chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    sendResponse('SENT FROM BACKGROUND SCRIPT');
  }
);