# Hackathon 2026 Project - Plataforma de IA Medica Clinica

**Backend para un proyecto de hackathon orientado a salud, con un API principal en NestJS (TypeScript) potenciada por IA generativa (Google Gemini) y sintesis de voz (ElevenLabs). Incluye un microservicio de vision artificial en Python (FastAPI + YOLO) para analisis de imagenes medicas.**

---

## El Poder de la IA en Este Proyecto

Este proyecto **coloca la IA en el centro** de la solucion clinica. No es un backend tradicional con IA anadida; es un **pipeline integrado de inteligencia artificial** que transforma dictados medicos crudos en analisis estructurados, reportes clinicos profundos y comunicaciones empáticas con pacientes.

### Por que la IA es critica aqui?

1. **Automatizacion clinica**: Convierte dictados en analisis SOAP estructurados en segundos
2. **Estandarizacion**: Normaliza especialidades y genera triages consistentes
3. **Comunicacion empatica**: Sintetiza texto medico en voz natural para pacientes
4. **Escalabilidad**: Procesa cientos de casos simultaneamente sin perder calidad
5. **Soporte a decisiones**: Proporciona recomendaciones basadas en triage y contexto clinico

---

## Arquitectura de IA - Flujo Principal

```
┌─────────────────────────────────────────────────────────────────────┐
│                  ENTRADA: Dictado Medico Raw                        │
│         (Voz transcrita o texto directo del doctor)                 │
└──────────────────────────┬──────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  GEMINI CLINICAL ANALYSIS           │
        │  (Google Generative AI)             │
        └──────────────┬──────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
    ┌──────────────┐           ┌──────────────────┐
    │ SOAP Analysis│           │ Triage & Context │
    │ • Subjetivo  │           │ • Nivel 1-5      │
    │ • Objetivo   │           │ • Justificacion  │
    │ • Analisis   │           │ • Especialidad   │
    │ • Plan       │           │                  │
    └──────────────┘           └──────────────────┘
         │                            │
         └──────────────┬─────────────┘
                        ▼
         ┌──────────────────────────────────┐
         │ MongoDB: Persistencia del Analisis│
         │ (Clinical Report Collection)     │
         └──────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
    ┌─────────────┐          ┌─────────────────────┐
    │ Reporte     │          │ ElevenLabs TTS      │
    │ Estructurado│          │ (Text-to-Speech)    │
    │ para BD     │          │                     │
    └─────────────┘          └────────┬────────────┘
                                      ▼
                          ┌─────────────────────────┐
                          │ Audio MP3 Base64        │
                          │ (Version paciente)      │
                          └─────────────────────────┘
```

---

## Servicios de IA - Descripcion Tecnica Profunda

### GeminiService - Analisis Clinico Estructurado

**Ubicacion**: `src/ai/services/gemini.service.ts`

#### Que hace?

Transforma dictados medicos crudos en analisis SOAP estructurados usando Google Generative AI (Gemini 2.5 Flash).

#### Caracteristicas principales:

- **System Instruction personalizada**: Configurada especificamente para Hospital Moscati
- **Validacion de especialidades**: Mapeo automatico de especialidades a categorias predefinidas
- **JSON estructurado**: Respuesta garantizada en formato JSON valido
- **Fallback inteligente**: Si Gemini falla, genera analisis por defecto
- **Triage automatico**: Clasifica urgencia de 1 (no urgente) a 5 (emergencia)

#### Estructura de respuesta (ClinicalAnalysis):

```json
{
  "resumen": "Resumen ejecutivo del caso clinico",
  "soap": {
    "subjetivo": "Lo que el paciente reporta (sintomas, antecedentes)",
    "objetivo": "Hallazgos fisicos, pruebas, signos vitales",
    "analisis": "Interpretacion clinica del medico",
    "plan": "Plan de tratamiento y seguimiento"
  },
  "diagnostico_presuntivo": "Diagnostico inicial propuesto",
  "nivel_triage": 3,
  "nivel_triage_justificacion": "Razon del nivel de triage asignado",
  "especialidad": "Cardiologia|Neurologia|Pediatria|Trauma|Cirugia|General|Otro",
  "version_paciente": "Explicacion amable y comprensible para el paciente (2-3 oraciones)",
  "hallazgos_criticos": ["Hallazgo critico 1", "Hallazgo critico 2"]
}
```

