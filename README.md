# RentCar Frontend

Separate React + Vite + TailwindCSS frontend for the RentCar backend.

## Run

```bash
npm install
npm run dev
```

Create `.env` when the backend URL is different:

```text
VITE_API_URL=http://localhost:8080/api/v1
```

## Build

```bash
npm run build
```

## Features

- Public car catalog with filters and pagination
- JWT login/register flow with protected routes
- Customer dashboard, rental details, cancellation and printable receipt
- Admin cars, rentals, payments and users management
- Admin filters and pagination for rentals/users
