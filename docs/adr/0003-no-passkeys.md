# Passkeys are out of the domain

Foodpocalypse does not use Passkeys or WebAuthn. Email and Password are the only sign-in factors. Keeping Passkeys as an untested extra would fight the identity model (Password is how a new device finds the User) and the test plan (a real Passkey integration test needs a software authenticator).
