import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://hlgzkqnqpjlwnaiduxcc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZ3prcW5xcGpsd25haWR1eGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzMzNzIsImV4cCI6MjA5NjQ0OTM3Mn0.61YF9AP-slDa_2Ly2yuXdgT4wwtZqlH135T_9iu35Sw"; 
const supabase = createClient(supabaseUrl, supabaseKey);

// Cargar lista de administradores
async function loadAdmins() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, auth.users(email)")
    .eq("role", "admin");

  if (error) {
    console.error("Error cargando admins:", error.message);
    return;
  }

  const list = document.getElementById("admin-list");
  list.innerHTML = "";
  data.forEach(admin => {
    const li = document.createElement("li");
    li.textContent = admin.auth_users.email;
    list.appendChild(li);
  });
}

// Convertir usuario en admin por correo
document.getElementById("make-admin").addEventListener("click", async () => {
  const email = document.getElementById("email-input").value;
  if (!email) return;

  // Buscar usuario por correo
  const { data: user, error: userError } = await supabase
    .from("auth.users")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !user) {
    alert("Usuario no encontrado");
    return;
  }

  // Actualizar rol
  const { error } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.id);

  if (error) {
    alert("Error al actualizar rol");
  } else {
    alert("Usuario convertido en administrador");
    loadAdmins();
  }
});

// Eliminar admin por correo
document.getElementById("remove-admin").addEventListener("click", async () => {
  const email = document.getElementById("remove-email").value;
  if (!email) return;

  const { data: user, error: userError } = await supabase
    .from("auth.users")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !user) {
    alert("Administrador no encontrado");
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: "user" })
    .eq("id", user.id);

  if (error) {
    alert("Error al eliminar administrador");
  } else {
    alert("Administrador eliminado");
    loadAdmins();
  }
});

// Inicializar
loadAdmins();
