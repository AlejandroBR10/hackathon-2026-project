# 🎨 FRONTEND, WEBSOCKETS & DASHBOARD - COMPLETE GUIDE

## 📋 Tabla de Contenidos

1. [Frontend Web & Formatos](#frontend-web--formatos)
2. [Sistema de Scoring Detallado](#sistema-de-scoring-detallado)
3. [WebSockets en Tiempo Real](#websockets-en-tiempo-real)
4. [Dashboard de Visualización](#dashboard-de-visualización)

---

## 🌐 FRONTEND WEB & FORMATOS

### ¿Qué tipo de formato recibe el Frontend Web?

El frontend web envía archivos de audio usando **multipart/form-data** (FormData de JavaScript).

### ¿Lo soporta nuestro backend?

**SÍ, 100% COMPATIBLE** ✅

El backend usa `@nestjs/platform-express` con `FileInterceptor('audio')` que es el estándar de NestJS para manejar multipart/form-data.

---

### 1. Flujo de Datos Frontend → Backend

```
FRONTEND (Navegador Web)
├── User selecciona archivo MP3
│
├── JavaScript crea FormData
│   ├── audio: File (MP3)
│   ├── patientId: "507f..."
│   ├── doctorId: "507f..."
│   └── specialty: "Cardiología"
│
├── fetch() con multipart/form-data
│   (Content-Type se envía automáticamente)
│
└─────────────────────────────────────────→
                                           
BACKEND (NestJS + Express)
├── @UseInterceptors(FileInterceptor('audio'))
│   └── Multer captura y valida
│
├── file.buffer (Buffer de bytes)
├── file.mimetype (audio/mp3)
├── file.size (bytes)
└── dto (resto de parámetros)
```

---

### 2. Código Frontend - Envío de Audio

```html
<!-- HTML -->
<input type="file" id="audioInput" accept="audio/*">
<button onclick="uploadAudio()">Procesar Audio</button>
<div id="results"></div>

<script>
async function uploadAudio() {
  // 1. Obtener archivo
  const audioFile = document.getElementById('audioInput').files[0];
  
  if (!audioFile) {
    alert('Selecciona un archivo de audio');
    return;
  }
  
  // 2. Validar tamaño (máx 25MB para Gemini)
  const maxSize = 25 * 1024 * 1024;
  if (audioFile.size > maxSize) {
    alert(`Audio muy grande (${(audioFile.size/1024/1024).toFixed(2)}MB)`);
    return;
  }
  
  // 3. Validar tipo
  const validMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
  if (!validMimes.includes(audioFile.type)) {
    alert(`Formato no soportado: ${audioFile.type}`);
    return;
  }
  
  // 4. Crear FormData (¡IMPORTANTE!)
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('patientId', document.getElementById('patientId').value);
  formData.append('doctorId', document.getElementById('doctorId').value);
  formData.append('specialty', 'Cardiología');
  formData.append('context', 'Paciente 45 años, hipertensión');
  formData.append('hospitalUnit', 'Moscati Centro');
  formData.append('generateFeedback', 'true');
  
  // 5. Enviar al backend
  try {
    const response = await fetch(
      'http://localhost:3000/reports/upload-audio-with-feedback',
      {
        method: 'POST',
        body: formData  // ¡NO ESPECIFICAR Content-Type!
        // Multer detecta automáticamente multipart/form-data
      }
    );
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('Error:', result.error);
      return;
    }
    
    // 6. Procesar resultado
    console.log('Reporte ID:', result.reportId);
    console.log('Transcripción:', result.transcription);
    console.log('Análisis:', result.analysis);
    console.log('Preguntas:', result.feedbackQuestions);
    console.log('Audios:', result.feedbackQuestionsWithAudio);
    
    // 7. Mostrar resultados
    displayResults(result);
    
  } catch (error) {
    console.error('Error de red:', error);
  }
}

function displayResults(data) {
  const html = `
    <div class="report">
      <h2>Reporte ${data.reportId}</h2>
      
      <section class="transcription">
        <h3>📝 Transcripción</h3>
        <p>${data.transcription}</p>
      </section>
      
      <section class="analysis">
        <h3>🧠 Análisis Clínico</h3>
        <p><strong>Resumen:</strong> ${data.analysis.resumen}</p>
        <p><strong>Diagnóstico:</strong> ${data.analysis.diagnostico_presuntivo}</p>
        <p><strong>Triage:</strong> ${data.analysis.nivel_triage}/5</p>
      </section>
      
      <section class="feedback">
        <h3>🤔 Preguntas de Retroalimentación</h3>
        ${data.feedbackQuestionsWithAudio.map(qa => `
          <div class="question">
            <p>${qa.question}</p>
            <button onclick="playAudio('${qa.audioBase64}')">🔊 Escuchar</button>
            <input type="text" placeholder="Tu respuesta" class="answer" data-question-id="${qa.questionId}">
          </div>
        `).join('')}
        <button onclick="submitFeedback('${data.reportId}')">Enviar Respuestas</button>
      </section>
    </div>
  `;
  
  document.getElementById('results').innerHTML = html;
}

function playAudio(base64Audio) {
  // Convertir base64 a Blob
  const audioBuffer = Buffer.from(base64Audio, 'base64');
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
  
  // Crear URL temporal y reproducir
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  audio.play();
}

async function submitFeedback(reportId) {
  const answers = document.querySelectorAll('.answer');
  const responses = Array.from(answers).map(input => ({
    questionId: input.dataset.questionId,
    answer: input.value
  }));
  
  const response = await fetch(
    `http://localhost:3000/reports/${reportId}/submit-feedback`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses })
    }
  );
  
  const result = await response.json();
  console.log('Validez:', result.validityScore);
  console.log('Issues:', result.criticalIssues);
}
</script>
```

---

### 3. Formatos Soportados

#### ✅ Soportados por el Backend

| Formato | MIME Type | Extensión | ¿Funciona? |
|---------|-----------|-----------|-----------|
| MP3 | audio/mpeg, audio/mp3 | .mp3 | ✅ |
| WAV | audio/wav | .wav | ✅ |
| OGG | audio/ogg | .ogg | ✅ |
| M4A | audio/mp4 | .m4a | ✅ |
| WebM | audio/webm | .webm | ✅ |
| FLAC | audio/flac | .flac | ✅ |

#### Tamaño Máximo

- **Límite Gemini:** 25 MB
- **Recomendación:** < 10 MB
- **Validación en Backend:** Sí ✅

---

### 4. Validaciones en el Backend

```typescript
// En AudioService:

validateAudioFile(buffer: Buffer, mimeType: string): boolean {
  // 1. Validar tamaño
  if (buffer.length === 0) {
    return false; // Vacío
  }
  
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (buffer.length > maxSize) {
    return false; // Muy grande
  }
  
  // 2. Validar MIME type
  const validMimeTypes = [
    'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg',
    'audio/mp4', 'audio/flac', 'audio/webm'
  ];
  
  if (!validMimeTypes.includes(mimeType)) {
    return false; // Formato no soportado
  }
  
  return true;
}
```

---

## 📊 SISTEMA DE SCORING DETALLADO

### ¿Cómo funciona el Score de Validez?

El **validityScore** es un número de 0-100 que indica qué tan válido/completo está el reporte clínico después de recibir retroalimentación del médico.

---

### 1. Componentes del Score

```
VALIDEZ DEL REPORTE (0-100)
│
├─ 25% → Consistencia Diagnóstica
│   ├─ ¿El triage es correcto? (confirmar)
│   ├─ ¿Las evidencias apoyan el diagnóstico?
│   └─ Puntuación: 0-25
│
├─ 25% → Completitud del Plan
│   ├─ ¿Todas las pruebas están incluidas?
│   ├─ ¿El plan de tratamiento es claro?
│   └─ Puntuación: 0-25
│
├─ 25% → Urgencia/Triage
│   ├─ ¿El nivel de triage es apropiado?
│   ├─ ¿Se requiere acción inmediata?
│   └─ Puntuación: 0-25
│
└─ 25% → Claridad Clínica
    ├─ ¿El lenguaje es preciso?
    ├─ ¿Faltan datos importantes?
    └─ Puntuación: 0-25

TOTAL = (Consistencia + Completitud + Urgencia + Claridad)
```

---

### 2. Algoritmo Detallado de Scoring

```typescript
// En FeedbackService:

async processFeedbackResponses(
  questions: FeedbackQuestion[],
  responses: FeedbackResponse[]
): Promise<ScoringResult> {
  
  const scores = {
    consistency: 0,      // 0-25: ¿Es coherente?
    completeness: 0,     // 0-25: ¿Está completo?
    urgency: 0,          // 0-25: ¿El triage es correcto?
    clarity: 0           // 0-25: ¿Es claro?
  };
  
  // Procesar cada respuesta
  for (const response of responses) {
    const question = questions.find(q => q.id === response.questionId);
    
    switch (question.category) {
      case 'confirmation':
        // Validación de triage/diagnóstico
        if (response.answer.toLowerCase() === 'sí') {
          scores.consistency += 8;  // +8 de 25
          scores.urgency += 5;       // +5 de 25
        } else {
          // El médico dice que NO concuerda
          scores.consistency -= 10;  // -10 de 25
          // TRIGGER: Revisar análisis
        }
        break;
        
      case 'followup':
        // Completitud del plan
        if (response.answer.toLowerCase() === 'no') {
          scores.completeness += 10;  // Plan está completo
        } else {
          // Se necesitan pruebas adicionales
          scores.completeness += 5;   // Plan es parcial
        }
        break;
        
      case 'clarification':
        // Claridad clínica
        const confidenceScore = parseInt(response.answer); // 1-10
        scores.clarity += (confidenceScore / 10) * 25;
        
        if (confidenceScore < 5) {
          // TRIGGER: Baja confianza
          console.warn('⚠️ Confianza baja en diagnóstico');
        }
        break;
        
      case 'safety':
        // Urgencia/Seguridad
        if (response.answer.toLowerCase() === 'sí') {
          scores.urgency += 10;
        } else {
          scores.urgency -= 5;
        }
        break;
    }
  }
  
  // Normalizar puntuaciones (0-100)
  const normalizedScores = {
    consistency: Math.max(0, Math.min(25, scores.consistency)),
    completeness: Math.max(0, Math.min(25, scores.completeness)),
    urgency: Math.max(0, Math.min(25, scores.urgency)),
    clarity: Math.max(0, Math.min(25, scores.clarity))
  };
  
  // Calcular puntuación total
  const validityScore = 
    normalizedScores.consistency +
    normalizedScores.completeness +
    normalizedScores.urgency +
    normalizedScores.clarity;
  
  // Generar issues críticos
  const criticalIssues = [];
  
  if (normalizedScores.consistency < 10) {
    criticalIssues.push('Diagnóstico inconsistente con evidencias');
  }
  
  if (normalizedScores.urgency < 10) {
    criticalIssues.push('Triage potencialmente incorrecto');
  }
  
  if (normalizedScores.clarity < 10) {
    criticalIssues.push('Falta claridad en plan médico');
  }
  
  // Recomendaciones
  const recommendations = [];
  
  if (normalizedScores.completeness < 15) {
    recommendations.push('Agregar más pruebas diagnósticas');
  }
  
  if (validityScore < 50) {
    recommendations.push('Revisar por supervisor');
    recommendations.push('Considerar segunda opinión');
  }
  
  return {
    validityScore: Math.round(validityScore),
    normalizedScores,
    criticalIssues,
    recommendations,
    requiresImmediateAction: validityScore < 40,
    requiresReview: validityScore < 60
  };
}
```

---

### 3. Ejemplos de Scoring

#### Ejemplo 1: Reporte Excelente (95 puntos)

```
Pregunta 1: "¿Confirmas triage?" → "Sí"
  Consistency: +10 ✅
  Urgency: +5 ✅

Pregunta 2: "¿Necesita pruebas adicionales?" → "No"
  Completeness: +10 ✅

Pregunta 3: "Confianza diagnóstico (1-10)" → "9"
  Clarity: +22 ✅

TOTAL: (10+10+5) + (10) + (22) + (20) = 95 ✅
```

#### Ejemplo 2: Reporte Problemático (42 puntos)

```
Pregunta 1: "¿Confirmas triage?" → "No"
  Consistency: -10 ❌
  Urgency: -5 ❌

Pregunta 2: "¿Necesita pruebas adicionales?" → "Sí"
  Completeness: +5 ⚠️

Pregunta 3: "Confianza diagnóstico (1-10)" → "3"
  Clarity: +8 ❌

TOTAL: (-10-5) + (5) + (8) + (15) = 12 ❌
       → REQUIERE REVISIÓN INMEDIATA
```

---

### 4. Respuesta del Scoring

```json
{
  "success": true,
  "validityScore": 95,
  
  "normalizedScores": {
    "consistency": 25,      // ✅ Diagnóstico consistente
    "completeness": 25,     // ✅ Plan completo
    "urgency": 20,          // ✅ Triage correcto
    "clarity": 25           // ✅ Muy claro
  },
  
  "criticalIssues": [],    // ✅ Sin issues
  
  "recommendations": [],
  
  "requiresImmediateAction": false,
  
  "requiresReview": false,
  
  "message": "✅ Reporte validado. Puntuación: 95%"
}
```

---

## 🔌 WEBSOCKETS EN TIEMPO REAL

### ¿Cómo funcionaría WebSockets?

WebSockets permite comunicación **bidireccional en tiempo real** entre frontend y backend.

---

### 1. Instalación

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

---

### 2. Backend - Gateway de WebSockets

```typescript
// src/reports/gateways/reports.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ReportsService } from '../reports.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // Ajustar según tu frontend
    credentials: true,
  },
  namespace: '/reports', // Namespace específico
})
export class ReportsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ReportsGateway.name);

  constructor(private reportsService: ReportsService) {}

  /**
   * Cuando un cliente se conecta
   */
  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
    
    // Enviar mensaje de bienvenida
    client.emit('connected', {
      message: 'Conectado al servidor de reportes',
      clientId: client.id,
      timestamp: new Date(),
    });
  }

  /**
   * Cuando un cliente se desconecta
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Suscribirse a reportes de un paciente
   * Frontend: socket.emit('subscribe-patient', { patientId: '507f...' })
   */
  @SubscribeMessage('subscribe-patient')
  handleSubscribePatient(
    client: Socket,
    data: { patientId: string },
  ): void {
    const room = `patient-${data.patientId}`;
    client.join(room);
    this.logger.log(`Cliente ${client.id} se suscribió a paciente: ${data.patientId}`);
    
    client.emit('subscription-confirmed', {
      room,
      message: `Suscrito a reportes del paciente ${data.patientId}`,
    });
  }

  /**
   * Suscribirse a reportes críticos (triage 4-5)
   */
  @SubscribeMessage('subscribe-critical')
  handleSubscribeCritical(client: Socket): void {
    client.join('critical-reports');
    this.logger.log(`Cliente ${client.id} se suscribió a reportes críticos`);
    
    client.emit('subscription-confirmed', {
      room: 'critical-reports',
      message: 'Suscrito a reportes críticos',
    });
  }

  /**
   * Suscribirse a todos los reportes
   */
  @SubscribeMessage('subscribe-all')
  handleSubscribeAll(client: Socket): void {
    client.join('all-reports');
    this.logger.log(`Cliente ${client.id} se suscribió a todos los reportes`);
    
    client.emit('subscription-confirmed', {
      room: 'all-reports',
      message: 'Suscrito a todos los reportes',
    });
  }

  /**
   * Notifica cuando se crea un nuevo reporte
   * Llamado desde ReportsService
   */
  notifyNewReport(report: any) {
    const rooms = [
      'all-reports',
      `patient-${report.patientId}`,
      report.triage.nivel >= 4 ? 'critical-reports' : null,
    ].filter(Boolean);

    for (const room of rooms) {
      this.server.to(room).emit('report-created', {
        reportId: report._id,
        patientId: report.patientId,
        doctorId: report.doctorId,
        triage: report.triage.nivel,
        diagnostico: report.diagnostico_presuntivo,
        timestamp: new Date(),
        message: `Nuevo reporte: ${report.diagnostico_presuntivo}`,
      });
    }

    this.logger.log(
      `Notificación de nuevo reporte enviada a ${rooms.length} rooms`,
    );
  }

  /**
   * Notifica cuando se completa análisis de un reporte
   */
  notifyAnalysisComplete(reportId: string, analysis: any) {
    this.server.emit('analysis-complete', {
      reportId,
      analysis,
      timestamp: new Date(),
      message: '✅ Análisis completado',
    });
  }

  /**
   * Notifica cuando llegan respuestas de retroalimentación
   */
  notifyFeedbackSubmitted(reportId: string, validation: any) {
    this.server.emit('feedback-submitted', {
      reportId,
      validityScore: validation.validityScore,
      criticalIssues: validation.criticalIssues,
      timestamp: new Date(),
      message: `Retroalimentación recibida. Validez: ${validation.validityScore}%`,
    });
  }

  /**
   * Notifica en tiempo real el progreso del procesamiento
   */
  notifyProcessingProgress(
    reportId: string,
    progress: {
      step: string;
      percentage: number;
      message: string;
    },
  ) {
    this.server.emit('processing-progress', {
      reportId,
      ...progress,
      timestamp: new Date(),
    });
  }
}
```

---

### 3. Integración en ReportsService

```typescript
// En reports.service.ts

