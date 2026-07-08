/* =========================================================
   1. IMPORTAR SUPABASE
========================================================= */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* =========================================================
   2. CONFIGURACIÓN SUPABASE
========================================================= */

const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw";
const supabase = createClient(supabaseUrl, supabaseKey);

/* =========================================================
   3. ELEMENTOS DEL DOM
========================================================= */

const imageInput = document.getElementById("post-images");
const gallery = document.getElementById("image-gallery");

const previewCard = document.getElementById("preview-card");
const previewTitle = document.getElementById("preview-title");
const previewDescription = document.getElementById("preview-description");
const previewCarousel = document.getElementById("preview-carousel");
const previewTrack = document.getElementById("preview-carousel-track");
const btnPrev = document.getElementById("carousel-prev");
const btnNext = document.getElementById("carousel-next");

// Elementos del modal de recorte
const cropModal = document.getElementById("crop-modal");
const cropStepRatio = document.getElementById("crop-step-ratio");
const cropStepEditor = document.getElementById("crop-step-editor");
const cropEditorImage = document.getElementById("crop-editor-image");
const cropEditorVideo = document.getElementById("crop-editor-video");
const cropEditorOverlay = document.getElementById("crop-editor-overlay");
const cropConfirmBtn = document.getElementById("crop-confirm-btn");
const cropCancelBtn = document.getElementById("crop-cancel-btn");

// Botón "Editar tamaño"
const btnEditarTamano = document.getElementById("btn-editar-tamano");

// Overlay de estado (subiendo / publicado)
const statusOverlay = document.getElementById("status-overlay");
const statusSpinner = document.getElementById("status-spinner");
const statusCheck = document.getElementById("status-check");
const statusText = document.getElementById("status-text");

/* =========================================================
   4. VISTA PREVIA PROGRESIVA
========================================================= */

function actualizarVisibilidadPreview() {
  const titulo = document.getElementById("post-title").value.trim();
  const descripcion = document.getElementById("post-description").value.trim();
  const hayFotos = previewTrack.children.length > 0;

  const hayAlgo = titulo || descripcion || hayFotos;

  previewCard.classList.toggle("hidden", !hayAlgo);
  previewTitle.classList.toggle("hidden", !titulo);
  previewDescription.classList.toggle("hidden", !descripcion);
  previewCarousel.classList.toggle("hidden", !hayFotos);

  document.querySelector(".dashboard-container").classList.toggle("con-contenido", hayAlgo);
}

document.getElementById("post-title").addEventListener("input", (e) => {
  previewTitle.textContent = e.target.value;
  actualizarVisibilidadPreview();
  limpiarErrorCampo(document.getElementById("post-title"));
});

document.getElementById("post-description").addEventListener("input", (e) => {
  previewDescription.textContent = e.target.value;
  actualizarVisibilidadPreview();
  limpiarErrorCampo(document.getElementById("post-description"));
});

document.getElementById("post-category").addEventListener("change", (e) => {
  limpiarErrorCampo(e.target);
});

/* =========================================================
   5. CARRUSEL DE PREVIEW
========================================================= */

let currentIndex = 0;

function updateCarousel() {
  const width = previewTrack.clientWidth;
  previewTrack.style.transform = `translateX(-${currentIndex * width}px)`;
}

btnPrev.addEventListener("click", () => {
  currentIndex =
    currentIndex > 0
      ? currentIndex - 1
      : previewTrack.children.length - 1;
  updateCarousel();
});

btnNext.addEventListener("click", () => {
  currentIndex =
    currentIndex < previewTrack.children.length - 1
      ? currentIndex + 1
      : 0;
  updateCarousel();
});

/* =========================================================
   6. CLASIFICAR ARCHIVOS (imagen recortable / gif / video)
========================================================= */

function obtenerTipoArchivo(file) {
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "image/gif") return "gif";
  return "imagen";
}

function actualizarAspectoPreview(ratio) {
  if (!previewCarousel) return;
  const valor = ratio === 1 ? "1 / 1" : ratio < 1 ? "4 / 5" : "16 / 9";
  previewCarousel.style.aspectRatio = valor;
  void previewCarousel.offsetHeight;
}

/* =========================================================
   7. COLA DE RECORTE (IMÁGENES Y VIDEOS)
========================================================= */

let colaImagenes = [];
let archivosRecortados = [];

let ratioActual = null;
let zoomLevel = 1;
let overlayOffsetX = 0;
let overlayOffsetY = 0;
let isDragging = false;
let startX = 0, startY = 0;

let enEdicionMasiva = false;
let videoActualParaRecorte = null;

function obtenerRatioExistente() {
  const existente = archivosRecortados.find(e => e.tipo === "imagen" || e.tipo === "video");
  return existente ? existente.ratio : null;
}

imageInput.addEventListener("change", () => {
  const archivos = Array.from(imageInput.files);
  colaImagenes = [];

  const ratioExistente = obtenerRatioExistente();
  ratioActual = ratioExistente !== null ? ratioExistente : null;

  archivos.forEach(file => {
    const tipo = obtenerTipoArchivo(file);
    if (tipo === "imagen" || tipo === "video") {
      colaImagenes.push({ file, tipo });
    } else {
      agregarArchivoSinRecorte(file, tipo);
    }
  });

  if (colaImagenes.length > 0) {
    procesarSiguienteImagen();
  }
});

