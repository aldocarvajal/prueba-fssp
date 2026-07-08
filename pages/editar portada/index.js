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
 
// Modal de confirmación (reemplaza confirm() nativo)
const confirmModal = document.getElementById("confirm-modal");
const confirmModalText = document.getElementById("confirm-modal-text");
const confirmModalCancel = document.getElementById("confirm-modal-cancel");
const confirmModalAccept = document.getElementById("confirm-modal-accept");
 
let currentImages = [];
let currentIndex = 0;
let currentPortadaId = null;
let currentCropData = null;
 
// Variables para overlay
let isDragging = false;
let startX = 0, startY = 0;
let overlayOffsetX = 0, overlayOffsetY = 0;
let zoomLevel = 1;
 
/* =========================================================
   MODAL DE CONFIRMACIÓN PROPIO
   Sustituye window.confirm() por un diálogo con el mismo
   diseño del resto de la página. Devuelve una Promise<boolean>.
========================================================= */
 
function mostrarConfirmacion(mensaje) {
  return new Promise((resolve) => {
    confirmModalText.textContent = mensaje;
    confirmModal.classList.remove("hidden");
 
    const limpiar = () => {
      confirmModal.classList.add("hidden");
      confirmModalAccept.removeEventListener("click", onAccept);
      confirmModalCancel.removeEventListener("click", onCancel);
    };
 
    const onAccept = () => {
      limpiar();
      resolve(true);
    };
 
    const onCancel = () => {
      limpiar();
      resolve(false);
    };
 
    confirmModalAccept.addEventListener("click", onAccept);
    confirmModalCancel.addEventListener("click", onCancel);
  });
}
 
/* =========================================================
   DETECCIÓN DE VIDEO / IMAGEN VÁLIDA
   Los videos nunca pueden usarse como portada (solo imágenes).
========================================================= */
 
// Detecta si una URL corresponde a un archivo de video por su extensión
function esArchivoVideo(url) {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|avi|mkv)(\?.*)?$/i.test(url);
}
 
// Devuelve la primera URL de IMAGEN real dentro de "imagenes_text" (ignora videos).
// Si la publicación solo tiene videos, devuelve null.
function primeraImagenValida(imagenesText) {
  const items = (imagenesText || "").split(";").filter(Boolean);
  return items.find(url => !esArchivoVideo(url)) || null;
}
 
// Construye el tag <img> o <video> correcto para mostrar como miniatura,
// según el tipo real del archivo (evita el ícono de "imagen rota" en videos).
function construirTagMediaMiniatura(url) {
  if (!url) {
    return `<div class="placeholder" style="height:140px;">Sin contenido</div>`;
  }
  if (esArchivoVideo(url)) {
    return `<video src="${url}" class="card-video-thumb" muted playsinline preload="metadata"></video>`;
  }
  return `<img src="${url}" alt="Imagen">`;
}
 
