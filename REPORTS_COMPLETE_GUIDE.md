# 🏥 REPORTS MODULE - COMPLETE GUIDE
## Audio Processing + Gemini Analysis + ElevenLabs Feedback

---

## 📋 Tabla de Contenidos

1. [Overview](#overview)
2. [Arquitectura Completa](#arquitectura-completa)
3. [API Endpoints](#api-endpoints)
4. [Pipeline de Audio](#pipeline-de-audio)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [Flujo Completo](#flujo-completo-paso-a-paso)
7. [Configuración](#configuración)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

El módulo **Reports** es un sistema completo para:

✅ **Recibir audios médicos** - Upload de archivos de audio  
✅ **Transcribir automáticamente** - Gemini convierte audio a texto  
✅ **Analizar con IA** - Gemini genera análisis SOAP + triage  
✅ **Generar retroalimentación** - Preguntas inteligentes basadas en análisis  
✅ **Sintetizar voz** - ElevenLabs convierte preguntas en audio empático  
✅ **Almacenar en BD** - MongoDB guarda todo el reporte completo  

### Stack:
- **Backend:** NestJS
- **IA Generativa:** Gemini 1.5 Flash
- **IA de Voz:** ElevenLabs + Transcripción multimodal
- **Base de Datos:** MongoDB + Mongoose
- **Upload de Archivos:** Multer

---

## 🏗️ Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE / FRONTEND                            │
│                  (Doctor / Aplicación médica)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   POST /reports/upload-audio   │
        │    -with-feedback (multipart)  │
        └────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   ReportsController             │
        │  (Recibe archivo + metadata)    │
        └────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
   │ AudioService│  │GeminiService│  │FeedbackServ. │
   │   (Trans.)  │  │  (Análisis) │  │ (Preguntas)  │
   └─────────────┘  └─────────────┘  └──────────────┘
        │                │                │
        ▼                ▼                ▼
   Gemini API       Gemini API      ElevenLabs API
   (Multimodal)     (JSON SOAP)        (Síntesis)
        │                │                │
        └────────────────┼────────────────┘
                         ▼
        ┌────────────────────────────────┐
        │  MongoDB (ClinicalReport)      │
        │  - Reporte completo            │
        │  - Audio metadata              │
        │  - Preguntas + respuestas       │
        └────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Response JSON con todo        │
        │  - Análisis clínico            │
        │  - Preguntas + audio base64    │
        │  - Report ID para seguimiento  │
        └────────────────────────────────┘
```

---

## 🔌 API Endpoints

### 1. **POST /reports/upload-audio-with-feedback** ⭐ PRINCIPAL

Sube audio médico y procesa pipeline completo:
- Transcripción → Análisis → Retroalimentación → Síntesis

**Request (multipart/form-data):**
```
audio: <archivo.mp3>
patientId: "507f1f77bcf86cd799439011"
doctorId: "507f1f77bcf86cd799439012"
specialty: "Cardiología"
context: "Paciente con antecedentes de hipertensión"
hospitalUnit: "Moscati Centro"
generateFeedback: true
```

**Response:**
```json
{
  "success": true,
  "reportId": "65abc123def456",
  "transcription": "Paciente de 45 años con dolor torácico de 2 horas...",
  "analysis": {
    "resumen": "...",
    "soap": { "s": "...", "o": "...", "a": "...", "p": "..." },
    "nivel_triage": 4,
    "diagnostico_presuntivo": "Síndrome coronario agudo"
  },
  "feedbackQuestions": [
    {
      "id": "q1",
      "question": "¿Confirmas que el triage es correcto?",
      "category": "confirmation",
      "importance": "high"
    }
  ],
  "feedbackQuestionsWithAudio": [
    {
      "questionId": "q1",
      "question": "¿Confirmas que el triage es correcto?",
      "audioBase64": "//NExAAjZzovABCQCiIHQfwDcAAAyxUKBQs..."
    }
  ],
  "message": "✅ Audio procesado"
}
```

---

### 2. **POST /reports/transcribe-audio** ⚡ RÁPIDO

Solo transcribe audio sin análisis:

**Request:**
```
audio: <archivo.mp3>
context: "Contexto clínico opcional"
```

**Response:**
```json
{
  "success": true,
  "transcription": "Texto transcrito del audio...",
  "audioSizeBytes": 45320,
  "processingTimeMs": 1230
}
```

---

### 3. **POST /reports/process-dictation-with-feedback**

Procesa dictado directo (sin archivo de audio):

**Request:**
```json
{
  "patientId": "507f1f77bcf86cd799439011",
  "doctorId": "507f1f77bcf86cd799439012",
  "transcription": "Paciente con fiebre de 38.5°C...",
  "specialty": "General",
  "generateFeedback": true
}
```

**Response:** Igual al endpoint #1

---

### 4. **POST /reports/:reportId/submit-feedback** 💬

Envía respuestas a las preguntas de retroalimentación:

**Request:**
```json
{
  "responses": [
    {
      "questionId": "q1",
      "answer": "Sí"
    },
    {
      "questionId": "q2",
      "answer": "No"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "validityScore": 87,
  "criticalIssues": [],
  "recommendations": ["Agregar ecografía"],
  "summaryText": "Reporte validado correctamente"
}
```

---

### 5. **GET /reports** 📋

Obtiene todos los reportes (paginado):

**Query Params:**
- `limit`: Máximo de resultados (default: 50)
- `skip`: Saltar N resultados (default: 0)

**Response:**
```json
{
  "success": true,
  "total": 245,
  "count": 50,
  "reports": [...]
}
```

---

### 6. **GET /reports/critical** 🚨

Obtiene solo reportes críticos (triage 4-5):

**Response:**
```json
{
  "success": true,
  "count": 5,
  "reports": [...]
}
```

---

### 7. **GET /reports/patient/:patientId** 👤

Obtiene reportes de un paciente:

**Response:**
```json
{
  "success": true,
  "count": 12,
  "reports": [...]
}
```

---

### 8. **GET /reports/doctor/:doctorId** 👨‍⚕️

Obtiene reportes de un médico:

---

### 9. **GET /reports/stats** 📊

Estadísticas de todos los reportes:

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalReports": 245,
    "avgTriageLevel": 2.8,
    "bySpecialty": {...}
  }
}
```

---

### 10. **GET /reports/:id** 📄

Obtiene un reporte específico:

---

### 11. **PATCH /reports/:id** 📝

Actualiza un reporte:

---

### 12. **PATCH /reports/:id/mark-reviewed** ✅

Marca un reporte como revisado por médico:

**Request:**
```json
{
  "medicoRevisorId": "507f1f77bcf86cd799439099",
  "notes": "Reporte validado correctamente"
}
```

---

### 13. **DELETE /reports/:id** 🗑️

Elimina un reporte:

---

## 🎙️ Pipeline de Audio

### Paso 1: Recepción de Audio
```
Usuario carga archivo MP3 (o WAV, OGG, M4A, FLAC, WebM)
                  ↓
         Multer valida y crea Buffer
                  ↓
         Validación de tamaño (<25MB)
```

### Paso 2: Transcripción (Gemini Multimodal)
```
Buffer de audio + MIME type
          ↓
Gemini 1.5 Flash (multimodal)
          ↓
System Prompt específico para audio médico
          ↓
Respuesta: Texto transcrito completo
```

### Paso 3: Análisis Clínico (Gemini)
```
Texto transcrito
          ↓
Prompt SOAP + Triage
          ↓
responseMimeType: 'application/json'
          ↓
JSON estructurado:
{
  "resumen": "...",
  "soap": {},
  "nivel_triage": 4,
  "diagnostico_presuntivo": "...",
  "especialidad": "...",
  "version_paciente": "..."
}
```

### Paso 4: Generación de Preguntas (Gemini)
```
Análisis clínico
          ↓
"Genera preguntas de validación basadas en..."
          ↓
JSON con 3-4 preguntas inteligentes
          ↓
Ejemplo:
- ¿Confirmas que el triage es correcto?
- ¿Necesita pruebas adicionales?
- En 1-10, seguridad en el diagnóstico
```

### Paso 5: Síntesis de Voz (ElevenLabs)
```
Pregunta clínica
          ↓
Conversión a texto amigable
          ↓
ElevenLabs API con voz empática
          ↓
Audio MP3 Buffer
          ↓
Conversión a base64 para envío JSON
```

### Paso 6: Almacenamiento (MongoDB)
```
Reporte completo con:
- Análisis SOAP
- Preguntas de retroalimentación
- Metadata de procesamiento
- Timestamps
          ↓
ClinicalReport guardado
```

---

## 💻 Ejemplos de Uso

### Ejemplo 1: cURL - Pipeline Completo

```bash
curl -X POST http://localhost:3000/reports/upload-audio-with-feedback \
  -F "audio=@patient_dictation.mp3" \
  -F "patientId=507f1f77bcf86cd799439011" \
  -F "doctorId=507f1f77bcf86cd799439012" \
  -F "specialty=Cardiología" \
  -F "context=Antecedentes de hipertensión" \
  -F "hospitalUnit=Moscati Centro" \
  -F "generateFeedback=true"
```

---

### Ejemplo 2: JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('audio', audioFile); // File object de input
formData.append('patientId', '507f1f77bcf86cd799439011');
formData.append('doctorId', '507f1f77bcf86cd799439012');
formData.append('specialty', 'Cardiología');
formData.append('generateFeedback', 'true');

const response = await fetch('http://localhost:3000/reports/upload-audio-with-feedback', {
  method: 'POST',
  body: formData
});

const result = await response.json();

console.log('Reporte ID:', result.reportId);
console.log('Transcripción:', result.transcription);
console.log('Análisis:', result.analysis);
console.log('Preguntas:', result.feedbackQuestions);

// Reproducir preguntas en audio
for (const questionAudio of result.feedbackQuestionsWithAudio) {
  const audioBuffer = Buffer.from(questionAudio.audioBase64, 'base64');
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  // audio.play() cuando sea necesario
}
```

---

### Ejemplo 3: Responder Retroalimentación

```javascript
const reportId = result.reportId;
const responses = result.feedbackQuestions.map(q => ({
  questionId: q.id,
  answer: // respuesta del médico
}));

const feedbackResponse = await fetch(
  `http://localhost:3000/reports/${reportId}/submit-feedback`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responses })
  }
);

const validation = await feedbackResponse.json();
console.log('Validez:', validation.validityScore + '%');
console.log('Issues:', validation.criticalIssues);
```

---

### Ejemplo 4: Obtener Reportes Críticos

```javascript
const response = await fetch('http://localhost:3000/reports/critical');
const data = await response.json();

console.log(`${data.count} reportes críticos`);
data.reports.forEach(report => {
  console.log(`- Paciente: ${report.patientId}, Triage: ${report.triage.nivel}`);
});
```

---

## 🔄 Flujo Completo Paso a Paso

### Escenario: Doctor genera reporte de trauma en emergencias

```
1. DOCTOR EN AMBULANCIA
   ↓
   "Paciente inconsciente tras accidente vehicular, 
    herida en cabeza, Glasgow 8, TA 90/60, FC 130"
   
   ↓ [Graba audio]

2. APP MÉDICA
   ↓
   Sube archivo MP3 a servidor
   
   ↓ POST /reports/upload-audio-with-feedback

3. REPORTSSERVICE
   ↓
   AudioService.processAudioBuffer()
   
   ↓
   📝 Transcripción por Gemini:
   "Paciente inconsciente tras accidente vehicular, 
    herida en cabeza, Glasgow 8, presión 90 sobre 60, 
    frecuencia cardíaca 130"
   
   ↓

4. GEMINISERVICE.processClinicDictation()
   ↓
   🧠 Análisis SOAP + Triage:
   {
     "resumen": "Trauma grave de cráneo con Glasgow reducido",
     "nivel_triage": 5,
     "soap": {
       "s": "Paciente inconsciente post-trauma",
       "o": "Glasgow 8, TA 90/60, FC 130, herida cefálica",
       "a": "Traumatismo craneoencefálico grave",
       "p": "Intubación, tomografía, neurocirugía"
     },
     "version_paciente": "Necesita atención inmediata en neurocirugía"
   }
   
   ↓

5. FEEDBACKSERVICE.generateFeedbackQuestions()
   ↓
   🤔 Preguntas de validación:
   - ¿Es realmente Glasgow 8?
   - ¿Necesita intubación inmediata?
   - ¿Se contactó a neurocirugía?
   
   ↓

6. FEEDBACKSERVICE.synthesizeMultipleFeedbackQuestions()
   ↓
   🎙️ ElevenLabs sintetiza cada pregunta
   Devuelve: 3 archivos MP3 en base64
   
   ↓

7. MONGODB.save()
   ↓
   💾 ClinicalReport guardado con:
   - Transcripción
   - Análisis SOAP
   - Triage
   - Preguntas (texto + audio)
   - Timestamps
   
   ↓

8. RESPUESTA AL DOCTOR
   {
     "reportId": "65abc123",
     "transcription": "...",
     "analysis": { /* SOAP + triage */ },
     "feedbackQuestions": [
       {
         "id": "q1",
         "question": "¿Es realmente Glasgow 8?",
         "audioBase64": "//NExAAjZzovABCQCiIHQfwDcAAAyxUKBQs..."
       }
     ]
   }
   
   ↓

9. DOCTOR RESPONDE
   ↓
   POST /reports/65abc123/submit-feedback
   {
     "responses": [
       { "questionId": "q1", "answer": "Sí, confirmado" },
       { "questionId": "q2", "answer": "Sí, intubado" },
       { "questionId": "q3", "answer": "Sí, contactado" }
     ]
   }
   
   ↓

10. VALIDACIÓN FINAL
    {
      "validityScore": 95,
      "criticalIssues": [],
      "recommendations": ["Enviar tomografía a radiología"],
      "requiresImmediateAction": false
    }
    
    ↓
    
11. REPORTE FINALIZADO ✅
    Guardado en BD, listo para seguimiento
```

---

## ⚙️ Configuración

### Variables de Entorno Requeridas

```env
# Gemini
GOOGLE_GENERATIVE_AI_API_KEY=AIza_...

# ElevenLabs
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=Antoni
ELEVENLABS_STABILITY=0.5
ELEVENLABS_CLARITY=0.75

# MongoDB
MONGODB_URI=mongodb+srv://usuario:pwd@cluster.mongodb.net/moscati-db

# App
PORT=3000
NODE_ENV=development
```

### Directorios de Almacenamiento

```
project/
├── uploads/
│   └── audio/          # Archivos de audio cargados (opcional)
├── dist/               # Compilación
└── src/
    └── reports/
        ├── services/
        │   ├── audio.service.ts
        │   └── feedback.service.ts
        ├── schemas/
        │   └── clinical-report.schema.ts
        ├── dto/
        │   ├── create-report.dto.ts
        │   ├── upload-audio.dto.ts
        │   └── update-report.dto.ts
        ├── reports.service.ts
        ├── reports.controller.ts
        └── reports.module.ts
```

---

## 🐛 Troubleshooting

### Error: "No audio file provided"
**Causa:** No se envió archivo en `audio`
**Solución:** Verificar que el formulario multipart incluya el campo `audio`

### Error: "ELEVENLABS_API_KEY not configured"
**Causa:** Variable de entorno no seteada
**Solución:** Añadir a `.env`: `ELEVENLABS_API_KEY=sk_...`

### Error: "Archivo de audio muy grande"
**Causa:** Archivo > 25MB
**Solución:** Comprimir audio o dividir en segmentos

### Error: "MIME type no soportado"
**Causa:** Formato de audio no soportado
**Solución:** Convertir a MP3, WAV, OGG, M4A, FLAC o WebM

### Latencia Alta
**Posibles Causas:**
1. API de Gemini lenta → Reintentar
2. ElevenLabs congestionado → Usar `synthesizeVoiceStream`
3. MongoDB lenta → Verificar índices

### Audio no se transcribe
**Debugging:**
```bash
# 1. Verificar que Gemini funciona
curl http://localhost:3000/ai/health

# 2. Verificar que el audio es válido
file audio.mp3

# 3. Usar endpoint de solo transcripción
POST /reports/transcribe-audio
```

---

## 📊 Monitoreo

### Logs Importantes

```
✅ Audio transcrito: 245 caracteres
✅ Análisis completado. Triage: 4
✅ 4 preguntas generadas
✅ 4 preguntas sintetizadas
✅ Reporte guardado: 65abc123
```

### Métricas a Monitorear

- `transcriptionTimeMs` - Tiempo de transcripción
- `analysisTimeMs` - Tiempo de análisis
- `feedbackSynthesisTimeMs` - Tiempo de síntesis
- `totalPipelineTimeMs` - Total del pipeline
- `validityScore` - Puntuación de validación

### Base de Datos Queries Útiles

```javascript
// Reportes críticos sin revisar
db.clinical_reports.find({ 
  "triage.nivel": { $gte: 4 }, 
  "revisadoPorMedico": false 
})

// Reportes del último día
db.clinical_reports.find({
  procesadoEn: { $gte: new Date(Date.now() - 24*60*60*1000) }
})

// Promedio de triage por especialidad
db.clinical_reports.aggregate([
  { $group: { _id: "$especialidad", avgTriage: { $avg: "$triage.nivel" } } }
])
```

---

## 🎯 Próximos Pasos

1. **Conectar con Frontend**
   - Componente de upload de audio
   - Reproducción de preguntas en audio
   - Interfaz para respuestas

2. **Optimizaciones**
   - Caché de análisis similares
   - Compresión de audio automática
   - Rate limiting por usuario

3. **Mejoras**
   - Integración con sistemas de alertas
   - Exportación a PDF de reportes
   - Integración con PACS (Picture Archiving)
   - Webhook para eventos críticos

4. **Seguridad**
   - Encriptación de audio
   - Autenticación JWT
   - Validación de doctores
   - Audit logs

---

## 📞 Soporte

**Stack:** NestJS + Gemini + ElevenLabs + MongoDB  
**Documentación:**
- NestJS: https://docs.nestjs.com/
- Gemini: https://ai.google.dev/
- ElevenLabs: https://docs.elevenlabs.io/
- Mongoose: https://mongoosejs.com/

**Estado:** ✅ Producción-ready para hackathon