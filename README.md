# 🌐 Web Admin - Sistema de Mantenimientos

Panel de administración web desarrollado con React y TypeScript para gestión de obras de mantenimiento.

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- npm o yarn

### Instalación

```bash
cd web-admin
npm install
```

### Ejecutar

```bash
# Modo desarrollo
npm start

# Build para producción
npm run build

# Tests
npm test
```

La aplicación se abrirá en `http://localhost:3000`

## 📂 Estructura

```
web-admin/
├── src/
│   ├── components/     # Componentes React
│   ├── services/       # Servicios API
│   └── App.tsx         # Componente principal
├── public/            # Archivos estáticos
└── package.json
```

## 🔗 Conexión con Backend

La aplicación se conecta al backend en `http://localhost:3001`.

Configuración en:
- `src/services/api.ts`

## 🎨 Funcionalidades

- ✅ Dashboard con estadísticas
- ✅ Tabla de obras con filtros
- ✅ Carga masiva de archivos XML
- ✅ Visualización de datos
- ✅ Gestión de estados

## 🛠️ Tecnologías

- React 19
- TypeScript
- Material-UI
- Axios
- React Dropzone

## 📝 Notas

Este proyecto es **independiente** del mobile-app y puede desarrollarse por separado.

---

Para más información, consulta la [documentación principal](../../README.md).
