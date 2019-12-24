import * as React from "jsx-dom";
import {fallback} from "./i18n.js";

export function createUI({
  body,
  getMessage = () => {},
  toolbar = true,
  navbar = true,
  keyPrefix = "pref-",
  controlPrefix = "webext-pref-"
}) {
  const root = document.createDocumentFragment();
  const _ = fallback(getMessage);
  if (toolbar) {
    root.append(createToolbar());
  }
  if (navbar) {
    root.append(createNavbar());
  }
  root.append(
    <div class={controlPrefix + "body"}>
      {body.map(item => {
        if (!item.hLevel) {
          item.hLevel = 3;
        }
        return createItem(item);
      })}
    </div>
  );
  return root;
  
  function createToolbar() {
    return (
      <div class={controlPrefix + "toolbar"}>
        <button type="button" class={[controlPrefix + "import", "browser-style"]}>
          {_("importButton")}
        </button>
        <button type="button" class={[controlPrefix + "export", "browser-style"]}>
          {_("exportButton")}
        </button>
      </div>
    );
  }

  function createNavbar() {
    return (
      <div class={controlPrefix + "nav"}>
        <select class={[controlPrefix + "scope-list", "browser-style"]} title={_("currentScopeLabel")} />
        <button
            type="button" class={[controlPrefix + "delete-scope", "browser-style"]}
            title={_("deleteScopeLabel")}>
          ×
        </button>
        <button
            type="button" class={[controlPrefix + "add-scope", "browser-style"]}
            title={_("addScopeLabel")}>
          +
        </button>
      </div>
    );
  }

  function createItem(p) {
    if (p.type === "section") {
      return createSection(p);
    }
    if (p.type === "checkbox") {
      return createCheckbox(p);
    }
    if (p.type === "radiogroup") {
      return createRadioGroup(p);
    }
    return createInput(p);
  }
  
  function createInput(p) {
    const key = keyPrefix + p.key;
    let input;
    const onChange = p.validate ?
      e => {
        try {
          p.validate(e.target.value);
          e.target.setCustomValidity("");
        } catch (err) {
          e.target.setCustomValidity(err.message || String(err));
        }
      } : null;
    if (p.type === "select") {
      input = (
        <select multiple={p.multiple} class="browser-style" id={key} onChange={onChange}>
          {Object.entries(p.options).map(([value, label]) =>
            <option value={value}>{label}</option>
          )}
        </select>
      );
    } else if (p.type === "textarea") {
      input = <textarea rows="8" class="browser-style" id={key} onChange={onChange} />;
    } else {
      input = <input type={p.type} id={key} onChange={onChange} />;
    }
    return (
      <div class={[`${controlPrefix}${p.type}`, "browser-style", p.className]}>
        <label htmlFor={key}>{p.label}</label>
        {p.learnMore && <LearnMore url={p.learnMore} />}
        {input}
        {p.help && <Help content={p.help} />}
      </div>
    );
  }

  function createRadioGroup(p) {
    return (
      <div class={[`${controlPrefix}${p.type}`, "browser-style", p.className]}>
        <div class={controlPrefix + "radio-title"}>{p.label}</div>
        {p.learnMore && <LearnMore url={p.learnMore} />}
        {p.help && <Help content={p.help} />}
        {p.children.map(c => {
          c.parentKey = p.key;
          return createCheckbox(inheritProp(p, c));
        })}
      </div>
    );
  }
  
  function Help({content}) {
    return (
      <p class={controlPrefix + "help"}>
        {content}
      </p>
    );
  }
  
  function LearnMore({url}) {
    return (
      <a href={url} class={controlPrefix + "learn-more"} target="_blank" rel="noopener noreferrer">
        {_("learnMoreButton")}
      </a>
    );
  }

  function createCheckbox(p) {
    const id = p.parentKey ? `${keyPrefix}${p.parentKey}-{p.value}` : keyPrefix + p.key;
    return (
      <div class={[`${controlPrefix}${p.type}`, "browser-style", p.className]}>
        <input
          type={p.type} id={id} name={p.parentKey ? (keyPrefix + p.parentKey) : null}
          value={p.value} />
        <label htmlFor={id}>{p.label}</label>
        {p.learnMore && <LearnMore url={p.learnMore} />}
        {p.help && <Help content={p.help} />}
        {p.children &&
          <fieldset
              class={controlPrefix + "checkbox-children"}
              dataset={{bindTo: p.parentKey || p.key, bindToValue: p.value}}>
            {p.children.map(c => createItem(inheritProp(p, c)))}
          </fieldset>
        }
      </div>
    );
  }

  function createSection(p) {
    const Header = `h${p.hLevel}`;
    p.hLevel++;
    return (
      // FIXME: do we need browser-style for section?
      <div class={[controlPrefix + p.type, p.className]}>
        <Header class={controlPrefix + "header"}>{p.label}</Header>
        {p.help && <Help content={p.help} />}
        {p.children && p.children.map(c => createItem(inheritProp(p, c)))}
      </div>
    );
  }

  function inheritProp(parent, child) {
    child.hLevel = parent.hLevel;
    return child;
  }
}
