import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw";
const supabase = createClient(supabaseUrl, supabaseKey);

// Pantallas
const deniedScreen = document.getElementById("denied-screen");
const adminPanel = document.getElementById("admin-panel");

function mostrarPantalla(pantalla) {
  deniedScreen.classList.add("hidden");
  adminPanel.classList.add("hidden");
  pantalla.classList.remove("hidden");
}

// Revisa si hay sesión y si esa sesión tiene rol admin
async function verificarSesion() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    document.getElementById("denied-message").textContent =
      "Debes iniciar sesión desde la página principal para acceder a esta sección.";
    mostrarPantalla(deniedScreen);
    return;
  }

  const { data: rol, error } = await supabase.rpc("get_my_role");

  if (error || rol !== "admin") {
    document.getElementById("denied-message").textContent =
      "Tu cuenta no tiene permisos de administrador.";
    mostrarPantalla(deniedScreen);
    return;
  }

  document.getElementById("current-user-email").textContent = session.user.email;
  mostrarPantalla(adminPanel);
  loadAdmins();
}

// Botones de "Volver al inicio"
document.getElementById("volver-inicio-btn").addEventListener("click", () => {
  window.location.href = "../../index.html";
});

document.getElementById("volver-inicio-btn-2").addEventListener("click", () => {
  window.location.href = "../../index.html";
});

// ---------- Cargar lista de administradores ----------
async function loadAdmins() {
  const { data, error } = await supabase.rpc("list_admins");

  const list = document.getElementById("admin-list");
  const emptyState = document.getElementById("admin-empty");
  const countBadge = document.getElementById("admin-count");

  if (error) {
    console.error("Error cargando admins:", error.message);
    return;
  }

  list.innerHTML = "";
  countBadge.textContent = data.length;

  if (data.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  data.forEach(admin => {
    const li = document.createElement("li");
    const fecha = admin.created_at ? new Date(admin.created_at).toLocaleDateString() : "";
    li.innerHTML = `
      <span class="admin-email">${admin.email}</span>
      <span class="admin-date">${fecha}</span>
    `;
    list.appendChild(li);
  });
}

function mostrarFeedback(elId, mensaje, tipo) {
  const el = document.getElementById(elId);
  el.textContent = mensaje;
  el.className = `feedback ${tipo}`;
  el.classList.remove("hidden");
}

// ---------- Convertir en admin ----------
document.getElementById("make-admin").addEventListener("click", async () => {
  const input = document.getElementById("email-input");
  const email = input.value.trim();
  if (!email) return;

  const { data: userId, error: userError } = await supabase.rpc("get_user_id_by_email", { user_email: email });

  if (userError || !userId) {
    mostrarFeedback("make-admin-msg", "No se encontró ningún usuario registrado con ese correo.", "error");
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, role: "admin" });

  if (error) {
    console.error(error);
    mostrarFeedback("make-admin-msg", "Error al actualizar el rol.", "error");
  } else {
    mostrarFeedback("make-admin-msg", `${email} ahora es administrador.`, "success");
    input.value = "";
    loadAdmins();
  }
});

// ---------- Quitar admin ----------
document.getElementById("remove-admin").addEventListener("click", async () => {
  const input = document.getElementById("remove-email");
  const email = input.value.trim();
  if (!email) return;

  const { data: userId, error: userError } = await supabase.rpc("get_user_id_by_email", { user_email: email });

  if (userError || !userId) {
    mostrarFeedback("remove-admin-msg", "No se encontró ningún administrador con ese correo.", "error");
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "user" })
    .eq("id", userId);

  if (error) {
    console.error(error);
    mostrarFeedback("remove-admin-msg", "Error al quitar el rol de administrador.", "error");
  } else {
    mostrarFeedback("remove-admin-msg", `${email} ya no es administrador.`, "success");
    input.value = "";
    loadAdmins();
  }
});

// Inicializar
verificarSesion();