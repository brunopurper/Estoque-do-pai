import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.APP_CONFIG || {};
const isConfigured = config.supabaseUrl?.startsWith("https://")
  && config.supabaseAnonKey
  && !config.supabaseAnonKey.startsWith("COLE_");

const setupScreen = document.querySelector("#setup-screen");
const authScreen = document.querySelector("#auth-screen");
const appShell = document.querySelector("#app-shell");

if (!isConfigured) {
  setupScreen.hidden = false;
} else {
  startApp();
}

function startApp() {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const list = document.querySelector("#inventory-list");
  const emptyState = document.querySelector("#empty-state");
  const dialog = document.querySelector("#item-dialog");
  const confirmDialog = document.querySelector("#confirm-dialog");
  const form = document.querySelector("#item-form");
  const toast = document.querySelector("#toast");
  const lowButton = document.querySelector("#low-stock-filter");
  let items = [];
  let category = "";
  let lowStockOnly = false;
  let isSignUp = false;
  let toastTimer;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

  const isLowStock = (item) => item.quantity <= item.minimum_quantity;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3500);
  }

  function renderCard(item) {
    const low = isLowStock(item);
    const brandModel = [item.brand, item.model].filter(Boolean).join(" • ");
    const place = [item.box, item.shelf].filter(Boolean).join(" • ");
    return `<li class="item-card${low ? " low" : ""}">
      <div class="item-head">
        <h3 class="item-name">${escapeHtml(item.name)}</h3>
        <span class="badge">${escapeHtml(item.category)}</span>
      </div>
      ${brandModel ? `<p class="item-brand">${escapeHtml(brandModel)}</p>` : ""}
      <div class="location${place ? "" : " unknown"}">
        <span aria-hidden="true">📍</span>
        <div><small>Onde está guardado</small>${place ? escapeHtml(place) : "Local não informado"}</div>
      </div>
      <div class="qty-row">
        <div class="qty" role="group" aria-label="Quantidade de ${escapeHtml(item.name)}">
          <button class="qty-btn" type="button" data-action="minus" data-id="${item.id}" aria-label="Tirar 1 de ${escapeHtml(item.name)}"${item.quantity === 0 ? " disabled" : ""}>−</button>
          <div class="qty-value">${item.quantity}<small>em estoque</small></div>
          <button class="qty-btn" type="button" data-action="plus" data-id="${item.id}" aria-label="Colocar 1 em ${escapeHtml(item.name)}">+</button>
        </div>
        <span class="stock-flag ${low ? "low" : "ok"}">${low ? "Pouco estoque" : "Estoque normal"}</span>
      </div>
      ${item.notes ? `<p class="item-notes">${escapeHtml(item.notes)}</p>` : ""}
      <div class="item-actions">
        <button class="btn btn-secondary" type="button" data-action="edit" data-id="${item.id}">Editar</button>
        <button class="btn btn-delete" type="button" data-action="delete" data-id="${item.id}">Excluir</button>
      </div>
    </li>`;
  }

  function render() {
    const query = document.querySelector("#search-input").value.trim().toLocaleLowerCase("pt-BR");
    const filtered = items.filter((item) => {
      const text = [item.name, item.brand, item.model, item.sku, item.category, item.box, item.shelf, item.notes]
        .join(" ").toLocaleLowerCase("pt-BR");
      return (!query || text.includes(query))
        && (!category || item.category === category)
        && (!lowStockOnly || isLowStock(item));
    });

    const lowCount = items.filter(isLowStock).length;
    document.querySelector("#total-items").textContent = items.length.toLocaleString("pt-BR");
    document.querySelector("#total-items-label").textContent = items.length === 1 ? "item cadastrado" : "itens cadastrados";
    lowButton.hidden = lowCount === 0;
    lowButton.setAttribute("aria-pressed", String(lowStockOnly));
    lowButton.textContent = lowStockOnly ? "Mostrar todos" : `⚠ ${plural(lowCount, "item com pouco estoque", "itens com pouco estoque")}`;
    document.querySelector("#export-button").disabled = items.length === 0;

    const filtering = Boolean(query || category || lowStockOnly);
    document.querySelector("#result-count").textContent = filtering && items.length
      ? `Encontrado: ${plural(filtered.length, "item", "itens")}`
      : "";
    list.innerHTML = filtered.map(renderCard).join("");
    emptyState.hidden = filtered.length > 0;
    document.querySelector("#empty-title").textContent = filtering ? "Nada encontrado" : "Nenhum item ainda";
    document.querySelector("#empty-description").textContent = filtering
      ? "Tente escrever de outro jeito ou escolha “Todos”."
      : "Toque em “Adicionar item” para cadastrar a primeira peça.";
  }

  async function loadItems() {
    const { data, error } = await supabase.from("items").select("*").order("name");
    if (error) {
      showToast(`Não foi possível carregar: ${error.message}`, true);
      return;
    }
    items = data || [];
    render();
  }

  function openDialog(item = null) {
    form.reset();
    document.querySelector("#item-id").value = item?.id ?? "";
    document.querySelector("#dialog-title").textContent = item ? "Editar item" : "Adicionar item";
    document.querySelector("#form-error").textContent = "";
    if (item) {
      for (const field of form.elements) {
        if (field.name && item[field.name] !== undefined) field.value = item[field.name];
      }
    }
    dialog.showModal();
    dialog.scrollTop = 0;
    form.elements.name.focus();
  }

  function askToDelete(item) {
    document.querySelector("#confirm-text").textContent = `“${item.name}” será removido do estoque.`;
    confirmDialog.returnValue = "";
    confirmDialog.showModal();
    return new Promise((resolve) => {
      confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "yes"), { once: true });
    });
  }

  function setAuthMode(signUp) {
    isSignUp = signUp;
    document.querySelector("#auth-description").textContent = signUp
      ? "Crie sua conta com e-mail e senha."
      : "Entre para ver suas peças.";
    document.querySelector("#auth-submit").textContent = signUp ? "Criar conta" : "Entrar";
    document.querySelector("#auth-switch").innerHTML = signUp
      ? 'Já tem conta? <button class="link-button" id="toggle-auth" type="button">Entrar</button>'
      : 'Primeira vez aqui? <button class="link-button" id="toggle-auth" type="button">Criar conta</button>';
    document.querySelector("#auth-message").textContent = "";
    document.querySelector("[name=password]").autocomplete = signUp ? "new-password" : "current-password";
    document.querySelector("#toggle-auth").addEventListener("click", () => setAuthMode(!isSignUp));
  }

  async function updateSession(session) {
    authScreen.hidden = Boolean(session);
    appShell.hidden = !session;
    if (session) await loadItems();
  }

  document.querySelector("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#auth-message");
    const button = document.querySelector("#auth-submit");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    if (!email || password.length < 6) {
      message.textContent = "Escreva o e-mail e uma senha com pelo menos 6 letras ou números.";
      return;
    }
    button.disabled = true;
    message.textContent = "Aguarde...";
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    button.disabled = false;
    if (result.error) {
      message.textContent = result.error.message;
      return;
    }
    if (isSignUp && !result.data.session) {
      message.textContent = "Conta criada. Confirme o e-mail que você recebeu e depois entre.";
      return;
    }
    message.textContent = "";
    event.currentTarget.reset();
  });

  document.querySelector("#toggle-auth").addEventListener("click", () => setAuthMode(!isSignUp));
  document.querySelector("#logout-button").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showToast(error.message, true);
  });
  document.querySelector("#add-item-button").addEventListener("click", () => openDialog());
  document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
  document.querySelector("#cancel-dialog").addEventListener("click", () => dialog.close());
  document.querySelector("#search-input").addEventListener("input", render);

  document.querySelector("#category-chips").addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    category = chip.dataset.category;
    document.querySelectorAll(".chip").forEach((el) => {
      const active = el === chip;
      el.classList.toggle("active", active);
      el.setAttribute("aria-pressed", String(active));
    });
    render();
  });

  lowButton.addEventListener("click", () => {
    lowStockOnly = !lowStockOnly;
    render();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.querySelector("#save-item-button");
    const errorBox = document.querySelector("#form-error");
    const itemId = document.querySelector("#item-id").value;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.name = payload.name.trim();
    payload.quantity = Number(payload.quantity);
    payload.minimum_quantity = Number(payload.minimum_quantity);
    if (!payload.name) {
      errorBox.textContent = "Escreva o nome do item.";
      form.elements.name.focus();
      return;
    }
    if (!Number.isInteger(payload.quantity) || payload.quantity < 0
      || !Number.isInteger(payload.minimum_quantity) || payload.minimum_quantity < 0) {
      errorBox.textContent = "As quantidades devem ser números inteiros, de 0 para cima.";
      return;
    }
    button.disabled = true;
    errorBox.textContent = "";
    const result = itemId
      ? await supabase.from("items").update(payload).eq("id", itemId)
      : await supabase.from("items").insert(payload);
    button.disabled = false;
    if (result.error) {
      errorBox.textContent = result.error.message;
      return;
    }
    dialog.close();
    await loadItems();
    showToast(itemId ? "Item atualizado." : "Item adicionado.");
  });

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;
    const item = items.find((entry) => entry.id === Number(button.dataset.id));
    if (!item) return;
    const action = button.dataset.action;

    if (action === "edit") {
      openDialog(item);
    } else if (action === "plus" || action === "minus") {
      const quantity = Math.max(0, item.quantity + (action === "plus" ? 1 : -1));
      button.disabled = true;
      const { error } = await supabase.from("items").update({ quantity }).eq("id", item.id);
      if (error) {
        showToast(error.message, true);
        button.disabled = false;
        return;
      }
      item.quantity = quantity;
      render();
      list.querySelector(`button[data-action="${action}"][data-id="${item.id}"]`)?.focus();
    } else if (action === "delete") {
      if (!(await askToDelete(item))) return;
      const { error } = await supabase.from("items").delete().eq("id", item.id);
      if (error) {
        showToast(error.message, true);
        return;
      }
      await loadItems();
      showToast("Item excluído.");
    }
  });

  document.querySelector("#export-button").addEventListener("click", () => {
    const headers = ["Nome", "Tipo", "Marca", "Modelo", "Código", "Quantidade", "Avisar quando restar", "Caixa", "Prateleira", "Observações"];
    const fields = ["name", "category", "brand", "model", "sku", "quantity", "minimum_quantity", "box", "shelf", "notes"];
    const csv = [headers, ...items.map((item) => fields.map((field) => item[field] ?? ""))]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";"))
      .join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = "estoque.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    void updateSession(session);
  });
  supabase.auth.getSession().then(({ data }) => updateSession(data.session));
}