#### Prompt System (hardcoded en GeminiService):

```
Eres un Scribe Medico Especializado para el Hospital Moscati de Alta Especialidad.

Tu tarea es procesar dictados medicos crudos de doctores y transformarlos en un analisis clinico estructurado.

ESPECIALIDADES VALIDAS (IMPORTANTE - SOLO ESTAS):
- Trauma
- Pediatria
- Cirugia
- Cardiologia
- Neurologia
- General
- Otro

RESTRICCIONES CRITICAS:
1. Debes responder EXCLUSIVAMENTE en JSON valido. Sin texto extra.
2. El JSON debe tener exactamente estas claves: resumen, soap, diagnostico_presuntivo, nivel_triage, nivel_triage_justificacion, especialidad, version_paciente.
3. No incluyas explicaciones fuera del JSON.
4. El nivel_triage debe ser un numero de 1-5 (1=No urgente, 5=Emergencia).
5. version_paciente debe ser un texto amable y comprensible para el paciente, en 2-3 oraciones.
6. La especialidad DEBE ser EXACTAMENTE una de las listadas arriba. Si no coincide, usa "Otro".

FORMATO SOAP:
- subjetivo: Lo que el paciente reporta
- objetivo: Hallazgos fisicos/pruebas
- analisis: Tu interpretacion clinica
- plan: Acciones a tomar
```

#### Metodos principales:

| Metodo | Descripcion |
|--------|------------|
| `processClinicDictation(dictation, context)` | Procesa dictado y devuelve analisis SOAP completo |
| `generateExecutiveSummary(analysis)` | Genera resumen ejecutivo para dashboard |
| `validateAndFixEspecialidad(especialidad)` | Mapea especialidades a categorias validas |
| `getFallbackAnalysis(dictation)` | Fallback si Gemini falla |

---

### ElevenlabsService - Sintesis de Voz Empatica

**Ubicacion**: `src/ai/services/elevenlabs.service.ts`

#### Que hace?

Convierte texto clinico en audio natural y empatico usando ElevenLabs, permitiendo comunicacion auditiva con pacientes.

#### Caracteristicas principales:

- **Sintesis de voz multiidioma**: Soporte para espanol e ingles
- **Control de entonacion**: Parametros de estabilidad y similitud de voz
- **Streaming eficiente**: Soporte para textos largos sin truncamiento excesivo
- **Quota management**: Verifica disponibilidad de caracteres antes de sintetizar
- **Fallback gracioso**: Maneja ausencia de API key sin fallar todo el pipeline

#### Parametros de configuracion:

```env
# Voice ID de ElevenLabs (medico, profesional, tranquilizador)
ELEVENLABS_VOICE_ID=W5JElH3dK1UYYAiHH7uh

# Estabilidad de la voz (0-1): mas bajo = mas variacion emocional
ELEVENLABS_STABILITY=0.5

# Similitud con voz original (0-1): mas alto = mas similar pero menos flexible
ELEVENLABS_CLARITY=0.75
```

#### Metodos principales:

| Metodo | Descripcion | Limites |
|--------|------------|---------|
| `synthesizeVoice(text)` | Sintetiza texto a audio MP3 | 5,000 caracteres |
| `synthesizeVoiceStream(text)` | Streaming para textos largos | Sin limite practico |
| `getAvailableVoices()` | Lista todas las voces disponibles | API call |
| `getUserInfo()` | Obtiene quota de caracteres | API call |
| `canSynthesize(textLength)` | Verifica si hay quota disponible | Validacion previa |