function mostrarEditorComoImagen() {
  cropEditorVideo.classList.add("hidden");
  cropEditorVideo.pause();
  cropEditorImage.classList.remove("hidden");
}

function mostrarEditorComoVideo() {
  cropEditorImage.classList.add("hidden");
  cropEditorVideo.classList.remove("hidden");
}

function procesarSiguienteImagen() {
  if (colaImagenes.length === 0) {
    cropModal.classList.add("hidden");
    return;
  }

  const { file, tipo } = colaImagenes.shift();

  if (tipo === "video") {
    procesarVideoParaRecorte(file);
    return;
  }

  mostrarEditorComoImagen();

  const reader = new FileReader();

  reader.onload = (e) => {
    cropEditorImage.src = e.target.result;
    cropEditorImage.dataset.filename = file.name;
    cropEditorImage.dataset.originalDataUrl = e.target.result;

    cropModal.classList.remove("hidden");

    if (ratioActual === null) {
      cropStepRatio.classList.remove("hidden");
      cropStepEditor.classList.add("hidden");
    } else {
      cropStepRatio.classList.add("hidden");
      cropStepEditor.classList.remove("hidden");

      cropEditorImage.onload = inicializarOverlay;
      if (cropEditorImage.complete) inicializarOverlay();
    }
  };

  reader.readAsDataURL(file);
}

function procesarVideoParaRecorte(file) {
  const url = URL.createObjectURL(file);
  videoActualParaRecorte = { file, url };

  mostrarEditorComoVideo();

  cropEditorVideo.src = url;
  cropEditorVideo.dataset.filename = file.name;

  cropModal.classList.remove("hidden");

  if (ratioActual === null) {
    cropStepRatio.classList.remove("hidden");
    cropStepEditor.classList.add("hidden");
  } else {
    cropStepRatio.classList.add("hidden");
    cropStepEditor.classList.remove("hidden");
    cropEditorVideo.onloadedmetadata = inicializarOverlayVideo;
    if (cropEditorVideo.readyState >= 1) inicializarOverlayVideo();
  }
}

document.querySelectorAll(".ratio-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    ratioActual = parseFloat(btn.dataset.ratio);
    cropStepRatio.classList.add("hidden");
    cropStepEditor.classList.remove("hidden");

    const esVideo = !cropEditorVideo.classList.contains("hidden");
    const initFn = esVideo ? inicializarOverlayVideo : inicializarOverlay;

    if (enEdicionMasiva) {
      if (entradaEnEdicion && entradaEnEdicion.tipo === "video") {
        cropEditorVideo.onloadedmetadata = initFn;
        cropEditorVideo.dataset.filename = entradaEnEdicion.file.name;
        if (cropEditorVideo.readyState >= 1) initFn();
      } else if (entradaEnEdicion) {
        cropEditorImage.onload = initFn;
        cropEditorImage.dataset.filename = entradaEnEdicion.file.name;
        cropEditorImage.src = entradaEnEdicion.imagenOriginalDataUrl;
        if (cropEditorImage.complete) initFn();
      }
    } else {
      if (esVideo) {
        cropEditorVideo.onloadedmetadata = initFn;
        if (cropEditorVideo.readyState >= 1) initFn();
      } else {
        cropEditorImage.onload = initFn;
        if (cropEditorImage.complete) initFn();
      }
    }
  });
});

function inicializarOverlay() {
  const imgWidth = cropEditorImage.clientWidth;
  const imgHeight = cropEditorImage.clientHeight;

  if (!imgWidth || !imgHeight) return;

  const aspectRatio = imgWidth / imgHeight;

  if (aspectRatio < ratioActual) {
    cropEditorOverlay.style.width = imgWidth + "px";
    cropEditorOverlay.style.height = (imgWidth / ratioActual) + "px";
  } else {
    cropEditorOverlay.style.height = imgHeight + "px";
    cropEditorOverlay.style.width = (imgHeight * ratioActual) + "px";
  }

  overlayOffsetX = 0;
  overlayOffsetY = 0;
  zoomLevel = 1;

  cropEditorOverlay.style.top = "50%";
  cropEditorOverlay.style.left = "50%";
  cropEditorOverlay.style.transform = `translate(-50%, -50%) translate(0px, 0px) scale(1)`;
}

function inicializarOverlayVideo() {
  const vidWidth = cropEditorVideo.clientWidth;
  const vidHeight = cropEditorVideo.clientHeight;

  if (!vidWidth || !vidHeight) return;

  const aspectRatio = vidWidth / vidHeight;

  if (aspectRatio < ratioActual) {
    cropEditorOverlay.style.width = vidWidth + "px";
    cropEditorOverlay.style.height = (vidWidth / ratioActual) + "px";
  } else {
    cropEditorOverlay.style.height = vidHeight + "px";
    cropEditorOverlay.style.width = (vidHeight * ratioActual) + "px";
  }

  overlayOffsetX = 0;
  overlayOffsetY = 0;
  zoomLevel = 1;

  cropEditorOverlay.style.top = "50%";
  cropEditorOverlay.style.left = "50%";
  cropEditorOverlay.style.transform = `translate(-50%, -50%) translate(0px, 0px) scale(1)`;
}

