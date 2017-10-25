const { Transform } = require('stream')
const serializeToXml = require('./serializeToXml')

/**
 * Transforms input object stream to output XML data stream
 */
class XmlStreamWriter extends Transform {
  /**
   * @constructor
   *
   * @param {string} rootElementName Root element name
   * @param {string} [indent=undefined] String used for indenting
   */
  constructor (rootElementName, itemElementName, indent = undefined) {
    super({
      objectMode: false,
      readableObjectMode: false,
      writableObjectMode: true
    })

    this.rootElementName = rootElementName
    this.itemElementName = itemElementName
    this.indent = indent
    this._opened = false
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_transform_chunk_encoding_callback
   * @override
   */
  _transform (chunk, encoding, callback) {
    let xmlChunk
    try {
      xmlChunk = serializeToXml(chunk, this.itemElementName, {
        indent: this.indent
      })
    } catch (error) {
      callback(error, null)
      return
    }
    if (!this._opened) {
      let opening = '<?xml version="1.0" encoding="UTF-8"?>'
      if (this.indent) {
        opening += '\n'
      }
      opening += `<${this.rootElementName}>`
      if (this.indent) {
        opening += '\n'
      }
      xmlChunk = `${opening}${xmlChunk}`
      this._opened = true
    }
    callback(null, xmlChunk)
  }

  /**
   * https://nodejs.org/api/stream.html#stream_transform_flush_callback
   * @override
   */
  _flush (callback) {
    const ending = this._opened ? `</${this.rootElementName}>` : null
    this._opened = false
    callback(null, ending)
  }
};

module.exports = XmlStreamWriter
