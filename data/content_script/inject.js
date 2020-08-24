if (!config) {
  var config = {
    "iframe": null,
    "listener": function (request, sender, sendResponse) {    
      if (request.action === "print") window.print();
      if (request.action === "close") config.interface.hide();
    },
    "interface": {
      "toggle": function () {
        config.iframe = document.querySelector(".draw-on-page-parent-iframe");
        config.interface[config.iframe ? "hide" : "show"]();
      },
      "hide": function () {
        config.iframe.remove();
        chrome.runtime.sendMessage({"action": "icon", "state": "OFF"});
      },
      "show": function () {
        config.iframe = document.createElement("iframe");
        config.iframe.setAttribute("class", "draw-on-page-parent-iframe");
        config.iframe.src = chrome.runtime.getURL("data/interface/index.html?page");
        /*  */
        config.iframe.style.top = "0";
        config.iframe.style.left = "0";
        config.iframe.style.margin = "0";
        config.iframe.style.border = "0";
        config.iframe.style.padding = "0";
        config.iframe.style.width = "100%";
        config.iframe.style.height = "100%";
        config.iframe.style.outline = "none";
        config.iframe.style.position = "fixed";
        config.iframe.style.zIndex = "2147483647";
        config.iframe.style.background = "transparent";
        /*  */
        document.documentElement.appendChild(config.iframe);
        chrome.runtime.sendMessage({"action": "icon", "state": "ON"});
      }
    }
  };
  /*  */
  chrome.runtime.onMessage.addListener(config.listener);
}

config.interface.toggle();