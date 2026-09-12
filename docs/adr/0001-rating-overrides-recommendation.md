# Rating overrides Recommendation

A Product for a Diet profile has two traffic-light marks: a computed Recommendation and an optional User Rating. When a Rating is present, that is what the User sees; otherwise the Recommendation; otherwise no mark. Today's UI cycles a single `recommendation` column — that field is a stub for Rating, not the model.

## Considered Options

- Rating only (User-owned; computation is a helper later)
- Recommendation only (system-owned; today's click is fake data)
- Both, with Rating as override — **chosen**
