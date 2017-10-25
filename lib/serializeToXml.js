const _ = require('lodash')

const DEFAULT_INDENT = '  '
const DEFAULT_DECLARATION = {
  version: '1.0',
  encoding: 'UTF-8'
}

/**
 * Checks if value is scalar
 *
 * @returns {boolean} True if value is scalar, false otherwise
 */
function isScalarValue (value) {
  return _.isString(value) || _.isNumber(value) || _.isBoolean(value) || _.isDate(value)
}

/**
 * Checks if value is complex
 *
 * @returns {boolean} True if value is scalar, false otherwise
 */
function isComplexValue (value) {
  return (_.isObject(value) && !isScalarValue(value) && !_.isFunction(value) && !_.isRegExp(value)) || _.isArray(value)
}

/**
 * Checks if specified element name is valid
 *
 * @returns {boolean} True if specified element name is valid, false otherwise
 */
function isValidElementName (elementName) {
  return elementName && elementName.match(/^([^\W\d]|[_:])[\w_:\d.-]*$/)
}

/**
 * @typedef {Object} serializeToXml~Options
 * @property {boolean|Object} declaration True to include default XML declaration, or custom XML declaration object
 * @property {boolean|string} indent True to use default indent, or string to be used as indent
 * @property {string} newline String to be used as newline
 */

/**
 * Serializes given value to string in XML format
 *
 * @param {} value Value to serialize
 * @param {string} [name=undefined] Name of the value
 * @param {serializeToXml~Options} [options=undefined] Serializer options
 * @param {number} [indentDepth=0] Indent depth
 */
function serializeToXml (value, name = undefined, options = undefined, indentDepth = 0) {
  const isComplex = isComplexValue(value)
  const isScalar = isScalarValue(value)
  if (!isComplex && !isScalar && !_.isNil(value)) {
    throw new TypeError(`${typeof value} is not supported`)
  }
  if (isComplex && !isValidElementName(name)) {
    throw new Error(`"${name}" is not a valid name for complex value`)
  }

  // In case there's no name and value is scalar, escape value for XML
  if (!name && isScalar) {
    const escapeMap = {
      '"': '&quot;',
      '&': '&amp;',
      '\'': '&apos;',
      '<': '&lt;',
      '>': '&gt;'
    }
    return _.toString(value).replace(/([&"<>'])/g, (match, group1) => escapeMap[group1])
  }

  // Handle options
  const indent = (!options || !options.indent) ? null : (options.indent === true ? DEFAULT_INDENT : options.indent)
  const newline = indent ? ((!options || !options.newline) ? '\n' : options.newline) : ''
  const declaration = (!options || !options.declaration)
    ? false
    : (options.declaration === true ? DEFAULT_DECLARATION : Object.assign({}, DEFAULT_DECLARATION, options.declaration))
  if (declaration) {
    options = Object.assign({}, options, { declaration: false })
  }

  // Prepare for serializing
  const keys = isScalar ? null : _.keys(value)
  if (keys) {
    let lastKey, lastProperty
    const hasUnsupportedProperties = _.some(keys, key => {
      lastKey = key
      lastProperty = value[key]
      return !isScalarValue(lastProperty) && !isComplexValue(lastProperty)
    })
    if (hasUnsupportedProperties) {
      throw new TypeError(`${typeof lastProperty} (property '${lastKey}') is not supported`)
    }
  }
  let xml = ''
  let hasValue = isScalar ? !!value : false

  // Write declaration (if needed)
  if (declaration) {
    xml += `<?xml`
    _.keys(declaration).forEach(key => {
      const property = declaration[key]

      if (isScalarValue(property)) {
        if (!isValidElementName(key)) {
          throw new Error(`"${key}" is not a valid name for declaration value`)
        }

        xml += ` ${key}="`
        xml += serializeToXml(property)
        xml += `"`
      } else {
        throw new TypeError(`${typeof property} (${key}) is not supported in declaration`)
      }
    })
    xml += `?>${newline}`
  }

  // Open tag
  if (indent) {
    xml += _.repeat(indent, indentDepth)
  }
  xml += `<${name}`

  // Write scalar properties as attributes
  if (isComplex) {
    keys.forEach(key => {
      const property = value[key]

      if (isScalarValue(property)) {
        if (!isValidElementName(key)) {
          throw new Error(`"${key}" is not a valid name for attribute value`)
        }

        xml += ` ${key}="`
        xml += serializeToXml(property)
        xml += `"`
      } else if (isComplexValue(property)) {
        hasValue = true
      }
    })
  }

  // Close tag entirely if it has no value, or just close opening tag
  if (!hasValue) {
    xml += `/>${newline}`
    return xml
  }
  xml += `>`

  // Write value or complex properties
  if (isScalar) {
    xml += serializeToXml(value)
  } else /* if (isComplex) */ {
    xml += newline
    keys.forEach(key => {
      const property = value[key]
      if (!isComplexValue(property)) {
        return
      }

      if (_.isArray(property)) {
        const length = property.length
        for (let i = 0; i < length; i++) {
          xml += serializeToXml(property[i], key, options, indentDepth + 1)
        }
      } else {
        xml += serializeToXml(property, key, options, indentDepth + 1)
      }
    })
  }

  // Write closing tag
  if (indent && !isScalar) {
    xml += _.repeat(indent, indentDepth)
  }
  xml += `</${name}>${newline}`

  return xml
}

module.exports = serializeToXml
