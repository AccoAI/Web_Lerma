# Ver el sitio en Vercel

## Opción A: Vercel CLI (la más rápida)

1. **Abre PowerShell o CMD** (no hace falta Git ni GitHub).

2. **Instala Vercel CLI** (solo la primera vez):
   ```
   npm install -g vercel
   ```

3. **Entra en la carpeta del proyecto:**
   ```
   cd "C:\Users\vitia\OneDrive\Escritorio\ADRINOS SL\Web_Lerma_Saldaña"
   ```

4. **Inicia sesión en Vercel** (solo la primera vez):
   ```
   vercel login
   ```
   Te abrirá el navegador para iniciar sesión con GitHub, GitLab, Bitbucket o email.

5. **Despliega:**
   ```
   vercel
   ```
   La primera vez te preguntará nombre del proyecto y carpeta; puedes dejar los valores por defecto pulsando Enter.

6. **Para publicar en producción:**
   ```
   vercel --prod
   ```

Al terminar, en la terminal verás una URL tipo `https://tu-proyecto-xxxx.vercel.app`. Esa es la web en Vercel.

---

## Opción B: Desde la web de Vercel (con GitHub)

1. **Sube el proyecto a GitHub:**
   - Crea un repo en https://github.com/new
   - En la carpeta del proyecto, en PowerShell/CMD:
     ```
     git init
     git add .
     git commit -m "Deploy Golf Lerma"
     git branch -M main
     git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
     git push -u origin main
     ```

2. **Conecta Vercel con el repo:**
   - Entra en https://vercel.com
   - **Add New** → **Project**
   - **Import** el repositorio de GitHub
   - **Deploy**

A partir de ahí, cada `git push` a `main` generará un nuevo despliegue automático.

---

## Páginas para revisar tras el deploy

- `https://tu-url.vercel.app/`
- `https://tu-url.vercel.app/paquete-golf-vino.html`
- `https://tu-url.vercel.app/simulador.html`
- `https://tu-url.vercel.app/hazte-socio.html`
- `https://tu-url.vercel.app/area-socio.html`