---

### AiService - Orquestacion del Pipeline Completo

**Ubicacion**: `src/ai/ai.service.ts`

#### Que hace?

Orquesta el flujo completo: Gemini -> analisis SOAP -> MongoDB -> ElevenLabs -> audio.

#### Metodos principales:

| Metodo | Entrada | Salida | Tiempo |
|--------|---------|--------|--------|
| `processClinicDictationWithAudio()` | Dictado + contexto | Analisis + Audio | ~3-5s |
| `processClinicDictationAnalysisOnly()` | Dictado + contexto | Analisis | ~1-2s |
| `generateAudioFromText()` | Texto | Audio MP3 | ~0.5-1s |
| `healthCheck()` | - | Estado servicios | ~0.3s |
| `getElevenLabsQuota()` | - | Info de quota | ~0.2s |
| `getAvailableVoices()` | - | Lista de voces | ~0.5s |

---

## Endpoints de IA - Referencia Completa

### POST /ai/process - Pipeline Completo (Analisis + Audio)

**El endpoint principal**. Procesa dictado medico y genera analisis SOAP + audio para paciente.

#### Request:

```json
{
  "dictation": "Paciente de 35 anos con fiebre de 38.5°C, tos productiva y dolor pleuritico. Inicio hace 3 dias. Fumador activo. Ausculta: crepitos en base derecha.",
  "context": "Antecedentes: Neumonia hace 2 anos, usuario de inmunosupresores por artritis reumatoide",
  "patientId": "507f1f77bcf86cd799439011"
}
```

#### Response:

```json
{
  "success": true,
  "processingTimeMs": 4230,
  "analysis": {
    "resumen": "Sospecha de neumonia bacteriana con factor de riesgo por inmunodepresion",
    "soap": {
      "subjetivo": "Fiebre 38.5°C, tos productiva, dolor pleuritico. Inicio hace 3 dias",
      "objetivo": "Crepitos en base derecha. Fumador activo",
      "analisis": "Neumonia adquirida en comunidad complicada por inmunodepresion",
      "plan": "Radiografia de torax, hemocultivos, iniciar antibioticos de amplio espectro"
    },
    "diagnostico_presuntivo": "Neumonia bacteriana complicada",
    "nivel_triage": 4,
    "nivel_triage_justificacion": "Urgencia moderada-alta por inmunodepresion y sospecha bacteriana",
    "especialidad": "General",
    "version_paciente": "Usted presenta inflamacion en los pulmones que requiere tratamiento con antibioticos. Le haremos pruebas de confirmacion hoy e iniciaremos el tratamiento lo antes posible.",
    "hallazgos_criticos": ["Inmunodepresion", "Fiebre elevada", "Crepitos pulmonares"]
  },
  "audio": {
    "available": true,
    "format": "base64-mp3",
    "data": "SUQzBAAAI1RTU1VFAAAAPAAADTMK...",
    "sizeBytes": 52140
  },
  "message": "Analisis completado en 4230ms. Triage: 4/5"
}
```

#### Curl:

```bash
curl -X POST http://localhost:3000/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "dictation": "Paciente con fiebre, tos y dolor pleuritico",
    "context": "Antecedentes de neumonia",
    "patientId": "507f1f77bcf86cd799439011"
  }'
```

---

### POST /ai/analyze - Solo Analisis (Sin Audio)

**Analisis rapido sin gasto de quota de ElevenLabs**. Ideal para verificaciones rapidas.

#### Request:

```json
{
  "dictation": "Dolor de cabeza occipital, rigidez de nuca, sensibilidad a la luz",
  "context": "Paciente con cefaleas recurrentes"
}
```

#### Response:

