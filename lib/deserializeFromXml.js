const _ = require('lodash')
const { DOMParser } = require('xmldom')

/**
 * Deserializes object from XML
 *
 * @param {string|XMLNode} xml XML to deserialize from
 * @returns {Object} A deserialized object
 */
function deserializeFromXml (xml) {
  const node = _.isString(xml)
    ? new DOMParser().parseFromString(xml).documentElement
    : xml

  let object = {}

  // Process attributes
  if (node.attributes) {
    const attributesCount = node.attributes.length
    for (let i = 0; i < attributesCount; i++) {
      const attribute = node.attributes.item(i)

      object[attribute.name] = attribute.value
    }
  }

  // Process children
  if (node.childNodes) {
    const childNodesCount = node.childNodes.length
    for (let i = 0; i < childNodesCount; i++) {
      const childNode = node.childNodes.item(i)

      const childObject = deserializeFromXml(childNode)[0]
      if (object[childNode.nodeName]) {
        const previousChildObject = object[childNode.nodeName]
        if (_.isArray(previousChildObject)) {
          previousChildObject.push(childObject)
        } else {
          object[childNode.nodeName] = [previousChildObject, childObject]
        }
      } else {
        object[childNode.nodeName] = childObject
      }
    }
  }

  return [object, node.nodeName]
}

module.exports = deserializeFromXml
