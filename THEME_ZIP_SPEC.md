# Theme ZIP Spec (Platform Owner Import)

Zip structure:

```text
my-theme.zip
  theme.manifest.json
  assets/
    preview.png
    hero.jpg
    ...
```

`theme.manifest.json` example:

```json
{
  "name": "Fashion Pro X",
  "slug": "fashion-pro-x",
  "category": "Fashion / Apparel",
  "description": "Professional commerce theme",
  "previewUrl": "",
  "isPaid": true,
  "price": 2999,
  "allowedPlanCodesCsv": "growth,pro,enterprise",
  "isActive": true,
  "isFeatured": false,
  "featuredRank": 0,
  "typographyPack": "modern-sans",
  "layoutVariant": "default",
  "runtimePackageJson": "{\"cardStyle\":\"rounded\",\"pdpLayout\":\"split\"}",
  "templatesJson": "[\"homepage\",\"product_listing\",\"product_detail\",\"cart\",\"static_page\",\"checkout\"]",
  "sectionSchemasJson": "[{\"name\":\"HeroSection\",\"fields\":[{\"key\":\"title\",\"type\":\"text\"}]}]",
  "hookPointsJson": "[\"BeforePrice\",\"AfterPrice\",\"BeforeAddToCart\",\"AfterDescription\"]",
  "themeVersion": "1.0.0",
  "plpVariantsJson": "[{\"category\":\"default\",\"variant\":\"cards\"}]",
  "pdpVariantsJson": "[{\"category\":\"default\",\"variant\":\"split\"}]"
}
```

Notes:
- Import endpoint: `POST /api/platform/themes/import-zip` (platform owner only).
- If `previewUrl` is empty, platform uses `/theme-packages/{slug}/{themeVersion}/assets/preview.png`.
- Contract validation is enforced during import (mandatory templates/hooks/schema checks).
