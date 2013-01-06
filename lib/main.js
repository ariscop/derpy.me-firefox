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
				text: "*Derp* : " + ret.message
			});
		} else {
			clipboard.set(ret.data);
			notifications.notify({
				title: "Link Coppied",
				text: ret.message +
					  "\r\nUrl: " + ret.data
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
	var timers = require("timers");
	var setTimeout = timers.setTimeout;
	var clearTimeout = timers.clearTimeout;
	var Request = require("request").Request;
	
	function final() {
		working = false;
		widget.contentURL = icoURL;
		clearTimeout(rateTimeout);
	}

	function start() {
		if(working) return false;
		working = true;
		
		widget.contentURL = dimURL;
		rateTimeout = setTimeout(function() {
			final()
		}, 60000);
		
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
		
		var getUrl = "http://api.derpy.me/v1/shorten.json?url=" + url;
		//console.log("Getting: " + getUrl);

		var timeout = undefined;
		
		var req = Request({
			url: getUrl,
			onComplete: function(res) {
				//console.log(JSON.stringify(res.json))
				var data  = res.json;
				var short, message;
				
				if(data.success) {
					error = false;
					short = 'http://derpy.me/' + data.data.keyword;
					message = data.success.message;
				} else if(data.error) {
					error = true;
					message = data.error.message;
				} else {
					error = true;
					message = 'Malformed response';
				}
				
				doCallback(callback, {
					error: error,
					data: short,
					message: message
				});
				
				timers.clearTimeout(timeout);
				end(!error);
			}
		}).get();
		
		timeout = timers.setTimeout(function() {
			if(working) {
				doCallback(callback, {error: true, message: "Timeout"});
				
				working = false;
				end(false);
			}
		}, 15000);	
		
		return true;
	};
})();
