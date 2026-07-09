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

 
function updateUI(session) {
    const loginBtn = document.getElementById("login-google");
    const profile = document.getElementById("user-profile");
    const chipName = document.getElementById("welcome-text");
    const dropdownName = document.getElementById("dropdown-name");
    const email = document.getElementById("user-email");
    const avatarImg = document.getElementById("chip-avatar-img");
    const avatarInitials = document.getElementById("chip-avatar-initials");

    if (session) {
      loginBtn.style.display = "none";
      profile.style.display = "flex";

      const user = session.user;
      const metadata = user.user_metadata || {};
      const fullName = metadata.full_name || metadata.name || user.email;
      const avatarUrl = metadata.avatar_url || metadata.picture || "";

      // Separar primer nombre y primer apellido
      const partesNombre = fullName.trim().split(/\s+/);
      const primerNombre = partesNombre[0] || "";
      const primerApellido = partesNombre.length > 1 ? partesNombre[1] : "";
      const nombreCorto = primerApellido ? `${primerNombre} ${primerApellido}` : primerNombre;

      chipName.textContent = nombreCorto;
      dropdownName.textContent = fullName;
      email.textContent = user.email;

      // Mostrar foto de Google, o iniciales si no tiene foto
      if (avatarUrl) {
        avatarImg.src = avatarUrl;
        avatarImg.style.display = "block";
        avatarInitials.style.display = "none";
        avatarImg.onerror = () => {
          // Si la foto no carga, usar iniciales como respaldo
          avatarImg.style.display = "none";
          avatarInitials.style.display = "flex";
          avatarInitials.textContent = primerNombre.charAt(0) + primerApellido.charAt(0);
        };
      } else {
        avatarImg.style.display = "none";
        avatarInitials.style.display = "flex";
        avatarInitials.textContent = primerNombre.charAt(0) + primerApellido.charAt(0);
      }
    } else {
      loginBtn.style.display = "block";
      profile.style.display = "none";
      avatarImg.src = "";
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