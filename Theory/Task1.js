// Task 1: Parámetros de Ruta y Query Strings (8 minutos)
// Express.js ofrece poderosas opciones para manejar parámetros en URLs.

// Parámetros de Ruta (Route Parameters)
const express = require('express');
const app = express();

// Parámetros básicos
app.get('/usuarios/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ userId, tipo: typeof userId }); // Siempre string
});

// Múltiples parámetros
app.get('/usuarios/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  res.json({ userId, postId });
});

// Parámetros opcionales
app.get('/productos/:categoria/:subcategoria?', (req, res) => {
  const { categoria, subcategoria } = req.params;
  res.json({
    categoria,
    subcategoria: subcategoria || 'general',
    esOpcional: !subcategoria
  });
});

// Parámetros con regex
app.get('/archivos/:nombre.:extension', (req, res) => {
  const { nombre, extension } = req.params;
  res.json({ nombre, extension });
});

// Parámetros con validación regex
app.get('/numeros/:numero(\\d+)', (req, res) => {
  const numero = parseInt(req.params.numero);
  res.json({ numero, cuadrado: numero * numero });
});

// Parámetros con opciones (usando regex)
app.get('/colores/:color(red|blue|green)', (req, res) => {
  const color = req.params.color;
  res.json({ colorSeleccionado: color });
});
// Query Strings Avanzados
const express = require('express');
const app = express();

// Query parameters básicos
app.get('/buscar', (req, res) => {
  const { q, limite, pagina } = req.query;

  res.json({
    busqueda: q,
    limite: parseInt(limite) || 10,
    pagina: parseInt(pagina) || 1,
    queryCompleto: req.query
  });
});

// Query parameters con validación
app.get('/productos', (req, res) => {
  const {
    precio_min,
    precio_max,
    categoria,
    ordenar,
    pagina = 1,
    limite = 10
  } = req.query;

  // Validación y conversión
  const filtros = {};

  if (precio_min) {
    const min = parseFloat(precio_min);
    if (isNaN(min)) {
      return res.status(400).json({ error: 'precio_min debe ser un número' });
    }
    filtros.precioMin = min;
  }

  if (precio_max) {
    const max = parseFloat(precio_max);
    if (isNaN(max)) {
      return res.status(400).json({ error: 'precio_max debe ser un número' });
    }
    filtros.precioMax = max;
  }

  if (categoria) {
    filtros.categoria = categoria;
  }

  // Validación de ordenamiento
  const ordenesValidos = ['precio_asc', 'precio_desc', 'nombre_asc', 'nombre_desc'];
  if (ordenar && !ordenesValidos.includes(ordenar)) {
    return res.status(400).json({
      error: 'ordenar debe ser uno de: ' + ordenesValidos.join(', ')
    });
  }

  filtros.ordenar = ordenar;
  filtros.pagina = parseInt(pagina);
  filtros.limite = Math.min(parseInt(limite), 100); // Máximo 100

  res.json({
    filtros,
    mensaje: 'Parámetros validados correctamente'
  });
});

// Arrays en query strings
app.get('/etiquetas', (req, res) => {
  // ?tags=javascript&tags=react&tags=node
  const { tags } = req.query;

  let etiquetas = [];
  if (Array.isArray(tags)) {
    etiquetas = tags;
  } else if (tags) {
    etiquetas = [tags];
  }

  res.json({
    etiquetas,
    total: etiquetas.length
  });
});

// Query parameters complejos
app.get('/filtro-avanzado', (req, res) => {
  const query = req.query;

  // Manejar filtros anidados
  const filtros = {};

  // Rango de fechas: ?fecha_inicio=2024-01-01&fecha_fin=2024-12-31
  if (query.fecha_inicio || query.fecha_fin) {
    filtros.fecha = {};
    if (query.fecha_inicio) filtros.fecha.inicio = query.fecha_inicio;
    if (query.fecha_fin) filtros.fecha.fin = query.fecha_fin;
  }

  // Ubicación: ?ciudad=Madrid&pais=España
  if (query.ciudad || query.pais) {
    filtros.ubicacion = {};
    if (query.ciudad) filtros.ubicacion.ciudad = query.ciudad;
    if (query.pais) filtros.ubicacion.pais = query.pais;
  }

  // Búsqueda en múltiples campos: ?q=palabra&campos=titulo,descripcion
  if (query.q) {
    filtros.busqueda = {
      termino: query.q,
      campos: query.campos ? query.campos.split(',') : ['titulo']
    };
  }

  res.json({
    filtrosAplicados: filtros,
    queryOriginal: query
  });
});
// Combinando Route Params y Query Strings
const express = require('express');
const app = express();

// Ejemplo: /usuarios/123/posts?tipo=publico&limite=10
app.get('/usuarios/:userId/posts', (req, res) => {
  const { userId } = req.params;
  const { tipo, limite, pagina } = req.query;

  // Validar que userId sea numérico
  const id = parseInt(userId);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'userId debe ser un número' });
  }

  res.json({
    usuarioId: id,
    filtros: {
      tipo: tipo || 'todos',
      limite: Math.min(parseInt(limite) || 10, 50),
      pagina: parseInt(pagina) || 1
    },
    rutaCompleta: req.originalUrl
  });
});

// Ejemplo complejo: /tienda/categoria/:categoria/producto/:id/reviews
app.get('/tienda/categoria/:categoria/producto/:id/reviews', (req, res) => {
  const { categoria, id } = req.params;
  const { rating_min, ordenar, pagina } = req.query;

  res.json({
    ruta: 'reviews de producto',
    parametros: { categoria, productoId: id },
    filtros: {
      ratingMinimo: rating_min ? parseFloat(rating_min) : null,
      ordenar: ordenar || 'fecha_desc',
      pagina: parseInt(pagina) || 1
    }
  });
});