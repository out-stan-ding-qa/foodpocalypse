# Foodpocalypse

A personal diet and grocery assistant for one person. Sharing a list, pantry, or household is out of scope. Meals, recipes, and meal planning are out of scope.

This file is the domain glossary. Implementation belongs in design docs and ADRs, not here.

## Language

### People

**User**:
The single person who uses Foodpocalypse. The same User is reached from any device by signing in.
_Avoid_: Household, Family, Device, Session, Me (as a name for the User)

Account is allowed on the sign-in and self-view surface. `GET /api/auth/me` is the current-principal route, not a domain type.

**Email**:
The address this User signs in with. Every User has one. It is a lookup key, not a stored profile field, and it does not change.
_Avoid_: Username, account name

**Password**:
The required secret this User uses to sign in on any device. Sign-in is Email and Password only.
_Avoid_: Passcode, PIN, Passkey

### Catalog

**Product**:
A packaged item this User has saved, typically with a brand. An optional UPC, when present, is unique for this User.
_Avoid_: Food

**UPC**:
The GS1 barcode identifier of a packaged Product. It is a complete GTIN-8, UPC-A (GTIN-12), GTIN-13, or GTIN-14, including a valid check digit. Store-internal, coupon, and all-zero codes are not UPCs here.
_Avoid_: barcode (as the type), GTIN (in User-facing copy)

**Listing**:
A URL for this Product (product page or search), stored on the Product.
_Avoid_: Amazon URL (as the type), Store (for this link)

**Store**:
A named place this User shops. Its location is a street address or a retailer URL, not a Listing.
_Avoid_: treating a Listing as a Store

**Availability**:
The fact that a Product is sold at a Store.

### Diet

**Diet profile**:
A named set of Tracked nutrients this User cares about. It is either active (in play on Products) or inactive (kept, but hidden from Product scoring).
_Avoid_: Condition, Diet, Dietary profile, Dietary Profiles

**Tracked nutrient**:
A nutrient a Diet profile cares about, chosen from a closed list.
_Avoid_: Nutrient (when you mean this), Condition nutrient

**Recommendation**:
The system's judgment of a Product for one Diet profile: green (fits), yellow (caution), or red (avoid), derived from that Product's nutrition and the profile's Tracked nutrients. The derivation rule is unspecified; until it exists there is often no Recommendation.
_Avoid_: Rating (that is the User's mark)

**Rating**:
This User's judgment of a Product for one Diet profile: green (fits), yellow (caution), or red (avoid). When present, it overrides the Recommendation. When both are absent, there is no mark.
_Avoid_: Recommendation (that is the system's mark)

### Shopping

**Shopping list**:
This User's list of things to buy. The User has one current list; archived lists are history.
_Avoid_: Cart, basket

**Shopping item**:
A line on a Shopping list: a name, optionally a Product, and a checked or unchecked state.
_Avoid_: Line item
