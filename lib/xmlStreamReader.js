const _ = require('lodash')
const { Transform } = require('stream')
const { DOMImplementation, XMLSerializer } = require('xmldom')
const { SaxPushParser } = require('libxmljs')
const xpath = require('xpath')
const deserializeFromXml = require('./deserializeFromXml')

/**
 * Transforms input XML data stream to output object stream
 *
 * 'complete' event is fired when parsing is complete with all data that was not selected using selector
 */
class XmlStreamReader extends Transform {
  /**
   * @constructor
   * @param {string} [selector='/*\/*'] Output data selector
   */
  constructor (selector = '/*/*') {
    super({
      objectMode: false,
      readableObjectMode: true,
      writableObjectMode: false
    })

    this._selector = xpath.parse(selector)

    this._document = null
    this._currentNode = null
    this._parser = new SaxPushParser()
    this._parser
      .on('error', (...args) => this._onParserError(...args))
      .on('startDocument', (...args) => this._onParserStartDocument(...args))
      .on('endDocument', (...args) => this._onParserEndDocument(...args))
      .on('startElementNS', (...args) => this._onParserStartElementNS(...args))
      .on('endElementNS', (...args) => this._onParserEndElementNS(...args))
      .on('characters', (...args) => this._onParserCharacters(...args))
      .on('cdata', (...args) => this._onParserCData(...args))
      .on('comment', (...args) => this._onParserComment(...args))
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    try {
      this._parser.push(_.toString(chunk))
    } catch (error) {
      callback(error, null)
      return
    }
    callback(null, null)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_flush_callback
   * @override
   */
  _flush (callback) {
    this._parser.push('', true)
    callback(null, null)
  }

  /**
   * Handles error
   *
   * @param {string} error Error message
   */
  _onParserError (error) {
    this.emit('error', new Error(error))
  }

  /**
   * Handles start-document event
   */
  _onParserStartDocument () {
    this._document = new DOMImplementation().createDocument(null, null, null)
    this._currentNode = this._document.documentElement ? this._document.documentElement : this._document
  }

  /**
   * Handles end-document event
   */
  _onParserEndDocument () {
    this._document.normalize()
    this._processDocument()

    this.push(null)

    this.emit('complete', new XMLSerializer().serializeToString(this._currentNode))

    this._document = null
    this._currentNode = null
  }

  /**
   * Handles start-element event
   */
  _onParserStartElementNS (elem, attrs, prefix, uri, namespace) {
    const fqName = prefix ? `${prefix}:${elem}` : elem

    const node = this._document.createElementNS(uri, fqName)
    this._currentNode.appendChild(node)
    this._currentNode = node

    const attrsCount = attrs.length
    for (let i = 0; i < attrsCount; i++) {
      const attr = attrs[i] // [key, prefix, uri, value]
      const key = attr[0]
      const prefix = attr[1]
      const uri = attr[2]
      const value = attr[3]

      const fqName = prefix ? `${prefix}:${key}` : key

      const attrNode = this._document.createAttributeNS(uri, fqName)
      attrNode.value = attrNode.nodeValue = value
      node.setAttributeNode(attrNode)
    }
  }

  /**
   * Handles end-element event
   */
  _onParserEndElementNS (elem, prefix, uri) {
    this._currentNode = this._currentNode.parentNode

    this._processDocument()
  }

  /**
   * Handles characters event
   */
  _onParserCharacters (chars) {
    const node = this._document.createTextNode(chars)
    this._currentNode.appendChild(node)

    this._processDocument()
  }

   /**
    * Handles CData event
    */
  _onParserCData (data) {
    const node = this._document.createCDATASection(data)
    this._currentNode.appendChild(node)

    this._processDocument()
  }

  /**
   * Handles comment event
   */
  _onParserComment (comment) {
    const node = this._document.createComment(comment)
    this._currentNode.appendChild(node)

    this._processDocument()
  }

  /**
   * Processes the document using selector
   */
  _processDocument () {
    const nodes = this._selector.select({
      node: this._document
    })
    if (!nodes) {
      return
    }

    const nodesCount = nodes.length
    for (let i = 0; i < nodesCount; i++) {
      const node = nodes[i]

      this.push(deserializeFromXml(node)[0])

      node.parentNode.removeChild(node)
    }
  }
}

module.exports = XmlStreamReader
