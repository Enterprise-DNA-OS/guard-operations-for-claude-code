# Example TrackTik exports

Three small comma-separated files shaped like reports exported from TrackTik: sites, employees and scheduled shifts. They exist so `npm test` can prove the import, and so you can see which headings the importer looks for before you run your own file.

TrackTik report layouts vary by account and by the report you choose. The importer accepts the common headings shown here and their usual alternatives (see `MAPS` in `scripts/lib/domain.mjs`). If your file uses other headings, write a small JSON map and pass it with `--map`:

```json
{ "code": "Post Code", "name": "Post Name" }
```

Every name in these files is invented.
