webext-pref-ui
===========

[![Build Status](https://travis-ci.com/eight04/webext-pref-ui.svg?branch=master)](https://travis-ci.com/eight04/webext-pref-ui)
[![codecov](https://codecov.io/gh/eight04/webext-pref-ui/branch/master/graph/badge.svg)](https://codecov.io/gh/eight04/webext-pref-ui)

Create a simple options page and bind to webext-pref.

Installation
------------

```
npm install webext-pref-ui
```

Usage
-----

```js
const {createUI, createBinding} = require("webext-pref-ui");

const root = createUI({
  body: [
    {
      type: "text",
      key: "foo",
      label: "A field",
      help: "Some simple help text"
    }
  ]
});
/*
<div class="webext-pref-toolbar">
  <button type="button" class="webext-pref-import browser-style">Import</button>
  <button type="button" class="webext-pref-export browser-style">Export</button>
</div>
<div class="webext-pref-nav">
  <select class="webext-pref-scope-list browser-style"></select>
  <button class="webext-pref-delete-scope browser-style">Delete scope</button>
  <button class="webext-pref-add-scope browser-style">Add scope</button>
</div>
<div class="webext-pref-body">
  <div class="webext-pref-text browser-style">
    <label for="foo">A field</label>
    <input type="text" id="pref-foo"/>
    <p class="webext-pref-help">Some simple help text</p>
  </div>
</div>
*/

// 2-way binding
createBinding({
  pref,
  root
});
```

API
----

This module exports following members:

* `createUI` - An utility function which can create a simple options page.
* `createBinding` - bind `pref` object to elements.

> **Note**: You can build your own interface without `createUI` and bind it to `pref` using `createBinding` as long as `createBinding` can detect the input element.

### createUI

```js
createUI({
  body: Array<ViewBodyItem>,
  getMessage?: (key: String, params?: String | Array<String>) => localizedString?: String,
  toolbar?: Boolean = true,
  navbar?: Boolean = true,
  keyPrefix?: String = "pref-",
  controlPrefix?: String = "webext-pref-"
}) => root: DocumentFragment
```

Build an options page.

`body` is a list ot `ViewBodyItem`.

`getMessage` is a function that is used to get localized strings. The signature is identical to `browser.i18n.getMessage`. `createUI` uses following messages:

| key | params | default text |
|-----|------- | ------------ |
|`currentScopeLabel`||`Current scope`|
|`addScopeLabel`||`Add new scope`|
|`deleteScopeLabel`||`Delete current scope`|
|`learnMoreButton`||`Learn more`|
|`importButton`||`Import`|
|`exportButton`||`Export`|

If `toolbar` is true then build the toolbar, including import and export button.

If `navbar` is true then build the navbar, including the scope list selection input, delete scope button, and add scope button.

`keyPrefix` is used to prefix input's `ID` or `name`. Use this option to avoid ID conflict.

`controlPrefix` is used to prefix components' class name. For example, by using a `webext-pref-` prefix, the class name of the import button will be `webext-pref-import` instead of `import`.

### createBinding

```js
createBinding({
  pref: Pref,
  root?: Node,
  elements?: Array<Element>,
  keyPrefix?: String = "pref-",
  controlPrefix?: String = "webext-pref-",
  alert?: async text => void,
  confirm?: async text => Boolean,
  prompt?: async text => String | null,
  getMessage?: (key: String, params?: String | Array<String>) => localizedString?: String
  getNewScope?: () => scopeName: String
}) => unbind: () => void
```

Bind a `pref` object to elements and vise versa.

`elements` are elements that should be checked. If not provided, `createBinding` find elements from `root`:

```js
elements = root.querySelectorAll("input, textarea, select, fieldset, button")
```

`keyPrefix` is used to strip the prefix in `id` and `name`.

`controlPrefix` is used to strip the prefix in the class name of webext-pref controls.

`alert`, `confirm`, and `prompt` are used when on import/export and add/delete scope. `createBinding` uses `window.alert`, `window.confirm`, and `window.prompt` by default.

`getMessage` is used to get the text for the dialog. `createBinding` uses following messages:

| key | params | default text |
|-----|------- | ------------ |
|`addScopePrompt`||`Add new scope`|
|`deleteScopeConfirm`|`scopeName`|`Delete scope ${scopeName}?`|
|`importPrompt`||`Paste settings`|
|`exportPrompt`||`Copy settings`|

`getNewScope` set the default scope name when adding a new scope. Default to `() => ""`.

#### Valid elements

Following elements are detected:

* `input`, `textarea`, and `select` having a `id` and the `id` without `keyPrefix` is a key in `pref`.

  - Value will be converted into a number if the type is `number` or `range`.
  - Value will be converted into an array if the element is `select` and `multiple` is set.

* `input[type=radio]` having a `name` and the `name` without `keyPrefix` is a key in `pref`.

  - Update pref with the value of the input when the input is checked.

* `fieldset` having a `data-bind-to` and the value is a key in `pref`.

  - The fieldset will be disabled if the pref value is falsy.
  - If `data-bind-to-value` is set, the fieldset will be disabled if the value doesn't match.
  - Note that we don't prefix `data-bind-to`.

* `button` and `select` having a class name and the class name without `controlPrefix` is one of `import`, `export`, `add-scope`, `delete-scope`, or `scope-list`.

Changelog
---------

* 0.1.0 (Aug 4, 2018)

  - First release.
