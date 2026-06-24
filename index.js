// Importar Supabase desde CDN
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Inicializar Supabase
const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw";
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  const blobs = document.querySelectorAll(".blob");
  const testimonios = document.querySelectorAll(".testimonio");
  const indicators = document.querySelectorAll(".carousel-indicators span");
  let index = 0;

  // Overlay
  const overlay = document.createElement("div");
  overlay.classList.add("overlay");
  document.body.appendChild(overlay);

  hamburger.addEventListener("click", () => {
    hamburgerMenu.classList.toggle("active");
    overlay.classList.toggle("active");
  });
  overlay.addEventListener("click", () => {
    hamburgerMenu.classList.remove("active");
    overlay.classList.remove("active");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hamburgerMenu.classList.remove("active");
      overlay.classList.remove("active");
    }
  });

  // Carrusel testimonios
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

  // Función para actualizar la UI según sesión
  function updateUI(session) {
    const loginBtn = document.getElementById("login-google");
    const profile = document.getElementById("user-profile");
    const avatar = document.getElementById("user-avatar");
    const initials = document.getElementById("user-initials");
    const welcome = document.getElementById("welcome-text");
    const email = document.getElementById("user-email");

if (session) {
  loginBtn.style.display = "none";
  profile.style.display = "flex";

  const user = session.user;
  const fullName = user.user_metadata.full_name || user.email;
  const photo = user.user_metadata.avatar_url || user.user_metadata.picture;

  if (photo) {
    avatar.src = photo;
    avatar.style.display = "block";
    initials.style.display = "none";
  } else {
    avatar.style.display = "none";
    const parts = fullName.split(" ");
    const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
    initials.textContent = letters.toUpperCase();
    initials.style.display = "flex";
  }

  // Texto de bienvenida en el header
  welcome.textContent = `Bienvenido ${fullName}`;

  // Solo correo en el menú desplegable
  email.textContent = user.email;
} else {
  loginBtn.style.display = "block";
  profile.style.display = "none";
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

  // Botón logout
  document.getElementById("logout-link").addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  // Escuchar cambios de sesión
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("Evento de auth:", event, session);
    updateUI(session);
  });

  // Revisar sesión al cargar
  (async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.has("access_token")) {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Error al obtener sesión:", error.message);
      updateUI(data.session);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      updateUI(session);
    }
  })();

  // Toggle menú desplegable al hacer click en avatar
  const avatarContainer = document.querySelector(".avatar-container");
  const dropdownMenu = document.querySelector(".dropdown-menu");

  avatarContainer.addEventListener("click", (e) => {
    e.stopPropagation(); // evita cierre inmediato
    dropdownMenu.classList.toggle("show");
  });

  // Cerrar menú al hacer click fuera
  document.addEventListener("click", (e) => {
    if (!avatarContainer.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove("show");
    }
  });
});
