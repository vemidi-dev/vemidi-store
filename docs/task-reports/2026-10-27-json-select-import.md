# JSON Select Import

Supports `field_type: "select"` inside `personalization_fields` without changing the original JSON or database schema. Each choice field becomes a native `single` product option group; text/date/photo fields remain legacy personalization fields. Required choice means min=1, max=1. Optional choice means min=0, max=1.

Example:

```json
{
  "label": "Size",
  "field_key": "size",
  "field_type": "select",
  "required": true,
  "options": [
    { "label": "Small", "value": "small-25x16", "price_delta": 0 },
    { "label": "Large", "value": "large-30x19", "price_delta": 6 }
  ]
}
```

With base price 12 EUR, native pricing yields 12/18 EUR. Values retain their labels; hyphens in technical keys become underscores for the existing option schema. Key collisions after normalization are blocking errors. An optional field-level `price_delta` is added once to each option's delta; no surcharge is charged for an unselected optional group. `is_default: true` is supported on at most one option.

Validation rejects missing/empty options, more than 100 choices, invalid/duplicate keys, negative/non-numeric/sub-cent prices, ambiguous option `price` instead of `price_delta`, invalid boolean flags, and collisions with text field keys. Total choice/personalization field count is bounded to 20.

The supplied Santa tray JSON passed read-only validation against live category slugs. It preserves both sizes (0/6 EUR surcharge) and the required names field. No product/order was created and the user's file was not edited.

Tests cover normalization, forwarding to the atomic product-create payload, native price calculation, required/forged choices, and malformed inputs. The import preview displays choices and surcharges for verification before import.
