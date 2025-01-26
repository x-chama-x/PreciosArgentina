
// Función para obtener los precios del dolar y los servicios de streaming
const socket = io();
socket.on("actualizacion_precios", (data) => {
  document.getElementById("dolar-oficial-compra").textContent = `$${data.dolar.oficial.compra}`;
  document.getElementById("dolar-oficial-venta").textContent = `$${data.dolar.oficial.venta}`;
  document.getElementById("dolar-blue-compra").textContent = `$${data.dolar.blue.compra}`;
  document.getElementById("dolar-blue-venta").textContent = `$${data.dolar.blue.venta}`;
  document.getElementById("precio-netflix").textContent = `$${data.streaming.netflix}`;
  document.getElementById("precio-max").textContent = `$${data.streaming.max}`;
  document.getElementById("precio-disney").textContent = `$${data.streaming.disney}`;
  document.getElementById("precio-amazon").textContent = `$${data.streaming.amazon}`;
});