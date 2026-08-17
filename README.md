# Módulo de Monitoreo de Correos Omnicanal — Entorno de Pruebas Sandbox

Este módulo es un prototipo funcional e independiente (Standalone MVP) diseñado para el rol de Operador (Irina) en la plataforma **Afinitive**. Permite enviar correos de prueba usando la API de Resend y rastrear de forma visual y en tiempo real cuándo un cliente los abre.

---

## 🛠️ Requisitos Previos
- **Node.js** (v18 o superior recomendado, verificado con v22).
- **npm** o **yarn**.
- Una cuenta en **Supabase** (para la base de datos PostgreSQL).
- Una cuenta en **Resend** (para el servicio de envío y tracking de correos).
- **Ngrok** instalado (o usando `npx ngrok`) para canalizar los webhooks en el entorno de desarrollo local.

---

## 🗄️ 1. Configuración de Base de Datos (Supabase)
1. Inicia sesión en tu panel de [Supabase](https://supabase.com/).
2. Ve al **SQL Editor** de tu proyecto.
3. Copia y ejecuta el script completo que se encuentra en:
   👉 `modulo_operador/supabase/schema.sql`
4. Esto creará la tabla `email_tracking_test` con las políticas de Row Level Security (RLS) y acceso público de lectura necesarias para este entorno de pruebas.

---

## 🟢 2. Configuración y Ejecución del Backend (NestJS)
El backend corre sobre NestJS y actúa como el manejador seguro de credenciales para enviar correos y procesar webhooks.

1. Navega al directorio del backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias (si no se instalaron automáticamente):
   ```bash
   npm install
   ```
3. Crea tu archivo de configuración `.env` copiando el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
4. Abre el archivo `.env` en tu editor y rellena las variables con tus credenciales de Supabase y Resend:
   - `SUPABASE_URL`: La URL del proyecto en Supabase (ej: `https://xxxx.supabase.co`).
   - `SUPABASE_SERVICE_ROLE_KEY`: La clave de rol de servicio (Service Role Key) de Supabase para poder escribir en la base de datos (puedes usar la Anon Key si has deshabilitado RLS, pero se recomienda Service Role Key).
   - `RESEND_API_KEY`: Tu API Key creada en la sección "API Keys" de Resend.
   - `RESEND_SENDER_EMAIL`: Un correo verificado en tu cuenta de Resend. Si no tienes un dominio propio configurado, usa `onboarding@resend.dev` (sólo podrás enviar correos a tu propia dirección registrada).
5. Inicia el servidor del backend en modo de desarrollo:
   ```bash
   npm run start:dev
   ```
   *El backend estará escuchando por defecto en el puerto `3001` (http://localhost:3001).*

---

## 💻 3. Configuración y Ejecución del Frontend (React + Vite)
El frontend proporciona una interfaz interactiva de alta fidelidad estética (Azul Marino `#0D1B2A` y Dorado `#C9A84C`) para la operadora Irina.

1. Navega al directorio del frontend:
   ```bash
   cd ../frontend
   ```
2. Instala las dependencias (si no se instalaron automáticamente):
   ```bash
   npm install
   ```
3. Crea tu archivo de configuración `.env` copiando el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
4. Configura el archivo `.env` con las credenciales públicas de Supabase:
   - `VITE_SUPABASE_URL`: La misma URL del proyecto de Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Tu Anon Key pública de Supabase (necesaria para que el cliente haga lecturas en tiempo real de la tabla).
   - `VITE_BACKEND_URL`: `http://localhost:3001` (La URL local de tu backend de NestJS).
5. Inicia el servidor de desarrollo del frontend:
   ```bash
   npm run dev
   ```
   *El frontend por defecto estará disponible en http://localhost:5173.*

---

## 🌐 4. Exponer Localhost y Configurar Webhooks de Resend
Para capturar el evento en tiempo real cuando el cliente abre el correo electrónico, Resend necesita enviar una petición HTTP (Webhook) a tu servidor backend. Como tu servidor está en `localhost`, debes exponerlo a internet usando **Ngrok**.

1. Con tu backend de NestJS corriendo en el puerto `3001`, abre otra terminal y ejecuta:
   ```bash
   npx ngrok http 3001
   ```
2. Ngrok generará una URL pública segura tipo HTTPS (por ejemplo: `https://a1b2-34-56-78.ngrok-free.app`). Copia esa URL.
3. Ve a tu panel de **Resend** > **Webhooks** ([https://resend.com/webhooks](https://resend.com/webhooks)).
4. Haz clic en **Add Webhook**.
5. Configura los siguientes campos:
   - **Endpoint URL**: Agrega la URL provista por Ngrok seguida del path `/api/test-email/webhook`
     *Ejemplo:* `https://a1b2-34-56-78.ngrok-free.app/api/test-email/webhook`
   - **Events**: Marca la casilla del evento **`email.opened`**.
6. Haz clic en **Add**. ¡Listo! Ahora Resend notificará a tu servidor NestJS local cada vez que un correo enviado sea abierto.

---

## 🧪 5. Guía de Pruebas del Flujo Completo
1. Abre el frontend en tu navegador (http://localhost:5173).
2. En el panel superior, escribe una dirección de correo válida en la que puedas recibir correos y pulsa **Enviar Correo**.
   - *Nota:* Si estás usando una cuenta gratuita de Resend sin dominio verificado, debes colocar la dirección de correo con la que te registraste en Resend (o una autorizada en el Sandbox de Resend).
3. La interfaz agregará el registro a la tabla de inmediato con el estado **Enviado** (Badge Azul).
4. Revisa la bandeja de entrada del correo destinatario y ábrelo. Asegúrate de permitir la carga de imágenes si tu gestor de correo (como Gmail u Outlook) las bloquea, ya que el pixel de seguimiento de Resend requiere descargar una imagen invisible para registrar la apertura.
5. Regresa al panel de monitoreo. En un máximo de 5 segundos (por el polling del frontend) o al presionar **Actualizar**, verás que el estado cambia dinámicamente a **Leído** (Badge Verde) y se registrará la fecha/hora exacta en la que se abrió el correo.