import { ReportsGateway } from './gateways/reports.gateway';

@Injectable()
export class ReportsService {
  constructor(
    // ... otros servicios ...
    private reportsGateway: ReportsGateway,
  ) {}

  async processAudioWithCompletePipeline(
    audioBuffer: Buffer,
    dto: ProcessAudioWithFeedbackDto,
    audioFormat: string = 'mp3',
  ): Promise<AudioProcessingPipeline> {
    const startTime = Date.now();
    const reportId = new ObjectId().toString();

    try {
      // Notificar inicio
      this.reportsGateway.notifyProcessingProgress(reportId, {
        step: 'transcription',
        percentage: 10,
        message: '🎙️ Iniciando transcripción...',
      });

      // 1. Transcribir
      const audioResult = await this.audioService.processAudioBuffer(
        audioBuffer,
        audioFormat,
        dto.context,
      );
      const transcription = audioResult.transcription.text;

      // Notificar progreso
      this.reportsGateway.notifyProcessingProgress(reportId, {
        step: 'analysis',
        percentage: 40,
        message: '🧠 Analizando con IA...',
      });

      // 2. Analizar
      const analysisResult = await this.aiService.processClinicDictationWithAudio(
        transcription,
        dto.context,
        false,
      );

      if (!analysisResult.success || !analysisResult.analysis) {
        throw new Error('Fallo en análisis');
      }

      // Notificar progreso
      this.reportsGateway.notifyProcessingProgress(reportId, {
        step: 'feedback',
        percentage: 70,
        message: '🤔 Generando preguntas...',
      });

      // 3. Generar feedback
      let feedbackQuestions: FeedbackQuestion[] = [];
      let questionsWithAudio: any[] = [];

      if (dto.generateFeedback !== false) {
        feedbackQuestions = await this.feedbackService.generateFeedbackQuestions(
          analysisResult.analysis,
          dto.context,
        );

        // Notificar progreso
        this.reportsGateway.notifyProcessingProgress(reportId, {
          step: 'synthesis',
          percentage: 85,
          message: '🎙️ Sintetizando voz...',
        });

        questionsWithAudio =
          await this.feedbackService.synthesizeMultipleFeedbackQuestions(
            feedbackQuestions,
          );
      }

      // 4. Guardar en BD
      const report = await this.reportModel.create({
        // ... datos del reporte ...
      });

      // Notificar que el reporte está completo
      this.reportsGateway.notifyNewReport(report);

      // Notificar análisis completado
      this.reportsGateway.notifyAnalysisComplete(report._id.toString(), {
        triage: analysisResult.analysis.nivel_triage,
        diagnostico: analysisResult.analysis.diagnostico_presuntivo,
      });

      const totalTime = Date.now() - startTime;

      // Notificar finalización
      this.reportsGateway.notifyProcessingProgress(reportId, {
        step: 'complete',
        percentage: 100,
        message: `✅ Completado en ${totalTime}ms`,
      });

      return {
        transcription,
        analysis: analysisResult.analysis,
        feedback: { questions: feedbackQuestions, questionsWithAudio },
        reportId: report._id.toString(),
      };
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      throw error;
    }
  }
}
```

---

### 4. Registrar Gateway en el Módulo

```typescript
// reports.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ReportsGateway } from './gateways/reports.gateway';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AudioService } from './services/audio.service';
import { FeedbackService } from './services/feedback.service';
import { ClinicalReport, ClinicalReportSchema } from './schemas/clinical-report.schema';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    ConfigModule,
    AiModule,
    MongooseModule.forFeature([
      { name: ClinicalReport.name, schema: ClinicalReportSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    AudioService,
    FeedbackService,
    ReportsGateway, // ← Agregar aquí
  ],
  exports: [ReportsService, AudioService, FeedbackService],
})
export class ReportsModule {}
```

---

### 5. Frontend - Cliente WebSocket

```javascript
// frontend/websocket-client.js

