# APP-SHELL-0 Deep Links

## Scheme

`lot://`

## Supported routes (Alpha)

- `lot://product/{id}`
- `lot://order/{id}`
- `lot://seller/{id}` → catalog (Alpha)
- `lot://wallet`
- `lot://orders`
- `lot://brain/product/{id}`

## Deferred deep link test

1. Logout
2. Open `lot://product/{id}` (adb or manual)
3. Login
4. Land on product screen

## Implementation files

- `src/deep-links/parse-lot-link.ts`
- `src/deep-links/route-deep-link.ts`
- `src/deep-links/use-deep-link-handler.ts`
