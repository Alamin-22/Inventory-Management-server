# Advanced Inventory Management System (IMS) Backend

### High-Performance Enterprise Resource Planning & POS Engine

> 🚀 **Project Status: Standalone v1 & Transition to SaaS (v2)**
>
> This repository contains the **v1 standalone backend** for the Inventory Management & POS System. It showcases the core REST API architecture, POS transaction logic, and foundational database schemas for a single-business deployment.
>
> **What's Next?**
> I am currently developing **v2**—a complete, multi-tenant B2B SaaS platform where multiple retail businesses and warehouses can register and manage their operations independently on a single unified engine.
>
> **Note to Recruiters and Developers:**
> To protect the proprietary architecture of the SaaS engine, the advanced v2 features (such as multi-tenant database isolation, cross-store inventory syncing, WebSockets for live POS, and scalable B2B logistics) are maintained in a **separate, private repository**. This public v1 repo remains available as a transparent showcase of my backend coding standards, custom query building, and robust domain-driven design.

---

A robust, modular, and highly secure backend engine designed to power modern retail and warehouse operations. Built with **Node.js**, **TypeScript**, and **MongoDB**, this system provides a centralized backbone for Point of Sale (POS) transactions, financial auditing, and real-time inventory intelligence.

---

## 🚀 Core Features

- **Terminal POS Logic**: Atomic transaction processing with real-time stock validation and automated ledger entries.
- **Automated Email Notification Engine**: Asynchronous SMTP-based email alerts for Order Confirmations, Status Updates, and critical Low/Out-of-Stock inventory warnings.
- **Financial Auditing**: Comprehensive transaction tracking (Sales/Refunds) with a permanent, immutable audit trail.
- **Inventory Intelligence**: Priority-based restock queues and low-stock threshold monitoring via MongoDB Aggregation pipelines.
- **RBAC Security**: Granular Role-Based Access Control (Super Admin, Admin, Manager) with self-lockout protection.
- **Custom QueryBuilder**: Advanced filtering, searching, and pagination architecture for handling massive inventory datasets efficiently.

---

## 🛠️ Technical Stack

- **Runtime**: Node.js (v24.x recommended)
- **Language**: TypeScript (Strict Mode)
- **Framework**: Express.js
- **Database & ODM**: MongoDB & Mongoose
- **Validation**: Zod (Schema-based runtime validation)
- **Security**: JWT (Stateless Auth), Bcrypt (Password Hashing)
- **Media Processing**: Cloudinary Integration
- **Email Service**: Nodemailer (Template-based HTML emails)

---

## 📁 Architectural Pattern & Core Structure

The system follows a strict **Modular / Domain-Driven Architecture**, ensuring maximum scalability and separation of business logic.

```text
src/app/
├── classes/          # Core utilities (AppError, custom QueryBuilder)
├── Email_Templates/  # HTML email templates (Auth, Orders, Products/LowStock)
├── middlewares/      # Security, Validation, and global Error Handling
└── modules/          # Isolated Business Domains:
    ├── admin/        # Staff management and permissions
    ├── Analytics/    # Aggregation pipelines for dashboard KPIs
    ├── AuditLog/     # Immutable tracking for critical system operations
    ├── auth/         # JWT issuance, verification, and password resets
    ├── Category/     # Product taxonomy and hierarchy
    ├── customer/     # CRM and loyalty tracking
    ├── Order/        # Checkout logic and email dispatches
    ├── Payment/      # Transaction processing and ledger tracking
    ├── products/     # Inventory management, media parsing
    └── user/         # Identity and profile lifecycle
```

## ⚙️ Environment Configuration

To run this project locally, create a `.env` file inside the `env/` directory using the provided `.env.example` as a template.

Ensure you configure the `SMTP_*` variables to enable the automated Email Notification Engine for orders and stock alerts.

---

## 📦 Installation & Local Setup

### 1. Prerequisites

- Node.js (v20+ recommended)
- TypeScript (`npm install -g typescript`)
- A MongoDB Atlas Cluster or local instance

### 2. Setup Guide

```bash
# Clone the repository
git clone [https://github.com/Alamin-22/inventory-management-server](https://github.com/Alamin-22/inventory-management-server)
cd inventory-management-server

# Install dependencies
npm install

# Build the TypeScript compilation
npm run build

# Start the development server
npm run start:dev

```

**Base API Endpoint:** `http://localhost:5000/api/v1`

---

## 📝 Changelog & Versioning

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [v1.0.0] - Stable Release

- **Initial v1 Release**: Complete baseline for the standalone Inventory Management System.
- **Core Engine**: Node.js/Express backend with Mongoose ODM and TypeScript.
- **Terminal POS**: High-speed checkout interface with dynamic cart logic and real-time stock validation.
- **Financial Ledger**: Transaction auditing for sales and refunds with automated `orderId` linking.
- **Business Intelligence**: Analytical dashboard featuring MoM (Month-over-Month) growth metrics and priority-based restock queues.
- **Notification Engine**: Integrated SMTP templates for automated low-stock and order-status emails.
- **Security**: Role-based access control (RBAC) with self-lockout protection.

> For a detailed history of changes and planned features for the private v2 SaaS engine, please refer to internal development documentation.

---

**Developed by Md. Al Amin Mollik.** _Scalable. Secure. Operations-Centric._