class ReportsWebSocketClient {
  constructor(url = 'http://localhost:3000/reports') {
    this.socket = io(url);
    this.setupListeners();
    this.reportId = null;
  }

  setupListeners() {
    // Conexión establecida
    this.socket.on('connected', (data) => {
      console.log('✅ Conectado al servidor:', data.clientId);
    });

    // Desconexión
    this.socket.on('disconnect', () => {
      console.log('❌ Desconectado del servidor');
    });

    // Confirmación de suscripción
    this.socket.on('subscription-confirmed', (data) => {
      console.log('✅ Suscrito a:', data.room);
    });

    // Nuevo reporte creado
    this.socket.on('report-created', (data) => {
      console.log('📊 Nuevo reporte:', data);
      this.onReportCreated(data);
    });

    // Análisis completado
    this.socket.on('analysis-complete', (data) => {
      console.log('✅ Análisis completado:', data);
      this.onAnalysisComplete(data);
    });

    // Progreso de procesamiento
    this.socket.on('processing-progress', (data) => {
      console.log(`${data.message} (${data.percentage}%)`);
      this.onProcessingProgress(data);
    });

    // Retroalimentación enviada
    this.socket.on('feedback-submitted', (data) => {
      console.log('💬 Retroalimentación:', data);
      this.onFeedbackSubmitted(data);
    });
  }

