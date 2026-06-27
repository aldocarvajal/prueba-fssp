// Importar Supabase desde CDN
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Configuración Supabase
const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw"; 
const supabase = createClient(supabaseUrl, supabaseKey);

// Contenedores
const portadasContainer = document.getElementById("portadas-container");
const publicacionesContainer = document.getElementById("publicaciones-container");

// Modal editor
const editorModal = document.getElementById("editor-modal");
const editorImage = document.getElementById("editor-image");
const cropOverlay = document.querySelector(".crop-overlay");

let currentImages = [];
let currentIndex = 0;
let currentPortadaId = null;

// Variables para overlay
let offsetY = 0;
let isDragging = false;
let startX = 0, startY = 0;
let overlayOffsetX = 0, overlayOffsetY = 0;
let zoomLevel = 1;

// Función para actualizar overlay según tamaño real de la imagen
function updateOverlay() {
  const imgWidth = editorImage.clientWidth;
  const imgHeight = editorImage.clientHeight;

  if (imgWidth && imgHeight) {
    const aspectRatio = imgWidth / imgHeight;

    if (aspectRatio < (16/9)) {
      cropOverlay.style.width = imgWidth + "px";
      cropOverlay.style.height = (imgWidth * 9 / 16) + "px";
    } else {
      cropOverlay.style.height = imgHeight + "px";
      cropOverlay.style.width = (imgHeight * 16 / 9) + "px";
    }

    overlayOffsetX = 0;
    overlayOffsetY = 0;
    zoomLevel = 1;

    cropOverlay.style.top = "50%";
    cropOverlay.style.left = "50%";
    cropOverlay.style.transform = `translate(-50%, -50%) translate(0px, 0px) scale(1)`;
  }
}

// Movimiento del overlay con mouse
cropOverlay.addEventListener("mousedown", (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging || e.buttons !== 1) return;

  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;

  overlayOffsetX += deltaX;
  overlayOffsetY += deltaY;

  // 🔹 Calcular tamaño actual del overlay con zoom
  const overlayWidth = cropOverlay.offsetWidth * zoomLevel;
  const overlayHeight = cropOverlay.offsetHeight * zoomLevel;

  const maxX = (editorImage.clientWidth / 2) - (overlayWidth / 2);
  const maxY = (editorImage.clientHeight / 2) - (overlayHeight / 2);

  // 🔹 Limitar movimiento dentro de la imagen
  if (overlayOffsetX > maxX) overlayOffsetX = maxX;
  if (overlayOffsetX < -maxX) overlayOffsetX = -maxX;
  if (overlayOffsetY > maxY) overlayOffsetY = maxY;
  if (overlayOffsetY < -maxY) overlayOffsetY = -maxY;

  cropOverlay.style.transform = `translate(-50%, -50%) translate(${overlayOffsetX}px, ${overlayOffsetY}px) scale(${zoomLevel})`;

  startX = e.clientX;
  startY = e.clientY;
});


document.addEventListener("mouseup", () => {
  isDragging = false;
});


cropOverlay.addEventListener("wheel", (e) => {
  e.preventDefault();

  if (e.deltaY < 0) {
    zoomLevel += 0.1; // zoom in
  } else {
    zoomLevel -= 0.1; // zoom out
  }

  if (zoomLevel < 0.5) zoomLevel = 0.5;
  if (zoomLevel > 3) zoomLevel = 3;

  // 🔹 Limitar tamaño del overlay para que no supere la imagen
  const overlayWidth = cropOverlay.offsetWidth * zoomLevel;
  const overlayHeight = cropOverlay.offsetHeight * zoomLevel;

  const maxWidth = editorImage.clientWidth;
  const maxHeight = editorImage.clientHeight;

  if (overlayWidth > maxWidth) {
    zoomLevel = maxWidth / cropOverlay.offsetWidth;
  }
  if (overlayHeight > maxHeight) {
    zoomLevel = maxHeight / cropOverlay.offsetHeight;
  }

  cropOverlay.style.transform = `translate(-50%, -50%) translate(${overlayOffsetX}px, ${overlayOffsetY}px) scale(${zoomLevel})`;
});
// Cargar portadas
async function loadPortadas() {
  const { data: portadas, error } = await supabase
  .from("portadas")
  .select(`
    id,
    publicacion_id,
    posicion,
    fecha_asignacion,
    imagen_seleccionada,
    offset_y,
    overlay_x,
    overlay_y,
    zoom,
    publicaciones (
      id,
      titulo,
      fecha,
      autor,
      categoria,
      imagenes_text
    )
  `)
  .order("posicion", { ascending: true });


  if (error) {
    console.error("Error cargando portadas:", error);
    return;
  }

  portadasContainer.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const portada = portadas.find(p => p.posicion === i);
    if (portada) {
      let imagen = portada.imagen_seleccionada;
      if (!imagen) {
        const imagenesText = portada.publicaciones.imagenes_text || "";
        imagen = imagenesText.split(";")[0] || "";
      }

      portadasContainer.innerHTML += `
        <div class="card">
<div class="image-wrapper" style="overflow:hidden; position:relative; height:140px;">
  <img src="${imagen}" alt="Imagen"
       style="position:absolute; left:50%; top:50%;
              transform: translate(-50%, -50%) 
                         translate(${portada.overlay_x || 0}px, ${portada.overlay_y || 0}px) 
                         scale(${portada.zoom || 1});
              margin-top:${portada.offset_y || 0}px;">

          </div>
          <div class="card-content">
            <div class="card-title">${portada.publicaciones.titulo}</div>
            <div class="card-meta">${portada.publicaciones.fecha} · ${portada.publicaciones.autor}</div>
            <button class="btn-secondary" onclick="removePortada(${portada.id})">Quitar</button>
            <button class="btn-primary" onclick="openEditor(${portada.publicaciones.id}, ${portada.id})">Editar</button>
          </div>
        </div>
      `;
    } else {
      portadasContainer.innerHTML += `<div class="placeholder">Espacio disponible (Posición ${i})</div>`;
    }
  }
}


