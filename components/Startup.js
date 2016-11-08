/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const ID = 'migrate-login-info@clear-code.com';

const Cc = Components.classes;
const Ci = Components.interfaces;

const kCID  = Components.ID('{8e6a601b-91f5-4fdc-8a3b-c19f2c393ad0}'); 
const kID   = '@clear-code.com/migrate-login-info/startup;1';
const kNAME = 'MigrateLoginInfoStartupService';

const ObserverService = Cc['@mozilla.org/observer-service;1']
		.getService(Ci.nsIObserverService);

const DEBUG_KEY = 'extensions.' + ID + '.debug';

var DEBUG = false;

Components.utils.import('resource://migrate-login-info-modules/lib/prefs.js');

function mydump()
{
	if (!DEBUG)
		return;
	var str = Array.slice(arguments).join('\n');
	Cc['@mozilla.org/consoleservice;1']
		.getService(Ci.nsIConsoleService)
		.logStringMessage('[migrate-login-info] ' + str);
}
 
function MigrateLoginInfoStartupService() { 
}
MigrateLoginInfoStartupService.prototype = {
	classID          : kCID,
	contractID       : kID,
	classDescription : kNAME,
	 
	observe : function(aSubject, aTopic, aData) 
	{
		switch (aTopic)
		{
			case 'profile-after-change':
				ObserverService.addObserver(this, 'final-ui-startup', false);
				return;

			case 'final-ui-startup':
				ObserverService.removeObserver(this, 'final-ui-startup');
				this.init();
				return;
		}
	},
 
	init : function() 
	{
		DEBUG = prefs.getPref(DEBUG_KEY);
		mydump('initialize');

	},
  
	QueryInterface : function(aIID) 
	{
		if (!aIID.equals(Ci.nsIObserver) &&
			!aIID.equals(Ci.nsISupports)) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	}
 
}; 

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
var NSGetFactory = XPCOMUtils.generateNSGetFactory([MigrateLoginInfoStartupService]);

