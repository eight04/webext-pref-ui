/* eslint-env mocha */
const assert = require("assert");

const sinon = require("sinon");
const jsdomGlobal = require("jsdom-global");
const {createPref, createMemoryStorage} = require("webext-pref");

const {createUI, createBinding} = require("..");

function delay(timeout = 0) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

describe("main", () => {
  let cleanup;
  
  beforeEach(function () {
    this.timeout(40000);
    cleanup = jsdomGlobal();
  });
  
  afterEach(() => {
    cleanup();
    cleanup = null;
  });
  
  it("sync with pref", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    createBinding({pref, root});
    
    assert.equal(root.querySelector("input").value, "bar");
    await pref.set("foo", "baz");
    assert.equal(root.querySelector("input").value, "baz");
    await pref.addScope("test1");
    await pref.setCurrentScope("test1");
    await pref.set("foo", "bak");
    assert.equal(root.querySelector("input").value, "bak");
    await pref.deleteScope("test1");
    assert.equal(root.querySelector("input").value, "baz");
  });
  
  it("unbind", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    
    assert(!pref.listeners);
    
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    
    assert(!pref.listeners);
    
    const unbind = createBinding({pref, root});
    
    assert(pref.listeners.change.length);
    assert(pref.listeners.scopeChange.length);
    assert(pref.listeners.scopeListChange.length);
    
    await pref.set("foo", "text2");
    assert.equal(root.querySelector("input").value, "text2");
    
    unbind();
    
    assert(!pref.listeners);
    
    await pref.set("foo", "text3");
    assert.equal(root.querySelector("input").value, "text2");
  });
  
  it("import, export", async () => {
    let promptResult;
    global.prompt = sinon.spy(() => promptResult);
    
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    createBinding({pref, root});
    
    await pref.set("foo", "bar");
    const exportButton = root.querySelector(".webext-pref-export");
    exportButton.click();
    await delay();
    const exported = global.prompt.lastCall.args[1];
    assert.deepStrictEqual(JSON.parse(exported), {
      scopeList: ["global"],
      scopes: {
        global: {
          foo: "bar"
        }
      }
    });
    
    const importButton = root.querySelector(".webext-pref-import");
    promptResult = JSON.stringify({
      scopes: {
        global: {
          foo: "baz"
        }
      }
    });
    importButton.click();
    await delay();
    assert.equal(pref.get("foo"), "baz");
    
    delete global.prompt;
  });
  
  it("with scope", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    await pref.addScope("test");
    await pref.setCurrentScope("test");
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    createBinding({pref, root});
    
    const select = root.querySelector(".webext-pref-nav select");
    assert.equal(select.value, "test");
  });
  
  it("add scope, delete scope", async () => {
    let promptResult;
    let confirmResult;
    global.prompt = sinon.spy(() => promptResult);
    global.confirm = sinon.spy(() => confirmResult);
    
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    createBinding({pref, root});
    
    const addButton = root.querySelector(".webext-pref-add-scope");
    const deleteButton = root.querySelector(".webext-pref-delete-scope");
    promptResult = "foo";
    addButton.click();
    promptResult = "bar";
    addButton.click();
    
    await delay();
    assert.deepStrictEqual(pref.getScopeList(), ["global", "foo", "bar"]);
    
    confirmResult = true;
    deleteButton.click();
    await delay();
    assert.deepStrictEqual(pref.getScopeList(), ["global", "foo"]);
    assert.equal(global.confirm.lastCall.args[0], "Delete scope bar?");
    
    confirmResult = false;
    deleteButton.click();
    await delay();
    assert.deepStrictEqual(pref.getScopeList(), ["global", "foo"]);
    
    delete global.prompt;
    delete global.confirm;
  });
  
  it("getMessage", async () => {
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ],
      getMessage: key => {
        if (key === "importButton") {
          return "foo";
        }
      }
    });
    
    const button = root.querySelector(".webext-pref-import");
    assert.equal(button.textContent, "foo");
  });
  
  it("getNewScope", async () => {
    const prompt = sinon.spy(async () => {});
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    createBinding({
      pref,
      root,
      getNewScope: () => "foo",
      prompt
    });
    
    const button = root.querySelector(".webext-pref-add-scope");
    button.click();
    await delay();
    assert.equal(prompt.lastCall.args[1], "foo");
  });
  
  it("change scope", async () => {
    const pref = createPref({foo: "bar"});
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "Set value for foo"
        }
      ]
    });
    createBinding({pref, root});
    
    await pref.addScope("test1");
    const select = root.querySelector(".webext-pref-nav select");
    select.value = "test1";
    select.dispatchEvent(new Event("change"));
    await delay();
    assert.equal(pref.getCurrentScope(), "test1");
  });
  
  it("empty body", async () => {
    createUI({
      body: []
    });
  });
  
  it("section", async () => {
    const root = createUI({
      body: [
        {
          type: "section",
          label: "Set value for foo",
          children: [
            {
              key: "foo",
              type: "text",
              label: "label of foo"
            }
          ]
        }
      ]
    });
    
    assert.equal(root.querySelector(".webext-pref-body").innerHTML, `<div class="webext-pref-section"><h3 class="webext-pref-header">Set value for foo</h3><div class="webext-pref-text browser-style"><label for="pref-foo">label of foo</label><input type="text" id="pref-foo"></div></div>`);
  });
  
  it("checkbox", async () => {
    const pref = createPref({foo: true});
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "checkbox",
          label: "foo label",
        }
      ]
    });
    createBinding({pref, root});
    const input = root.querySelector("input");
    assert(input.checked);
    input.checked = false;
    input.dispatchEvent(new Event("change"));
    await delay();
    assert(!pref.get("foo"));
  });
  
  it("checkbox children", async () => {
    const pref = createPref({foo: true, bar: false});
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "checkbox",
          label: "foo label",
          children: [
            {
              key: "bar",
              type: "checkbox",
              label: "bar label"
            }
          ]
        }
      ]
    });
    createBinding({pref, root});
    assert(!root.querySelector("fieldset").disabled);
    await pref.set("foo", false);
    assert(root.querySelector("fieldset").disabled);
  });
  
  it("radiogroup", async () => {
    const pref = createPref({gender: "male"});
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "gender",
          type: "radiogroup",
          label: "gender label",
          children: [
            {
              type: "radio",
              label: "♂",
              value: "male"
            },
            {
              type: "radio",
              label: "♀",
              value: "female"
            }
          ]
        }
      ]
    });
    createBinding({pref, root});
    const radios = root.querySelectorAll("input");
    
    assert.equal(radios[0].name, "pref-gender");
    assert.equal(radios[1].name, "pref-gender");
    
    assert(radios[0].checked);
    assert(!radios[1].checked);
    
    assert.equal(pref.get("gender"), "male");
    
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event("change"));
    
    await delay();
    
    assert.equal(pref.get("gender"), "female");
    
    assert(!radios[0].checked);
    assert(radios[1].checked);
  });
  
  it("radiogroup children", async () => {
    const pref = createPref({
      gender: "male",
      maleOnly: "foo",
      femaleOnly: "bar"
    });
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "gender",
          type: "radiogroup",
          label: "gender label",
          children: [
            {
              type: "radio",
              label: "♂",
              value: "male",
              children: [
                {
                  key: "maleOnly",
                  type: "text",
                  label: "male only"
                }
              ]
            },
            {
              type: "radio",
              label: "♀",
              value: "female",
              children: [
                {
                  key: "femaleOnly",
                  type: "text",
                  label: "female only"
                }
              ]
            }
          ]
        }
      ]
    });
    createBinding({pref, root});
    const fieldsets = root.querySelectorAll("fieldset");
    assert(!fieldsets[0].disabled);
    assert(fieldsets[1].disabled);
    await pref.set("gender", "female");
    assert(fieldsets[0].disabled);
    assert(!fieldsets[1].disabled);
  });
  
  it("select", async () => {
    const pref = createPref({
      foo: "foo"
    });
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "select",
          label: "select foo",
          options: {
            foo: "I am foo",
            bar: "You are bar",
            baz: "He is baz"
          }
        }
      ]
    });
    createBinding({pref, root});
    const input = root.querySelector(".webext-pref-body select");
    assert.equal(input.value, "foo");
    input.value = "bar";
    input.dispatchEvent(new Event("change"));
    await delay();
    assert.equal(input.selectedOptions[0].textContent, "You are bar");
    assert.equal(pref.get("foo"), "bar");
  });
  
  it("select multiple", async () => {
    const pref = createPref({
      foo: ["foo"]
    });
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "select",
          label: "select foo",
          multiple: true,
          options: {
            foo: "I am foo",
            bar: "You are bar",
            baz: "He is baz"
          }
        }
      ]
    });
    createBinding({pref, root});
    const input = root.querySelector(".webext-pref-body select");
    assert.deepStrictEqual([...input.selectedOptions].map(o => o.value), ["foo"]);
    input.options[2].selected = true;
    input.dispatchEvent(new Event("change"));
    await delay();
    assert.deepStrictEqual(pref.get("foo"), ["foo", "baz"]);
  });
  
  it("textarea", async () => {
    const pref = createPref({
      foo: "foo\nbar"
    });
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "textarea",
          label: "foo label"
        }
      ]
    });
    createBinding({pref, root});
    const input = root.querySelector("textarea");
    assert.equal(input.nodeName, "TEXTAREA");
    assert.equal(input.value, "foo\nbar");
  });
  
  it("number", async () => {
    const pref = createPref({
      foo: 5
    });
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "number",
          label: "foo label"
        }
      ]
    });
    createBinding({pref, root});
    const input = root.querySelector("input");
    input.value = "7";
    input.dispatchEvent(new Event("change"));
    assert.strictEqual(pref.get("foo"), 7);
  });
  
  // FIXME: what does validate do when type is checkbox or radiogroup?
  it("validate", async () => {
    const pref = createPref({
      foo: "123"
    });
    await pref.connect(createMemoryStorage());
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "foo label",
          validate: value => {
            if (/\D/.test(value)) {
              throw new Error("only numbers are allowed");
            }
          }
        }
      ]
    });
    createBinding({pref, root});
    const input = root.querySelector("input");
    assert(input.validity.valid);
    input.value = "foo";
    input.dispatchEvent(new Event("change"));
    assert(!input.validity.valid);
    assert.equal(input.validationMessage, "only numbers are allowed");
    await delay();
    assert.equal(pref.get("foo"), "123");
    input.value = "456";
    input.dispatchEvent(new Event("change"));
    assert(input.validity.valid);
    await delay();
    assert.equal(pref.get("foo"), "456");
  });
  
  it("other properties", async () => {
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: "foo label",
          className: "bar",
          help: "baz",
          learnMore: "https://example.com/"
        }
      ]
    });
    const container = root.querySelector("input").parentNode;
    assert(container.className.includes("bar"));
    assert.equal(container.children[0].nodeName, "LABEL");
    assert.equal(container.children[1].nodeName, "A");
    assert.equal(container.children[1].href, "https://example.com/");
    assert.equal(container.children[2].nodeName, "INPUT");
    assert.equal(container.children[3].nodeName, "P");
    assert.equal(container.children[3].textContent, "baz");
  });
  
  it("use Node as label and help", async () => {
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "text",
          label: document.createElement("p"),
          help: document.createElement("code")
        }
      ]
    });
    assert(root.querySelector("label > p"));
    assert(root.querySelector(".webext-pref-help > code"));
  });
  
  it("change class name of radio", async () => {
    const root = createUI({
      body: [
        {
          key: "foo",
          type: "radiogroup",
          label: "foo",
          children: [
            {
              type: "radio",
              label: "B",
              value: "b"
            },
            {
              type: "radio",
              label: "A",
              value: "a",
              className: "highlight"
            }
          ]
        }
      ]
    });
    assert(root.querySelector(".highlight > input[value=a]"));
  });
  
  it("realtime", async () => {
    const pref = createPref({
      foo: 123
    });
    await pref.connect(createMemoryStorage());
    document.body.innerHTML = `
      <input type="range" id="pref-foo" min="0" max="200" realtime>
    `;
    createBinding({pref, root: document.body});
    const input = document.querySelector("input");
    assert.equal(input.value, "123");
    input.value = "124";
    input.dispatchEvent(new Event("input"));
    assert.equal(pref.get("foo"), 124);
  });
});
