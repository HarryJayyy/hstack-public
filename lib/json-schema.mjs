function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolveReference(rootSchema, reference) {
  if (!reference.startsWith('#/')) {
    throw new Error(`only local JSON Schema references are supported: ${reference}`);
  }
  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((current, part) => current?.[part], rootSchema);
}

function matchesType(value, type) {
  switch (type) {
    case 'array': return Array.isArray(value);
    case 'integer': return Number.isInteger(value);
    case 'null': return value === null;
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'object': return isObject(value);
    case 'string': return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    default: throw new Error(`unsupported JSON Schema type: ${type}`);
  }
}

function addError(errors, keyword, path, message) {
  errors.push({ keyword, path, message });
}

function validateNode(value, schema, rootSchema, path, errors) {
  if (schema.$ref) {
    const referenced = resolveReference(rootSchema, schema.$ref);
    if (!referenced) throw new Error(`unresolved JSON Schema reference: ${schema.$ref}`);
    validateNode(value, referenced, rootSchema, path, errors);
    return;
  }

  if ('const' in schema && !sameValue(value, schema.const)) {
    addError(errors, 'const', path, `${path} must equal ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((candidate) => sameValue(value, candidate))) {
    addError(errors, 'enum', path, `${path} is not an allowed value`);
  }

  const allowedTypes = schema.type == null
    ? null
    : Array.isArray(schema.type) ? schema.type : [schema.type];
  if (allowedTypes && !allowedTypes.some((type) => matchesType(value, type))) {
    addError(errors, 'type', path, `${path} must be ${allowedTypes.join(' or ')}`);
    return;
  }

  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) {
      addError(errors, 'minLength', path, `${path} must not be empty`);
    }
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) {
      addError(errors, 'pattern', path, `${path} has an invalid format`);
    }
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) {
      addError(errors, 'format', path, `${path} must be an ISO date-time`);
    }
  }

  if (typeof value === 'number' && schema.minimum != null && value < schema.minimum) {
    addError(errors, 'minimum', path, `${path} must be at least ${schema.minimum}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) {
      addError(errors, 'minItems', path, `${path} requires at least ${schema.minItems} item(s)`);
    }
    if (schema.uniqueItems) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) {
        addError(errors, 'uniqueItems', path, `${path} must not contain duplicate items`);
      }
    }
    if (schema.items) {
      value.forEach((item, index) => validateNode(item, schema.items, rootSchema, `${path}[${index}]`, errors));
    }
  }

  if (isObject(value)) {
    const properties = schema.properties ?? {};
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) {
        addError(errors, 'required', `${path}.${required}`, `${path}.${required} is required`);
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) {
          addError(errors, 'additionalProperties', `${path}.${key}`, `${path}.${key} is not allowed`);
        }
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        validateNode(value[key], childSchema, rootSchema, `${path}.${key}`, errors);
      }
    }
  }
}

export function validateJsonSchema(value, schema) {
  const errors = [];
  validateNode(value, schema, schema, '$', errors);
  return errors;
}
