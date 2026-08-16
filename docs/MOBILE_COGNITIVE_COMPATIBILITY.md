# Mobile Cognitive Compatibility

`brainSchemaVersion` / `minimumSupportedBrainSchemaVersion` exposed in:

- `GET /api/mobile/bootstrap`
- `GET /api/mobile/config`

`cognitiveCapabilities` manifest:

```json
{
  "brain": true,
  "graph": true,
  "twin": true,
  "evolutionVisible": false,
  "autopilot": false
}
```

See `lib/mobile/cognitive-capabilities.ts`.
