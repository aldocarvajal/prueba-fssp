// Importar Supabase desde CDN
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
 
// Inicializar Supabase
const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw";
const supabase = createClient(supabaseUrl, supabaseKey);
 
document.addEventListener("DOMContentLoaded", () => {
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const hamburgerClose = document.getElementById("hamburger-close");
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  const blobs = document.querySelectorAll(".blob");
  const testimonios = document.querySelectorAll(".testimonio");
  const indicators = document.querySelectorAll(".carousel-indicators span");
  let index = 0;
 
  /* =========================================================
     MENÚ HAMBURGUESA
  ========================================================= */
 
  const overlay = document.createElement("div");
  overlay.classList.add("overlay");
  document.body.appendChild(overlay);
 
  function abrirHamburguesa() {
    hamburgerMenu.classList.add("active");
    overlay.classList.add("active");
  }
 
  function cerrarHamburguesa() {
    hamburgerMenu.classList.remove("active");
    overlay.classList.remove("active");
  }
 
  hamburgerBtn.addEventListener("click", () => {
    if (hamburgerMenu.classList.contains("active")) {
      cerrarHamburguesa();
    } else {
      abrirHamburguesa();
    }
  });
 
  hamburgerClose.addEventListener("click", cerrarHamburguesa);
  overlay.addEventListener("click", cerrarHamburguesa);
 
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cerrarHamburguesa();
    }
  });
 
  /* =========================================================
     CARRUSEL DE TESTIMONIOS
  ========================================================= */
 
  function showTestimonio(i) {
    testimonios.forEach((t, idx) => {
      t.style.display = idx === i ? "block" : "none";
      indicators[idx].classList.toggle("active", idx === i);
    });
  }
  function nextTestimonio() {
    index = (index + 1) % testimonios.length;
    showTestimonio(index);
  }
  showTestimonio(index);
  setInterval(nextTestimonio, 6000);
 
  /* =========================================================
     UI SEGÚN SESIÓN
  ========================================================= */
 
  // Carga un <img> de forma segura: decodifica EL MISMO elemento que se
  // va a mostrar (no un objeto Image() separado), así nunca se revela
  // a medio decodificar. Incluye logs de diagnóstico con prefijo [AVATAR].
  async function cargarAvatarSeguro(imgEl, url, nombre) {
    if (!url) {
      console.log(`[AVATAR] ${nombre}: no hay URL de foto, se usará inicial.`);
      return false;
    }
 
    let finalUrl = url;
    if (url.includes("googleusercontent.com") && !url.includes("=s")) {
      finalUrl = url + "=s200-c";
    }
 
    console.log(`[AVATAR] ${nombre}: intentando cargar ->`, finalUrl);
 
    imgEl.classList.remove("loaded");
    imgEl.src = finalUrl;
 
    try {
      if (imgEl.decode) {
        await imgEl.decode(); // decodifica el elemento real, no una copia
        console.log(`[AVATAR] ${nombre}: decode() OK. natural=${imgEl.naturalWidth}x${imgEl.naturalHeight}`);
      } else {
        await new Promise((res, rej) => {
          imgEl.onload = res;
          imgEl.onerror = rej;
        });
        console.log(`[AVATAR] ${nombre}: load event OK (sin decode). natural=${imgEl.naturalWidth}x${imgEl.naturalHeight}`);
      }
      imgEl.classList.add("loaded");
      console.log(`[AVATAR] ${nombre}: clase "loaded" agregada. Debería verse bien ahora.`);
      return true;
    } catch (e) {
      console.log(`[AVATAR] ${nombre}: FALLÓ la carga/decodificación ->`, e);
      return false;
    }
  }
 
  function updateUI(session) {
    const loginBtn = document.getElementById("login-google");
    const profile = document.getElementById("user-profile");
    const avatar = document.getElementById("user-avatar");
    const initials = document.getElementById("user-initials");
    const chipName = document.getElementById("welcome-text");
    const dropdownAvatar = document.getElementById("dropdown-avatar");
    const dropdownName = document.getElementById("dropdown-name");
    const email = document.getElementById("user-email");
 
    console.log("[AVATAR] updateUI llamado. ¿Hay sesión?", !!session);
 
    if (session) {
      loginBtn.style.display = "none";
      profile.style.display = "flex";
 
      const user = session.user;
      const fullName = user.user_metadata.full_name || user.email;
      const photo = user.user_metadata.avatar_url || user.user_metadata.picture;
 
      console.log("[AVATAR] user_metadata completo:", user.user_metadata);
      console.log("[AVATAR] avatar_url:", user.user_metadata.avatar_url);
      console.log("[AVATAR] picture:", user.user_metadata.picture);
      console.log("[AVATAR] photo elegida:", photo);
 
      // Reset de estado visual en cada actualización, para no arrastrar
      // el "loaded" de una sesión/avatar anterior
      avatar.classList.remove("loaded");
      dropdownAvatar.classList.remove("loaded");
 
      function mostrarIniciales() {
        avatar.style.display = "none";
        const parts = fullName.trim().split(" ");
        const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
        initials.textContent = letters.toUpperCase();
        initials.style.display = "flex";
 
        dropdownAvatar.style.display = "none";
      }
 
      if (photo) {
        avatar.style.display = "block";
        initials.style.display = "none";
        dropdownAvatar.style.display = "block";
 
        cargarAvatarSeguro(avatar, photo, "AVATAR (arriba)").then((ok) => {
          if (!ok) mostrarIniciales();
        });
        cargarAvatarSeguro(dropdownAvatar, photo, "DROPDOWN AVATAR").then((ok) => {
          if (!ok) dropdownAvatar.style.display = "none";
        });
      } else {
        mostrarIniciales();
      }
 
      // El "nombre" del chip queda corto (solo primer nombre) para no
      // desbordar el pill; el dropdown sí muestra el nombre completo.
      chipName.textContent = fullName.split(" ")[0];
      dropdownName.textContent = fullName;
      email.textContent = user.email;
    } else {
      loginBtn.style.display = "block";
      profile.style.display = "none";
    }
  }
 
  // Mostrar/ocultar el link de "Administrar Roles" según el rol del usuario
  async function actualizarVisibilidadRoles(session) {
    const itemRoles = document.getElementById("menu-roles-item");
    if (!itemRoles) return;
 
    if (!session) {
      itemRoles.style.display = "none";
      return;
    }
 
    const { data: rol, error } = await supabase.rpc("get_my_role");
 
    if (error || rol !== "admin") {
      itemRoles.style.display = "none";
    } else {
      itemRoles.style.display = "block";
    }
  }
 
  // Botón login
  document.getElementById("login-google").addEventListener("click", async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://aldocarvajal.github.io/prueba-fssp/" }
    });
    if (error) console.error("Error en login:", error.message);
  });
 
  // Botón logout (dentro del dropdown)
  document.getElementById("logout-link").addEventListener("click", async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
  });
 
  // Escuchar cambios de sesión
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("[AVATAR] onAuthStateChange evento:", event);
    updateUI(session);
    actualizarVisibilidadRoles(session);
  });
 
  // Revisar sesión al cargar
  (async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.has("access_token")) {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Error al obtener sesión:", error.message);
      updateUI(data.session);
      actualizarVisibilidadRoles(data.session);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      updateUI(session);
      actualizarVisibilidadRoles(session);
    }
  })();
 
  /* =========================================================
     CHIP DE PERFIL — abre/cierra el dropdown
  ========================================================= */
 
  const userChipBtn = document.getElementById("user-chip-btn");
  const dropdownMenu = document.querySelector(".dropdown-menu");
 
  userChipBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const abierto = dropdownMenu.classList.toggle("show");
    userChipBtn.classList.toggle("open", abierto);
  });
 
  document.addEventListener("click", (e) => {
    if (!userChipBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove("show");
      userChipBtn.classList.remove("open");
    }
  });
 
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dropdownMenu.classList.remove("show");
      userChipBtn.classList.remove("open");
    }
  });
});