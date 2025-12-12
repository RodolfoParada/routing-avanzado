const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const fs = require('fs'); // Módulo para el sistema de archivos (Logs)
const { AppError, ValidationError, NotFoundError } = require('./errores');

// --- CONFIGURACIÓN Y LOGS ---

const RUTA_LOGS = './api-rest-log.txt';

/**
 * Registra una operación en un archivo de logs.
 * @param {string} tipo - Tipo de operación (CREACION, ACTUALIZACION, ELIMINACION, ERROR).
 * @param {string} descripcion - Descripción breve de la acción.
 * @param {object} detalles - Objeto con detalles de la operación (e.g., ID de tarea/usuario).
 */
function registrarOperacion(tipo, descripcion, detalles) {
  const marcaTiempo = new Date().toISOString();
  const entradaLog = `[${marcaTiempo}] [${tipo.toUpperCase()}] ${descripcion} - Detalles: ${JSON.stringify(detalles)}\n`;
  
  // Escribir en el archivo de forma asíncrona
  fs.appendFile(RUTA_LOGS, entradaLog, (err) => {
    if (err) {
      console.error('❌ Error escribiendo en el log:', err);
    }
  });
}

// Crear aplicación
const app = express();
app.use(express.json());

// --- BASE DE DATOS SIMULADA EXTENDIDA ---

let categorias = [
  { id: 1, nombre: 'Desarrollo', descripcion: 'Tareas relacionadas con codificación' },
  { id: 2, nombre: 'Administrativo', descripcion: 'Tareas de gestión y planificación' }
];

let tareas = [
  { id: 1, titulo: 'Aprender Express', descripcion: 'Completar tutorial', completada: false, prioridad: 'alta', usuarioId: 1, categoriaId: 1, fechaCreacion: '2025-01-01T10:00:00Z' },
  { id: 2, titulo: 'Crear API', descripcion: 'Implementar endpoints', completada: true, prioridad: 'media', usuarioId: 1, categoriaId: 2, fechaCreacion: '2025-12-09T15:00:00Z' },
  { id: 3, titulo: 'Testing', descripcion: 'Probar con Postman', completada: false, prioridad: 'baja', usuarioId: 2, categoriaId: 1, fechaCreacion: '2025-12-10T08:00:00Z' },
  { id: 4, titulo: 'Reunión semanal', descripcion: 'Revisar progreso', completada: true, prioridad: 'alta', usuarioId: 2, categoriaId: 2, fechaCreacion: '2025-12-11T09:00:00Z' }
];

let usuarios = [
  { id: 1, nombre: 'Admin', email: 'admin@example.com' },
  { id: 2, nombre: 'Usuario', email: 'user@example.com' }
];

let siguienteIdTarea = 5;
let siguienteIdCategoria = 3;

// --- FUNCIONES HELPER Y MIDDLEWARE ---

// Middleware de validación
const validarErrores = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Datos inválidos', errors.array());
  }
  next();
};

// Funciones helper
function encontrarTarea(id, usuarioId = null) {
  const tarea = tareas.find(t => t.id === parseInt(id));
  if (!tarea) {
    throw new NotFoundError('Tarea');
  }
  if (usuarioId && tarea.usuarioId !== usuarioId) {
    throw new AppError('No tienes permisos para acceder a esta tarea', 403);
  }
  return tarea;
}

function encontrarUsuario(id) {
  const usuario = usuarios.find(u => u.id === parseInt(id));
  if (!usuario) {
    throw new NotFoundError('Usuario');
  }
  return usuario;
}

function encontrarCategoria(id) {
  const categoria = categorias.find(c => c.id === parseInt(id));
  if (!categoria) {
    throw new NotFoundError('Categoría');
  }
  return categoria;
}

// Middleware de autenticación simulada
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Token de autenticación requerido', 401);
  }

  const token = authHeader.substring(7);

  // Simular validación de token
  const payload = { userId: token === 'admin-token' ? 1 : 2 };
  req.usuario = payload;
  next();
}

// Crear routers modulares
const tareasRouter = express.Router();
const usuariosRouter = express.Router();
const categoriasRouter = express.Router();
const estadisticasRouter = express.Router();

