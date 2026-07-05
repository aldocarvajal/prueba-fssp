import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw";
const supabase = createClient(supabaseUrl, supabaseKey);

const deniedScreen = document.getElementById("denied-screen");
const adminPanel = document.getElementById("admin-panel");

let editandoId = null; // si no es null, estamos editando el correo de este admin

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
    li.innerHTML = `
      <span class="admin-email">${admin.email}</span>
      <div class="admin-actions">
        <button class="btn-small btn-edit" data-id="${admin.id}" data-email="${admin.email}">Editar</button>
        <button class="btn-small btn-remove" data-id="${admin.id}">Quitar</button>
      </div>
    `;
    list.appendChild(li);
  });

  // Botones "Editar"
  list.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", () => {
      editandoId = btn.dataset.id;
      document.getElementById("email-input").value = btn.dataset.email;
      document.getElementById("form-title").textContent = "Editar correo del administrador";
      document.getElementById("form-hint").textContent = "Corrige el correo y guarda los cambios.";
      document.getElementById("make-admin").textContent = "Guardar cambios";
      document.getElementById("cancelar-edicion").classList.remove("hidden");
      document.getElementById("email-input").focus();
    });
  });

  // Botones "Quitar"
  list.querySelectorAll(".btn-remove").forEach(btn => {
    btn.addEventListener("click", () => quitarAdmin(btn.dataset.id, data.length));
  });
}

function resetearFormulario() {
  editandoId = null;
  document.getElementById("email-input").value = "";
  document.getElementById("form-title").textContent = "Convertir usuario en administrador";
  document.getElementById("form-hint").textContent = "El usuario debe haberse registrado previamente en el sistema, con correo Gmail.";
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

  if (editandoId) {
    // Modo edición: solo corregir el correo en auth.users vía función RPC
    const { error } = await supabase.rpc("actualizar_email_usuario", {
      user_id: editandoId,
      nuevo_email: email
    });

    if (error) {
      console.error(error);
      mostrarFeedback("make-admin-msg", "Error al actualizar el correo.", "error");
      return;
    }

    mostrarFeedback("make-admin-msg", "Correo actualizado correctamente.", "success");
    resetearFormulario();
    loadAdmins();
    return;
  }

  // Modo creación: convertir usuario existente en admin
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
    resetearFormulario();
    loadAdmins();
  }
});

// ---------- Quitar admin (con restricción de "al menos 1") ----------
async function quitarAdmin(userId, totalAdmins) {
  if (totalAdmins <= 1) {
    alert("No se puede quitar: debe existir al menos un administrador en el sistema.");
    return;
  }

  if (!confirm("¿Seguro que deseas quitar el rol de administrador a este usuario?")) return;

  const { error } = await supabase
    .from("profiles")
    .update({ role: "user" })
    .eq("id", userId);

  if (error) {
    console.error(error);
    alert("Error al quitar el rol de administrador.");
  } else {
    loadAdmins();
  }
}

verificarSesion();