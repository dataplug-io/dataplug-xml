/* eslint-env node, mocha */
require('chai')
  .should()
const { XmlStreamReader } = require('../lib')

describe('XmlStreamReader', () => {
  it('transforms XML to object', () => {
    const object = {
      attr: 'attrValue',
      subObject: {
        attr: 'attrValue'
      }
    }
    const reader = new XmlStreamReader('/*/item')
    reader.write('<?xml version="1.0" encoding="UTF-8"?><root><notItem/><item attr="attrValue"><subObject attr="attrValue"/></item></root>')
    reader.end()
    reader.read()
      .should.be.deep.equal(object)
  })

  it('supports "complete" event', (done) => {
    const reader = new XmlStreamReader('/*/item')
    reader.on('complete', (data) => {
      data.should.be.equal('<root><notItem/></root>')
      done()
    })
    reader.write('<?xml version="1.0" encoding="UTF-8"?><root><notItem/><item attr="attrValue"><subObject attr="attrValue"/></item></root>')
    reader.end()
  })
})
