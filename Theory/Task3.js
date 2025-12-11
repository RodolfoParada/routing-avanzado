// Task 3: Validación con express-validator (8 minutos)
// express-validator proporciona validación robusta para datos de entrada.

// Instalación y Configuración
// npm install express-validator
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const app = express();
app.use(express.json());
// Validación Básica
const express = require('express');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      detalles: errors.array()
    });
  }
  next();
};

// Crear usuario con validación
app.post('/usuarios',
  [
    body('nombre')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('El nombre debe tener entre 2 y 50 caracteres'),

    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Debe proporcionar un email válido'),

    body('edad')
      .optional()
      .isInt({ min: 0, max: 150 })
      .withMessage('La edad debe ser un número entre 0 y 150'),

    body('password')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres')
  ],
  handleValidationErrors,
  (req, res) => {
    // Los datos ya están validados
    res.json({
      mensaje: 'Usuario creado exitosamente',
      usuario: req.body
    });
  }
);
// Validación de Parámetros de Ruta
const express = require('express');
const { param, validationResult } = require('express-validator');

const app = express();

// Middleware para validar errores
const validarErrores = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Parámetros inválidos',
      detalles: errors.array()
    });
  }
  next();
};

// Validar parámetro de ruta
app.get('/usuarios/:id',
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo'),
  validarErrores,
  (req, res) => {
    const id = parseInt(req.params.id);
    res.json({ usuarioId: id, mensaje: 'Usuario encontrado' });
  }
);

// Validar múltiples parámetros
app.get('/productos/:categoria/:id',
  [
    param('categoria')
      .isIn(['electronica', 'ropa', 'hogar'])
      .withMessage('Categoría inválida'),
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID debe ser un número positivo')
  ],
  validarErrores,
  (req, res) => {
    const { categoria, id } = req.params;
    res.json({ categoria, productoId: parseInt(id) });
  }
);
// Validación de Query Parameters
const express = require('express');
const { query, validationResult } = require('express-validator');

const app = express();

const validarQuery = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Parámetros de consulta inválidos',
      detalles: errors.array()
    });
  }
  next();
};

// Búsqueda con validación
app.get('/buscar',
  [
    query('q')
      .notEmpty()
      .withMessage('El término de búsqueda es requerido')
      .isLength({ min: 2, max: 100 })
      .withMessage('El término debe tener entre 2 y 100 caracteres'),

    query('limite')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe ser entre 1 y 100'),

    query('pagina')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número positivo')
  ],
  validarQuery,
  (req, res) => {
    const { q, limite = 10, pagina = 1 } = req.query;

    res.json({
      busqueda: q,
      limite: parseInt(limite),
      pagina: parseInt(pagina),
      resultados: `Resultados simulados para "${q}"`
    });
  }
);
// Validación Avanzada con Sanitización
const express = require('express');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

const validarYSanitizar = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalles: errors.array()
    });
  }
  next();
};

// Crear producto con validación avanzada
app.post('/productos',
  [
    body('nombre')
      .trim()
      .stripLow() // Remover caracteres de control
      .isLength({ min: 3, max: 100 })
      .withMessage('Nombre debe tener entre 3 y 100 caracteres'),

    body('descripcion')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Descripción no puede exceder 500 caracteres'),

    body('precio')
      .isFloat({ min: 0.01 })
      .withMessage('Precio debe ser un número positivo')
      .toFloat(), // Convertir a float

    body('categoria')
      .isIn(['electronica', 'ropa', 'hogar', 'deportes'])
      .withMessage('Categoría inválida'),

    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock debe ser un número no negativo')
      .toInt(), // Convertir a integer

    body('tags')
      .optional()
      .isArray({ min: 0, max: 10 })
      .withMessage('Tags debe ser un array de máximo 10 elementos'),

    body('tags.*')
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Cada tag debe tener entre 2 y 20 caracteres')
  ],
  validarYSanitizar,
  (req, res) => {
    // Los datos están validados y sanitizados
    const producto = req.body;
    producto.id = Date.now(); // ID simple

    res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      producto
    });
  }
);