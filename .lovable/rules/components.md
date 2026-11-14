# Components

Component catalog for **Codebase Migration Studio**. Import all components from `@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd`.

### Button

```ts
import { Button } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

**Props:**

| Prop | Type | Default |
|---|---|---|
| `variant` | default · destructive · outline · secondary · ghost · link | `default` |
| `size` | default · sm · lg · icon | `default` |
| `asChild` | boolean | `false` |

### CartLink

```ts
import { CartLink } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

### Constants

```ts
import { Constants } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

### DarajaProductionCheck

```ts
import { DarajaProductionCheck } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

### DarajaSandboxCheck

```ts
import { DarajaSandboxCheck } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

### DigitalIdCard

```ts
import { DigitalIdCard } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

**Props:**

| Prop | Type | Default |
|---|---|---|
| `fullName` | string | `—` |
| `membershipCode` | string | `—` |
| `nationalId` | string | `—` |
| `county` | string | `—` |
| `photoUrl` | string | `—` |
| `memberSince` | string | `—` |
| `presidentName` | string | `David Muigai Miringu` |
| `presidentSignatureUrl` | string | `—` |
| `motto` | string | `—` |
| `objectives` | any | `—` |
| `className` | string | `—` |

### OrderReceipt

```ts
import { OrderReceipt } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

### PortalShell

```ts
import { PortalShell } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

### ShopCartProvider

```ts
import { ShopCartProvider } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

### ShopDeliveryQuotes

```ts
import { ShopDeliveryQuotes } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

National administrators confirm packed weight and apply the CCAK standard parcel fee, or save a verified courier quote for other parcels. Handles both guest and member orders using audited database permissions.

**Examples:**

_Administrator delivery workspace_
```tsx
<ShopDeliveryQuotes aria-label="Delivery approvals" />
```

**Avoid:**

- Do not treat shopper-entered or estimated product weights as verified packed weight.
- Do not expose delivery approval actions to customers or use the standard fee for parcels weighing 5 kg or more.

### ShopFulfilment

```ts
import { ShopFulfilment } from "@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd"
```

