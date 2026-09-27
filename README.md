# my-business-fe

React + TypeScript + Vite frontend for the My Business B2B platform. Data lives in the backend (**my-business-be**, FastAPI + Firestore); this app handles login with Firebase and talks to the API.

## Run it

```bash
npm install
copy .env.example .env.local   # fill in the Firebase web app keys; VITE_API_URL points to the backend
npm run dev                     # http://localhost:5173 — start the backend too (see my-business-be/README.md)
```

`npm run build` type-checks and builds; `npm run lint` runs ESLint.

## Folder structure

```
src/
├── api/                  # Talking to the backend
│   ├── client.ts         #   get/post/put/del: adds the login token, turns errors into readable messages
│   ├── types.ts          #   The data shapes (match the backend models)
│   ├── resources.ts      #   Simple lists (contacts, brands, ...) and one-per-business settings (legal, delivery, ...)
│   └── businesses.ts, catalog.ts, orders.ts, network.ts, directory.ts
├── constants/options.ts  # Every dropdown/choice list + labelOf("BANK_TRANSFER") -> "Bank transfer"
├── forms/
│   ├── fields.ts         #   FieldDef / Section types and the value converters
│   └── definitions.ts    #   Every form in the app (edit a line to add/remove a field)
├── hooks/                # useLoad (fetch data), useTab (?tab= in the URL), useStockData, useActingBusiness
├── components/
│   ├── FieldForm.tsx     #   Renders any form from definitions.ts, shows API errors
│   ├── DetailsView.tsx   #   Read-only view of the same sections
│   ├── ResourceSection.tsx  # Table + Add/Edit/Delete for any list
│   ├── SettingsForm.tsx  #   View + Edit for one-per-business settings
│   ├── ui.tsx            #   Badge, Tabs, ConfirmButton, Loading, ErrorBox, Stars, ...
│   └── layouts, icons, charts, HoursEditor, ListEditors, ReviewCard
├── pages/
│   ├── MyBusinessesPage, SettingsPage (account), Login
│   ├── directory/        #   Search businesses, public profile, ordering (OrderPanel)
│   ├── admin/            #   Platform admin: verifications, categories, businesses
│   └── business/         #   One business: Dashboard, Profile, Products, Inventory, Orders,
│                         #   Messages, Network, Delivery & payments, Team
└── businessContext.ts    # useBusiness(): the current business, your role, can('permission')
```

## Styling (Tailwind CSS)

All styling is Tailwind classes in the components — there are no hand-written CSS rules.

- `src/tailwind.css` loads Tailwind and defines the design tokens (colors, font) plus their dark-mode values.
  Tokens become classes: `--color-heading` → `text-heading`, `--color-line` → `border-line`, `--color-surface` → `bg-surface`.
- `src/styles.ts` holds the class lists many components share (`ui.btnPrimary`, `ui.input`, `ui.card`, `ui.formCard`, table cells, …). Change a look there and it changes everywhere.
- Use `cx()` to add or override classes: `cx(ui.card, 'p-0')`. It uses `tailwind-merge`, so the later class wins when two set the same thing.
- Tables: use `<Table>`, `<Th>`, `<Td num strong actions>` from `components/ui.tsx`.
- Install the "Tailwind CSS IntelliSense" VS Code extension for autocomplete of these classes.

## How the pieces fit

- **Business pages** get the current business from `useBusiness()`. Use `can('products.manage')` to show or hide edit buttons; the backend checks the same permission anyway.
- **Most lists** are one `<ResourceSection>` with a form from `forms/definitions.ts` and an API from `api/resources.ts`.
- **Directory → order:** on another business's page you act as one of your businesses (the "Acting as" picker). Enter quantities, press **Check prices** (the backend calculates the quote), then **Place order**.

## Common changes

- **Add a field to a form:** add a line in `src/forms/definitions.ts`, the property in `src/api/types.ts`, and the field in the backend schema.
- **Add a choice to a dropdown:** edit `src/constants/options.ts` (and the matching enum in the backend's `app/schemas/enums.py`).
- **Add a new list page:** add a `listResource<T>('path')` in `src/api/resources.ts`, define its form in `definitions.ts`, and render a `<ResourceSection>`.
