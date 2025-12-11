// Task 4: Manejo de Errores Estructurado (6 minutos)
// Sistema robusto para manejar errores en aplicaciones Express.

// Middleware de Error Centralizado
const express = require('express');
const app = express();

// Middleware de error debe tener 4 parámetros
app.use((error, req, res, next) => {
  console.error('Error:', error);

  // Errores de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      detalles: error.errors
    });
  }

  // Errores de base de datos
  if (error.name === 'MongoError' || error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Conflicto con datos existentes',
      detalle: error.message
    });
  }

  // Errores de autenticación
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token de autenticación inválido'
    });
  }

  // Error genérico
  res.status(error.status || 500).json({
    error: error.status ? error.message : 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});
// Clases de Error Personalizadas
// errores.js
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400);
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Permisos insuficientes') {
    super(message, 403);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError
};
// Uso de Errores Personalizados
const express = require('express');
const { AppError, ValidationError, NotFoundError } = require('./errores');

const app = express();
app.use(express.json());

// Simulación de base de datos
const usuarios = [
  { id: 1, nombre: 'Ana' },
  { id: 2, nombre: 'Carlos' }
];

// Función helper que puede lanzar errores
function encontrarUsuario(id) {
  const usuario = usuarios.find(u => u.id === parseInt(id));
  if (!usuario) {
    throw new NotFoundError('Usuario');
  }
  return usuario;
}

// Ruta que usa errores personalizados
app.get('/usuarios/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    // Validar parámetro
    if (isNaN(id)) {
      throw new ValidationError('ID debe ser un número', ['id: debe ser numérico']);
    }

    const usuario = encontrarUsuario(id);
    res.json(usuario);

  } catch (error) {
    next(error); // Pasar error al middleware de errores
  }
});

// Ruta que simula error de base de datos
app.post('/usuarios', (req, res, next) => {
  try {
    const { nombre, email } = req.body;

    if (!nombre) {
      throw new ValidationError('Nombre es requerido', ['nombre: campo requerido']);
    }

    // Simular error de BD
    if (email === 'duplicado@example.com') {
      const dbError = new Error('Email ya existe');
      dbError.code = 'ER_DUP_ENTRY';
      throw dbError;
    }

    const nuevoUsuario = {
      id: usuarios.length + 1,
      nombre,
      email
    };

    usuarios.push(nuevoUsuario);
    res.status(201).json(nuevoUsuario);

  } catch (error) {
    next(error);
  }
});

// Middleware de error mejorado
app.use((error, req, res, next) => {
  console.error('Error:', error);

  // Errores personalizados
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      ...(error.details && { detalles: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  // Errores de validación de express-validator
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalles: error.errors
    });
  }

  // Errores de base de datos
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Dato duplicado',
      detalle: error.message
    });
  }

  // Error por defecto
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});