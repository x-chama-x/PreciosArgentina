// server.js

// importacion de modulos
const express = require('express'); // crear el servidor web
const http = require('http'); // crear el servidor http que usara socket.io
const socketIo = require('socket.io'); // para actualizar en tiempo real la informacion
const axios = require('axios'); // para hacer peticiones http a las apis
const path = require("path"); // para manejar rutas de archivos
const cheerio = require('cheerio'); // para extraer datos de paginas web

// configuracion del servidor
const app = express(); // crear aplicacion express
const server = http.createServer(app); // crear servidor http
const io = socketIo(server); // crear servidor socket.io

app.use(express.static(__dirname + '/public')); // Configurar Express para servir archivos estáticos


// Ruta para la página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// funciones para obtener la informacion de las apis

// funcion para obtener el precio del dolar 
async function obtenerPreciosDolar() {
  try {
    const response = await axios.get("https://api.bluelytics.com.ar/v2/latest") // Hacer una petición GET a la API
    const data = response.data
    return {
      oficial: {
        compra: data.oficial.value_buy,
        venta: data.oficial.value_sell,
      },
      blue: {
        compra: data.blue.value_buy,
        venta: data.blue.value_sell,
      },
    }
  } catch (error) {
    console.error("Error al obtener precios del dólar:", error) // si hay un error, mostrarlo en la consola
    return null
  }
}

// Función para obtener el precio básico de Netflix
async function obtenerPrecioNetflix() {
  try {
    const url = 'https://help.netflix.com/es/node/24926';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Seleccionar el <p> que contiene el <strong> con el texto "Básico"
    const precioNetflix = $('li:contains("Básico") p').text().trim();

    // Extraer el número del texto
    const precioNumerico = parseInt(precioNetflix.replace(/[^0-9]/g, ''), 10);

    return precioNumerico;
  } catch (error) {
    console.error('Error al obtener el precio de Netflix:', error);
    return null;
  }
}

// Función para obtener el precio de Max
async function obtenerPrecioMax() {
  try {
    const url = 'https://www.max.com/ar/es';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Obtener el texto del precio
    const precioMax = $('div.text.rich-text h4').text().trim();
    
    // Usar una expresión regular para extraer el precio con punto
    const precioMatch = precioMax.match(/\$?([\d.,]+)/);
    
    if (precioMatch) {
      // Eliminar el punto y convertir a número
      const precioLimpio = precioMatch[1].replace('.', '');
      const precio = parseInt(precioLimpio);
      
      if (!isNaN(precio) && precio > 0 && precio < 100000) {
        return precio;
      }
    }
    
    console.log('No se pudo extraer un precio válido de Max, usando valor por defecto');
    return 2990;

  } catch (error) {
    console.error('Error al obtener el precio de Max:', error);
    return 2990;
  }
}

// función para obtener el precio de prime video
async function obtenerPrecioPrimeVideo() {
  try {
    const url = 'https://www.primevideo.com/';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Buscar el texto que contiene el precio
    const textoConPrecio = $('span._text_1qfim_61._body_1qfim_94').text().trim();
    
    // Usar una expresión regular para encontrar "ARS" seguido de números y una coma
    const precioMatch = textoConPrecio.match(/ARS\s*([0-9,]+)/);
    
    if (precioMatch) {
      // Eliminar la coma y convertir a número
      const precioLimpio = precioMatch[1].replace(',', '');
      const precio = parseInt(precioLimpio);
      
      if (!isNaN(precio) && precio > 0 && precio < 100000) {
        return precio;
      }
    }
    
    console.log('No se pudo extraer un precio válido de Prime Video, usando valor por defecto');
    return 1599; // Valor por defecto como en tu código original

  } catch (error) {
    console.error('Error al obtener el precio de Prime Video:', error);
    return 1599; // Valor por defecto si hay un error
  }
}

async function obtenerPrecioDisney() {
  try {
    const url = "https://www.disneyplus.com/es-ar";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Buscar el elemento que contiene el precio usando múltiples selectores
    const precioElement = $('p:contains("ARS"), span:contains("ARS"), div:contains("ARS")')
      .filter(function () {
        return $(this)
          .text()
          .match(/ARS\s*[\d.,]+/);
      })
      .first();

    if (precioElement.length) {
      const precioTexto = precioElement.text().trim();

      // Extraer el número del texto usando una expresión regular más flexible
      const precioMatch = precioTexto.match(/ARS\s*([\d.,]+)/);

      if (precioMatch) {
        // Limpiar el precio y convertirlo a número
        const precioLimpio = precioMatch[1].replace(/[.,]/g, "");
        const precio = Number.parseInt(precioLimpio);

        if (!isNaN(precio) && precio > 0 && precio < 1000000) {
          // Devolver solo el número sin el signo de dólar
          return precio;
        }
      }
    }

    console.log("No se pudo extraer un precio válido de Disney+, usando valor por defecto");
    return 0; // Valor por defecto como número
  } catch (error) {
    console.error("Error al obtener el precio de Disney+:", error);
    return 0; // Valor por defecto como número si hay un error
  }
}

// Función para obtener los precios de los servicios de streaming
async function obtenerPreciosStreaming() {
  const precioNetflix = await obtenerPrecioNetflix();
  const precioMax = await obtenerPrecioMax();
  const precioAmazon = await obtenerPrecioPrimeVideo();
  const precioDisney = await obtenerPrecioDisney();
  return {
    netflix: precioNetflix || 3990, // Valor por defecto si hay un error
    max: precioMax || 2990, // Valor por defecto si hay un error
    disney : precioDisney || 3500, // Valor por defecto si hay un error
    amazon: precioAmazon || 1599, // Valor por defecto si hay un error
  };
}

// Función para actualizar y emitir todos los precios
async function actualizarPrecios() {
  const preciosDolar = await obtenerPreciosDolar()
  const preciosStreaming = await obtenerPreciosStreaming()

  if (preciosDolar && preciosStreaming) {
    io.emit("actualizacion_precios", {
      dolar: preciosDolar,
      streaming: preciosStreaming,
    })
  }
}

// Configurar intervalo para actualizar precios cada 5 minutos
setInterval(actualizarPrecios, 5 * 60 * 1000)

// Manejar conexiones de Socket.IO
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado")
  actualizarPrecios() // Enviar precios actuales al nuevo cliente
})

// Iniciar el servidor
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})