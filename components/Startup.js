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

const LoginManager = Cc['@mozilla.org/login-manager;1'].getService(Ci.nsILoginManager);

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
		this.migrateLogins();
	},

	migrateLogins : function()
	{
		prefs.getChildren('extensions.' + ID + '.migration').forEach(function(aKey) {
			var rule = prefs.getPref(aKey);
			if (typeof rule === 'string')
				this.doMigration(rule);
			else
				mydump('invalid type rule: ' + aKey + ' (' + (typeof rule));
		}, this);
	},

	doMigration : function(aRule)
	{
		var matchResult = aRule.match(/\s*([^:\s]+):([^\s]+)\s*=>\s([^:\s]+):([^\s]+)/);
		if (!matchResult) {
			mydump('invalid rule: '+aRule);
			return;
		}
		var sourceType = matchResult[1];
		var sourceHost = matchResult[2];
		var targetType = matchResult[3];
		var targetHost = matchResult[4];

		var sourceURI = this.getURI(sourceType, sourceHost);
		var targetURI = this.getURI(targetType, targetHost);
		if (!sourceURI || !targetURI) {
			mydump('could not get URI: ' + aRule + ' / ' + sourceURI + ' => ' + targetURI);
			return;
		}

		var sourceLogins = this.getLoginsFor(sourceURI);
		var oldLogins = this.getLoginsFor(targetURI);
		sourceLogins.forEach(function(aSourceLogin) {
			var oldLogin = oldLogins.filter(function(aOldLogin) {
				return aOldLogin.username == aLogin.username;
			})[0];

			var newLogin = Cc['@mozilla.org/login-manager/loginInfo;1'].createInstance(Ci.nsILoginInfo);
			newLogin.init(
			  targetURI, // 'smtp://smtp.example.com'
			  null,
			  targetURI, // 'smtp://smtp.example.com'
			  aSourceLogin.username,
			  aSourceLogin.password,
			  '',
			  ''
			);

			if (oldLogin) {
				LoginManager.modifyLogin(oldLogin, newLogin);
			}
			else {
				LoginManager.addLogin(newLogin);
			}
		});
	},

	getURI : function(aType, aHost)
	{
		var scheme;
		switch (aType.toLowerCase())
		{
			case 'pop3':
				scheme = 'mailbox';
				break;

			case 'imap':
				scheme = 'imap';
				break;

			case 'smtp':
				scheme = 'smtp';
				break;

			default:
				mydump('invalid type: ' + aType);
				return '';
		}
		return scheme + '://' + aHost;
	},

	getLoginsFor : function(aURI)
	{
		return LoginManager.findLogins({}, aURI, null, aURI);
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

