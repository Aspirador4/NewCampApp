# 11. Diseño, Ergonomía y UX Mobile-First

CampApp implementa una arquitectura de diseño centrada en dispositivos móviles (**Mobile-First PWA**) bajo estándares rigurosos de **Apple Human Interface Guidelines (HIG)** y **Google Material Design 3**.

---

## 1. Principios de Interfaz

1. **Light Mode Atlético Puro**:
   - Se prioriza un modo claro exclusivo de alto contraste para visibilidad óptima bajo la luz del sol en canchas y recintos deportivos.
   - Tipografía oficial Geist Sans integrada a nivel de raíz tipográfica (`var(--font-geist-sans)`).

2. **Personalización de Identidad Multi-Club (10 Paletas Deportivas)**:
   - Cada club define su identidad gráfica a través de una de las 10 paletas de colores oficiales (Verde Cancha, Azul Marino, Azul Real, Rojo Carmesí, Vino Tinto/Bordó, Dorado/Ámbar, Naranja Fuego, Turquesa/Teal, Púrpura/Violeta y Negro Carbón).
   - Las variables CSS semánticas (`--club-primary`, `--club-gradient-from`, `--club-primary-light`, etc.) se inyectan en tiempo de ejecución en el layout principal.

3. **Soporte Nativo de Áreas Seguras (Safe Areas)**:
   - Soporte total para la barra de inicio y Dynamic Island en iOS mediante `env(safe-area-inset-bottom)` y `env(safe-area-inset-top)`.
   - La barra de navegación inferior (`BottomNav`) y todas las vistas utilizan el espaciador `.pb-nav`.

4. **Ergonomía Táctil y Prevención de Zoom**:
   - Todo objetivo táctil (*touch target*) interactivo cuenta con un mínimo de **44×44px / 48px** según las normas de accesibilidad WCAG 2.1 AA.
   - Prevención de zoom automático en Safari iOS forzando fuentes de al menos 16px en campos de entrada (`input`, `select`, `textarea`).
   - Teclados numéricos nativos automáticos (`inputMode="numeric"`) en aranceles, RUT y números de camiseta.

5. **Componentes de Retroalimentación y Estados Vacíos**:
   - Implementación de [`EmptyState.tsx`](file:///Users/seba/CampApp/src/components/EmptyState.tsx) para ilustrar estados sin partidos, tesorería al día o búsquedas de miembros sin coincidencias.
