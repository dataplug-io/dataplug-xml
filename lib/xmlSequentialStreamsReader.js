const _ = require('lodash')
const { Readable } = require('stream')
const { DOMImplementation, XMLSerializer } = require('xmldom')
const { SaxPushParser } = require('libxmljs')
const xpath = require('xpath')
const deserializeFromXml = require('./deserializeFromXml')

/**
 * Reads input XML streams sequentially and transforms data to output object stream
 */
class XmlSequentialStreamsReader extends Readable {
  /**
   * @constructor
   * @param {XmlSequentialStreamsReader~InputStreamFactory} inputStreamFactory Input stream factory
   * @param {object} [inputStreamFactoryParams={}] Input stream factory parameters
   * @param {string} [selector='/*\/*'] Output data selector
   */
  constructor (inputStreamFactory, inputStreamFactoryParams = {}, selector = '/*/*') {
    super({
      objectMode: true
    })

    this._selector = xpath.parse(selector)

    this._inputStreamFactory = inputStreamFactory
    this._inputStreamFactoryParams = _.cloneDeep(inputStreamFactoryParams)
    this._inputStream = null
    this._inputStreamParams = null

    this._document = null
    this._currentNode = null
    this._parser = null

    this._onInputStreamEndedHandler = (...args) => this._onInputStreamEnded(...args)
    this._onInputStreamDataHandler = (...args) => this._onInputStreamData(...args)

    this._onParserErrorHandler = (...args) => this._onParserError(...args)
    this._onParserStartDocumentHandler = (...args) => this._onParserStartDocument(...args)
    this._onParserEndDocumentHandler = (...args) => this._onParserEndDocument(...args)
    this._onParserStartElementNsHandler = (...args) => this._onParserStartElementNS(...args)
    this._onParserEndElementNsHandler = (...args) => this._onParserEndElementNS(...args)
    this._onParserCharactersHandler = (...args) => this._onParserCharacters(...args)
    this._onParserCDataHandler = (...args) => this._onOnParserCData(...args)
    this._onParserCommendHandler = (...args) => this._onParserComment(...args)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_readable_read_size_1
   */
  _read (size) {
    // console.log('read');
    if (!this._inputStream) {
      this._setupInputStream()
    }
  }

  /**
   * Setups input stream
   *
   * @param {Object} [previousData=undefined] Data obtained from previous input stream
   * @param {Object} [previousParams=undefined] Params used to setup previous input stream
   */
  _setupInputStream (previousData = undefined, previousParams = undefined) {
    this._inputStreamFactory(this._inputStreamFactoryParams, previousData, previousParams)
      .then((result) => {
        let inputStream = result
        let params = null
        if (result.stream && result.params) {
          inputStream = result.stream
          params = result.params
        }

        if (!inputStream) {
          setImmediate(() => {
            // console.log('push null')
            this.push(null)
          })
          return
        }

        // console.log('got input stream')

        this._inputStream = inputStream
          .on('end', this._onInputStreamEndedHandler)
          .on('data', this._onInputStreamDataHandler)
        this._inputStreamParams = Object.assign({}, params)

        this._parser = new SaxPushParser()
        this._parser
          .on('error', this._onParserErrorHandler)
          .on('startDocument', this._onParserStartDocumentHandler)
          .on('endDocument', this._onParserEndDocumentHandler)
          .on('startElementNS', this._onParserStartElementNsHandler)
          .on('endElementNS', this._onParserEndElementNsHandler)
          .on('characters', this._onParserCharactersHandler)
          .on('cdata', this._onParserCDataHandler)
          .on('comment', this._onParserCommendHandler)
      })
      .catch((reason) => {
        // TODO: this._reset(error);
        setImmediate(() => {
          // console.log('push null')
          this.push(null)
        })

        if (reason) {
          this.emit('error', new Error('Failed to create input stream: ' + JSON.stringify(reason)))
        }
      })
  }

  /**
   * Detaches from parser and input
   */
  _detachFromCurrentStream () {
    // console.log('_detachFromCurrentStream')
    if (this._parser) {
      this._parser.removeListener('error', this._onParserErrorHandler)
      this._parser.removeListener('startDocument', this._onParserStartDocumentHandler)
      this._parser.removeListener('endDocument', this._onParserEndDocumentHandler)
      this._parser.removeListener('startElementNS', this._onParserStartElementNsHandler)
      this._parser.removeListener('endElementNS', this._onParserEndElementNsHandler)
      this._parser.removeListener('characters', this._onParserCharactersHandler)
      this._parser.removeListener('cdata', this._onParserCDataHandler)
      this._parser.removeListener('comment', this._onParserCommendHandler)
      this._parser = null
    }
    if (this._inputStream) {
      this._inputStream.removeListener('end', this._onInputStreamEndedHandler)
      this._inputStream.removeListener('data', this._onInputStreamDataHandler)
    }
  }

  /**
   * Handles input stream end
   */
  _onInputStreamEnded () {
    // console.log('input end, notify parser')
    this._parser.push('', true)
  }

  /**
   * Handles input stream data
   */
  _onInputStreamData (data) {
    // console.log('input data', _.toString(data))
    this._parser.push(_.toString(data))
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
    // console.log('startdoc')
    this._document = new DOMImplementation().createDocument(null, null, null)
    this._currentNode = this._document.documentElement ? this._document.documentElement : this._document
  }

  /**
   * Handles end-document event
   */
  _onParserEndDocument () {
    // console.log('enddoc')
    this._document.normalize()
    this._processDocument()

    const data = XMLSerializer.serializeToString(this._currentNode)
    this._document = null
    this._currentNode = null

    this._detachFromCurrentStream()
    this._setupInputStream(data, this._inputStreamParams)
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
    // console.log('end element', elem)
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
      // console.log('push object')

      node.parentNode.removeChild(node)
    }
  }
};

module.exports = XmlSequentialStreamsReader