// Cargar publicaciones
async function loadPublicaciones() {
  const { data: publicaciones, error } = await supabase
    .from("publicaciones")
    .select("id, titulo, fecha, categoria, autor, imagenes_text")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error cargando publicaciones:", error);
    return;
  }

  publicacionesContainer.innerHTML = "";

  const { data: portadas } = await supabase.from("portadas").select("publicacion_id");

  for (const pub of publicaciones) {
    const yaSeleccionada = portadas.some(p => p.publicacion_id === pub.id);

    const imagenesText = pub.imagenes_text || "";
    const primeraImagen = imagenesText.split(";")[0] || "";

    publicacionesContainer.innerHTML += `
      <div class="card">
        <img src="${primeraImagen}" alt="Imagen">
        <div class="card-content">
          <div class="card-title">${pub.titulo}</div>
          <div class="card-meta">${pub.fecha} · ${pub.categoria} · ${pub.autor}</div>
          ${
            yaSeleccionada
              ? `<button class="btn-secondary" disabled>Ya seleccionada</button>`
              : `<button class="btn-primary" onclick="selectPortada(${pub.id})">Seleccionar para portada</button>`
          }
        </div>
      </div>
    `;
  }
}

// Seleccionar portada
window.selectPortada = async function(publicacionId) {
  const { data: portadas } = await supabase.from("portadas").select("*");
  if (portadas.length >= 5) {
    alert("Límite de 5 portadas alcanzado");
    return;
  }
  if (portadas.some(p => p.publicacion_id === publicacionId)) {
    alert("Esta publicación ya está seleccionada");
    return;
  }
  const posiciones = portadas.map(p => p.posicion);
  let posLibre = [1,2,3,4,5].find(p => !posiciones.includes(p));

  await supabase.from("portadas").insert({
    publicacion_id: publicacionId,
    posicion: posLibre,
    fecha_asignacion: new Date().toISOString()
  });
  loadPortadas();
  loadPublicaciones();
}

// Quitar portada
window.removePortada = async function(id) {
  if (confirm("¿Seguro que deseas quitar esta portada?")) {
    await supabase.from("portadas").delete().eq("id", id);
    loadPortadas();
    loadPublicaciones();
  }
}

// Abrir editor
window.openEditor = async function(publicacionId, portadaId) {
  currentPortadaId = portadaId;
  const { data: pub, error } = await supabase
    .from("publicaciones")
    .select("imagenes_text")
    .eq("id", publicacionId)
    .single();

  if (error) {
    console.error("Error cargando imágenes:", error);
    return;
  }

  currentImages = pub?.imagenes_text ? pub.imagenes_text.split(";") : [];
  currentIndex = 0;

  if (currentImages.length > 0) {
    editorImage.src = currentImages[currentIndex];
    editorImage.style.position = "absolute";
    editorImage.style.top = "50%";
    editorImage.style.left = "50%";
    editorImage.style.transform = "translate(-50%, -50%)";
    editorImage.style.cursor = "default";
    offsetY = 0;

    editorImage.onload = updateOverlay;
  } else {
    editorImage.src = "";
  }

  editorModal.classList.remove("hidden");
}

// Cerrar editor
window.closeEditor = function() {
  editorModal.classList.add("hidden");
  currentImages = [];
  currentIndex = 0;
  currentPortadaId = null;
  offsetY = 0;
  overlayOffsetX = 0;
  overlayOffsetY = 0;
  zoomLevel = 1;
}

// Navegar imágenes
window.prevImage = function() {
  if (currentImages.length > 1) {
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    editorImage.src = currentImages[currentIndex];
    editorImage.onload = updateOverlay;
    offsetY = 0;
    overlayOffsetX = 0;
    overlayOffsetY = 0;
    zoomLevel = 1;
  }
}

window.nextImage = function() {
  if (currentImages.length > 1) {
    currentIndex = (currentIndex + 1) % currentImages.length;
    editorImage.src = currentImages[currentIndex];
    editorImage.onload = updateOverlay;
    offsetY = 0;
    overlayOffsetX = 0;
    overlayOffsetY = 0;
    zoomLevel = 1;
  }
}

// Guardar selección
window.saveCrop = async function() {
  if (!currentPortadaId || currentImages.length === 0) return;

  await supabase.from("portadas").update({
    imagen_seleccionada: currentImages[currentIndex],
    offset_y: offsetY,
    overlay_x: overlayOffsetX,
    overlay_y: overlayOffsetY,
    zoom: zoomLevel
  }).eq("id", currentPortadaId);

  closeEditor();
  loadPortadas();
}

// Inicializar
loadPortadas();
loadPublicaciones();