```json
{
  "success": true,
  "processingTimeMs": 1850,
  "analysis": {
    "resumen": "Sospecha de meningitis viral o bacteriana",
    "soap": { },
    "diagnostico_presuntivo": "Meningitis",
    "nivel_triage": 5,
    "especialidad": "Neurologia",
    "version_paciente": "Sus sintomas requieren evaluacion urgente de especialista...",
    "hallazgos_criticos": ["Rigidez de nuca", "Fotofobia", "Cefalea occipital"]
  },
  "message": "Analisis completado en 1850ms"
}
```

---

### POST /ai/synthesize - Generar Audio Desde Texto

**Sintetiza audio para cualquier texto**. Util para regenerar audio o textos adicionales.

#### Request:

```json
{
  "text": "Su cita de seguimiento esta programada para el proximo martes a las 10 de la manana con el cardiologo. Por favor traer sus ultimos estudios de laboratorio."
}
```

#### Response:

```json
{
  "success": true,
  "audio": {
    "format": "base64-mp3",
    "data": "SUQzBAAAI1RTU1...",
    "sizeBytes": 38290
  },
  "message": "Audio sintetizado correctamente"
}
```

---

### GET /ai/voices - Listar Voces Disponibles

**Obtiene todas las voces disponibles en ElevenLabs**.

#### Response:

```json
{
  "success": true,
  "count": 32,
  "voices": [
    {
      "id": "W5JElH3dK1UYYAiHH7uh",
      "name": "Dr. Benjamin",
      "category": "professional",
      "description": "Professional, trustworthy male voice",
      "preview_url": "https://elevenlabs.io/..."
    },
    {
      "id": "AZnzlk1mvXoshfHHSLBd",
      "name": "Maria",
      "category": "female",
      "description": "Warm and empathetic female voice",
      "preview_url": "https://elevenlabs.io/..."
    }
  ],
  "message": "Se encontraron 32 voces disponibles"
}
```

---

### GET /ai/quota - Informacion de Cuota

**Obtiene informacion de uso y disponibilidad de caracteres en ElevenLabs**.

#### Response:

```json
{
  "success": true,
  "user": {
    "name": "Hospital Moscati",
    "email": "ai@moscati.com",
    "subscription": "professional"
  },
  "quota": {
    "characterCount": 125430,
    "characterLimit": 1000000,
    "remaining": 874570,
    "percentageUsed": 12.54,
    "percentageRemaining": 87.46
  },
  "message": "Cuota: 874570/1000000 caracteres disponibles (12.54% usado)"
}
```

---

### GET /ai/health - Health Check

**Verifica el estado de los servicios de IA**.

#### Response - Healthy:

```json
{
  "healthy": true,
  "timestamp": "2025-01-15T14:32:45.123Z",
  "services": {
    "gemini": "ready",
    "elevenlabs": "ready",
    "remainingCharacters": 874570
  },
  "message": "Todos los servicios operacionales"
}
```

#### Response - Error:

```json
{
  "healthy": false,
  "timestamp": "2025-01-15T14:32:45.123Z",
  "services": {
    "gemini": "ready",
    "elevenlabs": "error",
    "error": "ELEVENLABS_API_KEY not configured"
  },
  "message": "Algunos servicios no estan disponibles"
}
```

---

### GET /ai/test - Test Endpoint

**Verifica conectividad y obtiene lista de endpoints disponibles**.

#### Response:

```json
{
  "status": "operational",
  "message": "El servicio de IA esta operacional",
  "timestamp": "2025-01-15T14:32:45.123Z",
  "endpoints": {
    "POST /ai/process": "Procesar dictado completo (analisis + audio)",
    "POST /ai/analyze": "Solo analisis clinico (sin audio)",
    "POST /ai/synthesize": "Generar audio desde texto",
    "GET /ai/voices": "Listar voces disponibles",
    "GET /ai/quota": "Informacion de cuota de ElevenLabs",
    "GET /ai/health": "Estado de los servicios",
    "GET /ai/test": "Test de conectividad"
  }
}
```

---

## Casos de Uso Reales - Ejemplos Clinicos

### Caso 1: Evaluacion de Emergencia