  // Suscribirse a reportes de un paciente
  subscribeToPatient(patientId) {
    this.socket.emit('subscribe-patient', { patientId });
  }

  // Suscribirse a reportes críticos
  subscribeToCritical() {
    this.socket.emit('subscribe-critical');
  }

  // Suscribirse a todos los reportes
  subscribeToAll() {
    this.socket.emit('subscribe-all');
  }

  // Callbacks que pueden ser overrideados
  onReportCreated(data) {
    // Mostrar notificación
    const notif = document.createElement('div');
    notif.className = 'notification notification-' + (data.triage >= 4 ? 'critical' : 'info');
    notif.innerHTML = `
      <strong>${data.message}</strong>
      <br>Triage: ${data.triage}/5
      <br>Diagnóstico: ${data.diagnostico}
    `;
    document.body.appendChild(notif);

    setTimeout(() => notif.remove(), 5000);
  }

  onAnalysisComplete(data) {
    console.log('Análisis disponible:', data.analysis);
  }

  onProcessingProgress(data) {
    // Actualizar barra de progreso
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.style.width = data.percentage + '%';
      progressBar.textContent = data.percentage + '%';
    }

    const message = document.getElementById('progress-message');
    if (message) {
      message.textContent = data.message;
    }
  }

  onFeedbackSubmitted(data) {
    console.log('Puntuación de validez:', data.validityScore);
  }
}