function restaurarOverlay(estado) {
  const esVideo = !cropEditorVideo.classList.contains("hidden");
  const elRef = esVideo ? cropEditorVideo : cropEditorImage;

  const imgWidth = elRef.clientWidth;
  const imgHeight = elRef.clientHeight;

  if (!imgWidth || !imgHeight) return;

  const aspectRatio = imgWidth / imgHeight;

  if (aspectRatio < ratioActual) {
    cropEditorOverlay.style.width = imgWidth + "px";
    cropEditorOverlay.style.height = (imgWidth / ratioActual) + "px";
  } else {
    cropEditorOverlay.style.height = imgHeight + "px";
    cropEditorOverlay.style.width = (imgHeight * ratioActual) + "px";
  }

  const nuevoBaseWidth = cropEditorOverlay.offsetWidth;
  const escala = estado.overlayWidthBase ? (nuevoBaseWidth / estado.overlayWidthBase) : 1;

  overlayOffsetX = estado.offsetX * escala;
  overlayOffsetY = estado.offsetY * escala;
  zoomLevel = estado.zoom;

  cropEditorOverlay.style.top = "50%";
  cropEditorOverlay.style.left = "50%";
  cropEditorOverlay.style.transform = `translate(-50%, -50%) translate(${overlayOffsetX}px, ${overlayOffsetY}px) scale(${zoomLevel})`;
}

cropEditorOverlay.addEventListener("mousedown", (e) => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging || e.buttons !== 1) return;

  const esVideo = !cropEditorVideo.classList.contains("hidden");
  const elRef = esVideo ? cropEditorVideo : cropEditorImage;

  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;

  overlayOffsetX += deltaX;
  overlayOffsetY += deltaY;

  const overlayWidth = cropEditorOverlay.offsetWidth * zoomLevel;
  const overlayHeight = cropEditorOverlay.offsetHeight * zoomLevel;

  const maxX = (elRef.clientWidth / 2) - (overlayWidth / 2);
  const maxY = (elRef.clientHeight / 2) - (overlayHeight / 2);

  if (overlayOffsetX > maxX) overlayOffsetX = maxX;
  if (overlayOffsetX < -maxX) overlayOffsetX = -maxX;
  if (overlayOffsetY > maxY) overlayOffsetY = maxY;
  if (overlayOffsetY < -maxY) overlayOffsetY = -maxY;

  cropEditorOverlay.style.transform = `translate(-50%, -50%) translate(${overlayOffsetX}px, ${overlayOffsetY}px) scale(${zoomLevel})`;

  startX = e.clientX;
  startY = e.clientY;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

cropEditorOverlay.addEventListener("wheel", (e) => {
  e.preventDefault();

  const esVideo = !cropEditorVideo.classList.contains("hidden");
  const elRef = esVideo ? cropEditorVideo : cropEditorImage;

  if (e.deltaY < 0) {
    zoomLevel += 0.1;
  } else {
    zoomLevel -= 0.1;
  }

  if (zoomLevel < 0.5) zoomLevel = 0.5;
  if (zoomLevel > 3) zoomLevel = 3;

  const overlayWidth = cropEditorOverlay.offsetWidth * zoomLevel;
  const overlayHeight = cropEditorOverlay.offsetHeight * zoomLevel;

  const maxWidth = elRef.clientWidth;
  const maxHeight = elRef.clientHeight;

  if (overlayWidth > maxWidth) {
    zoomLevel = maxWidth / cropEditorOverlay.offsetWidth;
  }
  if (overlayHeight > maxHeight) {
    zoomLevel = maxHeight / cropEditorOverlay.offsetHeight;
  }

  cropEditorOverlay.style.transform = `translate(-50%, -50%) translate(${overlayOffsetX}px, ${overlayOffsetY}px) scale(${zoomLevel})`;
});

cropCancelBtn.addEventListener("click", () => {
  if (enEdicionMasiva) {
    entradaEnEdicion = null;
    thumbEnEdicion = null;
    previewItemEnEdicion = null;
    procesarSiguienteReedicion();
  } else if (entradaEnEdicion) {
    entradaEnEdicion = null;
    thumbEnEdicion = null;
    previewItemEnEdicion = null;
    cropModal.classList.add("hidden");
    mostrarEditorComoImagen();
  } else {
    mostrarEditorComoImagen();
    procesarSiguienteImagen();
  }
});