```bash
curl -X POST http://localhost:3000/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "dictation": "Varon 62 anos con dolor toracico opresivo, sudoracion, nauseas. TA 160/100, FC 105. ECG muestra depresion de ST",
    "context": "Hipertension, dislipidemia, fumador. Infartos previos en familia"
  }'
```

**Resultado esperado**: Triage 5, especialidad Cardiologia, recomendacion de cateterismo urgente

---

### Caso 2: Seguimiento Pediatrico

```bash
curl -X POST http://localhost:3000/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "dictation": "Nino 4 anos con tos seca de 5 dias, sin fiebre. Tiene estridor inspiratorio. Vacunado. Saturacion 98%",
    "context": "Antecedentes de croup hace 2 anos. Hermano con tos hace 1 semana"
  }'
```

**Resultado esperado**: Triage 3, especialidad Pediatria, diagnostico: probable croup viral

---

### Caso 3: Trauma Hospitalario

```bash
curl -X POST http://localhost:3000/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "dictation": "Accidente vehicular. Paciente con dolor abdominal, distension, sensibilidad en RLQ. Fractura pelvica en radiografia. TA 95/60, FC 120",
    "context": "Hace 45 minutos del accidente. Glasgow 14. Sangrado activo menor"
  }'
```

**Resultado esperado**: Triage 5, especialidad Trauma, diagnostico: probable lesion visceral, recomendacion: trasladarse a quirofa no

---

## Configuracion de Entorno - Variables Requeridas

Crea un archivo `.env` en la raiz del proyecto (NO versionable):

```env
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/hospital_db?retryWrites=true&w=majority

GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyD_your_api_key_here_12345

ELEVENLABS_API_KEY=sk_your_api_key_here_12345

ELEVENLABS_VOICE_ID=W5JElH3dK1UYYAiHH7uh

ELEVENLABS_STABILITY=0.5

ELEVENLABS_CLARITY=0.75

JWT_SECRET=your-super-secret-key-min-32-characters-long

PORT=3000

NODE_ENV=development
```

---

## Estructura del Proyecto (Ramificacion Completa)

```
hackathon-2026-project/
├─ dist/
├─ node_modules/
├─ src/
│  ├─ app.module.ts
│  ├─ main.ts
│  ├─ ai/
│  │  ├─ ai.controller.ts
│  │  ├─ ai.service.ts
│  │  ├─ ai.module.ts
│  │  ├─ dto/
│  │  │  ├─ create-ai.dto.ts
│  │  │  ├─ process-scribing.dto.ts
│  │  │  └─ update-ai.dto.ts
│  │  ├─ entities/
│  │  │  └─ ai.entity.ts
│  │  └─ services/
│  │     ├─ gemini.service.ts
│  │     └─ elevenlabs.service.ts
│  ├─ ai-inventory/
│  │  ├─ best.pt
│  │  ├─ main.py
│  │  └─ requirements.txt
│  ├─ reports/
│  │  ├─ reports.controller.ts
│  │  ├─ reports.service.ts
│  │  ├─ dto/
│  │  │  ├─ create-report.dto.ts
│  │  │  └─ update-report.dto.ts
│  │  └─ services/
│  │     ├─ audio.service.ts
│  │     └─ feedback.service.ts
│  ├─ auth/
│  ├─ patients/
│  ├─ doctor/
│  ├─ hospitals/
│  ├─ inventories/
│  ├─ vision/
│  └─ database/
├─ .env
├─ .env.example
├─ .gitignore
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## Instalacion y Configuracion Rapida

### 1. Clonar y preparar

```bash
cd hackathon-2026-project
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### 3. Iniciar servidor NestJS

```bash
npm run start:dev
npm run build
npm run start:prod
```

### 4. (Opcional) Iniciar microservicio de vision Python

