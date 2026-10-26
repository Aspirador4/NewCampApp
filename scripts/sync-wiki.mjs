#!/usr/bin/env node

/**
 * Script para sincronizar automáticamente la documentación de docs/wiki/
 * hacia el repositorio GitHub Wiki (https://github.com/Aspirador4/NewCampApp.wiki.git).
 * 
 * Uso:
 *   node scripts/sync-wiki.mjs
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

const REPO_OWNER = 'Aspirador4'
const REPO_NAME = 'NewCampApp'
const WIKI_REMOTE_BASE = `github.com/${REPO_OWNER}/${REPO_NAME}.wiki.git`

console.log('🚀 Iniciando sincronización de Wiki hacia GitHub...')

// 1. Obtener token de autenticación desde GitHub CLI
let token = ''
try {
  token = execSync('gh auth token', { encoding: 'utf8' }).trim()
} catch {
  console.error('❌ Error: GitHub CLI no está autenticado. Ejecuta "gh auth login".')
  process.exit(1)
}

const authenticatedRemote = `https://${REPO_OWNER}:${token}@${WIKI_REMOTE_BASE}`

// 2. Verificar si el repositorio Wiki ya fue inicializado en GitHub
try {
  execSync(`git ls-remote ${authenticatedRemote}`, { stdio: 'pipe' })
  console.log('✅ Repositorio Wiki de GitHub detectado.')
} catch {
  console.error('\n⚠️ El repositorio GitHub Wiki aún no ha sido inicializado.')
  console.error('👉 Por favor ingresa a: https://github.com/' + REPO_OWNER + '/' + REPO_NAME + '/wiki')
  console.error('👉 Haz clic en "Create the first page", escribe un título y pulsa "Save page".')
  console.error('👉 Luego vuelve a ejecutar este script: node scripts/sync-wiki.mjs\n')
  process.exit(1)
}

// 3. Crear directorio temporal para clonar y preparar la wiki
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'campapp-wiki-'))
console.log(`📁 Clonando wiki en: ${tempDir}`)

try {
  execSync(`git clone ${authenticatedRemote} "${tempDir}"`, { stdio: 'inherit' })

  const wikiSourceDir = path.resolve('docs/wiki')
  const mapping = [
    { src: 'INDEX.md', dest: 'Home.md' },
    { src: '01_ARQUITECTURA_TECNICA.md', dest: '01-Arquitectura-Tecnica.md' },
    { src: '02_BASE_DE_DATOS_Y_MIGRACIONES.md', dest: '02-Base-de-Datos-y-Migraciones.md' },
    { src: '03_AUTENTICACION_Y_PERFILES.md', dest: '03-Autenticacion-y-Perfiles.md' },
    { src: '04_MODELO_FINANCIERO_Y_DEUDAS.md', dest: '04-Modelo-Financiero-y-Deudas.md' },
    { src: '05_MODULO_EVENTOS_Y_LISTA_ESPERA.md', dest: '05-Modulo-Eventos-y-Lista-Espera.md' },
    { src: '06_MODULO_INVITADOS_Y_MODERACION.md', dest: '06-Modulo-Invitados-y-Moderacion.md' },
    { src: '07_SISTEMA_MVP_Y_ESTADISTICAS.md', dest: '07-Sistema-MVP-y-Estadisticas.md' },
    { src: '08_PWA_Y_WEB_PUSH.md', dest: '08-PWA-y-Web-Push.md' },
  ]

  // Copiar y adaptar enlaces para formato de GitHub Wiki
  for (const item of mapping) {
    const srcPath = path.join(wikiSourceDir, item.src)
    if (!fs.existsSync(srcPath)) continue

    let content = fs.readFileSync(srcPath, 'utf8')

    // Adaptar enlaces internos para GitHub Wiki
    content = content
      .replace(/\.\/01_ARQUITECTURA_TECNICA\.md/g, '01-Arquitectura-Tecnica')
      .replace(/\.\/02_BASE_DE_DATOS_Y_MIGRACIONES\.md/g, '02-Base-de-Datos-y-Migraciones')
      .replace(/\.\/03_AUTENTICACION_Y_PERFILES\.md/g, '03-Autenticacion-y-Perfiles')
      .replace(/\.\/04_MODELO_FINANCIERO_Y_DEUDAS\.md/g, '04-Modelo-Financiero-y-Deudas')
      .replace(/\.\/05_MODULO_EVENTOS_Y_LISTA_ESPERA\.md/g, '05-Modulo-Eventos-y-Lista-Espera')
      .replace(/\.\/06_MODULO_INVITADOS_Y_MODERACION\.md/g, '06-Modulo-Invitados-y-Moderacion')
      .replace(/\.\/07_SISTEMA_MVP_Y_ESTADISTICAS\.md/g, '07-Sistema-MVP-y-Estadisticas')
      .replace(/\.\/08_PWA_Y_WEB_PUSH\.md/g, '08-PWA-y-Web-Push')
      .replace(/\.\/INDEX\.md/g, 'Home')
      // Enlaces a archivos de código fuente deben apuntar al repo principal de GitHub
      .replace(/\.\.\/\.\.\/src\//g, `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/src/`)
      .replace(/\.\.\/\.\.\/supabase\//g, `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/supabase/`)

    fs.writeFileSync(path.join(tempDir, item.dest), content, 'utf8')
    console.log(`  ✓ Preparado ${item.dest}`)
  }

  // Crear barra lateral de navegación para GitHub Wiki (_Sidebar.md)
  const sidebarContent = `### 📋 Navegación Wiki
* [[Inicio|Home]]
* [[1. Arquitectura Técnica|01-Arquitectura-Tecnica]]
* [[2. Base de Datos y RLS|02-Base-de-Datos-y-Migraciones]]
* [[3. Autenticación y Perfil|03-Autenticacion-y-Perfiles]]
* [[4. Deudas y Finanzas|04-Modelo-Financiero-y-Deudas]]
* [[5. Eventos y Concurrencia|05-Modulo-Eventos-y-Lista-Espera]]
* [[6. Invitados y Moderación|06-Modulo-Invitados-y-Moderacion]]
* [[7. MVP y Estadísticas|07-Sistema-MVP-y-Estadisticas]]
* [[8. PWA y Web Push|08-PWA-y-Web-Push]]

---
* 🌐 [App en Vercel](https://new-camp-app.vercel.app)
* 🐙 [Repositorio GitHub](https://github.com/${REPO_OWNER}/${REPO_NAME})
`
  fs.writeFileSync(path.join(tempDir, '_Sidebar.md'), sidebarContent, 'utf8')
  console.log('  ✓ Creado _Sidebar.md')

  // Crear pie de página (_Footer.md)
  const footerContent = `---
*Club Deportivo Mobile PWA · Desplegado en Vercel & Supabase · [Repositorio](https://github.com/${REPO_OWNER}/${REPO_NAME})*
`
  fs.writeFileSync(path.join(tempDir, '_Footer.md'), footerContent, 'utf8')
  console.log('  ✓ Creado _Footer.md')

  // Configurar Git y hacer commit + push
  execSync('git config user.name "Aspirador4"', { cwd: tempDir })
  execSync('git config user.email "admin@clubdeportivo.com"', { cwd: tempDir })
  execSync('git add .', { cwd: tempDir })

  const status = execSync('git status --porcelain', { cwd: tempDir, encoding: 'utf8' })
  if (status.trim().length > 0) {
    execSync('git commit -m "docs: sync complete wiki documentation from repository"', { cwd: tempDir, stdio: 'inherit' })
    execSync(`git push origin master`, { cwd: tempDir, stdio: 'inherit' })
    console.log('\n🎉 ¡Wiki sincronizada con éxito en GitHub!')
  } else {
    console.log('\n✨ La wiki ya se encuentra al día.')
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
