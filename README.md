# GES Assistant v1.0

> Gestor de automatizaciones con IA para Chrome. Se ejecuta solo, vive en tu barra de herramientas.

![GES Assistant](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat-square&logo=googlechrome)
![Version](https://img.shields.io/badge/version-1.0.0-534AB7?style=flat-square)
![Plan Gratuito](https://img.shields.io/badge/Plan_Gratuito-5_ejecuciones%2Fdía-1D9E75?style=flat-square)
![Plan Pro](https://img.shields.io/badge/Plan_Pro-$5%2Fmes-BA7517?style=flat-square)

---

## ¿Qué es GES Assistant?

GES Assistant es una extensión de Chrome que detecta automáticamente la página que estás visitando y ejecuta automatizaciones con IA sin que tengas que hacer nada. Resume emails, genera posts, extrae datos, traduce texto y mucho más — todo desde un panel de control en tu navegador.

---

## Funcionalidades

- Detecta Gmail, LinkedIn, Notion, Google Docs, Twitter y cualquier página genérica
- Ejecuta automatizaciones con un clic o de forma programada
- Llama a la API de Anthropic (Claude) directamente desde el navegador
- Panel de control completo con estadísticas en tiempo real
- Sistema de planes: Gratuito, Pro y Empresa
- Menú de clic derecho para resumir o traducir texto seleccionado
- Notificaciones del sistema al completar tareas
- Atajos de teclado configurables

---

## Estructura del proyecto

```
ges-assistant/
├── manifest.json       # Configuración y permisos de la extensión
├── background.js       # Service Worker: motor de IA, alarmas y límites
├── content.js          # Inyectado en páginas: detecta contexto y ejecuta
├── popup.html          # Interfaz del dashboard (ventana emergente)
├── popup.js            # Lógica del dashboard
├── options.html        # Página de opciones avanzadas (opcional)
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Planes

| Feature                    | Gratuito | Pro ($5/mes) | Empresa |
|----------------------------|----------|--------------|---------|
| Ejecuciones diarias        | 5        | Ilimitadas   | Ilimitadas |
| Automatizaciones activas   | 3        | Ilimitadas   | Ilimitadas |
| Modelo de IA               | Claude Haiku | Claude Sonnet | Claude Sonnet |
| Programación por horario   | ✗        | ✓            | ✓ |
| Exportar informes          | ✗        | ✓            | ✓ |
| Soporte prioritario        | ✗        | ✓            | ✓ |
| API propia                 | ✗        | ✗            | ✓ |
| Usuarios en equipo         | ✗        | ✗            | Ilimitados |

---

## Instalación local (desarrollo)

### 1. Clona el repositorio

```bash
git clone https://github.com/TU_USUARIO/ges-assistant.git
cd ges-assistant
```

### 2. Añade tus iconos

Crea la carpeta `icons/` y añade imágenes PNG en los tamaños: 16, 32, 48 y 128px.
Puedes usar cualquier generador de iconos online o herramientas como Figma.

### 3. Configura tu API key

Puedes añadirla directamente en el popup de la extensión (pestaña Ajustes) una vez instalada.

### 4. Carga la extensión en Chrome

1. Abre Chrome y ve a `chrome://extensions`
2. Activa el **Modo desarrollador** (esquina superior derecha)
3. Haz clic en **"Cargar descomprimida"**
4. Selecciona la carpeta `ges-assistant/`
5. La extensión aparecerá en tu barra de herramientas

---

## Publicar en la Chrome Web Store

### Paso 1 — Crear cuenta de desarrollador

1. Ve a [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
2. Inicia sesión con tu cuenta de Google
3. Paga la tarifa única de registro: **$5 USD**

### Paso 2 — Preparar el paquete

Crea un archivo ZIP con todos los archivos del proyecto (sin incluir la carpeta raíz):

```bash
# Desde dentro de la carpeta del proyecto
zip -r ges-assistant-v1.0.zip . --exclude "*.git*" --exclude "README.md" --exclude "*.DS_Store"
```

En Windows puedes seleccionar todos los archivos, clic derecho → Comprimir.

### Paso 3 — Subir a la Developer Console

1. En la Developer Console haz clic en **"Nuevo elemento"**
2. Sube el archivo `.zip`
3. Completa la ficha de la extensión:
   - Nombre: GES Assistant
   - Descripción corta (hasta 132 caracteres)
   - Descripción larga (explica las funciones principales)
   - Capturas de pantalla (mínimo 1, tamaño 1280×800 o 640×400)
   - Icono de 128×128px
   - Categoría: Productividad
4. En **Privacidad**, declara para qué usas cada permiso (obligatorio)
5. Haz clic en **"Enviar para revisión"**

### Paso 4 — Revisión de Google

El proceso tarda entre **1 y 3 días hábiles**. Google revisa:
- Que los permisos declarados coincidan con el uso real
- Que no haya código ofuscado sin justificar
- Que la política de privacidad exista (si recoges datos)

---

## Publicar en GitHub Pages (landing page)

```bash
# 1. Sube el código
git add .
git commit -m "feat: GES Assistant v1.0 inicial"
git push origin main

# 2. En GitHub → Settings → Pages
# Source: Deploy from branch → main → / (root)
# Tu landing quedará en: https://TU_USUARIO.github.io/ges-assistant
```

---

## Atajos de teclado

| Atajo           | Acción                              |
|-----------------|-------------------------------------|
| Alt+Shift+G     | Abrir el popup de GES Assistant     |
| Alt+Shift+R     | Ejecutar automatización en esta página |
| Alt+Shift+A     | Activar / pausar el asistente       |

---

## Variables de entorno y configuración

La API key de Anthropic se guarda en `chrome.storage.sync` (cifrado por Chrome, sincronizado entre dispositivos). Nunca se expone en el código fuente.

---

## Contribuir

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feature/mi-mejora`
3. Haz commit: `git commit -m 'feat: descripción del cambio'`
4. Push: `git push origin feature/mi-mejora`
5. Abre un Pull Request

---

## Licencia

MIT © 2025 GES Assistant
