# Guía de Despliegue en GitHub Pages 🚀

Este proyecto es una aplicación web estática (HTML, CSS y JavaScript puros con Bootstrap), por lo cual puedes desplegarla de manera **completamente gratuita** utilizando **GitHub Pages**.

Sigue estos sencillos pasos para subir y publicar la aplicación:

---

## Paso 1: Crear un Repositorio en GitHub
1. Inicia sesión en tu cuenta de [GitHub](https://github.com).
2. Haz clic en el botón **New** (Nuevo) para crear un repositorio.
3. Configura los siguientes campos:
   - **Repository name** (Nombre del repositorio): `eli-estadistica` (o el nombre que prefieras).
   - **Public**: Asegúrate de que el repositorio sea **Público** (requerido para GitHub Pages gratuito).
   - Deja las demás opciones (README, .gitignore) sin marcar.
4. Haz clic en **Create repository** (Crear repositorio).

---

## Paso 2: Subir tus Archivos a GitHub
Puedes subir el código utilizando la consola Git o directamente desde la interfaz web de GitHub:

### Opción A: A través de la Interfaz Web (Recomendado si no usas Git en consola)
1. En la página de tu nuevo repositorio recién creado, busca el enlace que dice **"uploading an existing file"** (subir un archivo existente).
2. Selecciona y arrastra todos los archivos de esta carpeta (`index.html`, `style.css`, `app.js`, `DEPLOY_GITHUB.md`) a la ventana del navegador.
3. Espera a que carguen y haz clic en **Commit changes** (Confirmar cambios).

### Opción B: Usando la Consola de Git (Git Bash o VS Code Terminal)
Si tienes Git instalado en tu computadora, abre tu terminal en esta carpeta y ejecuta:
```bash
git init
git add .
git commit -m "Initial commit - Eli-Estadistica MVC"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/eli-estadistica.git
git push -u origin main
```
*(Reemplaza `TU_USUARIO` por tu nombre de usuario real en GitHub).*

---

## Paso 3: Activar GitHub Pages
Una vez que tus archivos estén subidos a GitHub, actívalo siguiendo estos pasos:

1. Ve a la pestaña **Settings** (Configuración) en el menú superior de tu repositorio en GitHub.
2. En la barra lateral izquierda, busca la sección **Code and automation** y haz clic en **Pages**.
3. En la sección **Build and deployment**:
   - Bajo **Source** (Origen), selecciona **Deploy from a branch** (Desplegar desde una rama).
   - Bajo **Branch** (Rama), selecciona `main` en el primer menú desplegable, y `/ (root)` (raíz) en el segundo.
   - Haz clic en **Save** (Guardar).

---

## Paso 4: ¡Tu Aplicación está Lista!
1. GitHub tardará entre 1 y 2 minutos en procesar y publicar tu sitio.
2. Refresca la página de **Settings > Pages**. Verás un mensaje en la parte superior que dice:
   > *"Your site is live at: `https://TU_USUARIO.github.io/eli-estadistica/`"*
3. Haz clic en ese enlace para acceder a tu aplicación desde cualquier teléfono, tableta o computadora.

---

## Actualizaciones Futuras
Cada vez que realices cambios en los archivos locales y los subas/actualices en tu repositorio de GitHub, la aplicación web publicada se actualizará automáticamente en unos minutos.