// Middleware común para routers (Autenticación)
tareasRouter.use(autenticar);
usuariosRouter.use(autenticar);
categoriasRouter.use(autenticar);
estadisticasRouter.use(autenticar);

// --- RUTAS DE CATEGORÍAS ---

// GET /categorias - Listar categorías
categoriasRouter.get('/', (req, res) => {
  res.json(categorias);
});

// GET /categorias/:id - Obtener categoría específica
categoriasRouter.get('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un número positivo'),
  validarErrores,
  (req, res) => {
    const categoria = encontrarCategoria(req.params.id);
    res.json(categoria);
  }
);

// POST /categorias - Crear nueva categoría (solo para Admin simulado)
categoriasRouter.post('/',
  [
    body('nombre').trim().isLength({ min: 3, max: 50 }).withMessage('Nombre debe tener entre 3 y 50 caracteres'),
    body('descripcion').optional().trim().isLength({ max: 200 }).withMessage('Descripción no puede exceder 200 caracteres')
  ],
  validarErrores,
  (req, res) => {
    // Solo permitir al usuario 1 (Admin) crear categorías
    if (req.usuario.userId !== 1) {
      throw new AppError('Solo el administrador puede crear categorías', 403);
    }

    const nuevaCategoria = {
      id: siguienteIdCategoria++,
      nombre: req.body.nombre,
      descripcion: req.body.descripcion || ''
    };

    categorias.push(nuevaCategoria);
    
    registrarOperacion('CREACION', 'Nueva categoría creada', { id: nuevaCategoria.id, nombre: nuevaCategoria.nombre, usuario: req.usuario.userId });
    res.status(201).json(nuevaCategoria);
  }
);

// --- RUTAS DE TAREAS ---

// GET /tareas - Listar tareas con filtros avanzados (Búsqueda booleana AND/OR)
tareasRouter.get('/',
  [
    query('completada').optional().isIn(['true', 'false']).withMessage('completada debe ser true o false'),
    query('prioridad').optional().isIn(['baja', 'media', 'alta']).withMessage('prioridad inválida'),
    query('categoria_id').optional().isInt({ min: 1 }).withMessage('categoria_id debe ser un número positivo'), // <-- NUEVO FILTRO
    query('q').optional().isString().withMessage('q debe ser una cadena de texto para búsqueda'),
    query('operador_logico').optional().isIn(['AND', 'OR']).withMessage('operador_logico debe ser AND o OR'), // <-- NUEVO OPERADOR
    query('pagina').optional().isInt({ min: 1 }).withMessage('pagina debe ser un número positivo'),
    query('limite').optional().isInt({ min: 1, max: 100 }).withMessage('limite debe estar entre 1 y 100'),
    query('ordenar').optional().isIn(['titulo', 'prioridad', 'fecha']).withMessage('ordenar inválido')
  ],
  validarErrores,
  (req, res) => {
    let resultados = [...tareas];
    const {
      completada,
      prioridad,
      categoria_id,
      pagina = 1,
      limite = 10,
      ordenar,
      q, // búsqueda
      operador_logico = 'AND' // Por defecto: AND
    } = req.query;

    // 1. Definir los criterios de filtrado (Funciones)
    const filtrosCriterios = [];

    // Criterio 0: Filtro por usuario autenticado (SIEMPRE AND)
    filtrosCriterios.push(t => t.usuarioId === req.usuario.userId);

    // Criterios de filtro adicionales
    if (completada !== undefined) {
      const valor = completada === 'true';
      filtrosCriterios.push(t => t.completada === valor);
    }

    if (prioridad) {
      filtrosCriterios.push(t => t.prioridad === prioridad);
    }

    if (categoria_id) {
      const id = parseInt(categoria_id);
      filtrosCriterios.push(t => t.categoriaId === id);
    }

    // Criterio de Búsqueda por texto (q)
    if (q) {
      const termino = q.toLowerCase();
      filtrosCriterios.push(t =>
        t.titulo.toLowerCase().includes(termino) ||
        t.descripcion.toLowerCase().includes(termino)
      );
    }

    // 2. Aplicar la lógica booleana AND/OR
    const filtroUsuario = filtrosCriterios[0];
    const otrosFiltros = filtrosCriterios.slice(1);

    if (operador_logico === 'AND' || otrosFiltros.length === 0) {
      // Aplicar todos los filtros con lógica AND
      resultados = resultados.filter(t => filtrosCriterios.every(filtro => filtro(t)));
    } else if (operador_logico === 'OR') {
      // Aplicar filtros con lógica OR, manteniendo el filtro de usuario como AND
      resultados = resultados.filter(t => {
        // La tarea DEBE pertenecer al usuario autenticado (siempre AND)
        if (!filtroUsuario(t)) {
          return false;
        }

        // Aplicar los demás filtros (q, completada, prioridad, categoria) con lógica OR
        return otrosFiltros.some(filtro => filtro(t));
      });
    }

    // 3. Ordenamiento
    if (ordenar) {
      switch (ordenar) {
        case 'titulo':
          resultados.sort((a, b) => a.titulo.localeCompare(b.titulo));
          break;
        case 'prioridad':
          const prioridades = { baja: 1, media: 2, alta: 3 };
          resultados.sort((a, b) => prioridades[b.prioridad] - prioridades[a.prioridad]);
          break;
        case 'fecha':
          resultados.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
          break;
      }
    }

    // 4. Paginación
    const paginaNum = parseInt(pagina);
    const limiteNum = parseInt(limite);
    const inicio = (paginaNum - 1) * limiteNum;
    const paginados = resultados.slice(inicio, inicio + limiteNum);

    res.json({
      tareas: paginados,
      total: resultados.length,
      pagina: paginaNum,
      limite: limiteNum,
      paginasTotal: Math.ceil(resultados.length / limiteNum)
    });
  }
);