// Uso en el HTML
const wsClient = new ReportsWebSocketClient();

// Cuando el usuario selecciona un paciente
function selectPatient(patientId) {
  wsClient.subscribeToPatient(patientId);
}

// Para ver todos los reportes críticos
function viewCriticalReports() {
  wsClient.subscribeToCritical();
}
```

---

### 6. Flujo WebSocket en Tiempo Real

```
FRONTEND (Cliente)          BACKEND (Servidor)
    │                              │
    ├─ io.connect() ────────→ ReportsGateway
    │                              │
    ├─ connected ←────────── handleConnection()
    │                              │
    ├─ subscribe-patient ───→ handleSubscribePatient()
    │                              │
    ├─ subscription-confirmed ←── client.emit()
    │                              │
    │                    (Usuario sube audio)
    │                              │
    │                    audioBuffer buffer
    │                              │
    │  processing-progress ←── notifyProcessingProgress()
    │  "Transcribiendo 10%"
    │                              │
    │  processing-progress ←── notifyProcessingProgress()
    │  "Analizando 40%"
    │                              │
    │  processing-progress ←── notifyProcessingProgress()
    │  "Generando preguntas 70%"
    │                              │
    │  report-created ←────────── notifyNewReport()
    │  (Datos completos del reporte)
    │                              │
    │  analysis-complete ←────── notifyAnalysisComplete()
    │                              │
    │  processing-progress ←── notifyProcessingProgress()
    │  "Completado 100%"
    │                              │
    │  Mostrar UI con              │
    │  - Transcripción            │
    │  - Análisis                 │
    │  - Preguntas con audio      │
    │                              │
    │  (Usuario responde preguntas)
    │                              │
    ├─ submit-feedback ─────→ /reports/:id/feedback
    │                              │
    │  feedback-submitted ←── notifyFeedbackSubmitted()
    │  (Puntuación de validez)
    │                              │
    ├─ disconnect ──────────→ handleDisconnect()
    │                              │
```

---

## 📊 DASHBOARD DE VISUALIZACIÓN

### ¿Es esencial?

**SÍ, 100% ESENCIAL** para:
- 🚨 Monitoreo de reportes críticos
- 📊 Estadísticas en tiempo real
- 👥 Gestión de pacientes
- ✅ Validación de reportes
- 📈 Análisis de carga de trabajo

---

### 1. Arquitectura del Dashboard

```
DASHBOARD
├── Panel de Control Principal
│   ├── Métricas en tiempo real
│   │   ├── Reportes procesados hoy
│   │   ├── Triajes críticos
│   │   ├── Score promedio
│   │   └── Tiempo de respuesta promedio
│   │
│   ├── Alertas Críticas
│   │   ├── Triage 5 (Emergencias)
│   │   ├── Triage 4 (Urgentes)
│   │   └── Scores bajos (<50)
│   │
│   └── Gráficos en Tiempo Real
│       ├── Distribución de triajes
│       ├── Especialidades más frecuentes
│       ├── Carga por médico
│       └── Validez promedio
│
├── Tabla de Reportes
│   ├── Filtrado por estado
│   ├── Búsqueda por paciente/médico
│   ├── Ordenamiento por triage
│   └── Detalles expandibles
│
├── Gestión de Reportes
│   ├── Ver completo
│   ├── Editar notas
│   ├── Marcar como revisado
│   └── Exportar PDF
│
└── Analytics
    ├── Gráficos históricos
    ├── Tendencias
    ├── Rendimiento por médico
    └── Validez por especialidad
