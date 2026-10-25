# Mis Comidas – puesta en marcha

## 1. Publicar en GitHub Pages
1. Crea un repositorio nuevo en GitHub (público, por ejemplo `mis-comidas`).
2. Sube el contenido de esta carpeta (`index.html`, `config.js`, `sw.js`, `manifest.webmanifest`, `icon-*.png`).
   ```
   cd /home/kaleb/Documents/Claude/recordatorio-comidas
   git init -b main && git add index.html config.js sw.js manifest.webmanifest icon-192.png icon-512.png
   git commit -m "Mis Comidas"
   git remote add origin https://github.com/TU_USUARIO/mis-comidas.git
   git push -u origin main
   ```
3. En el repositorio: **Settings → Pages → Branch: main / (root) → Save**.
4. Queda en `https://TU_USUARIO.github.io/mis-comidas/`.

## 2. Crear el ID de cliente de Google (gratis)
1. Entra a <https://console.cloud.google.com> y crea un proyecto (ej. "Mis Comidas").
2. **APIs y servicios → Biblioteca** → busca **Google Calendar API** → **Habilitar**.
3. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo**. Pon nombre de la app y tu correo.
   - En **Permisos (Scopes)** agrega `.../auth/calendar.app.created` y `.../auth/calendar.calendarlist.readonly`.
   - Deja la app en estado **Pruebas** y en **Usuarios de prueba** agrega el correo de Gmail de ella (y el tuyo).
4. **Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo **Aplicación web**:
   - **Orígenes de JavaScript autorizados**: `https://TU_USUARIO.github.io` (sin la ruta `/mis-comidas`; para probar en tu compu agrega también `http://localhost:8080`).
   - No hace falta URI de redireccionamiento.
5. Copia el **ID de cliente** (`xxxx.apps.googleusercontent.com`) y pégalo en `config.js`:
   ```js
   window.CONFIG = { googleClientId: 'xxxx.apps.googleusercontent.com' };
   ```
   Vuelve a hacer `git add config.js && git commit -m "ID de Google" && git push`.
   (El ID de cliente no es secreto; es normal que quede en el sitio.)

## 3. Usarla
1. Ella abre la dirección en Chrome del teléfono y la instala ("Instalar app").
2. **Ajustes → Conectar con Google**, elige su cuenta y acepta los permisos. Como la app está en "Pruebas", Google mostrará un aviso de "app no verificada": **Continuar**.
3. La app crea el calendario **"Mis Comidas"** y guarda ahí las comidas. Cualquier cambio se sincroniza solo.

## Notas
- En modo "Pruebas" Google pide volver a iniciar sesión cada cierto tiempo (hasta 7 días). Si aparece un error al sincronizar, basta con tocar **Sincronizar ahora**.
- Lo que se sincroniza: comidas, horarios, alimentos y minutos de aviso. Las marcas de "Ya comí" son solo de cada teléfono.
- Los eventos llevan alarma del calendario, así que además de la notificación de la app puede sonar la del Calendario de Google. Si no quieres las dos, en la app de Google Calendar quita las notificaciones del calendario "Mis Comidas".
- Si borras o editas el evento en Google Calendar, la app lo recoge la próxima vez que se abre.