// GET /tareas/:id - Obtener tarea específica
tareasRouter.get('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un número positivo'),
  validarErrores,
  (req, res) => {
    const tarea = encontrarTarea(req.params.id, req.usuario.userId);
    res.json(tarea);
  }
);

// POST /tareas - Crear nueva tarea
tareasRouter.post('/',
  [
    body('titulo').trim().isLength({ min: 3, max: 100 }).withMessage('Título debe tener entre 3 y 100 caracteres'),
    body('descripcion').optional().trim().isLength({ max: 500 }).withMessage('Descripción no puede exceder 500 caracteres'),
    body('prioridad').optional().isIn(['baja', 'media', 'alta']).withMessage('Prioridad inválida'),
    body('completada').optional().isBoolean().withMessage('completada debe ser un booleano'),
    body('categoriaId').optional().isInt({ min: 1 }).withMessage('categoriaId debe ser un número positivo') // <-- NUEVO CAMPO
  ],
  validarErrores,
  (req, res) => {
    if (req.body.categoriaId) {
      encontrarCategoria(req.body.categoriaId); // Verificar si la categoría existe
    }

    const nuevaTarea = {
      id: siguienteIdTarea++,
      titulo: req.body.titulo,
      descripcion: req.body.descripcion || '',
      completada: req.body.completada || false,
      prioridad: req.body.prioridad || 'media',
      usuarioId: req.usuario.userId,
      categoriaId: req.body.categoriaId || 1, // Asignar 1 por defecto si no se especifica
      fechaCreacion: new Date().toISOString()
    };

    tareas.push(nuevaTarea);
    
    registrarOperacion('CREACION', `Tarea #${nuevaTarea.id} creada`, { titulo: nuevaTarea.titulo, usuarioId: nuevaTarea.usuarioId });
    res.status(201).json(nuevaTarea);
  }
);

