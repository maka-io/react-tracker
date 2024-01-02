# CHANGELOG

## v1.0.0, 2024-01-1
* Fork and pluck out only the useTracker.  The other hooks add a lot of overhead (mongo) when some apps
  don't need it.

* Renames deprecated lifecycle to support React 16.9
* Publishes branch v1.
  - This branch is not synced with devel as it requires at least version 16.8 of react.
