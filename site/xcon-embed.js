(function attachXconEmbed(global) {
  function xconHostFrameStyle(root, options) {
    const settings = options || {};
    const rect = xconRectParts(xconValue(root, 'pos'));
    const declarations = [
      'position:relative',
      `display:${settings.display || 'block'}`,
      'box-sizing:border-box',
      settings.maxWidth === false ? '' : `max-width:${settings.maxWidth || '100%'}`,
      `overflow:${settings.overflow || 'hidden'}`,
      'background:transparent',
      'isolation:isolate'
    ];

    if (settings.verticalAlign) declarations.push(`vertical-align:${settings.verticalAlign}`);

    if (rect) {
      const width = settings.includeOffset === false ? rect[2] : Math.max(0, rect[0]) + rect[2];
      const height = settings.includeOffset === false ? rect[3] : Math.max(0, rect[1]) + rect[3];
      declarations.push(`width:${numberPx(width)}`, `height:${numberPx(height)}`);
    } else if (settings.fillWhenMissing === false) {
      declarations.push(
        `width:${numberPx(settings.defaultWidth || 900)}`,
        `height:${numberPx(settings.defaultHeight || 650)}`
      );
    } else {
      declarations.push('width:100%', 'min-height:100%');
    }

    return declarations.filter(Boolean).join(';');
  }

  function getXconDocumentSize(root, options) {
    const settings = options || {};
    const rect = xconRectParts(xconValue(root, 'pos'));
    if (rect) {
      return {
        width: settings.includeOffset === false ? rect[2] : Math.max(0, rect[0]) + rect[2],
        height: settings.includeOffset === false ? rect[3] : Math.max(0, rect[1]) + rect[3]
      };
    }
    return {
      width: settings.defaultWidth || null,
      height: settings.defaultHeight || null
    };
  }

  function xconValue(node, key) {
    if (!node) return undefined;
    if (typeof node.get === 'function') return node.get(key);
    return node[key];
  }

  function xconRectParts(value) {
    let parts = null;
    if (Array.isArray(value)) {
      parts = value;
    } else if (typeof value === 'string') {
      parts = value.split(/[,\s]+/).filter(Boolean);
    } else if (value && typeof value === 'object') {
      parts = [value.x, value.y, value.width, value.height];
    }
    if (!parts || parts.length < 4) return null;
    const numbers = parts.slice(0, 4).map((part) => Number(part));
    return numbers.every(Number.isFinite) ? numbers : null;
  }

  function numberPx(value) {
    return `${Math.max(0, Math.round(Number(value) || 0))}px`;
  }

  window.XconEmbed = Object.freeze({
    getXconDocumentSize,
    xconHostFrameStyle
  });
})(window);