```

---

### 2. HTML del Dashboard

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🏥 Moscati - Dashboard de Reportes</title>
  <link rel="stylesheet" href="dashboard.css">
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="dashboard-container">
    <!-- Sidebar de Navegación -->
    <aside class="sidebar">
      <div class="logo">🏥 Moscati</div>
      <nav>
        <a href="#" onclick="showSection('overview')" class="nav-item active">
          📊 Overview
        </a>
        <a href="#" onclick="showSection('critical')" class="nav-item">
          🚨 Críticos
        </a>
        <a href="#" onclick="showSection('reports')" class="nav-item">
          📋 Reportes
        </a>
        <a href="#" onclick="showSection('analytics')" class="nav-item">
          📈 Analytics
        </a>
      </nav>
    </aside>

    <!-- Contenido Principal -->
    <main class="main-content">
      <!-- Header -->
      <header class="header">
        <h1>Dashboard de Reportes Clínicos</h1>
        <div class="header-stats">
          <span id="connection-status" class="status-indicator">
            ⚪ Desconectado
          </span>
          <span id="current-time"></span>
        </div>
      </header>

      <!-- Secciones -->
      <section id="overview" class="section active">
        <!-- Métricas principales -->
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>📊 Reportes Hoy</h3>
            <p class="metric-value" id="metric-reports">0</p>
            <span class="metric-label">procesados</span>
          </div>

          <div class="metric-card critical">
            <h3>🚨 Críticos</h3>
            <p class="metric-value" id="metric-critical">0</p>
            <span class="metric-label">sin revisar</span>
          </div>

          <div class="metric-card">
            <h3>✅ Score Promedio</h3>
            <p class="metric-value" id="metric-score">--</p>
            <span class="metric-label">validez</span>
          </div>

          <div class="metric-card">
            <h3>⏱️ Tiempo Promedio</h3>
            <p class="metric-value" id="metric-time">--</p>
            <span class="metric-label">segundos</span>
          </div>
        </div>

        <!-- Alertas Críticas -->
        <div class="alerts-section">
          <h2>🚨 Alertas Críticas</h2>
          <div id="alerts-container" class="alerts-list">
            <!-- Se popula con WebSocket -->
          </div>
        </div>

        <!-- Gráficos -->
        <div class="charts-grid">
          <div class="chart-container">
            <canvas id="triageChart"></canvas>
          </div>
          <div class="chart-container">
            <canvas id="specialtyChart"></canvas>
          </div>
        </div>
      </section>

      <!-- Sección de Críticos -->
      <section id="critical" class="section">
        <h2>🚨 Reportes Críticos</h2>
        <div id="critical-reports-table" class="reports-table">
          <!-- Se popula dinámicamente -->
        </div>
      </section>

      <!-- Sección de Reportes -->
      <section id="reports" class="section">
        <h2>📋 Todos los Reportes</h2>
        
        <div class="filters">
          <input
            type="text"
            id="search-input"
            placeholder="Buscar por paciente/médico..."
          >
          <select id="filter-status">
            <option value="">Todos los estados</option>
            <option value="procesado">Procesado</option>
            <option value="revisado">Revisado</option>
            <option value="pendiente">Pendiente</option>
          </select>
          <select id="filter-triage">
            <option value="">Todos los triajes</option>
            <option value="5">Triage 5 (Emergencia)</option>
            <option value="4">Triage 4 (Urgente)</option>
            <option value="3">Triage 3 (Moderado)</option>
          </select>
        </div>

        <div id="reports-table" class="reports-table">
          <!-- Se popula dinámicamente -->
        </div>
      </section>

      <!-- Sección de Analytics -->
      <section id="analytics" class="section">
        <h2>📈 Analytics</h2>
        <div class="analytics-grid">
          <div class="chart-container">
            <canvas id="scoreChart"></canvas>
          </div>
          <div class="chart-container">
            <canvas id="timelineChart"></canvas>
          </div>
        </div>

        <div class="performance-table">
          <h3>👨‍⚕️ Rendimiento por Médico</h3>
          <table id="doctor-performance">
            <thead>
              <tr>
                <th>Médico</th>
                <th>Reportes</th>
                <th>Score Promedio</th>
                <th>Tiempo Promedio</th>
              </tr>
            </thead>
            <tbody>
              <!-- Se popula dinámicamente -->
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <!-- Modal para detalles -->
    <div id="report-modal" class="modal">
      <div class="modal-content">
        <span class="close" onclick="closeModal()">&times;</span>
        <div id="report-details">
          <!-- Se popula dinámicamente -->
        </div>
      </div>
    </div>
  </div>

  <script src="dashboard.js"></script>
  <script src="websocket-client.js"></script>
</body>
</html>
```

