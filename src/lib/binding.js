import {fallback} from "./i18n.js";

const VALID_CONTROL = new Set(["import", "export", "scope-list", "add-scope", "delete-scope"]);

class DefaultMap extends Map {
  constructor(getDefault) {
    super();
    this.getDefault = getDefault;
  }
  get(key) {
    let item = super.get(key);
    if (!item) {
      item = this.getDefault();
      super.set(key, item);
    }
    return item;
  }
}

function bindInputs(pref, inputs) {
  const bounds = [];
  const onPrefChange = change => {
    for (const key in change) {
      if (!inputs.has(key)) {
        continue;
      }
      for (const input of inputs.get(key)) {
        updateInput(input, change[key]);
      }
    }
  };
  pref.on("change", onPrefChange);
  bounds.push(() => pref.off("change", onPrefChange));
  
  for (const [key, list] of inputs.entries()) {
    for (const input of list) {
      const onChange = () => updatePref(key, input);
      input.addEventListener("change", onChange);
      bounds.push(() => input.removeEventListener("change", onChange));
    }
  }
  
  onPrefChange(pref.getAll());
  
  return () => {
    for (const unbind of bounds) {
      unbind();
    }
  };
  
  function updatePref(key, input) {
    if (input.type === "checkbox") {
      pref.set(key, input.checked);
      return;
    }
    if (input.type === "radio") {
      if (input.checked) {
        pref.set(key, input.value);
      }
      return;
    }
    if (input.nodeName === "SELECT" && input.multiple) {
      pref.set(key, [...input.options].filter(o => o.selected).map(o => o.value));
      return;
    }
    if (input.type === "number" || input.type === "range") {
      pref.set(key, Number(input.value));
      return;
    }
    pref.set(key, input.value);
  }
  
  function updateInput(input, value) {
    if (input.nodeName === "INPUT" && input.type === "radio") {
      input.checked = input.value === value;
      return;
    }
    if (input.type === "checkbox") {
      input.checked = value;
      return;
    }
    if (input.nodeName === "SELECT" && input.multiple) {
      const checked = new Set(value);
      for (const option of input.options) {
        option.selected = checked.has(option.value);
      }
      return;
    }
    input.value = value;
  }
}

function bindFields(pref, fields) {
  const onPrefChange = change => {
    for (const key in change) {
      if (!fields.has(key)) {
        continue;
      }
      for (const field of fields.get(key)) {
        field.disabled = field.dataset.bindToValue ?
          field.dataset.bindToValue !== change[key] : !change[key];
      }
    }
  };
  pref.on("change", onPrefChange);
  onPrefChange(pref.getAll());
  return () => pref.off("change", onPrefChange);
}

function bindControls({
  pref,
  controls,
  alert: _alert = alert,
  confirm: _confirm = confirm,
  prompt: _prompt = prompt,
  getMessage = () => {},
  getNewScope = () => ""
}) {
  const CONTROL_METHODS = {
    "import": ["click", doImport],
    "export": ["click", doExport],
    "scope-list": ["change", updateCurrentScope],
    "add-scope": ["click", addScope],
    "delete-scope": ["click", deleteScope]
  };
  
  for (const type in CONTROL_METHODS) {
    for (const el of controls.get(type)) {
      el.addEventListener(CONTROL_METHODS[type][0], CONTROL_METHODS[type][1]);
    }
  }
  
  pref.on("scopeChange", updateCurrentScopeEl);
  pref.on("scopeListChange", updateScopeList);
  
  updateScopeList();
  updateCurrentScopeEl();
  
  const _ = fallback(getMessage);
  
  return unbind;
  
  function unbind() {
    pref.off("scopeChange", updateCurrentScopeEl);
    pref.off("scopeListChange", updateScopeList);
    
    for (const type in CONTROL_METHODS) {
      for (const el of controls.get(type)) {
        el.removeEventListener(CONTROL_METHODS[type][0], CONTROL_METHODS[type][1]);
      }
    }
  }
  
  async function doImport() {
    try {
      const input = await _prompt(_("importPrompt"));
      if (input == null) {
        return;
      }
      const settings = JSON.parse(input);
      return pref.import(settings);
    } catch (err) {
      await _alert(err.message);
    }
  }
  
  async function doExport() {
    try {
      const settings = await pref.export();
      await _prompt(_("exportPrompt"), JSON.stringify(settings));
    } catch (err) {
      await _alert(err.message);
    }
  }
  
  function updateCurrentScope(e) {
    pref.setCurrentScope(e.target.value);
  }
  
  async function addScope() {
    try {
      let scopeName = await _prompt(_("addScopePrompt"), getNewScope());
      if (scopeName == null) {
        return;
      }
      scopeName = scopeName.trim();
      if (!scopeName) {
        throw new Error("the value is empty");
      }
      await pref.addScope(scopeName);
      pref.setCurrentScope(scopeName);
    } catch (err) {
      await _alert(err.message);
    }
  }
  
  async function deleteScope() {
    try {
      const scopeName = pref.getCurrentScope();
      const result = await _confirm(_("deleteScopeConfirm", scopeName));
      if (result) {
        return pref.deleteScope(scopeName);
      }
    } catch (err) {
      await _alert(err.message);
    }
  }
  
  function updateCurrentScopeEl() {
    const scopeName = pref.getCurrentScope();
    for (const el of controls.get("scope-list")) {
      el.value = scopeName;
    }
  }
  
  function updateScopeList() {
    const scopeList = pref.getScopeList();
    for (const el of controls.get("scope-list")) {
      el.innerHTML = "";
      el.append(...scopeList.map(scope => {
        const option = document.createElement("option");
        option.value = scope;
        option.textContent = scope;
        return option;
      }));
    }
  }
}

export function createBinding({
  pref,
  root,
  elements = root.querySelectorAll("input, textarea, select, fieldset, button"),
  keyPrefix = "pref-",
  controlPrefix = "webext-pref-",
  alert,
  confirm,
  prompt,
  getMessage,
  getNewScope
}) {
  const inputs = new DefaultMap(() => []);
  const fields = new DefaultMap(() => []);
  const controls = new DefaultMap(() => []);
  
  for (const element of elements) {
    const id = element.id && stripPrefix(element.id, keyPrefix);
    if (id && pref.has(id)) {
      inputs.get(id).push(element);
      continue;
    }
    if (element.nodeName === "INPUT" && element.type === "radio") {
      const name = element.name && stripPrefix(element.name, keyPrefix);
      if (name && pref.has(name)) {
        inputs.get(name).push(element);
        continue;
      }
    }
    if (element.nodeName === "FIELDSET" && element.dataset.bindTo) {
      fields.get(element.dataset.bindTo).push(element);
      continue;
    }
    const controlType = findControlType(element.classList);
    if (controlType) {
      controls.get(controlType).push(element);
    }
  }
  const bounds = [
    bindInputs(pref, inputs),
    bindFields(pref, fields),
    bindControls({pref, controls, alert, confirm, prompt, getMessage, getNewScope})
  ];
  return () => {
    for (const unbind of bounds) {
      unbind();
    }
  };
  
  function stripPrefix(id, prefix) {
    if (!prefix) {
      return id;
    }
    return id.startsWith(prefix) ? id.slice(prefix.length) : "";
  }
  
  function findControlType(list) {
    for (const name of list) {
      const controlType = stripPrefix(name, controlPrefix);
      if (VALID_CONTROL.has(controlType)) {
        return controlType;
      }
    }
  }
}