```bash
cd src/ai-inventory
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## Pruebas Rapidas

### Test 1: Verificar conectividad

```bash
curl http://localhost:3000/ai/test
```

### Test 2: Health check

```bash
curl http://localhost:3000/ai/health
```

### Test 3: Analisis simple

```bash
curl -X POST http://localhost:3000/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "dictation": "Paciente con fiebre alta y dolor de garganta"
  }'
```

### Test 4: Pipeline completo con audio

```bash
curl -X POST http://localhost:3000/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "dictation": "Dolor toracico agudo de 2 horas",
    "context": "Antecedentes de arritmias"
  }' | jq '.audio.data' > audio.b64

base64 -d audio.b64 > output.mp3
```

---

## Rendimiento y Optimizacion

### Tiempos de procesamiento tipicos:

| Operacion | Tiempo | CPU | Red |
|-----------|--------|-----|-----|
| Analisis Gemini solo | 1.5-2s | 5% | 300ms |
| Sintesis ElevenLabs | 0.5-1s | 2% | 500ms |
| Pipeline completo | 3-5s | 8% | 1000ms |
| Verificacion quota | 0.2s | 1% | 200ms |
| Health check | 0.3s | 2% | 300ms |

### Recomendaciones de escalabilidad:

1. **Caching de analisis**: Cachea analisis para dictados identicos
2. **Queue de sintesis**: Usa Bull o RabbitMQ para sintesis asincrónica
3. **Rate limiting**: Implementa limites por API key
4. **Compresion de audio**: Usa opus en lugar de MP3 para menor tamano
5. **Replica Gemini**: Usa multiples API keys y round-robin

---

## Troubleshooting y Common Issues

### Error: GOOGLE_GENERATIVE_AI_API_KEY no esta configurada

**Solucion**:
1. Verifica que `.env` existe y tiene `GOOGLE_GENERATIVE_AI_API_KEY`
2. Obtén API key en https://ai.google.dev/
3. Reinicia servidor

```bash
echo $GOOGLE_GENERATIVE_AI_API_KEY
```

---

### Error: ELEVENLABS_API_KEY not configured

**Solucion**:
1. Obtén API key en https://elevenlabs.io/
2. Agrega a `.env`: `ELEVENLABS_API_KEY=sk_...`
3. El pipeline de Gemini sigue funcionando; solo falla audio

```bash
curl -X POST http://localhost:3000/ai/analyze ...
```

---

### JSON parsing error de Gemini

**Sintoma**: `Error: Unexpected token < in JSON at position 0`

**Solucion**:
1. Gemini devolvio HTML en lugar de JSON (probablemente rate limit)
2. Esperar 1 minuto
3. Verificar limite de requests de API key
4. Usar modelo alternativo en `gemini.service.ts`

```typescript
model: "gemini-1.5-pro"
```

---

### Audio truncado o vacio

**Sintoma**: `audio.sizeBytes = 0`

**Solucion**:
1. Verificar que el texto sea valido (no vacio, < 5000 caracteres)
2. Comprobar quota de ElevenLabs: `GET /ai/quota`
3. Usar `synthesizeVoiceStream()` para textos largos

```bash
curl http://localhost:3000/ai/quota | jq '.quota.remaining'
```

---

### MongoDB connection timeout

**Solucion**:
1. Verificar que `MONGO_URI` es correcta
2. Verificar conectividad a servidor MongoDB
3. Comprobar IP whitelist en MongoDB Atlas

---

## Best Practices para Usar IA Eficientemente

### DO's:

- Usar `/ai/analyze` para verificaciones rapidas (sin gastar quota de audio)
- Cachear analisis de dictados frecuentes
- Usar contexto clinico relevante para mejorar calidad de Gemini
- Monitorear quota de ElevenLabs regularmente
- Implementar fallback si Gemini o ElevenLabs fallan
- Loguear todos los errores para analisis posterior

### DON'Ts:

- NO enviar texto > 5000 caracteres a sintesis (truncar o usar stream)
- NO hardcodear API keys (usar .env siempre)
- NO llamar `/ai/process` en loop sin rate limiting
- NO ignorar health check antes de procesamiento critico
- NO usar especialidades no validas (siempre validar antes)

---

## Integracion con ReportsModule

El modulo `reports` integra todo el pipeline de IA:

```
Audio -> Transcripcion -> /ai/analyze -> MongoDB -> Feedback -> /ai/synthesize -> Audio
```

### Endpoints de reports que usan IA:

| Endpoint | Funcion |
|----------|---------|
| `POST /reports/upload-audio` | Sube audio, lo transcribe, lo analiza con Gemini |
| `POST /reports/dictation` | Procesa dictado directo con pipeline completo |
| `POST /reports/feedback` | Genera preguntas de validacion con Gemini |
| `GET /reports/{id}` | Obtiene reporte con analisis |
| `GET /reports/critical` | Lista reportes con triage >= 4 |

---

## Seguridad y Privacidad

### Consideraciones criticas:

1. **API Keys**: Nunca commitear `.env`
2. **Datos sensibles**: Encriptar datos clinicos en MongoDB
3. **HIPAA/GDPR**: Implementar retencion de datos (borrar tras 90 dias)
4. **Rate limiting**: Proteger endpoints de IA con rate limit
5. **Auditoria**: Loguear todas las peticiones a Gemini/ElevenLabs
6. **Consentimiento**: Informar a pacientes sobre analisis con IA

---

## Dependencias Principales

### Node.js / TypeScript:

```json
{
  "@nestjs/common": "^11.x",
  "@nestjs/config": "^3.x",
  "@nestjs/core": "^11.x",
  "@nestjs/jwt": "^12.x",
  "@nestjs/mongoose": "^10.x",
  "@google/generative-ai": "^latest",
  "elevenlabs": "^latest",
  "mongoose": "^8.x",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "axios": "^1.6.x",
  "bcrypt": "^5.x"
}
```

### Python (ai-inventory):

```
fastapi==0.104.1
uvicorn==0.24.0
ultralytics==8.0.0
pillow==10.0.0
numpy==1.24.3
```

---

## Recursos y Documentacion

- **Google Gemini**: https://ai.google.dev/
- **ElevenLabs**: https://elevenlabs.io/docs/
- **NestJS**: https://docs.nestjs.com/
- **MongoDB**: https://docs.mongodb.com/
- **Ultralytics YOLO**: https://docs.ultralytics.com/

---

## Roadmap Futuro

- [ ] Agregar soporte para multiples idiomas (EN, FR, PT)
- [ ] Implementar fine-tuning de Gemini con casos clinicos especificos
- [ ] Agregar integracion con Claude para second opinion
- [ ] Dashboard de monitoreo de IA en tiempo real
- [ ] Export de reportes a PDF/DICOM
- [ ] Integracion con EHR externo (HL7/FHIR)
- [ ] Mobile app con grabacion de audio
- [ ] Analytics de precision diagnostica vs confirmacion medica

---

## Soporte y Contribuciones

Para reportar problemas o sugerir mejoras:

1. Verificar `.env` y variables de entorno
2. Revisar logs: `npm run start:dev 2>&1 | grep -i error`
3. Consultar seccion "Troubleshooting"
4. Crear issue con stack trace completo

---

## Licencia

Proyecto bajo licencia hospitalaria privada. Uso exclusivo para Hospital Moscati de Alta Especialidad.

---

## Resumen

Este proyecto coloca **la IA medica en el centro**, transformando dictados crudos en analisis clinicos estructurados, reportes normalizados y comunicaciones empáticas con pacientes. Combina **Google Gemini** (analisis SOAP + triage), **ElevenLabs** (sintesis de voz) y **YOLO** (vision) en una plataforma escalable y lista para produccion.

**Comenzar**: Copia `.env.example` a `.env`, configura credenciales, corre `npm install && npm run start:dev`, y accede a `http://localhost:3000/ai/test`.
