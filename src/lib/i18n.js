function messageGetter({
  getMessage,
  DEFAULT
}) {
  return (key, params) => {
    const message = getMessage(key, params);
    if (message) return message;
    
    const defaultMessage = DEFAULT[key];
    if (!defaultMessage) return "";
    if (!params) return defaultMessage;
    if (!Array.isArray(params)) {
      params = [params];
    }
    return defaultMessage.replace(/\$(d+)/g, (m, n) => params[n - 1]);
  };
}

export function fallback(getMessage) {
  return messageGetter({
    getMessage,
    DEFAULT: {
      currentScopeLabel: "Current scope",
      addScopeLabel: "Add new scope",
      deleteScopeLabel: "Delete current scope",
      learnMoreButton: "Learn more",
      importButton: "Import",
      exportButton: "Export",
      addScopePrompt: "Add new scope",
      deleteScopeConfirm: "Delete scope $1?",
      importPrompt: "Paste settings",
      exportPrompt: "Copy settings"
    }
  });
}