cropConfirmBtn.addEventListener("click", () => {
  const esVideo = !cropEditorVideo.classList.contains("hidden");

  if (esVideo) {
    confirmarRecorteVideo();
    return;
  }

  const naturalW = cropEditorImage.naturalWidth;
  const naturalH = cropEditorImage.naturalHeight;
  const dispScale = cropEditorImage.clientWidth / naturalW;

  const overlayW_display = cropEditorOverlay.offsetWidth * zoomLevel;
  const overlayW_natural = overlayW_display / dispScale;
  const overlayH_natural = overlayW_natural / ratioActual;

  const centerX_natural = (naturalW / 2) + (overlayOffsetX / dispScale);
  const centerY_natural = (naturalH / 2) + (overlayOffsetY / dispScale);

  let cropX = centerX_natural - overlayW_natural / 2;
  let cropY = centerY_natural - overlayH_natural / 2;

  cropX = Math.max(0, Math.min(naturalW - overlayW_natural, cropX));
  cropY = Math.max(0, Math.min(naturalH - overlayH_natural, cropY));

  let outputWidth, outputHeight;
  if (ratioActual === 1) { outputWidth = 1080; outputHeight = 1080; }
  else if (ratioActual < 1) { outputWidth = 1080; outputHeight = 1350; }
  else { outputWidth = 1920; outputHeight = 1080; }

  const estadoOverlay = {
    zoom: zoomLevel,
    offsetX: overlayOffsetX,
    offsetY: overlayOffsetY,
    overlayWidthBase: cropEditorOverlay.offsetWidth,
    overlayHeightBase: cropEditorOverlay.offsetHeight
  };

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    cropEditorImage,
    cropX, cropY, overlayW_natural, overlayH_natural,
    0, 0, outputWidth, outputHeight
  );

  canvas.toBlob((blob) => {
    const filename = cropEditorImage.dataset.filename || `imagen_${Date.now()}.jpg`;
    const file = new File([blob], filename, { type: "image/jpeg" });

    if (entradaEnEdicion) {
      const entradaActual = entradaEnEdicion;
      const thumbActual = thumbEnEdicion;
      const previewItemActual = previewItemEnEdicion;

      entradaActual.file = file;
      entradaActual.ratio = ratioActual;
      entradaActual.estadoOverlay = estadoOverlay;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (thumbActual) {
          const imgThumb = thumbActual.querySelector("img");
          if (imgThumb) imgThumb.src = e.target.result;
        }
        if (previewItemActual) {
          previewItemActual.style.backgroundImage = `url(${e.target.result})`;
          const imgPreview = previewItemActual.querySelector("img");
          if (imgPreview) imgPreview.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);

      entradaEnEdicion = null;
      thumbEnEdicion = null;
      previewItemEnEdicion = null;

      if (enEdicionMasiva) {
        procesarSiguienteReedicion();
      } else {
        cropModal.classList.add("hidden");
      }
    } else {
      agregarImagenALaGaleria(file, cropEditorImage.dataset.originalDataUrl, { cropX, cropY, overlayW_natural, overlayH_natural, outputWidth, outputHeight }, estadoOverlay);
      procesarSiguienteImagen();
    }
  }, "image/jpeg", 0.9);
});

function confirmarRecorteVideo() {
  const estadoOverlay = {
    zoom: zoomLevel,
    offsetX: overlayOffsetX,
    offsetY: overlayOffsetY,
    overlayWidthBase: cropEditorOverlay.offsetWidth,
    overlayHeightBase: cropEditorOverlay.offsetHeight
  };

  const naturalW = cropEditorVideo.videoWidth;
  const naturalH = cropEditorVideo.videoHeight;
  const dispScale = cropEditorVideo.clientWidth / naturalW;

  const overlayW_display = cropEditorOverlay.offsetWidth * zoomLevel;
  const overlayW_natural = overlayW_display / dispScale;
  const overlayH_natural = overlayW_natural / ratioActual;

  const centerX_natural = (naturalW / 2) + (overlayOffsetX / dispScale);
  const centerY_natural = (naturalH / 2) + (overlayOffsetY / dispScale);

  let cropX = centerX_natural - overlayW_natural / 2;
  let cropY = centerY_natural - overlayH_natural / 2;

  cropX = Math.max(0, Math.min(naturalW - overlayW_natural, cropX));
  cropY = Math.max(0, Math.min(naturalH - overlayH_natural, cropY));

  let wPct = overlayW_natural / naturalW;
  let hPct = overlayH_natural / naturalH;
  let xPct = cropX / naturalW;
  let yPct = cropY / naturalH;

  wPct = Math.min(wPct, 1);
  hPct = Math.min(hPct, 1);
  xPct = Math.max(0, Math.min(1 - wPct, xPct));
  yPct = Math.max(0, Math.min(1 - hPct, yPct));

  const encuadre = { xPct, yPct, wPct, hPct };

  if (entradaEnEdicion) {
    const entradaActual = entradaEnEdicion;

    entradaActual.ratio = ratioActual;
    entradaActual.estadoOverlay = estadoOverlay;
    entradaActual.encuadre = encuadre;

    aplicarEncuadreVideo(entradaActual);

    entradaEnEdicion = null;
    thumbEnEdicion = null;
    previewItemEnEdicion = null;

    if (enEdicionMasiva) {
      procesarSiguienteReedicion();
    } else {
      cropModal.classList.add("hidden");
      mostrarEditorComoImagen();
    }
  } else {
    agregarVideoConRecorte(
      videoActualParaRecorte.file,
      videoActualParaRecorte.url,
      ratioActual,
      encuadre,
      estadoOverlay
    );
    mostrarEditorComoImagen();
    procesarSiguienteImagen();
  }
}