// PUT /tareas/:id - Actualizar tarea completa
tareasRouter.put('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID debe ser un número positivo'),
    body('titulo').trim().isLength({ min: 3, max: 100 }).withMessage('Título requerido'),
    body('descripcion').optional().trim().isLength({ max: 500 }).withMessage('Descripción muy larga'),
    body('prioridad').isIn(['baja', 'media', 'alta']).withMessage('Prioridad inválida'),
    body('completada').isBoolean().withMessage('completada debe ser booleano'),
    body('categoriaId').isInt({ min: 1 }).withMessage('categoriaId debe ser un número positivo') // <-- REQUERIDO EN PUT
  ],
  validarErrores,
  (req, res) => {
    const tarea = encontrarTarea(req.params.id, req.usuario.userId);
    encontrarCategoria(req.body.categoriaId); // Verificar si la categoría existe

    tarea.titulo = req.body.titulo;
    tarea.descripcion = req.body.descripcion || '';
    tarea.prioridad = req.body.prioridad;
    tarea.completada = req.body.completada;
    tarea.categoriaId = req.body.categoriaId; // Actualizar categoría
    tarea.fechaActualizacion = new Date().toISOString();

    registrarOperacion('ACTUALIZACION', `Tarea #${tarea.id} actualizada (PUT)`, { titulo: tarea.titulo, usuarioId: tarea.usuarioId });
    res.json(tarea);
  }
);

// PATCH /tareas/:id - Actualizar parcialmente
tareasRouter.patch('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un número positivo'),
  validarErrores,
  (req, res) => {
    const tarea = encontrarTarea(req.params.id, req.usuario.userId);
    const camposPermitidos = ['titulo', 'descripcion', 'prioridad', 'completada', 'categoriaId']; // <-- NUEVO CAMPO

    // ... (El resto de la lógica de validación de PATCH se mantiene igual)
    // Se añade validación para categoriaId
    
    const camposActualizados = Object.keys(req.body);
    if (camposActualizados.length === 0) {
      throw new ValidationError('Debe proporcionar al menos un campo para actualizar');
    }

    const errors = [];
    for (const campo of camposActualizados) {
      if (!camposPermitidos.includes(campo)) {
        errors.push(`${campo}: campo no permitido`);
        continue;
      }

      switch (campo) {
        // ... (otros casos de switch)
        case 'categoriaId':
          if (typeof req.body[campo] !== 'number' || req.body[campo] < 1) {
            errors.push('categoriaId: debe ser un número positivo');
          } else {
            // Verificar existencia
            try {
              encontrarCategoria(req.body[campo]);
            } catch (e) {
              errors.push(`categoriaId: la categoría #${req.body[campo]} no existe`);
            }
          }
          break;
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Errores de validación', errors);
    }

    // Aplicar actualizaciones
    for (const campo of camposActualizados) {
      tarea[campo] = campo === 'titulo' || campo === 'descripcion' ? req.body[campo].trim() : req.body[campo];
    }

    tarea.fechaActualizacion = new Date().toISOString();
    
    registrarOperacion('ACTUALIZACION', `Tarea #${tarea.id} actualizada (PATCH)`, { cambios: camposActualizados, usuarioId: tarea.usuarioId });
    res.json(tarea);
  }
);

// DELETE /tareas/:id - Eliminar tarea
tareasRouter.delete('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un número positivo'),
  validarErrores,
  (req, res) => {
    const indice = tareas.findIndex(t => t.id === parseInt(req.params.id) && t.usuarioId === req.usuario.userId);

    if (indice === -1) {
      throw new NotFoundError('Tarea');
    }

    const tareaEliminada = tareas.splice(indice, 1)[0];
    
    registrarOperacion('ELIMINACION', `Tarea #${tareaEliminada.id} eliminada`, { titulo: tareaEliminada.titulo, usuarioId: req.usuario.userId });
    res.json({ mensaje: 'Tarea eliminada', tarea: tareaEliminada });
  }
);

// --- RUTAS DE ESTADÍSTICAS ---

// GET /stats/productividad/usuario/:id - Productividad por usuario
estadisticasRouter.get('/productividad/usuario/:id',
  param('id').isInt({ min: 1 }).withMessage('ID de usuario debe ser un número positivo'),
  validarErrores,
  (req, res) => {
    const userId = parseInt(req.params.id);
    const usuario = encontrarUsuario(userId);

    // Solo permitir al usuario acceder a sus propias estadísticas (o al admin)
    if (req.usuario.userId !== userId && req.usuario.userId !== 1) {
       throw new AppError('No tienes permisos para ver estas estadísticas', 403);
    }

    const tareasUsuario = tareas.filter(t => t.usuarioId === userId);
    const totalTareas = tareasUsuario.length;
    const tareasCompletadas = tareasUsuario.filter(t => t.completada).length;

    const productividad = totalTareas > 0 ? (tareasCompletadas / totalTareas) * 100 : 0;

    res.json({
      usuarioId: userId,
      nombre: usuario.nombre,
      totalTareas: totalTareas,
      tareasCompletadas: tareasCompletadas,
      productividad: `${productividad.toFixed(2)}%`
    });
  }
);

