# 08. Progressive Web App (PWA) y Notificaciones Web Push

Documentación técnica del soporte PWA standalone, Service Worker y entrega de notificaciones Web Push firmadas con VAPID.

---

## 1. Arquitectura PWA Mobile-First

1. **Manifest Standalone (`public/manifest.json`)**:
   - `display: standalone`: Oculta la barra de navegación del navegador (Safari / Chrome), ejecutando la aplicación a pantalla completa como una app nativa.
   - `theme_color: #059669`: Tinte de barra de estado móvil.
   - Iconos PWA: Generados en 192x192 y 512x512 maskable en `public/icons/`.
2. **Instalación Ergonómica**:
   - Componente [`PwaPrompt.tsx`](../../src/components/PwaPrompt.tsx):
     - **En Android / Chrome**: Captura el evento `beforeinstallprompt` y presenta un botón *"Instalar App"*.
     - **En iOS Safari**: Detecta el dispositivo e instruye al usuario a usar *"Compartir" -> "Agregar a Inicio"*.

---

## 2. Web Push Notifications (VAPID)

La plataforma utiliza el estándar **Web Push W3C** firmado criptográficamente con claves VAPID (Voluntary Application Server Identification), permitiendo enviar notificaciones push en segundo plano sin depender de tiendas de aplicaciones (App Store / Google Play).

```mermaid
sequenceDiagram
    actor Usuario
    participant App as PWA (Browser)
    participant SW as Service Worker (sw.js)
    participant Server as Next.js Server Actions
    participant DB as Supabase (push_subscriptions)
    participant PushService as Web Push Service (Google FCM / Apple APNs)

    Usuario->>App: Clic en "Activar Notificaciones"
    App->>App: Notification.requestPermission()
    App->>SW: pushManager.subscribe(applicationServerKey)
    SW->>PushService: Registra dispositivo
    PushService-->>SW: Retorna Endpoint + Keys (p256dh, auth)
    App->>Server: savePushSubscription()
    Server->>DB: UPSERT push_subscriptions
    Note over Server,PushService: DISPARADORES AUTOMÁTICOS
    Server->>PushService: webpush.sendNotification()
    PushService->>SW: Dispara evento 'push'
    SW-->>Usuario: Muestra notificación con vibración y sonido
```

---

## 3. Disparadores Automáticos Implementados

1. **Auto-Promoción de Lista de Espera**:
   - Al liberarse un cupo y ascender el primer socio en espera, se despacha:
     - **Título**: *¡Subiste de Lista de Espera! 🎉*
     - **Mensaje**: *Se liberó un cupo en el partido y quedaste confirmado automáticamente.*
2. **Aprobación de Invitados**:
   - Al aprobar un administrador a un invitado externo:
     - **Título**: *¡Invitado Aprobado! ✅*
     - **Mensaje**: *Tu invitado [Nombre] fue aprobado y confirmado para el partido.*
3. **Apertura de Votación MVP**:
   - Al finalizar el encuentro:
     - **Título**: *¡Vota al MVP del Partido! 🏆*
     - **Mensaje**: *El partido finalizó. Tienes 24hs para elegir a la figura del encuentro.*
4. **Depuración Automática de Suscripciones**:
   - Si un dispositivo desinstala la app o revoca permisos (código HTTP 404/410), el servidor elimina automáticamente el registro de `push_subscriptions`.
