// errores.js

/**
 * Clase base para errores de la aplicación con un código de estado HTTP.
 */
class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error 404: Recurso no encontrado.
 */
class NotFoundError extends AppError {
    constructor(recurso = 'Recurso') {
        super(`${recurso} no encontrado.`, 404);
        this.name = 'NotFoundError';
    }
}

/**
 * Error 400: Error de validación de datos.
 */
class ValidationError extends AppError {
    constructor(message = 'Error de validación', errors = []) {
        super(message, 400, errors);
        this.name = 'ValidationError';
    }
}

module.exports = {
    AppError,
    NotFoundError,
    ValidationError
};