import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw";
const supabase = createClient(supabaseUrl, supabaseKey);

const deniedScreen = document.getElementById("denied-screen");
const adminPanel = document.getElementById("admin-panel");

let editandoEmailOriginal = null; // correo original cuando estamos editando

function mostrarPantalla(pantalla) {
  deniedScreen.classList.add("hidden");
  adminPanel.classList.add("hidden");
  pantalla.classList.remove("hidden");
}

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

document.getElementById("volver-inicio-btn").addEventListener("click", () => {
  window.location.href = "../../index.html";
});
document.getElementById("volver-inicio-btn-2").addEventListener("click", () => {
  window.location.href = "../../index.html";
});

function esCorreoGmailValido(email) {
  return /^[^\s@]+@gmail\.com$/i.test(email);
}

function mostrarFeedback(elId, mensaje, tipo) {
  const el = document.getElementById(elId);
  el.textContent = mensaje;
  el.className = `feedback ${tipo}`;
  el.classList.remove("hidden");
}

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
    const pendienteTag = admin.registrado ? "" : `<span class="pending-tag">Pendiente de iniciar sesión</span>`;
    li.innerHTML = `
      <span class="admin-email">${admin.email} ${pendienteTag}</span>
      <div class="admin-actions">
        <button class="btn-small btn-edit" data-email="${admin.email}">Editar</button>
        <button class="btn-small btn-remove" data-email="${admin.email}">Quitar</button>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", () => {
      editandoEmailOriginal = btn.dataset.email;
      document.getElementById("email-input").value = btn.dataset.email;
      document.getElementById("form-title").textContent = "Editar correo del administrador";
      document.getElementById("form-hint").textContent = "Corrige el correo y guarda los cambios.";
      document.getElementById("make-admin").textContent = "Guardar cambios";
      document.getElementById("cancelar-edicion").classList.remove("hidden");
      document.getElementById("email-input").focus();
    });
  });

  list.querySelectorAll(".btn-remove").forEach(btn => {
    btn.addEventListener("click", () => quitarAdmin(btn.dataset.email));
  });
}

function resetearFormulario() {
  editandoEmailOriginal = null;
  document.getElementById("email-input").value = "";
  document.getElementById("form-title").textContent = "Convertir usuario en administrador";
  document.getElementById("form-hint").textContent = "El correo debe ser una dirección Gmail. No es necesario que el usuario ya haya iniciado sesión antes.";
  document.getElementById("make-admin").textContent = "Hacer administrador";
  document.getElementById("cancelar-edicion").classList.add("hidden");
}

document.getElementById("cancelar-edicion").addEventListener("click", resetearFormulario);

// ---------- Botón principal: crear admin nuevo O guardar edición ----------
document.getElementById("make-admin").addEventListener("click", async () => {
  const input = document.getElementById("email-input");
  const email = input.value.trim();

  if (!email) return;

  if (!esCorreoGmailValido(email)) {
    mostrarFeedback("make-admin-msg", "El correo debe ser una dirección válida de @gmail.com.", "error");
    return;
  }

  if (editandoEmailOriginal) {
    // Quitar el correo viejo de la lista de autorizados y agregar el nuevo
    const { error: errorQuitar } = await supabase.rpc("quitar_admin_por_email", { user_email: editandoEmailOriginal });
    if (errorQuitar) {
      console.error(errorQuitar);
      mostrarFeedback("make-admin-msg", "No se pudo editar: " + errorQuitar.message, "error");
      return;
    }

    const { error: errorAgregar } = await supabase.rpc("hacer_admin_por_email", { user_email: email });
    if (errorAgregar) {
      console.error(errorAgregar);
      mostrarFeedback("make-admin-msg", "Error al guardar el nuevo correo.", "error");
      return;
    }

    mostrarFeedback("make-admin-msg", "Correo actualizado correctamente.", "success");
    resetearFormulario();
    loadAdmins();
    return;
  }

  // Modo creación
  const { error } = await supabase.rpc("hacer_admin_por_email", { user_email: email });

  if (error) {
    console.error(error);
    mostrarFeedback("make-admin-msg", "Error al asignar el rol de administrador.", "error");
  } else {
    mostrarFeedback("make-admin-msg", `${email} ahora es administrador.`, "success");
    resetearFormulario();
    loadAdmins();
  }
});

// ---------- Quitar admin ----------
async function quitarAdmin(email) {
  if (!confirm("¿Seguro que deseas quitar el rol de administrador a este correo?")) return;

  const { error } = await supabase.rpc("quitar_admin_por_email", { user_email: email });

  if (error) {
    alert(error.message.includes("al menos un administrador")
      ? "No se puede quitar: debe existir al menos un administrador en el sistema."
      : "Error al quitar el rol de administrador.");
    console.error(error);
  } else {
    loadAdmins();
  }
}

verificarSesion();