/* =========================================================
   8. AGREGAR IMAGEN RECORTADA A GALERÍA Y CARRUSEL
========================================================= */

function agregarImagenALaGaleria(file, imagenOriginalDataUrl, datosRecorte, estadoOverlay) {
  const entrada = {
    file,
    tipo: "imagen",
    imagenOriginalDataUrl,
    datosRecorte,
    ratio: ratioActual,
    estadoOverlay,
    thumbEl: null,
    previewItemEl: null
  };

  archivosRecortados.push(entrada);

  const reader = new FileReader();
  reader.onload = (e) => {
    const thumb = document.createElement("div");
    thumb.classList.add("thumbnail");
    entrada.thumbEl = thumb;

    const img = document.createElement("img");
    img.src = e.target.result;
    img.alt = file.name;

    const previewItem = document.createElement("div");
    previewItem.classList.add("preview-carousel-item");

    previewItem.style.backgroundImage = `url(${e.target.result})`;
    previewItem.style.backgroundSize = "cover";
    previewItem.style.backgroundPosition = "center";

    const previewImg = document.createElement("img");
    previewImg.src = e.target.result;
    previewImg.alt = file.name;

    previewItem.appendChild(previewImg);
    previewTrack.appendChild(previewItem);

    entrada.previewItemEl = previewItem;

    actualizarAspectoPreview(entrada.ratio);

    updateCarousel();
    actualizarVisibilidadPreview();
    actualizarBotonEditarTamano();
    limpiarErrorGaleria();

    const actions = document.createElement("div");
    actions.classList.add("thumb-actions");

    const btnEditar = document.createElement("button");
    btnEditar.classList.add("btn-edit-size");
    btnEditar.textContent = "Editar recorte";
    btnEditar.addEventListener("click", () => reeditarImagen(entrada, thumb, previewItem));

    const btnEliminar = document.createElement("button");
    btnEliminar.classList.add("btn-delete-thumb");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.addEventListener("click", () => {
      eliminarEntrada(entrada, thumb, previewItem);
    });

    actions.appendChild(btnEditar);
    actions.appendChild(btnEliminar);

    thumb.appendChild(img);
    thumb.appendChild(actions);
    gallery.appendChild(thumb);
  };

  reader.readAsDataURL(file);
}

let entradaEnEdicion = null;
let thumbEnEdicion = null;
let previewItemEnEdicion = null;

function reeditarImagen(entrada, thumb, previewItem) {
  enEdicionMasiva = false;
  entradaEnEdicion = entrada;
  thumbEnEdicion = thumb;
  previewItemEnEdicion = previewItem;

  ratioActual = entrada.ratio;

  mostrarEditorComoImagen();

  cropModal.classList.remove("hidden");
  cropStepRatio.classList.add("hidden");
  cropStepEditor.classList.remove("hidden");

  const restaurar = () => {
    if (entrada.estadoOverlay) {
      restaurarOverlay(entrada.estadoOverlay);
    } else {
      inicializarOverlay();
    }
  };

  cropEditorImage.onload = null;
  cropEditorImage.src = "";
  cropEditorImage.dataset.filename = entrada.file.name;

  requestAnimationFrame(() => {
    cropEditorImage.onload = restaurar;
    cropEditorImage.src = entrada.imagenOriginalDataUrl;
    if (cropEditorImage.complete) restaurar();
  });
}

/* =========================================================
   9. AGREGAR VIDEO CON ENCUADRE
========================================================= */

