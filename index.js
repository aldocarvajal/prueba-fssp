// Importar Supabase desde CDN (si usas <script type="module"> en tu HTML)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Inicializar Supabase
const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "TU_ANON_KEY"; // pega aquí tu anon key
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const hamburgerMenu = document.querySelector(".hamburger-menu");
  const blobs = document.querySelectorAll(".blob");
  const testimonios = document.querySelectorAll(".testimonio");
  const indicators = document.querySelectorAll(".carousel-indicators span");
  let index = 0;

  // Crear overlay dinámicamente
  const overlay = document.createElement("div");
  overlay.classList.add("overlay");
  document.body.appendChild(overlay);

  // Abrir menú
  hamburger.addEventListener("click", () => {
    hamburgerMenu.classList.toggle("active");
    overlay.classList.toggle("active");
  });

  // Cerrar al hacer click fuera
  overlay.addEventListener("click", () => {
    hamburgerMenu.classList.remove("active");
    overlay.classList.remove("active");
  });

  // Cerrar con tecla ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hamburgerMenu.classList.remove("active");
      overlay.classList.remove("active");
    }
  });

  // Animación de contadores
  const animateCounter = (entry) => {
    if (entry.isIntersecting) {
      const numero = entry.target.querySelector(".numero");
      const target = +entry.target.getAttribute("data-target");
      let count = 0;
      const increment = target / 100;

      const update = () => {
        if (count < target) {
          count += increment;
          numero.textContent = Math.floor(count) + "+";
          requestAnimationFrame(update);
        } else {
          numero.textContent = target + "+";
        }
      };
      update();
      observer.unobserve(entry.target);
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(animateCounter);
    },
    { threshold: 0.5 }
  );

  blobs.forEach((blob) => observer.observe(blob));

  // Carrusel de testimonios
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

  // Botón de login con Google
  document.getElementById("login-google").addEventListener("click", async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) {
      console.error("Error en login:", error.message);
    } else {
      console.log("Login iniciado:", data);
    }
  });

  // Botón de logout
  document.getElementById("logout").addEventListener("click", async () => {
    await supabase.auth.signOut();
    console.log("Sesión cerrada");
    checkSession();
  });

  // Verificar sesión activa
  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      console.log("Usuario logueado:", session.user);
      document.getElementById("login-google").style.display = "none";
      document.getElementById("logout").style.display = "block";
    } else {
      document.getElementById("login-google").style.display = "block";
      document.getElementById("logout").style.display = "none";
    }
  }

  checkSession();
});
