import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
 
const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw";
const supabase = createClient(supabaseUrl, supabaseKey);
 
let currentUser = null;
const feedContainer = document.getElementById("feed-container");
 
document.getElementById("volver-inicio-btn").addEventListener("click", () => {
  window.location.href = "../../index.html";
});
 
/* =========================================================
   UTILIDADES
========================================================= */
 
// Escapa HTML para que título/descripción/comentarios no rompan el markup
// ni permitan inyección de HTML.
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
 
// 🔧 FIX: antes TODO se renderizaba como <img>, por eso los videos salían
// rotos. Detectamos la extensión del archivo en la URL para decidir si
// va <img> o <video>.
function esArchivoVideo(url) {
  return /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(url);
}
 
function formatearFecha(fechaStr) {
  if (!fechaStr) return "";
  const partes = fechaStr.split("-");
  if (partes.length !== 3) return fechaStr;
  const [anio, mes, dia] = partes;
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const mesIndex = parseInt(mes, 10) - 1;
  if (mesIndex < 0 || mesIndex > 11) return fechaStr;
  return `${parseInt(dia, 10)} ${meses[mesIndex]}. ${anio}`;
}
 
/* =========================================================
   INIT
========================================================= */
 
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  loadFeed();
}
 
async function loadFeed() {
  const { data: publicaciones, error } = await supabase
    .from("publicaciones")
    .select("*")
    .order("fecha", { ascending: false });
 
  if (error) {
    console.error("Error cargando publicaciones:", error);
    return;
  }
 
  const { data: likes } = await supabase.from("likes").select("publicacion_id, user_id");
  const { data: comentarios } = await supabase
    .from("comentarios")
    .select("*")
    .order("created_at", { ascending: true });
 
  const emptyState = document.getElementById("feed-empty");
 
  if (!publicaciones || publicaciones.length === 0) {
    feedContainer.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");
 
  feedContainer.innerHTML = "";
 
  publicaciones.forEach(pub => {
    const archivos = (pub.imagenes_text || "").split(";").filter(Boolean);
    const likesPub = (likes || []).filter(l => l.publicacion_id === pub.id);
    const yaLeDiLike = currentUser && likesPub.some(l => l.user_id === currentUser.id);
    const comentariosPub = (comentarios || []).filter(c => c.publicacion_id === pub.id);
 
    const card = document.createElement("div");
    card.className = "post-card";
    card.innerHTML = `
      <div class="post-header">
        <div class="post-header-top">
          <img src="../../assets/images/logoencabezado.png" alt="Logo Fundación" class="post-logo">
          <span class="post-nombre-fundacion">Fundación Sí Se Puede</span>
        </div>
        <p class="post-fecha">${formatearFecha(pub.fecha)}</p>
        ${pub.categoria ? `<span class="post-categoria">${escapeHtml(pub.categoria)}</span>` : ""}
        <h2 class="post-title">${escapeHtml(pub.titulo) || "Sin título"}</h2>
        <p class="post-autor">Por ${escapeHtml(pub.autor) || "Anónimo"}</p>
      </div>
 
      ${archivos.length > 0 ? `
        <div class="post-carousel" data-index="0">
          <div class="carousel-track">
            ${archivos.map(src => {
              if (esArchivoVideo(src)) {
                return `<div class="carousel-media-wrap"><video src="${src}" controls playsinline muted loop preload="metadata"></video></div>`;
              }
              return `<div class="carousel-media-wrap"><img src="${src}" alt="Imagen publicación" loading="lazy"></div>`;
            }).join("")}
          </div>
          ${archivos.length > 1 ? `
            <button class="carousel-arrow left">&#10094;</button>
            <button class="carousel-arrow right">&#10095;</button>
            <div class="carousel-dots">
              ${archivos.map((_, i) => `<span class="dot ${i === 0 ? "active" : ""}"></span>`).join("")}
            </div>
          ` : ""}
        </div>
      ` : ""}
 
      <div class="post-actions">
        <button class="btn-like ${yaLeDiLike ? "liked" : ""}" data-id="${pub.id}">
          <span class="icon">${yaLeDiLike ? "❤️" : "🤍"}</span>
          <span class="like-count">${likesPub.length}</span>
        </button>
        <button class="btn-toggle-comments" data-id="${pub.id}">
          💬 ${comentariosPub.length} Comentarios
        </button>
      </div>
 
      <div class="post-desc-wrap">
        <p class="post-desc" id="desc-${pub.id}">${escapeHtml(pub.descripcion)}</p>
        <button class="btn-ver-mas hidden" data-id="${pub.id}">Ver más</button>
      </div>
 
      <div class="comments-section hidden" id="comments-${pub.id}">
        <div class="comments-list">
          ${comentariosPub.map(c => renderComentario(c)).join("")}
        </div>
        ${currentUser ? `
          <div class="comment-form">
            <input type="text" placeholder="Escribe un comentario..." class="comment-input" data-id="${pub.id}">
            <button class="btn-primary btn-send-comment" data-id="${pub.id}">Enviar</button>
          </div>
        ` : `<p class="hint">Inicia sesión desde la página principal para comentar.</p>`}
      </div>
    `;
    feedContainer.appendChild(card);
 
    ajustarAspectoCarousel(card);
  });
 
  activarEventos();
  activarVerMas();
}
 
/* =========================================================
   ASPECTO DINÁMICO DEL CARRUSEL
   🔧 FIX: antes el contenedor tenía aspect-ratio fijo en 4:3,
   lo que deformaba/recortaba mal publicaciones en 1:1 o 4:5.
   Aquí medimos el primer archivo real (imagen o video) y
   fijamos el aspect-ratio del contenedor según su tamaño
   natural, que ya viene recortado exactamente al ratio
   elegido en "Añadir Publicación".
========================================================= */
 
function ajustarAspectoCarousel(card) {
  const carousel = card.querySelector(".post-carousel");
  if (!carousel) return;
 
  const primerMedia = carousel.querySelector(".carousel-media-wrap img, .carousel-media-wrap video");
  if (!primerMedia) return;
 
  const aplicarRatio = (w, h) => {
    if (!w || !h) return;
    carousel.style.aspectRatio = `${w} / ${h}`;
  };
 
  if (primerMedia.tagName === "IMG") {
    if (primerMedia.complete && primerMedia.naturalWidth) {
      aplicarRatio(primerMedia.naturalWidth, primerMedia.naturalHeight);
    } else {
      primerMedia.addEventListener("load", () => {
        aplicarRatio(primerMedia.naturalWidth, primerMedia.naturalHeight);
      });
    }
  } else if (primerMedia.tagName === "VIDEO") {
    if (primerMedia.readyState >= 1 && primerMedia.videoWidth) {
      aplicarRatio(primerMedia.videoWidth, primerMedia.videoHeight);
    } else {
      primerMedia.addEventListener("loadedmetadata", () => {
        aplicarRatio(primerMedia.videoWidth, primerMedia.videoHeight);
      });
    }
  }
}
 
/* =========================================================
   DESCRIPCIÓN — "Ver más" / "Ver menos"
   Se mide después de insertar en el DOM: si el texto real
   ocupa más que las 2 líneas visibles (line-clamp), se
   muestra el botón para expandir.
========================================================= */
 
function activarVerMas() {
  requestAnimationFrame(() => {
    document.querySelectorAll(".post-desc").forEach(desc => {
      const estaTruncado = desc.scrollHeight > desc.clientHeight + 1;
      const id = desc.id.replace("desc-", "");
      const btn = feedContainer.querySelector(`.btn-ver-mas[data-id="${id}"]`);
      if (!btn) return;
 
      if (estaTruncado) {
        btn.classList.remove("hidden");
      } else {
        btn.classList.add("hidden");
      }
    });
 
    feedContainer.querySelectorAll(".btn-ver-mas").forEach(btn => {
      btn.addEventListener("click", () => {
        const desc = document.getElementById(`desc-${btn.dataset.id}`);
        const expandida = desc.classList.toggle("expandida");
        btn.textContent = expandida ? "Ver menos" : "Ver más";
      });
    });
  });
}
 
/* =========================================================
   COMENTARIOS
========================================================= */
 
function renderComentario(c) {
  const esMio = currentUser && c.user_id === currentUser.id;
  return `
    <div class="comment" data-comment-id="${c.id}">
      <span class="comment-autor">${escapeHtml(c.autor_nombre) || "Usuario"}</span>
      <p class="comment-texto">${escapeHtml(c.contenido)}</p>
      ${esMio ? `
        <div class="comment-actions">
          <button class="btn-edit-comment" data-id="${c.id}">Editar</button>
          <button class="btn-delete-comment" data-id="${c.id}">Eliminar</button>
        </div>
      ` : ""}
    </div>
  `;
}
 
/* =========================================================
   EVENTOS
========================================================= */
 
function activarEventos() {
  // Carrusel
  feedContainer.querySelectorAll(".post-carousel").forEach(carousel => {
    const left = carousel.querySelector(".carousel-arrow.left");
    const right = carousel.querySelector(".carousel-arrow.right");
    if (left) left.addEventListener("click", () => moverCarousel(carousel, -1));
    if (right) right.addEventListener("click", () => moverCarousel(carousel, 1));
  });
 
  // Like
  feedContainer.querySelectorAll(".btn-like").forEach(btn => {
    btn.addEventListener("click", () => toggleLike(parseInt(btn.dataset.id)));
  });
 
  // Mostrar/ocultar comentarios
  feedContainer.querySelectorAll(".btn-toggle-comments").forEach(btn => {
    btn.addEventListener("click", () => {
      const section = document.getElementById(`comments-${btn.dataset.id}`);
      section.classList.toggle("hidden");
    });
  });
 
  // Enviar comentario
  feedContainer.querySelectorAll(".btn-send-comment").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = feedContainer.querySelector(`.comment-input[data-id="${btn.dataset.id}"]`);
      const texto = input.value.trim();
      if (!texto) return;
      enviarComentario(parseInt(btn.dataset.id), texto);
    });
  });
 
  // Editar comentario
  feedContainer.querySelectorAll(".btn-edit-comment").forEach(btn => {
    btn.addEventListener("click", () => editarComentario(parseInt(btn.dataset.id)));
  });
 
  // Eliminar comentario
  feedContainer.querySelectorAll(".btn-delete-comment").forEach(btn => {
    btn.addEventListener("click", () => eliminarComentario(parseInt(btn.dataset.id)));
  });
}
 
