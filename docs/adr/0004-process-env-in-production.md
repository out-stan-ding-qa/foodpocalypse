# Production config comes from the process, not a dotenv file

Local (`APP_ENV=local`, the default) loads `server/.env`. Production and test do not: the host or the test harness injects variables. That keeps cloud secrets out of files on disk and stops a copied `.env` from silently becoming production config.
