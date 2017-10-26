/* eslint-env node, mocha */
require('chai')
  .should()
const { XmlStreamWriter } = require('../lib')

describe('XmlStreamWriter', () => {
  it('transforms object to xml', () => {
    const object = {
      attr: 'attrValue',
      subObject: {
        attr: 'attrValue'
      }
    }
    const writer = new XmlStreamWriter('root', 'item')
    writer.write(object)
    writer.end()
    writer.read().toString()
      .should.be.equal('<?xml version="1.0" encoding="UTF-8"?><root><item attr="attrValue"><subObject attr="attrValue"/></item></root>')
  })

  it('transform empty input to empty JSON array', () => {
    const writer = new XmlStreamWriter('root', 'item')
    writer.end()
    writer.read().toString()
      .should.be.equal('<root/>')
  })
})