function moverCarousel(carouselEl, direccion) {
  const track = carouselEl.querySelector(".carousel-track");
  const total = track.children.length;
  let indice = parseInt(carouselEl.dataset.index);
  indice = (indice + direccion + total) % total;
  carouselEl.dataset.index = indice;
  track.style.transform = `translateX(-${indice * 100}%)`;
 
  const dots = carouselEl.querySelectorAll(".dot");
  dots.forEach((d, i) => d.classList.toggle("active", i === indice));
}
 
/* =========================================================
   ACCIONES SOBRE SUPABASE
========================================================= */
 
async function toggleLike(publicacionId) {
  if (!currentUser) {
    alert("Debes iniciar sesión desde la página principal para dar like.");
    return;
  }
 
  const { data: existente } = await supabase
    .from("likes")
    .select("id")
    .eq("publicacion_id", publicacionId)
    .eq("user_id", currentUser.id)
    .maybeSingle();
 
  if (existente) {
    await supabase.from("likes").delete().eq("id", existente.id);
  } else {
    await supabase.from("likes").insert({ publicacion_id: publicacionId, user_id: currentUser.id });
  }
 
  loadFeed();
}
 
async function enviarComentario(publicacionId, texto) {
  const nombre = currentUser.user_metadata?.full_name || currentUser.email;
 
  const { error } = await supabase.from("comentarios").insert({
    publicacion_id: publicacionId,
    user_id: currentUser.id,
    contenido: texto,
    autor_nombre: nombre
  });
 
  if (error) {
    console.error(error);
    alert("Error al enviar el comentario.");
    return;
  }
 
  loadFeed();
}
 
async function editarComentario(comentarioId) {
  const nuevoTexto = prompt("Editar comentario:");
  if (!nuevoTexto || !nuevoTexto.trim()) return;
 
  const { error } = await supabase
    .from("comentarios")
    .update({ contenido: nuevoTexto.trim(), updated_at: new Date().toISOString() })
    .eq("id", comentarioId);
 
  if (error) {
    console.error(error);
    alert("Error al editar el comentario.");
    return;
  }
 
  loadFeed();
}
 
async function eliminarComentario(comentarioId) {
  if (!confirm("¿Eliminar este comentario?")) return;
 
  const { error } = await supabase.from("comentarios").delete().eq("id", comentarioId);
 
  if (error) {
    console.error(error);
    alert("Error al eliminar el comentario.");
    return;
  }
 
  loadFeed();
}
 
init();