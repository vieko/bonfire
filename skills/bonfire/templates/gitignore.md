# .gitignore Templates

Choose based on `gitStrategy` in config.json:

## ignore-all (default)

Ignore everything in `.bonfire/`:

```
# .bonfire/.gitignore
*
!.gitignore
```

## hybrid

Commit config only:

```
# .bonfire/.gitignore
*
!.gitignore
!config.json
```

## commit-all

Commit everything:

```
# .bonfire/.gitignore
# No ignores - commit all session data
```