// Función para actualizar overlay según tamaño real de la imagen
function updateOverlay() {
  const imgWidth = editorImage.clientWidth;
  const imgHeight = editorImage.clientHeight;
 
  if (imgWidth && imgHeight) {
    const aspectRatio = imgWidth / imgHeight;
 
    if (aspectRatio < (16 / 9)) {
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
function restaurarOverlay(cropData) {
  const imgWidth = editorImage.clientWidth;
  const imgHeight = editorImage.clientHeight;
 
  if (!imgWidth || !imgHeight) return;
 
  const aspectRatio = imgWidth / imgHeight;
 
  let baseWidth, baseHeight;
  if (aspectRatio < (16 / 9)) {
    baseWidth = imgWidth;
    baseHeight = imgWidth * 9 / 16;
  } else {
    baseHeight = imgHeight;
    baseWidth = imgHeight * 16 / 9;
  }
 
  cropOverlay.style.width = baseWidth + "px";
  cropOverlay.style.height = baseHeight + "px";
  cropOverlay.style.top = "50%";
  cropOverlay.style.left = "50%";
 
  if (!cropData) {
    overlayOffsetX = 0;
    overlayOffsetY = 0;
    zoomLevel = 1;
    cropOverlay.style.transform = `translate(-50%, -50%) translate(0px, 0px) scale(1)`;
    return;
  }
 
  const naturalW = editorImage.naturalWidth;
  const naturalH = editorImage.naturalHeight;
  const dispScale = editorImage.clientWidth / naturalW;
 
  const { overlay_x: cropX, overlay_y: cropY, zoom: cropW } = cropData;
  const cropH = cropW * (naturalW / naturalH) * (9 / 16);
 
  const overlayW_natural = cropW * naturalW;
  const centerX_natural = (cropX * naturalW) + (overlayW_natural / 2);
  const centerY_natural = (cropY * naturalH) + (cropH * naturalH / 2);
 
  const overlayW_display = overlayW_natural * dispScale;
 
  overlayOffsetX = (centerX_natural - naturalW / 2) * dispScale;
  overlayOffsetY = (centerY_natural - naturalH / 2) * dispScale;
  zoomLevel = overlayW_display / baseWidth;
 
  cropOverlay.style.transform = `translate(-50%, -50%) translate(${overlayOffsetX}px, ${overlayOffsetY}px) scale(${zoomLevel})`;
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
 
  const overlayWidth = cropOverlay.offsetWidth * zoomLevel;
  const overlayHeight = cropOverlay.offsetHeight * zoomLevel;
 
  const maxX = (editorImage.clientWidth / 2) - (overlayWidth / 2);
  const maxY = (editorImage.clientHeight / 2) - (overlayHeight / 2);
 
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
    zoomLevel += 0.1;
  } else {
    zoomLevel -= 0.1;
  }
 
  if (zoomLevel < 0.5) zoomLevel = 0.5;
  if (zoomLevel > 3) zoomLevel = 3;
 
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
 
// Aplica un recorte (cropX, cropY, cropW en fracciones 0-1) a un <img>
// dentro de un contenedor de tamaño fijo, usando position:absolute.
function aplicarRecorte(imgEl, wrapperEl, cropX, cropY, cropW) {
  const render = () => {
    const naturalW = imgEl.naturalWidth;
    const naturalH = imgEl.naturalHeight;
 
    if (!naturalW || !naturalH) return;
 
    // El overlay siempre es 16:9, así que cropH se deriva de cropW
    const cropH = cropW * (naturalW / naturalH) * (9 / 16);
 
    const containerW = wrapperEl.clientWidth;
    const scale = containerW / (cropW * naturalW);
 
    imgEl.style.position = "absolute";
    imgEl.style.maxWidth = "none";
    imgEl.style.maxHeight = "none";
    imgEl.style.width = (naturalW * scale) + "px";
    imgEl.style.height = (naturalH * scale) + "px";
    imgEl.style.left = (-cropX * naturalW * scale) + "px";
    imgEl.style.top = (-cropY * naturalH * scale) + "px";
  };
 
  if (imgEl.complete && imgEl.naturalWidth) {
    render();
  } else {
    imgEl.onload = render;
  }
}
 
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
      // Nunca usar un video como imagen de portada. Si por datos legados
      // "imagen_seleccionada" fuera un video, se ignora y se busca la primera imagen real.
      let imagen = portada.imagen_seleccionada;
      if (esArchivoVideo(imagen)) imagen = null;
      if (!imagen) imagen = primeraImagenValida(portada.publicaciones.imagenes_text);
 
      portadasContainer.innerHTML += `
        <div class="card" draggable="true" data-posicion="${i}" data-portada-id="${portada.id}">
          <div class="image-wrapper" style="overflow:hidden; position:relative; height:140px; width:100%;">
            ${
              imagen
                ? `<img id="crop-${portada.id}" src="${imagen}" alt="Imagen">`
                : `<div class="placeholder" style="height:100%;">Sin imagen disponible</div>`
            }
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
      portadasContainer.innerHTML += `<div class="placeholder" data-posicion="${i}">Espacio disponible (Posición ${i})</div>`;
    }
  }
 
  // Aplicar el recorte real ya con los <img> insertados en el DOM
  for (let i = 1; i <= 5; i++) {
    const portada = portadas.find(p => p.posicion === i);
    if (!portada) continue;
 
    const imgEl = document.getElementById(`crop-${portada.id}`);
    const wrapperEl = imgEl?.parentElement;
    if (!imgEl || !wrapperEl) continue;
 
    const hasCrop = portada.overlay_x != null && portada.zoom != null;
 
    if (hasCrop) {
      aplicarRecorte(imgEl, wrapperEl, portada.overlay_x, portada.overlay_y, portada.zoom);
    } else {
      imgEl.style.width = "100%";
      imgEl.style.height = "100%";
      imgEl.style.objectFit = "cover";
    }
  }
 
  activarDragAndDrop();
}
 
function activarDragAndDrop() {
  const cards = portadasContainer.querySelectorAll('.card[draggable="true"]');
  let draggedEl = null;
 
  cards.forEach(card => {
    card.addEventListener("dragstart", (e) => {
      draggedEl = card;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
 
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      draggedEl = null;
    });
 
    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (card !== draggedEl) card.classList.add("drag-over");
    });
 
    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });
 
    card.addEventListener("drop", async (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");
 
      if (!draggedEl || card === draggedEl) return;
 
      const origenId = parseInt(draggedEl.dataset.portadaId);
      const destinoId = parseInt(card.dataset.portadaId);
      const origenPos = parseInt(draggedEl.dataset.posicion);
      const destinoPos = parseInt(card.dataset.posicion);
 
      await intercambiarPosiciones(origenId, origenPos, destinoId, destinoPos);
    });
  });
}
 
async function intercambiarPosiciones(idA, posA, idB, posB) {
  // Paso intermedio con NULL para evitar choque con la restricción única de posición
  const { error: err1 } = await supabase
    .from("portadas")
    .update({ posicion: null })
    .eq("id", idA);
 
  if (err1) { console.error("Error moviendo portada (paso 1):", err1); return; }
 
  const { error: err2 } = await supabase
    .from("portadas")
    .update({ posicion: posA })
    .eq("id", idB);
 
  if (err2) { console.error("Error moviendo portada (paso 2):", err2); return; }
 
  const { error: err3 } = await supabase
    .from("portadas")
    .update({ posicion: posB })
    .eq("id", idA);
 
  if (err3) { console.error("Error moviendo portada (paso 3):", err3); return; }
 
  loadPortadas();
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
 
    const items = (pub.imagenes_text || "").split(";").filter(Boolean);
    const primerItem = items[0] || "";
 
    // La miniatura de la tarjeta usa el tipo de archivo real (imagen o video),
    // así un video ya no se muestra como imagen rota — se muestra como <video> real.
    const mediaTag = construirTagMediaMiniatura(primerItem);
 
    // Para SELECCIONAR como portada, siempre se busca la primera imagen
    // real de la publicación (ignorando videos). Si no hay ninguna imagen, no se
    // puede seleccionar esta publicación como portada.
    const imagenValidaParaPortada = primeraImagenValida(pub.imagenes_text);
 
    let botonHtml;
    if (yaSeleccionada) {
      botonHtml = `<button class="btn-secondary" disabled>Ya seleccionada</button>`;
    } else if (!imagenValidaParaPortada) {
      botonHtml = `<button class="btn-secondary" disabled title="Esta publicación solo tiene videos">Sin imagen disponible</button>`;
    } else {
      botonHtml = `<button class="btn-primary" onclick="selectPortada(${pub.id})">Seleccionar para portada</button>`;
    }
 
    publicacionesContainer.innerHTML += `
      <div class="card">
        ${mediaTag}
        <div class="card-content">
          <div class="card-title">${pub.titulo}</div>
          <div class="card-meta">${pub.fecha} · ${pub.categoria} · ${pub.autor}</div>
          ${botonHtml}
        </div>
      </div>
    `;
  }
 
  // Forzamos que cada miniatura de video pinte un frame real (no queda en negro)
  publicacionesContainer.querySelectorAll(".card-video-thumb").forEach(video => {
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = 0.1;
    });
  });
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
  let posLibre = [1, 2, 3, 4, 5].find(p => !posiciones.includes(p));
 
  const { data: pub, error: pubError } = await supabase
    .from("publicaciones")
    .select("imagenes_text")
    .eq("id", publicacionId)
    .single();
 
  if (pubError) {
    console.error("Error obteniendo imagen de la publicación:", pubError);
    return;
  }
 
  // Nunca usar un video como portada — siempre la primera imagen real.
  const primeraImagen = primeraImagenValida(pub?.imagenes_text);
 
  if (!primeraImagen) {
    alert("Esta publicación no tiene ninguna imagen disponible. Los videos no se pueden usar como portada.");
    return;
  }
 
  await supabase
    .from("portadas")
    .upsert({
      publicacion_id: publicacionId,
      posicion: posLibre,
      fecha_asignacion: new Date().toISOString(),
      imagen_seleccionada: primeraImagen,
      overlay_x: 0.05,
      overlay_y: 0.05,
      zoom: 0.9
    }, { onConflict: ["posicion"] });
 
  loadPortadas();
  loadPublicaciones();
}
 
// Quitar portada
window.removePortada = async function(id) {
  const confirmado = await mostrarConfirmacion("¿Seguro que deseas quitar esta portada?");
  if (!confirmado) return;
 
  // Obtener la posición de la portada a eliminar
  const { data: portadaAEliminar, error: errBuscar } = await supabase
    .from("portadas")
    .select("posicion")
    .eq("id", id)
    .single();
 
  if (errBuscar) {
    console.error("Error buscando portada a eliminar:", errBuscar);
    return;
  }
 
  const posicionEliminada = portadaAEliminar.posicion;
 
  // Eliminar la portada
  const { error: errDelete } = await supabase
    .from("portadas")
    .delete()
    .eq("id", id);
 
  if (errDelete) {
    console.error("Error eliminando portada:", errDelete);
    return;
  }
 
  // Obtener todas las portadas con posición mayor a la eliminada
  const { data: siguientes, error: errSiguientes } = await supabase
    .from("portadas")
    .select("id, posicion")
    .gt("posicion", posicionEliminada)
    .order("posicion", { ascending: true });
 
  if (errSiguientes) {
    console.error("Error obteniendo portadas siguientes:", errSiguientes);
    return;
  }
 
  // Recorrer cada una y bajarle una posición (secuencial para no chocar con la restricción única)
  for (const p of siguientes) {
    const { error: errUpdate } = await supabase
      .from("portadas")
      .update({ posicion: p.posicion - 1 })
      .eq("id", p.id);
 
    if (errUpdate) {
      console.error(`Error reordenando portada ${p.id}:`, errUpdate);
    }
  }
 
  loadPortadas();
  loadPublicaciones();
}
 
// Abrir editor
window.openEditor = async function(publicacionId, portadaId) {
  currentPortadaId = portadaId;
 
  const { data: portada, error: errPortada } = await supabase
    .from("portadas")
    .select("imagen_seleccionada, overlay_x, overlay_y, zoom")
    .eq("id", portadaId)
    .single();
 
  if (errPortada) {
    console.error("Error cargando datos de la portada:", errPortada);
    return;
  }
 
  const { data: pub, error } = await supabase
    .from("publicaciones")
    .select("imagenes_text")
    .eq("id", publicacionId)
    .single();
 
  if (error) {
    console.error("Error cargando imágenes:", error);
    return;
  }
 
  // El editor de recorte solo trabaja con <img>, así que se filtran
  // los videos de esta publicación — solo se navega entre imágenes reales.
  currentImages = pub?.imagenes_text
    ? pub.imagenes_text.split(";").filter(url => url && !esArchivoVideo(url))
    : [];
 
  if (currentImages.length === 0) {
    alert("Esta publicación no tiene imágenes disponibles para editar (solo contiene videos).");
    return;
  }
 
  const indiceGuardado = portada.imagen_seleccionada
    ? currentImages.indexOf(portada.imagen_seleccionada)
    : -1;
 
  currentIndex = indiceGuardado !== -1 ? indiceGuardado : 0;
 
  currentCropData = (portada.overlay_x != null && portada.zoom != null)
    ? { overlay_x: portada.overlay_x, overlay_y: portada.overlay_y, zoom: portada.zoom }
    : null;
 
  editorImage.src = currentImages[currentIndex];
  editorImage.style.position = "absolute";
  editorImage.style.top = "50%";
  editorImage.style.left = "50%";
  editorImage.style.transform = "translate(-50%, -50%)";
  editorImage.style.cursor = "default";
 
  editorImage.onload = () => restaurarOverlay(currentCropData);
 
  editorModal.classList.remove("hidden");
}
// Cerrar editor
window.closeEditor = function() {
  editorModal.classList.add("hidden");
  currentImages = [];
  currentIndex = 0;
  currentPortadaId = null;
  currentCropData = null;
  overlayOffsetX = 0;
  overlayOffsetY = 0;
  zoomLevel = 1;
}
 
// Navegar imágenes (currentImages ya viene filtrado sin videos)
window.prevImage = function() {
  if (currentImages.length > 1) {
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    editorImage.src = currentImages[currentIndex];
    editorImage.onload = updateOverlay;
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
    overlayOffsetX = 0;
    overlayOffsetY = 0;
    zoomLevel = 1;
  }
}
 
// Guardar selección (recorte)
window.saveCrop = async function() {
  if (!currentPortadaId || currentImages.length === 0) return;
 
  const naturalW = editorImage.naturalWidth;
  const naturalH = editorImage.naturalHeight;
 
  if (!naturalW || !naturalH) {
    console.error("La imagen del editor no tiene dimensiones naturales disponibles todavía.");
    return;
  }
 
  // Escala real entre la imagen mostrada (contain) y su tamaño natural
  const dispScale = editorImage.clientWidth / naturalW;
 
  // Tamaño del overlay en píxeles de pantalla (con zoom aplicado)
  const overlayW_display = cropOverlay.offsetWidth * zoomLevel;
 
  // Convertido a píxeles de la imagen ORIGINAL
  const overlayW_natural = overlayW_display / dispScale;
  const centerX_natural = (naturalW / 2) + (overlayOffsetX / dispScale);
  const centerY_natural = (naturalH / 2) + (overlayOffsetY / dispScale);
 
  // El overlay siempre es 16:9 en pantalla; al pasar a coords naturales
  // ambos ejes se escalan igual (dispScale es uniforme), así que:
  const overlayH_natural = overlayW_natural * (9 / 16);
 
  let cropW = overlayW_natural / naturalW;
  cropW = Math.min(cropW, 1);
 
  const cropH = cropW * (naturalW / naturalH) * (9 / 16);
 
  let cropX = (centerX_natural - overlayW_natural / 2) / naturalW;
  let cropY = (centerY_natural - overlayH_natural / 2) / naturalH;
 
  cropX = Math.max(0, Math.min(1 - cropW, cropX));
  cropY = Math.max(0, Math.min(1 - cropH, cropY));
 
  const { error } = await supabase
    .from("portadas")
    .update({
      imagen_seleccionada: currentImages[currentIndex],
      overlay_x: cropX,  // fracción 0-1
      overlay_y: cropY,  // fracción 0-1
      zoom: cropW        // fracción 0-1 (ancho del recorte respecto a la imagen)
    })
    .eq("id", currentPortadaId)
    .select();
 
  if (error) {
    console.error("Error guardando recorte:", error);
    return;
  }
 
  console.log("Recorte guardado:", { currentPortadaId, cropX, cropY, cropW, cropH });
 
  closeEditor();
  loadPortadas();
};
 
// Inicializar
loadPortadas();
loadPublicaciones();
window.supabase = supabase;