---

### 3. CSS del Dashboard

```css
/* dashboard.css */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f5f7fa;
  color: #333;
}

.dashboard-container {
  display: flex;
  height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 250px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: white;
  padding: 20px;
  overflow-y: auto;
}

.logo {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 30px;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease;
}

.nav-item:hover,
.nav-item.active {
  background: rgba(59, 130, 246, 0.3);
  color: white;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  background: white;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.status-indicator.connected::before {
  content: '';
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  display: inline-block;
}

/* Secciones */
.section {
  display: none;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.section.active {
  display: block;
}

/* Métricas */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3b82f6;
}

.metric-card.critical {
  border-left-color: #ef4444;
}

.metric-card h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #0f172a;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 12px;
  color: #999;
}

/* Alertas */
.alerts-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 30px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
}

.alert-item {
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #ef4444;
  background: #fef2f2;
  color: #7f1d1d;
}

/* Tablas */
.reports-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.reports-table table {
  width: 100%;
  border-collapse: collapse;
}

.reports-table th {
  background: #f8fafc;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}

.reports-table td {
  padding: 15px;
  border-bottom: 1px solid #e2e8f0;
}

.reports-table tr:hover {
  background: #f8fafc;
}

/* Modal */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal.active {
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.close {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 28px;
  cursor: pointer;
  color: #999;
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}
```

---

### 4. JavaScript del Dashboard

```javascript
// dashboard.js

class Dashboard {
  constructor() {
    this.wsClient = new ReportsWebSocketClient();
    this.setupEventListeners();
    this.loadInitialData();
    this.updateTime();
    this.initCharts();
  }

  setupEventListeners() {
    // Búsqueda en tiempo real
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.filterReports();
    });

    // Filtros
    document.getElementById('filter-status').addEventListener('change', () => {
      this.filterReports();
    });

    document.getElementById('filter-triage').addEventListener('change', () => {
      this.filterReports();
    });

    // Navegación
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('href') || e.target.textContent;
        this.showSection(section);
      });
    });

    // WebSocket events
    this.wsClient.onReportCreated = (data) => this.handleNewReport(data);
    this.wsClient.onProcessingProgress = (data) => this.handleProgress(data);
    this.wsClient.onFeedbackSubmitted = (data) => this.handleFeedback(data);

    // Suscribirse a reportes críticos
    this.wsClient.subscribeToCritical();
    this.wsClient.subscribeToAll();
  }

  showSection(section) {
    document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');

    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    event.target.classList.add('active');
  }

  async loadInitialData() {
    try {
      const response = await fetch('http://localhost:3000/reports?limit=100');
      const data = await response.json();

      this.updateMetrics(data.reports);
      this.renderReportsTable(data.reports);
    } catch (error) {
      console.error('Error cargando reportes:', error);
    }
  }

  updateMetrics(reports) {
    document.getElementById('metric-reports').textContent = reports.length;

    const critical = reports.filter((r) => r.triage.nivel >= 4).length;
    document.getElementById('metric-critical').textContent = critical;

    const avgScore =
      reports.reduce((sum, r) => sum + (r.metadata?.validationResult?.validityScore || 0), 0) /
      reports.length;
    document.getElementById('metric-score').textContent = Math.round(avgScore) + '%';

    const avgTime =
      reports.reduce((sum, r) => sum + r.horasProcesamiento, 0) / reports.length / 1000;
    document.getElementById('metric-time').textContent = avgTime.toFixed(1);
  }

  renderReportsTable(reports) {
    const tbody = document.querySelector('#reports-table tbody') || this.createTable();

    tbody.innerHTML = reports
      .map(
        (r) => `
      <tr onclick="showReportDetails('${r._id}')">
        <td>
          <span class="triage-badge triage-${r.triage.nivel}">
            T${r.triage.nivel}
          </span>
        </td>
        <td>${r.patientId}</td>
        <td>${r.diagnostico_presuntivo}</td>
        <td>${r.especialidad}</td>
        <td>
          ${r.metadata?.validationResult?.validityScore || '--'}%
        </td>
        <td>
          <span class="status ${r.estado}">${r.estado}</span>
        </td>
      </tr>
    `,
      )
      .join('');
  }

  createTable() {
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Triage</th>
          <th>Paciente</th>
          <th>Diagnóstico</th>
          <th>Especialidad</th>
          <th>Validez</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    document.getElementById('reports-table').appendChild(table);
    return table.querySelector('tbody');
  }

  filterReports() {
    const search = document.getElementById('search-input').value;
    const status = document.getElementById('filter-status').value;
    const triage = document.getElementById('filter-triage').value;

    const rows = document.querySelectorAll('#reports-table tbody tr');

    rows.forEach((row) => {
      let show = true;

      if (search) {
        show = row.textContent.toLowerCase().includes(search.toLowerCase());
      }

      if (show && status) {
        show = row.textContent.includes(status);
      }

      if (show && triage) {
        show = row.querySelector('.triage-badge')?.textContent.includes('T' + triage);
      }

      row.style.display = show ? '' : 'none';
    });
  }

  handleNewReport(data) {
    // Añadir a la tabla
    this.loadInitialData();

    // Si es crítico, mostrar alerta
    if (data.triage >= 4) {
      this.showAlert(
        `🚨 Reporte crítico: ${data.diagnostico} (Triage ${data.triage}/5)`,
        'critical',
      );
    }
  }

  handleProgress(data) {
    console.log(`${data.message} (${data.percentage}%)`);
  }

  handleFeedback(data) {
    console.log(`Validez: ${data.validityScore}%`);
  }

  showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-item alert-${type}`;
    alertDiv.textContent = message;

    const container = document.getElementById('alerts-container');
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => alertDiv.remove(), 10000);
  }

  initCharts() {
    // Chart de Triajes
    const triageCtx = document.getElementById('triageChart')?.getContext('2d');
    if (triageCtx) {
      new Chart(triageCtx, {
        type: 'doughnut',
        data: {
          labels: ['Triage 5', 'Triage 4', 'Triage 3', 'Triage 2', 'Triage 1'],
          datasets: [
            {
              data: [5, 12, 28, 40, 15],
              backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'],
            },
          ],
        },
      });
    }
  }

  updateTime() {
    const now = new Date().toLocaleTimeString();
    document.getElementById('current-time').textContent = now;
    setTimeout(() => this.updateTime(), 1000);
  }
}

