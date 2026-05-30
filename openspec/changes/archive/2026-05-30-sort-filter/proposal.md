## Why

The decision history list needs to become useful once a user has more than a handful of
saved decisions. Users should be able to narrow the list by the structured analysis they
care about and order it by recency or by a deterministic complexity signal without waiting
for all analyses to finish.

## What Changes

- Add deterministic derived complexity for each decision from the newest ready analysis:
  bias count plus premortem risk count plus missed alternative count.
- Add filtering on the decision history list by ready analysis category.
- Add filtering on the decision history list by presence of a selected cognitive bias in
  the newest ready analysis.
- Add sorting on the decision history list by creation time and by derived complexity.
- Keep decisions without a ready analysis visible and order them last when sorting by
  complexity.
- Wire localized filter and sort controls into the authenticated decision history list.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `decision-history`: Add list-level filtering, sorting, and derived-complexity behavior
  based on the newest ready analysis while preserving user scoping and not-ready states.

## Impact

- Decision history read-model/query code will need to expose newest ready analysis data,
  derived complexity, and stable ordering metadata.
- The authenticated list UI will gain filter and sort controls backed by canonical
  category and cognitive-bias taxonomies.
- Tests must cover deterministic complexity derivation, user-scoped filtering/sorting, and
  list UI control behavior with ready and no-ready decisions.
