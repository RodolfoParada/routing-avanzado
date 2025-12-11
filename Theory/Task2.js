// Task 2: Router Modular con express.Router() (8 minutos)
// express.Router() permite crear routers modulares y reutilizables.

// Creación Básica de Router
const express = require('express');

// Crear router para usuarios
const usuariosRouter = express.Router();

// Middleware específico para este router
usuariosRouter.use((req, res, next) => {
  console.log('Acceso al módulo de usuarios');
  next();
});

// Rutas del módulo usuarios
usuariosRouter.get('/', (req, res) => {
  res.json({ mensaje: 'Listar usuarios' });
});

usuariosRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ mensaje: `Obtener usuario ${id}` });
});

usuariosRouter.post('/', (req, res) => {
  res.json({ mensaje: 'Crear usuario' });
});

usuariosRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ mensaje: `Actualizar usuario ${id}` });
});

usuariosRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  res.json({ mensaje: `Eliminar usuario ${id}` });
});

// Usar el router en la aplicación principal
const app = express();
app.use('/api/usuarios', usuariosRouter); // Todas las rutas tendrán el prefijo /api/usuarios

// Ejemplo:
// GET /api/usuarios -> usuariosRouter.get('/')
// GET /api/usuarios/123 -> usuariosRouter.get('/:id')
// POST /api/usuarios -> usuariosRouter.post('/')
// Router con Sub-rutas
const express = require('express');

// Router principal de productos
const productosRouter = express.Router();

// Sub-router para reviews
const reviewsRouter = express.Router();

// Rutas de reviews
reviewsRouter.get('/', (req, res) => {
  const productoId = req.productoId; // Agregado por middleware padre
  res.json({ mensaje: `Reviews del producto ${productoId}` });
});

reviewsRouter.post('/', (req, res) => {
  const productoId = req.productoId;
  res.json({ mensaje: `Crear review para producto ${productoId}` });
});

// Middleware para agregar productoId a todas las rutas de reviews
reviewsRouter.use((req, res, next) => {
  req.productoId = req.params.productoId;
  next();
});

// Rutas principales de productos
productosRouter.get('/', (req, res) => {
  res.json({ mensaje: 'Listar productos' });
});

productosRouter.get('/:productoId', (req, res) => {
  const { productoId } = req.params;
  res.json({ mensaje: `Obtener producto ${productoId}` });
});

// Anidar el router de reviews
productosRouter.use('/:productoId/reviews', reviewsRouter);

// Usar en la aplicación
const app = express();
app.use('/api/productos', productosRouter);

// Ejemplo:
// GET /api/productos/123/reviews -> reviewsRouter.get('/') con productoId = 123
// POST /api/productos/456/reviews -> reviewsRouter.post('/') con productoId = 456
// Router con Parámetros Compartidos
const express = require('express');

// Router para una tienda online
const tiendaRouter = express.Router();

// Middleware para validar tienda
tiendaRouter.use('/:tiendaId', (req, res, next) => {
  const { tiendaId } = req.params;

  // Simular validación de tienda
  const tiendaValida = ['tienda1', 'tienda2', 'tienda3'].includes(tiendaId);

  if (!tiendaValida) {
    return res.status(404).json({ error: 'Tienda no encontrada' });
  }

  req.tiendaId = tiendaId;
  next();
});

// Rutas que usan el tiendaId validado
tiendaRouter.get('/:tiendaId', (req, res) => {
  res.json({
    tienda: req.tiendaId,
    mensaje: 'Información de la tienda'
  });
});

tiendaRouter.get('/:tiendaId/productos', (req, res) => {
  res.json({
    tienda: req.tiendaId,
    productos: [`Producto 1 de ${req.tiendaId}`, `Producto 2 de ${req.tiendaId}`]
  });
});

tiendaRouter.get('/:tiendaId/estadisticas', (req, res) => {
  res.json({
    tienda: req.tiendaId,
    estadisticas: {
      productos: 150,
      ventas: 2500,
      clientes: 89
    }
  });
});

// Usar en la aplicación
const app = express();
app.use('/tienda', tiendaRouter);

// Ejemplo:
// GET /tienda/tienda1 -> Información de tienda1
// GET /tienda/tienda1/productos -> Productos de tienda1
// GET /tienda/tienda99 -> Error 404