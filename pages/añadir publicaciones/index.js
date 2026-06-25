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

const previewTrack = document.getElementById("preview-carousel-track");
const btnPrev = document.getElementById("carousel-prev");
const btnNext = document.getElementById("carousel-next");

const previewTitle = document.getElementById("preview-title");
const previewDescription = document.getElementById("preview-description");

/* =========================================================
   4. PREVIEW EN TIEMPO REAL (TÍTULO Y DESCRIPCIÓN)
========================================================= */

document.getElementById("post-title").addEventListener("input", (e) => {
  previewTitle.textContent = e.target.value || "Título de la publicación";
});

document.getElementById("post-description").addEventListener("input", (e) => {
  previewDescription.textContent =
    e.target.value || "Aquí aparecerá un resumen de tu publicación...";
});

/* =========================================================
   5. CARRUSEL DE PREVIEW
========================================================= */

let currentIndex = 0;

function updateCarousel() {
  const width = previewTrack.clientWidth;
  previewTrack.style.transform = `translateX(-${currentIndex * width}px)`;
}

/* navegación manual */
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

/* autoplay */
setInterval(() => {
  if (previewTrack.children.length > 0) {
    currentIndex = (currentIndex + 1) % previewTrack.children.length;
    updateCarousel();
  }
}, 4000);

/* =========================================================
   6. SUBIDA Y PREVIEW DE IMÁGENES
========================================================= */

imageInput.addEventListener("change", () => {
  const files = imageInput.files;

  Array.from(files).forEach((file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      /* -------- MINIATURA -------- */
      const thumb = document.createElement("div");
      thumb.classList.add("thumbnail");

      const img = document.createElement("img");
      img.src = e.target.result;
      img.alt = file.name;

      /* -------- CARRUSEL -------- */
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

      updateCarousel();

      /* -------- BOTÓN ELIMINAR -------- */
      const deleteLabel = document.createElement("div");
      deleteLabel.classList.add("delete-label");
      deleteLabel.textContent = "Eliminar";

      deleteLabel.addEventListener("click", () => {
        thumb.remove();
        previewItem.remove();

        if (currentIndex >= previewTrack.children.length) {
          currentIndex = previewTrack.children.length - 1;
        }

        updateCarousel();
      });

      thumb.appendChild(img);
      thumb.appendChild(deleteLabel);
      gallery.appendChild(thumb);
    };

    reader.readAsDataURL(file);
  });
});

/* =========================================================
   7. GUARDAR PUBLICACIÓN EN SUPABASE
========================================================= */

async function savePublication(tableName) {
  const title = document.getElementById("post-title").value;
  const description = document.getElementById("post-description").value;
  const category = document.getElementById("post-category").value;

  const files = document.getElementById("post-images").files;

  const dateInput = document.getElementById("post-date");
  const date = dateInput?.value || new Date().toISOString().split("T")[0];

  const authorInput = document.getElementById("post-author");
  const author = authorInput?.value || "Fundación Sí Se Puede";

  /* -------- SUBIR IMÁGENES -------- */
  let imageUrls = [];

  for (let file of files) {
    const { data, error } = await supabase.storage
      .from("publicaciones")
      .upload(`images/${Date.now()}_${file.name}`, file);

    if (error) {
      console.error("Error subiendo imagen:", error.message);
    } else {
      const url = supabase.storage
        .from("publicaciones")
        .getPublicUrl(data.path).data.publicUrl;

      imageUrls.push(url);
    }
  }

  /* -------- INSERTAR EN TABLA -------- */
  const { error: insertError } = await supabase
    .from(tableName)
    .insert([
      {
        titulo: title,
        descripcion: description,
        categoria: category,
        imagenes: imageUrls,
        fecha: date,
        autor: author
      }
    ]);

  /* =========================================================
     8. RESPUESTA + LIMPIEZA DEL FORMULARIO
  ========================================================= */

  if (insertError) {
    alert("❌ Error guardando en " + tableName + ": " + insertError.message);
    return;
  }

  alert("Guardado correctamente en " + tableName);

  /* -------- LIMPIAR CAMPOS -------- */
  document.getElementById("post-title").value = "";
  document.getElementById("post-description").value = "";
  document.getElementById("post-category").value = "";
  document.getElementById("post-date").value = "";
  document.getElementById("post-author").value = "";
  document.getElementById("post-images").value = "";

  /* -------- LIMPIAR UI -------- */
  gallery.innerHTML = "";
  previewTrack.innerHTML = "";

  previewTitle.textContent = "Título de la publicación";
  previewDescription.textContent =
    "Aquí aparecerá un resumen de tu publicación...";

  currentIndex = 0;
}

/* =========================================================
   9. BOTONES PRINCIPALES
========================================================= */

document
  .getElementById("btn-draft")
  .addEventListener("click", () => savePublication("borradores"));

document
  .getElementById("btn-publish")
  .addEventListener("click", () => savePublication("publicaciones"));