function agregarVideoConRecorte(file, objectUrl, ratio, encuadre, estadoOverlay) {
  const entrada = {
    file,
    tipo: "video",
    objectUrl,
    ratio,
    encuadre,
    estadoOverlay,
    thumbEl: null,
    previewItemEl: null
  };
  archivosRecortados.push(entrada);

  const thumb = document.createElement("div");
  thumb.classList.add("thumbnail");
  entrada.thumbEl = thumb;

  const mediaThumb = document.createElement("video");
  mediaThumb.src = objectUrl;
  mediaThumb.muted = true;
  mediaThumb.loop = true;
  mediaThumb.playsInline = true;
  mediaThumb.autoplay = false;
  mediaThumb.preload = "metadata";
  mediaThumb.addEventListener("loadedmetadata", () => {
    mediaThumb.currentTime = 0.1;
  });
  thumb.appendChild(mediaThumb);

  const previewItem = document.createElement("div");
  previewItem.classList.add("preview-carousel-item", "video-item");
  previewItem.style.backgroundColor = "#000";

  const videoPreview = document.createElement("video");
  videoPreview.src = objectUrl;
  videoPreview.muted = true;
  videoPreview.loop = true;
  videoPreview.playsInline = true;
  videoPreview.autoplay = false;
  videoPreview.preload = "metadata";
  videoPreview.addEventListener("loadedmetadata", () => {
    videoPreview.currentTime = 0.1;
  });
  previewItem.appendChild(videoPreview);

  const btnPlay = document.createElement("button");
  btnPlay.classList.add("video-play-btn");
  btnPlay.type = "button";
  btnPlay.textContent = "▶";
  btnPlay.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (videoPreview.paused) {
      videoPreview.play();
      btnPlay.textContent = "❚❚";
    } else {
      videoPreview.pause();
      btnPlay.textContent = "▶";
    }
  });
  previewItem.appendChild(btnPlay);

  videoPreview.addEventListener("ended", () => {
    btnPlay.textContent = "▶";
  });

  const btnMute = document.createElement("button");
  btnMute.classList.add("video-mute-btn");
  btnMute.type = "button";
  btnMute.textContent = "🔇";
  btnMute.addEventListener("click", (ev) => {
    ev.stopPropagation();
    videoPreview.muted = !videoPreview.muted;
    btnMute.textContent = videoPreview.muted ? "🔇" : "🔊";
  });
  previewItem.appendChild(btnMute);

  previewTrack.appendChild(previewItem);
  entrada.previewItemEl = previewItem;

  aplicarEncuadreVideo(entrada);
  requestAnimationFrame(() => aplicarEncuadreVideo(entrada));
  videoPreview.addEventListener("loadedmetadata", () => aplicarEncuadreVideo(entrada), { once: true });

  updateCarousel();
  actualizarVisibilidadPreview();
  actualizarBotonEditarTamano();
  limpiarErrorGaleria();

  const actions = document.createElement("div");
  actions.classList.add("thumb-actions");

  const btnEditar = document.createElement("button");
  btnEditar.classList.add("btn-edit-size");
  btnEditar.textContent = "Editar recorte";
  btnEditar.addEventListener("click", () => reeditarVideo(entrada, thumb, previewItem));

  const btnEliminar = document.createElement("button");
  btnEliminar.classList.add("btn-delete-thumb");
  btnEliminar.textContent = "Eliminar";
  btnEliminar.addEventListener("click", () => {
    eliminarEntrada(entrada, thumb, previewItem);
  });

  actions.appendChild(btnEditar);
  actions.appendChild(btnEliminar);
  thumb.appendChild(actions);
  gallery.appendChild(thumb);
}

function aplicarEncuadreVideo(entrada) {
  let { xPct, yPct, wPct, hPct } = entrada.encuadre;

  wPct = Math.min(wPct, 1);
  hPct = Math.min(hPct, 1);
  xPct = Math.max(0, Math.min(1 - wPct, xPct));
  yPct = Math.max(0, Math.min(1 - hPct, yPct));

  const escalaX = 1 / wPct;
  const escalaY = 1 / hPct;

  const anchoPct = escalaX * 100;
  const altoPct = escalaY * 100;
  const leftPct = -xPct * escalaX * 100;
  const topPct = -yPct * escalaY * 100;

  const aplicar = (contenedor) => {
    if (!contenedor) return;
    contenedor.style.position = "relative";
    contenedor.style.overflow = "hidden";

    const video = contenedor.querySelector("video");
    if (!video) return;

    video.style.position = "absolute";
    video.style.transform = "none";
    video.style.objectFit = "fill";
    video.style.width = `${anchoPct}%`;
    video.style.height = `${altoPct}%`;
    video.style.left = `${leftPct}%`;
    video.style.top = `${topPct}%`;
  };

  if (entrada.thumbEl) aplicar(entrada.thumbEl);

  actualizarAspectoPreview(entrada.ratio);

  if (entrada.previewItemEl) {
    aplicar(entrada.previewItemEl);
    requestAnimationFrame(() => aplicar(entrada.previewItemEl));
  }
}

function reeditarVideo(entrada, thumb, previewItem) {
  enEdicionMasiva = false;
  entradaEnEdicion = entrada;
  thumbEnEdicion = thumb;
  previewItemEnEdicion = previewItem;
  ratioActual = entrada.ratio;

  videoActualParaRecorte = { file: entrada.file, url: entrada.objectUrl };

  mostrarEditorComoVideo();

  cropModal.classList.remove("hidden");
  cropStepRatio.classList.add("hidden");
  cropStepEditor.classList.remove("hidden");

  cropEditorVideo.src = entrada.objectUrl;
  cropEditorVideo.dataset.filename = entrada.file.name;

  const restaurar = () => {
    if (entrada.estadoOverlay) {
      restaurarOverlay(entrada.estadoOverlay);
    } else {
      inicializarOverlayVideo();
    }
  };

  cropEditorVideo.onloadedmetadata = restaurar;
  if (cropEditorVideo.readyState >= 1) restaurar();
}

/* =========================================================
   10. AGREGAR GIF (SIN RECORTE)
========================================================= */

