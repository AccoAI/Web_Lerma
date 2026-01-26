# Instrucciones para Desplegar en Vercel

## Opción 1: Despliegue desde la Interfaz Web de Vercel (Recomendado)

1. **Preparar el repositorio Git:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Subir a GitHub/GitLab/Bitbucket:**
   - Crea un repositorio nuevo en tu plataforma Git preferida
   - Conecta tu repositorio local y haz push:
   ```bash
   git remote add origin <URL_DE_TU_REPOSITORIO>
   git branch -M main
   git push -u origin main
   ```

3. **Desplegar en Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con tu cuenta (GitHub, GitLab, o Bitbucket)
   - Haz clic en "Add New Project"
   - Importa tu repositorio
   - Vercel detectará automáticamente la configuración
   - Haz clic en "Deploy"
   - ¡Listo! Tu sitio estará en línea

## Opción 2: Despliegue desde la Terminal (CLI)

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Iniciar sesión:**
   ```bash
   vercel login
   ```

3. **Desplegar:**
   ```bash
   vercel
   ```

4. **Para producción:**
   ```bash
   vercel --prod
   ```

## Estructura del Proyecto

```
Web_Lerma_Saldaña/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos
├── js/
│   └── main.js         # JavaScript
├── FOTOS/              # Imágenes
├── vercel.json         # Configuración de Vercel
└── .gitignore          # Archivos a ignorar
```

## Notas Importantes

- El proyecto es un sitio estático, no requiere build
- Todas las rutas apuntan a archivos estáticos
- Las imágenes están en la carpeta `FOTOS/`
- Asegúrate de que todas las rutas de imágenes sean relativas (ej: `FOTOS/imagen.jpg`)

## Configuración Adicional

Si necesitas configurar dominios personalizados o variables de entorno, puedes hacerlo desde el dashboard de Vercel después del despliegue inicial.

