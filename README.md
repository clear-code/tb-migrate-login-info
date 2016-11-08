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


