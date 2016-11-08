# tb-migrate-login-info

Migrates saved login information between servers (POP3, IMAP, and SMTP)

## Usage

Give migration rule for servers via preferences.
For example, if you are using an MCD configuratin file (autoconfig.cfg or something), then:

~~~
lockPref("extensions.migrate-login-info@clear-code.com.migration.0",
         "pop3:mail.example.com => pop3:mail2.example.com");
lockPref("extensions.migrate-login-info@clear-code.com.migration.1",
         "imap:mail.example.com => imap:mail2.example.com");
lockPref("extensions.migrate-login-info@clear-code.com.migration.2",
         "smtp:mail.example.com => smtp:mail2.example.com");
~~~

You can also migrate login information between different type servers, like:

~~~
lockPref("extensions.migrate-login-info@clear-code.com.migration.1",
         "pop3:mail3.example.com => smtp:mail3.example.com");
~~~

You can specify authorization method for migration target, like;

~~~
lockPref("extensions.migrate-login-info@clear-code.com.migration.1",
         "pop3:mail3.example.com => smtp:mail3.example.com (authMethod=passwordCleartext socketType=alwaysSTARTTLS)");
~~~

Possible values for `authMethod` and `socketType` are listed at [MailNewsTypes2.idl](https://dxr.mozilla.org/comm-central/source/mailnews/base/public/MailNewsTypes2.idl).

 * authMethod
   * `none` or `1`
   * `old` or `2`
   * `passwordCleartext` or `3`
   * `passwordEncrypted` or `4`
   * `GSSAPI` or `5`
   * `NTLM` or `6`
   * `External` or `7`
   * `anything` or `9`
   * `OAuth2` or `10`
 * socketType
   * `plain` or `0`
   * `trySTARTTLS` or `1`
   * `alwaysSTARTTLS` or `2`
   * `SSL` or `3`
