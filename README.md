# Rentelio

**Don't get Mental, Just do Rental**

Full-stack rental marketplace with **exactly three roles**:

| Role | Who | Portal |
|------|-----|--------|
| **User** | Customer who rents products | `/user/login` → `/user/dashboard` |
| **Vendor** | Rental business owner | `/vendor/login` → `/vendor/dashboard` |
| **Super Admin** | Platform owner | `/admin/login` → `/admin/dashboard` |

User and Customer are the same role (not separate).

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router, TanStack Query
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (local)
- **ORM:** Prisma 5
- **Auth:** JWT per portal (`type`: `customer` \| `vendor` \| `staff` + `role`)
