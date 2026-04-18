# Hackathon 2026 Project

## Descripción

Aplicación NestJS para gestión de pacientes, reportes, visión y análisis de inteligencia artificial. Este proyecto utiliza MongoDB como base de datos y proporciona una API REST completa para la administración de información médica y análisis con IA.

## Stack Tecnológico

- **Framework**: NestJS 11.0.1
- **Lenguaje**: TypeScript
- **Base de Datos**: MongoDB con Mongoose ODM
- **Node.js**: ES Modules

## Estructura del Proyecto

```
src/
├── main.ts                      # Punto de entrada de la aplicación
├── app.module.ts                # Módulo raíz
├── ai/                          # Módulo de IA
│   ├── ai.controller.ts
│   ├── ai.service.ts
│   ├── ai.module.ts
│   ├── dto/
│   │   ├── create-ai.dto.ts
│   │   └── update-ai.dto.ts
│   └── entities/
│       └── ai.entity.ts
├── patients/                    # Módulo de Pacientes
│   ├── patients.controller.ts
│   ├── patients.service.ts
│   ├── patients.module.ts
│   ├── dto/
│   │   ├── create-patient.dto.ts
│   │   └── update-patient.dto.ts
│   ├── entities/
│   │   └── patient.entity.ts
│   └── schemas/
│       └── patients.schema.ts
├── reports/                     # Módulo de Reportes
│   ├── reports.controller.ts
│   ├── reports.service.ts
│   ├── reports.module.ts
│   ├── dto/
│   │   ├── create-report.dto.ts
│   │   └── update-report.dto.ts
│   └── entities/
│       └── report.entity.ts
├── vision/                      # Módulo de Visión
│   ├── vision.controller.ts
│   ├── vision.service.ts
│   ├── vision.module.ts
│   ├── dto/
│   │   ├── create-vision.dto.ts
│   │   └── update-vision.dto.ts
│   └── entities/
│       └── vision.entity.ts
├── database/                    # Configuración de Base de Datos
│   └── database.module.ts
├── common/                      # Utilidades compartidas
└── config/                      # Configuración general
```

## Endpoints de la API

### 🏥 Pacientes (`/patients`)

| Método | Endpoint               | Descripción                       |
| ------ | ---------------------- | --------------------------------- |
| `POST` | `/patients`            | Crear nuevo paciente              |
| `GET`  | `/patients`            | Obtener todos los pacientes       |
| `GET`  | `/patients/priority`   | Obtener pacientes por prioridad   |
| `GET`  | `/patients/stats`      | Obtener estadísticas de pacientes |
| `POST` | `/patients/fix-triage` | Corregir triage de pacientes      |

### 📋 Reportes (`/reports`)

| Método   | Endpoint       | Descripción                |
| -------- | -------------- | -------------------------- |
| `POST`   | `/reports`     | Crear nuevo reporte        |
| `GET`    | `/reports`     | Obtener todos los reportes |
| `GET`    | `/reports/:id` | Obtener reporte por ID     |
| `PATCH`  | `/reports/:id` | Actualizar reporte         |
| `DELETE` | `/reports/:id` | Eliminar reporte           |

### 👁️ Visión (`/vision`)

| Método   | Endpoint      | Descripción                          |
| -------- | ------------- | ------------------------------------ |
| `POST`   | `/vision`     | Crear nuevo análisis de visión       |
| `GET`    | `/vision`     | Obtener todos los análisis de visión |
| `GET`    | `/vision/:id` | Obtener análisis de visión por ID    |
| `PATCH`  | `/vision/:id` | Actualizar análisis de visión        |
| `DELETE` | `/vision/:id` | Eliminar análisis de visión          |

### 🤖 IA (`/ai`)

| Método   | Endpoint  | Descripción                      |
| -------- | --------- | -------------------------------- |
| `POST`   | `/ai`     | Crear nuevo análisis de IA       |
| `GET`    | `/ai`     | Obtener todos los análisis de IA |
| `GET`    | `/ai/:id` | Obtener análisis de IA por ID    |
| `PATCH`  | `/ai/:id` | Actualizar análisis de IA        |
| `DELETE` | `/ai/:id` | Eliminar análisis de IA          |

## Instalación

```bash
# Instalar dependencias
npm install
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto con las variables necesarias:

```env
DATABASE_URL=mongodb://localhost:27017/hackathon-2026
NODE_ENV=development
PORT=3000
```

## Compilación y Ejecución

```bash
# Modo desarrollo (con watch)
npm run start:dev

# Modo desarrollo (sin watch)
npm run start

# Modo producción
npm run start:prod

# Compilar para producción
npm build
```

## Testing

```bash
# Ejecutar tests unitarios
npm run test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con cobertura
npm run test:cov

# Ejecutar tests e2e
npm run test:e2e
```

## Otros Comandos

```bash
# Formatear código
npm run format

# Linting y corrección automática
npm run lint
```

## Dependencias Principales

- `@nestjs/common` - Módulos y decoradores comunes de NestJS
- `@nestjs/core` - Core de NestJS
- `@nestjs/config` - Gestión de configuración
- `@nestjs/mongoose` - Integración con MongoDB/Mongoose
- `@nestjs/platform-express` - Soporte para Express
- `mongoose` - ODM para MongoDB
- `mongodb` - Driver oficial de MongoDB
- `rxjs` - Reactive extensions

## Requisitos Previos

- Node.js 18.0.0 o superior
- MongoDB 4.0 o superior
- npm 9.0.0 o superior

## Notas de Desarrollo

- La aplicación utiliza TypeScript para type safety
- Se utiliza MongoDB como base de datos NoSQL
- Cada módulo tiene su propia estructura con controlador, servicio, DTOs y entidades
- Los DTOs se utilizan para validar las requests
- Se siguen las mejores prácticas de NestJS con arquitectura modular

## License

UNLICENSED
