# VentiPass

> Solución Full-Stack para gestión de eventos, venta de entradas y validación de accesos mediante QR.

## 🚀 Arquitectura
VentiPass es un monorepo que contiene tanto el backend (API REST) como el frontend (Cliente Web). 

### Stack Tecnológico
- **Frontend**: Next.js 16, React 19, TailwindCSS v4, Framer Motion.
- **Backend**: NestJS 11, Prisma ORM, BullMQ (Colas), JWT/Passport (Auth).
- **Base de Datos & Caché**: PostgreSQL, Redis.
- **Integraciones**: MercadoPago (Pagos), Resend (Emails).

## 📁 Estructura del Proyecto

- `/frontend`: Aplicación web enfocada en los asistentes, RPPs y validación de código QR (escáner).
- `/backend`: Lógica de negocio, integración con pasarelas de pago, envío de correos y endpoints de la API.
- `docker-compose.yml`: Configuración de servicios locales para infraestructura (Redis, DB, etc.).

## ⚙️ Requisitos Previos

- Node.js (v20 o superior)
- Docker y Docker Compose (para Redis/DB)
- Gestor de paquetes npm

## 🛠️ Instalación y Configuración (Desarrollo)

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/paschedev/VentiPass.git
   cd VentiPass
   ```

2. **Levantar servicios de infraestructura**
   ```bash
   docker-compose up -d
   ```

3. **Configurar el Backend**
   - Navega al directorio backend: `cd backend`
   - Instala las dependencias: `npm install`
   - Crea tu archivo `.env` configurando las variables de base de datos, Redis, MercadoPago y JWT.
   - Ejecuta las migraciones: `npx prisma migrate dev`
   - Inicia el servidor en desarrollo: `npm run start:dev`

4. **Configurar el Frontend**
   - En una nueva terminal, ve al directorio frontend: `cd frontend`
   - Instala las dependencias: `npm install`
   - Crea tu archivo `.env` con las variables de entorno necesarias para Next.js.
   - Inicia el entorno: `npm run dev`

El frontend estará disponible en `http://localhost:3000` y la API en su respectivo puerto local.