function agregarArchivoSinRecorte(file, tipo) {
  const entrada = {
    file,
    tipo,
    objectUrl: null,
    thumbEl: null,
    previewItemEl: null
  };

  archivosRecortados.push(entrada);

  const construirElementos = (srcUrl) => {
    const thumb = document.createElement("div");
    thumb.classList.add("thumbnail");
    entrada.thumbEl = thumb;

    const mediaThumb = document.createElement("img");
    mediaThumb.src = srcUrl;
    mediaThumb.alt = file.name;
    thumb.appendChild(mediaThumb);

    const previewItem = document.createElement("div");
    previewItem.classList.add("preview-carousel-item");

    previewItem.style.backgroundImage = `url(${srcUrl})`;
    previewItem.style.backgroundSize = "cover";
    previewItem.style.backgroundPosition = "center";

    const previewImg = document.createElement("img");
    previewImg.src = srcUrl;
    previewImg.alt = file.name;
    previewItem.appendChild(previewImg);

    previewTrack.appendChild(previewItem);
    entrada.previewItemEl = previewItem;

    updateCarousel();
    actualizarVisibilidadPreview();
    actualizarBotonEditarTamano();
    limpiarErrorGaleria();

    const actions = document.createElement("div");
    actions.classList.add("thumb-actions");

    const btnEliminar = document.createElement("button");
    btnEliminar.classList.add("btn-delete-thumb");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.addEventListener("click", () => {
      eliminarEntrada(entrada, thumb, previewItem);
    });

    actions.appendChild(btnEliminar);
    thumb.appendChild(actions);
    gallery.appendChild(thumb);
  };

  const reader = new FileReader();
  reader.onload = (e) => construirElementos(e.target.result);
  reader.readAsDataURL(file);
}

function eliminarEntrada(entrada, thumb, previewItem) {
  const index = archivosRecortados.indexOf(entrada);
  if (index > -1) archivosRecortados.splice(index, 1);

  if (entrada.objectUrl) URL.revokeObjectURL(entrada.objectUrl);

  thumb.remove();
  previewItem.remove();

  if (currentIndex >= previewTrack.children.length) {
    currentIndex = previewTrack.children.length - 1;
  }

  updateCarousel();
  actualizarVisibilidadPreview();
  actualizarBotonEditarTamano();

  if (obtenerRatioExistente() === null) {
    ratioActual = null;
  }
}

/* =========================================================
   11. EDITAR TAMAÑO
========================================================= */

let colaReedicionTamano = [];

function actualizarBotonEditarTamano() {
  if (!btnEditarTamano) return;
  const hayRecortables = archivosRecortados.some(e => e.tipo === "imagen" || e.tipo === "video");
  btnEditarTamano.classList.toggle("hidden", !hayRecortables);
}

if (btnEditarTamano) {
  btnEditarTamano.addEventListener("click", () => {
    const recortables = archivosRecortados.filter(e => e.tipo === "imagen" || e.tipo === "video");
    if (recortables.length === 0) return;

    enEdicionMasiva = true;
    colaReedicionTamano = [...recortables];
    ratioActual = null;

    const primera = colaReedicionTamano.shift();
    entradaEnEdicion = primera;
    thumbEnEdicion = primera.thumbEl;
    previewItemEnEdicion = primera.previewItemEl;

    if (primera.tipo === "video") {
      videoActualParaRecorte = { file: primera.file, url: primera.objectUrl };
      mostrarEditorComoVideo();
      cropEditorVideo.src = primera.objectUrl;
    } else {
      mostrarEditorComoImagen();
    }

    cropModal.classList.remove("hidden");
    cropStepRatio.classList.remove("hidden");
    cropStepEditor.classList.add("hidden");
  });
}

function procesarSiguienteReedicion() {
  if (colaReedicionTamano.length === 0) {
    enEdicionMasiva = false;
    cropModal.classList.add("hidden");
    mostrarEditorComoImagen();
    return;
  }

  const entrada = colaReedicionTamano.shift();
  entradaEnEdicion = entrada;
  thumbEnEdicion = entrada.thumbEl;
  previewItemEnEdicion = entrada.previewItemEl;

  cropModal.classList.remove("hidden");
  cropStepRatio.classList.add("hidden");
  cropStepEditor.classList.remove("hidden");

  if (entrada.tipo === "video") {
    videoActualParaRecorte = { file: entrada.file, url: entrada.objectUrl };
    mostrarEditorComoVideo();
    cropEditorVideo.src = entrada.objectUrl;
    cropEditorVideo.dataset.filename = entrada.file.name;

    cropEditorVideo.onloadedmetadata = inicializarOverlayVideo;
    if (cropEditorVideo.readyState >= 1) inicializarOverlayVideo();
  } else {
    mostrarEditorComoImagen();
    cropEditorImage.onload = null;
    cropEditorImage.src = "";
    cropEditorImage.dataset.filename = entrada.file.name;

    requestAnimationFrame(() => {
      cropEditorImage.onload = inicializarOverlay;
      cropEditorImage.src = entrada.imagenOriginalDataUrl;
      if (cropEditorImage.complete) inicializarOverlay();
    });
  }
}

/* =========================================================
   12. VALIDACIÓN DE CAMPOS OBLIGATORIOS
========================================================= */

function marcarErrorCampo(el) {
  if (el) el.classList.add("campo-error");
}

function limpiarErrorCampo(el) {
  if (el) el.classList.remove("campo-error");
}

