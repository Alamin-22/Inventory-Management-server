# Advanced Inventory Management System (IMS) Backend

### High-Performance Enterprise Resource Planning & POS Engine

A robust, modular, and highly secure backend engine designed to power modern retail and warehouse operations. Built with **Node.js**, **TypeScript**, and **MongoDB**, this system provides a centralized backbone for Point of Sale (POS) transactions, financial auditing, and real-time inventory intelligence.

---

## 🚀 Core Features

- **Terminal POS Logic**: Atomic transaction processing with real-time stock validation and automated ledger entries.
- **Financial Auditing**: Comprehensive transaction tracking (Sales/Refunds) with a permanent audit trail.
- **Inventory Intelligence**: Priority-based restock queues and low-stock threshold monitoring via MongoDB Aggregation pipelines.
- **RBAC Security**: Granular Role-Based Access Control (Super Admin, Admin, Manager) with self-lockout protection.
- **System Integrity**: Integrated Audit Logs to track administrative interactions and critical system state changes.
- **Automated Logistics**: Support for multi-tenant configurations, automated SMTP notifications, and Cloudinary-backed media management.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v24.x recommended)
- **Language**: TypeScript (Strict Mode)
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ODM)
- **Validation**: Zod (Schema-based validation)
- **Security**: JWT (Stateless Auth), Bcrypt (Password Hashing)
- **Task Scheduling**: Node-Cron (For automated stock/audit maintenance)

---

## 🏗️ Architectural Pattern

The system follows a **Modular Architecture** combined with a **QueryBuilder** pattern for advanced filtering, searching, and pagination.

- **Routes**: Entry points for the API.
- **Controllers**: Handling request/response cycles and `catchAsync` wrappers.
- **Services**: Core business logic and complex DB transactions (Session-based).
- **Models**: Mongoose schemas with built-in validation.

---

## ⚙️ Environment Configuration

To run this project locally, create a `.env` file in the root directory and populate it with the following configuration:

### Basic Config

| Variable    | Description                                      |
| :---------- | :----------------------------------------------- |
| `PORT`      | Server port (Default: 5000)                      |
| `NODE_ENV`  | Environment mode (`development` or `production`) |
| `MONGO_URI` | MongoDB Connection String                        |

### Business & Branding

| Variable        | Description                               |
| :-------------- | :---------------------------------------- |
| `COMPANY_NAME`  | Business name used for receipts/dashboard |
| `LOGO_URL`      | URL for the business logo                 |
| `SUPPORT_EMAIL` | Default contact for system alerts         |

### Security & Auth

| Variable               | Description                               |
| :--------------------- | :---------------------------------------- |
| `ACCESS_TOKEN_SECRET`  | Secret key for JWT Access Tokens          |
| `REFRESH_TOKEN_SECRET` | Secret key for JWT Refresh Tokens         |
| `BCRYPT_SALT_ROUNDS`   | Hashing complexity (Default: 10)          |
| `SUPER_ADMIN_EMAIL`    | Initial seed email for the Master account |
| `SUPER_ADMIN_PASSWORD` | Initial seed password                     |

### Third-Party Services

| Variable                | Description              |
| :---------------------- | :----------------------- |
| `CLOUDINARY_CLOUD_NAME` | Media storage cloud name |
| `SMTP_USER`             | Mail server username     |
| `SMTP_PASS`             | Mail server password     |

---

## 📦 Installation & Setup

1.  **Clone the repository**:

    ```bash
    git clone <repository-url>
    cd inventory-management-server
    ```

2.  **Install Dependencies**:

    ```bash
    npm install
    ```

3.  **Build the Project**:

    ```bash
    npm run build
    ```

4.  **Start Development Server**:

    ```bash
    npm run start:dev
    ```

5.  **Production Launch**:
    ```bash
    npm run start
    ```

---

## 🧪 API Versioning

This project follows strict API versioning. The current version is `v1`.
**Base Endpoint**: `http://localhost:5000/api/v1`

---

## 📝 Changelog & Versioning

The project is currently in **Beta Testing**.
**Current Version**: `1.0.0-beta.1`

For a detailed history of changes and planned features, please refer to the `CHANGELOG.md` file.

---

Developed by Md. Al Amin Mollik. All rights reserved.
_Developed with focus on scalability, security, and operational transparency._
