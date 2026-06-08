// Importar Supabase desde CDN (si usas <script type="module"> en tu HTML)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Inicializar Supabase
const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw"; // pega aquí tu anon key
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

  // Función para actualizar la UI según sesión
  function updateUI(session) {
    if (session) {
      document.getElementById("login-google").style.display = "none";
      document.getElementById("logout").style.display = "block";
      console.log("Usuario logueado:", session.user);
    } else {
      document.getElementById("login-google").style.display = "block";
      document.getElementById("logout").style.display = "none";
      console.log("No hay sesión activa");
    }
  }

document.getElementById("login-google").addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://aldocarvajal.github.io/prueba-fssp/"
    }
  });
  if (error) console.error("Error en login:", error.message);
});


  // Botón de logout
  document.getElementById("logout").addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  // Escuchar cambios de sesión en tiempo real
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("Evento de auth:", event, session);
    updateUI(session);
  });

  // Revisar sesión al cargar la página y procesar fragmento #access_token
  (async () => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.has("access_token")) {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Error al obtener sesión:", error.message);
      console.log("Sesión procesada:", data.session);
      updateUI(data.session);
      // Limpiar el fragmento de la URL para evitar el 404
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      updateUI(session);
    }
  })();
});
