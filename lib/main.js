/**
 * Derpy.me link shortener
 * 
 * author: Andrew <ariscop@gmail.com>
 * 
 **/

var data = require('self').data;

var callback = (function(){
	var clipboard = require("clipboard");
	var notifications = require("notifications");
	
	return function(ret) {
		if(ret.error) {
			notifications.notify({
				title: "Link Failed to Copy",
				text: "*Derp* : " + ret.data
			});
		} else {
			clipboard.set(ret.data);
			notifications.notify({
				title: "Link Coppied",
				text: "Your link was sucesfully Derped" +
					  "\nUrl: " + ret.data
			});
		}
	}
	
})();


//define ahead of time
var derpy;

//------Resource URL's------//
var dimURL = data.url("favicon_dim.gif");
var icoURL = data.url("favicon.ico");
var dimdimURL = data.url("favicon_dim_dim.ico");


//------Widget Code------//
var widgets = require("widget");
var tabs = require("tabs");
var widget = widgets.Widget({
  id: "muffin-widget",
  label: "Derpy.me link Shortener",
  contentURL: icoURL,
  onClick: function() {
	derpy(tabs.activeTab.url);
  }
});


//------Context Menu code------//
var cm = require("context-menu");
var menuItemf = cm.Item({
  label: "Derp Link",
  image: icoURL,
  context: cm.SelectorContext("a[href]"),
  contentScript: 'self.on("click", function (node, data) {' +
                 '  self.postMessage(node.href);' +
                 '});',
  onMessage: function (data) {
	  derpy(data);
  }
});


//------Timer hacks------//


//------Link Shortening code------//
derpy = (function() {
	var pageWorkers = require("page-worker");
	var timers = require("timers");
	var setTimeout = timers.setTimeout;
	var clearTimeout = timers.clearTimeout;
	
	var pScript = "var ret = {}; ret.error = false; try { " +
		"ret.url = document.getElementsByClassName('shortlink')" +
		"[0].getElementsByTagName('a')[0].innerHTML ; " +
		" } catch(err) { ret.error = true; ret.errorCode = err }; " +
		" self.postMessage(ret); "
 

	function final() {
		working = false;
		widget.contentURL = icoURL;
		clearTimeout(rateTimeout);
	}

	function start() {
		if(working) return false;
		working = true;
		
		widget.contentURL = dimURL;
		rateTimeout = setTimeout(final, 60000);
		
		return true;
	}

	function end(sucess) {
		if(!sucess) {
			final();
		} else {
			widget.contentURL = dimdimURL;
		}
	}

	var working = false;
	var rateTimeout;

	function doCallback(callback, data) {
		if(typeof(callback) == 'function') {
			callback(data);
		}
	}
	
	//TODO: callback. not much of a problem, just should probably have it
	return function(url) {
		if(!start()) return false;
		
		url = encodeURIComponent(url);
		
		var getUrl = "http://derpy.me/?url=" + url;
		console.log("Getting: " + getUrl);

		var timeout = undefined;
		
		var page = pageWorkers.Page({
			contentURL: getUrl,
			contentScript: pScript,
			contentScriptWhen: "end",
			onMessage: function(ret) {
				if(ret.error) {
					var string = "";
					if(typeof(ret.errorCode) == "object") {
						string = JSON.stringify(ret.errorCode);
					} else {
						string = ret.errorCode;
					}
					doCallback(callback, {error: true, data: string});
				} else {
					doCallback(callback, {error: false, data: ret.url});
				}
				timers.clearTimeout(timeout);
				page.destroy();
				end(!ret.error);
			}
		});

		timeout = timers.setTimeout(function() {
			if(working) {
				doCallback(callback, {error: true, data: "Timeout"});
				page.destroy();
				working = false;
				end(false);
			}
		}, 15000);
		
		return true;
	};
})();
