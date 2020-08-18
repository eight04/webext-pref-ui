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
```
Output:
```html
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
    <label for="pref-foo">A field</label>
    <input type="text" id="pref-foo"/>
    <p class="webext-pref-help">Some simple help text</p>
  </div>
</div>
```
Then bind elements to the pref:
```js
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

> **Note**: You can build your own interface without `createUI` and bind it to `pref` using `createBinding` as long as `createBinding` can detect input elements.

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

#### ViewBodyItem

An item has following properties:

```js
{
  key: String,
  label: String | Node,
  type: String,
  
  children?: Array<ViewBodyItem>,
  className?: String,
  help?: String | Node,
  learnMore?: String,
  multiple?: Boolean,
  options?: Object<value: String, label: String>,
  validate?: value => void,
  value?: String
}
```

* `type` - Valid values: `text`, `number`, `checkbox`, `textarea`, `radiogroup`, `radio`, `select`, `color`, `section`.

  `text`, `number`, `checkbox`, `textarea`, `select`, and `color` will create a corresponded form element.

  `radiogroup` will create a container within a list of `radio` children. `radio` type must be used as `radiogroup`'s children.

  `section` creates a section with a header.

* `label` - The label of the item or the header of the section.

* `children` - A list of child items. Only available if type is section, checkbox, radio, or radiogroup.

* `className` - Extra class name which will be assigned to the container.

* `help` - Additional help message.

* `learnMore` - A URL that the "Learn more" link points to.

* `multiple` - Only available if type is `select`. Set multiple to true to select multiple options.

* `options` - Only available if type is `select`. A value -> label object map.

* `validate` - A validating function. To invalidate the input, throw an error that the message is the validation message. If nothing is thrown, the input is considered valid.

* `value` - Only available if type is `radio`. Assign a value to the radio item. Which will be used when the radio is checked.

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
  prompt?: async text => (String | null),
  getMessage?: (key: String, params?: String | Array<String>) => localizedString?: String
  getNewScope?: () => scopeName: String
}) => unbind: () => void
```

Bind elements to a `pref` object.

`elements` are elements that should be checked. If not provided, `createBinding` finds elements from `root`:

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

`unbind` would remove all listeners from the DOM and the pref object.

#### Valid elements

Following elements are detected:

* `input`, `textarea`, and `select` having an `id` and the `id` without `keyPrefix` is a key in `pref`.

  - Value will be converted into a number if the type is `number` or `range`.
  - Value will be converted into an array if the element is `select` and `multiple` is set.
  - Pref is updated on `change` event by default. If the element has a `realtime` attribute then pref is updated on `input` event. 

* `input[type=radio]` having a `name` and the `name` without `keyPrefix` is a key in `pref`.

  - Update pref with the value of the input when the input is checked.

* `fieldset` having a `data-bind-to` attribute and the value is a key in `pref`.

  - The fieldset will be disabled if the pref value is falsy.
  - If `data-bind-to-value` is set, the fieldset will be disabled if the value doesn't match.
  - Note that we don't prefix `data-bind-to`.

* `button` and `select` having a class name and the class name without `controlPrefix` is one of `import`, `export`, `add-scope`, `delete-scope`, or `scope-list`.

For a live example, see [picker.html in Image Picka]().

Changelog
---------

* 0.2.1 (Aug 19, 2020)

  - Fix: `getMessage` can't recognize params.

* 0.2.0 (Aug 19, 2020)

  - Fix: typo that creates invalid id for radio.
  - Change: bundle to a single file. 

* 0.1.1 (Dec 25, 2019)

  - Add: `realtime` attribute.

* 0.1.0 (Dec 25, 2019)

  - First release.
