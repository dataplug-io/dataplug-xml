const _ = require('lodash')
const check = require('check-types')
const { Transform } = require('stream')
const { DOMImplementation, XMLSerializer } = require('xmldom')
const { SaxPushParser } = require('libxmljs')
const logger = require('winston')
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
   * @param {string} [selector=] Output data selector
   */
  constructor (selector = '/*/*') {
    check.assert.string(selector)

    super({
      objectMode: false,
      readableObjectMode: true,
      writableObjectMode: false
    })

    this._selector = xpath.parse(selector)

    this._onParserErrorHandler = (...args) => this._onParserError(...args)
    this._onParserStartDocumentHandler = (...args) => this._onParserStartDocument(...args)
    this._onParserEndDocumentHandler = (...args) => this._onParserEndDocument(...args)
    this._onParserStartElementNSHandler = (...args) => this._onParserStartElementNS(...args)
    this._onParserEndElementNSHandler = (...args) => this._onParserEndElementNS(...args)
    this._onParserCharactersHandler = (...args) => this._onParserCharacters(...args)
    this._onParserCDataHandler = (...args) => this._onParserCData(...args)
    this._onParserCommentHandler = (...args) => this._onParserComment(...args)

    this._document = null
    this._currentNode = null
    this._parser = new SaxPushParser()
    this._parser
      .on('error', this._onParserErrorHandler)
      .on('startDocument', this._onParserStartDocumentHandler)
      .on('endDocument', this._onParserEndDocumentHandler)
      .on('startElementNS', this._onParserStartElementNSHandler)
      .on('endElementNS', this._onParserEndElementNSHandler)
      .on('characters', this._onParserCharactersHandler)
      .on('cdata', this._onParserCDataHandler)
      .on('comment', this._onParserCommentHandler)
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
    if (this._document) {
      this._finishDocumentProcessing()
      this._document = null
      this._currentNode = null
    }

    if (this._parser) {
      this._detachFromParser()
      this._parser = null
    }

    callback(null, null)
  }

  /**
   * Detaches from parser
   */
  _detachFromParser () {
    this._parser.removeListener('error', this._onParserErrorHandler)
    this._parser.removeListener('startDocument', this._onParserStartDocumentHandler)
    this._parser.removeListener('endDocument', this._onParserEndDocumentHandler)
    this._parser.removeListener('startElementNS', this._onParserStartElementNSHandler)
    this._parser.removeListener('endElementNS', this._onParserEndElementNSHandler)
    this._parser.removeListener('characters', this._onParserCharactersHandler)
    this._parser.removeListener('cdata', this._onParserCDataHandler)
    this._parser.removeListener('comment', this._onParserCommentHandler)
  }

  /**
   * Handles error
   *
   * @param {string} error Error message
   */
  _onParserError (error) {
    logger.log('error', 'Error in XmlStreamReader during parsing:', error)
    this.emit('error', error)

    this._detachFromParser()
    this._parser = null

    this._document = null
    this._currentNode = null

    this.emit('close')
    this.push(null)
  }

  /**
   * Handles start-document event
   */
  _onParserStartDocument () {
    logger.log('debug', 'Start of document found in XmlStreamReader')

    this._document = new DOMImplementation().createDocument(null, null, null)
    this._currentNode = this._document
  }

  /**
   * Handles end-document event
   */
  _onParserEndDocument () {
    logger.log('debug', 'End of document found in XmlStreamReader')

    this._detachFromParser()
    this._parser = null

    this._finishDocumentProcessing()
    this._document = null
    this._currentNode = null
  }

  /**
   * Handles start-element event
   */
  _onParserStartElementNS (elem, attrs, prefix, uri, namespace) {
    const fqName = prefix ? `${prefix}:${elem}` : elem

    logger.log('debug', 'Start of <%s> element found in XmlStreamReader', fqName)

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
    logger.log('debug', 'End of <%s> element found in XmlStreamReader', prefix ? `${prefix}:${elem}` : elem)

    this._currentNode = this._currentNode.parentNode

    this._processDocument()
  }

  /**
   * Handles characters event
   */
  _onParserCharacters (chars) {
    logger.log('debug', 'Characters found in XmlStreamReader')
    logger.log('silly', 'Characters:', chars)

    const node = this._document.createTextNode(chars)
    this._currentNode.appendChild(node)

    this._processDocument()
  }

   /**
    * Handles CData event
    */
  _onParserCData (data) {
    logger.log('debug', 'CData found in XmlStreamReader')
    logger.log('silly', 'CData:', data)

    const node = this._document.createCDATASection(data)
    this._currentNode.appendChild(node)

    this._processDocument()
  }

  /**
   * Handles comment event
   */
  _onParserComment (comment) {
    logger.log('debug', 'Comment found in XmlStreamReader')
    logger.log('silly', 'Comment:', comment)

    const node = this._document.createComment(comment)
    this._currentNode.appendChild(node)

    this._processDocument()
  }

  /**
   * Processes document using selector
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

  /**
   * Finishes document processing
   */
  _finishDocumentProcessing () {
    this._document.normalize()
    this._processDocument()

    this.emit('complete', this._document.documentElement ? new XMLSerializer().serializeToString(this._document) : null)
    this.emit('close')
    this.push(null)
  }
}

module.exports = XmlStreamReader
