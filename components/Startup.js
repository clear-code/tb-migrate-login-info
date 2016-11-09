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

	get servers : function()
	{
		if (this._servers)
			return this._servers;

		this._servers = {};

		const SMTPManager = Cc['@mozilla.org/messengercompose/smtp;1'].getService(Ci.nsISmtpService);
		this._servers.smtp = this.toArray(SMTPManager.servers, Ci.nsISmtpServer);

		this._servers.pop3 = [];
		this._servers.imap = [];

		const accounts = this.toArray(accountManager.accounts, Ci.nsIMsgAccount);
		accounts.forEach(function(aAccount) {
			if (!aAccount.defaultIdentity) // ignore local folder account
				return;
			let incomingServer = aAccount.incomingServer.QueryInterface(Ci.nsIMsgIncomingServer);
			switch (incomingServer.type) {
				case 'pop3':
					this._servers.pop3.push(incomingServer.QueryInterface(Ci.nsIPop3IncomingServer));
					break;

				case 'imap':
					this._servers.imap.push(incomingServer.QueryInterface(Ci.nsIImapIncomingServer));
					break;
			}
		}, this);

		return this._servers;
	},

	migrateLogins : function()
	{
		mydump('migrateLogins');
		var shouldSkipProcessedRules = prefs.getPref('extensions.' + ID + '.skipProcessedRules');
		prefs.getChildren('extensions.' + ID + '.migration').forEach(function(aKey) {
			var rule = prefs.getPref(aKey);
			mydump('rule: ' + aKey + ' = ' + rule);
			var lastDate = prefs.getPref(aKey + '.lastDate');
			if (lastDate && shouldSkipProcessedRules) {
				lastDate = new Date(lastDate);
				mydump('skip already processed rule (' + lastDate + ')');
				return;
			}

			if (typeof rule === 'string') {
				this.doMigration(rule);
				mydump('successfully migrated.');
				prefs.setPref(aKey + '.lastDate', (new Date()).toISOString());
			}
			else {
				mydump('invalid type rule (' + (typeof rule) + ')');
			}
		}, this);
	},

	doMigration : function(aRule)
	{
		var parsed = this.parseRule(aRule);
		if (!parsed) {
			mydump('failed to migrate.');
			return;
		}

		if (!parsed.source.uri || !parsed.target.uri) {
			mydump('could not get URI: ' + aRule + ' / ' + parsed.source.uri + ' => ' + parsed.target.uri);
			return;
		}

		var sourceLogins = this.getLoginsFor(parsed.source.uri);
		mydump('sourceLogins: ' + sourceLogins.length);
		var oldLogins = this.getLoginsFor(parsed.target.uri);
		mydump('oldLogins: ' + oldLogins.length);
		sourceLogins.forEach(function(aSourceLogin) {
			mydump('migrating: user = ' + aSourceLogin.username);
			var oldLogin = oldLogins.filter(function(aOldLogin) {
				return aOldLogin.username == aSourceLogin.username;
			})[0];

			var newLogin = Cc['@mozilla.org/login-manager/loginInfo;1'].createInstance(Ci.nsILoginInfo);
			newLogin.init(
			  parsed.target.uri, // 'smtp://smtp.example.com'
			  null,
			  parsed.target.uri, // 'smtp://smtp.example.com'
			  aSourceLogin.username,
			  aSourceLogin.password,
			  '',
			  ''
			);

			if (oldLogin) {
				mydump('updating...');
				LoginManager.modifyLogin(oldLogin, newLogin);
			}
			else {
				mydump('adding...');
				LoginManager.addLogin(newLogin);
			}
			mydump('done.');

			var sourceServer, targetServer;
			var sourceServers = this.servers[sourceType];
			for (let i = 0, maxi = sourceServers.length; i < maxi; i++) {
				let server = sourceServers[i];
				if (server.realHostName == sourceHostName &&
					server.port == sorucePort) {
					sourceServer = server;
					break;
				}
			}
			var targetServers = this.servers[targetType];
			for (let i = 0, maxi = targetServers.length; i < maxi; i++) {
				let server = targetServers[i];
				if (server.realHostName == targetHostName &&
					server.port == targetPort) {
					targetServer = server;
					break;
				}
			}

			if (!targetServer) {
				mydump('no server to be updated.');
				return;
			}

			if (authMethod) {
				// set auth method
			}
			if (socketType) {
				// set socket type
			}
			if (!authMethod && !socketType && sourceServer) {
				// inherit auth method and socket type
			}
		}, this);
	},

	parseRule : function(aRule)
	{
		var matchResult = aRule.match(/\s*([^:\s]+):([^\s]+)\s*=>\s([^:\s]+):(.+)$/);
		if (!matchResult) {
			mydump('invalid rule: '+aRule);
			return;
		}

		var sourceType = matchResult[1];
		var sourceHost = matchResult[2];
		var [sourceHostName, sourcePort] = sourceHost.split(':');

		var targetType = matchResult[3];
		var targetHost = matchResult[4];

		matchResult = targetHost.match(/([^(]+)\s*(?:\(([^)]+)\)\s*)?/);
		targetHost = matchResult[1];
		var targetParams = matchResult[2];
		var [targetHostName,targetPort] = targetHost.split(':');

		var authMethod, socketType;
		matchResult = targetParams.match(/authMethod\s*=\s*([^\s)]+)/i);
		if (matchResult)
			authMethod = matchResult[1].toLowerCase();
		matchResult = targetParams.match(/socketType\s*=\s*([^\s)]+)/i);
		if (matchResult)
			socketType = matchResult[1].toLowerCase();

		return {
			source: {
				type: sourceType,
				host: sourceHost,
				hostName: sourceHostName,
				port: sourcePort,
				uri: this.getURI(sourceType, sourceHost)
			},
			target: {
				type: targetType,
				host: targetHost,
				hostName: targetHostName,
				port: targetPort,
				uri: this.getURI(targetType, targetHost),
				authMethod: authMethod,
				socketType: socketType
			}
		};
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

	toArray : function(aEnumerator, aInterface) {
		aInterface = aInterface || Ci.nsISupports;
		let array = [];

		if (aEnumerator instanceof Ci.nsISupportsArray) {
			let count = aEnumerator.Count();
			for (let i = 0; i < count; ++i) {
				array.push(aEnumerator.QueryElementAt(i, aInterface));
			}
		}
		else if (aEnumerator instanceof Ci.nsIArray) {
			let count = aEnumerator.length;
			for (let i = 0; i < count; ++i) {
				array.push(aEnumerator.queryElementAt(i, aInterface));
			}
		}
		else if (aEnumerator instanceof Ci.nsISimpleEnumerator) {
			while (aEnumerator.hasMoreElements()) {
				array.push(aEnumerator.getNext().QueryInterface(aInterface));
			}
		}

		return array;
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