// GET /stats/tareas_completadas_por_dia - Tareas completadas por día (global)
estadisticasRouter.get('/tareas_completadas_por_dia', (req, res) => {
  const conteoPorDia = tareas
    .filter(t => t.completada)
    .reduce((acc, tarea) => {
      // Usar solo la parte de la fecha (YYYY-MM-DD)
      const fecha = new Date(tarea.fechaCreacion).toISOString().split('T')[0]; 
      acc[fecha] = (acc[fecha] || 0) + 1;
      return acc;
    }, {});

  res.json({
    descripcion: 'Conteo de tareas completadas (basado en fecha de creación)',
    conteo: conteoPorDia
  });
});


// --- RUTAS DE USUARIOS ---

// GET /usuarios/:id - Obtener perfil de usuario
usuariosRouter.get('/:id',
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un número positivo'),
  validarErrores,
  (req, res) => {
    const usuario = encontrarUsuario(req.params.id);
    const { id, nombre, email } = usuario;
    res.json({ id, nombre, email });
  }
);

// --- USO DE ROUTERS Y MANEJO DE ERRORES ---

// Usar routers en la aplicación
app.use('/api/tareas', tareasRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/categorias', categoriasRouter); // <-- NUEVO ROUTER
app.use('/api/stats', estadisticasRouter); // <-- NUEVO ROUTER

// Ruta de login simulada
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'admin@example.com' && password === 'admin123') {
    res.json({ token: 'admin-token', usuario: { id: 1, nombre: 'Admin' } });
  } else if (email === 'user@example.com' && password === 'user123') {
    res.json({ token: 'user-token', usuario: { id: 2, nombre: 'Usuario' } });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

// Información de la API (Documentación actualizada)
app.get('/', (req, res) => {
  res.json({
    nombre: 'API REST Completa con Express (v2.0)',
    version: '2.0.0',
    descripcion: 'API con categorías, estadísticas, búsqueda booleana y logs.',
    endpoints: {
      auth: {
        'POST /auth/login': 'Autenticación'
      },
      tareas: {
        'GET /api/tareas': 'Listar tareas (filtros, q, y operador_logico=AND/OR)',
        'POST /api/tareas': 'Crear tarea (incluye categoriaId)',
        // ... (otros endpoints de tareas)
      },
      categorias: {
        'GET /api/categorias': 'Listar categorías',
        'POST /api/categorias': 'Crear categoría (solo Admin)'
      },
      estadisticas: {
        'GET /api/stats/productividad/usuario/:id': 'Productividad por usuario',
        'GET /api/stats/tareas_completadas_por_dia': 'Conteo de tareas completadas por día'
      }
    },
    autenticacion: 'Bearer token en header Authorization',
  });
});

// Middleware de error centralizado
app.use((error, req, res, next) => {
  console.error('🔴 Error:', error);
  
  // Registrar errores inesperados
  if (!(error instanceof AppError) && error.name !== 'ValidationError') {
     registrarOperacion('ERROR', 'Error interno del servidor', { 
        metodo: req.method, 
        ruta: req.url, 
        mensaje: error.message 
     });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      ...(error.details && { detalles: error.details }),
      timestamp: new Date().toISOString()
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalles: error.errors,
      timestamp: new Date().toISOString()
    });
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

// Middleware 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    metodo: req.method,
    ruta: req.url,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API REST Completa ejecutándose en http://localhost:${PORT}`);
  console.log(`📖 Documentación en http://localhost:${PORT}`);
  console.log(`📝 Logs de operaciones se registrarán en ${RUTA_LOGS}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...');
  process.exit(0);
});