// Inicializar dashboard
const dashboard = new Dashboard();

function showSection(sectionName) {
  dashboard.showSection(sectionName);
}

async function showReportDetails(reportId) {
  const response = await fetch(`http://localhost:3000/reports/${reportId}`);
  const data = await response.json();

  const modal = document.getElementById('report-modal');
  const details = document.getElementById('report-details');

  details.innerHTML = `
    <h2>Reporte ${reportId}</h2>
    <p><strong>Paciente:</strong> ${data.report.patientId}</p>
    <p><strong>Diagnóstico:</strong> ${data.report.diagnostico_presuntivo}</p>
    <p><strong>Triage:</strong> ${data.report.triage.nivel}/5</p>
    <p><strong>Validez:</strong> ${data.report.metadata?.validationResult?.validityScore || '--'}%</p>
    <hr>
    <h3>SOAP</h3>
    <p><strong>Subjetivo:</strong> ${data.report.soap.subjetivo}</p>
    <p><strong>Objetivo:</strong> ${data.report.soap.objetivo}</p>
    <p><strong>Análisis:</strong> ${data.report.soap.analisis}</p>
    <p><strong>Plan:</strong> ${data.report.soap.plan}</p>
  `;

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('report-modal').classList.remove('active');
}
```

---

### 5. Integración Completa

```
FRONTEND                          BACKEND                      DATABASE
│                                 │                             │
├─ Seleccionar Audio             │                             │
│  ├─ FormData (multipart)       │                             │
│  └─ POST /upload-audio ───────→ ReportsController            │
│                                 │                             │
│                                 ├─ Validar archivo            │
│                                 ├─ AudioService.transcribe()  │
│                                 │  └─ Gemini API             │
│                                 │                             │
│                                 ├─ GeminiService.analyze()   │
│                                 │  └─ Gemini API             │
│                                 │                             │
│                                 ├─ FeedbackService.generate() │
│                                 │  └─ Gemini API             │
│                                 │                             │
│                                 ├─ ElevenLabs.synthesize()   │
│                                 │  └─ ElevenLabs API        │
│                                 │                             │
│                                 ├─ reportModel.create() ────→ MongoDB
│                                 │                             │
│ WebSocket: connected ←───────── socket.io                    │
│ WebSocket: processing-progress ←───────── notifyProgress()   │
│ WebSocket: report-created ←───────── notifyNewReport()       │
│ WebSocket: analysis-complete ←────── notifyAnalysisComplete()│
│                                 │                             │
│ Mostrar Resultado               │                             │
│ - Transcripción                 │                             │
│ - Análisis SOAP                 │                             │
│ - Preguntas con Audio           │                             │
│ - Barra de progreso             │                             │
│                                 │                             │
│ Escuchar Preguntas (Web Audio API)
│                                 │                             │
│ Responder Preguntas             │                             │
│ POST /submit-feedback ─────────→ FeedbackService.process()   │
│                                 │                             │
│ WebSocket: feedback-submitted ←───────── notifyFeedback()    │
│                                 │                             │
│ Mostrar Score                   │                             │
│ - Validez: 87%                  │                             │
│ - Issues                        │                             │
│ - Recomendaciones               │                             │
│                                 │                             │
├─ Dashboard en Tiempo Real       │                             │
│  ├─ Métricas                    │                             │
│  ├─ Alertas Críticas            │                             │
│  ├─ Tabla de Reportes           │                             │
│  └─ Gráficos                    │                             │
│     (Todo actualiza con WebSocket)                           │
│                                 │                             │
```

---

## 📋 RESUMEN

### Frontend Formato Web ✅
- **FormData multipart** ← Lo soporta el backend 100%
- **Archivos de audio** (MP3, WAV, OGG, etc.)
- **Máximo 25MB** (limitación de Gemini)

### Scoring Detallado ✅
- **0-100** basado en 4 componentes
- Consistencia + Completitud + Urgencia + Claridad
- Issues críticos automáticos
- Recomendaciones inteligentes

### WebSockets ✅
- **Tiempo Real** para actualizaciones
- **Progreso** de procesamiento (10% → 100%)
- **Notificaciones** de reportes críticos
- **Dashboard** en vivo

### Dashboard Esencial ✅
- **Métricas** en tiempo real
- **Alertas críticas** destacadas
- **Tabla filtrable** de reportes
- **Gráficos** de distribución
- **Analytics** de rendimiento

---

**¡Todo está listo para implementar!** 🚀