function limpiarErrorGaleria() {
  document.getElementById("image-upload").classList.remove("campo-error");
}

function validarFormulario() {
  const tituloEl = document.getElementById("post-title");
  const descripcionEl = document.getElementById("post-description");
  const categoriaEl = document.getElementById("post-category");
  const uploadEl = document.getElementById("image-upload");

  let esValido = true;
  let primerCampoInvalido = null;

  [tituloEl, descripcionEl, categoriaEl].forEach(el => limpiarErrorCampo(el));
  limpiarErrorGaleria();

  if (!tituloEl.value.trim()) {
    marcarErrorCampo(tituloEl);
    esValido = false;
    primerCampoInvalido = primerCampoInvalido || tituloEl;
  }

  if (!descripcionEl.value.trim()) {
    marcarErrorCampo(descripcionEl);
    esValido = false;
    primerCampoInvalido = primerCampoInvalido || descripcionEl;
  }

  if (!categoriaEl.value) {
    marcarErrorCampo(categoriaEl);
    esValido = false;
    primerCampoInvalido = primerCampoInvalido || categoriaEl;
  }

  if (archivosRecortados.length === 0) {
    marcarErrorCampo(uploadEl);
    esValido = false;
    primerCampoInvalido = primerCampoInvalido || uploadEl;
  }

  if (!esValido) {
    alert("Error: llena todos los campos antes de publicar (título, descripción, categoría y al menos una foto).");
    if (primerCampoInvalido) primerCampoInvalido.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return esValido;
}

/* =========================================================
   13. OVERLAY DE ESTADO (subiendo / publicado)
========================================================= */

function mostrarCargando() {
  statusSpinner.classList.remove("hidden");
  statusCheck.classList.add("hidden");
  statusText.textContent = "Subiendo publicación...";
  statusOverlay.classList.remove("hidden");
}

function mostrarExito(mensaje) {
  statusSpinner.classList.add("hidden");
  statusCheck.classList.remove("hidden");
  statusText.textContent = mensaje;

  setTimeout(() => {
    statusOverlay.classList.add("hidden");
  }, 3500);
}

function ocultarOverlayInmediato() {
  statusOverlay.classList.add("hidden");
}

/* =========================================================
   14. GUARDAR PUBLICACIÓN EN SUPABASE
========================================================= */

function sanitizarNombreArchivo(nombre) {
  return nombre
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

async function savePublication(tableName) {
  if (!validarFormulario()) return;

  mostrarCargando();

  const title = document.getElementById("post-title").value;
  const description = document.getElementById("post-description").value;
  const category = document.getElementById("post-category").value;

  const dateInput = document.getElementById("post-date");
  const date = dateInput?.value || new Date().toISOString().split("T")[0];

  const authorInput = document.getElementById("post-author");
  const author = authorInput?.value || "Fundación Sí Se Puede";

  let imageUrls = [];

  try {
    for (let entrada of archivosRecortados) {
      const file = entrada.file;
      const nombreLimpio = sanitizarNombreArchivo(file.name);

      const { data, error } = await supabase.storage
        .from("publicaciones")
        .upload(`images/${Date.now()}_${nombreLimpio}`, file);

      if (error) {
        console.error("Error subiendo archivo:", error.message);
      } else {
        const url = supabase.storage
          .from("publicaciones")
          .getPublicUrl(data.path).data.publicUrl;

        imageUrls.push(url);
      }
    }

    const imageString = imageUrls.join(";");

    const { error: insertError } = await supabase
      .from(tableName)
      .insert([
        {
          titulo: title,
          descripcion: description,
          categoria: category,
          imagenes_text: imageString,
          fecha: date,
          autor: author
        }
      ]);

    if (insertError) {
      ocultarOverlayInmediato();
      alert("❌ Error guardando en " + tableName + ": " + insertError.message);
      return;
    }

    mostrarExito(tableName === "publicaciones" ? "Publicación subida exitosamente" : "Borrador guardado exitosamente");

    document.getElementById("post-title").value = "";
    document.getElementById("post-description").value = "";
    document.getElementById("post-category").value = "";
    document.getElementById("post-date").value = "";
    document.getElementById("post-author").value = "";
    document.getElementById("post-images").value = "";

    archivosRecortados.forEach(entrada => {
      if (entrada.objectUrl) URL.revokeObjectURL(entrada.objectUrl);
    });

    gallery.innerHTML = "";
    previewTrack.innerHTML = "";
    archivosRecortados = [];
    ratioActual = null;

    actualizarBotonEditarTamano();

    previewTitle.textContent = "";
    previewDescription.textContent = "";

    currentIndex = 0;
    actualizarVisibilidadPreview();
  } catch (err) {
    console.error(err);
    ocultarOverlayInmediato();
    alert("❌ Ocurrió un error inesperado al publicar.");
  }
}

/* =========================================================
   15. BOTONES PRINCIPALES
========================================================= */

document
  .getElementById("btn-draft")
  .addEventListener("click", () => savePublication("borradores"));

document
  .getElementById("btn-publish")
  .addEventListener("click", () => savePublication("publicaciones"));